// Constitution options — mirrors HTML cp-constitution select
export const CONSTITUTION_OPTIONS = [
  { value: "pvt-ltd", label: "Private Limited Company" },
  { value: "pub-ltd", label: "Public Limited Company" },
  { value: "llp", label: "Limited Liability Partnership (LLP)" },
  { value: "partnership", label: "Partnership Firm" },
  { value: "prop", label: "Proprietorship" },
  { value: "trust", label: "Trust" },
  { value: "society", label: "Society" },
  { value: "coop", label: "Cooperative Society" },
  { value: "aop", label: "AOP / BOI" },
  { value: "huf", label: "HUF" },
] as const;

export const INDUSTRY_OPTIONS = [
  "Manufacturing",
  "Trading / Wholesale & Retail",
  "IT / Software / SaaS",
  "BFSI (Banking, Financial Services, Insurance)",
  "NBFC",
  "Real Estate / Construction",
  "Healthcare / Pharma",
  "Education",
  "FMCG",
  "Hospitality / Tourism",
  "Logistics / Transportation",
  "Power / Utilities",
  "Telecom / Media",
  "Agriculture",
  "Mining / Metals",
  "Services (Other)",
] as const;

export const LISTING_OPTIONS = [
  { value: "unlisted", label: "Unlisted" },
  { value: "listed-bse", label: "Listed — BSE" },
  { value: "listed-nse", label: "Listed — NSE" },
  { value: "listed-both", label: "Listed — BSE & NSE" },
  { value: "listed-other", label: "Listed — Other (specify in notes)" },
] as const;

export const TURNOVER_OPTIONS = [
  { value: "lt-1", label: "< 1 Cr" },
  { value: "1-10", label: "1 – 10 Cr" },
  { value: "10-50", label: "10 – 50 Cr" },
  { value: "50-250", label: "50 – 250 Cr (Small Co. threshold)" },
  { value: "250-500", label: "250 – 500 Cr" },
  { value: "500-1000", label: "500 – 1,000 Cr" },
  { value: "gt-1000", label: "> 1,000 Cr" },
] as const;

export const FRAMEWORK_OPTIONS = [
  { value: "indas", label: "Ind AS (Companies Act 2013 §133)" },
  { value: "as", label: "AS (Companies Act 2013)" },
  { value: "other", label: "Other (specify in notes)" },
] as const;

// B1 also has an "Accounting Standards (AS)" label variant
export const B1_FRAMEWORK_OPTIONS = [
  { value: "indas", label: "Ind AS (Companies Act 2013 §133)" },
  { value: "as", label: "Accounting Standards (AS)" },
  { value: "other", label: "Other (specify in notes)" },
] as const;

export const GROUP_OPTIONS = [
  { value: "standalone", label: "Standalone" },
  { value: "holding", label: "Holding Company" },
  { value: "subsidiary", label: "Subsidiary" },
  { value: "associate", label: "Associate" },
  { value: "jv", label: "Joint Venture" },
] as const;

export const RISK_RATING_OPTIONS = [
  { value: "low", label: "🟢 Low" },
  { value: "medium", label: "🟡 Medium" },
  { value: "high", label: "🔴 High" },
] as const;

export const COI_OPTIONS = [
  { value: "none", label: "None identified" },
  { value: "disclosed", label: "Identified — see notes" },
] as const;

export const APPT_TYPE_OPTIONS = [
  { value: "first", label: "First-time appointment" },
  { value: "continuing", label: "Continuing auditor" },
  { value: "incoming", label: "Incoming (replacing predecessor)" },
] as const;

export const NOC_OPTIONS = [
  { value: "na", label: "Not applicable (first-time)" },
  { value: "received", label: "Received" },
  { value: "pending", label: "Pending" },
  { value: "objected", label: "Objection raised — see notes" },
] as const;

export const DECISION_OPTIONS = [
  { value: "accept", label: "✅ Accept" },
  { value: "decline", label: "❌ Decline" },
] as const;

// --- Resources (S1) ------------------------------------------------------
// Role colour scheme mirrors HTML's S1_ROLE_DEFS. We pre-bake Tailwind
// utility names so the colours can be applied via className (Tailwind's
// JIT requires literal strings — these classes MUST exist somewhere in
// source to survive purge).
export interface S1RoleDef {
  key: "partner" | "manager" | "senior" | "associate";
  label: string;
  icon: string;
  desc: string;
  /** Hex colour — used for inline avatar / chip backgrounds. */
  color: string;
  /** Tailwind text-color class. */
  textClass: string;
  /** Tailwind border-color class. */
  borderClass: string;
  /** Tailwind ring-color class (for dashed "Add" buttons). */
  ringClass: string;
}

export const S1_ROLE_DEFS: S1RoleDef[] = [
  {
    key: "partner",
    label: "Partner",
    icon: "P",
    desc: "Engagement Partner — signs the audit report, ultimate responsibility (mandatory in ≥1 team)",
    color: "#D97706",
    textClass: "text-amber-600",
    borderClass: "border-amber-600",
    ringClass: "border-amber-300",
  },
  {
    key: "manager",
    label: "Manager",
    icon: "M",
    desc: "Engagement Manager — reviews, project management, EQR coordination",
    color: "#2563EB",
    textClass: "text-blue-600",
    borderClass: "border-blue-600",
    ringClass: "border-blue-300",
  },
  {
    key: "senior",
    label: "Senior",
    icon: "S",
    desc: "Senior Auditor — leads fieldwork on assigned areas (mandatory in ≥1 team)",
    color: "#059669",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-600",
    ringClass: "border-emerald-300",
  },
  {
    key: "associate",
    label: "Associate",
    icon: "A",
    desc: "Associate / Article — executes testing procedures under senior supervision",
    color: "#7C3AED",
    textClass: "text-violet-600",
    borderClass: "border-violet-600",
    ringClass: "border-violet-300",
  },
];

// --- Estimated Timelines (S2) --------------------------------------------
// Visual metadata for the 4 FS rows. The canonical id/name pair lives in
// `lib/types.ts` (defaultS2Statements); these constants only add the icon
// + tag-colour + description used by the table row rendering.
export interface S2StatementMeta {
  id: "bs" | "il" | "cf" | "eq";
  icon: string;
  iconBg: string;
  desc: string;
}

export const S2_STATEMENT_META: S2StatementMeta[] = [
  { id: "bs", icon: "🏦", iconBg: "#EBF1FF", desc: "Assets, liabilities & shareholders' equity" },
  { id: "il", icon: "📈", iconBg: "#ECFDF5", desc: "Revenue, expenses & net profit/loss" },
  { id: "cf", icon: "💵", iconBg: "#ECFEFF", desc: "Operating, investing & financing activities" },
  { id: "eq", icon: "⚖️", iconBg: "#F5F3FF", desc: "Share capital, retained earnings & reserves" },
];

// --- Planning Artifacts (S4) ---------------------------------------------
// HTML's screen-4 default materiality sections seeded on first visit. Rows
// remain editable (benchmark amt / percentages) but the section LABEL is
// not — only custom rows get an editable section-name input.
export const S4_MAT_DEFAULTS: ReadonlyArray<{ section: string }> = [
  { section: "Total Assets" },
  { section: "Total Liabilities" },
  { section: "Total Income" },
  { section: "Total Expenses" },
];

// SA 240 §26 + §32 — every audit must document these two presumed fraud
// risks. Used by the "Quick-add SA 240 Presumed Risks" CTA and by the
// first-visit seeding logic on the artifacts page.
export const S4_PRESUMED_RISKS: ReadonlyArray<{
  description: string;
  area: string;
  level: "low" | "medium" | "high";
  significant: boolean;
  response: string;
}> = [
  {
    description: "Revenue recognition (SA 240 §26 — presumed fraud risk)",
    area: "Revenue / Receivables",
    level: "high",
    significant: true,
    response:
      "Substantive cut-off testing on last 10 invoices pre-/post-FY-end · trace to dispatch records / GRNs · review credit notes raised post-FY-end",
  },
  {
    description: "Management override of controls (SA 240 §32 — presumed fraud risk)",
    area: "All accounts — Journal Entries",
    level: "high",
    significant: true,
    response:
      "Journal-entry testing — review JEs posted by non-routine users, manual JEs at period-end, JEs with round-rupee amounts, JEs reversing previous entries; corroborate to source documents",
  },
];

export const S4_RISK_LEVELS = [
  { value: "low", label: "🟢 Low" },
  { value: "medium", label: "🟡 Medium" },
  { value: "high", label: "🔴 High" },
] as const;

export const S4_GC_CONCLUSION_OPTIONS = [
  { value: "appropriate", label: "🟢 Going-concern basis appropriate — no material uncertainty" },
  { value: "uncertainty", label: "🟡 Material uncertainty exists — additional procedures required" },
  { value: "inappropriate", label: "🔴 Going-concern basis inappropriate — alternative basis needed" },
] as const;

export const S4_GC_PERIOD_OPTIONS = [
  { value: "12mo", label: "12 months from FS date (standard)" },
  { value: "lt-12mo", label: "Less than 12 months (concern)" },
  { value: "gt-12mo", label: "Greater than 12 months (extended)" },
] as const;

export const S4_TCWG_METHOD_OPTIONS = [
  { value: "written", label: "Written (letter / email)" },
  { value: "oral", label: "Oral (meeting)" },
  { value: "both", label: "Both — written + meeting" },
] as const;

export const S4_TCWG_FREQ_OPTIONS = [
  { value: "planning-final", label: "At planning + final (standard)" },
  { value: "quarterly", label: "Quarterly during engagement" },
  { value: "adhoc", label: "Ad-hoc + final" },
] as const;

export const S4_SPEC_REQUIRED_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
] as const;

export const S4_GROUP_REQUIRED_OPTIONS = [
  { value: "no", label: "No — standalone audit only" },
  { value: "yes", label: "Yes — consolidated FS audit" },
] as const;

export const S4_GROUP_CA_OPTIONS = [
  { value: "none", label: "No component auditors" },
  { value: "some", label: "Some — review their work" },
  { value: "all", label: "All components by separate auditors" },
] as const;

export const S1_AREAS = [
  "PPE",
  "Intangibles",
  "Investments",
  "Inventories",
  "Receivables",
  "Cash & Bank",
  "Payables",
  "Provisions",
  "Equity",
  "Revenue",
  "Expenses",
  "Tax",
  "Compliance / CARO",
  "IT / ITGC",
  "EQR",
] as const;
