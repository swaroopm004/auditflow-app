/**
 * Tax Audit — Form 26 (Section 63, Income Tax Act 2025 · Rule 47) model.
 * Replaces Form 3CA / 3CB / 3CD. Scalar clause fields are data-driven; the
 * depreciation (Cl. 36 ≥180/<180), ICDS-adjustment (Cl. 40), TDS (Cl. 49–51)
 * and quantitative (Cl. 53) schedules are rendered as tables. Income, expenses,
 * depreciation, MSME and GST figures auto-fill from the Execution GL/P&L data.
 */

import type { ExecutionState } from "@/lib/types";
import { TEMPLATE_CONTENT } from "@/lib/execution/template-content";
import { rollupAuto, lineValue, pc } from "@/lib/execution/pl-lines";

export type TaxFieldType = "text" | "date" | "select" | "textarea" | "num" | "auto" | "computed";
export interface TaxField {
  key: string; label: string; type: TaxFieldType;
  options?: string[]; placeholder?: string;
  compute?: (f: Record<string, string>) => string;   // for "computed"
}
export type SpecialKind = "depn" | "icdsAdj" | "tds" | "quant" | "icdsApplic";
export interface TaxSection { key: string; label: string; icon: string; group: string; note?: string; fields: TaxField[]; special?: SpecialKind }

export const IT_RATES = ["5% — Buildings (residential)", "10% — Buildings (other)", "15% — Plant & Machinery", "40% — Computers & Software", "10% — Furniture & Fittings", "15% — Motor Vehicles", "30% — Commercial Vehicles", "40% — Energy-saving Devices"];
export const ICDS_LIST = ["I — Accounting Policies", "II — Valuation of Inventories", "III — Construction Contracts", "IV — Revenue Recognition", "V — Tangible Fixed Assets", "VI — Foreign Exchange", "VII — Government Grants", "VIII — Securities", "IX — Borrowing Costs", "X — Provisions & Contingencies"];

const n = (v: number) => (v ? v.toFixed(2) : "");
const sum = (a: string, b: string) => (pc(a) + pc(b)).toFixed(2);

export const FORM26_SECTIONS: TaxSection[] = [
  {
    key: "particulars", label: "Assessee Particulars", icon: "👤", group: "Part A",
    note: "A1–A4 · Digital-infrastructure disclosure (Rule 46) is mandatory in Form 26.",
    fields: [
      { key: "assesseeName", label: "Name of Assessee", type: "text", placeholder: "M/s ABC Private Limited" },
      { key: "pan", label: "PAN", type: "text", placeholder: "AAAAA0000A" },
      { key: "taxYear", label: "Tax Year", type: "text", placeholder: "2026-27" },
      { key: "yearEnding", label: "Year Ending", type: "date" },
      { key: "regAddress", label: "Registered Address", type: "text" },
      { key: "status", label: "Status of Assessee", type: "select", options: ["Company — Private", "Company — Public", "LLP", "Partnership Firm", "Individual", "HUF", "AOP/BOI", "Trust/Society"] },
      { key: "natureBusiness", label: "Nature of Business", type: "text", placeholder: "Manufacturing — Electrical Equipment" },
      { key: "businessCode", label: "Business Code (ITR)", type: "text", placeholder: "0101" },
      { key: "gstLiable", label: "Liable to GST?", type: "select", options: ["Yes — Regular", "Yes — Composition", "No"] },
      { key: "gstin", label: "GSTIN", type: "text", placeholder: "22AAAAA0000A1Z5" },
      { key: "software", label: "Accounting Software", type: "text", placeholder: "Tally Prime, SAP, Zoho" },
      { key: "serverLocation", label: "Server Location (Rule 46)", type: "text", placeholder: "India — Mumbai / AWS ap-south-1" },
      { key: "dataLocalised", label: "Data-localisation compliant?", type: "select", options: ["Yes", "No", "Partially"] },
      { key: "reportPart", label: "Applicable Report Part", type: "select", options: ["Part C — Accounts audited under other law", "Part D — Accounts NOT audited under other law"] },
    ],
  },
  {
    key: "accounting", label: "Accounting Method & ICDS", icon: "📒", group: "Part B", special: "icdsApplic",
    note: "Cl. 1–5 · Method of accounting, change in method, ICDS applicability and prior-period items.",
    fields: [
      { key: "method", label: "Method of Accounting (Cl. 1)", type: "select", options: ["Mercantile / Accrual", "Cash"] },
      { key: "methodChange", label: "Change in method from last year? (Cl. 2)", type: "select", options: ["No", "Yes — specify"] },
      { key: "priorPeriod", label: "Prior-period items? (Cl. 4)", type: "select", options: ["No", "Yes — disclosed"] },
    ],
  },
  {
    key: "income", label: "Income & Receipts", icon: "💰", group: "Part B",
    note: "Cl. 6–10 · Auto-filled from the Execution → P&L roll-up. Tax-audit applicability is assessed against the ₹1 Cr threshold (Sec 63).",
    fields: [
      { key: "revOps", label: "Revenue from Operations (Cl. 6)", type: "auto" },
      { key: "otherInc", label: "Other Income (Cl. 7)", type: "auto" },
      { key: "totalReceipts", label: "Total Receipts", type: "computed", compute: (f) => sum(f.revOps, f.otherInc) },
      { key: "threshold", label: "Tax-audit applicability", type: "computed", compute: (f) => (pc(f.revOps) + pc(f.otherInc) > 100 ? "APPLICABLE — receipts exceed ₹1 Cr (₹100L) u/s 63(a)(i)" : "Below ₹1 Cr threshold — verify other triggers") },
      { key: "incomeNotCredited", label: "Income not credited to P&L? (Cl. 9)", type: "select", options: ["No", "Yes — disclosed"] },
    ],
  },
  {
    key: "expenses", label: "Expenses & Disallowances", icon: "🧮", group: "Part B",
    note: "Cl. 11–19 · Auto-filled from the P&L roll-up; flag disallowances u/s 40A(2)/(3), capital/personal expenditure and contingent claims.",
    fields: [
      { key: "matCost", label: "Cost of Materials (Cl. 11)", type: "auto" },
      { key: "empCost", label: "Employee Benefit Expenses (Cl. 12)", type: "auto" },
      { key: "finCost", label: "Finance Costs (Cl. 13)", type: "auto" },
      { key: "depnBooks", label: "Depreciation per books (Cl. 14)", type: "auto" },
      { key: "otherExp", label: "Other Expenses (Cl. 15)", type: "auto" },
      { key: "totalExp", label: "Total Expenditure", type: "computed", compute: (f) => (pc(f.matCost) + pc(f.empCost) + pc(f.finCost) + pc(f.depnBooks) + pc(f.otherExp)).toFixed(2) },
      { key: "personalExp", label: "Personal/capital expenditure in P&L? (Cl. 16)", type: "select", options: ["No", "Yes — disallowed"] },
      { key: "relatedParty", label: "Payments to related persons u/s 40A(2)? (Cl. 17)", type: "select", options: ["No", "Yes — disclosed"] },
      { key: "cashPayments", label: "Cash payments > ₹10,000 u/s 40A(3)? (Cl. 18)", type: "select", options: ["No", "Yes — disallowed"] },
    ],
  },
  { key: "depreciation", label: "Depreciation (Cl. 36)", icon: "📉", group: "Schedules", special: "depn", note: "Cl. 36 (replaces old Cl. 18) — assets used ≥180 days at full rate, <180 days at half rate. Opening WDV pulls from the PPE register.", fields: [] },
  {
    key: "msme", label: "MSME — Sec 35(b) (Cl. 39)", icon: "⚠", group: "Schedules",
    note: "MSME creditors auto-fill from Trade Payables. Amounts unpaid beyond 30 (Micro) / 45 (Small) days are disallowed u/s 35(b) / 43B(h).",
    fields: [
      { key: "msmeBal", label: "MSME Creditors (year-end)", type: "auto" },
      { key: "msmePaid", label: "Paid within 30/45 days", type: "num" },
      { key: "msmeDisallowed", label: "Disallowed u/s 35(b)", type: "computed", compute: (f) => Math.max(0, pc(f.msmeBal) - pc(f.msmePaid)).toFixed(2) },
      { key: "msmeCount", label: "No. of MSME suppliers", type: "num" },
      { key: "msmeNature", label: "Nature of goods / services", type: "text", placeholder: "Raw materials, components, services" },
    ],
  },
  { key: "icdsAdj", label: "ICDS Adjustments (Cl. 40)", icon: "📐", group: "Schedules", special: "icdsAdj", note: "Disclose the income impact of each applicable ICDS.", fields: [] },
  { key: "tds", label: "TDS / TCS (Cl. 49–51)", icon: "🧾", group: "Schedules", special: "tds", note: "Cl. 49–51 (replaces old Cl. 34) — now requires transaction count and the amount of transactions NOT reported in TDS returns.", fields: [] },
  {
    key: "gst", label: "GST Reconciliation (Cl. 52)", icon: "🔗", group: "Schedules",
    note: "Cl. 52 (rationalised) — detailed expenditure break-up by GST status no longer required; reconcile turnover & ITC. ITC/GST auto-fill from the GL.",
    fields: [
      { key: "turnoverBooks", label: "Turnover as per books", type: "auto" },
      { key: "gstr1Turn", label: "Turnover as per GSTR-1", type: "num" },
      { key: "gstDiff", label: "Turnover difference", type: "computed", compute: (f) => (pc(f.turnoverBooks) - pc(f.gstr1Turn)).toFixed(2) },
      { key: "itcBooks", label: "ITC claimed (books)", type: "auto" },
      { key: "itc2b", label: "ITC as per GSTR-2B", type: "num" },
      { key: "itcDiff", label: "ITC difference", type: "computed", compute: (f) => (pc(f.itcBooks) - pc(f.itc2b)).toFixed(2) },
    ],
  },
  { key: "quant", label: "Quantitative Details (Cl. 53)", icon: "📦", group: "Schedules", special: "quant", note: "Required for trading/manufacturing concerns — raw materials, finished goods, by-products/scrap.", fields: [] },
  {
    key: "international", label: "International Taxation (Cl. 42–44)", icon: "🌐", group: "Schedules",
    fields: [
      { key: "tpAdj", label: "Transfer-pricing adjustment? (Cl. 42)", type: "select", options: ["No", "Yes — secondary adjustment"] },
      { key: "form145", label: "Form 145 remittances (erstwhile 15CA)? (Cl. 43)", type: "select", options: ["No", "Yes — reported"] },
      { key: "interestLimit", label: "Interest limitation u/s 94B (EBITDA test)? (Cl. 44)", type: "select", options: ["No", "Yes — applicable"] },
      { key: "intlNote", label: "Notes (BEPS / POEM / CbCR)", type: "textarea" },
    ],
  },
  {
    key: "opinion", label: "Audit Opinion & Signature", icon: "✍", group: "Part C / D",
    note: "Part C — accounts audited under other law (company); Part D — audit solely for Sec 63. UDIN is mandatory before filing.",
    fields: [
      { key: "statutoryLaw", label: "Statutory audit conducted under (Part C)", type: "text", placeholder: "Companies Act, 2013" },
      { key: "statAuditDate", label: "Date of statutory audit report", type: "date" },
      { key: "observations", label: "Observations / qualifications?", type: "select", options: ["No", "Yes — disclosed"] },
      { key: "caFirm", label: "Name of CA / Firm", type: "text", placeholder: "M/s XYZ & Associates" },
      { key: "frn", label: "FRN (ICAI)", type: "text", placeholder: "123456W" },
      { key: "partner", label: "Partner / Proprietor", type: "text", placeholder: "CA Suresh Rao" },
      { key: "membershipNo", label: "Membership No. (ICAI)", type: "text", placeholder: "012345" },
      { key: "udin", label: "UDIN", type: "text", placeholder: "26012345AAAAAA0000" },
      { key: "reportDate", label: "Date of Report", type: "date" },
      { key: "place", label: "Place", type: "text", placeholder: "Mumbai" },
      { key: "dsc", label: "DSC Status", type: "select", options: ["Signed with DSC", "Pending DSC"] },
    ],
  },
];

// total clause count (for the progress chip) — Form 26 has 54 clauses
export const FORM26_CLAUSE_COUNT = 54;

// ── GL auto-fill ─────────────────────────────────────────────────────────────
function sumConn(execution: ExecutionState | undefined, pred: (name: string, cls: string) => boolean): number {
  let s = 0;
  for (const [id, content] of Object.entries(TEMPLATE_CONTENT)) {
    const accts = content.connected?.accts;
    if (!accts) continue;
    const stored = execution?.templates[id]?.connectedData ?? {};
    for (const a of accts) {
      const d = stored[a.name];
      if (pred(a.name, d?.classification ?? a.cls)) s += pc(d?.amount);
    }
  }
  return s;
}

/** Returns a fields patch auto-filling income/expenses/depreciation/MSME/GST from the GL data. */
export function pullFromGL(execution: ExecutionState | undefined): Record<string, string> {
  const pl = rollupAuto(execution);
  const v = (k: string) => lineValue(k, pl.autoByLine);
  const inv = sumConn(execution, (_n, cls) => cls.toLowerCase().includes("inventory"));
  return {
    revOps: n(v("revenue")), otherInc: n(v("other-income")),
    matCost: n(v("cogs")), empCost: n(v("employee")), finCost: n(v("finance")),
    depnBooks: n(v("depreciation")), otherExp: n(v("other-exp")),
    msmeBal: n(sumConn(execution, (name) => name.toLowerCase().includes("msme"))),
    itcBooks: n(sumConn(execution, (name) => name.toLowerCase().includes("input gst"))),
    turnoverBooks: n(v("revenue")),
    invClose: n(inv),
  };
}
