"use client";

/**
 * Fraud & Error Postmortem (SA 240). Collapsible fraud-indicator cards with
 * case studies, JE signatures, live detection ratios, audit procedures and a
 * Clear / Investigate / Escalate verdict per indicator feeding a risk-score
 * summary. Verdicts, remarks & ratio inputs persist on ClientRecord.postmortem.
 */

import { useState } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { INDICATORS, type Indicator, type IndTone } from "@/lib/postmortem/indicators";
import type { PostmortemState, PostmortemVerdict } from "@/lib/types";

const EMPTY: PostmortemState = { verdicts: {}, remarks: {}, ratios: {} };
const TONE: Record<IndTone, { bg: string; bd: string; text: string }> = {
  red: { bg: "bg-red-50", bd: "border-red-200", text: "text-red-700" },
  amber: { bg: "bg-amber-50", bd: "border-amber-200", text: "text-amber-700" },
  accent: { bg: "bg-blue-50", bd: "border-blue-200", text: "text-blue-700" },
  green: { bg: "bg-emerald-50", bd: "border-emerald-200", text: "text-emerald-700" },
  purple: { bg: "bg-violet-50", bd: "border-violet-200", text: "text-violet-700" },
};
const pc = (s: string | undefined) => parseFloat(String(s ?? "").replace(/[^0-9.\-]/g, "")) || 0;

export function PostmortemBoard() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updatePostmortem);
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (!active) return <div className="text-sm text-gray-500 py-6">Add or select a client first.</div>;
  const pm = active.postmortem ?? EMPTY;

  const counts = { escalate: 0, flag: 0, clear: 0, pending: 0 };
  for (const ind of INDICATORS) {
    const v = pm.verdicts[ind.id];
    if (v === "escalate") counts.escalate++;
    else if (v === "flag") counts.flag++;
    else if (v === "clear") counts.clear++;
    else counts.pending++;
  }
  const riskScore = Math.min(100, Math.round((counts.escalate * 100 + counts.flag * 50) / INDICATORS.length));

  const setVerdict = (id: string, v: PostmortemVerdict) => update({ verdicts: { [id]: pm.verdicts[id] === v ? ("" as PostmortemVerdict) : v } });
  const setRatio = (id: string, val: string) => update({ ratios: { [id]: val } });
  const setRemark = (id: string, val: string) => update({ remarks: { [id]: val } });
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const loadDemo = () => {
    const ratios: Record<string, string> = {};
    const verdicts: Record<string, PostmortemVerdict> = {};
    for (const ind of INDICATORS) for (const r of ind.ratios) { ratios[`${r.id}-num`] = "180"; ratios[`${r.id}-den`] = "1000"; }
    verdicts["i1"] = "escalate"; verdicts["i3"] = "flag"; verdicts["i5"] = "clear"; verdicts["i14"] = "flag";
    update({ ratios, verdicts });
  };

  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          ["🔴 Escalate", counts.escalate, "text-red-600"],
          ["🟠 Investigate", counts.flag, "text-amber-600"],
          ["✅ Clear", counts.clear, "text-emerald-600"],
          ["🔵 Pending", counts.pending, "text-blue-600"],
          ["🟣 Risk Score", riskScore, riskScore >= 50 ? "text-red-600" : riskScore >= 20 ? "text-amber-600" : "text-emerald-600"],
        ] as const).map(([label, val, color]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{val}{label.includes("Risk") ? "/100" : ""}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-gray-500 max-w-2xl">SA 240 — {INDICATORS.length} fraud & error indicators. Enter GL values to compute the detection ratios, review the journal-entry signatures, and record a verdict per indicator. Verdicts drive the risk score.</p>
        <button onClick={loadDemo} className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">⚡ Load Demo</button>
      </div>

      {/* indicator cards */}
      <div className="space-y-2.5">
        {INDICATORS.map((ind) => (
          <IndicatorCard key={ind.id} ind={ind} pm={pm} open={open.has(ind.id)} onToggle={() => toggle(ind.id)}
            setVerdict={setVerdict} setRatio={setRatio} setRemark={setRemark} />
        ))}
      </div>
    </div>
  );
}

function IndicatorCard({ ind, pm, open, onToggle, setVerdict, setRatio, setRemark }: {
  ind: Indicator; pm: PostmortemState; open: boolean; onToggle: () => void;
  setVerdict: (id: string, v: PostmortemVerdict) => void; setRatio: (id: string, v: string) => void; setRemark: (id: string, v: string) => void;
}) {
  const t = TONE[ind.tone];
  const verdict = pm.verdicts[ind.id];
  const pill = verdict === "escalate" ? "bg-red-100 text-red-700" : verdict === "flag" ? "bg-amber-100 text-amber-700" : verdict === "clear" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500";
  const pillLabel = verdict === "escalate" ? "Escalate" : verdict === "flag" ? "Investigate" : verdict === "clear" ? "Clear" : "Pending";

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button onClick={onToggle} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 ${t.bg} border-b ${t.bd}`}>
        <span className="text-lg">{ind.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-bold ${t.text}`}>{ind.code} — {ind.title}</div>
          <div className="text-[11px] text-gray-600 truncate">{ind.subtitle}</div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill} whitespace-nowrap`}>{pillLabel}</span>
        <span className="text-gray-400 text-xs">{open ? "▾" : "›"}</span>
      </button>

      {open && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {ind.impacts.map((c) => <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{c}</span>)}
            {ind.sources.map((c) => <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-500">📂 {c}</span>)}
          </div>

          {ind.caseStudy && (
            <div className="rounded-lg bg-gray-900 text-gray-100 p-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{ind.caseStudy.tag}</div>
              <div className="text-sm font-bold mt-0.5">{ind.caseStudy.title}</div>
              <p className="text-[11.5px] text-gray-300 mt-1 leading-relaxed">{ind.caseStudy.body}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ind.caseStudy.chips.map((c) => <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10 text-amber-300">{c}</span>)}
              </div>
            </div>
          )}

          {/* JE signature */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 px-3 py-1.5 bg-gray-50 border-b border-gray-200">Journal-Entry Signature</div>
            <table className="w-full text-xs">
              <tbody>
                {ind.je.lines.map((l, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className={`px-3 py-1.5 ${l.side === "Dr" ? "font-semibold text-emerald-700" : "text-gray-600 pl-6"}`}>{l.side === "Cr" && !l.label.startsWith("To ") ? "" : ""}{l.label}</td>
                    <td className="px-3 py-1.5 text-right text-[10px] uppercase text-gray-400 w-10">{l.side}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] text-red-700 bg-red-50 px-3 py-1.5 border-t border-red-100">🔴 {ind.je.redFlag}</div>
          </div>

          {/* ratios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {ind.ratios.map((r) => {
              const num = pc(pm.ratios[`${r.id}-num`]); const den = pc(pm.ratios[`${r.id}-den`]);
              const res = den ? (num / den) * 100 : null;
              return (
                <div key={r.id} className="rounded-lg border border-gray-200 p-2.5 bg-gray-50/50">
                  <div className="text-[11px] font-semibold text-gray-700">{r.label}</div>
                  <div className="flex items-end gap-2 mt-1.5">
                    <div className="flex-1">
                      <label className="text-[9px] text-gray-500">{r.numLabel}</label>
                      <input value={pm.ratios[`${r.id}-num`] ?? ""} onChange={(e) => setRatio(`${r.id}-num`, e.target.value)} type="number" className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-mono" />
                    </div>
                    <div className="text-gray-400 pb-1.5">÷</div>
                    <div className="flex-1">
                      <label className="text-[9px] text-gray-500">{r.denLabel}</label>
                      <input value={pm.ratios[`${r.id}-den`] ?? ""} onChange={(e) => setRatio(`${r.id}-den`, e.target.value)} type="number" className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-mono" />
                    </div>
                    <div className="pb-0.5 w-20 text-right">
                      <div className={`text-base font-bold font-mono ${res != null ? "text-gray-900" : "text-gray-300"}`}>{res != null ? res.toFixed(1) + "%" : "—"}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{r.benchmark}</div>
                </div>
              );
            })}
          </div>

          {/* procedures */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Audit Procedures</div>
            <ul className="space-y-1">
              {ind.procedures.map((p, i) => <li key={i} className="text-[11.5px] text-gray-700 flex gap-1.5"><span className="text-gray-400">▸</span>{p}</li>)}
            </ul>
          </div>

          {/* remarks + verdict */}
          <textarea value={pm.remarks[ind.id] ?? ""} onChange={(e) => setRemark(ind.id, e.target.value)} rows={2}
            placeholder="Auditor's finding & remarks — quantify if possible…" className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:border-blue-400" />
          <div className="flex gap-2">
            <Vbtn active={verdict === "clear"} onClick={() => setVerdict(ind.id, "clear")} cls="emerald">✓ Clear</Vbtn>
            <Vbtn active={verdict === "flag"} onClick={() => setVerdict(ind.id, "flag")} cls="amber">⚠ Investigate</Vbtn>
            <Vbtn active={verdict === "escalate"} onClick={() => setVerdict(ind.id, "escalate")} cls="red">🔴 Escalate</Vbtn>
          </div>
        </div>
      )}
    </div>
  );
}

function Vbtn({ active, onClick, cls, children }: { active: boolean; onClick: () => void; cls: "emerald" | "amber" | "red"; children: React.ReactNode }) {
  const map = {
    emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
    amber: active ? "bg-amber-500 text-white border-amber-500" : "border-amber-300 text-amber-700 hover:bg-amber-50",
    red: active ? "bg-red-600 text-white border-red-600" : "border-red-300 text-red-700 hover:bg-red-50",
  }[cls];
  return <button onClick={onClick} className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${map}`}>{children}</button>;
}
