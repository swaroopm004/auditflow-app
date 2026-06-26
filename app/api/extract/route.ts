/**
 * POST /api/extract — reads an uploaded supporting document with Claude and
 * returns structured data that auto-fills the Lifecycle journal entries and the
 * Connected-GL amounts for a Balance-Sheet GL.
 *
 * Request: multipart/form-data
 *   file       — the supporting document (PDF / image / xlsx / csv)
 *   glName     — e.g. "Borrowings"
 *   expects    — JSON string[]  (the fields to extract, from the GL's spec)
 *   lines      — JSON {id,label,side}[]  (existing JE posting lines to match amounts to)
 *   accounts   — JSON string[]  (Connected-GL account names to value)
 *
 * Response: the validated ExtractResult JSON (see schema below).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "claude-opus-4-8";

// JSON schema Claude must return (structured outputs).
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: { type: "string", description: "What kind of document this is" },
    period: { type: "string", description: "Financial year / date / period the document covers, or ''" },
    currency: { type: "string", description: "Currency & unit detected, e.g. 'INR (₹ in Lakhs)'" },
    fields: {
      type: "array",
      description: "The requested fields, extracted from the document. Use '' when not present.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["label", "value"],
      },
    },
    lineAmounts: {
      type: "array",
      description: "Posting amounts mapped to the provided JE line ids, where the document supports a figure for that account. Amounts in ₹ Lakhs as plain numbers (e.g. '26.60'); use '' if no figure.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          lineId: { type: "string" },
          account: { type: "string" },
          amount: { type: "string" },
        },
        required: ["lineId", "account", "amount"],
      },
    },
    connectedAmounts: {
      type: "array",
      description: "Amounts for the provided Connected-GL account names, in ₹ Lakhs. Use '' if not derivable.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          account: { type: "string" },
          amount: { type: "string" },
        },
        required: ["account", "amount"],
      },
    },
    suggestedEntries: {
      type: "array",
      description: "Journal entries the document evidences (e.g. a fresh drawdown, an interest charge). Empty array if none.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          narration: { type: "string" },
          lines: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                account: { type: "string" },
                side: { type: "string", enum: ["Dr", "Cr"] },
                amount: { type: "string" },
                glNo: { type: "string" },
              },
              required: ["account", "side", "amount", "glNo"],
            },
          },
        },
        required: ["title", "narration", "lines"],
      },
    },
    notes: { type: "string", description: "Auditor-facing notes: assumptions, caveats, anything ambiguous." },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["documentType", "period", "currency", "fields", "lineAmounts", "connectedAmounts", "suggestedEntries", "notes", "confidence"],
} as const;

const IMG: Record<string, "image/png" | "image/jpeg" | "image/webp" | "image/gif"> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to auditflow-app/.env.local and restart the dev server." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > 28 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 28 MB)." }, { status: 413 });
  }

  const glName = String(form.get("glName") ?? "this account");
  const expects: string[] = safeJSON(form.get("expects"), []);
  const lines: { id: string; label: string; side: string }[] = safeJSON(form.get("lines"), []);
  const accounts: string[] = safeJSON(form.get("accounts"), []);

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  // Build the document content block based on file type.
  const docBlocks: Anthropic.ContentBlockParam[] = [];
  if (ext === "pdf" || file.type === "application/pdf") {
    docBlocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") },
    });
  } else if (ext in IMG || file.type.startsWith("image/")) {
    const media = IMG[ext] ?? "image/png";
    docBlocks.push({
      type: "image",
      source: { type: "base64", media_type: media, data: buf.toString("base64") },
    });
  } else if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(buf, { type: "buffer" });
    const text = wb.SheetNames.map((n) => `--- Sheet: ${n} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join("\n\n");
    docBlocks.push({ type: "text", text: `Spreadsheet "${file.name}" (CSV export of each sheet):\n\n${text.slice(0, 120_000)}` });
  } else {
    // csv / txt / anything text-like
    docBlocks.push({ type: "text", text: `Document "${file.name}":\n\n${buf.toString("utf8").slice(0, 120_000)}` });
  }

  const instruction = [
    `You are an Indian statutory auditor's extraction engine. Read the attached supporting document for the "${glName}" general-ledger account and extract the figures the auditor needs.`,
    ``,
    `All monetary amounts MUST be returned in ₹ Lakhs as plain numbers (e.g. a sanction limit of ₹50,00,000 → "50.00"; ₹2,66,00,000 → "266.00"). Reductions/credits negative (e.g. "-12.50"). If a figure is not present in the document, return "" — never guess a number.`,
    ``,
    `1. fields — extract each of these, in this order: ${expects.length ? expects.join("; ") : "(key figures from the document)"}.`,
    ``,
    `2. lineAmounts — these are the existing journal-entry posting lines for ${glName}. Where the document supports a posting amount for that account, return it against the SAME lineId. Leave amount "" otherwise. Match by accounting meaning, not exact wording.`,
    lines.length
      ? lines.map((l) => `   - lineId="${l.id}"  ${l.side}  "${l.label}"`).join("\n")
      : "   (no posting lines provided)",
    ``,
    `3. connectedAmounts — value these Connected-GL accounts from the document where derivable: ${accounts.length ? accounts.join("; ") : "(none)"}.`,
    ``,
    `4. suggestedEntries — if the document evidences a transaction not already captured (a fresh drawdown, an interest debit, a repayment, an addition), propose the journal entry/entries (Dr/Cr lines with amounts). Otherwise return an empty array.`,
    ``,
    `Be precise and conservative. Set confidence to "low" if the document is unclear or the figures are inferred.`,
  ].join("\n");

  const client = new Anthropic();
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: [...docBlocks, { type: "text", text: instruction }] }],
    });

    if (msg.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined to process this document." }, { status: 422 });
    }
    const textBlock = msg.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "No structured output returned." }, { status: 502 });
    }
    const data = JSON.parse(textBlock.text);
    return NextResponse.json({ ok: true, fileName: file.name, data });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    return NextResponse.json(
      { error: e?.message ? `Extraction failed: ${e.message}` : "Extraction failed." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

function safeJSON<T>(v: FormDataEntryValue | null, fallback: T): T {
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
