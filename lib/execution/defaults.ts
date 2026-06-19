/**
 * Default-template factories for the Execution module.
 *
 * Each template registered here is reachable at /execution/[fsId]/[templateKey].
 * On first visit the corresponding factory seeds the working-paper with GL
 * lines + standard Indian-audit journal entries + audit assertions + variance
 * groups. Everything is editable — the user can add/remove/rename rows.
 *
 * JE patterns are drawn from canonical Indian-audit practice (Ind AS / AS,
 * Companies Act 2013, Income Tax Act, GST). They are deliberately representative
 * rather than exhaustive — the user adjusts them per engagement.
 */

import type {
  ExecAssertion,
  ExecGLLine,
  ExecJournalEntry,
  ExecutionTemplate,
  FrameworkNote,
  FsId,
  ImprovementCard,
  VarianceCheck,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { ppeLifecycleSeed } from "@/lib/execution/ppe-lifecycle";

export interface TemplateMeta {
  key: string;       // url slug (e.g. "ppe", "ar")
  id: string;        // global id (e.g. "bs-ppe")
  fsId: FsId;
  name: string;
  framework: string; // displayed in banner
  caption: string;
  hasFullImpl: boolean;
  hasDepnCalc?: boolean; // shows the "Depreciation & DT" calculator tab
}

export const EXEC_FS_LABELS: Record<FsId, string> = {
  bs: "Balance Sheet",
  pl: "Profit & Loss",
  cf: "Cash Flow",
  eq: "Statement of Changes in Equity",
};

// ─────────────────────────────────────────────────────────────────────────
// Registry — every template the user can navigate to.
// `hasFullImpl=true` means defaults factory provides seeded content.
// ─────────────────────────────────────────────────────────────────────────

export const EXEC_REGISTRY: Record<FsId, TemplateMeta[]> = {
  bs: [
    { key: "ppe", id: "bs-ppe", fsId: "bs", name: "PPE & Capital WIP", framework: "Ind AS 16 · 36 · 23 · Schedule II", caption: "Property, Plant & Equipment + CWIP", hasFullImpl: true, hasDepnCalc: true },
    { key: "rou", id: "bs-rou", fsId: "bs", name: "Right-of-Use Assets", framework: "Ind AS 116", caption: "Lease assets — ROU + Lease liability split", hasFullImpl: true },
    { key: "intangibles", id: "bs-intangibles", fsId: "bs", name: "Intangible Assets", framework: "Ind AS 38", caption: "Goodwill, software, trademarks — amortisation + impairment", hasFullImpl: true },
    { key: "investments", id: "bs-investments", fsId: "bs", name: "Investments — Bonds & FDs", framework: "Ind AS 109 EIR · ECL · AC/FVOCI", caption: "Financial assets — classification, EIR amortisation", hasFullImpl: true },
    { key: "ar", id: "bs-ar", fsId: "bs", name: "Trade Receivables", framework: "Ind AS 109 ECL", caption: "AR ageing, ECL provisioning, confirmations", hasFullImpl: true },
    { key: "inventory", id: "bs-inventory", fsId: "bs", name: "Inventory", framework: "Ind AS 2", caption: "Valuation, NRV test, count attendance", hasFullImpl: true },
    { key: "cash", id: "bs-cash", fsId: "bs", name: "Cash & Cash Equivalents", framework: "Ind AS 7", caption: "Bank reconciliation, fixed deposits, FX", hasFullImpl: true },
    { key: "prepaid", id: "bs-prepaid", fsId: "bs", name: "Prepaid Expenses", framework: "Ind AS 1", caption: "Cut-off + amortisation schedule", hasFullImpl: true },
    { key: "loans", id: "bs-loans", fsId: "bs", name: "Loans & Advances", framework: "Ind AS 109", caption: "Recoverability, related-party advances", hasFullImpl: true },
    { key: "borrowings", id: "bs-borrowings", fsId: "bs", name: "Borrowings — Term Loans", framework: "Ind AS 109 · 23", caption: "Long-term borrowings, EIR, borrowing-cost capitalisation", hasFullImpl: true },
    { key: "lease-liab", id: "bs-lease-liab", fsId: "bs", name: "Lease Liabilities", framework: "Ind AS 116", caption: "Lease liability roll-forward, interest accrual", hasFullImpl: true },
    { key: "rp-loans", id: "bs-rp-loans", fsId: "bs", name: "Related-Party Loans", framework: "Ind AS 24 · Companies Act §188", caption: "Related-party borrowing — arm's-length test", hasFullImpl: true },
    { key: "dtl", id: "bs-dtl", fsId: "bs", name: "Deferred Tax Liability", framework: "Ind AS 12", caption: "DTL roll-forward, temporary-difference schedule", hasFullImpl: true },
    { key: "ap", id: "bs-ap", fsId: "bs", name: "Trade & Other Payables", framework: "Ind AS 1 · GST", caption: "Creditors, GSTR-2B reconciliation, MSME reporting", hasFullImpl: true },
    { key: "st-borrow", id: "bs-st-borrow", fsId: "bs", name: "Short-Term Borrowings", framework: "Ind AS 109", caption: "Working-capital limits, CC/OD facilities", hasFullImpl: true },
    { key: "tax-payable", id: "bs-tax-payable", fsId: "bs", name: "Tax Payable", framework: "Income Tax Act · GST", caption: "Current tax, advance tax credit, TDS", hasFullImpl: true },
    { key: "accrued", id: "bs-accrued", fsId: "bs", name: "Accrued Expenses", framework: "Ind AS 1 · 19", caption: "Salaries, audit fees, utilities accruals", hasFullImpl: true },
    { key: "share-capital", id: "bs-share-capital", fsId: "bs", name: "Share Capital", framework: "Companies Act §43", caption: "Equity & preference share capital", hasFullImpl: false },
    { key: "retained", id: "bs-retained", fsId: "bs", name: "Retained Earnings", framework: "Ind AS 1", caption: "Dividend distribution, transfer to reserves", hasFullImpl: false },
    { key: "oci", id: "bs-oci", fsId: "bs", name: "Other Comprehensive Income", framework: "Ind AS 1", caption: "OCI items — FVOCI, actuarial gains/losses", hasFullImpl: false },
  ],
  // Profit & Loss has no per-GL templates — it is a generated reconciliation
  // statement (see /execution/pl · PLReconciliation), with AUTO rolled up from
  // the Balance-Sheet templates' Connected GLs.
  pl: [],
  // Cash Flow has no per-GL templates — it is a generated reconciliation
  // statement (see /execution/cf · CFReconciliation), with AUTO derived from the
  // P&L roll-up + Connected-GL add-backs.
  cf: [],
  // Statement of Changes in Equity has no per-GL templates — it is a generated
  // reconciliation statement (see /execution/eq · EQReconciliation), with AUTO
  // from the P&L roll-up (PAT) + Connected-GL OCI.
  eq: [],
};

export function findTemplateMeta(fsId: FsId, key: string): TemplateMeta | null {
  return EXEC_REGISTRY[fsId]?.find((t) => t.key === key) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────

function emptyAssertions(extra?: { label: string; notes?: string }[]): ExecAssertion[] {
  const base: ExecAssertion[] = [
    { id: uid("as"), label: "Existence", covered: false, notes: "" },
    { id: uid("as"), label: "Rights & Obligations", covered: false, notes: "" },
    { id: uid("as"), label: "Completeness", covered: false, notes: "" },
    { id: uid("as"), label: "Valuation & Allocation", covered: false, notes: "" },
    { id: uid("as"), label: "Presentation & Disclosure", covered: false, notes: "" },
  ];
  if (extra) base.push(...extra.map((e) => ({ id: uid("as"), covered: false, notes: e.notes ?? "", label: e.label })));
  return base;
}

function gl(label: string, notes = ""): ExecGLLine {
  return { id: uid("gl"), label, bookAmt: "", tbAmt: "", notes };
}

function je(description: string, dr: string, cr: string): ExecJournalEntry {
  return { id: uid("je"), description, dr, cr, amount: "" };
}

function vc(groupLabel: string): VarianceCheck {
  return { groupLabel, diffPct: 0, notes: "" };
}

function makeTemplate(meta: TemplateMeta, parts: Partial<Omit<ExecutionTemplate, "id" | "fsId" | "name" | "status" | "reviewerSignoff" | "connectedGLs">>): ExecutionTemplate {
  return {
    id: meta.id,
    fsId: meta.fsId,
    name: meta.name,
    glLines: parts.glLines ?? [],
    connectedGLs: [],
    varianceChecks: parts.varianceChecks ?? [],
    assertions: parts.assertions ?? emptyAssertions(),
    journalEntries: parts.journalEntries ?? [],
    lifecycleStages: parts.lifecycleStages,
    framework: parts.framework,
    improvements: parts.improvements,
    reviewerSignoff: null,
    status: "pending",
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Lifecycle / improvements helpers
// ─────────────────────────────────────────────────────────────────────────

function imp(title: string, body: string, category?: string): ImprovementCard {
  return { id: uid("imp"), title, body, category };
}

// ─────────────────────────────────────────────────────────────────────────
// BS — Full template factories
// ─────────────────────────────────────────────────────────────────────────

const PPE_FRAMEWORK: FrameworkNote = {
  title: "Ind AS 16 — Recognition, Measurement & Depreciation",
  body:
    "An item of PPE is recognised when future economic benefits are probable and cost can be measured reliably. " +
    "Initial measurement = cost (purchase price + directly attributable costs + dismantling obligation). " +
    "Subsequent measurement: Cost model (cost less accumulated depreciation & impairment) OR Revaluation model " +
    "(fair value less subsequent depreciation & impairment). Depreciation over the asset's useful life using SLM " +
    "or WDV; Schedule II specifies minimum useful lives. Ind AS 36 governs impairment testing.",
  chips: ["Ind AS 16", "Ind AS 36", "Ind AS 23", "Ind AS 12", "Schedule II"],
};

function ppeImprovements(): ImprovementCard[] {
  return [
    imp("Asset Register Reconciliation",
      "Obtain the fixed asset register (FAR) and reconcile gross block + accumulated depreciation to the trial balance / general ledger. Investigate any reconciling item >₹1L. Sample 20 high-value assets and trace from FAR to original purchase invoice + GRN + physical existence.",
      "Verification"),
    imp("Physical Verification (SA 501)",
      "Attend management's physical verification — 100% for assets >₹50L, 30% stratified sample for others. Investigate location mismatches. For assets not located, treat as fictitious until proven otherwise. Document FAR-tag → physical-tag mapping.",
      "Procedure"),
    imp("Depreciation Recomputation",
      "Independently recompute depreciation for a sample of 25 assets across blocks: (a) verify cost base + residual value + useful life vs Sch II minimum; (b) recompute SLM/WDV; (c) reconcile to ledger. Common errors: useful life shorter than Sch II minimum; revaluation reserve not amortised; RV not deducted from depreciable base.",
      "Procedure"),
    imp("Deferred Tax on PPE (Ind AS 12)",
      "Largest single source of DT for most manufacturing entities. Procedure: (a) get tax depreciation schedule (Form 3CD); (b) recompute IT depreciation = opening + additions − disposals × rate; (c) reconcile closing tax WDV; (d) DT = (Book WDV − Tax WDV) × 25.168% (if Sec 115BAA) or 25.17% / 30%. Positive = DTL, negative = DTA.",
      "Compliance"),
    imp("CWIP Ageing",
      "Generate CWIP ageing report. Investigate projects >12 months — verify continued intention to complete + recoverability. Projects >3 years are red flag for impairment / abandonment. Schedule III now requires CWIP ageing disclosure (Amendment 2021).",
      "Verification"),
    imp("Impairment Indicators (Ind AS 36 para 12)",
      "Document indicators reviewed: (a) declining market value; (b) adverse changes in tech/economic/regulatory environment; (c) increased market interest rates; (d) carrying amount of net assets > market cap; (e) obsolescence; (f) idle assets; (g) plans to dispose. If any present → perform full impairment test.",
      "Procedure"),
    imp("Capital Commitments Disclosure",
      "Schedule III requires disclosure of capital commitments not provided for (estimated amount of contracts on capital account remaining to be executed). Obtain capex commitment register + verify outstanding PO list. Cross-check to board minutes for major approvals.",
      "Compliance"),
    imp("Related-Party Transfers (Ind AS 24 · §188)",
      "Identify any PPE transferred to/from related parties during the year. Verify arm's-length pricing — independent valuation if material. Disclose under Ind AS 24. Also check Sec 188 Companies Act compliance for transactions above prescribed limits.",
      "Verification"),
  ];
}

function ppeAssertions(): ExecAssertion[] {
  // 7 PPE-cycle assertions [E][C][V][P][I][D][T]. Notes are pre-seeded with the
  // canonical key-points so the auditor sees the procedure guidance inline; they
  // remain fully editable (auditor overwrites with engagement-specific evidence refs).
  const a = (label: string, notes: string): ExecAssertion => ({ id: uid("as"), label, covered: false, notes });
  return [
    a("[E] Existence & Physical Verification",
      "SA 501: observe management's physical verification / perform independent counts for material classes. 100% for assets >₹50L; risk-stratified sample for the rest. Agree register → floor (tag/serial/condition/location) AND reverse-trace floor → register. Assets not located: treat as fictitious until proven."),
    a("[C] Completeness & CWIP Monitoring",
      "All owned/controlled assets recorded; no stale CWIP. Review CWIP ageing per Schedule III Amendment 2021 — items >12 months need a management explanation; >18 months flag impairment risk."),
    a("[V] Valuation — Depreciation, Componentisation & Residual Value",
      "Depreciation correctly computed; useful lives ≥ Schedule II minimum; residual value reasonable (review annually); component accounting applied where parts have materially different lives. Recompute a sample of 25 assets — see Depreciation & DT tab."),
    a("[P] Classification — Capex vs Opex & Right Period",
      "Repairs & maintenance not capitalised; capitalisation cut-off correct; borrowing-cost eligibility verified (qualifying asset >12m; suspend on interruption >3m). Capitalise only if it extends life / upgrades capacity / enables a new use."),
    a("[I] Impairment — Ind AS 36 Review",
      "External (market decline, adverse regulation, rate rises) and internal (underperformance, redundancy, damage) indicators assessed. Where triggered, compute Recoverable Amount = higher of VIU and FVLCD at the CGU level; challenge management's cash-flow assumptions & discount rate."),
    a("[D] Disclosures — Ind AS 16 para 73–79",
      "Gross-block movement table, depreciation methods & useful lives per class, fully-depreciated-but-in-use assets, P&L line-item split, assets pledged/restricted, capital commitments, CWIP ageing (Schedule III), revaluation info if applicable."),
    a("[T] Deferred Tax — Ind AS 12 Timing Differences",
      "DTL/DTA on Book WDV vs Tax WDV correctly computed and tax rate applied (25.168% under Sec 115BAA, else slab). DTL when tax depn > book depn (early years); DTA when book depn > tax depn (assess recoverability). Reconcile to Form 3CD tax depreciation."),
  ];
}

function ppeTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    assertions: ppeAssertions(),
    glLines: [
      gl("Land — Gross Block"),
      gl("Buildings — Gross Block"),
      gl("Plant & Machinery — Gross Block"),
      gl("Computers — Gross Block"),
      gl("Vehicles — Gross Block"),
      gl("Furniture & Fixtures — Gross Block"),
      gl("Office Equipment — Gross Block"),
      gl("Capital Work-in-Progress (CWIP)"),
      gl("Accumulated Depreciation — Buildings"),
      gl("Accumulated Depreciation — Plant & Machinery"),
      gl("Accumulated Depreciation — Other Blocks"),
      gl("Depreciation Expense (to P&L)"),
      gl("Impairment Loss"),
    ],
    // Legacy flat JE list kept as fallback. The page renders lifecycleStages
    // when present, so journalEntries here is only displayed if a future code
    // path falls back to it.
    journalEntries: [
      je("Purchase of plant & machinery", "Plant & Machinery A/c", "Bank / Vendor A/c"),
      je("Depreciation for the year (Schedule II)", "Depreciation Expense A/c", "Accumulated Depreciation A/c"),
      je("Disposal of asset — at WDV", "Bank / Loss on Sale A/c", "PPE Block (net) A/c"),
    ],
    lifecycleStages: ppeLifecycleSeed(),
    framework: PPE_FRAMEWORK,
    improvements: ppeImprovements(),
    varianceChecks: [vc("Gross Block"), vc("Accumulated Depreciation"), vc("Net Block (WDV)"), vc("Depreciation Expense")],
  });
}

function rouTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Right-of-Use Asset — Office Lease"),
      gl("Right-of-Use Asset — Equipment Lease"),
      gl("Accumulated Depreciation — ROU Asset"),
      gl("Lease Liability — Current Portion"),
      gl("Lease Liability — Non-Current Portion"),
      gl("Depreciation on ROU (to P&L)"),
      gl("Interest on Lease Liability (Finance Cost)"),
    ],
    journalEntries: [
      je("Initial recognition of ROU asset & Lease Liability", "Right-of-Use Asset A/c", "Lease Liability A/c"),
      je("Depreciation on ROU asset (straight-line over lease term)", "Depreciation Expense A/c", "Accumulated Depreciation — ROU A/c"),
      je("Interest accrual on lease liability (EIR)", "Finance Cost A/c", "Lease Liability A/c"),
      je("Lease rental payment", "Lease Liability A/c", "Bank A/c"),
      je("Reassessment / modification of lease", "Right-of-Use Asset A/c", "Lease Liability A/c"),
    ],
    varianceChecks: [vc("ROU Gross"), vc("Accumulated Depreciation"), vc("Lease Liability"), vc("Finance Cost on Leases")],
  });
}

function intangiblesTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Goodwill — Gross"),
      gl("Software — Gross"),
      gl("Trademarks & Patents — Gross"),
      gl("Customer Relationships — Gross"),
      gl("Capital WIP (Intangibles under development)"),
      gl("Accumulated Amortisation — Software"),
      gl("Accumulated Amortisation — Trademarks"),
      gl("Amortisation Expense (to P&L)"),
      gl("Impairment Loss — Goodwill / Intangibles"),
    ],
    journalEntries: [
      je("Acquisition of trademark / patent", "Trademarks & Patents A/c", "Bank / Vendor A/c"),
      je("Capitalisation of internally-developed software (Ind AS 38 — development phase)", "Software A/c", "Capital WIP A/c"),
      je("Amortisation for the year (useful life basis)", "Amortisation Expense A/c", "Accumulated Amortisation A/c"),
      je("Impairment of goodwill (Ind AS 36 — annual test)", "Impairment Loss A/c", "Goodwill A/c"),
      je("Research-phase costs expensed (cannot capitalise)", "R&D Expense A/c", "Bank / Payable A/c"),
    ],
    varianceChecks: [vc("Gross Intangibles"), vc("Accumulated Amortisation"), vc("Amortisation Expense"), vc("Impairment")],
  });
}

function investmentsTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Investments — AC (Bonds held to maturity)"),
      gl("Investments — FVOCI (Available-for-sale debt)"),
      gl("Investments — FVTPL (Trading securities)"),
      gl("Fixed Deposits with Banks (>12m)"),
      gl("Interest Accrued on Investments"),
      gl("ECL Allowance on Debt Investments"),
      gl("Fair Value Reserve — OCI (FVOCI)"),
      gl("Interest Income (to P&L)"),
    ],
    journalEntries: [
      je("Purchase of bond at premium / discount", "Investments — AC A/c", "Bank A/c"),
      je("EIR-based interest accrual", "Interest Accrued A/c", "Interest Income A/c"),
      je("Coupon receipt", "Bank A/c", "Interest Accrued A/c"),
      je("FVOCI fair-value change (to OCI)", "Investments — FVOCI A/c", "Fair Value Reserve — OCI"),
      je("ECL provision movement (Ind AS 109)", "ECL Expense A/c", "ECL Allowance A/c"),
      je("FD maturity — principal + interest received", "Bank A/c", "Fixed Deposit A/c + Interest Income"),
    ],
    varianceChecks: [vc("AC Investments"), vc("FVOCI Investments"), vc("FVTPL Investments"), vc("Interest Income")],
  });
}

function arTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Trade Receivables — Current (<6m)"),
      gl("Trade Receivables — 6-12m"),
      gl("Trade Receivables — 12-24m"),
      gl("Trade Receivables — >24m (doubtful)"),
      gl("ECL Allowance — Trade Receivables"),
      gl("Bills Receivable"),
      gl("Bad Debt Expense (to P&L)"),
      gl("ECL Reversal (to P&L)"),
    ],
    journalEntries: [
      je("Credit sale recognised", "Trade Receivables A/c", "Revenue from Operations A/c"),
      je("Sale + GST (output)", "Trade Receivables A/c", "Revenue A/c + Output GST A/c"),
      je("Cash receipt from customer", "Bank A/c", "Trade Receivables A/c"),
      je("Sales return", "Sales Returns A/c", "Trade Receivables A/c"),
      je("Bad debt write-off", "Bad Debt Expense A/c", "Trade Receivables A/c"),
      je("ECL provisioning (Ind AS 109 — simplified approach)", "ECL Expense A/c", "ECL Allowance A/c"),
      je("Recovery of bad debt previously written off", "Bank A/c", "Bad Debt Recovery A/c"),
    ],
    varianceChecks: [vc("AR Gross"), vc("ECL Allowance"), vc("Net AR"), vc("Bad Debt Expense")],
  });
}

function inventoryTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Raw Materials"),
      gl("Work-in-Progress"),
      gl("Finished Goods"),
      gl("Stores & Spares"),
      gl("Goods-in-Transit"),
      gl("Inventory NRV Write-down Allowance"),
      gl("Inventory Obsolescence Provision"),
      gl("Cost of Goods Sold (to P&L)"),
    ],
    journalEntries: [
      je("Purchase of raw materials", "Raw Materials A/c", "Trade Payables A/c"),
      je("Production — RM consumed", "Work-in-Progress A/c", "Raw Materials A/c"),
      je("Production — overhead absorption", "Work-in-Progress A/c", "Factory Overheads A/c"),
      je("Completion of production", "Finished Goods A/c", "Work-in-Progress A/c"),
      je("Sale — COGS recognition", "Cost of Goods Sold A/c", "Finished Goods A/c"),
      je("NRV write-down (Ind AS 2)", "Inventory Write-down Expense A/c", "Inventory A/c (or Allowance)"),
      je("Obsolescence provision", "Obsolescence Expense A/c", "Obsolescence Provision A/c"),
      je("Physical count adjustment (shortage)", "Inventory Shortage A/c", "Inventory A/c"),
    ],
    varianceChecks: [vc("Raw Materials"), vc("WIP"), vc("Finished Goods"), vc("COGS")],
  });
}

function cashTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Cash on Hand"),
      gl("Bank — Current Account #1"),
      gl("Bank — Current Account #2"),
      gl("Bank — OD/CC Account"),
      gl("Fixed Deposits (≤3m, treated as cash equivalents)"),
      gl("Foreign Currency Bank Accounts"),
      gl("Bank Charges (to P&L)"),
      gl("Foreign Exchange Gain / Loss (to P&L)"),
    ],
    journalEntries: [
      je("Cash deposit into bank", "Bank A/c", "Cash on Hand A/c"),
      je("Cheque issued to vendor", "Trade Payables A/c", "Bank A/c"),
      je("Bank charges debited", "Bank Charges A/c", "Bank A/c"),
      je("Interest credited on FD (≤3m)", "Bank / FD A/c", "Interest Income A/c"),
      je("FX revaluation (period-end)", "FX Gain/(Loss) A/c", "Foreign Currency Bank A/c"),
      je("Reconciliation adjustment — cheques in transit", "Bank A/c (per books)", "Cheques in Transit A/c"),
    ],
    varianceChecks: [vc("Cash + Bank balances"), vc("Bank charges"), vc("FX gain/loss")],
  });
}

function prepaidTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Prepaid Insurance"),
      gl("Prepaid Rent"),
      gl("Prepaid Maintenance / AMCs"),
      gl("Prepaid Software Licenses"),
      gl("Advance to Suppliers (non-financial)"),
      gl("Prepaid Expense Amortisation (to P&L)"),
    ],
    journalEntries: [
      je("Insurance premium paid in advance (annual)", "Prepaid Insurance A/c", "Bank A/c"),
      je("Monthly amortisation of prepaid insurance", "Insurance Expense A/c", "Prepaid Insurance A/c"),
      je("Advance rent paid", "Prepaid Rent A/c", "Bank A/c"),
      je("Rent expense recognition (monthly)", "Rent Expense A/c", "Prepaid Rent A/c"),
      je("AMC paid for IT support (12 months)", "Prepaid AMC A/c", "Bank A/c"),
    ],
    varianceChecks: [vc("Prepaid Balances"), vc("Amortisation Expense")],
  });
}

function borrowingsTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Term Loan from Bank — Principal Outstanding"),
      gl("Term Loan — Current Maturity"),
      gl("Debentures / Bonds Issued"),
      gl("External Commercial Borrowings (ECB)"),
      gl("Unamortised Loan Origination Fees (contra)"),
      gl("Interest Accrued but Not Due"),
      gl("Finance Cost (to P&L)"),
    ],
    journalEntries: [
      je("Term loan drawdown", "Bank A/c", "Term Loan A/c"),
      je("Loan origination fees paid", "Unamortised Loan Fees A/c (contra)", "Bank A/c"),
      je("Interest accrual on loan (EIR)", "Finance Cost A/c", "Interest Accrued A/c"),
      je("Interest payment", "Interest Accrued A/c", "Bank A/c"),
      je("Principal repayment (EMI)", "Term Loan A/c", "Bank A/c"),
      je("Reclassify current maturity (within 12m)", "Term Loan — Non-Current", "Term Loan — Current Maturity"),
      je("Capitalisation of borrowing costs (Ind AS 23 — qualifying asset)", "Capital WIP A/c", "Finance Cost A/c"),
    ],
    varianceChecks: [vc("Loan Principal"), vc("Interest Accrued"), vc("Finance Cost")],
  });
}

function apTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Trade Payables — Goods (non-MSME)"),
      gl("Trade Payables — MSME"),
      gl("Trade Payables — Services"),
      gl("Trade Payables — Related Parties"),
      gl("Bills Payable"),
      gl("Input GST Credit Receivable"),
      gl("MSME Interest Expense (Sec 16, MSMED Act)"),
    ],
    journalEntries: [
      je("Goods purchase on credit", "Purchases A/c", "Trade Payables A/c"),
      je("Goods + GST input", "Purchases A/c + Input GST A/c", "Trade Payables A/c"),
      je("Services rendered on credit", "Service Expense A/c", "Trade Payables A/c"),
      je("Payment to supplier", "Trade Payables A/c", "Bank A/c"),
      je("MSME interest accrual (45-day rule, Sec 16 MSMED)", "MSME Interest Expense A/c", "Trade Payables — MSME A/c"),
      je("GSTR-2B reconciliation — credit not reflected", "Input GST Suspense A/c", "Trade Payables A/c"),
      je("Discount earned on early payment", "Trade Payables A/c", "Discount Income A/c"),
    ],
    varianceChecks: [vc("Trade Payables Total"), vc("MSME Payables"), vc("Input GST"), vc("MSME Interest")],
  });
}

// ─────────────────────────────────────────────────────────────────────────
// PL — Full template factories
// ─────────────────────────────────────────────────────────────────────────

function revenueTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Sales — Domestic"),
      gl("Sales — Exports"),
      gl("Service Revenue"),
      gl("Sales Returns (contra)"),
      gl("Discounts & Rebates (contra)"),
      gl("Royalty Income"),
      gl("Other Operating Income"),
      gl("Output GST (to BS)"),
    ],
    journalEntries: [
      je("Credit sale (revenue recognition per Ind AS 115 5-step)", "Trade Receivables A/c", "Revenue from Operations A/c"),
      je("Sale + GST (B2B)", "Trade Receivables A/c", "Revenue A/c + Output GST A/c"),
      je("Sales return", "Sales Returns A/c", "Trade Receivables A/c"),
      je("Trade discount / rebate", "Discount Allowed A/c", "Trade Receivables A/c"),
      je("Export sale + ITC eligible", "Trade Receivables (Foreign) A/c", "Export Revenue A/c"),
      je("Service rendered — % completion / time-based", "Trade Receivables A/c", "Service Revenue A/c"),
      je("Cut-off adjustment — March invoice not yet recognised (SA 240 risk)", "Trade Receivables A/c", "Revenue A/c"),
      je("Royalty accrual", "Royalty Receivable A/c", "Royalty Income A/c"),
    ],
    varianceChecks: [vc("Total Revenue"), vc("Sales Returns"), vc("Output GST"), vc("Net Revenue")],
    assertions: emptyAssertions([
      { label: "Cut-off (SA 240 §26 — Revenue presumed risk)" },
      { label: "Occurrence (no fictitious sales)" },
    ]),
  });
}

function cogsTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Opening Stock"),
      gl("Add: Purchases"),
      gl("Add: Direct Labour"),
      gl("Add: Production Overhead"),
      gl("Less: Closing Stock"),
      gl("Cost of Goods Sold (Total)"),
      gl("Gross Profit"),
    ],
    journalEntries: [
      je("Sale — COGS recognition", "Cost of Goods Sold A/c", "Finished Goods A/c"),
      je("Direct labour absorbed", "Work-in-Progress A/c", "Wages Payable A/c"),
      je("Production overhead absorbed", "Work-in-Progress A/c", "Factory Overheads A/c"),
      je("Period-end inventory adjustment", "Inventory A/c", "Cost of Goods Sold A/c"),
      je("Inventory write-down to NRV", "NRV Write-down Expense A/c", "Inventory A/c"),
    ],
    varianceChecks: [vc("Materials Consumed"), vc("Direct Labour"), vc("Production Overhead"), vc("COGS Total")],
  });
}

function payrollTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Salaries & Wages — Office"),
      gl("Salaries & Wages — Factory (to WIP/COGS)"),
      gl("PF Contribution — Employer"),
      gl("ESI Contribution — Employer"),
      gl("Gratuity Expense (Ind AS 19)"),
      gl("Leave Encashment Expense"),
      gl("Bonus & Incentives"),
      gl("Staff Welfare"),
    ],
    journalEntries: [
      je("Monthly salary accrual", "Salary Expense A/c", "Salaries Payable A/c + TDS Payable A/c"),
      je("Salary payment", "Salaries Payable A/c", "Bank A/c"),
      je("PF contribution — employer share", "PF Expense A/c", "PF Payable A/c"),
      je("ESI contribution — employer share", "ESI Expense A/c", "ESI Payable A/c"),
      je("Statutory dues paid (PF/ESI/PT)", "PF Payable / ESI Payable A/c", "Bank A/c"),
      je("Gratuity expense (actuarial valuation per Ind AS 19)", "Gratuity Expense A/c", "Gratuity Liability A/c"),
      je("Bonus declared", "Bonus Expense A/c", "Bonus Payable A/c"),
    ],
    varianceChecks: [vc("Salaries Total"), vc("Statutory Contributions"), vc("Gratuity"), vc("Bonus & Incentives")],
  });
}

function depreciationTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Depreciation on Buildings"),
      gl("Depreciation on Plant & Machinery"),
      gl("Depreciation on Computers"),
      gl("Depreciation on Vehicles"),
      gl("Depreciation on Furniture"),
      gl("Amortisation of Intangibles"),
      gl("Depreciation on ROU Assets"),
      gl("Total Depreciation & Amortisation"),
    ],
    journalEntries: [
      je("Depreciation for the year — Buildings (Sch II straight-line)", "Depreciation Expense A/c", "Accum. Depreciation — Buildings A/c"),
      je("Depreciation — Plant & Machinery (Sch II)", "Depreciation Expense A/c", "Accum. Depreciation — P&M A/c"),
      je("Amortisation of software (over useful life)", "Amortisation Expense A/c", "Accum. Amortisation — Software A/c"),
      je("Depreciation on ROU asset (Ind AS 116)", "Depreciation Expense A/c", "Accum. Depreciation — ROU A/c"),
      je("Disposal — pro-rata depreciation for partial year", "Depreciation Expense A/c", "Accum. Depreciation A/c"),
    ],
    varianceChecks: [vc("Depreciation — Tangible"), vc("Amortisation — Intangible"), vc("Depreciation — ROU"), vc("Total D&A")],
  });
}

function taxTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Current Tax Expense"),
      gl("Deferred Tax Expense / (Income)"),
      gl("MAT Credit Utilised / (Created)"),
      gl("Prior Period Tax Adjustment"),
      gl("Total Tax Expense"),
      gl("Advance Tax Paid (to BS — adjusted)"),
      gl("TDS Receivable (to BS — adjusted)"),
    ],
    journalEntries: [
      je("Current tax provision (per Income Tax computation)", "Current Tax Expense A/c", "Provision for Tax A/c"),
      je("Advance tax payment", "Advance Tax A/c", "Bank A/c"),
      je("Deferred tax — timing differences (Ind AS 12)", "Deferred Tax Expense A/c", "Deferred Tax Liability A/c"),
      je("Deferred tax asset recognition (carry-forward losses)", "Deferred Tax Asset A/c", "Deferred Tax Income A/c"),
      je("MAT credit recognition", "MAT Credit Entitlement A/c", "Current Tax Expense A/c"),
      je("MAT credit utilisation (subsequent year)", "Current Tax Expense A/c", "MAT Credit Entitlement A/c"),
      je("Set-off advance tax + TDS against provision", "Provision for Tax A/c", "Advance Tax + TDS Receivable A/c"),
    ],
    varianceChecks: [vc("Current Tax"), vc("Deferred Tax"), vc("MAT Credit"), vc("Effective Tax Rate")],
  });
}

// ─────────────────────────────────────────────────────────────────────────
// CF + EQ — Full template factories
// ─────────────────────────────────────────────────────────────────────────

function cfOperatingTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Profit Before Tax (from P&L)"),
      gl("Adjustments: Depreciation & Amortisation"),
      gl("Adjustments: Finance Cost"),
      gl("Adjustments: Interest Income"),
      gl("Working Capital Changes: AR (Inc) / Dec"),
      gl("Working Capital Changes: Inventory (Inc) / Dec"),
      gl("Working Capital Changes: AP Inc / (Dec)"),
      gl("Income Tax Paid"),
      gl("Net Cash from Operating Activities"),
    ],
    journalEntries: [
      je("(Memo) Cash flow workings — derived from BS movements", "—", "—"),
      je("(Memo) PBT + non-cash adjustments → operating cash before WC", "—", "—"),
      je("(Memo) WC changes from comparative BS", "—", "—"),
      je("(Memo) Tax paid = opening provision + current tax − closing provision", "—", "—"),
    ],
    varianceChecks: [vc("PBT"), vc("Non-cash Adjustments"), vc("Working Capital Changes"), vc("Net Operating CF")],
    assertions: emptyAssertions([
      { label: "Reconciliation to net change in cash" },
      { label: "Classification (Operating vs Investing vs Financing)" },
    ]),
  });
}

function cfCapexTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Purchase of Fixed Assets (Cash)"),
      gl("Purchase of Intangible Assets"),
      gl("Proceeds from Disposal of Fixed Assets"),
      gl("Interest Capitalised (added back to investing)"),
      gl("Net Cash used in Investing — Capex"),
    ],
    journalEntries: [
      je("(Memo) Capex = closing gross block − opening gross block + disposal cost", "—", "—"),
      je("(Memo) Add back non-cash additions (revaluation, CWIP transfer)", "—", "—"),
      je("(Memo) Disposal proceeds from P&L gain/loss + WDV", "—", "—"),
    ],
    varianceChecks: [vc("Capex Outflow"), vc("Disposal Inflow"), vc("Net Investing — Capex")],
  });
}

function equityTemplate(meta: TemplateMeta) {
  return makeTemplate(meta, {
    glLines: [
      gl("Opening Share Capital"),
      gl("Add: Shares Issued During Year"),
      gl("Less: Buyback / Reduction"),
      gl("Closing Share Capital"),
      gl("Opening Retained Earnings"),
      gl("Add: Profit for the Year"),
      gl("Less: Dividends Declared"),
      gl("Less: Transfer to Reserves"),
      gl("Closing Retained Earnings"),
      gl("Opening OCI Reserve"),
      gl("Add: Other Comprehensive Income for Year"),
      gl("Closing OCI Reserve"),
      gl("Closing Total Equity"),
    ],
    journalEntries: [
      je("Issue of equity shares — at premium", "Bank A/c", "Share Capital A/c + Securities Premium A/c"),
      je("Profit transfer to reserves (Companies Act §123(1))", "Profit & Loss A/c", "General Reserve A/c"),
      je("Dividend declared", "Retained Earnings A/c", "Dividend Payable A/c"),
      je("Dividend distribution tax (now repealed but historical)", "Retained Earnings A/c", "DDT Payable A/c"),
      je("Buyback of shares (Companies Act §68)", "Share Capital A/c + Securities Premium A/c", "Bank A/c"),
      je("OCI: FVOCI gain to reserve", "Investments — FVOCI A/c", "OCI Reserve A/c"),
      je("OCI: Actuarial loss on gratuity", "OCI Reserve A/c", "Gratuity Liability A/c"),
    ],
    varianceChecks: [vc("Share Capital Movement"), vc("Retained Earnings Movement"), vc("OCI Movement"), vc("Total Equity")],
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Stub factory — for templates without a full impl
// ─────────────────────────────────────────────────────────────────────────

export function stubTemplate(meta: TemplateMeta): ExecutionTemplate {
  return makeTemplate(meta, {});
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────

const FULL_IMPL: Record<string, (meta: TemplateMeta) => ExecutionTemplate> = {
  "bs-ppe": ppeTemplate,
  "bs-rou": rouTemplate,
  "bs-intangibles": intangiblesTemplate,
  "bs-investments": investmentsTemplate,
  "bs-ar": arTemplate,
  "bs-inventory": inventoryTemplate,
  "bs-cash": cashTemplate,
  "bs-prepaid": prepaidTemplate,
  "bs-borrowings": borrowingsTemplate,
  "bs-ap": apTemplate,
  "pl-revenue": revenueTemplate,
  "pl-cogs": cogsTemplate,
  "pl-payroll": payrollTemplate,
  "pl-depreciation": depreciationTemplate,
  "pl-tax": taxTemplate,
  "cf-operating": cfOperatingTemplate,
  "cf-capex": cfCapexTemplate,
  "eq-equity": equityTemplate,
};

export function defaultTemplateFor(meta: TemplateMeta): ExecutionTemplate {
  const fn = FULL_IMPL[meta.id];
  if (fn) return fn(meta);
  return stubTemplate(meta);
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers exported for the template-detail page
// ─────────────────────────────────────────────────────────────────────────

/** Variance % helper — (book - tb) / tb × 100; safe for 0 or empty. */
export function varPct(bookStr: string, tbStr: string): number {
  const book = parseFloat(bookStr) || 0;
  const tb = parseFloat(tbStr) || 0;
  if (tb === 0) return 0;
  return ((book - tb) / tb) * 100;
}
