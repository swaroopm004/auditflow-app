/**
 * Statement of Changes in Equity reconciliation model (Ind AS 1).
 *
 * AUTO is generated live where derivable: Profit for the Year from the P&L
 * roll-up (PAT), and OCI from the Connected-GL amounts classified to Other
 * Comprehensive Income. Opening equity and capital transactions (share issue,
 * buyback, dividends) are keyed by the auditor. CLIENT = uploaded client SOCIE.
 * Sign convention: increases to equity positive, reductions negative.
 */

import type { ExecutionState } from "@/lib/types";
import { TEMPLATE_CONTENT } from "./template-content";
import { EXEC_REGISTRY } from "./defaults";
import { rollupAuto, lineValue as plLineValue, pc } from "./pl-lines";

export type EQKind = "income" | "expense" | "subtotal" | "result";
export interface EQLine { key: string; label: string; kind: EQKind }

export const EQ_LINES: EQLine[] = [
  { key: "eq-opening", label: "Opening Total Equity", kind: "income" },
  { key: "eq-profit", label: "Profit for the Year (PAT)", kind: "income" },
  { key: "eq-oci", label: "Other Comprehensive Income", kind: "income" },
  { key: "eq-tci", label: "Total Comprehensive Income", kind: "subtotal" },
  { key: "eq-shares", label: "Shares Issued (incl. Securities Premium)", kind: "income" },
  { key: "eq-buyback", label: "Buyback / Capital Reduction", kind: "expense" },
  { key: "eq-dividend", label: "Dividends Paid", kind: "expense" },
  { key: "eq-other", label: "Other Movements (ESOP, transfers, prior-period)", kind: "income" },
  { key: "eq-closing", label: "Closing Total Equity", kind: "result" },
];

const MOVEMENTS = ["eq-profit", "eq-oci", "eq-shares", "eq-buyback", "eq-dividend", "eq-other"];
export const EQ_LEAF = ["eq-opening", ...MOVEMENTS];

const TEMPLATE_NAME: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const fs of Object.values(EXEC_REGISTRY)) for (const t of fs) m[t.id] = t.name;
  return m;
})();

export interface EQGLRow { templateName: string; account: string; auto: number }

export function rollupAutoEQ(execution: ExecutionState | undefined): {
  autoByLine: Record<string, number>;
  glsByLine: Record<string, EQGLRow[]>;
} {
  const pl = rollupAuto(execution);
  const autoByLine: Record<string, number> = { "eq-profit": plLineValue("pat", pl.autoByLine) };
  const glsByLine: Record<string, EQGLRow[]> = {};

  for (const [id, content] of Object.entries(TEMPLATE_CONTENT)) {
    const accts = content.connected?.accts;
    if (!accts) continue;
    const stored = execution?.templates[id]?.connectedData ?? {};
    for (const a of accts) {
      const data = stored[a.name];
      const classification = data?.classification ?? a.cls;
      if (!classification.toLowerCase().includes("comprehensive income")) continue;
      const amt = pc(data?.amount);
      if (amt === 0 && !data?.amount) continue;
      autoByLine["eq-oci"] = (autoByLine["eq-oci"] ?? 0) + amt;
      (glsByLine["eq-oci"] ??= []).push({ templateName: TEMPLATE_NAME[id] ?? id, account: a.name, auto: amt });
    }
  }
  return { autoByLine, glsByLine };
}

export function eqValue(key: string, leaf: Record<string, number>): number {
  switch (key) {
    case "eq-tci": return (leaf["eq-profit"] ?? 0) + (leaf["eq-oci"] ?? 0);
    case "eq-closing": return (leaf["eq-opening"] ?? 0) + MOVEMENTS.reduce((s, k) => s + (leaf[k] ?? 0), 0);
    default: return leaf[key] ?? 0;
  }
}
