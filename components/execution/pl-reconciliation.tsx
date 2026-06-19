"use client";

/** P&L reconciliation — thin wrapper over the generic ReconStatement. */

import { useMemo } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { PL_LINES, LEAF_LINES, rollupAuto, lineValue } from "@/lib/execution/pl-lines";
import { ReconStatement } from "./recon-statement";

const DEMO_CLIENT: Record<string, string> = {
  revenue: "26200", "other-income": "1050", cogs: "12500", employee: "950",
  finance: "830", depreciation: "1400", "other-exp": "320", tax: "760", oci: "0",
};

export function PLReconciliation() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updatePLRecon);
  const { autoByLine, glsByLine } = useMemo(() => rollupAuto(active?.execution), [active?.execution]);

  if (!active) return <div style={{ padding: 24, color: "#8A96B0", fontSize: 13 }}>Add or select a client first.</div>;
  const recon = active.plRecon ?? { clientLine: {}, clientGL: {}, comments: {} };

  return (
    <ReconStatement
      title="Profit &amp; Loss — Connected GL Reconciliation"
      description="AUTO amounts roll up live from the Connected-GL working amounts in the Execution GL templates (classified to P&L lines). Upload / key the client P&L to compare. Click any row to drill down to the underlying GLs."
      lines={PL_LINES}
      leafKeys={LEAF_LINES}
      valueOf={lineValue}
      autoByLine={autoByLine}
      glsByLine={glsByLine}
      recon={recon}
      onClientLine={(k, v) => void update({ clientLine: { [k]: v } })}
      onClientGL={(a, v) => void update({ clientGL: { [a]: v } })}
      onComment={(k, v) => void update({ comments: { [k]: v } })}
      onLoadDemo={() => void update({ clientLine: DEMO_CLIENT })}
      demoLabel="Upload P&L (demo)"
      bottomKey="pat"
      bottomLabel="PAT"
    />
  );
}
