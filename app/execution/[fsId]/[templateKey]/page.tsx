"use client";

/**
 * Template detail page. 4 tabs (Connected GLs · Journal Entries · Assertions ·
 * Variance Check). The Variance Check tab carries the "Sign Off Template" CTA
 * which invokes `signOffTemplate(templateId, reviewerName)` — this is the D1
 * back-flow: the corresponding Planning S3 template row flips to "complete"
 * with the same `signedOffAt` / `signedOffBy`.
 *
 * Only `bs-ppe` has full content seeded today. Other templates render as
 * "Coming soon" stubs but still seed their record in execution state so the
 * URL/route structure is stable.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter, notFound } from "next/navigation";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useFirmStore } from "@/lib/store/firmStore";
import { TemplateTabs, type PpeTabKey } from "@/components/execution/ppe-tabs";
import { TEMPLATE_CONTENT, hasRichContent, lifecycleSeedFor } from "@/lib/execution/template-content";
import { cn, uid } from "@/lib/utils";
import {
  defaultTemplateFor,
  findTemplateMeta,
  EXEC_FS_LABELS,
  varPct,
} from "@/lib/execution/defaults";
import type {
  ExecGLLine,
  ExecJournalEntry,
  ExecAssertion,
  ExecutionTemplate,
  FsId,
  ImprovementCard,
} from "@/lib/types";

const VALID_FS: FsId[] = ["bs", "pl", "cf", "eq"];
type TabKey = "entries" | "depnDT" | "connected" | "assertions" | "variance" | "improvements";
type TabDef = { key: TabKey; label: string; icon: string };
const BASE_TABS: TabDef[] = [
  { key: "entries", label: "Lifecycle JEs", icon: "📖" },
  { key: "connected", label: "Connected GLs", icon: "🔗" },
  { key: "assertions", label: "Audit Assertions", icon: "✓" },
  { key: "variance", label: "Variance Check", icon: "📊" },
  { key: "improvements", label: "Additional Checks", icon: "💡" },
];
const DEPN_DT_TAB: TabDef = { key: "depnDT", label: "Depreciation & DT", icon: "⚙️" };
/** Inserts the Depreciation & DT calculator tab (after Lifecycle JEs) when the template opts in. */
function tabsFor(hasDepnCalc?: boolean): TabDef[] {
  if (!hasDepnCalc) return BASE_TABS;
  return [BASE_TABS[0], DEPN_DT_TAB, ...BASE_TABS.slice(1)];
}

export default function TemplateDetailPage() {
  const params = useParams<{ fsId: string; templateKey: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const fsId = params.fsId as FsId;
  const templateKey = params.templateKey;
  if (!VALID_FS.includes(fsId)) notFound();

  const meta = useMemo(() => findTemplateMeta(fsId, templateKey), [fsId, templateKey]);
  if (!meta) notFound();

  const tab = (search.get("tab") as TabKey) || "entries";

  const active = useFirmStore((s) => s.getActiveClient());
  const upsert = useFirmStore((s) => s.upsertExecutionTemplate);
  const signOff = useFirmStore((s) => s.signOffTemplate);
  const resetSignoff = useFirmStore((s) => s.resetTemplateSignoff);

  const existing = active?.execution?.templates[meta.id];
  // First-visit: seed default template into execution state once per (client × template).
  // Intentionally narrow deps: re-seeding only matters when the active client or template
  // identity changes, not on every store-driven re-render.
  useEffect(() => {
    if (!active || existing) return;
    void upsert(defaultTemplateFor(meta));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, meta.id]);

  // Working copy (controlled) — fall back to seeded default while async upsert resolves
  const tpl: ExecutionTemplate = existing ?? defaultTemplateFor(meta);

  // Rich (finalised-format) templates: lifecycle stages live in the store and
  // are editable/persisted. Detect records seeded before the multi-line JE shape
  // (missing stages, or entries without a `lines` array) and self-heal by
  // re-seeding from the per-template content (preserving everything else).
  const isRich = hasRichContent(meta.id);
  const richSeed = useMemo(() => (isRich ? lifecycleSeedFor(meta.id) : []), [meta.id, isRich]);
  const richStale =
    isRich &&
    (() => {
      const st = tpl.lifecycleStages;
      if (!st || st.length === 0) return true;
      const first = st[0]?.entries?.[0] as { lines?: unknown } | undefined;
      return !first || !Array.isArray(first.lines);
    })();
  const richStages = isRich ? (richStale ? richSeed : tpl.lifecycleStages!) : [];

  useEffect(() => {
    if (isRich && existing && richStale) {
      void upsert({ ...existing, lifecycleStages: richSeed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, richStale]);

  const [signOffOpen, setSignOffOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState("");

  if (!active) {
    return (
      <div className="space-y-4">
        <Banner title={meta.name} subtitle="Add or select a client first." chips={[]} />
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/execution/${fsId}`}>← Back to {EXEC_FS_LABELS[fsId]}</Link>
        </Button>
      </div>
    );
  }

  // ---------- Mutators -----------------------------------------------------
  const persist = (next: ExecutionTemplate) => void upsert(next);

  const updateGLLine = (lineId: string, patch: Partial<ExecGLLine>) => {
    persist({
      ...tpl,
      glLines: tpl.glLines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    });
  };
  const addGLLine = () => {
    persist({
      ...tpl,
      glLines: [...tpl.glLines, { id: uid("gl"), label: "", bookAmt: "", tbAmt: "", notes: "" }],
    });
  };
  const removeGLLine = (lineId: string) => {
    persist({ ...tpl, glLines: tpl.glLines.filter((l) => l.id !== lineId) });
  };

  const updateJE = (jeId: string, patch: Partial<ExecJournalEntry>) => {
    persist({
      ...tpl,
      journalEntries: tpl.journalEntries.map((j) => (j.id === jeId ? { ...j, ...patch } : j)),
    });
  };
  const addJE = () => {
    persist({
      ...tpl,
      journalEntries: [
        ...tpl.journalEntries,
        { id: uid("je"), description: "", dr: "", cr: "", amount: "" },
      ],
    });
  };
  const removeJE = (jeId: string) => {
    persist({ ...tpl, journalEntries: tpl.journalEntries.filter((j) => j.id !== jeId) });
  };

  const updateAssertion = (asId: string, patch: Partial<ExecAssertion>) => {
    persist({
      ...tpl,
      assertions: tpl.assertions.map((a) => (a.id === asId ? { ...a, ...patch } : a)),
    });
  };

  // ---------- Signoff (D1) -------------------------------------------------
  const isSigned = !!tpl.reviewerSignoff;

  const onConfirmSignOff = async () => {
    const name = reviewerName.trim();
    if (!name) return;
    await signOff(tpl.id, name);
    setSignOffOpen(false);
    setReviewerName("");
  };
  const onResetSignOff = async () => {
    await resetSignoff(tpl.id);
  };

  const setTab = (next: TabKey) => {
    router.replace(`/execution/${fsId}/${templateKey}?tab=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <Banner
        title={meta.name}
        subtitle={meta.caption}
        chips={[
          { label: meta.framework, tone: "blue" },
          {
            label: isSigned ? `✓ Signed off (${tpl.reviewerSignoff!.reviewerName})` : "⏳ Pending signoff",
            tone: isSigned ? "green" : "amber",
          },
        ]}
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/execution/${fsId}`}>← Back to {EXEC_FS_LABELS[fsId]}</Link>
        </Button>
        {!isSigned && (
          <Button size="sm" onClick={() => setTab("variance")}>
            Go to Variance Check → Sign Off
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabsFor(meta.hasDepnCalc).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      {isRich ? (
        <TemplateTabs
          tab={tab as PpeTabKey}
          name={meta.name}
          templateId={meta.id}
          content={TEMPLATE_CONTENT[meta.id]}
          stages={richStages}
          onStagesChange={(stages) => persist({ ...tpl, lifecycleStages: stages })}
          checkStatus={tpl.checkStatus ?? {}}
          onSetStatus={(id, val) => {
            const next = { ...(tpl.checkStatus ?? {}) };
            if (val) next[id] = val;
            else delete next[id];
            persist({ ...tpl, checkStatus: next });
          }}
          connData={tpl.connectedData ?? {}}
          onSetConn={(account, patch) =>
            persist({
              ...tpl,
              connectedData: {
                ...(tpl.connectedData ?? {}),
                [account]: { ...(tpl.connectedData?.[account] ?? {}), ...patch },
              },
            })
          }
          isSigned={isSigned}
          signoffName={tpl.reviewerSignoff?.reviewerName}
          signoffAt={tpl.reviewerSignoff?.signedAt}
          onOpenSignOff={() => setSignOffOpen(true)}
          onResetSignOff={onResetSignOff}
        />
      ) : (
        <>
          {!meta.hasFullImpl && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-gray-600">
                <div className="text-3xl mb-2">🚧</div>
                <div className="font-medium mb-1">{meta.name} — coming in Milestone E2/E3/E4</div>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Template registered and routable; full implementation is staged after the PPE
                  pattern (E1) is validated. Sign-off is available on this stub for D1 testing.
                </p>
              </CardContent>
            </Card>
          )}

          {tab === "connected" && (
            <ConnectedGLsTab
              tpl={tpl}
              onUpdateLine={updateGLLine}
              onAddLine={addGLLine}
              onRemoveLine={removeGLLine}
              readonly={!meta.hasFullImpl}
            />
          )}
          {tab === "entries" && (
            <JournalEntriesTab
              tpl={tpl}
              onUpdate={updateJE}
              onAdd={addJE}
              onRemove={removeJE}
              readonly={!meta.hasFullImpl}
            />
          )}
          {tab === "assertions" && (
            <AssertionsTab tpl={tpl} onUpdate={updateAssertion} />
          )}
          {tab === "variance" && (
            <VarianceTab
              tpl={tpl}
              isSigned={isSigned}
              onOpenSignOff={() => setSignOffOpen(true)}
              onResetSignOff={onResetSignOff}
            />
          )}
          {tab === "improvements" && <ImprovementsTab tpl={tpl} />}
        </>
      )}

      {/* Sign Off Dialog */}
      <ConfirmDialog
        open={signOffOpen}
        title={`Sign off ${meta.name}?`}
        description="Signing off marks this template complete and flips the corresponding Balance Sheet row in Planning → GL Line Items to 'Complete' (the D1 back-flow). You can reset the signoff later."
        confirmLabel="Sign Off"
        cancelLabel="Cancel"
        onCancel={() => {
          setSignOffOpen(false);
          setReviewerName("");
        }}
        onConfirm={onConfirmSignOff}
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Reviewer name *</label>
          <Input
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="e.g. CA Priya Sharma"
            autoFocus
          />
          <p className="text-[11px] text-gray-500">
            Recorded as <code>signedOffBy</code> on both the Execution template and the linked Planning row.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

// ============================ Tab components ============================

function ConnectedGLsTab({
  tpl,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  readonly,
}: {
  tpl: ExecutionTemplate;
  onUpdateLine: (id: string, patch: Partial<ExecGLLine>) => void;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  readonly: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Connected GL Lines</CardTitle>
            <CardDescription>
              GL accounts under this template. Variance % auto-computed from Book vs Trial Balance.
              Variance &gt; 0.5% flagged red.
            </CardDescription>
          </div>
          {!readonly && (
            <Button size="sm" onClick={onAddLine}>
              + Add GL Line
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tpl.glLines.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No GL lines yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b">
                  <th className="py-2 pr-2">GL Account</th>
                  <th className="py-2 px-2 w-28">Book (₹)</th>
                  <th className="py-2 px-2 w-28">TB (₹)</th>
                  <th className="py-2 px-2 w-20">Var %</th>
                  <th className="py-2 px-2">Notes</th>
                  {!readonly && <th className="py-2 w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {tpl.glLines.map((line) => {
                  const v = varPct(line.bookAmt, line.tbAmt);
                  const flag = Math.abs(v) > 0.5;
                  return (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2">
                        <Input
                          value={line.label}
                          onChange={(e) => onUpdateLine(line.id, { label: e.target.value })}
                          placeholder="GL account name"
                          className="h-8"
                          disabled={readonly}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <Input
                          type="number"
                          value={line.bookAmt}
                          onChange={(e) => onUpdateLine(line.id, { bookAmt: e.target.value })}
                          placeholder="0"
                          className="h-8 text-right font-mono"
                          disabled={readonly}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <Input
                          type="number"
                          value={line.tbAmt}
                          onChange={(e) => onUpdateLine(line.id, { tbAmt: e.target.value })}
                          placeholder="0"
                          className="h-8 text-right font-mono"
                          disabled={readonly}
                        />
                      </td>
                      <td
                        className={cn(
                          "py-1.5 px-2 text-right font-mono text-xs",
                          flag ? "text-red-600 font-semibold" : "text-gray-600"
                        )}
                      >
                        {line.bookAmt && line.tbAmt ? `${v.toFixed(2)}%` : "—"}
                      </td>
                      <td className="py-1.5 px-2">
                        <Input
                          value={line.notes ?? ""}
                          onChange={(e) => onUpdateLine(line.id, { notes: e.target.value })}
                          placeholder="optional"
                          className="h-8"
                          disabled={readonly}
                        />
                      </td>
                      {!readonly && (
                        <td className="py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveLine(line.id)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                            aria-label="Remove line"
                          >
                            ✕
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JournalEntriesTab({
  tpl,
  onUpdate,
  onAdd,
  onRemove,
  readonly,
}: {
  tpl: ExecutionTemplate;
  onUpdate: (id: string, patch: Partial<ExecJournalEntry>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  readonly: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>
              Representative journal entries for this template. Use as audit reference / trace.
            </CardDescription>
          </div>
          {!readonly && (
            <Button size="sm" onClick={onAdd}>
              + Add JE
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tpl.journalEntries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No journal entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b">
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 px-2">Dr</th>
                  <th className="py-2 px-2">Cr</th>
                  <th className="py-2 px-2 w-28">Amount (₹)</th>
                  {!readonly && <th className="py-2 w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {tpl.journalEntries.map((je) => (
                  <tr key={je.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">
                      <Input
                        value={je.description}
                        onChange={(e) => onUpdate(je.id, { description: e.target.value })}
                        className="h-8"
                        disabled={readonly}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        value={je.dr}
                        onChange={(e) => onUpdate(je.id, { dr: e.target.value })}
                        className="h-8"
                        disabled={readonly}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        value={je.cr}
                        onChange={(e) => onUpdate(je.id, { cr: e.target.value })}
                        className="h-8"
                        disabled={readonly}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="number"
                        value={je.amount}
                        onChange={(e) => onUpdate(je.id, { amount: e.target.value })}
                        className="h-8 text-right font-mono"
                        disabled={readonly}
                      />
                    </td>
                    {!readonly && (
                      <td className="py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(je.id)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                          aria-label="Remove entry"
                        >
                          ✕
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssertionsTab({
  tpl,
  onUpdate,
}: {
  tpl: ExecutionTemplate;
  onUpdate: (id: string, patch: Partial<ExecAssertion>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Assertions</CardTitle>
        <CardDescription>
          Standard FS-level assertions. Tick when evidence has been gathered for that assertion;
          add procedure notes inline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tpl.assertions.map((a) => (
          <div key={a.id} className="flex gap-3 items-start p-3 rounded-md border border-gray-200">
            <input
              type="checkbox"
              checked={a.covered}
              onChange={(e) => onUpdate(a.id, { covered: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
              aria-label={`Covered: ${a.label}`}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{a.label}</div>
              <Textarea
                value={a.notes}
                onChange={(e) => onUpdate(a.id, { notes: e.target.value })}
                placeholder="Procedures performed, evidence references…"
                rows={2}
                className="mt-1.5 text-xs"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function VarianceTab({
  tpl,
  isSigned,
  onOpenSignOff,
  onResetSignOff,
}: {
  tpl: ExecutionTemplate;
  isSigned: boolean;
  onOpenSignOff: () => void;
  onResetSignOff: () => void | Promise<void>;
}) {
  // Group GL lines into the canonical variance groups for this template
  // (currently uses the template's pre-seeded varianceChecks meta).
  // diffPct here is computed from the GL lines associated with each group label
  // by substring match (cheap heuristic for E1; later groups can be configurable).
  const groupSummaries = tpl.varianceChecks.map((g) => {
    const matching = tpl.glLines.filter((l) => l.label.toLowerCase().includes(g.groupLabel.toLowerCase().split(" ")[0]));
    const bookSum = matching.reduce((s, l) => s + (parseFloat(l.bookAmt) || 0), 0);
    const tbSum = matching.reduce((s, l) => s + (parseFloat(l.tbAmt) || 0), 0);
    const diff = tbSum === 0 ? 0 : ((bookSum - tbSum) / tbSum) * 100;
    return { ...g, diffPct: diff, count: matching.length };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Variance Check — by Group</CardTitle>
          <CardDescription>
            Aggregates the per-GL-line variances by category. Sign off when satisfied that all
            variances are explained.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupSummaries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No variance groups configured for this template.</p>
          ) : (
            <div className="space-y-2">
              {groupSummaries.map((g) => {
                const flag = Math.abs(g.diffPct) > 0.5;
                return (
                  <div
                    key={g.groupLabel}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md border",
                      flag ? "border-red-300 bg-red-50" : "border-gray-200"
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium">{g.groupLabel}</div>
                      <div className="text-[11px] text-gray-500">{g.count} GL line{g.count !== 1 ? "s" : ""}</div>
                    </div>
                    <div className={cn("text-sm font-mono", flag ? "text-red-700 font-semibold" : "text-gray-700")}>
                      {g.count > 0 ? `${g.diffPct.toFixed(2)}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={isSigned ? "border-emerald-300 bg-emerald-50/40" : "border-blue-200"}>
        <CardHeader>
          <CardTitle>
            {isSigned ? "✓ Reviewer Signoff (recorded)" : "Reviewer Signoff"}
          </CardTitle>
          <CardDescription>
            {isSigned
              ? `Signed off by ${tpl.reviewerSignoff!.reviewerName} on ${new Date(
                  tpl.reviewerSignoff!.signedAt
                ).toLocaleString("en-IN")}.`
              : "Signing off this template marks it complete in Execution AND flips the matching FS row in Planning → GL Line Items to 'Complete' (D1 cross-module back-flow)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSigned ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onResetSignOff}>
                Reset Signoff
              </Button>
              <Link
                href="/planning/gl-items"
                className="text-xs text-blue-600 hover:underline"
              >
                See Planning → GL Line Items (D1 mirror) →
              </Link>
            </div>
          ) : (
            <Button onClick={onOpenSignOff}>Sign Off Template</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================ Improvements tab ============================

function ImprovementsTab({ tpl }: { tpl: ExecutionTemplate }) {
  const cards = tpl.improvements ?? [];
  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-600">
          <div className="text-2xl mb-2">💡</div>
          <div className="font-medium mb-1">No improvement points yet</div>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Audit-procedure cards specific to this template will appear here. Deep-ported templates (e.g. PPE)
            seed improvement points from canonical Indian audit practice.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Checks</CardTitle>
        <CardDescription>
          Audit procedures + verification checklist for this template. Each card maps to a standard procedure
          drawn from Ind AS / SA / Companies Act / Income Tax practice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.map((c) => (
          <ImprovementItem key={c.id} card={c} />
        ))}
      </CardContent>
    </Card>
  );
}

const CATEGORY_BADGE: Record<string, string> = {
  Verification: "bg-blue-50 text-blue-700 border-blue-200",
  Procedure: "bg-violet-50 text-violet-700 border-violet-200",
  Compliance: "bg-amber-50 text-amber-800 border-amber-200",
};

function ImprovementItem({ card }: { card: ImprovementCard }) {
  const badgeClass = card.category
    ? CATEGORY_BADGE[card.category] ?? "bg-gray-50 text-gray-700 border-gray-200"
    : "";
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-semibold text-gray-900">{card.title}</div>
        {card.category && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold whitespace-nowrap", badgeClass)}>
            {card.category}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-700 leading-relaxed">{card.body}</p>
    </div>
  );
}
