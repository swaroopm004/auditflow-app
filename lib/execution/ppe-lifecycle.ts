/**
 * Canonical PPE lifecycle JE seed (ported from auditflow-suite.html · frame-ppe).
 *
 * Returns store-shaped LifecycleStage[] with fresh ids. Used to seed a new PPE
 * template record; thereafter the auditor's edits/additions are persisted on the
 * template and this seed is no longer consulted.
 */

import type { LifecycleEntry, LifecycleLine, LifecycleStage, LifecycleTone } from "@/lib/types";
import { uid } from "@/lib/utils";

type SeedLine = [label: string, side: "Dr" | "Cr", emph?: string];
type SeedEntry = { ref: string; title: string; tone: LifecycleTone; lines: SeedLine[]; note: string };
type SeedStage = { key: string; label: string; icon: string; entries: SeedEntry[] };

const SEED: SeedStage[] = [
  {
    key: "purchase", label: "Purchase", icon: "💰",
    entries: [
      { ref: "Entry 1A", title: "Cash Purchase of Asset", tone: "ppe",
        lines: [["PPE — [Asset Class] A/c", "Dr"], ["Bank A/c", "Cr"]],
        note: "Capitalise ALL directly attributable costs: purchase price (net of trade discounts), import duties, non-refundable taxes, site preparation, installation, professional fees. NOT capitalised: admin overheads, training costs, start-up losses. GST: If ITC availed, net of ITC. If not availed, add to asset cost." },
      { ref: "Entry 1B", title: "Credit Purchase (Payable)", tone: "ppe",
        lines: [["PPE — [Asset Class] A/c", "Dr"], ["Creditors A/c / Vendor A/c", "Cr"]],
        note: "For deferred payment (beyond normal credit terms): recognise at cash price equivalent; difference between total payments and cash price = interest expense over the period (Ind AS 16 para 23). Not to be capitalised unless borrowing costs policy applies (Ind AS 23)." },
      { ref: "Entry 1C", title: "Borrowing Costs Capitalised (Ind AS 23)", tone: "amber",
        lines: [["PPE / CWIP A/c (Borrowing Cost)", "Dr"], ["Interest Expense A/c", "Cr"]],
        note: "Borrowing costs on qualifying assets (assets that take >12 months to get ready) capitalised during the construction period. Specific borrowing: actual rate. General borrowing: weighted average rate. Capitalisation ceases when the asset is ready for its intended use." },
      { ref: "Entry 1D", title: "Decommissioning Obligation (Ind AS 37)", tone: "purple",
        lines: [["PPE A/c (Dismantling Cost)", "Dr"], ["Provision for Decommissioning A/c", "Cr"]],
        note: "Present value of estimated future dismantling, restoration or site-clearing costs added to asset cost (Ind AS 16 para 16c). Discount rate = risk-free rate. Unwinding of discount = finance cost each year. Changes in estimate: adjust asset carrying amount." },
    ],
  },
  {
    key: "cwip", label: "CWIP", icon: "🏗",
    entries: [
      { ref: "CWIP Entry 1", title: "Costs Accumulated in CWIP", tone: "amber",
        lines: [["Capital Work-in-Progress A/c", "Dr"], ["Contractor / Supplier A/c (or Bank)", "Cr"]],
        note: "All construction-period costs flow to CWIP: civil works, plant erection, freight, insurance during transit, testing costs. CWIP = interim stage before asset is put to use. No depreciation on CWIP. Schedule III disclosure: CWIP ageing mandatory (MCA 2021)." },
      { ref: "CWIP Entry 2", title: "Trial Run Costs (Capitalised)", tone: "amber",
        lines: [["Capital Work-in-Progress A/c", "Dr"], ["Bank / Creditors A/c", "Cr"]],
        note: "Pre-production trial run costs (up to technical feasibility) may be capitalised if they bring the asset to its intended condition. Trial run output sold: proceeds netted against CWIP (Ind AS 16 Amendment 2022 — Proceeds Before Intended Use)." },
      { ref: "CWIP Entry 3", title: "Trial Run Sale Proceeds (Net off CWIP)", tone: "ppe",
        lines: [["Bank A/c (Proceeds from trial run sale)", "Dr"], ["Capital Work-in-Progress A/c", "Cr"]],
        note: "Ind AS 16 Amendment (effective Apr 2022): Proceeds from selling items produced while bringing asset to working condition (e.g., test production output) netted against CWIP cost. Cost of those items per Ind AS 2. Any excess = other income." },
      { ref: "CWIP Entry 4", title: "Borrowing Costs on CWIP", tone: "ppe",
        lines: [["Capital Work-in-Progress A/c", "Dr"], ["Interest Expense A/c", "Cr"]],
        note: "Ind AS 23: Capitalise borrowing costs on specific/general borrowings during active construction phase. Suspend during extended interruptions (>3 months). Cease when asset is substantially complete and ready for intended use — not when construction physically stops." },
    ],
  },
  {
    key: "capitalise", label: "Capitalise", icon: "✅",
    entries: [
      { ref: "Capitalise Entry 1", title: "CWIP → PPE (Asset Commissioned)", tone: "ppe",
        lines: [["PPE — [Asset Class] A/c", "Dr"], ["Capital Work-in-Progress A/c", "Cr"]],
        note: "Transfer from CWIP to PPE when the asset is ready for intended use. Depreciation starts from this date — NOT the date of purchase or commissioning of production. Commissioning certificate / management's intent evidence required." },
      { ref: "Capitalise Entry 2", title: "Subsequent Expenditure (Improvement vs Repair)", tone: "ppe",
        lines: [["PPE A/c", "Dr", "(if increases future economic benefits)"], ["Bank / Creditors A/c", "Cr"]],
        note: "Capitalise if: (a) extends useful life, (b) upgrades capacity, (c) enables a new use. Expense if merely maintains existing condition (repairs & maintenance). Major inspections (component accounting): derecognise old inspection component, capitalise new one (Ind AS 16 para 14)." },
    ],
  },
  {
    key: "depreciation", label: "Depreciation", icon: "📉",
    entries: [
      { ref: "Depreciation Entry 1", title: "Annual Depreciation Charge (SLM / WDV)", tone: "ppe",
        lines: [["Depreciation Expense A/c (P&L)", "Dr"], ["Accumulated Depreciation A/c", "Cr"]],
        note: "SLM: (Cost − Residual Value) ÷ Useful Life. WDV: Rate applied to Written-Down Value each year. Depreciation begins when asset is available for use; ends when derecognised. Residual value = estimated realisable amount at end of life (net of disposal costs). Review annually (Ind AS 16 para 51)." },
      { ref: "Depreciation Entry 2", title: "Deferred Tax on Temporary Difference", tone: "amber",
        lines: [["Deferred Tax Expense A/c (P&L)", "Dr"], ["Deferred Tax Liability A/c (B/S)", "Cr"]],
        note: "Timing difference: Book WDV (Ind AS 16 rate) ≠ Tax WDV (IT Act block rate). When Tax depreciation > Book depreciation: Tax WDV < Book WDV → Taxable temporary difference → DTL. Reverse when book depn > tax depn in later years. Rate = applicable tax rate (25.168% for domestic companies with Sec 115BAA)." },
      { ref: "Depreciation Entry 3", title: "DTA when Book Depn > Tax Depn", tone: "accent",
        lines: [["Deferred Tax Asset A/c (B/S)", "Dr"], ["Deferred Tax Benefit A/c (P&L)", "Cr"]],
        note: "When Book depreciation > Tax depreciation (e.g., remaining years of SLM after WDV fully written off): Deductible temporary difference → DTA. Recognise only if probable that sufficient taxable profits will be available to utilise the deferred tax asset (Ind AS 12 para 24)." },
      { ref: "Depreciation Entry 4", title: "Component Accounting (Ind AS 16 para 43)", tone: "purple",
        lines: [["Depreciation Expense A/c — Component A", "Dr"], ["Depreciation Expense A/c — Component B", "Dr"], ["Accumulated Depreciation A/c", "Cr"]],
        note: "If parts of an asset have significantly different useful lives, each component depreciated separately. Example: Aircraft — airframe (20 yrs), engines (10 yrs), interior (5 yrs). Ship: hull (25 yrs), machinery (15 yrs). Mandatory under Ind AS 16 para 43 when material." },
    ],
  },
  {
    key: "impairment", label: "Impairment", icon: "⚠",
    entries: [
      { ref: "Impairment Entry 1", title: "Impairment Loss Recognition (Ind AS 36)", tone: "red",
        lines: [["Impairment Loss A/c (P&L)", "Dr"], ["Accumulated Impairment Loss A/c", "Cr"]],
        note: "Impairment = Carrying Amount > Recoverable Amount (higher of VIU and FVLCD). Indicators: obsolescence, physical damage, adverse market changes, internal reports of underperformance. Annual test mandatory for goodwill & indefinite intangibles. For PPE: test only when indicators exist." },
      { ref: "Impairment Entry 2", title: "Reversal of Impairment Loss", tone: "ppe",
        lines: [["Accumulated Impairment Loss A/c", "Dr"], ["Impairment Reversal Income A/c (P&L)", "Cr"]],
        note: "Reversal is permitted if indicators of improvement exist. Carrying amount after reversal cannot exceed what the carrying amount would have been had no impairment been recognised (i.e., had normal depreciation continued). Goodwill impairment: never reversed." },
    ],
  },
  {
    key: "disposal", label: "Disposal", icon: "🚮",
    entries: [
      { ref: "Disposal Entry 1", title: "Remove Asset & Accumulated Depreciation", tone: "ppe",
        lines: [["Accumulated Depreciation A/c", "Dr"], ["Bank / Receivable A/c (Sale proceeds)", "Dr"], ["PPE A/c (Gross block)", "Cr"], ["Profit on Sale of Asset A/c", "Cr"]],
        note: "Gain/(Loss) = Sale proceeds − Net book value. If loss: Dr Loss on Sale A/c instead. Depreciation up to the date of disposal must be provided before derecognition. If sale at loss: may indicate impairment of similar assets in the class." },
      { ref: "Disposal Entry 2", title: "Capital Gains Tax Effect (IT Act)", tone: "amber",
        lines: [["Income Tax Expense A/c", "Dr"], ["Current Tax Payable A/c", "Cr"]],
        note: "For IT Act: disposal reduces the WDV of the block. If block WDV goes negative (proceeds > WDV of block): Short-Term Capital Gain taxable. If last asset in block: gain/loss computed. Deferred tax adjustment: DTL reduces on disposal of the individual asset." },
    ],
  },
  {
    key: "revaluation", label: "Revaluation", icon: "📊",
    entries: [
      { ref: "Revaluation Entry 1", title: "Upward Revaluation (OCI)", tone: "ppe",
        lines: [["PPE A/c (Gross Block — Revalued amount)", "Dr"], ["Accumulated Depreciation A/c (Eliminated)", "Cr"], ["Revaluation Surplus (OCI → Equity)", "Cr"]],
        note: "Under revaluation model: restate gross block to fair value. Eliminate existing accumulated depreciation against gross block; net increase = OCI (Revaluation Surplus). Deferred tax must be recognised on revaluation surplus (taxable temporary difference). Revalue entire class; cannot cherry-pick assets." },
      { ref: "Revaluation Entry 2", title: "Downward Revaluation", tone: "red",
        lines: [["Revaluation Surplus A/c (OCI)", "Dr", "if existing surplus"], ["Impairment Loss A/c (P&L)", "Dr", "excess over surplus"], ["PPE A/c (Written down)", "Cr"]],
        note: "Decrease first absorbed by existing Revaluation Surplus in OCI; only excess charged to P&L as impairment. Revaluation surplus in equity NOT recycled to P&L (stays in retained earnings on disposal). Frequency: regular enough so that carrying amount does not differ materially from fair value." },
    ],
  },
];

export function ppeLifecycleSeed(): LifecycleStage[] {
  return SEED.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    entries: s.entries.map((e): LifecycleEntry => ({
      id: uid("le"),
      entryRef: e.ref,
      title: e.title,
      tone: e.tone,
      note: e.note,
      lines: e.lines.map(([label, side, emph]): LifecycleLine => ({ id: uid("ll"), label, side, emph })),
    })),
  }));
}
