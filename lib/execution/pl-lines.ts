/**
 * Profit & Loss reconciliation model.
 *
 * AUTO amounts are generated *live* by rolling up the Connected-GL working
 * amounts captured on each Execution GL template (ExecutionTemplate.connectedData)
 * and mapping each account's classification to a P&L line. CLIENT amounts come
 * from the uploaded/keyed client P&L (ClientRecord.plRecon). The reconciliation
 * surfaces the variance at line and GL level for investigation.
 */

import type { ExecutionState } from "@/lib/types";
import { TEMPLATE_CONTENT } from "./template-content";
import { EXEC_REGISTRY } from "./defaults";

export type PLKind = "income" | "expense" | "subtotal" | "result";
export interface PLLine { key: string; label: string; kind: PLKind }

export const PL_LINES: PLLine[] = [
  { key: "revenue", label: "Revenue from Operations", kind: "income" },
  { key: "other-income", label: "Other Income", kind: "income" },
  { key: "total-income", label: "Total Income", kind: "subtotal" },
  { key: "cogs", label: "Cost of Materials / Goods Consumed", kind: "expense" },
  { key: "employee", label: "Employee Benefit Expenses", kind: "expense" },
  { key: "finance", label: "Finance Costs", kind: "expense" },
  { key: "depreciation", label: "Depreciation & Amortisation", kind: "expense" },
  { key: "other-exp", label: "Other Expenses", kind: "expense" },
  { key: "total-expenses", label: "Total Expenses", kind: "subtotal" },
  { key: "pbt", label: "Profit Before Tax", kind: "result" },
  { key: "tax", label: "Tax Expense", kind: "expense" },
  { key: "pat", label: "Profit After Tax (PAT)", kind: "result" },
  { key: "oci", label: "Other Comprehensive Income (OCI)", kind: "income" },
  { key: "tci", label: "Total Comprehensive Income", kind: "result" },
];

/** Constituent (leaf) lines that AUTO/CLIENT roll up from. */
export const INCOME_LINES = ["revenue", "other-income"];
export const EXPENSE_LINES = ["cogs", "employee", "finance", "depreciation", "other-exp"];
export const LEAF_LINES = [...INCOME_LINES, ...EXPENSE_LINES, "tax", "oci"];

export const pc = (s: string | number | undefined) =>
  parseFloat(String(s ?? "").replace(/[^0-9.\-]/g, "")) || 0;

/** Map a Connected-GL classification string to a P&L line key (or null if not P&L). */
export function lineForClassification(cls: string): string | null {
  const c = (cls || "").toLowerCase();
  if (c.includes("revenue")) return "revenue";
  if (c.includes("other income")) return "other-income";
  if (c.includes("cost of materials") || c.includes("cogs") || c.includes("changes in inventory")) return "cogs";
  if (c.includes("employee benefit")) return "employee";
  if (c.includes("finance cost")) return "finance";
  if (c.includes("depreciation") || c.includes("amortisation")) return "depreciation";
  if (c.includes("income tax")) return "tax";
  if (c.includes("comprehensive income")) return "oci";
  if (c.includes("p&l")) return "other-exp"; // any remaining P&L item
  return null;
}

// id → display name (for GL drill-down labels)
const TEMPLATE_NAME: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const fs of Object.values(EXEC_REGISTRY)) for (const t of fs) m[t.id] = t.name;
  return m;
})();

export interface PLGLRow {
  templateId: string;
  templateName: string;
  account: string;
  classification: string;
  auto: number;
}
export interface PLRollup {
  autoByLine: Record<string, number>;     // leaf line → summed AUTO
  glsByLine: Record<string, PLGLRow[]>;    // leaf line → contributing GL accounts
}

/** Roll up Connected-GL working amounts (live) into P&L lines. */
export function rollupAuto(execution: ExecutionState | undefined): PLRollup {
  const autoByLine: Record<string, number> = {};
  const glsByLine: Record<string, PLGLRow[]> = {};

  for (const [id, content] of Object.entries(TEMPLATE_CONTENT)) {
    const accts = content.connected?.accts;
    if (!accts) continue;
    const stored = execution?.templates[id]?.connectedData ?? {};
    for (const a of accts) {
      const data = stored[a.name];
      const classification = data?.classification ?? a.cls;
      const line = lineForClassification(classification);
      if (!line) continue;
      const amt = pc(data?.amount);
      if (amt === 0 && !data?.amount) continue; // skip blank
      autoByLine[line] = (autoByLine[line] ?? 0) + amt;
      (glsByLine[line] ??= []).push({
        templateId: id,
        templateName: TEMPLATE_NAME[id] ?? id,
        account: a.name,
        classification,
        auto: amt,
      });
    }
  }
  return { autoByLine, glsByLine };
}

/** Resolve the value (AUTO or CLIENT) for any line — leaves are direct, totals computed. */
export function lineValue(key: string, leaf: Record<string, number>): number {
  switch (key) {
    case "total-income": return INCOME_LINES.reduce((s, k) => s + (leaf[k] ?? 0), 0);
    case "total-expenses": return EXPENSE_LINES.reduce((s, k) => s + (leaf[k] ?? 0), 0);
    case "pbt": return lineValue("total-income", leaf) - lineValue("total-expenses", leaf);
    case "pat": return lineValue("pbt", leaf) - (leaf["tax"] ?? 0);
    case "tci": return lineValue("pat", leaf) + (leaf["oci"] ?? 0);
    default: return leaf[key] ?? 0;
  }
}
