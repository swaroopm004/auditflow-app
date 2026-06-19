"use client";

/** Statement of Changes in Equity — thin wrapper over the generic ReconStatement. */

import { useMemo } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { EQ_LINES, EQ_LEAF, rollupAutoEQ, eqValue } from "@/lib/execution/eq-lines";
import { ReconStatement } from "./recon-statement";

const DEMO_CLIENT: Record<string, string> = {
  "eq-opening": "15000", "eq-profit": "10490", "eq-oci": "50", "eq-shares": "500",
  "eq-buyback": "0", "eq-dividend": "-500", "eq-other": "0",
};

export function EQReconciliation() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updateEQRecon);
  const { autoByLine, glsByLine } = useMemo(() => rollupAutoEQ(active?.execution), [active?.execution]);

  if (!active) return <div style={{ padding: 24, color: "#8A96B0", fontSize: 13 }}>Add or select a client first.</div>;
  const recon = active.eqRecon ?? { clientLine: {}, clientGL: {}, comments: {} };

  return (
    <ReconStatement
      title="Statement of Changes in Equity — Reconciliation (Ind AS 1)"
      description="AUTO is generated live: Profit for the Year from the P&L roll-up (PAT) and OCI from Connected-GL amounts. Opening equity and capital transactions (share issue, buyback, dividends) are keyed by you. Increases positive, reductions negative. Upload / key the client SOCIE to compare; click any row to investigate at GL level."
      lines={EQ_LINES}
      leafKeys={EQ_LEAF}
      valueOf={eqValue}
      autoByLine={autoByLine}
      glsByLine={glsByLine}
      recon={recon}
      onClientLine={(k, v) => void update({ clientLine: { [k]: v } })}
      onClientGL={(a, v) => void update({ clientGL: { [a]: v } })}
      onComment={(k, v) => void update({ comments: { [k]: v } })}
      onLoadDemo={() => void update({ clientLine: DEMO_CLIENT })}
      demoLabel="Upload SOCIE (demo)"
      bottomKey="eq-closing"
      bottomLabel="Closing Equity"
    />
  );
}
