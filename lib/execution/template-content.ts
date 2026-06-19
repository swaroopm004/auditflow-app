/**
 * Per-template content registry for the Execution module — the GL-specific
 * "finalised PPE format" content for every GL template:
 *   framework note · lifecycle JE stages · audit assertions · additional checks.
 *
 * The renderer (components/execution/template-tabs.tsx) is generic and reads
 * from here by template id. Lifecycle stages seed the store (editable/persisted);
 * assertions & checks are reference content whose Yes/No marks persist via
 * ExecutionTemplate.checkStatus. Connected GLs auto-derive from the JE lines.
 */

import type { LifecycleStage, LifecycleTone } from "@/lib/types";
import { uid } from "@/lib/utils";
import { ppeLifecycleSeed } from "./ppe-lifecycle";

export type ChipTone = LifecycleTone | "blue" | "std";
export interface AssertionDef {
  badge: string;
  tone: LifecycleTone;
  name: string;
  desc: string;
  chips: { text: string; tone: ChipTone }[];
  note: string;
}
export interface CheckDef {
  n: number;
  tone: LifecycleTone;
  priority: string;
  title: string;
  sub: string;
  body: string;
}
export interface FrameworkDef { title: string; body: string; chips: string[] }

// Connected GLs — curated chart-of-accounts for the GL cycle (HTML-style grouped list).
export type AcctType = "Asset" | "Contra" | "Expense" | "Income" | "Liability" | "Equity";
export interface ConnAcctDef { icon: string; name: string; type: AcctType; cls: string }
export interface ConnGroupDef { label: string; startAt: number; tone: LifecycleTone }
export interface ConnectedDef { caption: string; accts: ConnAcctDef[]; groups: ConnGroupDef[] }

export interface TemplateContent {
  headChip: string;        // e.g. "🏭 PPE — Non-current Asset"
  framework: FrameworkDef;
  lifecycle: () => LifecycleStage[];
  assertions: AssertionDef[];
  checks: CheckDef[];
  connected?: ConnectedDef; // curated Connected GLs list; falls back to JE-derived if absent
  hasDepnCalc?: boolean;   // shows the Depreciation & DT calculator tab (PPE only)
}

// ── lifecycle seed builder (plain data → store-shaped stages with ids) ──────
type SL = [label: string, side: "Dr" | "Cr", emph?: string];
type SE = { ref: string; title: string; tone: LifecycleTone; note: string; lines: SL[] };
type SS = { key: string; label: string; icon: string; entries: SE[] };
function build(stages: SS[]): LifecycleStage[] {
  return stages.map((s) => ({
    key: s.key, label: s.label, icon: s.icon,
    entries: s.entries.map((e) => ({
      id: uid("le"), entryRef: e.ref, title: e.title, tone: e.tone, note: e.note,
      lines: e.lines.map(([label, side, emph]) => ({ id: uid("ll"), label, side, emph })),
    })),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// PPE & Capital WIP — Ind AS 16 (migrated; lifecycle from ppe-lifecycle.ts)
// ════════════════════════════════════════════════════════════════════════════
const PPE: TemplateContent = {
  headChip: "🏭 PPE — Non-current Asset",
  hasDepnCalc: true,
  connected: {
    caption: "All accounts in the PPE cycle · Gross block · Accumulated depreciation · Impairment · Deferred tax · CWIP",
    groups: [
      { label: "PPE Gross Block Accounts (Non-current Assets)", startAt: 0, tone: "ppe" },
      { label: "Capital Work-in-Progress", startAt: 7, tone: "amber" },
      { label: "Accumulated Depreciation & Impairment (Contra Accounts)", startAt: 8, tone: "purple" },
      { label: "P&L Impact — Depreciation, Impairment, Disposal Gain/Loss", startAt: 13, tone: "red" },
      { label: "Deferred Tax (Ind AS 12)", startAt: 18, tone: "accent" },
      { label: "Revaluation (OCI) & Decommissioning", startAt: 21, tone: "green" },
      { label: "Bank / Settlement", startAt: 23, tone: "green" },
    ],
    accts: [
      { icon: "🏭", name: "PPE — Land & Land Improvements", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏭", name: "PPE — Buildings", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏭", name: "PPE — Plant & Machinery", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏭", name: "PPE — Computers & Data Processing", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏭", name: "PPE — Vehicles", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏭", name: "PPE — Furniture & Fittings", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏭", name: "PPE — Office Equipment", type: "Asset", cls: "B/S — Non-current Assets (PPE)" },
      { icon: "🏗", name: "Capital Work-in-Progress A/c", type: "Asset", cls: "B/S — Non-current Assets (CWIP)" },
      { icon: "📉", name: "Accumulated Depreciation — Buildings", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "📉", name: "Accumulated Depreciation — Plant & Machinery", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "📉", name: "Accumulated Depreciation — Computers", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "📉", name: "Accumulated Depreciation — Others", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "⚠", name: "Accumulated Impairment Loss A/c", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "📊", name: "Depreciation Expense A/c", type: "Expense", cls: "P&L — Depreciation & Amortisation" },
      { icon: "⚠", name: "Impairment Loss A/c", type: "Expense", cls: "P&L — Exceptional / Other Expenses" },
      { icon: "💰", name: "Profit on Sale of Fixed Assets A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "💰", name: "Loss on Sale of Fixed Assets A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "📊", name: "Borrowing Cost Capitalised A/c", type: "Expense", cls: "P&L — Finance Costs (Contra — netted)" },
      { icon: "💹", name: "Deferred Tax Liability A/c (PPE)", type: "Liability", cls: "B/S — Non-current Liabilities" },
      { icon: "💹", name: "Deferred Tax Asset A/c (PPE)", type: "Asset", cls: "B/S — Non-current Assets" },
      { icon: "💹", name: "Deferred Tax Expense A/c", type: "Expense", cls: "P&L — Income Tax Expense" },
      { icon: "📊", name: "Revaluation Surplus A/c (OCI — Equity)", type: "Equity", cls: "Equity — Other Comprehensive Income" },
      { icon: "🚮", name: "Provision for Decommissioning A/c", type: "Liability", cls: "B/S — Non-current Provisions" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 16 — Recognition, Measurement & Depreciation",
    body: "An item of PPE is recognised when future economic benefits are probable and cost can be measured reliably. Initial measurement = cost (purchase price + directly attributable costs + dismantling obligation). Subsequent measurement: Cost model (cost less accumulated depreciation & impairment) OR Revaluation model. Depreciation over useful life using SLM or WDV; Schedule II specifies minimum useful lives. Ind AS 36 governs impairment testing.",
    chips: ["Ind AS 16", "Ind AS 36", "Ind AS 23", "Ind AS 12", "Schedule II"],
  },
  lifecycle: ppeLifecycleSeed,
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence & Physical Verification", desc: "Assets in the register physically exist; asset register agrees to floor; tagged",
      chips: [{ text: "📂 Asset Register", tone: "ppe" }, { text: "📋 Physical Verification Report", tone: "ppe" }, { text: "🧾 Invoices & POs", tone: "ppe" }],
      note: "Physical verification is the primary procedure for existence. Procedure: (a) sample the asset register and physically locate each asset; (b) reverse-trace floor assets to the register (completeness); (c) verify tag/serial; (d) 100% for assets >₹50L; (e) idle/surplus assets still booked, not removed; (f) third-party-held assets confirmed. SA 501 requires observing management's verification or independent counts for material classes." },
    { badge: "C", tone: "green", name: "Completeness & CWIP Monitoring", desc: "All assets owned/controlled are recorded; CWIP ageing reviewed; no stale CWIP",
      chips: [{ text: "CWIP Ageing (MCA 2021)", tone: "ppe" }, { text: "Stale CWIP Risk", tone: "amber" }],
      note: "Risks: year-end additions not capitalised; assets via business combination not recorded; low-value items expensed; CWIP ready-for-use not transferred (understates depreciation). Schedule III (2021) requires CWIP ageing (<1y, 1–2y, 2–3y, >3y). Stale CWIP >3y is a red flag — abandoned project, padding, or viability delay; review completion date + board approvals." },
    { badge: "V", tone: "amber", name: "Valuation — Depreciation, Componentisation & Residual Value", desc: "Depreciation correctly computed; useful lives appropriate; component accounting applied",
      chips: [{ text: "Ind AS 16 para 43–62", tone: "ppe" }, { text: "Schedule II", tone: "amber" }, { text: "Useful Life Review", tone: "std" }],
      note: "Key procedures: (a) recompute depreciation for material assets + a sample; (b) verify useful life ≥ Schedule II minimum (else written justification); (c) component accounting for parts with different lives; (d) residual value not <5% of cost; (e) pro-rata in year of commissioning; (f) fully-depreciated assets in use disclosed; (g) SLM↔WDV change = policy change (retrospective)." },
    { badge: "P", tone: "purple", name: "Classification — Capex vs Opex & Right Period", desc: "Repairs not capitalised; capitalisation period correct; borrowing-cost eligibility verified",
      chips: [{ text: "Ind AS 16 para 7", tone: "ppe" }, { text: "Ind AS 23 — Borr. Costs", tone: "std" }],
      note: "Capex/Opex bias is a key PPE risk. (a) scan R&M >₹5L for capital items; (b) scan PPE additions for revenue items; (c) borrowing costs — qualifying-asset test (>12m), correct rate & capitalisation window; (d) subsequent expenditure / major inspections componentised; (e) strategic spares capitalised, not inventory." },
    { badge: "I", tone: "red", name: "Impairment — Ind AS 36 Review", desc: "Indicators assessed; VIU / FVLCD computed where triggered; CGU allocations reviewed",
      chips: [{ text: "Ind AS 36 — Impairment Test", tone: "red" }, { text: "Impairment Indicators", tone: "amber" }],
      note: "Indicators (para 12): external (market decline, adverse tech/regulatory change, rate rises) and internal (obsolescence, damage, underperformance). Where present, recoverable amount = higher of VIU (PV of cash flows) and FVLCD; challenge discount rate & assumptions; assess at CGU level; allocate impairment to goodwill first, then pro-rata." },
    { badge: "D", tone: "amber", name: "Disclosures — Ind AS 16 para 73–79", desc: "Gross-block movement, methods, useful lives, restrictions, commitments, CWIP ageing",
      chips: [{ text: "Ind AS 16 para 73", tone: "ppe" }, { text: "Schedule III — Note", tone: "std" }],
      note: "Disclose gross-block & accumulated-depreciation movement per class, methods & useful lives, fully-depreciated-but-in-use assets, P&L line split, assets pledged/restricted, capital commitments, CWIP ageing (Sch III), capitalised borrowing costs, and revaluation info if applicable. Tie every disclosure to the asset register." },
    { badge: "T", tone: "accent", name: "Deferred Tax — Ind AS 12 Timing Differences", desc: "DTL/DTA on Book WDV vs Tax WDV correctly computed; rate applied; DTA recoverability assessed",
      chips: [{ text: "Ind AS 12 — Income Taxes", tone: "blue" }, { text: "IT Act Block Rates", tone: "amber" }],
      note: "Book WDV (Sch II) vs Tax WDV (IT Act blocks). Tax WDV < Book WDV → DTL; Tax WDV > Book WDV → DTA (recoverability test). Recompute IT depreciation from block opening + additions − disposals × rate; apply enacted rate (25.168% under Sec 115BAA); for DTA assess future taxable profit; DTL on revaluation goes to OCI." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Physical Verification — Systematic Programme with Risk-based Sampling", sub: "SA 501 · Physical Verification · Asset Tagging",
      body: "Obtain the asset register, categorise by location/class/value; 100% for assets >₹50L, statistical sampling otherwise. For each: locate physically, verify tag/serial, confirm condition & location. Reverse-trace 10–15 floor assets to register. Obtain gate passes for assets out for repair, acknowledgements for assets at customer sites. Common finding: scrapped assets still in books; assets present but written off." },
    { n: 2, tone: "red", priority: "High", title: "Capex vs Opex Classification — Repairs & Maintenance Scrutiny", sub: "SA 540 · Ind AS 16 para 7 · Management Bias",
      body: "Most common PPE misstatement: capitalising items that should be expensed. Scan all R&M entries >₹5L for capital-nature items; scan PPE additions for revenue items; evaluate against Ind AS 16 para 7 (increases future benefits / extends life / adds capacity). Watch aggregation of small items and pre-bonus/pre-covenant bias (R&M as % of revenue vs prior year)." },
    { n: 3, tone: "red", priority: "High", title: "Deferred Tax Computation — IT Block Rate vs Book WDV", sub: "Ind AS 12 · IT Act Block Method · Sec 115BAA",
      body: "Largest DT source for manufacturers. Obtain Form 3CD depreciation schedule; recompute IT depreciation (opening block + additions − disposals × rate); reconcile closing tax WDV; per block (Book WDV − Tax WDV) = temporary difference (+DTL / −DTA); verify Sec 115BAA 25.168% applied consistently; check losses c/f that could offset DTL; on disposals DTL reverses." },
    { n: 4, tone: "amber", priority: "Medium", title: "CWIP Ageing — Stale Projects & Schedule III Disclosure", sub: "Schedule III Amendment 2021 · Project Monitoring",
      body: "Obtain project-wise CWIP ledger; age <1y / 1–2y / 2–3y / >3y. Stale CWIP (>3y): status report, completion certificate, board resolution; assess write-off if abandoned. Compare to original estimates for overruns. Verify assets ready-for-use were transferred to PPE (else deferred depreciation). Verify Schedule III ageing disclosure format." },
    { n: 5, tone: "amber", priority: "Medium", title: "Componentisation — Major Inspections & Significant Parts", sub: "Ind AS 16 para 43–47 · Component Accounting",
      body: "Identify classes with materially different component lives (buildings: structure vs roof vs electrical; ships; aircraft). Verify management componentised and assigned separate rates. Major inspection costs: derecognise old component, capitalise new. Review residual values annually for assets with active secondary markets." },
    { n: 6, tone: "amber", priority: "Medium", title: "Impairment Testing — Recoverable Amount & CGU Determination", sub: "Ind AS 36 · VIU · CGU Boundaries",
      body: "List indicators (capacity <50%, segment losses, obsolescence, regulation). Review recoverable-amount calc; VIU sensitivity on growth/margin/WACC (1% WACC ≈ 10–15% VIU); FVLCD from comparable transactions; challenge over-broad CGUs that mask impairment; near-certain impairment for discontinued lines; apply reversal cap." },
    { n: 7, tone: "accent", priority: "Standard", title: "Title & Ownership Verification — Charge Creation, Pledges", sub: "SA 500 · Registration Documents · Security Interest",
      body: "Land/buildings: registered sale/title deeds, tax receipts in company name. Vehicles: RC books. Imported plant: Bill of Entry. Verify charges/mortgages on the ROC MCA portal + lender confirmation; consistency with borrowings disclosure; leasehold vs ROU (Ind AS 116); assets in promoter's name = related-party scrutiny." },
    { n: 8, tone: "green", priority: "Enhancement", title: "Data Analytics — Benford's Law & Lifecycle Pattern Analysis", sub: "CAATs · Benford Analysis · Depreciation Consistency",
      body: "Benford's Law on additions (first-digit distribution); duplicate detection (same desc+amount+date); zero-depreciation assets; negative net block (data error); unusual disposal gains; round-figure CWIP→PPE transfers; March addition spikes (window-dressing); year-on-year effective depreciation-rate consistency." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Right-of-Use Assets — Ind AS 116
// ════════════════════════════════════════════════════════════════════════════
const ROU: TemplateContent = {
  headChip: "🏢 ROU — Lease Asset",
  connected: {
    caption: "All accounts in the lease cycle · ROU asset · Accumulated depreciation · Lease liability · Finance cost",
    groups: [
      { label: "Right-of-Use Assets (Non-current Assets)", startAt: 0, tone: "ppe" },
      { label: "Accumulated Depreciation (Contra)", startAt: 3, tone: "purple" },
      { label: "Lease Liability", startAt: 4, tone: "red" },
      { label: "P&L Impact — Depreciation & Lease Interest", startAt: 6, tone: "amber" },
      { label: "Bank / Settlement", startAt: 8, tone: "green" },
    ],
    accts: [
      { icon: "🏢", name: "ROU Asset — Office / Premises Lease", type: "Asset", cls: "B/S — Non-current Assets (ROU)" },
      { icon: "🏢", name: "ROU Asset — Equipment Lease", type: "Asset", cls: "B/S — Non-current Assets (ROU)" },
      { icon: "🏢", name: "ROU Asset — Vehicle Lease", type: "Asset", cls: "B/S — Non-current Assets (ROU)" },
      { icon: "📉", name: "Accumulated Depreciation — ROU Asset", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "💹", name: "Lease Liability — Current", type: "Liability", cls: "B/S — Current Liabilities" },
      { icon: "💹", name: "Lease Liability — Non-Current", type: "Liability", cls: "B/S — Non-current Liabilities" },
      { icon: "📊", name: "Depreciation on ROU Asset A/c", type: "Expense", cls: "P&L — Depreciation & Amortisation" },
      { icon: "📊", name: "Finance Cost — Lease Interest A/c", type: "Expense", cls: "P&L — Finance Costs" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 116 — Leases (Lessee Accounting)",
    body: "A lessee recognises a Right-of-Use (ROU) asset and a Lease Liability for almost all leases. Lease liability = present value of lease payments discounted at the rate implicit in the lease, or the incremental borrowing rate. ROU asset = lease liability + initial direct costs + prepaid lease payments − incentives. ROU depreciated over the shorter of lease term and useful life; liability unwound at EIR. Short-term (≤12m) and low-value leases are exempt.",
    chips: ["Ind AS 116", "EIR", "Lease Term", "Short-term Exemption"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Initial Recognition", icon: "🏗", entries: [
      { ref: "Entry 1", title: "Recognise ROU Asset & Lease Liability", tone: "ppe", lines: [["Right-of-Use Asset A/c", "Dr"], ["Lease Liability A/c", "Cr"]],
        note: "At commencement: lease liability = PV of fixed + in-substance fixed payments at the discount rate. ROU = liability + initial direct costs + prepaid − incentives received." },
      { ref: "Entry 2", title: "Initial Direct Costs Capitalised", tone: "amber", lines: [["Right-of-Use Asset A/c", "Dr"], ["Bank / Payable A/c", "Cr"]],
        note: "Incremental costs to obtain the lease (legal, broker, stamp duty) are added to the ROU asset, not expensed." },
    ] },
    { key: "subsequent", label: "Subsequent Measurement", icon: "📉", entries: [
      { ref: "Entry 3", title: "Depreciation on ROU Asset", tone: "ppe", lines: [["Depreciation Expense A/c (P&L)", "Dr"], ["Accumulated Depreciation — ROU A/c", "Cr"]],
        note: "Straight-line over the shorter of lease term and useful life (over useful life only if ownership transfers / purchase option reasonably certain)." },
      { ref: "Entry 4", title: "Interest on Lease Liability (EIR)", tone: "amber", lines: [["Finance Cost A/c (P&L)", "Dr"], ["Lease Liability A/c", "Cr"]],
        note: "Unwinding of discount on the lease liability at the incremental borrowing rate — front-loaded over the lease term." },
      { ref: "Entry 5", title: "Lease Rental Payment", tone: "ppe", lines: [["Lease Liability A/c", "Dr"], ["Bank A/c", "Cr"]],
        note: "Each payment splits between interest (above) and principal reduction of the liability." },
    ] },
    { key: "remeasure", label: "Remeasurement", icon: "🔁", entries: [
      { ref: "Entry 6", title: "Reassessment / Modification", tone: "purple", lines: [["Right-of-Use Asset A/c", "Dr"], ["Lease Liability A/c", "Cr"]],
        note: "On change in lease term, index/rate-based payments or purchase-option assessment: remeasure liability at a revised rate and adjust the ROU asset (P&L if ROU already nil)." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence — Valid Lease Contracts", desc: "Each ROU asset is supported by an executed, current lease agreement", chips: [{ text: "Lease Register", tone: "ppe" }, { text: "SA 500", tone: "std" }],
      note: "Agree each ROU asset and liability to a signed lease contract; verify lease commencement date, term, payment schedule and renewal/termination options. Confirm the asset is in use at the stated location." },
    { badge: "C", tone: "green", name: "Completeness — All Leases Captured", desc: "No leases (incl. embedded) omitted; exemptions correctly applied", chips: [{ text: "Embedded Leases", tone: "amber" }, { text: "Rent Expense Scan", tone: "ppe" }],
      note: "Scan rent / hire / lease expense ledgers for arrangements not capitalised; assess service contracts for embedded leases (identified asset + control). Verify short-term (≤12m) and low-value exemptions are genuinely eligible." },
    { badge: "V", tone: "amber", name: "Valuation — Discount Rate & Lease Term", desc: "Liability uses an appropriate rate; term reflects enforceable period + reasonably-certain options", chips: [{ text: "IBR", tone: "amber" }, { text: "Ind AS 116 para 18", tone: "ppe" }],
      note: "Challenge the incremental borrowing rate (tenor, security, entity credit). Re-perform PV of payments. Assess lease-term judgement — inclusion of renewal/termination options must reflect economic incentive, not just contractual minimum." },
    { badge: "P", tone: "purple", name: "Classification — Lease vs Service", desc: "Lease vs service components separated; finance vs operating (lessor) where relevant", chips: [{ text: "Component Split", tone: "std" }],
      note: "Separate lease and non-lease (service/maintenance) components unless the practical expedient is elected. For sub-leases, classify by reference to the head-lease ROU asset." },
    { badge: "D", tone: "accent", name: "Presentation & Disclosure", desc: "ROU & liability split current/non-current; maturity analysis disclosed", chips: [{ text: "Maturity Analysis", tone: "blue" }, { text: "Ind AS 116 para 51–60", tone: "ppe" }],
      note: "Disclose ROU by class, additions, depreciation, interest expense, total cash outflow, short-term & low-value amounts, and an undiscounted maturity analysis of lease liabilities. Split liability current vs non-current." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Discount Rate Appropriateness (IBR)", sub: "Ind AS 116 · Incremental Borrowing Rate",
      body: "Obtain management's IBR derivation. Verify it reflects a rate for a similar-tenor, similarly-secured borrowing for the entity. Benchmark to actual borrowing rates / G-sec + spread. Sensitivity: a 1% rate change materially shifts liability and front-loaded interest." },
    { n: 2, tone: "amber", priority: "Medium", title: "Lease Term & Renewal-Option Judgement", sub: "Ind AS 116 para 18–21",
      body: "Review enforceable period and renewal/termination options. Assess whether the entity is reasonably certain to exercise (leasehold improvements, relocation cost, business need). Inconsistent term assumptions across similar leases are a flag." },
    { n: 3, tone: "amber", priority: "Medium", title: "Completeness Sweep for Unrecorded Leases", sub: "Embedded Leases · Rent Expense",
      body: "Scan P&L for rent/hire/usage charges still expensed; obtain the contract register; test service agreements (power, warehousing, IT) for embedded leases. Confirm exemption thresholds are met for anything left off-balance-sheet." },
    { n: 4, tone: "accent", priority: "Standard", title: "Disclosure — Maturity Analysis & Exemptions", sub: "Ind AS 116 para 51–60",
      body: "Verify the undiscounted maturity analysis, ROU movement table by class, and short-term/low-value expense amounts tie to the lease register and the liability roll-forward." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Intangible Assets — Ind AS 38
// ════════════════════════════════════════════════════════════════════════════
const INTANGIBLES: TemplateContent = {
  headChip: "📄 Intangibles — Non-current Asset",
  connected: {
    caption: "All accounts in the intangibles cycle · Gross block · Amortisation · Impairment · R&D",
    groups: [
      { label: "Intangible Gross Block (Non-current Assets)", startAt: 0, tone: "ppe" },
      { label: "Intangibles under Development", startAt: 4, tone: "amber" },
      { label: "Accumulated Amortisation & Impairment (Contra)", startAt: 5, tone: "purple" },
      { label: "P&L Impact — Amortisation, Impairment, R&D", startAt: 8, tone: "red" },
      { label: "Bank / Settlement", startAt: 11, tone: "green" },
    ],
    accts: [
      { icon: "📄", name: "Goodwill", type: "Asset", cls: "B/S — Non-current Assets (Intangibles)" },
      { icon: "📄", name: "Software", type: "Asset", cls: "B/S — Non-current Assets (Intangibles)" },
      { icon: "📄", name: "Trademarks & Patents", type: "Asset", cls: "B/S — Non-current Assets (Intangibles)" },
      { icon: "📄", name: "Customer Relationships / Licences", type: "Asset", cls: "B/S — Non-current Assets (Intangibles)" },
      { icon: "🏗", name: "Intangibles under Development", type: "Asset", cls: "B/S — Non-current Assets (CWIP)" },
      { icon: "📉", name: "Accumulated Amortisation — Software", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "📉", name: "Accumulated Amortisation — Trademarks", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "⚠", name: "Accumulated Impairment — Goodwill / Intangibles", type: "Contra", cls: "B/S — Non-current Assets (Contra)" },
      { icon: "📊", name: "Amortisation Expense A/c", type: "Expense", cls: "P&L — Depreciation & Amortisation" },
      { icon: "⚠", name: "Impairment Loss A/c", type: "Expense", cls: "P&L — Exceptional / Other Expenses" },
      { icon: "🔬", name: "R&D Expense A/c (Research phase)", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "🏦", name: "Bank / Vendor A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 38 — Intangible Assets",
    body: "An intangible is recognised when it is identifiable, controlled, and future economic benefits are probable with cost measured reliably. Research is expensed; development is capitalised only when the six para-57 criteria are met. Finite-life intangibles are amortised over useful life; indefinite-life intangibles & goodwill are not amortised but tested for impairment annually (Ind AS 36). Internally generated brands, mastheads and goodwill cannot be capitalised.",
    chips: ["Ind AS 38", "Ind AS 36", "Research vs Development", "Goodwill"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Recognition", icon: "💡", entries: [
      { ref: "Entry 1", title: "Acquisition of Trademark / Patent", tone: "ppe", lines: [["Trademarks & Patents A/c", "Dr"], ["Bank / Vendor A/c", "Cr"]],
        note: "Separately acquired intangibles: capitalise purchase price + directly attributable costs to prepare for use." },
      { ref: "Entry 2", title: "Internally-Developed Software Capitalised", tone: "green", lines: [["Software A/c", "Dr"], ["Intangibles under Development A/c", "Cr"]],
        note: "Development-phase costs capitalised only once all Ind AS 38 para 57 criteria are met (technical feasibility, intention & ability to complete, probable benefits, reliable cost measurement)." },
      { ref: "Entry 3", title: "Research-Phase Costs Expensed", tone: "red", lines: [["R&D Expense A/c (P&L)", "Dr"], ["Bank / Payable A/c", "Cr"]],
        note: "Research (and any development not meeting the criteria) is expensed as incurred — cannot be capitalised or reinstated later." },
    ] },
    { key: "amortisation", label: "Amortisation", icon: "📉", entries: [
      { ref: "Entry 4", title: "Amortisation for the Year", tone: "ppe", lines: [["Amortisation Expense A/c (P&L)", "Dr"], ["Accumulated Amortisation A/c", "Cr"]],
        note: "Finite-life intangibles amortised over useful life (usually straight-line). Indefinite-life intangibles are NOT amortised — only impairment-tested." },
    ] },
    { key: "impairment", label: "Impairment", icon: "⚠", entries: [
      { ref: "Entry 5", title: "Goodwill / Indefinite-Life Impairment", tone: "red", lines: [["Impairment Loss A/c (P&L)", "Dr"], ["Goodwill / Intangible A/c", "Cr"]],
        note: "Goodwill and indefinite-life intangibles are tested for impairment annually (and on indicators), at CGU level. Goodwill impairment is never reversed." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence & Rights", desc: "Intangibles exist and the entity controls the future benefits (legal title / registration)", chips: [{ text: "Registrations", tone: "ppe" }, { text: "Agreements", tone: "std" }],
      note: "Verify legal title / registration certificates (patents, trademarks, licences), purchase agreements and renewal status. For software, confirm deployment and ownership (not a SaaS service right)." },
    { badge: "C", tone: "green", name: "Completeness & Recognition Criteria", desc: "All qualifying intangibles recorded; non-qualifying costs not capitalised", chips: [{ text: "Para 57 Criteria", tone: "amber" }, { text: "R&D Split", tone: "ppe" }],
      note: "Confirm capitalised development meets all six para-57 criteria; ensure internally-generated brands/goodwill are NOT on the books; check that acquired-in-business-combination intangibles were separately recognised." },
    { badge: "V", tone: "amber", name: "Valuation — Amortisation & Impairment", desc: "Amortisation method & useful life appropriate; goodwill/indefinite impairment tested", chips: [{ text: "Ind AS 36", tone: "red" }, { text: "Useful Life", tone: "amber" }],
      note: "Recompute amortisation; review useful-life and method (reflect consumption pattern); ensure indefinite-life classification is justified and reassessed; obtain and challenge the annual goodwill impairment test (CGU, cash-flow assumptions, discount rate)." },
    { badge: "P", tone: "purple", name: "Classification — Research vs Development & Capex", desc: "Research expensed; only qualifying development capitalised; right period", chips: [{ text: "Ind AS 38 para 54–62", tone: "ppe" }],
      note: "Scan R&D expense and additions; challenge premature capitalisation (development started before feasibility) and revenue costs (training, marketing) wrongly capitalised." },
    { badge: "D", tone: "accent", name: "Disclosure", desc: "Movement, useful lives/rates, indefinite-life basis, impairment, commitments", chips: [{ text: "Ind AS 38 para 118", tone: "ppe" }],
      note: "Disclose gross/accumulated amortisation movement by class, useful lives or rates, the line where amortisation sits, indefinite-life carrying amounts with the supporting basis, R&D expensed in the period, and contractual commitments." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Development-Cost Capitalisation Criteria", sub: "Ind AS 38 para 57 · Management Judgement",
      body: "For each capitalised project, obtain evidence for all six criteria — technical feasibility, intention & ability to complete and use/sell, how it generates probable future benefits, adequate resources, and reliable measurement of development cost. Challenge capitalisation that began before feasibility was demonstrated." },
    { n: 2, tone: "red", priority: "High", title: "Goodwill Annual Impairment Test (CGU)", sub: "Ind AS 36 · VIU / FVLCD",
      body: "Obtain the CGU allocation of goodwill and the recoverable-amount model. Challenge cash-flow projections, terminal growth and discount rate; perform sensitivity. Verify the test is performed at least annually and on indicators; confirm goodwill impairment is not reversed." },
    { n: 3, tone: "amber", priority: "Medium", title: "Useful Life & Amortisation Method Review", sub: "Ind AS 38 para 97–106",
      body: "Recompute amortisation; assess whether useful lives remain appropriate (technology obsolescence shortens lives); confirm indefinite-life assets are reassessed each period for continued indefinite classification." },
    { n: 4, tone: "amber", priority: "Medium", title: "Internally-Generated Brands & Goodwill Excluded", sub: "Ind AS 38 para 63–64",
      body: "Verify no internally-generated brands, customer lists, mastheads, publishing titles or goodwill have been capitalised. Scan marketing/branding spend for inappropriate capitalisation." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Investments — Ind AS 109
// ════════════════════════════════════════════════════════════════════════════
const INVESTMENTS: TemplateContent = {
  headChip: "💸 Investments — Financial Asset",
  connected: {
    caption: "All accounts in the investments cycle · AC / FVOCI / FVTPL · EIR · ECL · OCI",
    groups: [
      { label: "Investments by Measurement Category (Financial Assets)", startAt: 0, tone: "ppe" },
      { label: "Accrued Interest & ECL Allowance", startAt: 4, tone: "purple" },
      { label: "OCI — Fair Value Reserve", startAt: 6, tone: "green" },
      { label: "P&L Impact — Interest, ECL, Gain/Loss", startAt: 7, tone: "amber" },
      { label: "Bank / Settlement", startAt: 10, tone: "green" },
    ],
    accts: [
      { icon: "💸", name: "Investments — Amortised Cost (Bonds)", type: "Asset", cls: "B/S — Non-current / Current Investments" },
      { icon: "💸", name: "Investments — FVOCI (Debt)", type: "Asset", cls: "B/S — Non-current / Current Investments" },
      { icon: "💸", name: "Investments — FVTPL (Trading)", type: "Asset", cls: "B/S — Current Investments" },
      { icon: "🏦", name: "Fixed Deposits with Banks (>12m)", type: "Asset", cls: "B/S — Other Financial Assets" },
      { icon: "📈", name: "Interest Accrued on Investments", type: "Asset", cls: "B/S — Other Financial Assets" },
      { icon: "⚠", name: "ECL Allowance on Debt Investments", type: "Contra", cls: "B/S — Other Financial Assets (Contra)" },
      { icon: "📊", name: "Fair Value Reserve — OCI (FVOCI)", type: "Equity", cls: "Equity — Other Comprehensive Income" },
      { icon: "📈", name: "Interest Income A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "⚠", name: "ECL Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "💰", name: "Gain / Loss on Investments A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 109 — Classification & Measurement of Financial Assets",
    body: "Debt instruments are classified by the entity's business model and the SPPI test: Amortised Cost (hold-to-collect + SPPI), FVOCI (hold-to-collect-and-sell + SPPI), or FVTPL (residual). Interest income uses the effective interest rate (EIR). Expected Credit Loss (ECL) applies to AC and FVOCI debt instruments (12-month vs lifetime by stage). Equity instruments are FVTPL unless an irrevocable FVOCI election is made.",
    chips: ["Ind AS 109", "AC / FVOCI / FVTPL", "EIR", "ECL", "SPPI"],
  },
  lifecycle: () => build([
    { key: "acquisition", label: "Acquisition & Classification", icon: "💰", entries: [
      { ref: "Entry 1", title: "Purchase of Bond (at Premium / Discount)", tone: "ppe", lines: [["Investments — Amortised Cost A/c", "Dr"], ["Bank A/c", "Cr"]],
        note: "Recognise at fair value plus transaction costs (for AC/FVOCI). Classify per business model + SPPI test before measurement." },
      { ref: "Entry 2", title: "Classification Assessment", tone: "amber", lines: [["(Memo) Business model + SPPI test", "Dr"], ["(Memo) AC / FVOCI / FVTPL", "Cr"]],
        note: "Document the business-model (hold-to-collect / and-sell / other) and the SPPI test (cash flows = solely principal + interest). Drives the measurement category." },
    ] },
    { key: "income", label: "Income & Measurement", icon: "📈", entries: [
      { ref: "Entry 3", title: "EIR Interest Accrual", tone: "ppe", lines: [["Interest Accrued A/c", "Dr"], ["Interest Income A/c (P&L)", "Cr"]],
        note: "Interest recognised on the effective interest rate, amortising premium/discount over the instrument's life — not the coupon rate." },
      { ref: "Entry 4", title: "Coupon Receipt", tone: "ppe", lines: [["Bank A/c", "Dr"], ["Interest Accrued A/c", "Cr"]],
        note: "Cash coupon received settles the accrued interest receivable." },
      { ref: "Entry 5", title: "FVOCI Fair-Value Change", tone: "purple", lines: [["Investments — FVOCI A/c", "Dr"], ["Fair Value Reserve — OCI", "Cr"]],
        note: "FVOCI debt: fair-value movements to OCI (recycled to P&L on disposal); interest & ECL still in P&L." },
    ] },
    { key: "ecl", label: "ECL & Disposal", icon: "🔚", entries: [
      { ref: "Entry 6", title: "ECL Provision Movement", tone: "red", lines: [["ECL Expense A/c (P&L)", "Dr"], ["ECL Allowance A/c", "Cr"]],
        note: "12-month ECL at initial recognition (Stage 1); lifetime ECL on significant increase in credit risk (Stage 2) or credit-impaired (Stage 3)." },
      { ref: "Entry 7", title: "Disposal / Maturity", tone: "green", lines: [["Bank A/c", "Dr"], ["Investments A/c", "Cr"], ["Gain on Investment (P&L)", "Cr"]],
        note: "On disposal/maturity, derecognise carrying amount; for FVOCI debt, recycle the cumulative OCI reserve to P&L." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence — Custodian / DEMAT Confirmation", desc: "Holdings exist and are held in the entity's name", chips: [{ text: "SA 505 Confirmation", tone: "ppe" }, { text: "DEMAT Statement", tone: "std" }],
      note: "Obtain direct confirmations / DEMAT & custodian statements; agree units and ISINs to the books at year-end; verify maturity and coupon terms to the instrument documents." },
    { badge: "R", tone: "green", name: "Rights & Obligations", desc: "Entity owns the investments; no lien, pledge or encumbrance unless disclosed", chips: [{ text: "Lien / Pledge", tone: "amber" }],
      note: "Confirm beneficial ownership; identify pledged/lien-marked securities (against borrowings) and verify disclosure; check for repo/securities-lending arrangements affecting derecognition." },
    { badge: "V", tone: "amber", name: "Valuation — Fair Value, EIR & ECL", desc: "Fair value hierarchy supported; EIR & ECL correctly computed", chips: [{ text: "Fair Value Levels", tone: "red" }, { text: "EIR", tone: "ppe" }],
      note: "For Level 1, agree to quoted prices; for Level 2/3, challenge inputs and models. Re-perform EIR amortisation of premium/discount. Test ECL staging and PD/LGD assumptions for debt instruments." },
    { badge: "P", tone: "purple", name: "Classification — Business Model & SPPI", desc: "AC / FVOCI / FVTPL classification supported; equity FVOCI election documented", chips: [{ text: "SPPI Test", tone: "std" }, { text: "Ind AS 109", tone: "ppe" }],
      note: "Obtain the business-model documentation and SPPI assessment; verify reclassifications (rare) are supported by an actual change in business model; confirm any irrevocable FVOCI equity election." },
    { badge: "D", tone: "accent", name: "Disclosure — Ind AS 107", desc: "Fair-value levels, credit-risk & ECL, maturity and sensitivity disclosures", chips: [{ text: "Ind AS 107", tone: "blue" }],
      note: "Verify fair-value hierarchy levels & transfers, ECL/credit-risk disclosures, and market-risk sensitivity tie to the holdings register." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "External Confirmations (SA 505)", sub: "Custodian / Registrar Confirmation",
      body: "Send confirmations directly to custodians/registrars; control the process; perform alternative procedures (post-year-end statements, coupon receipts) for non-replies. Reconcile confirmed holdings to the books and investigate differences." },
    { n: 2, tone: "red", priority: "High", title: "Fair Value Level 2/3 Input Challenge", sub: "Ind AS 113 · Valuation Models",
      body: "For unquoted/illiquid instruments, obtain the valuation model and inputs (yield curves, credit spreads, comparable transactions). Challenge significant unobservable inputs; consider an auditor's expert; assess Level-3 sensitivity disclosure." },
    { n: 3, tone: "amber", priority: "Medium", title: "ECL Staging & Measurement", sub: "Ind AS 109 · 12-month vs Lifetime",
      body: "Test the staging logic (significant increase in credit risk triggers), PD/LGD sources, and forward-looking macro overlays. Re-perform ECL for a sample; verify Stage 3 (credit-impaired) instruments use lifetime ECL on net carrying amount." },
    { n: 4, tone: "amber", priority: "Medium", title: "SPPI & Business-Model Assessment", sub: "Ind AS 109 Classification",
      body: "Review the SPPI test for debt instruments (leverage, non-recourse, contingent features fail SPPI → FVTPL). Corroborate the stated business model with actual sales frequency/volume history." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Trade Receivables — Ind AS 109 ECL
// ════════════════════════════════════════════════════════════════════════════
const AR: TemplateContent = {
  headChip: "💳 Trade Receivables — Current Asset",
  connected: {
    caption: "All accounts in the receivables cycle · Ageing buckets · ECL allowance · Bad debts · Output GST",
    groups: [
      { label: "Trade Receivables (Current Assets)", startAt: 0, tone: "ppe" },
      { label: "ECL Allowance (Contra)", startAt: 5, tone: "purple" },
      { label: "P&L Impact — Bad Debts, ECL, Recovery", startAt: 6, tone: "red" },
      { label: "Statutory — Output GST", startAt: 9, tone: "amber" },
      { label: "Bank / Settlement", startAt: 10, tone: "green" },
    ],
    accts: [
      { icon: "💳", name: "Trade Receivables — Current (<6m)", type: "Asset", cls: "B/S — Current Assets (Trade Receivables)" },
      { icon: "💳", name: "Trade Receivables — 6-12m", type: "Asset", cls: "B/S — Current Assets (Trade Receivables)" },
      { icon: "💳", name: "Trade Receivables — 12-24m", type: "Asset", cls: "B/S — Current Assets (Trade Receivables)" },
      { icon: "💳", name: "Trade Receivables — >24m (doubtful)", type: "Asset", cls: "B/S — Current Assets (Trade Receivables)" },
      { icon: "🧾", name: "Bills Receivable", type: "Asset", cls: "B/S — Current Assets (Trade Receivables)" },
      { icon: "⚠", name: "ECL Allowance — Trade Receivables", type: "Contra", cls: "B/S — Current Assets (Contra)" },
      { icon: "📉", name: "Bad Debt Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "⚠", name: "ECL Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "💰", name: "Bad Debt Recovery A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "🧾", name: "Output GST Payable A/c", type: "Liability", cls: "B/S — Current Liabilities (Statutory)" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 109 — Trade Receivables & Expected Credit Loss",
    body: "Trade receivables are measured at transaction price less a loss allowance. Ind AS 109 mandates the simplified approach: lifetime Expected Credit Loss recognised from initial recognition, usually via a provision matrix (ageing band × historical loss rate, adjusted for forward-looking information). Existence is corroborated by external confirmations (SA 505); cut-off and occurrence link to the revenue presumed-fraud risk (SA 240).",
    chips: ["Ind AS 109 ECL", "SA 505", "Provision Matrix", "SA 240 Cut-off"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Recognition", icon: "💳", entries: [
      { ref: "Entry 1", title: "Credit Sale Recognised", tone: "ppe", lines: [["Trade Receivables A/c", "Dr"], ["Revenue from Operations A/c", "Cr"]],
        note: "Recognise the receivable when control transfers (Ind AS 115). Net of trade discounts and expected returns." },
      { ref: "Entry 2", title: "Sale with Output GST", tone: "ppe", lines: [["Trade Receivables A/c", "Dr"], ["Revenue A/c", "Cr"], ["Output GST Payable A/c", "Cr"]],
        note: "Gross receivable includes output GST, which is a statutory liability — not revenue." },
    ] },
    { key: "collection", label: "Collection & Returns", icon: "💵", entries: [
      { ref: "Entry 3", title: "Cash Receipt from Customer", tone: "ppe", lines: [["Bank A/c", "Dr"], ["Trade Receivables A/c", "Cr"]],
        note: "Apply receipts to invoices; investigate unapplied cash and long-outstanding credits." },
      { ref: "Entry 4", title: "Sales Return / Credit Note", tone: "amber", lines: [["Sales Returns A/c", "Dr"], ["Trade Receivables A/c", "Cr"]],
        note: "Returns and credit notes near year-end are a cut-off and revenue-reversal risk (SA 240)." },
    ] },
    { key: "ecl", label: "ECL & Write-off", icon: "⚠", entries: [
      { ref: "Entry 5", title: "ECL Provisioning (Simplified Approach)", tone: "red", lines: [["ECL Expense A/c (P&L)", "Dr"], ["ECL Allowance A/c", "Cr"]],
        note: "Lifetime ECL via provision matrix: ageing band × loss rate, adjusted for forward-looking macro factors." },
      { ref: "Entry 6", title: "Bad Debt Write-off", tone: "red", lines: [["ECL Allowance / Bad Debt Expense A/c", "Dr"], ["Trade Receivables A/c", "Cr"]],
        note: "Write off when recovery is no longer reasonably expected; verify approval and that legal recovery options were exhausted." },
      { ref: "Entry 7", title: "Recovery of Written-off Debt", tone: "green", lines: [["Bank A/c", "Dr"], ["Bad Debt Recovery A/c (P&L)", "Cr"]],
        note: "Subsequent recovery of a previously written-off debt is recognised as income." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence — Confirmations", desc: "Receivables represent genuine amounts owed at year-end", chips: [{ text: "SA 505 Confirmation", tone: "ppe" }, { text: "Subsequent Receipts", tone: "std" }],
      note: "Send positive confirmations on a sample (large/old/related-party balances). For non-replies, perform alternative procedures: agree to subsequent receipts, GRN/POD and invoices. Investigate confirmation differences." },
    { badge: "V", tone: "amber", name: "Valuation — ECL Allowance", desc: "Provision matrix and ageing produce an adequate loss allowance", chips: [{ text: "Provision Matrix", tone: "amber" }, { text: "Ageing", tone: "ppe" }],
      note: "Re-perform the ECL matrix (ageing × loss rate); test historical loss-rate derivation and forward-looking adjustments; specifically assess disputed, related-party and >180-day balances; corroborate with subsequent collections." },
    { badge: "O", tone: "red", name: "Cut-off & Occurrence (SA 240)", desc: "Sales recorded in the correct period; no fictitious receivables", chips: [{ text: "SA 240 Risk", tone: "red" }, { text: "Cut-off", tone: "amber" }],
      note: "Revenue is a presumed fraud risk. Test cut-off around year-end (last GRNs/dispatches, post-year-end credit notes); investigate journals creating receivables without dispatch; review channel-stuffing indicators." },
    { badge: "R", tone: "purple", name: "Rights — No Factoring / Assignment", desc: "Receivables are owned and not pledged/factored without disclosure", chips: [{ text: "Factoring", tone: "std" }],
      note: "Identify bill-discounting, factoring or assignment arrangements; assess derecognition (risks & rewards / control) and disclosure of pledged receivables." },
    { badge: "D", tone: "accent", name: "Presentation & Disclosure", desc: "Gross vs allowance, ageing schedule, related-party and disputed dues disclosed", chips: [{ text: "Schedule III Ageing", tone: "blue" }],
      note: "Verify the Schedule III receivables ageing schedule (incl. disputed/undisputed), related-party balances, and current vs non-current split tie to the ledger." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "External Confirmations & Alternatives (SA 505)", sub: "SA 505 · Subsequent Receipts",
      body: "Control the confirmation process end-to-end. Stratify the sample (value, age, related party, disputed). For non-responses, vouch to subsequent bank receipts, signed PODs and invoices. Summarise differences and their resolution." },
    { n: 2, tone: "red", priority: "High", title: "ECL Provision Matrix Reasonableness", sub: "Ind AS 109 · Forward-looking",
      body: "Recompute the matrix; test the historical loss-rate base period; evaluate forward-looking overlays (sector stress, customer concentration); separately assess significant disputed/related-party exposures for specific provisions." },
    { n: 3, tone: "amber", priority: "Medium", title: "Cut-off & Credit-Note Review", sub: "SA 240 · Revenue Cut-off",
      body: "Test sales either side of year-end against dispatch evidence; review post-year-end credit notes/returns for amounts that should reverse current-year revenue; investigate unusual late-March sales spikes." },
    { n: 4, tone: "amber", priority: "Medium", title: "Subsequent Collections Review", sub: "Recoverability Corroboration",
      body: "Review collections after the year-end against the closing ledger; balances collected post-year-end corroborate existence and valuation; persistent non-collection supports higher ECL or write-off." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Inventory — Ind AS 2
// ════════════════════════════════════════════════════════════════════════════
const INVENTORY: TemplateContent = {
  headChip: "📦 Inventory — Current Asset",
  connected: {
    caption: "All accounts in the inventory cycle · RM / WIP / FG · NRV & obsolescence provisions · COGS",
    groups: [
      { label: "Inventory Classes (Current Assets)", startAt: 0, tone: "ppe" },
      { label: "Provisions (Contra)", startAt: 5, tone: "purple" },
      { label: "P&L Impact — COGS, Write-down, Shortage", startAt: 7, tone: "red" },
      { label: "Bank / Settlement", startAt: 10, tone: "green" },
    ],
    accts: [
      { icon: "📦", name: "Raw Materials", type: "Asset", cls: "B/S — Current Assets (Inventory)" },
      { icon: "📦", name: "Work-in-Progress", type: "Asset", cls: "B/S — Current Assets (Inventory)" },
      { icon: "📦", name: "Finished Goods", type: "Asset", cls: "B/S — Current Assets (Inventory)" },
      { icon: "🔧", name: "Stores & Spares", type: "Asset", cls: "B/S — Current Assets (Inventory)" },
      { icon: "🚚", name: "Goods-in-Transit", type: "Asset", cls: "B/S — Current Assets (Inventory)" },
      { icon: "⚠", name: "Inventory NRV Write-down Allowance", type: "Contra", cls: "B/S — Current Assets (Contra)" },
      { icon: "⚠", name: "Obsolescence Provision", type: "Contra", cls: "B/S — Current Assets (Contra)" },
      { icon: "📊", name: "Cost of Goods Sold A/c", type: "Expense", cls: "P&L — Cost of Materials / COGS" },
      { icon: "📉", name: "Inventory Write-down Expense A/c", type: "Expense", cls: "P&L — Changes in Inventory / Other" },
      { icon: "⚠", name: "Inventory Shortage A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "🛒", name: "Trade Payables A/c", type: "Liability", cls: "B/S — Current Liabilities" },
    ],
  },
  framework: {
    title: "Ind AS 2 — Inventories",
    body: "Inventories are measured at the lower of cost and net realisable value (NRV). Cost includes purchase, conversion (direct + systematic production overheads at normal capacity) and costs to bring to present location/condition. Permitted cost formulas: specific identification, FIFO, or weighted average — LIFO is prohibited. NRV = estimated selling price less costs to complete and sell. Physical existence is corroborated by count attendance (SA 501).",
    chips: ["Ind AS 2", "Lower of Cost & NRV", "FIFO / Wtd Avg", "SA 501 Count"],
  },
  lifecycle: () => build([
    { key: "purchase", label: "Purchase & Production", icon: "📦", entries: [
      { ref: "Entry 1", title: "Purchase of Raw Materials", tone: "ppe", lines: [["Raw Materials A/c", "Dr"], ["Trade Payables A/c", "Cr"]],
        note: "Cost = purchase price + freight inward + non-refundable duties − trade discounts. GST input credit is not part of cost if recoverable." },
      { ref: "Entry 2", title: "Raw Material Consumed", tone: "ppe", lines: [["Work-in-Progress A/c", "Dr"], ["Raw Materials A/c", "Cr"]],
        note: "Issue to production at the chosen cost formula (FIFO / weighted average)." },
      { ref: "Entry 3", title: "Overhead Absorption", tone: "amber", lines: [["Work-in-Progress A/c", "Dr"], ["Factory Overheads A/c", "Cr"]],
        note: "Absorb production overheads at normal capacity. Abnormal idle-capacity and waste costs are expensed, not inventoried." },
      { ref: "Entry 4", title: "Completion of Production", tone: "green", lines: [["Finished Goods A/c", "Dr"], ["Work-in-Progress A/c", "Cr"]],
        note: "Transfer completed units from WIP to finished goods at full conversion cost." },
    ] },
    { key: "sale", label: "Sale & Valuation", icon: "💵", entries: [
      { ref: "Entry 5", title: "Cost of Goods Sold", tone: "ppe", lines: [["Cost of Goods Sold A/c (P&L)", "Dr"], ["Finished Goods A/c", "Cr"]],
        note: "Recognise COGS as inventory is sold, matching the revenue." },
      { ref: "Entry 6", title: "NRV Write-down", tone: "red", lines: [["Inventory Write-down Expense A/c", "Dr"], ["Inventory / Allowance A/c", "Cr"]],
        note: "Write down to NRV when selling price less completion & selling costs is below cost. Assessed item-by-item or by group, not across the whole." },
      { ref: "Entry 7", title: "Obsolescence Provision", tone: "amber", lines: [["Obsolescence Expense A/c", "Dr"], ["Obsolescence Provision A/c", "Cr"]],
        note: "Provide for slow-moving / non-moving / expired stock based on ageing and demand." },
    ] },
    { key: "count", label: "Count & Adjustment", icon: "⚠", entries: [
      { ref: "Entry 8", title: "Physical Count Adjustment (Shortage)", tone: "red", lines: [["Inventory Shortage A/c (P&L)", "Dr"], ["Inventory A/c", "Cr"]],
        note: "Adjust book to physical for count differences; investigate significant shrinkage for theft / process / recording weakness." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence — Physical Count (SA 501)", desc: "Recorded inventory physically exists at the count date", chips: [{ text: "SA 501", tone: "ppe" }, { text: "Test Counts", tone: "std" }],
      note: "Attend the physical count; perform two-way test counts (floor→sheet and sheet→floor); observe count controls and slow-moving identification; for inventory at third parties obtain confirmation; roll-forward/back if the count is not at year-end." },
    { badge: "C", tone: "green", name: "Completeness & Cut-off", desc: "All owned inventory recorded; purchase/sale cut-off correct; goods-in-transit", chips: [{ text: "GRN / Dispatch Cut-off", tone: "amber" }, { text: "Goods-in-Transit", tone: "ppe" }],
      note: "Test last GRNs and dispatch notes around year-end; reconcile goods-in-transit to terms (FOB/CIF); ensure goods received not invoiced and goods invoiced not dispatched are correctly handled." },
    { badge: "V", tone: "amber", name: "Valuation — Cost & NRV", desc: "Cost correctly built up; NRV write-downs adequate; overhead absorption proper", chips: [{ text: "Lower of Cost & NRV", tone: "amber" }, { text: "Normal Capacity", tone: "std" }],
      note: "Re-perform cost build-up (FIFO/wtd avg); verify overheads absorbed at normal capacity with abnormal costs expensed; test NRV using post-year-end selling prices; assess slow-moving/obsolescence provisioning by ageing." },
    { badge: "R", tone: "purple", name: "Rights — Consignment & Bill-and-Hold", desc: "Only owned inventory recorded; consignment/third-party stock excluded", chips: [{ text: "Consignment", tone: "std" }],
      note: "Identify consignment stock (in/out), bill-and-hold and goods held for third parties; ensure ownership (risks & rewards) drives recognition, not physical location." },
    { badge: "D", tone: "accent", name: "Presentation & Disclosure", desc: "Classification RM/WIP/FG; write-downs, cost formula and pledges disclosed", chips: [{ text: "Ind AS 2 para 36", tone: "blue" }],
      note: "Verify classification (raw material / WIP / finished goods / stores & spares), the accounting policy & cost formula, write-down amounts, and inventory pledged as security are disclosed." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Count Attendance & Test Counts (SA 501)", sub: "SA 501 · Physical Verification",
      body: "Plan attendance at material locations; evaluate count instructions and cut-off controls; perform two-way test counts; document tag controls and slow-moving observation. For year-end gaps, perform roll-forward procedures with movement reconciliation." },
    { n: 2, tone: "red", priority: "High", title: "NRV Testing", sub: "Ind AS 2 · Net Realisable Value",
      body: "Select finished goods/material lines and compare cost to post-year-end selling prices less completion & selling costs. For raw materials, consider whether finished goods will sell at/above cost. Verify write-downs are item/group level, not netted against gains." },
    { n: 3, tone: "amber", priority: "Medium", title: "Overhead Absorption & Normal Capacity", sub: "Ind AS 2 para 12–13",
      body: "Test the overhead absorption rate and the normal-capacity basis; confirm abnormal idle capacity, abnormal waste and storage (unless necessary) and admin overheads are expensed, not inventoried." },
    { n: 4, tone: "amber", priority: "Medium", title: "Slow-moving & Obsolescence Ageing", sub: "Provisioning Adequacy",
      body: "Obtain inventory ageing and movement; assess provisioning policy against actual demand/expiry; corroborate with subsequent sales and scrap; challenge low provisions on long-held or expired stock." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Cash & Cash Equivalents — Ind AS 7
// ════════════════════════════════════════════════════════════════════════════
const CASH: TemplateContent = {
  headChip: "🏦 Cash & Bank — Current Asset",
  connected: {
    caption: "All accounts in the cash cycle · Cash & bank · Cash equivalents · FX · Restricted balances",
    groups: [
      { label: "Cash & Bank (Current Assets)", startAt: 0, tone: "ppe" },
      { label: "Cash Equivalents (≤3 months)", startAt: 3, tone: "green" },
      { label: "P&L Impact — Bank Charges & FX", startAt: 5, tone: "amber" },
      { label: "Other / Restricted Bank Balances", startAt: 7, tone: "purple" },
    ],
    accts: [
      { icon: "💵", name: "Cash on Hand", type: "Asset", cls: "B/S — Current Assets (Cash)" },
      { icon: "🏦", name: "Bank — Current Account", type: "Asset", cls: "B/S — Current Assets (Bank)" },
      { icon: "💹", name: "Bank — OD / Cash Credit Account", type: "Liability", cls: "B/S — Current Liabilities (Borrowings)" },
      { icon: "🏦", name: "Fixed Deposits (≤3 months)", type: "Asset", cls: "B/S — Cash & Cash Equivalents" },
      { icon: "🌐", name: "Foreign Currency Bank Account", type: "Asset", cls: "B/S — Current Assets (Bank)" },
      { icon: "📉", name: "Bank Charges A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "🌐", name: "Foreign Exchange Gain / (Loss) A/c", type: "Income", cls: "P&L — Other Income / Expense" },
      { icon: "🔒", name: "Margin Money / Restricted Balances", type: "Asset", cls: "B/S — Other Bank Balances" },
      { icon: "📂", name: "Unpaid Dividend Account", type: "Liability", cls: "B/S — Other Bank Balances (Restricted)" },
    ],
  },
  framework: {
    title: "Ind AS 7 — Cash & Cash Equivalents",
    body: "Cash equivalents are short-term, highly liquid investments readily convertible to known amounts of cash and subject to insignificant risk of changes in value — generally an original maturity of three months or less. Bank balances are confirmed directly (SA 505) and reconciled (BRS). Foreign-currency balances are retranslated at the closing rate with differences in P&L. Restricted balances (margin money, escrow, unpaid dividend) are disclosed separately.",
    chips: ["Ind AS 7", "Ind AS 21 FX", "SA 505", "Bank Reconciliation"],
  },
  lifecycle: () => build([
    { key: "movements", label: "Cash & Bank Movements", icon: "🏦", entries: [
      { ref: "Entry 1", title: "Cash Deposited into Bank", tone: "ppe", lines: [["Bank A/c", "Dr"], ["Cash on Hand A/c", "Cr"]], note: "Routine banking of cash collections; verify same-day/next-day deposit per cash-handling controls." },
      { ref: "Entry 2", title: "Payment by Cheque / Transfer", tone: "ppe", lines: [["Trade Payables A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Outgoing payment; uncleared cheques at year-end are reconciling items in the BRS." },
      { ref: "Entry 3", title: "Bank Charges Debited", tone: "amber", lines: [["Bank Charges A/c (P&L)", "Dr"], ["Bank A/c", "Cr"]], note: "Charges appear in the bank statement, not the cash book until recorded — a common reconciling item." },
      { ref: "Entry 4", title: "Interest on Fixed Deposit (≤3m)", tone: "green", lines: [["Bank / FD A/c", "Dr"], ["Interest Income A/c", "Cr"]], note: "FDs with original maturity ≤3 months are cash equivalents; longer FDs are investments / other financial assets." },
    ] },
    { key: "fx", label: "FX & Reconciliation", icon: "🔁", entries: [
      { ref: "Entry 5", title: "Year-end FX Revaluation", tone: "purple", lines: [["FX Gain / (Loss) A/c (P&L)", "Dr"], ["Foreign Currency Bank A/c", "Cr"]], note: "Retranslate foreign-currency balances at the closing rate (Ind AS 21); difference to P&L." },
      { ref: "Entry 6", title: "Reconciliation — Cheques in Transit", tone: "amber", lines: [["Bank A/c (per books)", "Dr"], ["Cheques in Transit A/c", "Cr"]], note: "Adjust for timing differences between cash book and bank statement; stale cheques (>3 months) reversed." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence — Bank Confirmations", desc: "All bank/cash balances exist and are confirmed by the bank", chips: [{ text: "SA 505 Confirmation", tone: "ppe" }, { text: "BRS", tone: "std" }],
      note: "Obtain direct bank confirmations for all accounts (incl. nil-balance and closed accounts, facilities, liens). Agree to the bank reconciliation and book balance; verify reconciling items clear in the next period." },
    { badge: "V", tone: "amber", name: "Valuation — FX & Cash Equivalents", desc: "FX retranslation correct; equivalents meet the ≤3-month test", chips: [{ text: "Ind AS 21", tone: "amber" }, { text: "≤3m Test", tone: "ppe" }],
      note: "Recompute FX retranslation at the closing rate; verify only genuinely short-term, low-risk instruments are classified as cash equivalents; confirm bank deposits' ECL is immaterial." },
    { badge: "O", tone: "red", name: "Cut-off — Window Dressing", desc: "No artificial year-end cash inflation; cheque cut-off correct", chips: [{ text: "Window Dressing", tone: "red" }, { text: "Cheque Cut-off", tone: "amber" }],
      note: "Review large pre-year-end receipts reversed after year-end and post-dated cheques recorded as collected; verify cheques issued but not despatched are reversed (not reducing creditors and cash simultaneously)." },
    { badge: "R", tone: "purple", name: "Rights — Restricted / Lien", desc: "Restricted, escrow and lien-marked balances identified", chips: [{ text: "Margin Money", tone: "std" }],
      note: "Identify margin money, escrow, unpaid-dividend and lien-marked balances; assess whether they meet the cash-equivalent definition and are correctly classified/disclosed as restricted." },
    { badge: "D", tone: "accent", name: "Presentation & Disclosure", desc: "Restricted cash, FD classification and bank balances disclosed", chips: [{ text: "Schedule III", tone: "blue" }],
      note: "Verify classification across cash, cash equivalents and other bank balances; disclose restricted amounts, FDs >12 months under other financial assets, and the cash-flow reconciliation." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Bank Confirmations (SA 505)", sub: "Direct Confirmation · All Accounts",
      body: "Send confirmations to every bank the entity deals with (per the bank-account master and prior-year file), covering balances, facilities, liens, guarantees and authorised signatories. Control despatch and receipt; reconcile to books." },
    { n: 2, tone: "amber", priority: "Medium", title: "Bank Reconciliation Review", sub: "BRS · Stale Cheques",
      body: "Obtain year-end BRS for each account; test material reconciling items to the next-period statement; investigate cheques issued but uncleared >3 months (reverse) and deposits credited late." },
    { n: 3, tone: "red", priority: "High", title: "Window-Dressing & Cut-off", sub: "Year-end Cash Manipulation",
      body: "Analyse cash movements around year-end for round-tripping, temporary borrowings to inflate cash, and cheques recorded as deposited but not credited. Verify symmetry of cheques-issued / creditors treatment." },
    { n: 4, tone: "accent", priority: "Standard", title: "Restricted Cash & FD Classification", sub: "Ind AS 7 · Schedule III",
      body: "Confirm margin money, escrow and unpaid-dividend balances are disclosed as restricted; FDs are split by maturity (≤3m equivalents, 3–12m current, >12m non-current)." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Prepaid Expenses — Ind AS 1
// ════════════════════════════════════════════════════════════════════════════
const PREPAID: TemplateContent = {
  headChip: "🧾 Prepaid Expenses — Current Asset",
  connected: {
    caption: "All accounts in the prepayments cycle · Prepaid balances · Advances · Amortisation",
    groups: [
      { label: "Prepaid Expenses (Current / Non-current Assets)", startAt: 0, tone: "ppe" },
      { label: "Advances (Other Current Assets)", startAt: 4, tone: "amber" },
      { label: "P&L Impact — Amortisation of Prepayments", startAt: 5, tone: "red" },
      { label: "Bank / Settlement", startAt: 8, tone: "green" },
    ],
    accts: [
      { icon: "🧾", name: "Prepaid Insurance", type: "Asset", cls: "B/S — Current Assets (Prepaid)" },
      { icon: "🧾", name: "Prepaid Rent", type: "Asset", cls: "B/S — Current Assets (Prepaid)" },
      { icon: "🧾", name: "Prepaid Maintenance / AMCs", type: "Asset", cls: "B/S — Current Assets (Prepaid)" },
      { icon: "🧾", name: "Prepaid Software Licences", type: "Asset", cls: "B/S — Current Assets (Prepaid)" },
      { icon: "💰", name: "Advance to Suppliers (non-financial)", type: "Asset", cls: "B/S — Other Current Assets" },
      { icon: "📉", name: "Insurance Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "📉", name: "Rent Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "📉", name: "AMC / Maintenance Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Prepaid Expenses — Accrual & Matching (Ind AS 1)",
    body: "Prepayments are expenses paid in advance of the period they benefit. Under the accrual basis, the unexpired portion is carried as an asset and amortised to the P&L over the period of benefit. Distinguish genuine prepayments (insurance, rent, AMC, licences) from supplier advances (non-financial assets) and capital advances. The current/non-current split follows the period of benefit.",
    chips: ["Ind AS 1", "Accrual / Matching", "Cut-off"],
  },
  lifecycle: () => build([
    { key: "payment", label: "Advance Payment", icon: "💰", entries: [
      { ref: "Entry 1", title: "Insurance Premium Paid in Advance", tone: "ppe", lines: [["Prepaid Insurance A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Annual premium paid up-front; the unexpired portion at year-end remains an asset." },
      { ref: "Entry 2", title: "Advance Rent / AMC / Licence", tone: "ppe", lines: [["Prepaid Rent / AMC A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Capitalise the prepayment; recognise expense over the contract period." },
    ] },
    { key: "amortisation", label: "Amortisation", icon: "📉", entries: [
      { ref: "Entry 3", title: "Monthly Amortisation to P&L", tone: "amber", lines: [["Insurance / Rent Expense A/c (P&L)", "Dr"], ["Prepaid Expense A/c", "Cr"]], note: "Release the expired portion to the P&L on a straight-line / period-of-benefit basis." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence & Supporting Documents", desc: "Each prepayment is supported by an invoice/contract and remains unexpired", chips: [{ text: "Invoices", tone: "ppe" }, { text: "Contracts", tone: "std" }],
      note: "Vouch material prepayments to invoices and contracts; confirm the coverage period extends beyond year-end so an asset genuinely exists." },
    { badge: "V", tone: "amber", name: "Valuation — Amortisation & Lapsed Items", desc: "Unexpired portion correctly computed; lapsed prepayments written off", chips: [{ text: "Period of Benefit", tone: "amber" }],
      note: "Recompute the unexpired portion (days/months remaining); write off prepayments whose benefit period has lapsed or whose underlying contract was cancelled." },
    { badge: "O", tone: "red", name: "Cut-off & Period Allocation", desc: "Expense recognised in the correct period; no over/under-deferral", chips: [{ text: "Matching", tone: "amber" }],
      note: "Test that the current-year charge and the carried-forward asset reconcile to the contract period; watch for deferring current-period costs to inflate profit." },
    { badge: "C", tone: "green", name: "Completeness", desc: "All advance payments identified and split prepaid vs advance", chips: [{ text: "Advances Split", tone: "std" }],
      note: "Scan large expense payments near year-end for amounts relating to future periods; separate supplier/capital advances from expense prepayments." },
    { badge: "D", tone: "accent", name: "Presentation & Disclosure", desc: "Current vs non-current split; advances shown separately", chips: [{ text: "Schedule III", tone: "blue" }],
      note: "Verify prepayments benefiting beyond 12 months are non-current; capital advances are shown under other non-current assets, not prepaid expenses." },
  ],
  checks: [
    { n: 1, tone: "amber", priority: "Medium", title: "Amortisation Recompute", sub: "Period of Benefit",
      body: "Recompute the expired/unexpired split for a sample using the contract period and payment date; reconcile the year's charge to the movement in the prepaid balance." },
    { n: 2, tone: "amber", priority: "Medium", title: "Lapsed / Cancelled Prepayments", sub: "Recoverability",
      body: "Identify prepayments where the contract ended or was cancelled (e.g. insurance on disposed assets, terminated leases); ensure these are written off." },
    { n: 3, tone: "red", priority: "High", title: "Cut-off of Annual Contracts", sub: "Matching",
      body: "Test annual insurance/AMC/licence payments around year-end; confirm only the unexpired portion is carried forward and the rest is expensed." },
    { n: 4, tone: "accent", priority: "Standard", title: "Prepaid vs Advance Distinction", sub: "Classification",
      body: "Confirm supplier advances (for goods/services not yet received) and capital advances are not misclassified as prepaid expenses." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Borrowings — Ind AS 109 / 23
// ════════════════════════════════════════════════════════════════════════════
const BORROWINGS: TemplateContent = {
  headChip: "🏛 Borrowings — Liability",
  connected: {
    caption: "All accounts in the borrowings cycle · Non-current & current · EIR contra · Finance cost · Capitalisation",
    groups: [
      { label: "Borrowings — Non-current", startAt: 0, tone: "ppe" },
      { label: "Borrowings — Current", startAt: 3, tone: "red" },
      { label: "Contra & Accrued Interest", startAt: 5, tone: "purple" },
      { label: "P&L Impact — Finance Cost", startAt: 7, tone: "amber" },
      { label: "Capitalised & Settlement", startAt: 8, tone: "green" },
    ],
    accts: [
      { icon: "🏛", name: "Term Loan from Bank — Principal", type: "Liability", cls: "B/S — Non-current Liabilities (Borrowings)" },
      { icon: "🏛", name: "Debentures / Bonds Issued", type: "Liability", cls: "B/S — Non-current Liabilities (Borrowings)" },
      { icon: "🌐", name: "External Commercial Borrowings (ECB)", type: "Liability", cls: "B/S — Non-current Liabilities (Borrowings)" },
      { icon: "💹", name: "Term Loan — Current Maturity", type: "Liability", cls: "B/S — Current Liabilities (Borrowings)" },
      { icon: "💹", name: "Working Capital Loan / Cash Credit", type: "Liability", cls: "B/S — Current Liabilities (Borrowings)" },
      { icon: "📉", name: "Unamortised Loan Origination Fees", type: "Contra", cls: "B/S — Non-current Liabilities (Contra)" },
      { icon: "📈", name: "Interest Accrued but Not Due", type: "Liability", cls: "B/S — Current Liabilities" },
      { icon: "📊", name: "Finance Cost / Interest Expense A/c", type: "Expense", cls: "P&L — Finance Costs" },
      { icon: "🏗", name: "Borrowing Cost Capitalised (to CWIP)", type: "Expense", cls: "P&L — Finance Costs (Contra — netted)" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 109 — Borrowings at Amortised Cost",
    body: "Borrowings are initially recognised at fair value net of transaction costs and subsequently at amortised cost using the effective interest rate (EIR), which spreads origination fees and discounts over the term. Borrowing costs on qualifying assets are capitalised (Ind AS 23). The current maturity (due within 12 months) is reclassified from non-current. A covenant breach giving the lender the right to demand repayment reclassifies the loan as current.",
    chips: ["Ind AS 109", "Ind AS 23", "EIR", "Covenants"],
  },
  lifecycle: () => build([
    { key: "drawdown", label: "Drawdown & Costs", icon: "💰", entries: [
      { ref: "Entry 1", title: "Term Loan Drawdown", tone: "ppe", lines: [["Bank A/c", "Dr"], ["Term Loan A/c", "Cr"]], note: "Recognise the loan at the proceeds received; sanction terms, security and covenants per the agreement." },
      { ref: "Entry 2", title: "Loan Origination Fees Paid", tone: "amber", lines: [["Unamortised Loan Fees A/c (contra)", "Dr"], ["Bank A/c", "Cr"]], note: "Transaction costs are netted against the loan and amortised through the EIR — not expensed up-front." },
    ] },
    { key: "interest", label: "Interest & Repayment", icon: "📉", entries: [
      { ref: "Entry 3", title: "Interest Accrual (EIR)", tone: "ppe", lines: [["Finance Cost A/c (P&L)", "Dr"], ["Interest Accrued A/c", "Cr"]], note: "Interest at the effective rate (coupon + amortised fees/discount), not just the contractual coupon." },
      { ref: "Entry 4", title: "EMI / Principal Repayment", tone: "ppe", lines: [["Term Loan A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Repayment reduces the outstanding principal; interest portion already accrued above." },
      { ref: "Entry 5", title: "Reclassify Current Maturity", tone: "amber", lines: [["Term Loan — Non-Current A/c", "Dr"], ["Term Loan — Current Maturity A/c", "Cr"]], note: "Amount due within 12 months reclassified to current liabilities at each reporting date." },
    ] },
    { key: "capitalise", label: "Borrowing-Cost Capitalisation", icon: "🏗", entries: [
      { ref: "Entry 6", title: "Borrowing Costs Capitalised (Ind AS 23)", tone: "purple", lines: [["Capital Work-in-Progress A/c", "Dr"], ["Finance Cost A/c", "Cr"]], note: "Capitalise borrowing costs attributable to a qualifying asset during construction; cease when ready for use." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "green", name: "Completeness — All Facilities", desc: "All borrowings, incl. off-balance and related-party, are recorded", chips: [{ text: "Loan Register", tone: "ppe" }, { text: "ROC Charges", tone: "amber" }],
      note: "Reconcile to bank confirmations, the ROC charge register and board approvals; search for unrecorded facilities (interest in P&L without a matching loan, new charges filed)." },
    { badge: "O", tone: "ppe", name: "Existence & Obligation", desc: "Borrowings are valid obligations confirmed by lenders", chips: [{ text: "SA 505 Confirmation", tone: "ppe" }, { text: "Loan Agreements", tone: "std" }],
      note: "Obtain lender confirmations of principal, interest, security and covenants; agree to loan agreements and repayment schedules." },
    { badge: "V", tone: "amber", name: "Valuation — Amortised Cost / EIR", desc: "EIR applied; transaction costs amortised; interest accrued", chips: [{ text: "EIR", tone: "amber" }, { text: "Ind AS 109", tone: "ppe" }],
      note: "Re-perform EIR amortisation of fees/discount; verify interest accrued to year-end (including interest accrued but not due); test borrowing-cost capitalisation eligibility (Ind AS 23)." },
    { badge: "P", tone: "purple", name: "Classification — Current vs Non-current & Covenants", desc: "Current maturity split; covenant breaches reclassified to current", chips: [{ text: "Covenant Breach", tone: "red" }],
      note: "Verify the current-maturity split; assess covenant compliance — an unconditional breach at year-end (without a waiver before the date) reclassifies the whole loan as current (Ind AS 1)." },
    { badge: "D", tone: "accent", name: "Disclosure — Security & Maturity", desc: "Security, terms, covenants, defaults and maturity profile disclosed", chips: [{ text: "Schedule III", tone: "blue" }],
      note: "Verify disclosure of security/charges, repayment terms & rates, any defaults/continuing breaches, and the maturity profile of borrowings." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Lender Confirmations & Completeness", sub: "SA 505 · ROC Charges",
      body: "Confirm all facilities directly with lenders; reconcile to the ROC charge register and board minutes; investigate finance costs without a corresponding recorded loan." },
    { n: 2, tone: "red", priority: "High", title: "Covenant Compliance Review", sub: "Ind AS 1 · Reclassification",
      body: "Obtain covenant computations; test compliance at year-end; for breaches, confirm whether a waiver was obtained before the reporting date — if not, reclassify the borrowing as current." },
    { n: 3, tone: "amber", priority: "Medium", title: "EIR & Transaction-Cost Amortisation", sub: "Ind AS 109",
      body: "Re-perform the EIR schedule; confirm origination fees/discounts are amortised over the term (not expensed up-front) and that interest accrued ties to the agreement." },
    { n: 4, tone: "amber", priority: "Medium", title: "Borrowing-Cost Capitalisation & Current Split", sub: "Ind AS 23",
      body: "Verify capitalisation only for qualifying assets during construction (suspend on interruption, cease on readiness); test the non-current vs current-maturity reclassification." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Trade & Other Payables — Ind AS 1 · GST · MSME
// ════════════════════════════════════════════════════════════════════════════
const AP: TemplateContent = {
  headChip: "🛒 Trade Payables — Liability",
  connected: {
    caption: "All accounts in the payables cycle · Trade creditors · GST · MSME interest · Settlement",
    groups: [
      { label: "Trade Payables (Current Liabilities)", startAt: 0, tone: "ppe" },
      { label: "Statutory — GST", startAt: 5, tone: "amber" },
      { label: "P&L Impact — MSME Interest & Discounts", startAt: 7, tone: "red" },
      { label: "Bank / Settlement", startAt: 9, tone: "green" },
    ],
    accts: [
      { icon: "🛒", name: "Trade Payables — Goods (non-MSME)", type: "Liability", cls: "B/S — Current Liabilities (Trade Payables)" },
      { icon: "🛒", name: "Trade Payables — MSME", type: "Liability", cls: "B/S — Current Liabilities (Trade Payables)" },
      { icon: "🛠", name: "Trade Payables — Services", type: "Liability", cls: "B/S — Current Liabilities (Trade Payables)" },
      { icon: "🤝", name: "Trade Payables — Related Parties", type: "Liability", cls: "B/S — Current Liabilities (Trade Payables)" },
      { icon: "🧾", name: "Bills Payable", type: "Liability", cls: "B/S — Current Liabilities (Trade Payables)" },
      { icon: "🧾", name: "Input GST Credit Receivable", type: "Asset", cls: "B/S — Current Assets (Statutory)" },
      { icon: "🧾", name: "GST / TDS Payable", type: "Liability", cls: "B/S — Current Liabilities (Statutory)" },
      { icon: "⚠", name: "MSME Interest Expense A/c (Sec 16)", type: "Expense", cls: "P&L — Finance Costs / Other" },
      { icon: "💰", name: "Discount Income A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Trade Payables — Completeness, GST & MSME",
    body: "Trade payables are obligations to suppliers for goods/services received. The dominant risk is completeness (understated liabilities to inflate profit). Input GST is reconciled to GSTR-2B. The MSMED Act requires payment within 45 days, with interest accruing on overdue MSME dues (Sec 16) and specific Schedule III / Form 3CD disclosure. Ageing and related-party balances are disclosed.",
    chips: ["Ind AS 1", "GST / GSTR-2B", "MSMED Sec 16", "Completeness"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Recognition", icon: "🛒", entries: [
      { ref: "Entry 1", title: "Credit Purchase of Goods", tone: "ppe", lines: [["Purchases / Inventory A/c", "Dr"], ["Input GST A/c", "Dr"], ["Trade Payables A/c", "Cr"]], note: "Recognise on transfer of control/receipt; input GST credit recognised separately where eligible." },
      { ref: "Entry 2", title: "Services Rendered on Credit", tone: "ppe", lines: [["Service Expense A/c", "Dr"], ["Trade Payables A/c", "Cr"]], note: "Accrue for services received before year-end even if not yet invoiced (goods/services received not invoiced)." },
    ] },
    { key: "settlement", label: "Settlement & GST", icon: "💵", entries: [
      { ref: "Entry 3", title: "Payment to Supplier", tone: "ppe", lines: [["Trade Payables A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Settlement; subsequent payments after year-end are key evidence in the search for unrecorded liabilities." },
      { ref: "Entry 4", title: "GSTR-2B Reconciliation Difference", tone: "amber", lines: [["Input GST Suspense A/c", "Dr"], ["Trade Payables A/c", "Cr"]], note: "Reconcile input credit per books to GSTR-2B; credit not reflected is restricted until the supplier files." },
    ] },
    { key: "msme", label: "MSME Interest", icon: "⚠", entries: [
      { ref: "Entry 5", title: "MSME Interest Accrual (Sec 16)", tone: "red", lines: [["MSME Interest Expense A/c (P&L)", "Dr"], ["Trade Payables — MSME A/c", "Cr"]], note: "Interest accrues on MSME dues unpaid beyond 45 days; disallowed under the Income Tax Act and disclosed under Schedule III." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "red", name: "Completeness — Unrecorded Liabilities", desc: "All liabilities for goods/services received are recorded", chips: [{ text: "Search for Unrecorded", tone: "red" }, { text: "Subsequent Payments", tone: "amber" }],
      note: "The primary payables risk. Perform a search for unrecorded liabilities: review post-year-end payments and unmatched GRNs/invoices; test goods received not invoiced; obtain supplier statements and reconcile." },
    { badge: "O", tone: "ppe", name: "Existence & Obligation", desc: "Recorded payables are genuine obligations of the entity", chips: [{ text: "Supplier Statements", tone: "ppe" }],
      note: "Reconcile to supplier statements; investigate debit balances in payables (advances misclassified) and long-outstanding/round-sum balances." },
    { badge: "V", tone: "amber", name: "Valuation — GST & MSME Interest", desc: "Input GST reconciled to GSTR-2B; MSME interest computed", chips: [{ text: "GSTR-2B", tone: "amber" }, { text: "Sec 16", tone: "red" }],
      note: "Reconcile input credit to GSTR-2B and restrict ineligible/unreflected credit; identify MSME suppliers and compute Sec 16 interest on dues beyond 45 days." },
    { badge: "O2", tone: "purple", name: "Cut-off", desc: "Purchases recorded in the correct period", chips: [{ text: "GRN Cut-off", tone: "std" }],
      note: "Test last GRNs and invoices around year-end; ensure goods received before year-end are accrued and goods received after are excluded." },
    { badge: "D", tone: "accent", name: "Presentation & Disclosure", desc: "MSME vs non-MSME, ageing and related-party dues disclosed", chips: [{ text: "Schedule III Ageing", tone: "blue" }],
      note: "Verify the Schedule III payables ageing, MSME disclosures (principal & interest), and related-party balances tie to the ledger." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Search for Unrecorded Liabilities", sub: "Completeness · Subsequent Payments",
      body: "Examine payments and invoices received after year-end; trace to the period of goods/service receipt; test unmatched GRNs and the GRNI account; reconcile major supplier statements to the ledger." },
    { n: 2, tone: "red", priority: "High", title: "GSTR-2B vs Books Reconciliation", sub: "GST · Input Credit",
      body: "Reconcile input credit claimed to GSTR-2B; quantify and restrict credit not reflected (supplier non-filing); assess provisions for reversal where the 180-day payment rule is breached." },
    { n: 3, tone: "amber", priority: "Medium", title: "MSME Identification & Sec 16 Interest", sub: "MSMED Act · Form 3CD",
      body: "Obtain MSME declarations from suppliers; age MSME dues; compute interest on amounts unpaid beyond 45 days; verify Schedule III & Form 3CD disclosure and IT-Act disallowance." },
    { n: 4, tone: "amber", priority: "Medium", title: "Supplier Reconciliation & Cut-off", sub: "Existence · Cut-off",
      body: "Reconcile material supplier statements; investigate debit balances and old items; test purchase cut-off against GRN/invoice dates around the year-end." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Loans & Advances — Ind AS 109
// ════════════════════════════════════════════════════════════════════════════
const LOANS: TemplateContent = {
  headChip: "💼 Loans & Advances — Asset",
  connected: {
    caption: "Loans, inter-corporate deposits, staff loans, security deposits · interest · ECL · recoverability",
    groups: [
      { label: "Loans & Advances (Financial Assets)", startAt: 0, tone: "ppe" },
      { label: "Accrued Interest & ECL Allowance", startAt: 4, tone: "purple" },
      { label: "P&L Impact — Interest & ECL", startAt: 6, tone: "red" },
      { label: "Bank / Settlement", startAt: 8, tone: "green" },
    ],
    accts: [
      { icon: "🤝", name: "Loans to Related Parties", type: "Asset", cls: "B/S — Non-current / Current (Loans)" },
      { icon: "💼", name: "Inter-Corporate Deposits (ICD)", type: "Asset", cls: "B/S — Non-current / Current (Loans)" },
      { icon: "👤", name: "Staff / Employee Loans", type: "Asset", cls: "B/S — Loans (Other Financial Assets)" },
      { icon: "🔒", name: "Security Deposits (Refundable)", type: "Asset", cls: "B/S — Other Financial Assets" },
      { icon: "📈", name: "Interest Accrued on Loans", type: "Asset", cls: "B/S — Other Financial Assets" },
      { icon: "⚠", name: "ECL Allowance — Loans & Advances", type: "Contra", cls: "B/S — Loans (Contra)" },
      { icon: "📈", name: "Interest Income A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "⚠", name: "ECL Expense / Bad Debt A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 109 — Loans & Advances",
    body: "Loans, inter-corporate deposits, staff loans and refundable security deposits are financial assets at amortised cost using EIR, subject to Expected Credit Loss. Non-interest-bearing long-term deposits are discounted. Recoverability, related-party arm's-length terms (Ind AS 24 · Sec 186) and the financial-vs-non-financial distinction (advances for goods/services) are the key risks.",
    chips: ["Ind AS 109", "ECL", "Ind AS 24 · Sec 186", "Recoverability"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Recognition", icon: "💼", entries: [
      { ref: "Entry 1", title: "Loan / Advance Given", tone: "ppe", lines: [["Loans & Advances A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Recognise at the amount disbursed; assess whether financial (repayable with return) or a non-financial advance for goods/services." },
      { ref: "Entry 2", title: "Refundable Security Deposit", tone: "amber", lines: [["Security Deposits A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Non-interest-bearing long-term deposits discounted to present value; the difference is prepaid rent / finance income over the term." },
    ] },
    { key: "income", label: "Income & ECL", icon: "📈", entries: [
      { ref: "Entry 3", title: "Interest Accrual (EIR)", tone: "ppe", lines: [["Interest Accrued A/c", "Dr"], ["Interest Income A/c", "Cr"]], note: "On interest-bearing loans/ICDs at the effective interest rate." },
      { ref: "Entry 4", title: "ECL Provision", tone: "red", lines: [["ECL Expense A/c (P&L)", "Dr"], ["ECL Allowance A/c", "Cr"]], note: "12-month / lifetime ECL by credit-risk stage; related-party and overdue advances assessed for specific impairment." },
    ] },
    { key: "recovery", label: "Recovery / Write-off", icon: "🔚", entries: [
      { ref: "Entry 5", title: "Recovery of Loan / Advance", tone: "green", lines: [["Bank A/c", "Dr"], ["Loans & Advances A/c", "Cr"]], note: "Receipt on repayment; subsequent recovery corroborates recoverability." },
      { ref: "Entry 6", title: "Write-off of Irrecoverable Advance", tone: "red", lines: [["ECL Allowance / Bad Debt A/c", "Dr"], ["Loans & Advances A/c", "Cr"]], note: "Write off with approval once recovery is no longer expected; verify legal recovery options were exhausted." },
    ] },
  ]),
  assertions: [
    { badge: "E", tone: "ppe", name: "Existence — Confirmations", desc: "Balances exist and are confirmed by counterparties", chips: [{ text: "SA 505 Confirmation", tone: "ppe" }, { text: "Agreements", tone: "std" }],
      note: "Confirm material balances directly; agree to loan agreements / deposit receipts; for non-replies perform alternative procedures (subsequent receipts, interest servicing)." },
    { badge: "R", tone: "green", name: "Rights & Recoverability", desc: "Amounts are recoverable; no evergreening or diversion", chips: [{ text: "Recoverability", tone: "amber" }, { text: "Ageing", tone: "ppe" }],
      note: "Assess ageing and servicing; investigate loans repeatedly rolled over (evergreening), interest-free related-party advances and advances with no movement; corroborate with subsequent recovery." },
    { badge: "V", tone: "amber", name: "Valuation — ECL & EIR", desc: "ECL adequate; EIR / discounting applied to long-term deposits", chips: [{ text: "Ind AS 109", tone: "amber" }],
      note: "Test ECL staging and PD/LGD; re-perform discounting of non-interest-bearing long-term deposits; specifically provide for doubtful/disputed advances." },
    { badge: "P", tone: "purple", name: "Classification — Financial vs Advance & RPT", desc: "Financial assets vs advances; current vs non-current; related-party split", chips: [{ text: "Ind AS 24", tone: "std" }],
      note: "Separate financial loans from supplier/capital advances; split current vs non-current by tenor; identify and present related-party balances separately." },
    { badge: "D", tone: "accent", name: "Disclosure — Schedule III & Sec 186", desc: "Loans to related parties / KMP and Sec 186 compliance disclosed", chips: [{ text: "Sec 186", tone: "blue" }],
      note: "Verify Schedule III disclosure of loans to promoters/directors/KMP/related parties (amount, % of total) and Companies Act Sec 185/186 limits and approvals." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Confirmations & Agreements (SA 505)", sub: "Existence",
      body: "Confirm balances with counterparties; agree terms (rate, tenor, security) to agreements; alternative procedures for non-replies." },
    { n: 2, tone: "red", priority: "High", title: "Recoverability & Ageing Review", sub: "Valuation",
      body: "Age balances; review servicing and subsequent recovery; flag evergreening and interest-free/long-outstanding related-party advances for specific provisioning." },
    { n: 3, tone: "amber", priority: "Medium", title: "Related-Party & Sec 186 Compliance", sub: "Ind AS 24 · Companies Act",
      body: "Identify related-party loans; verify board/shareholder approvals and Sec 185/186 limits; assess arm's-length pricing and disclosure." },
    { n: 4, tone: "amber", priority: "Medium", title: "ECL & EIR on Deposits", sub: "Ind AS 109",
      body: "Test ECL computation; re-perform discounting/EIR for long-term non-interest-bearing deposits." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Lease Liabilities — Ind AS 116
// ════════════════════════════════════════════════════════════════════════════
const LEASE_LIAB: TemplateContent = {
  headChip: "📋 Lease Liabilities — Liability",
  connected: {
    caption: "Lease liability roll-forward · interest · current/non-current split · paired with ROU asset",
    groups: [
      { label: "Lease Liability", startAt: 0, tone: "ppe" },
      { label: "Paired ROU Asset", startAt: 2, tone: "amber" },
      { label: "P&L Impact — Lease Interest", startAt: 3, tone: "red" },
      { label: "Bank / Settlement", startAt: 4, tone: "green" },
    ],
    accts: [
      { icon: "📋", name: "Lease Liability — Current", type: "Liability", cls: "B/S — Current Liabilities" },
      { icon: "📋", name: "Lease Liability — Non-Current", type: "Liability", cls: "B/S — Non-current Liabilities" },
      { icon: "🏢", name: "Right-of-Use Asset (paired)", type: "Asset", cls: "B/S — Non-current Assets (ROU)" },
      { icon: "📊", name: "Finance Cost — Lease Interest A/c", type: "Expense", cls: "P&L — Finance Costs" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 116 — Lease Liabilities (Lessee)",
    body: "The lease liability is the present value of unpaid lease payments discounted at the rate implicit in the lease or the incremental borrowing rate. It is unwound at the effective rate (interest in P&L), reduced by payments, and remeasured on reassessment/modification (index/rate changes, term or purchase-option changes). The portion due within 12 months is presented as current; a maturity analysis is disclosed. Pairs with the ROU asset.",
    chips: ["Ind AS 116", "EIR", "Remeasurement", "Maturity Analysis"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Initial Recognition", icon: "🏗", entries: [
      { ref: "Entry 1", title: "Recognise Lease Liability & ROU", tone: "ppe", lines: [["Right-of-Use Asset A/c", "Dr"], ["Lease Liability A/c", "Cr"]], note: "PV of fixed + in-substance fixed lease payments at the discount rate; ROU adds initial direct costs & prepayments less incentives." },
    ] },
    { key: "subsequent", label: "Subsequent Measurement", icon: "📉", entries: [
      { ref: "Entry 2", title: "Interest Unwinding (EIR)", tone: "ppe", lines: [["Finance Cost A/c (P&L)", "Dr"], ["Lease Liability A/c", "Cr"]], note: "Front-loaded interest at the incremental borrowing rate over the lease term." },
      { ref: "Entry 3", title: "Lease Payment", tone: "ppe", lines: [["Lease Liability A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Payment reduces the liability; the interest portion is recognised above." },
      { ref: "Entry 4", title: "Reclassify Current Portion", tone: "amber", lines: [["Lease Liability — Non-Current A/c", "Dr"], ["Lease Liability — Current A/c", "Cr"]], note: "Amount payable within 12 months reclassified to current at each reporting date." },
    ] },
    { key: "remeasure", label: "Remeasurement", icon: "🔁", entries: [
      { ref: "Entry 5", title: "Reassessment / Modification", tone: "purple", lines: [["Right-of-Use Asset A/c", "Dr"], ["Lease Liability A/c", "Cr"]], note: "On index/rate or term changes, remeasure the liability at a revised rate and adjust the ROU asset (excess to P&L if ROU is nil)." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "green", name: "Completeness — All Leases", desc: "All lease liabilities incl. embedded leases recognised", chips: [{ text: "Embedded Leases", tone: "amber" }, { text: "ROU Pairing", tone: "ppe" }],
      note: "Reconcile lease liabilities to the ROU register and the lease contract register; scan service contracts for embedded leases; confirm short-term/low-value exemptions are eligible." },
    { badge: "V", tone: "amber", name: "Valuation — Discount Rate & Remeasurement", desc: "Liability uses an appropriate rate; remeasurements correct", chips: [{ text: "IBR", tone: "amber" }],
      note: "Challenge the incremental borrowing rate; re-perform the PV and the interest unwind; test remeasurements on modifications and index-linked payment changes." },
    { badge: "P", tone: "ppe", name: "Classification — Current vs Non-current", desc: "Current portion correctly split", chips: [{ text: "Ind AS 1", tone: "ppe" }],
      note: "Verify the within-12-months portion is presented as current and the balance as non-current." },
    { badge: "O", tone: "purple", name: "Cut-off", desc: "Payments and interest recorded in the correct period", chips: [{ text: "Cut-off", tone: "std" }],
      note: "Test the interest accrual and payment split around year-end; confirm no overstatement of liability reduction." },
    { badge: "D", tone: "accent", name: "Disclosure — Maturity Analysis", desc: "Undiscounted maturity analysis and movement disclosed", chips: [{ text: "Ind AS 116 para 58", tone: "blue" }],
      note: "Verify the undiscounted maturity analysis, the lease-liability movement, and total cash outflow for leases tie to the register." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Discount Rate (IBR) Appropriateness", sub: "Ind AS 116",
      body: "Obtain the IBR derivation; benchmark to similar-tenor secured borrowing rates; re-perform PV and assess sensitivity to the rate." },
    { n: 2, tone: "amber", priority: "Medium", title: "Current / Non-current Split & Maturity", sub: "Ind AS 1 · 116",
      body: "Re-perform the current-portion split and the undiscounted maturity analysis; reconcile to the liability roll-forward." },
    { n: 3, tone: "amber", priority: "Medium", title: "Remeasurement on Modifications", sub: "Ind AS 116",
      body: "Test remeasurements for lease modifications, index/rate resets and option reassessments; confirm the ROU adjustment treatment." },
    { n: 4, tone: "red", priority: "High", title: "Completeness vs ROU Register", sub: "Pairing",
      body: "Reconcile every lease liability to a corresponding ROU asset and lease contract; investigate liabilities without an ROU and vice versa." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Related-Party Loans — Ind AS 24 · Companies Act §185/188
// ════════════════════════════════════════════════════════════════════════════
const RP_LOANS: TemplateContent = {
  headChip: "🤝 Related-Party Loans — Liability / Asset",
  connected: {
    caption: "Loans from / to related parties · arm's-length terms · Companies Act approvals · Ind AS 24 disclosure",
    groups: [
      { label: "Related-Party Borrowings / Lendings", startAt: 0, tone: "ppe" },
      { label: "Accrued Interest", startAt: 2, tone: "purple" },
      { label: "P&L Impact — Interest", startAt: 3, tone: "amber" },
      { label: "Bank / Settlement", startAt: 5, tone: "green" },
    ],
    accts: [
      { icon: "🤝", name: "Loan from Related Party", type: "Liability", cls: "B/S — Non-current / Current Liabilities" },
      { icon: "🤝", name: "Loan to Related Party", type: "Asset", cls: "B/S — Non-current / Current (Loans)" },
      { icon: "📈", name: "Interest Payable — Related Party", type: "Liability", cls: "B/S — Current Liabilities" },
      { icon: "📉", name: "Finance Cost — RP Interest A/c", type: "Expense", cls: "P&L — Finance Costs" },
      { icon: "📈", name: "Interest Income — RP A/c", type: "Income", cls: "P&L — Other Income" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 24 · Companies Act §185/§188 — Related-Party Loans",
    body: "Loans from or to related parties require disclosure of amount, terms and outstanding balances (Ind AS 24), and compliance with Companies Act §185 (loans to directors), §186 (limits) and §188 (related-party transactions — board / audit-committee / shareholder approval where applicable). The audit emphasis is completeness of the related-party population, arm's-length pricing and authorisation.",
    chips: ["Ind AS 24", "§185 / §186 / §188", "Arm's Length"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Recognition", icon: "🤝", entries: [
      { ref: "Entry 1", title: "Loan Received from Related Party", tone: "ppe", lines: [["Bank A/c", "Dr"], ["Loan from Related Party A/c", "Cr"]], note: "Recognise the borrowing; verify board/shareholder approval and arm's-length terms." },
      { ref: "Entry 2", title: "Loan Given to Related Party", tone: "amber", lines: [["Loan to Related Party A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Loans to directors/related parties must comply with §185/§186 limits and conditions." },
    ] },
    { key: "interest", label: "Interest", icon: "📈", entries: [
      { ref: "Entry 3", title: "Interest Accrual", tone: "ppe", lines: [["Finance Cost / Interest Income A/c", "Dr"], ["Interest Payable / Accrued A/c", "Cr"]], note: "Accrue interest at the agreed (arm's-length) rate; interest-free related-party loans are a transfer-pricing & disclosure flag." },
    ] },
    { key: "settlement", label: "Settlement", icon: "🔁", entries: [
      { ref: "Entry 4", title: "Repayment", tone: "green", lines: [["Loan from Related Party A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Repayment; verify genuine cash settlement (not circular round-tripping)." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "red", name: "Completeness — Related-Party Population", desc: "All related parties and transactions identified", chips: [{ text: "RP Register", tone: "red" }, { text: "SA 550", tone: "amber" }],
      note: "Obtain the related-party list (KMP, directors, group entities); corroborate with MGT-7/board minutes/declarations; search for undisclosed relationships and transactions (SA 550)." },
    { badge: "E", tone: "ppe", name: "Existence & Obligation", desc: "Balances confirmed and supported by agreements", chips: [{ text: "Confirmation", tone: "ppe" }],
      note: "Confirm balances with related parties; agree to loan agreements and board resolutions." },
    { badge: "V", tone: "amber", name: "Valuation — Arm's Length & EIR", desc: "Pricing is arm's length; interest correctly accrued", chips: [{ text: "Arm's Length", tone: "amber" }],
      note: "Assess whether interest rates and terms are arm's length; interest-free or below-market loans require fair-value / Ind AS 109 consideration and transfer-pricing review." },
    { badge: "L", tone: "purple", name: "Legal Compliance — §185/§186/§188", desc: "Statutory approvals and limits complied with", chips: [{ text: "§185 / §186 / §188", tone: "std" }],
      note: "Verify §185 prohibition/exemptions for loans to directors, §186 limits, and §188 approvals (board / audit committee / special resolution) where thresholds are exceeded." },
    { badge: "D", tone: "accent", name: "Disclosure — Ind AS 24", desc: "Relationships, terms and balances disclosed", chips: [{ text: "Ind AS 24", tone: "blue" }],
      note: "Verify disclosure of related-party relationships, transaction amounts, terms, outstanding balances and any provisions for doubtful related-party dues." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "RP Identification & Register Completeness", sub: "SA 550 · Ind AS 24",
      body: "Build/verify the related-party list from declarations, MGT filings and group structure; search for undisclosed parties and transactions." },
    { n: 2, tone: "red", priority: "High", title: "§185 / §186 / §188 Compliance", sub: "Companies Act",
      body: "Test loans to directors against §185; aggregate against §186 limits; verify §188 approvals and disclosures where thresholds are crossed." },
    { n: 3, tone: "amber", priority: "Medium", title: "Arm's-Length Pricing", sub: "Transfer Pricing",
      body: "Assess interest rates/terms versus market; flag interest-free or concessional loans for fair-value and transfer-pricing implications." },
    { n: 4, tone: "amber", priority: "Medium", title: "Confirmations & Disclosure", sub: "Ind AS 24",
      body: "Confirm balances; verify the Ind AS 24 note (relationships, amounts, terms, outstanding, provisions)." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Deferred Tax Liability — Ind AS 12
// ════════════════════════════════════════════════════════════════════════════
const DTL: TemplateContent = {
  headChip: "💹 Deferred Tax — Liability",
  connected: {
    caption: "Deferred tax on temporary differences · enacted rate · DTA recoverability · P&L vs OCI",
    groups: [
      { label: "Deferred Tax (Balance Sheet)", startAt: 0, tone: "ppe" },
      { label: "P&L / OCI Impact", startAt: 2, tone: "amber" },
    ],
    accts: [
      { icon: "💹", name: "Deferred Tax Liability A/c", type: "Liability", cls: "B/S — Non-current Liabilities" },
      { icon: "💹", name: "Deferred Tax Asset A/c", type: "Asset", cls: "B/S — Non-current Assets" },
      { icon: "📊", name: "Deferred Tax Expense / (Income) A/c", type: "Expense", cls: "P&L — Income Tax Expense" },
      { icon: "📈", name: "Deferred Tax on OCI Items", type: "Equity", cls: "Equity — Other Comprehensive Income" },
    ],
  },
  framework: {
    title: "Ind AS 12 — Deferred Tax",
    body: "Deferred tax is recognised on temporary differences between the carrying amount and tax base of assets/liabilities, at enacted rates (25.168% under Sec 115BAA). Taxable temporary differences (e.g. book WDV > tax WDV) create a DTL; deductible differences and carry-forward losses create a DTA, recognised only to the extent recovery is probable. Tax on items taken to OCI is itself recognised in OCI. DT balances are presented net and non-current.",
    chips: ["Ind AS 12", "Temporary Differences", "Sec 115BAA", "DTA Recoverability"],
  },
  lifecycle: () => build([
    { key: "recognition", label: "Recognition", icon: "💹", entries: [
      { ref: "Entry 1", title: "DTL on Taxable Temporary Difference", tone: "ppe", lines: [["Deferred Tax Expense A/c (P&L)", "Dr"], ["Deferred Tax Liability A/c", "Cr"]], note: "Recognise DTL where carrying amount > tax base (e.g. PPE book WDV > tax WDV) at the enacted rate." },
      { ref: "Entry 2", title: "DTA on Deductible Difference / Losses", tone: "green", lines: [["Deferred Tax Asset A/c", "Dr"], ["Deferred Tax Income A/c (P&L)", "Cr"]], note: "Recognise DTA on provisions, 43B items and carry-forward losses only to the extent future taxable profit is probable." },
    ] },
    { key: "oci", label: "OCI & Reversal", icon: "🔁", entries: [
      { ref: "Entry 3", title: "Deferred Tax on OCI Items", tone: "purple", lines: [["OCI — Deferred Tax A/c", "Dr"], ["Deferred Tax Liability A/c", "Cr"]], note: "Tax on FVOCI gains / actuarial remeasurements is recognised in OCI, not P&L (backwards-tracing)." },
      { ref: "Entry 4", title: "Reversal of Temporary Difference", tone: "amber", lines: [["Deferred Tax Liability A/c", "Dr"], ["Deferred Tax Income A/c (P&L)", "Cr"]], note: "DTL reverses as the temporary difference unwinds (e.g. tax depreciation falls below book in later years)." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "green", name: "Completeness — All Temporary Differences", desc: "DT recognised on every temporary difference", chips: [{ text: "DT Schedule", tone: "amber" }],
      note: "Obtain the temporary-difference schedule (carrying amount vs tax base) and confirm all items — depreciation, provisions, 43B, losses, fair-value, lease, OCI — are captured." },
    { badge: "V", tone: "amber", name: "Valuation — Rate & DTA Recoverability", desc: "Enacted rate applied; DTA recognised only where probable", chips: [{ text: "Ind AS 12 para 24", tone: "amber" }, { text: "Sec 115BAA", tone: "ppe" }],
      note: "Verify the enacted rate (25.168% under Sec 115BAA); assess DTA recoverability against convincing evidence of future taxable profit — a history of losses is contrary evidence." },
    { badge: "P", tone: "purple", name: "Classification — Net / Non-current & P&L vs OCI", desc: "Offset criteria met; OCI tax in OCI", chips: [{ text: "Net Presentation", tone: "std" }],
      note: "Verify DTA/DTL are offset only where legally enforceable and relate to the same tax authority; presented non-current; tax on OCI items recognised in OCI." },
    { badge: "A", tone: "ppe", name: "Accuracy — Movement", desc: "DT movement reconciles to P&L, OCI and equity", chips: [{ text: "Roll-forward", tone: "ppe" }],
      note: "Reconcile opening to closing DT through P&L, OCI and any equity adjustments; verify prior-year reversals." },
    { badge: "D", tone: "accent", name: "Disclosure — Components & ETR", desc: "Major DT components and ETR reconciliation disclosed", chips: [{ text: "Ind AS 12 para 81", tone: "blue" }],
      note: "Verify disclosure of the major components of deferred tax, unrecognised DTA / losses, and the effective-tax-rate reconciliation." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Temporary-Difference Schedule", sub: "Carrying Amount vs Tax Base",
      body: "Re-perform the schedule for all assets/liabilities; apply the enacted rate; reconcile the DT movement to P&L and OCI." },
    { n: 2, tone: "red", priority: "High", title: "DTA Recoverability", sub: "Probable Future Profit",
      body: "Challenge DTA on losses/provisions against forecasts and history; document convincing evidence; restrict where recovery is not probable." },
    { n: 3, tone: "amber", priority: "Medium", title: "Enacted Rate & Sec 115BAA", sub: "Ind AS 12",
      body: "Confirm the rate is enacted (not proposed) and consistent with the elected regime (25.168% under Sec 115BAA)." },
    { n: 4, tone: "accent", priority: "Standard", title: "P&L / OCI Split & Disclosure", sub: "Backwards-tracing",
      body: "Verify tax on OCI items is in OCI; re-perform the ETR reconciliation and the components-of-DT disclosure." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Short-Term Borrowings — Ind AS 109
// ════════════════════════════════════════════════════════════════════════════
const ST_BORROW: TemplateContent = {
  headChip: "🏦 Short-Term Borrowings — Liability",
  connected: {
    caption: "Working-capital facilities · cash credit / OD · packing credit · interest · security (drawing power)",
    groups: [
      { label: "Short-Term Borrowings (Current Liabilities)", startAt: 0, tone: "ppe" },
      { label: "Accrued Interest", startAt: 2, tone: "purple" },
      { label: "P&L Impact — Finance Cost", startAt: 3, tone: "amber" },
      { label: "Bank / Settlement", startAt: 4, tone: "green" },
    ],
    accts: [
      { icon: "🏦", name: "Cash Credit / Overdraft", type: "Liability", cls: "B/S — Current Liabilities (Borrowings)" },
      { icon: "📦", name: "Packing Credit / WCDL", type: "Liability", cls: "B/S — Current Liabilities (Borrowings)" },
      { icon: "📈", name: "Interest Accrued but Not Due", type: "Liability", cls: "B/S — Current Liabilities" },
      { icon: "📊", name: "Finance Cost / Interest Expense A/c", type: "Expense", cls: "P&L — Finance Costs" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Ind AS 109 — Short-Term Borrowings",
    body: "Working-capital facilities — cash credit, overdraft, packing credit and short-term loans (≤12 months) — are measured at amortised cost with interest accrued to the reporting date. They are typically secured against current assets, with utilisation limited by the sanctioned drawing power (based on stock/debtor statements). Disclosure covers security, terms and any default; current-asset charges are filed with the ROC.",
    chips: ["Ind AS 109", "Drawing Power", "Working Capital", "Security"],
  },
  lifecycle: () => build([
    { key: "drawdown", label: "Utilisation", icon: "💰", entries: [
      { ref: "Entry 1", title: "CC / OD Utilisation", tone: "ppe", lines: [["Bank A/c", "Dr"], ["Short-Term Borrowing A/c", "Cr"]], note: "Drawdown within the sanctioned limit and drawing power; the facility fluctuates with working-capital needs." },
      { ref: "Entry 2", title: "Packing Credit / WCDL", tone: "amber", lines: [["Bank A/c", "Dr"], ["Short-Term Borrowing A/c", "Cr"]], note: "Pre/post-shipment export credit or working-capital demand loan; verify end-use and tenor (≤12 months)." },
    ] },
    { key: "interest", label: "Interest & Repayment", icon: "📉", entries: [
      { ref: "Entry 3", title: "Interest Accrual", tone: "ppe", lines: [["Finance Cost A/c (P&L)", "Dr"], ["Interest Accrued A/c", "Cr"]], note: "Accrue interest to the reporting date at the facility rate (often linked to MCLR/repo + spread)." },
      { ref: "Entry 4", title: "Repayment / Adjustment", tone: "green", lines: [["Short-Term Borrowing A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Collections route through the CC/OD account, reducing the outstanding." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "green", name: "Completeness — All Facilities", desc: "All short-term facilities recorded", chips: [{ text: "Sanction Letters", tone: "ppe" }, { text: "ROC Charges", tone: "amber" }],
      note: "Reconcile to bank confirmations, sanction letters and the ROC charge register; investigate finance cost without a corresponding facility." },
    { badge: "O", tone: "ppe", name: "Existence & Obligation", desc: "Balances confirmed by lenders", chips: [{ text: "SA 505", tone: "ppe" }],
      note: "Confirm balances, limits, drawing power and security with banks; agree to the facility statement." },
    { badge: "V", tone: "amber", name: "Valuation — Interest Accrual", desc: "Interest accrued to the reporting date", chips: [{ text: "Ind AS 109", tone: "amber" }],
      note: "Re-perform interest accrual at the applicable rate; verify interest accrued but not due is recognised." },
    { badge: "P", tone: "purple", name: "Classification & Drawing Power", desc: "Current classification; utilisation within drawing power", chips: [{ text: "Drawing Power", tone: "std" }],
      note: "Confirm presentation as current borrowings; test utilisation against the drawing power derived from periodic stock/debtor statements." },
    { badge: "D", tone: "accent", name: "Disclosure — Security & Default", desc: "Security, terms and any default disclosed", chips: [{ text: "Schedule III", tone: "blue" }],
      note: "Verify disclosure of security/charges on current assets, terms, and any default in repayment; quarterly returns agree to books (MCA 2021 disclosure)." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Bank Confirmations & Sanction", sub: "SA 505",
      body: "Confirm balances, limits, drawing power and security directly with lenders; reconcile to sanction letters and the ROC charge register." },
    { n: 2, tone: "amber", priority: "Medium", title: "Drawing-Power / Stock-Statement Compliance", sub: "Security",
      body: "Test utilisation against drawing power from periodic stock/debtor statements; verify quarterly returns to banks agree with books (MCA disclosure)." },
    { n: 3, tone: "amber", priority: "Medium", title: "Interest Accrual", sub: "Ind AS 109",
      body: "Re-perform interest accrual at the facility rate; verify interest accrued but not due at year-end." },
    { n: 4, tone: "accent", priority: "Standard", title: "Security & Default Disclosure", sub: "Schedule III",
      body: "Verify security/charge and any default disclosures; confirm classification as current." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Tax Payable — Income Tax Act · GST
// ════════════════════════════════════════════════════════════════════════════
const TAX_PAYABLE: TemplateContent = {
  headChip: "🧮 Tax Payable — Liability",
  connected: {
    caption: "Current tax · GST payable · TDS/TCS · advance tax & TDS set-off · statutory timelines",
    groups: [
      { label: "Tax & Statutory Payables (Current Liabilities)", startAt: 0, tone: "ppe" },
      { label: "Advance Tax / TDS Receivable (Set-off)", startAt: 4, tone: "amber" },
      { label: "P&L Impact — Current Tax", startAt: 6, tone: "red" },
      { label: "Bank / Settlement", startAt: 7, tone: "green" },
    ],
    accts: [
      { icon: "🧮", name: "Provision for Income Tax", type: "Liability", cls: "B/S — Current Liabilities (Provisions)" },
      { icon: "🧾", name: "GST Payable (net)", type: "Liability", cls: "B/S — Current Liabilities (Statutory)" },
      { icon: "🧾", name: "TDS / TCS Payable", type: "Liability", cls: "B/S — Current Liabilities (Statutory)" },
      { icon: "🧾", name: "Professional Tax / PF / ESI Payable", type: "Liability", cls: "B/S — Current Liabilities (Statutory)" },
      { icon: "💰", name: "Advance Tax Paid", type: "Asset", cls: "B/S — Current Assets (Tax)" },
      { icon: "💰", name: "TDS / TCS Receivable", type: "Asset", cls: "B/S — Current Assets (Tax)" },
      { icon: "📊", name: "Current Tax Expense A/c", type: "Expense", cls: "P&L — Income Tax Expense" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Current Tax & Statutory Dues — IT Act · GST",
    body: "Current tax liabilities comprise the income-tax provision (net of advance tax and TDS credits), GST payable (output less eligible input), and TDS/TCS and other statutory dues (PF, ESI, PT). Statutory deposit timelines apply, and Sec 43B allows certain dues only on a payment basis. Net current-tax payable/receivable and statutory balances are presented under current items.",
    chips: ["IT Act", "GST", "TDS / TCS", "Sec 43B"],
  },
  lifecycle: () => build([
    { key: "provision", label: "Provision & Set-off", icon: "🧮", entries: [
      { ref: "Entry 1", title: "Current Tax Provision", tone: "ppe", lines: [["Current Tax Expense A/c (P&L)", "Dr"], ["Provision for Tax A/c", "Cr"]], note: "Provide tax on taxable profit per the IT computation (after disallowances, exemptions and set-offs)." },
      { ref: "Entry 2", title: "Advance Tax / TDS Set-off", tone: "ppe", lines: [["Provision for Tax A/c", "Dr"], ["Advance Tax + TDS Receivable A/c", "Cr"]], note: "Set off advance tax and TDS credits against the provision; net payable/refundable presented." },
    ] },
    { key: "indirect", label: "GST & Withholding", icon: "🧾", entries: [
      { ref: "Entry 3", title: "GST Payable (net)", tone: "amber", lines: [["Output GST A/c", "Dr"], ["Input GST A/c", "Cr"], ["GST Payable A/c", "Cr"]], note: "Net GST = output less eligible input credit; ineligible/unreflected (GSTR-2B) credit is restricted." },
      { ref: "Entry 4", title: "TDS / TCS Deducted", tone: "purple", lines: [["Expense / Party A/c", "Dr"], ["TDS / TCS Payable A/c", "Cr"]], note: "Withhold tax at source; deposit within statutory timelines (Sec 43B / disallowance on delay)." },
    ] },
    { key: "settlement", label: "Settlement", icon: "🔁", entries: [
      { ref: "Entry 5", title: "Statutory Dues Paid", tone: "green", lines: [["Tax / Statutory Payable A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Deposit dues by due dates; late deposit triggers interest, penalty and IT-Act disallowance." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "red", name: "Completeness — All Statutory Dues", desc: "All taxes and statutory dues accrued", chips: [{ text: "Statutory Register", tone: "red" }],
      note: "Confirm income tax, GST, TDS/TCS, PF/ESI/PT and cess are all accrued; search for unrecorded statutory liabilities and demands/notices." },
    { badge: "A", tone: "ppe", name: "Accuracy — Computation", desc: "Provisions agree to the underlying computations", chips: [{ text: "IT / GST Returns", tone: "ppe" }],
      note: "Agree the current-tax provision to the IT computation/Form 3CD and the GST payable to GSTR-3B; re-perform key calculations." },
    { badge: "V", tone: "amber", name: "Valuation — Net Provision & Set-off", desc: "Advance tax / TDS set off; net balance correct", chips: [{ text: "Set-off", tone: "amber" }],
      note: "Verify advance tax and TDS credits (Form 26AS) are set off; assess any disputed demands for provisioning / contingent disclosure." },
    { badge: "O", tone: "purple", name: "Cut-off — Sec 43B", desc: "March statutory dues recognised; 43B basis", chips: [{ text: "Sec 43B", tone: "std" }],
      note: "Confirm March statutory dues are accrued even if deposited in April; identify Sec 43B items allowed only on payment for the tax computation." },
    { badge: "D", tone: "accent", name: "Disclosure — Schedule III & Contingencies", desc: "Statutory dues, demands and contingencies disclosed", chips: [{ text: "Schedule III", tone: "blue" }],
      note: "Verify Schedule III statutory-dues disclosure, MSME/other timelines, and disclosure of disputed tax demands as contingent liabilities." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Current-Tax Provision vs Computation", sub: "IT Act · Form 3CD",
      body: "Re-perform the provision from book profit through disallowances and set-offs; agree to the return; verify the elected regime/rate." },
    { n: 2, tone: "red", priority: "High", title: "GST Reconciliation (GSTR-3B vs Books)", sub: "GST",
      body: "Reconcile GST payable per books to GSTR-3B / GSTR-1; assess input-credit eligibility (GSTR-2B) and 180-day reversal." },
    { n: 3, tone: "amber", priority: "Medium", title: "TDS / TCS Compliance & Timely Deposit", sub: "Sec 43B · Disallowance",
      body: "Verify TDS/TCS deduction, deposit timelines and return filing; quantify late deposits (interest/penalty, IT-Act disallowance); reconcile to 26AS." },
    { n: 4, tone: "accent", priority: "Standard", title: "Sec 43B Cut-off & Demands", sub: "Cut-off · Contingencies",
      body: "Confirm March statutory dues accrued; review disputed demands/notices for provisioning vs contingent-liability disclosure." },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// Accrued Expenses — Ind AS 1 · 19
// ════════════════════════════════════════════════════════════════════════════
const ACCRUED: TemplateContent = {
  headChip: "📑 Accrued Expenses — Liability",
  connected: {
    caption: "Expenses incurred but not billed · salaries · audit fees · utilities · interest · completeness focus",
    groups: [
      { label: "Accrued Liabilities (Current Liabilities)", startAt: 0, tone: "ppe" },
      { label: "P&L Impact — Underlying Expenses", startAt: 5, tone: "red" },
      { label: "Bank / Settlement", startAt: 8, tone: "green" },
    ],
    accts: [
      { icon: "👥", name: "Salaries & Wages Payable", type: "Liability", cls: "B/S — Current Liabilities (Accruals)" },
      { icon: "🎯", name: "Bonus & Incentive Payable", type: "Liability", cls: "B/S — Current Liabilities (Accruals)" },
      { icon: "📑", name: "Audit & Professional Fees Payable", type: "Liability", cls: "B/S — Current Liabilities (Accruals)" },
      { icon: "💡", name: "Utilities Payable (Power / Telecom)", type: "Liability", cls: "B/S — Current Liabilities (Accruals)" },
      { icon: "📈", name: "Interest Accrued but Not Due", type: "Liability", cls: "B/S — Current Liabilities (Accruals)" },
      { icon: "📉", name: "Salary / Wages Expense A/c", type: "Expense", cls: "P&L — Employee Benefits" },
      { icon: "📉", name: "Professional Fees A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "📉", name: "Utilities Expense A/c", type: "Expense", cls: "P&L — Other Expenses" },
      { icon: "🏦", name: "Bank A/c", type: "Asset", cls: "B/S — Current Assets — Cash & Bank" },
    ],
  },
  framework: {
    title: "Accrued Expenses — Accrual & Matching (Ind AS 1 · 19)",
    body: "Accrued liabilities recognise expenses incurred for goods/services received before the reporting date but not yet billed — salaries & benefits, audit & professional fees, utilities, commission and interest. The dominant risk is completeness (understated accruals to inflate profit). Estimates must be reasonable; Sec 43B items (statutory dues, interest to banks/MSME) are deductible only on payment.",
    chips: ["Ind AS 1", "Ind AS 19", "Completeness", "Sec 43B"],
  },
  lifecycle: () => build([
    { key: "accrual", label: "Accrual", icon: "📑", entries: [
      { ref: "Entry 1", title: "Salary / Wages Accrual", tone: "ppe", lines: [["Salary / Wages Expense A/c (P&L)", "Dr"], ["Salaries Payable A/c", "Cr"]], note: "Accrue the period's payroll, employer PF/ESI and bonus even if paid after year-end." },
      { ref: "Entry 2", title: "Audit / Professional Fees Accrual", tone: "amber", lines: [["Professional Fees A/c (P&L)", "Dr"], ["Accrued Expenses A/c", "Cr"]], note: "Accrue services received (audit, legal, consultancy) before year-end though invoiced later." },
      { ref: "Entry 3", title: "Utilities / Interest Accrual", tone: "amber", lines: [["Utilities / Interest Expense A/c (P&L)", "Dr"], ["Accrued Expenses A/c", "Cr"]], note: "Accrue power, telecom and interest for the period up to the reporting date." },
    ] },
    { key: "settlement", label: "Settlement", icon: "🔁", entries: [
      { ref: "Entry 4", title: "Payment of Accrued Expense", tone: "green", lines: [["Accrued Expenses A/c", "Dr"], ["Bank A/c", "Cr"]], note: "Settlement after year-end; subsequent payments are the key evidence for completeness of accruals." },
    ] },
  ]),
  assertions: [
    { badge: "C", tone: "red", name: "Completeness — Unrecorded Accruals", desc: "All incurred-but-unbilled expenses are accrued", chips: [{ text: "Subsequent Payments", tone: "red" }],
      note: "Primary risk. Review post-year-end payments and invoices; trace to the period of service; confirm recurring costs (rent, utilities, audit fee, interest) are all accrued." },
    { badge: "A", tone: "ppe", name: "Accuracy — Estimate Reasonableness", desc: "Accrual amounts reasonably estimated", chips: [{ text: "Recompute", tone: "ppe" }],
      note: "Recompute accruals from contracts/run-rates (salary, rent, interest); compare estimates to subsequent actual invoices." },
    { badge: "O", tone: "purple", name: "Cut-off", desc: "Expenses recognised in the correct period", chips: [{ text: "Matching", tone: "amber" }],
      note: "Test services received around year-end against accrual dates; ensure goods/services received-not-invoiced are accrued." },
    { badge: "E", tone: "green", name: "Existence & Obligation", desc: "Accruals represent genuine obligations", chips: [{ text: "Supporting", tone: "std" }],
      note: "Verify accruals are supported by contracts/run-rates and not used as a cookie-jar reserve; investigate round-sum or unsupported accruals." },
    { badge: "D", tone: "accent", name: "Disclosure & Sec 43B", desc: "Classification and 43B items appropriate", chips: [{ text: "Sec 43B", tone: "blue" }],
      note: "Verify presentation under other current liabilities; identify Sec 43B items (statutory dues, MSME/bank interest) deductible only on payment for the tax computation." },
  ],
  checks: [
    { n: 1, tone: "red", priority: "High", title: "Search for Unrecorded Accruals", sub: "Completeness · Subsequent Payments",
      body: "Examine post-year-end payments and invoices; trace to the service period; confirm all recurring expenses (rent, utilities, audit, interest, commission) are accrued." },
    { n: 2, tone: "amber", priority: "Medium", title: "Estimate Reasonableness", sub: "Accuracy",
      body: "Recompute accruals from contracts/run-rates; compare to subsequent actual invoices; investigate large swings vs prior period." },
    { n: 3, tone: "amber", priority: "Medium", title: "Cut-off Testing", sub: "Matching",
      body: "Test services/goods received around year-end against the accrual; confirm received-not-invoiced items are captured." },
    { n: 4, tone: "accent", priority: "Standard", title: "Sec 43B & Statutory Accruals", sub: "Tax Linkage",
      body: "Identify Sec 43B items within accruals (statutory dues, bank/MSME interest) for payment-basis deduction; confirm classification." },
  ],
};

// ── registry ────────────────────────────────────────────────────────────────
export const TEMPLATE_CONTENT: Record<string, TemplateContent> = {
  // Balance Sheet
  "bs-ppe": PPE,
  "bs-rou": ROU,
  "bs-intangibles": INTANGIBLES,
  "bs-investments": INVESTMENTS,
  "bs-ar": AR,
  "bs-inventory": INVENTORY,
  "bs-cash": CASH,
  "bs-prepaid": PREPAID,
  "bs-borrowings": BORROWINGS,
  "bs-ap": AP,
  "bs-loans": LOANS,
  "bs-lease-liab": LEASE_LIAB,
  "bs-rp-loans": RP_LOANS,
  "bs-dtl": DTL,
  "bs-st-borrow": ST_BORROW,
  "bs-tax-payable": TAX_PAYABLE,
  "bs-accrued": ACCRUED,
};

export function hasRichContent(id: string): boolean {
  return id in TEMPLATE_CONTENT;
}
export function lifecycleSeedFor(id: string): LifecycleStage[] {
  return TEMPLATE_CONTENT[id]?.lifecycle() ?? [];
}
