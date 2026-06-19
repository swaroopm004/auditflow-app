"use client";

/**
 * Execution module landing page — 4 FS cards (BS / PL / CF / EQ).
 * Drills into /execution/[fsId] which lists templates for that FS.
 */

import Link from "next/link";
import { Banner } from "@/components/layout/banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirmStore } from "@/lib/store/firmStore";
import { EXEC_FS_LABELS, EXEC_REGISTRY } from "@/lib/execution/defaults";
import type { FsId, TemplateStatus } from "@/lib/types";

const FS_ORDER: FsId[] = ["bs", "pl", "cf", "eq"];
const FS_ICONS: Record<FsId, string> = { bs: "🏦", pl: "📈", cf: "💵", eq: "⚖️" };
const FS_DESC: Record<FsId, string> = {
  bs: "Balance Sheet items — PPE, AR, Investments, Loans, Prepaid, Inventory",
  pl: "Income statement items — Revenue, Other Expenses",
  cf: "Cash flow — Operating, Investing, Financing",
  eq: "Statement of Changes in Equity",
};

function statusCounts(
  templates: Record<string, { status: TemplateStatus }> | undefined,
  fsId: FsId
) {
  const ids = EXEC_REGISTRY[fsId].map((t) => t.id);
  const total = ids.length;
  let complete = 0;
  for (const id of ids) {
    if (templates?.[id]?.status === "complete") complete++;
  }
  return { complete, total };
}

export default function ExecutionLandingPage() {
  const active = useFirmStore((s) => s.getActiveClient());
  const templates = active?.execution?.templates;

  return (
    <div className="space-y-4">
      <Banner
        title="Execution"
        subtitle="Working papers — Balance Sheet · Profit & Loss · Cash Flow · Equity. Sign off a template to mark it complete; signoff back-flows into Planning GL Line Items."
        chips={[
          { label: active ? `Client: ${active.profile.entityName || "Untitled"}` : "No client", tone: "blue" },
        ]}
      />

      {!active && (
        <Card>
          <CardContent className="text-sm text-gray-600 py-6 text-center">
            Add or select a client first to begin Execution working papers.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {FS_ORDER.map((fsId) => {
          const { complete, total } = statusCounts(templates, fsId);
          return (
            <Link key={fsId} href={`/execution/${fsId}`} className="block group">
              <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-blue-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{FS_ICONS[fsId]}</span>
                      <span>{EXEC_FS_LABELS[fsId]}</span>
                    </CardTitle>
                    <span
                      className={
                        complete === total && total > 0
                          ? "text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : complete > 0
                            ? "text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                            : "text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200"
                      }
                    >
                      {complete}/{total} signed off
                    </span>
                  </div>
                  <CardDescription>{FS_DESC[fsId]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-500">
                    {EXEC_REGISTRY[fsId].length} template
                    {EXEC_REGISTRY[fsId].length !== 1 ? "s" : ""}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
