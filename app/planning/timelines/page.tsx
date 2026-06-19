"use client";

/**
 * Audit Planning — Estimated Timelines (S2).
 *
 * Port of HTML demo's screen-2. Where the HTML version is DOM-driven and
 * doesn't persist, this page reads/writes `client.s2` via the store so
 * the timeline state survives reloads and follows the active client.
 *
 * Validation lives in `lib/schemas/timelines.ts` (`makeS2Schema(signedOn)`)
 * — the schema is rebuilt every render with the active engagement signed-on
 * date so cross-screen changes to `b1.signedOn` reflow constraints here on
 * the next visit (or on the next keystroke, since the page re-reads it from
 * the store).
 *
 * Issue paths emitted by Zod are flattened into a stable error key per
 * input (`field-estCompletion`, `field-start_bs`, `field-end_bs`, etc.) so
 * the standard FieldError + scrollToFirstError plumbing keeps working
 * without modification. Native HTML `min` / `max` attrs are derived from
 * the same constraint logic to guide the date picker UX.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { S2_STATEMENT_META } from "@/lib/constants";
import {
  defaultS2Statements,
  emptyS2State,
  type S2State,
  type S2StatementEntry,
  type S2StatementId,
} from "@/lib/types";
import { makeS2Schema, s2IsSunday } from "@/lib/schemas/timelines";
import { errorFieldId, scrollToFirstError, type FieldErrorMap } from "@/lib/utils/errors";

// Stable per-input error keys. The Zod issue path is nested
// (statements[i].start) but useFieldErrors keys on the first path segment
// only — so we re-flatten here to per-field keys that match the DOM ids.
const KEY_EST = "estCompletion";
const startKey = (id: S2StatementId) => `start_${id}`;
const endKey = (id: S2StatementId) => `end_${id}`;

export default function TimelinesPage() {
  const router = useRouter();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const updateActiveS2 = useFirmStore((s) => s.updateActiveS2);
  const active = clients.find((c) => c.id === activeClientId) ?? null;

  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // Mirror the resources/clients UX: only render inline errors AFTER the
  // first Continue attempt. Cleared on the next successful mutation so
  // the user gets immediate feedback while fixing things.
  const [showErrors, setShowErrors] = useState(false);

  // Derive a working s2 state. Brand-new clients get the 4-row defaults the
  // first time they touch this page.
  const s2: S2State = useMemo(() => {
    if (!active) return emptyS2State();
    const stored = active.s2;
    if (stored && Array.isArray(stored.statements) && stored.statements.length === 4) {
      return stored;
    }
    return { estCompletion: stored?.estCompletion ?? "", statements: defaultS2Statements() };
  }, [active]);

  // Seed defaults to Dexie on first visit (mirror resources page pattern).
  useEffect(() => {
    if (!active) return;
    const stored = active.s2;
    if (stored && Array.isArray(stored.statements) && stored.statements.length === 4) return;
    void updateActiveS2(s2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const signedOn = active?.b1.signedOn ?? "";

  // ----- Validation (Zod) ------------------------------------------------
  // Rebuild the schema every render with the latest signed-on date so cross-
  // screen edits to engagement.signedOn reflow constraints here on the next
  // render (Zustand subscription triggers a re-render automatically when the
  // active client mutates).
  const schema = useMemo(() => makeS2Schema(signedOn), [signedOn]);

  const errors: FieldErrorMap = useMemo(() => {
    const out: FieldErrorMap = {};
    const result = schema.safeParse(s2);
    if (result.success) return out;
    for (const issue of result.error.issues) {
      const path = issue.path;
      let key: string | null = null;
      if (path[0] === "estCompletion") key = KEY_EST;
      else if (path[0] === "statements" && typeof path[1] === "number") {
        const idx = path[1];
        const stmt = s2.statements[idx];
        if (!stmt) continue;
        if (path[2] === "start") key = startKey(stmt.id);
        else if (path[2] === "end") key = endKey(stmt.id);
      }
      if (!key) continue;
      if (!out[key]) out[key] = issue.message;
    }
    return out;
  }, [schema, s2]);

  // ----- Mutators --------------------------------------------------------
  // Note: we deliberately DON'T flip `showErrors` back to false on every
  // edit — once the user has hit Continue, leaving errors visible lets
  // them watch reds clear field-by-field as they fix things (the `errors`
  // map is recomputed live). `submitMsg` clears so the "Resolve N issues"
  // toast doesn't stay stale.
  const mutate = (next: S2State) => {
    void updateActiveS2(next);
    if (submitMsg) setSubmitMsg(null);
  };

  const setEstCompletion = (v: string) => {
    mutate({ ...s2, estCompletion: v });
  };

  const setStmtDate = (id: S2StatementId, field: "start" | "end", v: string) => {
    const next: S2StatementEntry[] = s2.statements.map((s) =>
      s.id === id ? { ...s, [field]: v } : s
    );
    mutate({ ...s2, statements: next });
  };

  // ----- Native min/max constraints --------------------------------------
  // Mirrors HTML's s2ApplyConstraints: drives the date picker UX so users
  // can't even pick obviously-invalid dates. The schema is still the source
  // of truth — these min/max attrs are a UX nicety, not the validation.
  const estCompletionMin = signedOn || undefined;
  const constraintsFor = (idx: number): { startMin?: string; startMax?: string; endMin?: string; endMax?: string } => {
    const stmt = s2.statements[idx];
    let prevStart = "";
    for (let i = 0; i < idx; i++) {
      const ps = s2.statements[i].start;
      if (ps && ps > prevStart) prevStart = ps;
    }
    const startMin = [signedOn, prevStart].filter(Boolean).sort().slice(-1)[0] || undefined;
    const startMax = s2.estCompletion || undefined;
    const endMin = stmt.start || signedOn || undefined;
    const endMax = s2.estCompletion || undefined;
    return { startMin, startMax, endMin, endMax };
  };

  // ----- Derived summary -------------------------------------------------
  const summary = useMemo(() => {
    let complete = 0;
    let partial = 0;
    let pending = 0;
    s2.statements.forEach((s) => {
      if (s.start && s.end) complete++;
      else if (s.start || s.end) partial++;
      else pending++;
    });
    return { complete, partial, pending };
  }, [s2.statements]);

  function daysInScope(s: S2StatementEntry): string {
    if (!s.start || !s.end || s.end < s.start) return "—";
    if (s2IsSunday(s.start) || s2IsSunday(s.end)) return "—";
    const ms = new Date(s.end).getTime() - new Date(s.start).getTime();
    if (Number.isNaN(ms)) return "—";
    return `${Math.round(ms / 86400000) + 1}d`;
  }

  function statusFor(s: S2StatementEntry): "complete" | "partial" | "pending" {
    if (s.start && s.end) return "complete";
    if (s.start || s.end) return "partial";
    return "pending";
  }

  // ----- Continue --------------------------------------------------------
  const onContinue = () => {
    if (!active) return;
    const errKeys = Object.keys(errors);
    if (errKeys.length > 0) {
      setShowErrors(true);
      setSubmitMsg({
        kind: "err",
        text: `Resolve ${errKeys.length} timeline issue${errKeys.length === 1 ? "" : "s"} before continuing`,
      });
      // Slight delay so the inline errors paint before scrollToFirstError
      // queries the DOM. (errorFieldId uses the same key prefix the inputs
      // use for their id attributes.)
      window.setTimeout(() => scrollToFirstError(errors), 0);
      return;
    }
    setSubmitMsg({
      kind: "ok",
      text: `Timelines saved ✓ — all 4 statements scheduled · est. completion ${s2.estCompletion}`,
    });
    router.push("/planning/artifacts");
  };

  // ----- Empty state -----------------------------------------------------
  if (!active) {
    return (
      <div>
        <Banner
          title="Audit Planning — Estimated Timelines"
          subtitle="Per-FS-section start/end dates · Sundays excluded · Cascades from engagement acceptance signed-on date"
        />
        <Card>
          <CardContent>
            <div className="text-center py-10 text-sm text-gray-600">
              <div className="text-2xl mb-2">👈</div>
              <div className="font-medium mb-1">No active client</div>
              <div className="mb-4">Add or select a client first to begin scheduling timelines.</div>
              <Button size="sm" onClick={() => router.push("/clients")}>
                Go to Clients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleErrors: FieldErrorMap = showErrors ? errors : {};
  const allFullyDated = summary.complete === 4 && !!s2.estCompletion;

  return (
    <div>
      <Banner
        title="Audit Planning — Estimated Timelines"
        subtitle="SA 300 · Per-FS-section start/end dates · Sundays excluded · Cascades from engagement signed-on date"
        chips={[
          active.profile.currentFy
            ? { label: `📅 ${active.profile.currentFy}`, tone: "blue" }
            : { label: "📅 FY —", tone: "amber" },
          s2.estCompletion
            ? { label: `🎯 Est. ${s2.estCompletion}`, tone: "blue" }
            : { label: "🎯 Est. —", tone: "amber" },
          allFullyDated
            ? { label: "✓ All 4 statements dated", tone: "green" }
            : { label: `${summary.complete} of 4 Complete`, tone: "amber" },
        ]}
      />

      {/* SA 300 info tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 mb-5 flex gap-2">
        <span>💡</span>
        <span>
          <strong>SA 300 — Planning an Audit.</strong> Block out execution windows per FS section. Sundays are
          excluded across all date inputs. Each section&apos;s start must be on/after the previous section&apos;s
          start (overlap allowed), on/after the engagement signed-on date, and the section&apos;s end must be on/before
          the overall estimated completion date.
        </span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Fully Dated" value={summary.complete} tone="text-emerald-600" />
        <SummaryCard label="Partially Filled" value={summary.partial} tone="text-amber-600" />
        <SummaryCard label="Pending" value={summary.pending} tone="text-gray-500" />
        <SummaryCard label="In Scope" value={4} tone="text-blue-600" />
      </div>

      {!signedOn && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-5 flex gap-2">
          <span>⚠️</span>
          <span>
            <strong>No engagement signed-on date.</strong> FS start-date constraint can&apos;t be cascaded until you
            complete Engagement Acceptance (SA 210).{" "}
            <button
              type="button"
              className="underline font-semibold"
              onClick={() => router.push("/planning/engagement-acceptance")}
            >
              Go set it →
            </button>
          </span>
        </div>
      )}

      {/* Overall completion card */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <CardTitle>Estimated Completion Date</CardTitle>
              <CardDescription>
                Target date for completing the full audit engagement · {active.profile.currentFy || "FY —"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 items-end">
            <div>
              <Label htmlFor={errorFieldId(KEY_EST)}>Overall completion *</Label>
              <Input
                id={errorFieldId(KEY_EST)}
                type="date"
                value={s2.estCompletion}
                onChange={(e) => setEstCompletion(e.target.value)}
                min={estCompletionMin}
                error={!!visibleErrors[KEY_EST]}
              />
              <FieldError name={KEY_EST} errors={visibleErrors} />
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              All FS section end dates must be ≤ this date. Also bounded below by the engagement signed-on date
              {signedOn ? (
                <>
                  {" "}
                  (<code className="bg-gray-50 border border-gray-200 px-1 py-0.5 rounded">{signedOn}</code>).
                </>
              ) : (
                " (not yet set)."
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statements table card */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <CardTitle>Financial Statement Timelines</CardTitle>
              <CardDescription>
                Set start &amp; end per FS section — BS → IL → CF → EQ in sequence (overlap allowed)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5 w-10">#</th>
                <th className="px-4 py-2.5">Statement</th>
                <th className="px-4 py-2.5 w-[180px]">Start Date</th>
                <th className="px-4 py-2.5 w-[180px]">End Date</th>
                <th className="px-4 py-2.5 w-[100px]">Days in Scope</th>
                <th className="px-4 py-2.5 w-[120px] text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {s2.statements.map((stmt, idx) => {
                const meta = S2_STATEMENT_META.find((m) => m.id === stmt.id)!;
                const status = statusFor(stmt);
                const c = constraintsFor(idx);
                const sErrKey = startKey(stmt.id);
                const eErrKey = endKey(stmt.id);
                const rowBg =
                  status === "complete"
                    ? "bg-emerald-50/40"
                    : status === "partial"
                      ? "bg-amber-50/40"
                      : "bg-white";
                return (
                  <tr key={stmt.id} className={`border-b border-border ${rowBg}`}>
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-gray-400">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center text-base"
                          style={{ background: meta.iconBg }}
                        >
                          {meta.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-[13px]">{stmt.name}</div>
                          <div className="text-[11px] text-gray-500">{meta.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Input
                        id={errorFieldId(sErrKey)}
                        type="date"
                        value={stmt.start}
                        onChange={(e) => setStmtDate(stmt.id, "start", e.target.value)}
                        min={c.startMin}
                        max={c.startMax}
                        error={!!visibleErrors[sErrKey]}
                      />
                      <FieldError name={sErrKey} errors={visibleErrors} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Input
                        id={errorFieldId(eErrKey)}
                        type="date"
                        value={stmt.end}
                        onChange={(e) => setStmtDate(stmt.id, "end", e.target.value)}
                        min={c.endMin}
                        max={c.endMax}
                        error={!!visibleErrors[eErrKey]}
                      />
                      <FieldError name={eErrKey} errors={visibleErrors} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] font-bold text-gray-700">
                      {daysInScope(stmt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Footer / continue bar */}
      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3 sticky bottom-2 shadow-sm">
        <div className="text-xs">
          {submitMsg ? (
            <span className={submitMsg.kind === "ok" ? "text-green-700" : "text-red-700"}>{submitMsg.text}</span>
          ) : allFullyDated ? (
            <span className="text-gray-600">✓ All 4 statements dated · est. completion {s2.estCompletion}</span>
          ) : (
            <span className="text-gray-600">
              {summary.complete} complete · {summary.partial} partial · {summary.pending} pending
              {!s2.estCompletion && " · overall completion missing"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/planning/resources")}>
            ← Back to Resources
          </Button>
          <Button size="sm" onClick={onContinue}>
            Save &amp; Continue to Planning Artifacts →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----- Subcomponents -------------------------------------------------------

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card>
      <CardContent className="text-center">
        <div className={`text-2xl font-bold ${tone}`}>{value}</div>
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "complete" | "partial" | "pending" }) {
  const map = {
    complete: { label: "Complete", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    partial: { label: "Partial", className: "bg-amber-100 text-amber-700 border-amber-200" },
    pending: { label: "Pending", className: "bg-gray-100 text-gray-600 border-gray-200" },
  } as const;
  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
