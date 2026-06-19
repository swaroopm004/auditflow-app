"use client";

/**
 * Generic financial-statement reconciliation table (used by both the P&L and
 * Cash Flow reconciliations). Renders AUTO (generated) vs CLIENT (uploaded/keyed)
 * with per-line variance, GL-level drill-down for investigation, and a reviewer
 * comment per line. Statement-specific line model, AUTO roll-up and persistence
 * are injected by the caller.
 */

import { useState } from "react";

export type ReconKind = "income" | "expense" | "subtotal" | "result";
export interface ReconLine { key: string; label: string; kind: ReconKind }
export interface ReconGLRow { templateName: string; account: string; auto: number }
export interface ReconState { clientLine: Record<string, string>; clientGL: Record<string, string>; comments: Record<string, string> }

const C = {
  ppe: "#065F46", green: "#059669", greenLt: "#ECFDF5", greenMed: "#6EE7B7",
  amber: "#D97706", amberLt: "#FFFBEB", amberMed: "#FDE68A",
  red: "#DC2626", redLt: "#FEF2F2", accent: "#2563EB", purple: "#7C3AED",
  text: "#1A2540", text2: "#4A5773", muted: "#8A96B0",
  border: "#DDE3EE", surface2: "#F0F4FA",
  mono: "'DM Mono', ui-monospace, monospace",
};

export const pcNum = (s: string | number | undefined) =>
  parseFloat(String(s ?? "").replace(/[^0-9.\-]/g, "")) || 0;

const fmt = (n: number) =>
  n < 0
    ? `(${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
    : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cellInput: React.CSSProperties = {
  width: 110, height: 28, fontSize: 12, fontFamily: C.mono, textAlign: "right",
  border: `1.5px solid ${C.border}`, borderRadius: 6, padding: "0 8px", outline: "none", background: "#fff",
};

export interface ReconStatementProps {
  title: string;
  description: string;
  lines: ReconLine[];
  leafKeys: string[];
  valueOf: (key: string, leaf: Record<string, number>) => number;
  autoByLine: Record<string, number>;
  glsByLine: Record<string, ReconGLRow[]>;
  recon: ReconState;
  onClientLine: (key: string, v: string) => void;
  onClientGL: (account: string, v: string) => void;
  onComment: (key: string, v: string) => void;
  onLoadDemo: () => void;
  demoLabel: string;
  bottomKey: string;
  bottomLabel: string;
}

export function ReconStatement(p: ReconStatementProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const clientLeaf: Record<string, number> = {};
  for (const k of p.leafKeys) clientLeaf[k] = pcNum(p.recon.clientLine[k]);

  const auto = (k: string) => p.valueOf(k, p.autoByLine);
  const client = (k: string) => p.valueOf(k, clientLeaf);
  const diff = (k: string) => client(k) - auto(k);

  const linesWithDiff = p.leafKeys.filter((k) => Math.abs(diff(k)) > 0.005);
  const bottomImpact = client(p.bottomKey) - auto(p.bottomKey);
  const affected = p.lines.filter((l) => p.leafKeys.includes(l.key) && Math.abs(diff(l.key)) > 0.005).map((l) => l.label);

  const toggle = (k: string) => setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const investigateAll = () =>
    setExpanded(linesWithDiff.every((k) => expanded.has(k)) ? new Set() : new Set(linesWithDiff));

  return (
    <div style={{ fontFamily: "var(--font, 'DM Sans', sans-serif)" }}>
      <div style={{ background: "linear-gradient(135deg,#1A2540,#1E3A8A)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{p.title}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)", marginTop: 3 }}>{p.description}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, background: C.amberLt, border: `1px solid ${C.amberMed}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <Stat label="LINES WITH DIFF" value={String(linesWithDiff.length)} tone={linesWithDiff.length ? C.amber : C.green} />
        <Stat label={`${p.bottomLabel} IMPACT`} value={`₹${fmt(bottomImpact)}L`} tone={Math.abs(bottomImpact) > 0.005 ? C.amber : C.green} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textAlign: "center" }}>AFFECTED LINES</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, textAlign: "center", marginTop: 4, lineHeight: 1.4 }}>{affected.length ? affected.join(", ") : "—"}</div>
        </div>
        <Stat label={`CLIENT ${p.bottomLabel} vs AUTO`} value={`₹${fmt(bottomImpact)}L`} tone={C.purple} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={p.onLoadDemo} style={btn(C.surface2, C.text2, C.border)}>⬆ {p.demoLabel}</button>
          <button onClick={investigateAll} style={btn(C.amber, "#fff", C.amber)}>🔍 Investigate All</button>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 150px 90px", gap: 8, padding: "10px 16px", background: C.text }}>
          {["Line", "Auto (₹L)", "Client (₹L)", "Diff (₹L)", "Status"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "rgba(255,255,255,.55)", textAlign: i === 0 ? "left" : "right" }}>{h}</div>
          ))}
        </div>

        {p.lines.map((l) => {
          const a = auto(l.key), cl = client(l.key), d = diff(l.key);
          const isLeaf = p.leafKeys.includes(l.key);
          const isTotal = l.kind === "subtotal" || l.kind === "result";
          const flagged = isLeaf && Math.abs(d) > 0.005;
          const rowBg = isTotal ? "#EEF2FB" : flagged ? "#FFF8F0" : "#fff";
          const gls = p.glsByLine[l.key] ?? [];
          const open = expanded.has(l.key);
          return (
            <div key={l.key}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 150px 90px", gap: 8, alignItems: "center", padding: "9px 16px", borderBottom: `1px solid ${C.border}`, background: rowBg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isLeaf && (
                    <button onClick={() => toggle(l.key)} title="Investigate variance at GL level" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, fontSize: 12, width: 14 }}>{open ? "▾" : "›"}</button>
                  )}
                  <span style={{ fontSize: 12.5, fontWeight: isTotal ? 800 : 600, color: isTotal ? C.text : C.text2, marginLeft: isLeaf ? 0 : 20 }}>{l.label}</span>
                </div>
                <div style={{ textAlign: "right", fontFamily: C.mono, fontSize: 12.5, fontWeight: isTotal ? 800 : 500, color: C.text }}>{fmt(a)}</div>
                <div style={{ textAlign: "right" }}>
                  {isLeaf
                    ? <input value={p.recon.clientLine[l.key] ?? ""} onChange={(e) => p.onClientLine(l.key, e.target.value)} placeholder="0.00" type="number" style={cellInput} />
                    : <span style={{ fontFamily: C.mono, fontSize: 12.5, fontWeight: 800, color: C.text }}>{fmt(cl)}</span>}
                </div>
                <div style={{ textAlign: "right", fontFamily: C.mono, fontSize: 12.5, fontWeight: isTotal ? 800 : 600, color: Math.abs(d) < 0.005 ? C.muted : d < 0 ? C.red : C.green }}>
                  {Math.abs(d) < 0.005 ? "—" : (d > 0 ? "+" : "") + fmt(d)}
                </div>
                <div style={{ textAlign: "right" }}>
                  {flagged
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, background: C.amberLt, border: `1px solid ${C.amberMed}`, borderRadius: 10, padding: "2px 7px", whiteSpace: "nowrap" }}>▲ {a ? Math.abs((d / a) * 100).toFixed(1) : "—"}%</span>
                    : isLeaf ? <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>✓ NIL</span> : null}
                </div>
              </div>

              {isLeaf && open && (
                <div style={{ background: C.surface2, borderBottom: `1px solid ${C.border}`, padding: "10px 16px 14px 34px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: C.muted, marginBottom: 6 }}>Variance Investigation — Generated GLs vs Client GLs</div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 110px", gap: 8, padding: "6px 12px", background: "#F8FAFC", borderBottom: `1px solid ${C.border}` }}>
                      {["GL Account (source template)", "Generated", "Client", "Diff"].map((h, i) => (
                        <div key={h} style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: C.muted, textAlign: i === 0 ? "left" : "right" }}>{h}</div>
                      ))}
                    </div>
                    {gls.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 11.5, color: C.muted }}>No generated GLs yet — enter Connected-GL amounts on the Execution GL templates and classify them to “{l.label}”.</div>
                    ) : gls.map((g, i) => {
                      const gc = pcNum(p.recon.clientGL[g.account]);
                      const gd = gc - g.auto;
                      return (
                        <div key={g.account + i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 110px", gap: 8, alignItems: "center", padding: "7px 12px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 12 }}><span style={{ fontWeight: 600, color: C.text }}>{g.account}</span><span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>· {g.templateName}</span></div>
                          <div style={{ textAlign: "right", fontFamily: C.mono, fontSize: 12, color: C.text2 }}>{fmt(g.auto)}</div>
                          <div style={{ textAlign: "right" }}><input value={p.recon.clientGL[g.account] ?? ""} onChange={(e) => p.onClientGL(g.account, e.target.value)} placeholder="0.00" type="number" style={{ ...cellInput, width: 100 }} /></div>
                          <div style={{ textAlign: "right", fontFamily: C.mono, fontSize: 12, fontWeight: 600, color: Math.abs(gd) < 0.005 ? C.muted : gd < 0 ? C.red : C.green }}>{Math.abs(gd) < 0.005 ? "—" : (gd > 0 ? "+" : "") + fmt(gd)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: C.muted }}>Reviewer Comment</label>
                    <textarea value={p.recon.comments[l.key] ?? ""} onChange={(e) => p.onComment(l.key, e.target.value)} rows={2}
                      placeholder={`Investigation note for the ${l.label} variance — root cause, evidence reviewed, conclusion…`}
                      style={{ width: "100%", marginTop: 4, fontSize: 12, lineHeight: 1.55, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", outline: "none", resize: "vertical", background: "#fff" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: C.mono, color: tone, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function btn(bg: string, color: string, bd: string): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", background: bg, color, border: `1px solid ${bd}` };
}
