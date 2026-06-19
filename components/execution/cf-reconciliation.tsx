"use client";

/** Cash Flow reconciliation — thin wrapper over the generic ReconStatement. */

import { useMemo } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { CF_LINES, CF_LEAF, rollupAutoCF, cfValue } from "@/lib/execution/cf-lines";
import { ReconStatement } from "./recon-statement";

const DEMO_CLIENT: Record<string, string> = {
  "op-pbt": "10615", "op-depn": "1400", "op-finance": "830", "op-interest-income": "-200",
  "op-wc-ar": "-520", "op-wc-inv": "-340", "op-wc-ap": "410", "op-tax": "-760",
  "inv-capex": "-2200", "inv-proceeds": "150", "inv-invest": "-500", "inv-interest": "210",
  "fin-borrow": "1200", "fin-lease": "-300", "fin-equity": "0", "fin-interest-paid": "-830", "fin-dividend": "-500",
  "opening-cash": "1250",
};

export function CFReconciliation() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updateCFRecon);
  const { autoByLine, glsByLine } = useMemo(() => rollupAutoCF(active?.execution), [active?.execution]);

  if (!active) return <div style={{ padding: 24, color: "#8A96B0", fontSize: 13 }}>Add or select a client first.</div>;
  const recon = active.cfRecon ?? { clientLine: {}, clientGL: {}, comments: {} };

  return (
    <ReconStatement
      title="Cash Flow Statement — Connected GL Reconciliation (Ind AS 7, Indirect)"
      description="AUTO is generated live: Profit Before Tax from the P&L roll-up, plus non-cash add-backs (depreciation, finance cost) and tax from the Connected-GL amounts. Working-capital & investing/financing movements are keyed by you. Inflows positive, outflows negative. Upload / key the client cash-flow to compare; click any row to investigate at GL level."
      lines={CF_LINES}
      leafKeys={CF_LEAF}
      valueOf={cfValue}
      autoByLine={autoByLine}
      glsByLine={glsByLine}
      recon={recon}
      onClientLine={(k, v) => void update({ clientLine: { [k]: v } })}
      onClientGL={(a, v) => void update({ clientGL: { [a]: v } })}
      onComment={(k, v) => void update({ comments: { [k]: v } })}
      onLoadDemo={() => void update({ clientLine: DEMO_CLIENT })}
      demoLabel="Upload Cash Flow (demo)"
      bottomKey="net-change"
      bottomLabel="Net Cash"
    />
  );
}
