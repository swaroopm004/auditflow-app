/**
 * Cash Flow Statement reconciliation model (Ind AS 7 — indirect method).
 *
 * AUTO is generated live: Profit Before Tax is pulled from the P&L roll-up, and
 * the non-cash add-backs (depreciation, finance cost) and tax are mapped from
 * the Connected-GL amounts on the Execution templates. Working-capital and
 * investing/financing movements are keyed by the auditor (they need opening/
 * closing balances the GL templates don't capture). CLIENT = uploaded client
 * cash-flow statement. Sign convention: inflows positive, outflows negative.
 */

import type { ExecutionState } from "@/lib/types";
import { TEMPLATE_CONTENT } from "./template-content";
import { EXEC_REGISTRY } from "./defaults";
import { rollupAuto, lineValue as plLineValue, pc } from "./pl-lines";

export type CFKind = "income" | "expense" | "subtotal" | "result";
export interface CFLine { key: string; label: string; kind: CFKind }

export const CF_LINES: CFLine[] = [
  { key: "op-pbt", label: "Profit Before Tax", kind: "income" },
  { key: "op-depn", label: "Add: Depreciation & Amortisation", kind: "income" },
  { key: "op-finance", label: "Add: Finance Costs", kind: "income" },
  { key: "op-interest-income", label: "Less: Interest / Investment Income", kind: "expense" },
  { key: "op-wc-ar", label: "(Increase) / Decrease in Trade Receivables", kind: "income" },
  { key: "op-wc-inv", label: "(Increase) / Decrease in Inventories", kind: "income" },
  { key: "op-wc-ap", label: "Increase / (Decrease) in Trade Payables", kind: "income" },
  { key: "op-tax", label: "Less: Income Tax Paid", kind: "expense" },
  { key: "net-operating", label: "Net Cash from Operating Activities", kind: "subtotal" },
  { key: "inv-capex", label: "Purchase of PPE & Intangibles", kind: "expense" },
  { key: "inv-proceeds", label: "Proceeds from Sale of Assets", kind: "income" },
  { key: "inv-invest", label: "Purchase / Sale of Investments (net)", kind: "income" },
  { key: "inv-interest", label: "Interest / Dividend Received", kind: "income" },
  { key: "net-investing", label: "Net Cash from Investing Activities", kind: "subtotal" },
  { key: "fin-borrow", label: "Borrowings Raised / (Repaid) (net)", kind: "income" },
  { key: "fin-lease", label: "Repayment of Lease Liabilities", kind: "expense" },
  { key: "fin-equity", label: "Proceeds from Issue of Share Capital", kind: "income" },
  { key: "fin-interest-paid", label: "Interest Paid", kind: "expense" },
  { key: "fin-dividend", label: "Dividends Paid", kind: "expense" },
  { key: "net-financing", label: "Net Cash from Financing Activities", kind: "subtotal" },
  { key: "net-change", label: "Net Increase / (Decrease) in Cash", kind: "result" },
  { key: "opening-cash", label: "Opening Cash & Cash Equivalents", kind: "income" },
  { key: "closing-cash", label: "Closing Cash & Cash Equivalents", kind: "result" },
];

const OP = ["op-pbt", "op-depn", "op-finance", "op-interest-income", "op-wc-ar", "op-wc-inv", "op-wc-ap", "op-tax"];
const INV = ["inv-capex", "inv-proceeds", "inv-invest", "inv-interest"];
const FIN = ["fin-borrow", "fin-lease", "fin-equity", "fin-interest-paid", "fin-dividend"];
export const CF_LEAF = [...OP, ...INV, ...FIN, "opening-cash"];

// Connected-GL classification → cash-flow leaf + sign (only the derivable subset).
function cfLeafFor(cls: string): { leaf: string; sign: number } | null {
  const c = (cls || "").toLowerCase();
  if (c.includes("depreciation") || c.includes("amortisation")) return { leaf: "op-depn", sign: 1 };
  if (c.includes("finance cost")) return { leaf: "op-finance", sign: 1 };
  if (c.includes("income tax")) return { leaf: "op-tax", sign: -1 };
  return null;
}

const TEMPLATE_NAME: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const fs of Object.values(EXEC_REGISTRY)) for (const t of fs) m[t.id] = t.name;
  return m;
})();

export interface CFGLRow { templateName: string; account: string; auto: number }

export function rollupAutoCF(execution: ExecutionState | undefined): {
  autoByLine: Record<string, number>;
  glsByLine: Record<string, CFGLRow[]>;
} {
  // PBT comes from the P&L roll-up.
  const pl = rollupAuto(execution);
  const autoByLine: Record<string, number> = { "op-pbt": plLineValue("pbt", pl.autoByLine) };
  const glsByLine: Record<string, CFGLRow[]> = {};

  for (const [id, content] of Object.entries(TEMPLATE_CONTENT)) {
    const accts = content.connected?.accts;
    if (!accts) continue;
    const stored = execution?.templates[id]?.connectedData ?? {};
    for (const a of accts) {
      const data = stored[a.name];
      const classification = data?.classification ?? a.cls;
      const m = cfLeafFor(classification);
      if (!m) continue;
      const amt = pc(data?.amount);
      if (amt === 0 && !data?.amount) continue;
      const signed = m.sign * amt;
      autoByLine[m.leaf] = (autoByLine[m.leaf] ?? 0) + signed;
      (glsByLine[m.leaf] ??= []).push({ templateName: TEMPLATE_NAME[id] ?? id, account: a.name, auto: signed });
    }
  }
  return { autoByLine, glsByLine };
}

export function cfValue(key: string, leaf: Record<string, number>): number {
  const sum = (ks: string[]) => ks.reduce((s, k) => s + (leaf[k] ?? 0), 0);
  switch (key) {
    case "net-operating": return sum(OP);
    case "net-investing": return sum(INV);
    case "net-financing": return sum(FIN);
    case "net-change": return sum(OP) + sum(INV) + sum(FIN);
    case "closing-cash": return (leaf["opening-cash"] ?? 0) + sum(OP) + sum(INV) + sum(FIN);
    default: return leaf[key] ?? 0;
  }
}
