"use client";

/**
 * Audit Planning — Planning Artifacts (S4).
 *
 * Port of HTML demo's screen-4 (search the HTML for
 * `STEP 4 — PLANNING ARTIFACTS`). 7 cards on one long scrollable page:
 *   1. Materiality (SA 320) — multi-section table with auto Overall/Perf/CT
 *   2. Risk Assessment + Fraud (SA 315/240) — dynamic risk rows
 *   3. Going Concern (SA 570) — preliminary assessment
 *   4. TCWG Communication Plan (SA 260)
 *   5. Auditor's Expert / Specialist (SA 620)
 *   6. Group / Component Auditor (SA 600)
 *   7. Audit Budget — Hours per Role
 *
 * Auto-seeding (matches HTML's `s4Render` first-visit behaviour):
 *   - 4 default materiality rows (Total Assets / Liabilities / Income / Expenses)
 *   - 2 SA 240 presumed fraud risks (so the user is unblocked from the start)
 *
 * State persistence: every mutation goes through `updateActiveS4(next)` which
 * writes to Dexie via the store. There is no save button — the form is
 * auto-saved on every keystroke (mirrors the rest of the M3 milestones).
 *
 * Validation: `makeS4Schema()` enforces ≥1 complete materiality row +
 * GC conclusion non-empty + ≥1 risk. On Continue with errors:
 *   - "no risks" surfaces as a whole-card flash on `s4-card-risks`
 *     (via useFlashElement — there's no specific input to focus on)
 *   - otherwise scroll-to + focus the first invalid input
 *
 * Focus-preservation gotcha (Materiality table): each materiality row is
 * rendered by a memoised `MaterialityRowItem` keyed by `row.id`, so typing
 * into a row's input doesn't re-mount the row + lose focus. Re-render is
 * still triggered by the parent because the row's props change, but React
 * reconciles the existing input element rather than swapping it.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import {
  S4_GC_CONCLUSION_OPTIONS,
  S4_GC_PERIOD_OPTIONS,
  S4_GROUP_CA_OPTIONS,
  S4_GROUP_REQUIRED_OPTIONS,
  S4_MAT_DEFAULTS,
  S4_PRESUMED_RISKS,
  S4_RISK_LEVELS,
  S4_SPEC_REQUIRED_OPTIONS,
  S4_TCWG_FREQ_OPTIONS,
  S4_TCWG_METHOD_OPTIONS,
} from "@/lib/constants";
import {
  emptyS4State,
  type S4MaterialityRow,
  type S4RiskLevel,
  type S4RiskRow,
  type S4State,
} from "@/lib/types";
import {
  makeS4Schema,
  s4BindingOverall,
  s4ParseNum,
} from "@/lib/schemas/artifacts";
import { useFlashElement } from "@/lib/utils/flash";
import { errorFieldId, scrollToFirstError, type FieldErrorMap } from "@/lib/utils/errors";
import { uid } from "@/lib/utils";

// ----- Error-key conventions -----------------------------------------------
// Per-row keys are scoped by row id so each cell paints its own red border.
// `useFieldErrors` is keyed on `issue.path[0]` (first segment), so our schema
// emits flat string paths like `matRow:<id>:bench` to keep this consistent.
const KEY_GC = "goingConcern"; // GC conclusion select
const KEY_RISKS = "risks"; // whole-card scope
const matRowKey = (rowId: string, field: "bench" | "pct" | "section") =>
  `matRow:${rowId}:${field}`;

// DOM id for the Risk card (used by useFlashElement on "no risks" failure).
const RISKS_CARD_ID = "s4-card-risks";

// ----- Helpers --------------------------------------------------------------

function newMatRow(section: string, isCustom: boolean): S4MaterialityRow {
  return {
    id: uid("mat"),
    section,
    benchmarkAmt: "",
    matPct: "",
    perfPct: "75",
    ctPct: "5",
    isCustom,
  };
}

function newRiskRow(seed?: Partial<S4RiskRow>): S4RiskRow {
  return {
    id: uid("risk"),
    description: seed?.description ?? "",
    area: seed?.area ?? "",
    level: (seed?.level as S4RiskLevel) ?? "",
    significant: seed?.significant ?? false,
    response: seed?.response ?? "",
  };
}

function seedDefaultMateriality(): S4MaterialityRow[] {
  return S4_MAT_DEFAULTS.map((d) => newMatRow(d.section, false));
}

function seedPresumedRisks(): S4RiskRow[] {
  return S4_PRESUMED_RISKS.map((r) => newRiskRow(r));
}

function fmtRupee(n: number | null): string {
  if (n === null || !isFinite(n) || n === 0) return "—";
  return "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ----- Page -----------------------------------------------------------------

export default function PlanningArtifactsPage() {
  const router = useRouter();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const updateActiveS4 = useFirmStore((s) => s.updateActiveS4);
  const active = clients.find((c) => c.id === activeClientId) ?? null;
  const flash = useFlashElement();

  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // Mirror the pattern from resources/timelines: only render inline errors
  // AFTER the first Continue attempt. The map is recomputed live, so reds
  // clear field-by-field as the user fixes issues.
  const [showErrors, setShowErrors] = useState(false);

  // Derive a stable working S4 state. Brand-new clients get the seeded
  // defaults the first time they touch this page.
  const s4: S4State = useMemo(() => {
    if (!active) return emptyS4State();
    const stored = active.s4;
    if (stored && Array.isArray(stored.materiality) && stored.materiality.length > 0) {
      return stored;
    }
    // Either no stored s4 at all, or the materiality array is missing/empty.
    // Use stored fields where available; seed defaults for materiality + risks.
    const base = stored ?? emptyS4State();
    return {
      ...base,
      materiality: seedDefaultMateriality(),
      risks: base.risks?.length ? base.risks : seedPresumedRisks(),
    };
  }, [active]);

  // Persist the seeded state on first visit so a reload doesn't re-seed
  // (and so risks/materiality survive client switches).
  useEffect(() => {
    if (!active) return;
    const stored = active.s4;
    const needsSeed = !stored || !Array.isArray(stored.materiality) || stored.materiality.length === 0;
    if (needsSeed) void updateActiveS4(s4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // ----- Validation -------------------------------------------------------
  const schema = useMemo(() => makeS4Schema(), []);

  const errors: FieldErrorMap = useMemo(() => {
    const out: FieldErrorMap = {};
    const result = schema.safeParse(s4);
    if (result.success) return out;
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!key) continue;
      if (!out[key]) out[key] = issue.message;
    }
    return out;
  }, [schema, s4]);

  // ----- Mutators ---------------------------------------------------------
  // Single source of truth — every edit flows through this so persistence
  // and submit-message clearing are uniform.
  const mutate = (next: S4State) => {
    void updateActiveS4(next);
    if (submitMsg) setSubmitMsg(null);
  };

  // --- Materiality
  const setMatRow = (id: string, patch: Partial<S4MaterialityRow>) => {
    mutate({
      ...s4,
      materiality: s4.materiality.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };
  const addCustomMatRow = () => {
    const row = newMatRow("", true);
    mutate({ ...s4, materiality: [...s4.materiality, row] });
    // Focus the new section input once it mounts.
    window.setTimeout(() => {
      document.getElementById(`mat-section-${row.id}`)?.focus();
    }, 60);
  };
  const removeMatRow = (id: string) => {
    mutate({ ...s4, materiality: s4.materiality.filter((r) => r.id !== id) });
  };

  // --- Risks
  const setRiskRow = (id: string, patch: Partial<S4RiskRow>) => {
    mutate({ ...s4, risks: s4.risks.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };
  const addEmptyRisk = () => {
    const row = newRiskRow();
    mutate({ ...s4, risks: [...s4.risks, row] });
    window.setTimeout(() => {
      document.getElementById(`risk-desc-${row.id}`)?.focus();
    }, 60);
  };
  const addPresumedRisks = () => {
    mutate({ ...s4, risks: [...s4.risks, ...seedPresumedRisks()] });
  };
  const removeRiskRow = (id: string) => {
    mutate({ ...s4, risks: s4.risks.filter((r) => r.id !== id) });
  };

  // --- Other cards
  const setMatRationale = (v: string) => mutate({ ...s4, matRationale: v });
  const setFraudNotes = (v: string) => mutate({ ...s4, fraudNotes: v });
  const setGc = (patch: Partial<S4State["goingConcern"]>) =>
    mutate({ ...s4, goingConcern: { ...s4.goingConcern, ...patch } });
  const setTcwg = (patch: Partial<S4State["tcwg"]>) =>
    mutate({ ...s4, tcwg: { ...s4.tcwg, ...patch } });
  const setSpec = (patch: Partial<S4State["specialist"]>) =>
    mutate({ ...s4, specialist: { ...s4.specialist, ...patch } });
  const setGroup = (patch: Partial<S4State["group"]>) =>
    mutate({ ...s4, group: { ...s4.group, ...patch } });
  const setBudget = (patch: Partial<S4State["budget"]>) =>
    mutate({ ...s4, budget: { ...s4.budget, ...patch } });

  // ----- Derived summary --------------------------------------------------
  const summary = useMemo(() => {
    // Local helper: treat NaN / empty as 0 so a single populated cell
    // doesn't poison the sum (parseFloat('') === NaN, NaN + 5 === NaN).
    const safeNum = (v: string) => {
      const n = s4ParseNum(v);
      return Number.isFinite(n) ? n : 0;
    };
    const binding = s4BindingOverall(s4.materiality);
    const budgetTotal =
      safeNum(s4.budget.partner) +
      safeNum(s4.budget.manager) +
      safeNum(s4.budget.senior) +
      safeNum(s4.budget.associate);
    let gcDisplay = "—";
    if (s4.goingConcern.conclusion === "appropriate") gcDisplay = "🟢 OK";
    else if (s4.goingConcern.conclusion === "uncertainty") gcDisplay = "🟡 Uncertain";
    else if (s4.goingConcern.conclusion === "inappropriate") gcDisplay = "🔴 Issue";
    return {
      bindingMateriality: binding,
      risksCount: s4.risks.length,
      gcDisplay,
      budgetTotal,
    };
  }, [s4]);

  // ----- Continue --------------------------------------------------------
  const onContinue = () => {
    if (!active) return;
    const errKeys = Object.keys(errors);
    if (errKeys.length > 0) {
      setShowErrors(true);
      setSubmitMsg({
        kind: "err",
        text: errors[KEY_RISKS]
          ? errors[KEY_RISKS]
          : errors[KEY_GC]
            ? errors[KEY_GC]
            : "Resolve outstanding planning-artifact issues before continuing",
      });
      // "No risks" is a list-level rule — no specific input to focus on,
      // so we flash the whole Risk card instead. Otherwise scroll to the
      // first invalid input.
      window.setTimeout(() => {
        if (errors[KEY_RISKS]) {
          flash(RISKS_CARD_ID);
        } else {
          scrollToFirstError(errors);
        }
      }, 0);
      return;
    }
    setSubmitMsg({
      kind: "ok",
      text: `Planning artifacts saved ✓ — materiality ${fmtRupee(summary.bindingMateriality)} · ${summary.risksCount} risk${summary.risksCount === 1 ? "" : "s"} · proceeding to GL Line Items`,
    });
    router.push("/planning/gl-items");
  };

  // ----- Empty state -----------------------------------------------------
  if (!active) {
    return (
      <div>
        <Banner
          title="Audit Planning — Planning Artifacts"
          subtitle="Materiality (SA 320) · Risk (SA 315/240) · Going Concern (SA 570) · TCWG (SA 260) · Specialist (SA 620) · Group (SA 600) · Budget"
        />
        <Card>
          <CardContent className="text-center py-10 text-sm text-gray-600">
            <div className="text-2xl mb-2">👈</div>
            <div className="font-medium mb-1">No active client</div>
            <div className="mb-4">Add or select a client first to begin planning artifacts.</div>
            <Button size="sm" onClick={() => router.push("/clients")}>
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleErrors: FieldErrorMap = showErrors ? errors : {};

  return (
    <div>
      <Banner
        title="Audit Planning — Planning Artifacts"
        subtitle="Materiality (SA 320) · Risk (SA 315/240) · Going Concern (SA 570) · TCWG (SA 260) · Specialist (SA 620) · Group (SA 600) · Budget"
        chips={[
          active.profile.currentFy
            ? { label: `📅 ${active.profile.currentFy}`, tone: "blue" }
            : { label: "📅 FY —", tone: "amber" },
          Object.keys(errors).length === 0
            ? { label: "✅ Ready", tone: "green" }
            : { label: `⏳ ${Object.keys(errors).length} pending`, tone: "amber" },
        ]}
      />

      {/* Info tip — mirrors HTML's amber-dashed Connected GLs notice */}
      <div className="bg-amber-50 border border-amber-200 border-dashed rounded-lg p-3 text-xs text-amber-900 mb-5 flex gap-2">
        <span>🔗</span>
        <span>
          <strong>Connected GLs (real-app only):</strong> P&amp;L, Cash Flow and Statement of Changes in Equity
          reference amounts will be derived from <strong>&ldquo;Connected GLs&rdquo;</strong> mapped on each Balance
          Sheet GL template in the Execution panel. Once a BS GL is reviewed and signed off, the linked P&amp;L/CF/EQ
          line items auto-populate — currently a manual entry placeholder.
        </span>
      </div>

      {/* Summary bar (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard
          label="Binding Materiality (₹, lowest)"
          value={fmtRupee(summary.bindingMateriality)}
          tone="text-blue-600"
        />
        <SummaryCard label="Risks Identified" value={String(summary.risksCount)} tone="text-amber-600" />
        <SummaryCard label="Going Concern" value={summary.gcDisplay} tone="text-emerald-600" />
        <SummaryCard label="Budgeted Hours" value={`${summary.budgetTotal}h`} tone="text-violet-600" />
      </div>

      {/* ════════════════════════════════════════
            CARD 1 — Materiality (SA 320)
      ════════════════════════════════════════ */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">📐</span>
            <div>
              <CardTitle>Materiality (SA 320)</CardTitle>
              <CardDescription>
                Per-FS-section benchmarks · Overall · Performance · Clearly Trivial — the lowest Overall across sections
                is the binding materiality
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addCustomMatRow}>
            + Add Custom Section
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2.5 min-w-[160px]">FS Section</th>
                <th className="px-3 py-2.5 min-w-[140px]">Benchmark Amt (₹)</th>
                <th className="px-3 py-2.5 w-[80px]">Mat %</th>
                <th className="px-3 py-2.5 w-[80px]">Perf %</th>
                <th className="px-3 py-2.5 w-[80px]">CT %</th>
                <th className="px-3 py-2.5 min-w-[120px]">Overall (₹)</th>
                <th className="px-3 py-2.5 min-w-[120px]">Perf (₹)</th>
                <th className="px-3 py-2.5 min-w-[120px]">CT (₹)</th>
                <th className="px-3 py-2.5 w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {s4.materiality.map((row) => (
                <MaterialityRowItem
                  key={row.id}
                  row={row}
                  errors={visibleErrors}
                  onPatch={(patch) => setMatRow(row.id, patch)}
                  onRemove={() => removeMatRow(row.id)}
                />
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-border">
            <Label htmlFor="s4-mat-rationale">Rationale / benchmark notes</Label>
            <Textarea
              id="s4-mat-rationale"
              rows={2}
              value={s4.matRationale}
              onChange={(e) => setMatRationale(e.target.value)}
              placeholder="Why these benchmarks? (e.g. 'Total Income × 0.5% for revenue cycle, Total Assets × 1% for BS items')"
            />
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════
            CARD 2 — Risk Assessment + Fraud
      ════════════════════════════════════════ */}
      <Card id={RISKS_CARD_ID} className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <CardTitle>Risk Assessment + Fraud Brainstorming (SA 315 / SA 240)</CardTitle>
              <CardDescription>
                Identify Risks of Material Misstatement (RoMM) at the FS &amp; assertion level · flag significant risks
                · response strategy
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addEmptyRisk}>
            + Add Risk
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {s4.risks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-blue-400 bg-blue-50/60 px-4 py-5 text-center">
              <div className="font-semibold text-sm text-gray-800 mb-1">No risks identified yet</div>
              <div className="text-xs text-gray-600 mb-4">
                SA 240 expects every audit to document at minimum <em>revenue recognition</em> +
                <em> management override of controls</em> as presumed fraud risks.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" onClick={addEmptyRisk}>
                  ＋ Add Empty Risk Row
                </Button>
                <Button size="sm" variant="outline" onClick={addPresumedRisks}>
                  ⚡ Quick-add SA 240 Presumed Risks (×2)
                </Button>
              </div>
              {visibleErrors[KEY_RISKS] && (
                <div className="text-xs text-red-600 font-semibold mt-3">{visibleErrors[KEY_RISKS]}</div>
              )}
            </div>
          ) : (
            s4.risks.map((r) => (
              <RiskRowItem
                key={r.id}
                row={r}
                onPatch={(patch) => setRiskRow(r.id, patch)}
                onRemove={() => removeRiskRow(r.id)}
              />
            ))
          )}
          <div className="pt-2">
            <Label htmlFor="s4-fraud-notes">Fraud-risk brainstorming session notes (SA 240 §15)</Label>
            <Textarea
              id="s4-fraud-notes"
              rows={3}
              value={s4.fraudNotes}
              onChange={(e) => setFraudNotes(e.target.value)}
              placeholder="Date of session, attendees, key concerns discussed (e.g. revenue cut-off manipulation, journal-entry override, management estimate bias)"
            />
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════
            CARD 3 — Going Concern (SA 570)
      ════════════════════════════════════════ */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">⛵</span>
            <div>
              <CardTitle>Going Concern — Preliminary Assessment (SA 570)</CardTitle>
              <CardDescription>Required initial assessment of the going-concern basis of accounting</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={errorFieldId(KEY_GC)}>Preliminary conclusion *</Label>
              <Select
                id={errorFieldId(KEY_GC)}
                value={s4.goingConcern.conclusion}
                onChange={(e) => setGc({ conclusion: e.target.value })}
                error={!!visibleErrors[KEY_GC]}
              >
                <option value="">— Select —</option>
                {S4_GC_CONCLUSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError name={KEY_GC} errors={visibleErrors} />
            </div>
            <div>
              <Label htmlFor="s4-gc-period">Management&apos;s assessment period</Label>
              <Select
                id="s4-gc-period"
                value={s4.goingConcern.period}
                onChange={(e) => setGc({ period: e.target.value })}
              >
                <option value="">— Select —</option>
                {S4_GC_PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="s4-gc-notes">Indicators identified / response notes</Label>
            <Textarea
              id="s4-gc-notes"
              rows={2}
              value={s4.goingConcern.notes}
              onChange={(e) => setGc({ notes: e.target.value })}
              placeholder="e.g. Recurring losses · Negative working capital · Loan covenant breaches · Loss of key customer / supplier · Management's mitigation plan"
            />
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════
            CARD 4 — TCWG (SA 260)
      ════════════════════════════════════════ */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">📞</span>
            <div>
              <CardTitle>TCWG Communication Plan (SA 260)</CardTitle>
              <CardDescription>
                Those Charged With Governance — communication scope, method &amp; timing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">
            <div>
              <Label htmlFor="s4-tcwg-recipients">Recipients (Audit Committee / Board / Promoters)</Label>
              <Input
                id="s4-tcwg-recipients"
                value={s4.tcwg.recipients}
                onChange={(e) => setTcwg({ recipients: e.target.value })}
                placeholder="e.g. Audit Committee Chair + 3 Independent Directors"
              />
            </div>
            <div>
              <Label htmlFor="s4-tcwg-method">Method</Label>
              <Select id="s4-tcwg-method" value={s4.tcwg.method} onChange={(e) => setTcwg({ method: e.target.value })}>
                <option value="">— Select —</option>
                {S4_TCWG_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s4-tcwg-freq">Frequency</Label>
              <Select id="s4-tcwg-freq" value={s4.tcwg.freq} onChange={(e) => setTcwg({ freq: e.target.value })}>
                <option value="">— Select —</option>
                {S4_TCWG_FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════
            CARD 5 — Specialist (SA 620)
      ════════════════════════════════════════ */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">🔬</span>
            <div>
              <CardTitle>Auditor&apos;s Expert / Specialist (SA 620)</CardTitle>
              <CardDescription>
                External or internal expert engaged for valuation, IT systems, actuarial, legal etc.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4">
            <div>
              <Label htmlFor="s4-spec-required">Specialist required?</Label>
              <Select
                id="s4-spec-required"
                value={s4.specialist.required}
                onChange={(e) => setSpec({ required: e.target.value })}
              >
                <option value="">— Select —</option>
                {S4_SPEC_REQUIRED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s4-spec-areas">Areas (comma-separated)</Label>
              <Input
                id="s4-spec-areas"
                value={s4.specialist.areas}
                onChange={(e) => setSpec({ areas: e.target.value })}
                placeholder="e.g. Property valuation, IT controls, Actuarial (gratuity)"
              />
            </div>
            <div>
              <Label htmlFor="s4-spec-name">Specialist name(s) + qualifications</Label>
              <Input
                id="s4-spec-name"
                value={s4.specialist.name}
                onChange={(e) => setSpec({ name: e.target.value })}
                placeholder="e.g. ABC Valuers LLP (RV-12345)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════
            CARD 6 — Group / Component (SA 600)
      ════════════════════════════════════════ */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">🏛</span>
            <div>
              <CardTitle>Group / Component Auditor (SA 600)</CardTitle>
              <CardDescription>
                For group audits — consolidation scope, significant components, reliance on component auditors
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="s4-grp-required">Group audit?</Label>
              <Select
                id="s4-grp-required"
                value={s4.group.required}
                onChange={(e) => setGroup({ required: e.target.value })}
              >
                <option value="">— Select —</option>
                {S4_GROUP_REQUIRED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s4-grp-components"># Components in scope</Label>
              <Input
                id="s4-grp-components"
                type="number"
                min={0}
                value={s4.group.components}
                onChange={(e) => setGroup({ components: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="s4-grp-ca">Component auditors used?</Label>
              <Select id="s4-grp-ca" value={s4.group.ca} onChange={(e) => setGroup({ ca: e.target.value })}>
                <option value="">— Select —</option>
                {S4_GROUP_CA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="s4-grp-notes">Significant components / notes</Label>
            <Input
              id="s4-grp-notes"
              value={s4.group.notes}
              onChange={(e) => setGroup({ notes: e.target.value })}
              placeholder="List significant subsidiaries / JVs / associates"
            />
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════
            CARD 7 — Audit Budget
      ════════════════════════════════════════ */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">⏱</span>
            <div>
              <CardTitle>Audit Budget — Hours per Role</CardTitle>
              <CardDescription>
                Allocate budgeted hours by role · budget-vs-actual tracking happens during execution (deferred to real
                app)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <BudgetCell label="Partner (hrs)" id="s4-budget-partner" value={s4.budget.partner} onChange={(v) => setBudget({ partner: v })} />
            <BudgetCell label="Manager (hrs)" id="s4-budget-manager" value={s4.budget.manager} onChange={(v) => setBudget({ manager: v })} />
            <BudgetCell label="Senior (hrs)" id="s4-budget-senior" value={s4.budget.senior} onChange={(v) => setBudget({ senior: v })} />
            <BudgetCell label="Associate (hrs)" id="s4-budget-associate" value={s4.budget.associate} onChange={(v) => setBudget({ associate: v })} />
            <div>
              <Label htmlFor="s4-budget-total">Total Budget (hrs)</Label>
              <Input
                id="s4-budget-total"
                readOnly
                className="bg-gray-50 font-bold"
                value={summary.budgetTotal ? `${summary.budgetTotal} hrs` : ""}
                placeholder="auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer / continue bar */}
      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3 sticky bottom-2 shadow-sm">
        <div className="text-xs">
          {submitMsg ? (
            <span className={submitMsg.kind === "ok" ? "text-green-700" : "text-red-700"}>{submitMsg.text}</span>
          ) : Object.keys(errors).length === 0 ? (
            <span className="text-gray-600">Planning artifacts complete — auto-saved · ready to continue</span>
          ) : (
            <span className="text-gray-600">
              Auto-saves as you type · Materiality + ≥1 risk + Going Concern conclusion required to proceed
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/planning/timelines")}>
            ← Back to Timelines
          </Button>
          <Button size="sm" onClick={onContinue}>
            Save &amp; Continue to GL Line Items →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Subcomponents
// ════════════════════════════════════════════════════════════════════════

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="text-center">
        <div className={`text-xl font-bold ${tone}`}>{value}</div>
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

interface MaterialityRowProps {
  row: S4MaterialityRow;
  errors: FieldErrorMap;
  onPatch: (patch: Partial<S4MaterialityRow>) => void;
  onRemove: () => void;
}

/**
 * Single materiality row. Auto-computes Overall/Perf/CT cells from the
 * row's own state — no parent recompute needed. Stable key (`row.id`) on
 * the parent loop ensures React keeps the same input DOM nodes mounted
 * across re-renders, so the user's caret position survives every keystroke.
 */
function MaterialityRowItem({ row, errors, onPatch, onRemove }: MaterialityRowProps) {
  // Auto-compute the read-only cells inline. NaN-safe via the `|| 0`
  // pattern so a single typed-then-cleared field doesn't blank out the
  // siblings (matches HTML demo's parseFloat()||0 idiom).
  const bench = s4ParseNum(row.benchmarkAmt) || 0;
  const mp = s4ParseNum(row.matPct) || 0;
  const pp = s4ParseNum(row.perfPct) || 0;
  const cp = s4ParseNum(row.ctPct) || 0;
  const overall = bench * (mp / 100);
  const perf = overall * (pp / 100);
  const ctAmt = overall * (cp / 100);

  const benchErr = errors[matRowKey(row.id, "bench")];
  const pctErr = errors[matRowKey(row.id, "pct")];
  const sectionErr = errors[matRowKey(row.id, "section")];

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-3 py-2 align-top">
        {row.isCustom ? (
          <>
            <Input
              id={`mat-section-${row.id}`}
              value={row.section}
              onChange={(e) => onPatch({ section: e.target.value })}
              placeholder="Custom section name"
              error={!!sectionErr}
            />
            {sectionErr && <div className="text-xs text-red-600 mt-1 font-medium">{sectionErr}</div>}
          </>
        ) : (
          <span className="text-sm font-medium text-gray-800">{row.section}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={0}
          step={1}
          placeholder="0"
          value={row.benchmarkAmt}
          onChange={(e) => onPatch({ benchmarkAmt: e.target.value })}
          error={!!benchErr}
        />
        {benchErr && <div className="text-xs text-red-600 mt-1 font-medium">{benchErr}</div>}
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={0.1}
          max={20}
          step={0.1}
          placeholder="5"
          value={row.matPct}
          onChange={(e) => onPatch({ matPct: e.target.value })}
          error={!!pctErr}
        />
        {pctErr && <div className="text-xs text-red-600 mt-1 font-medium">{pctErr}</div>}
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={25}
          max={90}
          step={1}
          placeholder="75"
          value={row.perfPct}
          onChange={(e) => onPatch({ perfPct: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={1}
          max={10}
          step={0.5}
          placeholder="5"
          value={row.ctPct}
          onChange={(e) => onPatch({ ctPct: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <Input readOnly className="bg-gray-50 font-medium" value={fmtRupeeCell(overall)} placeholder="—" />
      </td>
      <td className="px-3 py-2 align-top">
        <Input readOnly className="bg-gray-50 font-medium" value={fmtRupeeCell(perf)} placeholder="—" />
      </td>
      <td className="px-3 py-2 align-top">
        <Input readOnly className="bg-gray-50 font-medium" value={fmtRupeeCell(ctAmt)} placeholder="—" />
      </td>
      <td className="px-3 py-2 align-top text-center">
        <button
          type="button"
          onClick={onRemove}
          disabled={!row.isCustom}
          title={row.isCustom ? "Remove section" : "Default sections cannot be removed"}
          className="w-6 h-6 rounded-full border border-gray-200 bg-white text-gray-500 flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-200"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

/** Format a Rupee cell that's already known to be a number — keeps the
 *  read-only Overall/Perf/CT inputs uncluttered. Returns "" for 0/NaN so
 *  the placeholder shows instead of `₹ 0`. */
function fmtRupeeCell(n: number): string {
  if (!isFinite(n) || n === 0) return "";
  return "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

interface RiskRowProps {
  row: S4RiskRow;
  onPatch: (patch: Partial<S4RiskRow>) => void;
  onRemove: () => void;
}

function RiskRowItem({ row, onPatch, onRemove }: RiskRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_120px_110px_2fr_36px] gap-2 items-start p-2.5 border border-border rounded-lg bg-white">
      <Input
        id={`risk-desc-${row.id}`}
        value={row.description}
        onChange={(e) => onPatch({ description: e.target.value })}
        placeholder="Risk description (e.g. Revenue recognised before delivery)"
      />
      <Input
        value={row.area}
        onChange={(e) => onPatch({ area: e.target.value })}
        placeholder="Area (e.g. Revenue / AR)"
      />
      <Select value={row.level} onChange={(e) => onPatch({ level: e.target.value as S4RiskLevel })}>
        <option value="">— RoMM —</option>
        {S4_RISK_LEVELS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-1.5 text-xs text-gray-700 h-9 px-2">
        <Checkbox checked={row.significant} onChange={(e) => onPatch({ significant: e.target.checked })} />
        Significant
      </label>
      <Input
        value={row.response}
        onChange={(e) => onPatch({ response: e.target.value })}
        placeholder="Response / procedure"
      />
      <button
        type="button"
        onClick={onRemove}
        title="Remove risk"
        className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-600 justify-self-start md:justify-self-center mt-1 md:mt-0"
      >
        ✕
      </button>
    </div>
  );
}

interface BudgetCellProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
}

function BudgetCell({ label, id, value, onChange }: BudgetCellProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
    </div>
  );
}
