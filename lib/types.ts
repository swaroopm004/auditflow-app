/**
 * AuditFlow Suite — core data model.
 *
 * Field naming: HTML demo uses kebab-case DOM IDs (e.g. `entity-name`, `current-fy`).
 * The TS app converts to camelCase (`entityName`, `currentFy`) consistently.
 * See `lib/schemas/` for the Zod schemas that mirror the HTML's validation rules.
 */

export interface ClientProfile {
  // Card A — Entity Identification
  entityName: string;
  cin: string;
  pan: string;
  gstin: string;
  constitution: string;
  incorporated: string; // ISO date

  // Card B — Industry, Scale & Listing
  industry: string;
  listed: string;
  turnoverBand: string;

  // Card C — Reporting Framework & FY
  framework: string;
  currentFy: string;
  comparativeFy: string;
  fyEnd: string; // ISO date

  // Card D — Group Structure
  group: string;
  parent: string;
  branchCount: number | "";

  // Card E — Auditor History & Address
  priorAuditor: string;
  priorTenure: number | "";
  regAddress: string;
  notes: string;
}

export interface EngagementAcceptance {
  // Card 1 — Pre-conditions
  framework: string;
  riskRating: string;
  pcFs: boolean;
  pcIc: boolean;
  pcAccess: boolean;

  // Card 2 — Independence & Ethics
  indNoInterest: boolean;
  indCode: boolean;
  indNoclar: boolean;
  coi: string;
  coiNotes: string;

  // Card 3 — Predecessor Communication
  apptType: string;
  predName: string;
  predSent: string; // ISO date
  noc: string;
  nocDate: string; // ISO date

  // Card 4 — Engagement Letter
  elRef: string;
  elDrafted: string; // ISO date
  elSent: string; // ISO date
  elSigned: string; // ISO date
  elFileName: string; // we keep only the filename; real upload deferred

  // Card 5 — Acceptance Decision
  skills: boolean;
  decision: string;
  signedBy: string;
  memFrn: string;
  signedOn: string; // ISO date
  declineReason: string;
}

export interface TeamMember {
  id: string;
  name: string;
  areas: string[];
}

// --- Milestone 2: Resources / Multi-Team ----------------------------------
// HTML's original single-team Partner/Manager/Senior/Associate hierarchy is
// the WRONG model — joint audits, branch audits, multi-firm engagements need
// multiple teams. Each team has its own role buckets. Validation rule:
// at least one team must have ≥1 Partner + ≥1 Senior.

export interface TeamRecord {
  id: string;
  name: string;
  members: {
    partner: TeamMember[];
    manager: TeamMember[];
    senior: TeamMember[];
    associate: TeamMember[];
  };
}

export interface S1State {
  teams: TeamRecord[];
}

// --- Milestone 3a: Estimated Timelines (S2) -------------------------------
// HTML's screen-2 is DOM-driven and doesn't persist — the JS app fixes that
// gap by storing the overall estimated completion date plus per-FS-section
// (BS / IL / CF / EQ) start + end on the active client. Sequential start
// ordering and Sunday exclusion are enforced via Zod superRefine.

export type S2StatementId = "bs" | "il" | "cf" | "eq";

export interface S2StatementEntry {
  id: S2StatementId;
  name: string;
  start: string; // ISO date (yyyy-mm-dd) or ""
  end: string; // ISO date (yyyy-mm-dd) or ""
}

export interface S2State {
  estCompletion: string; // overall ISO completion date or ""
  statements: S2StatementEntry[]; // 4 entries in BS / IL / CF / EQ order
}

// --- Milestone 3b: Planning Artifacts (S4) --------------------------------
// HTML's single-benchmark materiality card was the WRONG model — real audit
// practice sets materiality per FS section. Defaults: Total Assets, Total
// Liabilities, Total Income, Total Expenses (isCustom=false). Users may
// add custom sections (isCustom=true).
//
// String-typed numeric fields (benchmarkAmt / matPct / perfPct / ctPct):
// inputs are bound to string state so the user can clear / partially type
// without React forcing 0 back into the field. Parsing happens at compute
// + validation time via parseFloat() (NaN → 0).

export type S4RiskLevel = "low" | "medium" | "high" | "";

export interface S4MaterialityRow {
  id: string;
  section: string;
  benchmarkAmt: string;
  matPct: string;
  perfPct: string;
  ctPct: string;
  isCustom: boolean;
}

export interface S4RiskRow {
  id: string;
  description: string;
  area: string;
  level: S4RiskLevel;
  significant: boolean;
  response: string;
}

export interface S4GoingConcern {
  conclusion: string;
  period: string;
  notes: string;
}

export interface S4Tcwg {
  recipients: string;
  method: string;
  freq: string;
}

export interface S4Specialist {
  required: string;
  areas: string;
  name: string;
}

export interface S4Group {
  required: string;
  components: string;
  ca: string;
  notes: string;
}

export interface S4Budget {
  partner: string;
  manager: string;
  senior: string;
  associate: string;
}

export interface S4State {
  materiality: S4MaterialityRow[];
  risks: S4RiskRow[];
  matRationale: string;
  fraudNotes: string;
  goingConcern: S4GoingConcern;
  tcwg: S4Tcwg;
  specialist: S4Specialist;
  group: S4Group;
  budget: S4Budget;
}

/** Back-compat alias — the older `S4Materiality` name is still used by
 *  references elsewhere in the codebase. Treat as identical to S4MaterialityRow. */
export type S4Materiality = S4MaterialityRow;

// --- Milestone 3c: GL Line Items (S3) -------------------------------------
// HTML's screen-3 carries the full GL scope-definition table — one row per
// GL line across all 4 FS sections (BS / IL / CF / EQ). Each row defines:
//   - what to test (Scope toggle + per-FS testing-area checkboxes)
//   - who tests it (Reviewer dropdown derived from s1.teams members)
//   - which team (Team dropdown derived from s1.teams)
//   - when (Testing Due + Review Due dates)
//   - completion (auto-filled by D1 back-flow from Execution Reviewer Signoff)
//
// Each row optionally links to an Execution template via `templateId`, e.g.
// the "Property, Plant & Equipment" row in BS Non-Current Assets carries
// templateId="bs-ppe". When signOffTemplate("bs-ppe", reviewer) fires in
// Execution, the row with templateId="bs-ppe" flips completed=true with
// the same timestamp + signer.

export type S3FsId = "bs" | "il" | "cf" | "eq";

export type S3RowStatus = "pending" | "in-scope" | "in-progress" | "complete";

export interface S3TestingAreas {
  /** Per-FS labels are FS-specific (BS uses Assertions/Tax/Variance; IL uses
   *  Variance/Vouching/Completeness; CF uses Completeness/Cut-off/Variance;
   *  EQ uses Existence/Valuation/Authorisation). Stored as a 3-tuple keyed
   *  generically; the page renders the FS-specific label. */
  a: boolean;
  b: boolean;
  c: boolean;
}

export interface S3GLRow {
  id: string;
  fsId: S3FsId;
  section: string;               // e.g. "Non-Current Assets"
  description: string;           // e.g. "Property, Plant & Equipment"
  subDescription: string;        // e.g. "Fixed Assets" (cat)
  accountCode: string;
  balance: string;               // numeric-string, comma-formatted in UI
  referenceAmt: string;          // IL/CF/EQ only; populated by D2 propagation
  inScope: boolean;
  testingAreas: S3TestingAreas;  // checked-state for the 3 FS-specific areas
  testingDue: string;            // ISO date
  reviewer: string;              // free text OR derived from s1.teams members
  reviewDue: string;             // ISO date
  team: string;                  // free text OR derived from s1.teams names
  completed: boolean;            // auto-filled by D1
  completionDate: string;        // ISO timestamp; auto-filled by D1
  signedOffBy: string;           // auto-filled by D1
  templateId?: string;           // optional link to Execution template
}

/** FS-specific testing-area labels — drives the column header / checkbox labels. */
export const S3_TESTING_AREA_LABELS: Record<S3FsId, [string, string, string]> = {
  bs: ["Assertions", "Tax Compliance", "Variance Check"],
  il: ["Variance Investigation", "Vouching", "Completeness Check"],
  cf: ["Completeness Check", "Cut-off Testing", "Variance Investigation"],
  eq: ["Existence & Completeness", "Valuation", "Authorisation Check"],
};

export interface S3State {
  glRows: S3GLRow[];
  submittedAt: string | null;
  submittedBy: string;
}

/** Derive a row's current status from its scope/completion flags. */
export function deriveS3RowStatus(row: S3GLRow): S3RowStatus {
  if (row.completed) return "complete";
  if (!row.inScope) return "pending";
  // In scope + has testing area selected + has reviewer + has dates → in-progress
  const hasAnyTesting = row.testingAreas.a || row.testingAreas.b || row.testingAreas.c;
  const hasAssignment = !!row.reviewer && !!row.team && !!row.testingDue && !!row.reviewDue;
  if (hasAnyTesting && hasAssignment) return "in-progress";
  return "in-scope";
}

export function emptyS3State(): S3State {
  return { glRows: [], submittedAt: null, submittedBy: "" };
}

// --- Execution Module (E1+): per-template working papers ------------------
// Each FS section (BS / PL / CF / EQ) holds N templates (PPE, AR, Investments,
// Revenue, etc.). Each template has 4 tabs: Connected GLs, Journal Entries,
// Assertions, Variance Check. Reviewer signoff on a template back-flows into
// the corresponding Planning S3 row via signOffTemplate() (the "D1" contract).
// BS templates with `connectedGLs[]` propagate amounts into PL/CF/EQ templates
// via propagateConnectedGLs() ("D2" — wired in E3+).
//
// Note: this `FsId` includes `pl` (Profit & Loss) which is the standard label
// for Execution; the Planning S3 uses `il` (Income & Loss Statement) for the
// same FS. Conversion happens inside signOffTemplate().

export type FsId = "bs" | "pl" | "cf" | "eq";
export type TemplateStatus = "pending" | "in-progress" | "complete";

export interface ExecGLLine {
  id: string;
  label: string;
  bookAmt: string;        // numeric-string (allow partial typing)
  tbAmt: string;
  referenceAmt?: string;  // populated by D2 propagation
  notes?: string;
}

export interface VarianceCheck {
  groupLabel: string;     // e.g. "Gross Block", "Accumulated Depreciation"
  diffPct: number;        // computed (book vs tb); > 0.5 → red flag
  notes: string;
}

export interface ConnectedGL {
  sourceTemplateId: string;
  sourceLineId: string;
  targetTemplateId: string;
  targetLineId: string;
}

export interface Signoff {
  reviewerName: string;
  signedAt: string;       // ISO timestamp
}

export interface ExecAssertion {
  id: string;
  label: string;
  covered: boolean;
  notes: string;
}

export interface ExecJournalEntry {
  id: string;
  description: string;
  dr: string;
  cr: string;
  amount: string;
}

/** Colour tone for a lifecycle entry header (matches the HTML demo palette). */
export type LifecycleTone = "ppe" | "amber" | "purple" | "red" | "accent" | "green";

/** A single posting line (Dr or Cr) within a lifecycle JE. An entry can have
 *  several Dr and/or Cr lines (e.g. disposal: 2 Dr + 2 Cr). */
export interface LifecycleLine {
  id: string;
  label: string;          // account name (without the "To " prefix)
  side: "Dr" | "Cr";
  glNo?: string;          // ledger GL number — flows into the Connected GLs tab
  emph?: string;          // small italic qualifier e.g. "if existing surplus"
  amount?: string;        // posting amount (₹L) — editable; auto-filled from an uploaded supporting doc
}

/** A structured JE inside a lifecycle stage. Mirrors the HTML demo's
 *  "Entry 1A / CWIP Entry 1" pattern — posting lines + an Ind AS commentary note. */
export interface LifecycleEntry {
  id: string;
  entryRef: string;       // e.g. "Entry 1A", "CWIP Entry 1"
  title: string;          // e.g. "Cash Purchase of Asset"
  lines: LifecycleLine[];
  note: string;           // Ind AS / Section / standard commentary
  tone?: LifecycleTone;
}

/** A lifecycle stage groups related entries — e.g. PPE has stages Purchase /
 *  CWIP / Capitalise / Depreciation / Impairment / Disposal / Revaluation. */
export interface LifecycleStage {
  key: string;            // url-safe e.g. "purchase"
  label: string;          // display label e.g. "Purchase"
  icon: string;           // emoji
  entries: LifecycleEntry[];
}

/** Audit-procedure card shown on the Improvements tab. */
export interface ImprovementCard {
  id: string;
  title: string;
  body: string;
  category?: string;
}

/** Ind AS / framework commentary shown at the top of the Lifecycle JEs tab. */
export interface FrameworkNote {
  title: string;
  body: string;
  chips?: string[];
}

export interface ExecutionTemplate {
  id: string;             // e.g. "bs-ppe", "bs-ar", "pl-revenue"
  fsId: FsId;
  name: string;
  glLines: ExecGLLine[];
  connectedGLs: ConnectedGL[];
  varianceChecks: VarianceCheck[];
  assertions: ExecAssertion[];
  /** Legacy / fallback flat journal-entry list. Used when `lifecycleStages` is empty. */
  journalEntries: ExecJournalEntry[];
  /** When present, the Lifecycle JEs tab renders these grouped stages
   *  instead of the flat journalEntries list. */
  lifecycleStages?: LifecycleStage[];
  /** Top-of-tab Ind AS framework commentary card. */
  framework?: FrameworkNote;
  /** Audit-procedure cards shown on the Additional Checks tab. */
  improvements?: ImprovementCard[];
  /** Yes/No completion marks for Assertions & Additional Checks, keyed by a
   *  stable id (e.g. "assert:E", "check:1"). */
  checkStatus?: Record<string, "yes" | "no">;
  /** Connected-GL working amounts & classification overrides, keyed by account
   *  name. These roll up into the P&L reconciliation (AUTO column). */
  connectedData?: Record<string, { amount?: string; classification?: string }>;
  reviewerSignoff: Signoff | null;
  status: TemplateStatus;
}

export interface ExecutionState {
  templates: Record<string, ExecutionTemplate>;
}

export function emptyExecutionState(): ExecutionState {
  return { templates: {} };
}

/** Profit & Loss reconciliation working — AUTO rolls up from Connected-GL
 *  amounts (Execution); CLIENT is the uploaded/keyed client P&L. */
export interface PLReconState {
  clientLine: Record<string, string>;   // P&L line key → client amount (₹L)
  clientGL: Record<string, string>;     // connected account name → client amount (GL-level)
  comments: Record<string, string>;     // P&L line key → reviewer investigation comment
}

export function emptyPLReconState(): PLReconState {
  return { clientLine: {}, clientGL: {}, comments: {} };
}

/** Tax Audit — Form 26 (Sec 63, ITA 2025 · replaces Form 3CA/3CB/3CD). */
export interface TaxRow { id: string; [k: string]: string }
export interface TaxAuditState {
  fields: Record<string, string>;
  done: Record<string, boolean>;
  depnFull: TaxRow[];   // Cl. 36 — assets used ≥180 days
  depnHalf: TaxRow[];   // Cl. 36 — assets used <180 days (half rate)
  tds: TaxRow[];        // Cl. 49–51 — TDS/TCS schedule
  icds: TaxRow[];       // Cl. 40 — ICDS adjustments
  quant: TaxRow[];      // Cl. 53 — quantitative details
}
export function emptyTaxAudit(): TaxAuditState {
  return { fields: {}, done: {}, depnFull: [], depnHalf: [], tds: [], icds: [], quant: [] };
}

/** Fraud & Error Postmortem (SA 240) — per-indicator verdict, remarks & ratio inputs. */
export type PostmortemVerdict = "clear" | "flag" | "escalate";
export interface PostmortemState {
  verdicts: Record<string, PostmortemVerdict>;
  remarks: Record<string, string>;
  ratios: Record<string, string>;   // ratio-input id → value
}
export function emptyPostmortem(): PostmortemState {
  return { verdicts: {}, remarks: {}, ratios: {} };
}

/** Independent Auditor's Report (SA 700/705/706 · CARO 2020). */
export type OpinionType = "unmodified" | "qualified" | "adverse" | "disclaimer";
export interface KamItem { id: string; title: string; description: string; procedures: string }
export interface AuditReportState {
  opinionType: OpinionType;
  fields: Record<string, string>;   // all scalar section fields keyed
  kam: KamItem[];
  done: Record<string, boolean>;    // section key → marked complete
}
export function emptyAuditReport(): AuditReportState {
  return { opinionType: "unmodified", fields: {}, kam: [], done: {} };
}

/** Monitoring — tracks GL/line-item review requests, client queries & responses. */
export type MonitoringStatus = "open" | "pending" | "overdue" | "resolved";
export interface MonitoringItem {
  id: string;
  reqId: string;          // auto e.g. REQ-001
  glTemplate: string;     // source GL template / area
  lineItem: string;
  testingArea: string;
  assertion: string;
  query: string;          // query / supporting required
  response: string;       // client response
  ref: string;            // regulation / reference
  dueDate: string;
  status: MonitoringStatus;
}

export interface ClientRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  profile: ClientProfile;
  b1: EngagementAcceptance;
  s1?: S1State;
  s2?: S2State;
  s3?: S3State;
  s4?: S4State;
  execution?: ExecutionState;
  plRecon?: PLReconState;
  cfRecon?: PLReconState;
  eqRecon?: PLReconState;
  monitoring?: MonitoringItem[];
  report?: AuditReportState;
  postmortem?: PostmortemState;
  taxAudit?: TaxAuditState;
}

export interface FirmState {
  firm: { name: string };
  clients: ClientRecord[];
  activeClientId: string | null;
}

export const CLIENT_PROFILE_REQUIRED: (keyof ClientProfile)[] = [
  "entityName",
  "pan",
  "constitution",
  "industry",
  "listed",
  "currentFy",
];

export function emptyClientProfile(): ClientProfile {
  return {
    entityName: "",
    cin: "",
    pan: "",
    gstin: "",
    constitution: "",
    incorporated: "",
    industry: "",
    listed: "",
    turnoverBand: "",
    framework: "",
    currentFy: "",
    comparativeFy: "",
    fyEnd: "",
    group: "",
    parent: "",
    branchCount: "",
    priorAuditor: "",
    priorTenure: "",
    regAddress: "",
    notes: "",
  };
}

/** Default 4 statements in the canonical BS → IL → CF → EQ order. Order
 *  matters: sequential-start validation in s2 requires each FS.start ≥
 *  previous FS.start. */
export function defaultS2Statements(): S2StatementEntry[] {
  return [
    { id: "bs", name: "Balance Sheet", start: "", end: "" },
    { id: "il", name: "Income & Loss Statement", start: "", end: "" },
    { id: "cf", name: "Cashflow Statement", start: "", end: "" },
    { id: "eq", name: "Statement of Changes in Equity", start: "", end: "" },
  ];
}

export function emptyS2State(): S2State {
  return { estCompletion: "", statements: defaultS2Statements() };
}

export function emptyS4State(): S4State {
  return {
    materiality: [],
    risks: [],
    matRationale: "",
    fraudNotes: "",
    goingConcern: { conclusion: "", period: "", notes: "" },
    tcwg: { recipients: "", method: "", freq: "" },
    specialist: { required: "", areas: "", name: "" },
    group: { required: "", components: "", ca: "", notes: "" },
    budget: { partner: "", manager: "", senior: "", associate: "" },
  };
}

export function emptyEngagementAcceptance(): EngagementAcceptance {
  return {
    framework: "",
    riskRating: "",
    pcFs: false,
    pcIc: false,
    pcAccess: false,
    indNoInterest: false,
    indCode: false,
    indNoclar: false,
    coi: "",
    coiNotes: "",
    apptType: "",
    predName: "",
    predSent: "",
    noc: "",
    nocDate: "",
    elRef: "",
    elDrafted: "",
    elSent: "",
    elSigned: "",
    elFileName: "",
    skills: false,
    decision: "",
    signedBy: "",
    memFrn: "",
    signedOn: "",
    declineReason: "",
  };
}
