"use client";

/**
 * Audit Planning — GL Line Items (S3) · LAST step in the Planning lifecycle.
 *
 * Per-FS tabs (BS / IL / CF / EQ); each FS holds many GL rows grouped by
 * section. Per row the user defines audit scope: include in scope, which
 * testing areas, who reviews, on what team, and when. The Completed toggle +
 * Completion Date auto-fill from the Execution Reviewer Signoff (D1) when
 * the matching template is signed off. Submit-for-Approval at the bottom
 * closes out the Planning lifecycle and is gated on the four earlier steps.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  defaultS3GLRows,
  s3SectionsFor,
  S3_FS_META,
} from "@/lib/planning/s3-defaults";
import {
  deriveS3RowStatus,
  emptyS3State,
  S3_TESTING_AREA_LABELS,
  type ClientRecord,
  type S3FsId,
  type S3GLRow,
  type S3State,
  type TeamRecord,
} from "@/lib/types";
import { s4ParseNum } from "@/lib/schemas/artifacts";
import { cn } from "@/lib/utils";

const FS_ORDER: S3FsId[] = ["bs", "il", "cf", "eq"];

// ----- Prerequisite check (same as before, unchanged) ---------------------
interface PrereqResult {
  key: string;
  label: string;
  ok: boolean;
  href: string;
  detail: string;
}
function s1HasQualifyingTeam(client: ClientRecord): boolean {
  const teams = client.s1?.teams ?? [];
  if (teams.length === 0) return false;
  return teams.some((t) => {
    const namedP = (t.members?.partner ?? []).filter((m) => m.name.trim()).length;
    const namedS = (t.members?.senior ?? []).filter((m) => m.name.trim()).length;
    return namedP >= 1 && namedS >= 1;
  });
}
function s2IsComplete(client: ClientRecord): boolean {
  const s2 = client.s2;
  if (!s2 || !s2.estCompletion) return false;
  const stmts = s2.statements ?? [];
  if (stmts.length < 4) return false;
  return stmts.every((s) => !!s.start && !!s.end);
}
function s4IsComplete(client: ClientRecord): boolean {
  const s4 = client.s4;
  if (!s4) return false;
  const completeMat = (s4.materiality ?? []).some(
    (r) => s4ParseNum(r.benchmarkAmt) > 0 && s4ParseNum(r.matPct) > 0
  );
  if (!completeMat) return false;
  if (!s4.goingConcern?.conclusion) return false;
  if ((s4.risks ?? []).length < 1) return false;
  return true;
}
function computePrereqs(client: ClientRecord): PrereqResult[] {
  return [
    { key: "b1", label: "Engagement Acceptance", detail: "Decision must be Accept (SA 210)", ok: client.b1.decision === "accept", href: "/planning/engagement-acceptance" },
    { key: "s1", label: "Resources", detail: "≥1 team with a named Partner + Senior", ok: s1HasQualifyingTeam(client), href: "/planning/resources" },
    { key: "s2", label: "Estimated Timelines", detail: "Overall completion + start/end for BS / IL / CF / EQ", ok: s2IsComplete(client), href: "/planning/timelines" },
    { key: "s4", label: "Planning Artifacts", detail: "Materiality + Going-Concern conclusion + ≥1 risk", ok: s4IsComplete(client), href: "/planning/artifacts" },
  ];
}

function fmtSubmittedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Derive Reviewer + Team option lists from the active client's s1.teams.
 *  Reviewers = all named members across teams (with role suffix);
 *  Teams = the team names themselves. Falls back to placeholder if no
 *  qualifying team is configured. */
function deriveAssignmentOptions(teams: TeamRecord[] | undefined) {
  const reviewers: string[] = [];
  const teamNames: string[] = [];
  if (!teams) return { reviewers, teamNames };
  for (const t of teams) {
    teamNames.push(t.name);
    for (const role of ["partner", "manager", "senior", "associate"] as const) {
      for (const m of t.members[role] ?? []) {
        if (m.name.trim()) {
          const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
          reviewers.push(`${m.name.trim()} (${roleLabel})`);
        }
      }
    }
  }
  return { reviewers, teamNames };
}

// ----- Page ----------------------------------------------------------------

export default function PlanningGlItemsPage() {
  const router = useRouter();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const updateActiveS3 = useFirmStore((s) => s.updateActiveS3);
  const active = clients.find((c) => c.id === activeClientId) ?? null;

  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [activeFs, setActiveFs] = useState<S3FsId>("bs");

  // Build a stable working S3 state. New (or pre-refactor) clients get the
  // full default GL row list seeded; submitted state preserved if present.
  const s3: S3State = useMemo(() => {
    if (!active) return emptyS3State();
    const stored = active.s3;
    if (stored && Array.isArray(stored.glRows) && stored.glRows.length > 0) return stored;
    return {
      glRows: defaultS3GLRows(),
      submittedAt: stored?.submittedAt ?? null,
      submittedBy: stored?.submittedBy ?? "",
    };
  }, [active]);

  // Persist seeded state on first visit / refactor migration.
  useEffect(() => {
    if (!active) return;
    const stored = active.s3;
    if (stored && Array.isArray(stored.glRows) && stored.glRows.length > 0) return;
    void updateActiveS3(s3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const { reviewers, teamNames } = useMemo(
    () => deriveAssignmentOptions(active?.s1?.teams),
    [active?.s1?.teams]
  );

  // ----- Mutators ---------------------------------------------------------
  const mutateRow = (rowId: string, patch: Partial<S3GLRow>) => {
    const next: S3State = {
      ...s3,
      glRows: s3.glRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    };
    void updateActiveS3(next);
    if (submitMsg) setSubmitMsg(null);
  };

  // ----- Derived ----------------------------------------------------------
  const prereqs = useMemo(() => (active ? computePrereqs(active) : []), [active]);
  const missingPrereqs = prereqs.filter((p) => !p.ok);
  const allPrereqsMet = active != null && missingPrereqs.length === 0;
  const isSubmitted = !!s3.submittedAt;

  // Per-FS totals for the summary bar / tab badges
  const totalsByFs = useMemo(() => {
    const out: Record<S3FsId, { total: number; inScope: number; complete: number }> = {
      bs: { total: 0, inScope: 0, complete: 0 },
      il: { total: 0, inScope: 0, complete: 0 },
      cf: { total: 0, inScope: 0, complete: 0 },
      eq: { total: 0, inScope: 0, complete: 0 },
    };
    for (const r of s3.glRows) {
      out[r.fsId].total++;
      if (r.inScope) out[r.fsId].inScope++;
      if (r.completed) out[r.fsId].complete++;
    }
    return out;
  }, [s3.glRows]);

  const grandTotal = s3.glRows.length;
  const totalInScope = s3.glRows.filter((r) => r.inScope).length;
  const totalComplete = s3.glRows.filter((r) => r.completed).length;

  // ----- Actions ---------------------------------------------------------
  const onSubmit = () => {
    if (!active) return;
    if (!allPrereqsMet) {
      setSubmitMsg({
        kind: "err",
        text: `${missingPrereqs.length} earlier step${missingPrereqs.length === 1 ? "" : "s"} incomplete — see banner above`,
      });
      return;
    }
    const next: S3State = {
      ...s3,
      submittedAt: new Date().toISOString(),
      submittedBy: active.b1.signedBy || "",
    };
    void updateActiveS3(next);
    setSubmitMsg({
      kind: "ok",
      text: `Planning submitted for approval ✓${next.submittedBy ? ` — signed by ${next.submittedBy}` : ""}`,
    });
  };
  const onReset = () => {
    if (!active || !isSubmitted) return;
    const next: S3State = { ...s3, submittedAt: null, submittedBy: "" };
    void updateActiveS3(next);
    setSubmitMsg({ kind: "ok", text: "Submission reset — planning is editable again" });
  };

  // ----- Empty state -----------------------------------------------------
  if (!active) {
    return (
      <div>
        <Banner
          title="Audit Planning — GL Line Items"
          subtitle="Final Planning step · Define audit scope per GL line + Submit-for-Approval"
        />
        <Card>
          <CardContent className="text-center py-10 text-sm text-gray-600">
            <div className="text-2xl mb-2">👈</div>
            <div className="font-medium mb-1">No active client</div>
            <div className="mb-4">Add or select a client first to view the GL templates.</div>
            <Button size="sm" onClick={() => router.push("/clients")}>
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----- Render ----------------------------------------------------------
  const statusChip = isSubmitted
    ? { label: `✅ Submitted on ${fmtSubmittedDate(s3.submittedAt!)}`, tone: "green" as const }
    : { label: "⏳ Not Submitted", tone: "amber" as const };

  const submitDisabledTitle = !allPrereqsMet
    ? `Complete: ${missingPrereqs.map((p) => p.label).join(" · ")}`
    : isSubmitted
      ? "Already submitted — use Reset to un-submit"
      : "";

  return (
    <div>
      <Banner
        title="Audit Planning — GL Line Items"
        subtitle="Final Planning step — define audit scope per GL line · status auto-fills from Execution Reviewer Signoff (D1)"
        chips={[
          active.profile.currentFy
            ? { label: `📅 ${active.profile.currentFy}`, tone: "blue" }
            : { label: "📅 FY —", tone: "amber" },
          statusChip,
        ]}
      />

      {/* D1 + D2 banners (compact, combined) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <div className="bg-amber-50 border border-amber-200 border-dashed rounded-lg p-3 text-[11px] text-amber-900 flex gap-2">
          <span>🔗</span>
          <span>
            <strong>D1 — Auto-fill:</strong> Completion toggle + date + signed-off-by auto-fill from Execution
            → Variance Check tab. Match key = <code>templateId</code> on each row.
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-200 border-dashed rounded-lg p-3 text-[11px] text-amber-900 flex gap-2">
          <span>🔗</span>
          <span>
            <strong>D2 — Reference amounts:</strong> IL / CF / EQ reference amounts derive from BS GL Connected GLs
            in Execution. Lands in Milestone E3.
          </span>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Total GL Lines" value={String(grandTotal)} tone="text-blue-600" />
        <SummaryCard label="In Scope" value={String(totalInScope)} tone="text-emerald-600" />
        <SummaryCard label="Signed Off" value={String(totalComplete)} tone="text-green-700" />
        <SummaryCard
          label="Lifecycle"
          value={isSubmitted ? "Submitted" : allPrereqsMet ? "Ready" : "Earlier Steps"}
          tone={isSubmitted ? "text-emerald-600" : allPrereqsMet ? "text-blue-600" : "text-amber-600"}
        />
      </div>

      {/* Prerequisite banner */}
      {!isSubmitted && missingPrereqs.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50/40">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <CardTitle>Earlier Planning Steps Incomplete</CardTitle>
                <CardDescription>
                  Submit-for-Approval is gated on the four earlier steps · jump to any incomplete step
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {prereqs.map((p) => (
              <div
                key={p.key}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-white",
                  p.ok ? "border-emerald-200" : "border-amber-200"
                )}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-sm">{p.ok ? "✅" : "⏳"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800">{p.label}</div>
                    <div className="text-[11px] text-gray-500">{p.detail}</div>
                  </div>
                </div>
                {!p.ok && (
                  <Button size="sm" variant="outline" onClick={() => router.push(p.href)}>
                    Go to {p.label} →
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submitted banner */}
      {isSubmitted && (
        <Card className="mb-4 border-emerald-300 bg-emerald-50/60">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-start gap-2">
              <span className="text-xl">✅</span>
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Planning submitted for approval{s3.submittedBy && ` — signed by ${s3.submittedBy}`}
                </div>
                <div className="text-[11px] text-emerald-800/80 mt-0.5">
                  Submitted on {fmtSubmittedDate(s3.submittedAt!)}. GL data review continues in the Execution module.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-emerald-900 underline underline-offset-2 hover:text-emerald-700"
            >
              Reset Submission
            </button>
          </CardContent>
        </Card>
      )}

      {/* FS Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-3">
        {FS_ORDER.map((fs) => {
          const meta = S3_FS_META[fs];
          const t = totalsByFs[fs];
          return (
            <button
              key={fs}
              onClick={() => setActiveFs(fs)}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
                activeFs === fs
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              <span>{meta.icon}</span>
              <span>{meta.shortName}</span>
              <span className="text-[10px] text-gray-500 ml-1">
                {t.complete}/{t.inScope}/{t.total}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500 mb-2 ml-1">Tab badges: signed-off / in-scope / total</p>

      {/* Active FS table */}
      <GLTable
        fsId={activeFs}
        rows={s3.glRows.filter((r) => r.fsId === activeFs)}
        reviewers={reviewers}
        teamNames={teamNames}
        onUpdate={mutateRow}
        readonly={isSubmitted}
      />

      {/* Sticky footer */}
      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3 sticky bottom-2 shadow-sm mt-4">
        <div className="text-xs">
          {submitMsg ? (
            <span className={submitMsg.kind === "ok" ? "text-green-700" : "text-red-700"}>
              {submitMsg.text}
            </span>
          ) : isSubmitted ? (
            <span className="text-emerald-700">
              ✓ Submitted on {fmtSubmittedDate(s3.submittedAt!)} · use Reset to un-submit
            </span>
          ) : allPrereqsMet ? (
            <span className="text-gray-700">All earlier steps complete — ready to Submit for Approval</span>
          ) : (
            <span className="text-gray-600">
              {missingPrereqs.length} earlier step{missingPrereqs.length === 1 ? "" : "s"} incomplete — Submit disabled
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/planning/artifacts")}>
            ← Back to Planning Artifacts
          </Button>
          {isSubmitted ? (
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset Submission
            </Button>
          ) : (
            <Button size="sm" onClick={onSubmit} disabled={!allPrereqsMet} title={submitDisabledTitle}>
              ✅ Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

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

function GLTable({
  fsId,
  rows,
  reviewers,
  teamNames,
  onUpdate,
  readonly,
}: {
  fsId: S3FsId;
  rows: S3GLRow[];
  reviewers: string[];
  teamNames: string[];
  onUpdate: (id: string, patch: Partial<S3GLRow>) => void;
  readonly: boolean;
}) {
  const sections = s3SectionsFor(fsId);
  const testingLabels = S3_TESTING_AREA_LABELS[fsId];
  const isBS = fsId === "bs";

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-2 w-8">#</th>
              <th className="text-left py-2 px-2 min-w-[180px]">Description</th>
              <th className="text-left py-2 px-2 w-24">Acct Code</th>
              <th className="text-right py-2 px-2 w-28">Balance (₹)</th>
              {!isBS && <th className="text-right py-2 px-2 w-28">Reference (₹)</th>}
              <th className="text-center py-2 px-2 w-16">Scope</th>
              <th className="text-left py-2 px-2 min-w-[180px]">Testing Areas</th>
              <th className="text-left py-2 px-2 w-32">Testing Due</th>
              <th className="text-left py-2 px-2 w-40">Reviewer</th>
              <th className="text-left py-2 px-2 w-32">Review Due</th>
              <th className="text-left py-2 px-2 w-28">Team</th>
              <th className="text-center py-2 px-2 w-20">Completed</th>
              <th className="text-left py-2 px-2 w-28">Compl. Date</th>
              <th className="text-center py-2 px-2 w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec, sIdx) => {
              const secRows = rows.filter((r) => r.section === sec);
              return (
                <Section
                  key={sec}
                  label={sec}
                  rows={secRows}
                  startIdx={rows.findIndex((r) => r.section === sec) + 1}
                  testingLabels={testingLabels}
                  reviewers={reviewers}
                  teamNames={teamNames}
                  isBS={isBS}
                  onUpdate={onUpdate}
                  readonly={readonly}
                  colSpan={isBS ? 14 : 15}
                  sIdx={sIdx}
                />
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Section({
  label,
  rows,
  startIdx,
  testingLabels,
  reviewers,
  teamNames,
  isBS,
  onUpdate,
  readonly,
  colSpan,
}: {
  label: string;
  rows: S3GLRow[];
  startIdx: number;
  testingLabels: readonly string[];
  reviewers: string[];
  teamNames: string[];
  isBS: boolean;
  onUpdate: (id: string, patch: Partial<S3GLRow>) => void;
  readonly: boolean;
  colSpan: number;
  sIdx: number;
}) {
  return (
    <>
      <tr className="bg-slate-100">
        <td colSpan={colSpan} className="py-1.5 px-3 text-[10px] uppercase tracking-wider font-bold text-slate-600">
          {label}
        </td>
      </tr>
      {rows.map((row, i) => (
        <GLRow
          key={row.id}
          row={row}
          idx={startIdx + i}
          testingLabels={testingLabels}
          reviewers={reviewers}
          teamNames={teamNames}
          isBS={isBS}
          onUpdate={onUpdate}
          readonly={readonly}
        />
      ))}
    </>
  );
}

function GLRow({
  row,
  idx,
  testingLabels,
  reviewers,
  teamNames,
  isBS,
  onUpdate,
  readonly,
}: {
  row: S3GLRow;
  idx: number;
  testingLabels: readonly string[];
  reviewers: string[];
  teamNames: string[];
  isBS: boolean;
  onUpdate: (id: string, patch: Partial<S3GLRow>) => void;
  readonly: boolean;
}) {
  const status = deriveS3RowStatus(row);
  const lockedByScope = !row.inScope || readonly;
  const lockedByCompletion = row.completed; // D1 has flipped this; don't let user edit

  const statusMeta = {
    pending: { label: "Pending", classes: "bg-gray-100 text-gray-700 border-gray-200" },
    "in-scope": { label: "In Scope", classes: "bg-blue-50 text-blue-700 border-blue-200" },
    "in-progress": { label: "In Progress", classes: "bg-amber-50 text-amber-700 border-amber-200" },
    complete: { label: "Complete", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  }[status];

  return (
    <tr className={cn("border-t border-gray-100 hover:bg-gray-50/50", row.completed && "bg-emerald-50/30")}>
      <td className="py-1.5 px-2 text-[10px] text-gray-500 font-mono align-top pt-2">
        {String(idx).padStart(2, "0")}
      </td>
      <td className="py-1.5 px-2 align-top">
        <div className="text-[12px] font-semibold text-gray-800">{row.description}</div>
        <div className="text-[10px] text-gray-500">{row.subDescription}</div>
        {row.templateId && (
          <Link
            href={`/execution/${row.fsId === "il" ? "pl" : row.fsId}/${row.templateId.split("-").slice(1).join("-")}`}
            className="text-[10px] text-blue-600 hover:underline mt-0.5 inline-block"
            title="Open in Execution"
          >
            🔗 {row.templateId}
          </Link>
        )}
      </td>
      <td className="py-1.5 px-2 align-top">
        <input
          type="text"
          value={row.accountCode}
          onChange={(e) => onUpdate(row.id, { accountCode: e.target.value })}
          className="w-full text-[12px] font-mono px-1.5 py-1 rounded border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          disabled={readonly}
          placeholder="—"
        />
      </td>
      <td className="py-1.5 px-2 align-top">
        <input
          type="text"
          value={row.balance}
          onChange={(e) => onUpdate(row.id, { balance: e.target.value })}
          className="w-full text-[12px] font-mono text-right px-1.5 py-1 rounded border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          disabled={readonly}
          placeholder="0"
        />
      </td>
      {!isBS && (
        <td className="py-1.5 px-2 align-top">
          <input
            type="text"
            value={row.referenceAmt}
            onChange={(e) => onUpdate(row.id, { referenceAmt: e.target.value })}
            className="w-full text-[12px] font-mono text-right px-1.5 py-1 rounded border border-gray-200 bg-gray-50 text-gray-500 focus:outline-none"
            disabled
            placeholder="(D2)"
            title="Reference amount — populated by D2 from BS Connected GLs"
          />
        </td>
      )}
      <td className="py-1.5 px-2 align-top text-center">
        <ToggleSwitch
          checked={row.inScope}
          onChange={(v) => onUpdate(row.id, { inScope: v })}
          disabled={readonly || lockedByCompletion}
        />
        <div className="text-[10px] text-gray-500 mt-0.5">{row.inScope ? "Yes" : "No"}</div>
      </td>
      <td className="py-1.5 px-2 align-top">
        <div className="space-y-0.5">
          {(["a", "b", "c"] as const).map((key, k) => (
            <label
              key={key}
              className={cn(
                "flex items-center gap-1 text-[10.5px] cursor-pointer",
                lockedByScope && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                type="checkbox"
                checked={row.testingAreas[key]}
                onChange={(e) =>
                  onUpdate(row.id, {
                    testingAreas: { ...row.testingAreas, [key]: e.target.checked },
                  })
                }
                disabled={lockedByScope || lockedByCompletion}
                className="h-3 w-3"
              />
              {testingLabels[k]}
            </label>
          ))}
        </div>
      </td>
      <td className="py-1.5 px-2 align-top">
        <input
          type="date"
          value={row.testingDue}
          onChange={(e) => onUpdate(row.id, { testingDue: e.target.value })}
          className="w-full text-[11px] px-1.5 py-1 rounded border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          disabled={lockedByScope || lockedByCompletion}
        />
      </td>
      <td className="py-1.5 px-2 align-top">
        <select
          value={row.reviewer}
          onChange={(e) => onUpdate(row.id, { reviewer: e.target.value })}
          className="w-full text-[11px] px-1.5 py-1 rounded border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          disabled={lockedByScope || lockedByCompletion}
        >
          <option value="">Assign…</option>
          {reviewers.length === 0 && row.reviewer && <option value={row.reviewer}>{row.reviewer}</option>}
          {reviewers.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 px-2 align-top">
        <input
          type="date"
          value={row.reviewDue}
          onChange={(e) => onUpdate(row.id, { reviewDue: e.target.value })}
          className="w-full text-[11px] px-1.5 py-1 rounded border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          disabled={lockedByScope || lockedByCompletion}
        />
      </td>
      <td className="py-1.5 px-2 align-top">
        <select
          value={row.team}
          onChange={(e) => onUpdate(row.id, { team: e.target.value })}
          className="w-full text-[11px] px-1.5 py-1 rounded border border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          disabled={lockedByScope || lockedByCompletion}
        >
          <option value="">Team…</option>
          {teamNames.length === 0 && row.team && <option value={row.team}>{row.team}</option>}
          {teamNames.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 px-2 align-top text-center" title={row.completed ? "Set by D1 (Execution signoff)" : "Auto-fills from Execution signoff"}>
        <ToggleSwitch
          checked={row.completed}
          onChange={() => {}}
          disabled
          tone="green"
        />
      </td>
      <td className="py-1.5 px-2 align-top text-[10.5px] text-gray-700">
        {row.completionDate ? fmtSubmittedDate(row.completionDate).split(",")[0] : "—"}
      </td>
      <td className="py-1.5 px-2 align-top text-center">
        <span
          className={cn(
            "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
            statusMeta.classes
          )}
        >
          {statusMeta.label}
        </span>
      </td>
    </tr>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  tone = "blue",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  tone?: "blue" | "green";
}) {
  const onColor = tone === "green" ? "bg-emerald-500" : "bg-blue-500";
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        checked ? onColor : "bg-gray-300",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
