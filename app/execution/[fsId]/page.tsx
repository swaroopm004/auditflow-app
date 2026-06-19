"use client";

/**
 * FS overview page — lists all templates under a single financial statement.
 * Each template card links to /execution/[fsId]/[templateKey]. Shows per-template
 * signoff status sourced from the active client's execution state.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirmStore } from "@/lib/store/firmStore";
import { EXEC_FS_LABELS, EXEC_REGISTRY } from "@/lib/execution/defaults";
import { PLReconciliation } from "@/components/execution/pl-reconciliation";
import { CFReconciliation } from "@/components/execution/cf-reconciliation";
import { EQReconciliation } from "@/components/execution/eq-reconciliation";
import type { FsId } from "@/lib/types";

const FS_ICONS: Record<FsId, string> = { bs: "🏦", pl: "📈", cf: "💵", eq: "⚖️" };
const VALID_FS: FsId[] = ["bs", "pl", "cf", "eq"];

export default function FsOverviewPage() {
  const params = useParams<{ fsId: string }>();
  const fsId = params.fsId as FsId;

  if (!VALID_FS.includes(fsId)) notFound();

  const active = useFirmStore((s) => s.getActiveClient());
  const templates = active?.execution?.templates ?? {};

  const meta = useMemo(() => EXEC_REGISTRY[fsId] ?? [], [fsId]);

  // Profit & Loss is a reconciliation/variance statement (its "separate working"),
  // not a list of per-GL templates — AUTO rolls up from the BS templates' Connected GLs.
  if (fsId === "pl" || fsId === "cf" || fsId === "eq") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/execution">← Back to Execution</Link>
        </Button>
        {fsId === "pl" ? <PLReconciliation /> : fsId === "cf" ? <CFReconciliation /> : <EQReconciliation />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Banner
        title={`${FS_ICONS[fsId]}  ${EXEC_FS_LABELS[fsId]}`}
        subtitle={`Working papers under ${EXEC_FS_LABELS[fsId]}. Click a template to open its 4-tab worksheet (Connected GLs · Journal Entries · Assertions · Variance Check).`}
        chips={[
          { label: `${meta.length} template${meta.length !== 1 ? "s" : ""}`, tone: "blue" },
        ]}
      />

      <Button variant="ghost" size="sm" asChild>
        <Link href="/execution">← Back to Execution</Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meta.map((t) => {
          const tpl = templates[t.id];
          const isSigned = !!tpl?.reviewerSignoff;
          const isStub = !t.hasFullImpl;
          return (
            <Link key={t.id} href={`/execution/${fsId}/${t.key}`} className="block group">
              <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-blue-300">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <CardDescription className="mt-0.5 text-[11px] font-mono text-gray-500">
                        {t.framework}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isSigned ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Signed off
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                          Pending
                        </span>
                      )}
                      {isStub && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          stub
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">{t.caption}</p>
                  {isSigned && tpl?.reviewerSignoff && (
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      Signed off by <strong>{tpl.reviewerSignoff.reviewerName}</strong> on{" "}
                      {new Date(tpl.reviewerSignoff.signedAt).toLocaleString("en-IN")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
