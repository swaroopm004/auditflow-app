/**
 * Fraud & Error Postmortem catalogue (SA 240). Each indicator carries the fraud
 * mechanism, a real-world case where apt, the tell-tale journal-entry signature,
 * detection ratios (live inputs), and audit procedures. Verdicts/remarks/ratio
 * values persist on ClientRecord.postmortem.
 */

export type IndTone = "red" | "amber" | "accent" | "green" | "purple";
export interface JeLine { label: string; side: "Dr" | "Cr" }
export interface Ratio { id: string; label: string; numLabel: string; denLabel: string; benchmark: string }
export interface CaseStudy { tag: string; title: string; body: string; chips: string[] }
export interface Indicator {
  id: string; code: string; icon: string; tone: IndTone;
  title: string; subtitle: string;
  impacts: string[]; sources: string[];
  caseStudy?: CaseStudy;
  je: { lines: JeLine[]; redFlag: string };
  ratios: Ratio[];
  procedures: string[];
}

export const INDICATORS: Indicator[] = [
  {
    id: "i1", code: "I1", icon: "🏭", tone: "red",
    title: "Expense Capitalisation to Assets",
    subtitle: "Revenue/operating expenses booked as capex to defer recognition and inflate profit.",
    impacts: ["Revenue Inflation", "Asset Manipulation"], sources: ["PPE GL", "P&L Opex"],
    caseStudy: { tag: "🌐 Real Case — WorldCom (2002)", title: "Largest Accounting Fraud in US History", body: "WorldCom capitalised ~$3.8B of ordinary 'line costs' (network lease expenses) as capital assets, deferring the expense and inflating EBITDA by ~50%.", chips: ["$3.8B expense hidden", "EBITDA +50%", "Bankruptcy Jul 2002", "Caught: Capex/Revenue anomaly"] },
    je: { lines: [{ label: "Asset / PPE A/c", side: "Dr" }, { label: "To Operating Expense A/c", side: "Cr" }], redFlag: "Operating-expense account credited — not a normal source of asset creation." },
    ratios: [
      { id: "i1r1", label: "Capitalised Expenses ÷ Asset WDV (closing)", numLabel: "Capitalised Exp (₹L)", denLabel: "Asset WDV (₹L)", benchmark: "<5% acceptable · >15% = high risk" },
      { id: "i1r2", label: "Total Capex ÷ Revenue from Operations", numLabel: "Capex (₹L)", denLabel: "Revenue (₹L)", benchmark: "Industry ~8–15% · WorldCom was 50%+" },
    ],
    procedures: ["Vouch capex additions >₹5L to invoices; test nature (capital vs revenue) against Ind AS 16 para 7.", "Scan R&M / opex ledgers for capital items wrongly expensed and vice-versa.", "SA 240 para 32 — test journal entries crediting expense accounts to assets."],
  },
  {
    id: "i2", code: "I2", icon: "💸", tone: "amber",
    title: "Interest Capitalisation to Non-Qualifying Assets",
    subtitle: "Ordinary assets dressed as 'qualifying' to capitalise interest, cutting finance cost and inflating profit.",
    impacts: ["Profit Inflation", "Finance-cost Deferral"], sources: ["CWIP GL", "Finance Cost"],
    je: { lines: [{ label: "Capital Work-in-Progress A/c", side: "Dr" }, { label: "To Interest / Finance Cost A/c", side: "Cr" }], redFlag: "Interest capitalised on assets that don't take a substantial period to be ready (Ind AS 23 fail)." },
    ratios: [
      { id: "i2r1", label: "Qualifying Assets ÷ Total Assets", numLabel: "Qualifying Assets (₹L)", denLabel: "Total Assets (₹L)", benchmark: "Manufacturing >30% warrants scrutiny · services ≈ 0%" },
      { id: "i2r2", label: "Capitalised Interest ÷ Total Interest", numLabel: "Capitalised Interest (₹L)", denLabel: "Total Interest (₹L)", benchmark: "Sudden spike vs prior year is a red flag · >40% unusual" },
    ],
    procedures: ["Test the qualifying-asset definition for each capitalised project (>12-month build).", "Verify capitalisation period bounds (commence/cease/suspend) under Ind AS 23.", "Recompute capitalisation rate (specific vs weighted-average general borrowings)."],
  },
  {
    id: "i3", code: "I3", icon: "👻", tone: "amber",
    title: "Fake Debtors & Subsequent Bad-Debt Write-off",
    subtitle: "Revenue inflated via fictitious debtors, reversed as bad debt next period.",
    impacts: ["Revenue Inflation", "Fictitious Assets"], sources: ["Receivables GL", "Revenue"],
    caseStudy: { tag: "🇮🇳 Real Case — Satyam (2009)", title: "India's Biggest Corporate Fraud", body: "Satyam booked fictitious revenue and debtors and forged bank balances (₹5,040 Cr fake cash). Detected via direct bank confirmation.", chips: ["Fake cash ₹5,040 Cr", "Fake revenue ₹4,000 Cr+", "Caught: SA 505 confirmation"] },
    je: { lines: [{ label: "Stage 1: Trade Receivables A/c", side: "Dr" }, { label: "To Revenue A/c (fake)", side: "Cr" }, { label: "Stage 2: Bad Debts A/c", side: "Dr" }, { label: "To Trade Receivables A/c (write-off)", side: "Cr" }], redFlag: "Spike in bad debts in the year following a revenue jump." },
    ratios: [
      { id: "i3r1", label: "New unrecovered debtors ÷ Total closing debtors", numLabel: "New unrecovered (₹L)", denLabel: "Total debtors (₹L)", benchmark: ">20% requires ageing & confirmation analysis" },
      { id: "i3r2", label: "Bad Debts Written Off ÷ Revenue", numLabel: "Bad debts (₹L)", denLabel: "Revenue (₹L)", benchmark: "Spike after a revenue jump = 🔴 red flag" },
    ],
    procedures: ["Direct debtor confirmations (SA 505) — the procedure that caught Satyam.", "Verify customer PAN/GST/address; investigate same-address or shell debtors.", "Analyse bad-debt write-offs post year-end against prior-year revenue surge."],
  },
  {
    id: "i4", code: "I4", icon: "🧾", tone: "red",
    title: "Inflated Invoicing with Post-Period Credit Memos",
    subtitle: "Invoices raised at inflated prices before year-end; reversed via credit notes after the reporting date.",
    impacts: ["Revenue Inflation", "Cut-off"], sources: ["Revenue", "Receivables GL"],
    je: { lines: [{ label: "Before YE: Trade Receivables A/c", side: "Dr" }, { label: "To Revenue A/c (inflated)", side: "Cr" }, { label: "After YE: Revenue / Sales Returns A/c", side: "Dr" }, { label: "To Trade Receivables A/c", side: "Cr" }], redFlag: "Cluster of credit notes in the first weeks after year-end reversing pre-year-end sales." },
    ratios: [
      { id: "i4r1", label: "Price-dispute credit memos ÷ Total credit memos", numLabel: "Price-dispute CMs", denLabel: "Total CMs", benchmark: ">30% = systematic invoicing-fraud signal" },
      { id: "i4r2", label: "Credit memos within 45 days post-YE ÷ Revenue", numLabel: "Post-YE CMs (₹L)", denLabel: "Revenue (₹L)", benchmark: ">2% is material — perform cut-off testing" },
    ],
    procedures: ["Cut-off testing (SA 560) around year-end against dispatch/POD dates.", "Review post-year-end credit notes & returns for reversal of current-year revenue.", "Outlier analysis on invoice pricing vs approved price lists."],
  },
  {
    id: "i5", code: "I5", icon: "📊", tone: "amber",
    title: "Percentage-of-Completion (PCM) Manipulation",
    subtitle: "Project/construction firms understate cost-to-complete or overstate costs incurred to front-load revenue.",
    impacts: ["Revenue Inflation", "Estimate Bias"], sources: ["Revenue", "WIP", "Cash Flow"],
    caseStudy: { tag: "🌐 Real Case — Toshiba (2015)", title: "Long-term Contract Profit Inflation", body: "Toshiba overstated operating profit by ~¥152B over years, largely via aggressive percentage-of-completion estimates on infrastructure contracts.", chips: ["~¥152B overstated", "PCM estimate abuse", "CEO resignation"] },
    je: { lines: [{ label: "Contract Asset / Unbilled Revenue A/c", side: "Dr" }, { label: "To Contract Revenue A/c", side: "Cr" }], redFlag: "Revenue grows but operating cash flow stagnates — recognition without cash." },
    ratios: [
      { id: "i5r1", label: "Cash Expenses Paid ÷ Total Expenses Recognised", numLabel: "Cash expenses (₹L)", denLabel: "Total exp recognised (₹L)", benchmark: "<40% = costs not yet incurred; PCM may be inflated" },
      { id: "i5r2", label: "Revenue ÷ Net Cash from Operating Activities", numLabel: "Revenue (₹L)", denLabel: "Operating CF (₹L)", benchmark: "Revenue >> cash = recognition without receipt (Enron-style)" },
    ],
    procedures: ["Independently challenge cost-to-complete estimates and stage-of-completion.", "Physically verify stage of completion for major contracts.", "Trend Revenue ÷ Operating CF across periods."],
  },
  {
    id: "i6", code: "I6", icon: "📦", tone: "red",
    title: "Fake Purchases & Inventory Scrap",
    subtitle: "Fictitious purchases inflate inventory/COGS and siphon cash; later written off as scrap/shortage.",
    impacts: ["Cash Siphoning", "Inventory Manipulation"], sources: ["Inventory GL", "Payables"],
    je: { lines: [{ label: "Purchases / Inventory A/c", side: "Dr" }, { label: "To Trade Payables A/c (shell vendor)", side: "Cr" }, { label: "Later: Scrap / Inventory Loss A/c", side: "Dr" }, { label: "To Inventory A/c", side: "Cr" }], redFlag: "High scrap/shrinkage write-offs concentrated near year-end." },
    ratios: [
      { id: "i6r1", label: "Scrap / Shortage write-off ÷ Total Inventory", numLabel: "Scrap write-off (₹L)", denLabel: "Total inventory (₹L)", benchmark: ">3% abnormal — investigate shrinkage" },
      { id: "i6r2", label: "Purchases from new/unverified vendors ÷ Total Purchases", numLabel: "New-vendor purchases (₹L)", denLabel: "Total purchases (₹L)", benchmark: "Sudden concentration in new vendors = 🔴 flag" },
    ],
    procedures: ["Vendor due diligence — GST/PAN, physical existence, bank account ownership.", "Three-way match (PO–GRN–invoice) for sampled high-value purchases.", "Attend physical count (SA 501); investigate count differences & scrap."],
  },
  {
    id: "i7", code: "I7", icon: "🌐", tone: "amber",
    title: "Fictitious / Unrealised FX Gains",
    subtitle: "Profit inflated via overstated or unrealised foreign-exchange gains.",
    impacts: ["Profit Inflation", "OCI vs P&L"], sources: ["Cash & Bank", "P&L Other Income"],
    je: { lines: [{ label: "Forex Receivable / Bank A/c", side: "Dr" }, { label: "To FX Gain A/c (P&L)", side: "Cr" }], redFlag: "Large unrealised FX gains in P&L without corresponding cash settlement or exposure." },
    ratios: [
      { id: "i7r1", label: "Unrealised FX Gain ÷ Total FX Gain", numLabel: "Unrealised FX gain (₹L)", denLabel: "Total FX gain (₹L)", benchmark: "High unrealised share = estimate/closing-rate risk" },
      { id: "i7r2", label: "FX Gain ÷ Total Forex Exposure", numLabel: "FX gain (₹L)", denLabel: "Forex exposure (₹L)", benchmark: "Disproportionate gain vs exposure = 🔴 flag" },
    ],
    procedures: ["Recompute FX retranslation at closing rates (Ind AS 21).", "Verify hedge accounting & that monetary/non-monetary split is correct.", "Confirm realised vs unrealised classification."],
  },
  {
    id: "i8", code: "I8", icon: "🏗", tone: "red",
    title: "Fictitious Tangible Assets",
    subtitle: "Non-existent assets recorded to inflate the balance sheet and absorb siphoned cash.",
    impacts: ["Fictitious Assets", "Cash Siphoning"], sources: ["PPE GL"],
    je: { lines: [{ label: "PPE A/c", side: "Dr" }, { label: "To Bank / Payable A/c (no real asset)", side: "Cr" }], redFlag: "Additions that cannot be physically located; assets never depreciating or always 'in transit'." },
    ratios: [
      { id: "i8r1", label: "Additions not physically verified ÷ Total Additions", numLabel: "Unverified additions (₹L)", denLabel: "Total additions (₹L)", benchmark: ">10% unverified requires escalation" },
      { id: "i8r2", label: "Assets with zero depreciation ÷ Total depreciable assets", numLabel: "Zero-depn assets (₹L)", denLabel: "Total depreciable (₹L)", benchmark: "Material zero-depn pool = existence risk" },
    ],
    procedures: ["Physical verification (SA 501) of additions; GPS/tag for land & buildings.", "Verify title deeds, RC books, Bill of Entry for imported plant.", "Trace additions to invoices, payments and commissioning evidence."],
  },
  {
    id: "i9", code: "I9", icon: "⏱", tone: "amber",
    title: "Inflated Work-in-Progress / Service Hours",
    subtitle: "Service/IT firms overstate unbilled WIP or billable hours to pull forward revenue.",
    impacts: ["Revenue Inflation", "Unbilled Risk"], sources: ["WIP", "Revenue"],
    je: { lines: [{ label: "Unbilled Revenue / WIP A/c", side: "Dr" }, { label: "To Service Revenue A/c", side: "Cr" }], redFlag: "Ageing unbilled WIP that never converts to invoices." },
    ratios: [
      { id: "i9r1", label: "Unbilled WIP > 90 days ÷ Total WIP", numLabel: "Aged unbilled WIP (₹L)", denLabel: "Total WIP (₹L)", benchmark: ">25% aged unbilled = recoverability risk" },
      { id: "i9r2", label: "Unbilled WIP ÷ Revenue", numLabel: "Unbilled WIP (₹L)", denLabel: "Revenue (₹L)", benchmark: "Rising ratio = revenue recognised ahead of billing" },
    ],
    procedures: ["Test billable-hours/timesheets to contracts and subsequent invoicing.", "Assess recoverability of aged unbilled WIP against contract terms.", "Trace WIP to post-year-end billing & collection."],
  },
  {
    id: "i10", code: "I10", icon: "🤝", tone: "red",
    title: "Related-Party Channel Stuffing",
    subtitle: "Goods pushed to related/controlled entities near year-end to book revenue, returned later.",
    impacts: ["Revenue Inflation", "Related Party"], sources: ["Revenue", "Receivables", "RP Loans"],
    je: { lines: [{ label: "Related-Party Receivable A/c", side: "Dr" }, { label: "To Revenue A/c (year-end push)", side: "Cr" }], redFlag: "Spike in related-party sales in the last month, with no onward sale or cash." },
    ratios: [
      { id: "i10r1", label: "RP sales in last month ÷ Total RP sales", numLabel: "Last-month RP sales (₹L)", denLabel: "Total RP sales (₹L)", benchmark: ">40% concentration at year-end = 🔴 flag" },
      { id: "i10r2", label: "RP Debtors ÷ Total Debtors", numLabel: "RP debtors (₹L)", denLabel: "Total debtors (₹L)", benchmark: "Rising RP debtor share signals stuffing" },
    ],
    procedures: ["Identify related parties (SA 550); confirm balances & terms.", "Test onward sale / sell-through and post-year-end returns from RPs.", "Assess arm's-length pricing and Sec 188 compliance."],
  },
  {
    id: "i11", code: "I11", icon: "🚮", tone: "amber",
    title: "Asset Disposal Gains & Stranded Capex",
    subtitle: "One-off disposal gains dressed as operating profit; stale CWIP that should be impaired.",
    impacts: ["Profit Quality", "Impairment Risk"], sources: ["PPE GL", "CWIP"],
    je: { lines: [{ label: "Bank A/c, Accumulated Depreciation A/c", side: "Dr" }, { label: "To PPE A/c, Gain on Sale (P&L)", side: "Cr" }], redFlag: "Disposal gains propping up PBT; long-aged CWIP with no commissioning." },
    ratios: [
      { id: "i11r1", label: "Disposal Gains ÷ Profit Before Tax", numLabel: "Disposal gains (₹L)", denLabel: "PBT (₹L)", benchmark: ">15% = low-quality earnings reliance" },
      { id: "i11r2", label: "Stranded CWIP >3 yrs ÷ Total CWIP", numLabel: "Stale CWIP (₹L)", denLabel: "Total CWIP (₹L)", benchmark: ">20% = impairment / write-off concern (Sch III)" },
    ],
    procedures: ["Test disposal proceeds vs WDV; verify gains are genuine and not related-party.", "CWIP ageing — assess impairment / abandonment of stale projects.", "Recompute recoverable amount for indicators of impairment (Ind AS 36)."],
  },
  // ── Additional fraud risk factors (beyond the HTML's 11) ──
  {
    id: "i12", code: "I12", icon: "🔁", tone: "red",
    title: "Round-Tripping / Circular Trading",
    subtitle: "Sales and purchases routed in a circle through related/colluding entities to inflate turnover with no real economic substance.",
    impacts: ["Turnover Inflation", "No Economic Substance"], sources: ["Revenue", "Purchases", "Cash & Bank"],
    je: { lines: [{ label: "Debtor A/c", side: "Dr" }, { label: "To Revenue A/c (sale to circle)", side: "Cr" }, { label: "Purchases A/c", side: "Dr" }, { label: "To Creditor A/c (buy-back from circle)", side: "Cr" }], redFlag: "Same counterparties appear as both customers and suppliers; identical buy/sell values, often same-day." },
    ratios: [
      { id: "i12r1", label: "Sales to entities that are also suppliers ÷ Total Sales", numLabel: "Circular sales (₹L)", denLabel: "Total sales (₹L)", benchmark: ">10% circular trade = 🔴 escalate" },
      { id: "i12r2", label: "Same-day buy–sell value ÷ Revenue", numLabel: "Same-day buy-sell (₹L)", denLabel: "Revenue (₹L)", benchmark: "Material same-day mirror trades = round-tripping" },
    ],
    procedures: ["Cross-match the customer and vendor masters for common entities/UBOs.", "Trace cash — circular trades often net to nil cash movement.", "Assess commercial substance & margins; confirm goods actually moved (e-way bills)."],
  },
  {
    id: "i13", code: "I13", icon: "🍪", tone: "amber",
    title: "Cookie-Jar Reserves / Provision Smoothing",
    subtitle: "Over-provide in good years and release provisions in weak years to smooth earnings.",
    impacts: ["Earnings Management", "Estimate Bias"], sources: ["Provisions", "P&L"],
    je: { lines: [{ label: "Good year: Expense A/c", side: "Dr" }, { label: "To Provision A/c (over-provide)", side: "Cr" }, { label: "Weak year: Provision A/c", side: "Dr" }, { label: "To Income / Expense reversal (P&L)", side: "Cr" }], redFlag: "Large unexplained provision build-ups and reversals that track earnings targets." },
    ratios: [
      { id: "i13r1", label: "Net Provision Movement ÷ Profit Before Tax", numLabel: "Net provision movement (₹L)", denLabel: "PBT (₹L)", benchmark: ">20% swing influencing PBT = smoothing risk" },
      { id: "i13r2", label: "Reversal of prior-year provisions ÷ Current PBT", numLabel: "Prior provision reversals (₹L)", denLabel: "Current PBT (₹L)", benchmark: "High reliance on reversals to hit profit = 🔴 flag" },
    ],
    procedures: ["Obtain provision roll-forwards; test the basis and consistency of estimates (Ind AS 37).", "Challenge reversals — are they genuine settlements or earnings management?", "Compare provisioning policy application across good vs weak years."],
  },
  {
    id: "i14", code: "I14", icon: "🛠", tone: "red",
    title: "Management Override — Late & Round-Sum Journals",
    subtitle: "Top-side manual journals posted near period-end to manipulate results (SA 240 mandatory JE testing).",
    impacts: ["Management Override", "Mandatory SA 240"], sources: ["General Ledger", "Manual JEs"],
    je: { lines: [{ label: "(Top-side manual entry)", side: "Dr" }, { label: "To (offset account)", side: "Cr" }], redFlag: "Manual, round-sum, post-cut-off entries by senior management to unusual account combinations." },
    ratios: [
      { id: "i14r1", label: "Manual JEs in last 5 days ÷ Total manual JEs", numLabel: "Late manual JEs", denLabel: "Total manual JEs", benchmark: "Concentration at period-end warrants 100% testing" },
      { id: "i14r2", label: "Round-sum (₹L/Cr) JEs ÷ Total JEs", numLabel: "Round-sum JEs", denLabel: "Total JEs", benchmark: "High round-sum share = estimate/override flag" },
    ],
    procedures: ["SA 240 para 32 — test journal entries: late, manual, round-sum, weekend/holiday, unusual account pairs.", "Interview those who can override controls; corroborate the business rationale.", "Re-perform the recomputation of any top-side consolidation adjustments."],
  },
];
