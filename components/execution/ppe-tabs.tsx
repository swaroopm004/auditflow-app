"use client";

/**
 * PPE template — faithful port of the HTML demo (auditflow-suite.html · frame-ppe).
 *
 * Renders the six PPE tabs with the HTML's exact layout, fields and colour system:
 *   Lifecycle JEs · Depreciation & DT · Connected GLs · Audit Assertions ·
 *   Variance Check · Improvements
 *
 * State (asset register, calculator inputs, variance inputs) lives in <PpeTabs>
 * so it survives tab switches — mirroring the HTML's module-global `assetData`.
 * The register totals feed the Variance tab's "From Register" fields, just like
 * the HTML. Everything here is ephemeral (no Dexie persistence) EXCEPT the D1
 * reviewer sign-off, which is owned by the parent page and passed in as props.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LifecycleEntry, LifecycleLine, LifecycleStage, LifecycleTone } from "@/lib/types";
import type { AcctType, AssertionDef, CheckDef, ConnectedDef, FrameworkDef, TemplateContent } from "@/lib/execution/template-content";
import { uid } from "@/lib/utils";

// ── HTML colour palette (CSS vars → constants) ─────────────────────────────
const C = {
  ppe: "#065F46", ppeLt: "#ECFDF5", ppeMed: "#A7F3D0", ppeDark: "#064E3B",
  green: "#059669", greenLt: "#ECFDF5", greenMed: "#6EE7B7",
  amber: "#D97706", amberLt: "#FFFBEB", amberMed: "#FDE68A",
  red: "#DC2626", redLt: "#FEF2F2", redMed: "#FCA5A5",
  purple: "#7C3AED", purpleLt: "#F5F3FF", purpleMed: "#DDD6FE",
  accent: "#2563EB", accentLt: "#EBF1FF", accentMed: "#BFCFFF",
  teal: "#0D9488", tealLt: "#F0FDFA",
  text: "#1A2540", text2: "#4A5773", muted: "#8A96B0",
  border: "#DDE3EE", surface2: "#F0F4FA", white: "#FFFFFF", bg: "#F4F6FA",
  mono: "'DM Mono', ui-monospace, monospace",
};

type Tone = "ppe" | "amber" | "purple" | "red" | "accent" | "green";
const HEADER_TONE: Record<Tone, { bg: string; border: string; color: string }> = {
  ppe: { bg: C.ppeLt, border: C.ppeMed, color: C.ppe },
  amber: { bg: C.amberLt, border: C.amberMed, color: C.amber },
  purple: { bg: C.purpleLt, border: C.purpleMed, color: C.purple },
  red: { bg: C.redLt, border: C.redMed, color: C.red },
  accent: { bg: C.accentLt, border: C.accentMed, color: C.accent },
  green: { bg: C.greenLt, border: C.greenMed, color: C.green },
};

// ── number helpers (ported from HTML) ──────────────────────────────────────
const pc = (s: string | number) => parseFloat(String(s ?? "").replace(/[^0-9.\-]/g, "")) || 0;
const fmtN = (v: number) => Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v: number) => (v ? "₹ " + Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "₹ —");

// ════════════════════════════════════════════════════════════════════════════
// Schedule II reference + demo assets (ported verbatim)
// ════════════════════════════════════════════════════════════════════════════
type SchRow = { cls: string; name: string; life: number; slm: number; wdv: number; it: number; note: string };
const SCHEDULE_II: SchRow[] = [
  { cls: "building", name: "Buildings (RCC)", life: 60, slm: 1.58, wdv: 4.87, it: 5, note: "Residential/office buildings; factory sheds 30 yrs" },
  { cls: "building-nrcc", name: "Buildings (Non-RCC)", life: 30, slm: 3.17, wdv: 9.5, it: 5, note: "Temporary structures" },
  { cls: "plant", name: "Plant & Machinery (General)", life: 15, slm: 6.33, wdv: 18.10, it: 15, note: "Most common machinery" },
  { cls: "plant-continuous", name: "Plant (Continuous Process)", life: 25, slm: 3.80, wdv: 11.29, it: 15, note: "Used in continuous process industries" },
  { cls: "computers", name: "Computers & Peripherals", life: 3, slm: 31.67, wdv: 63.16, it: 40, note: "Mobiles/laptops treated as computers" },
  { cls: "servers", name: "Servers & Networks", life: 6, slm: 15.83, wdv: 39.30, it: 40, note: "Data centres, networking equipment" },
  { cls: "vehicles", name: "Motor Cars", life: 8, slm: 11.88, wdv: 31.23, it: 15, note: "Not used in hire business" },
  { cls: "vehicles-cv", name: "Commercial Vehicles", life: 8, slm: 11.88, wdv: 31.23, it: 30, note: "Trucks, buses used for hire/carriage" },
  { cls: "furniture", name: "Furniture & Fittings", life: 10, slm: 9.50, wdv: 25.89, it: 10, note: "Office furniture, fixtures" },
  { cls: "office-equip", name: "Office Equipment", life: 5, slm: 19.00, wdv: 45.07, it: 15, note: "AC, projectors, EPBAX" },
  { cls: "rnd", name: "R&D Equipment", life: 10, slm: 9.50, wdv: 25.89, it: 15, note: "Used for research and development" },
];

type RawAsset = { id: string; desc: string; cls: string; method: "SLM" | "WDV"; life: number; gross: number; residual: number; openWDV: number; taxWDV: number; itRate: number };
type CalcAsset = RawAsset & { bookDepn: number; closingWDV: number; itDepn: number; closingTaxWDV: number; tempDiff: number; dtAmt: number; dtType: "DTL" | "DTA" | "Nil" };

const DEMO_ASSETS: RawAsset[] = [
  { id: "FA-001", desc: "Factory Building Block A", cls: "building", method: "SLM", life: 60, gross: 1200, residual: 60, openWDV: 950, taxWDV: 1050, itRate: 5 },
  { id: "FA-002", desc: "CNC Machining Centre Mk-IV", cls: "plant", method: "WDV", life: 15, gross: 450, residual: 22.5, openWDV: 280, taxWDV: 220, itRate: 15 },
  { id: "FA-003", desc: "Hydraulic Press Line 3", cls: "plant", method: "WDV", life: 15, gross: 320, residual: 16, openWDV: 185, taxWDV: 140, itRate: 15 },
  { id: "FA-004", desc: "ERP Server Rack", cls: "servers", method: "SLM", life: 6, gross: 85, residual: 4.25, openWDV: 42.5, taxWDV: 25.5, itRate: 40 },
  { id: "FA-005", desc: "Office Computers (50 nos)", cls: "computers", method: "SLM", life: 3, gross: 25, residual: 1.25, openWDV: 8.33, taxWDV: 9, itRate: 40 },
  { id: "FA-006", desc: "Company Cars (4 nos)", cls: "vehicles", method: "WDV", life: 8, gross: 120, residual: 6, openWDV: 68.4, taxWDV: 58.14, itRate: 15 },
  { id: "FA-007", desc: "AC Units & HVAC System", cls: "office-equip", method: "WDV", life: 5, gross: 38, residual: 1.9, openWDV: 14.44, taxWDV: 13.68, itRate: 15 },
  { id: "FA-008", desc: "R&D Testing Equipment", cls: "rnd", method: "SLM", life: 10, gross: 95, residual: 4.75, openWDV: 57, taxWDV: 61.75, itRate: 15 },
];

function computeAsset(a: RawAsset, taxRatePct: number): CalcAsset {
  const sch = SCHEDULE_II.find((r) => r.cls === a.cls) ?? SCHEDULE_II[2];
  const depreciable = Math.max(0, a.gross - a.residual);
  const bookDepn = a.method === "SLM" ? depreciable / a.life : (a.openWDV * sch.wdv) / 100;
  const closingWDV = Math.max(a.residual, a.openWDV - bookDepn);
  const itDepn = a.taxWDV * (a.itRate / 100);
  const closingTaxWDV = Math.max(0, a.taxWDV - itDepn);
  const tempDiff = closingWDV - closingTaxWDV;
  const dtAmt = Math.abs(tempDiff) * (taxRatePct / 100);
  const dtType: CalcAsset["dtType"] = tempDiff > 0.5 ? "DTA" : tempDiff < -0.5 ? "DTL" : "Nil";
  return { ...a, bookDepn, closingWDV, itDepn, closingTaxWDV, tempDiff, dtAmt, dtType };
}

// ════════════════════════════════════════════════════════════════════════════
// small shared bits
// ════════════════════════════════════════════════════════════════════════════
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.text2, textTransform: "uppercase", letterSpacing: ".8px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit" };
const monoInput: React.CSSProperties = { ...inputStyle, fontFamily: C.mono };
const autofilled: React.CSSProperties = { ...monoInput, background: C.greenLt, borderColor: C.greenMed, color: C.green, fontWeight: 600 };
const ppeFilled: React.CSSProperties = { ...monoInput, background: C.ppeLt, borderColor: C.ppeMed, color: C.ppe, fontWeight: 600 };

function Tag({ text, kind }: { text: string; kind: "auto" | "it" | "ppe" }) {
  const m = {
    auto: { bg: C.greenLt, color: C.green, bd: C.greenMed },
    it: { bg: C.amberLt, color: C.amber, bd: C.amberMed },
    ppe: { bg: C.ppeLt, color: C.ppe, bd: C.ppeMed },
  }[kind];
  return <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", background: m.bg, color: m.color, borderRadius: 4, marginLeft: 4, border: `1px solid ${m.bd}` }}>{text}</span>;
}

function Chip({ text, tone }: { text: string; tone: Tone | "blue" | "std" }) {
  const map: Record<string, { bg: string; color: string; bd: string }> = {
    ppe: { bg: C.ppeLt, color: C.ppe, bd: C.ppeMed },
    green: { bg: C.greenLt, color: C.green, bd: C.greenMed },
    amber: { bg: C.amberLt, color: C.amber, bd: C.amberMed },
    red: { bg: C.redLt, color: C.red, bd: C.redMed },
    purple: { bg: C.purpleLt, color: C.purple, bd: C.purpleMed },
    accent: { bg: C.accentLt, color: C.accent, bd: C.accentMed },
    blue: { bg: C.accentLt, color: C.accent, bd: C.accentMed },
    std: { bg: C.purpleLt, color: C.purple, bd: C.purpleMed },
  };
  const s = map[tone] ?? map.ppe;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "4px 11px", borderRadius: 20, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.bd}` }}>{text}</span>;
}

// Yes/No completion toggle. Clicking the active option clears it (back to pending).
function YesNo({ value, onChange }: { value?: "yes" | "no"; onChange: (v: "yes" | "no" | null) => void }) {
  const pill = (active: boolean, on: { bg: string; color: string; bd: string }): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", fontSize: 11.5, fontWeight: 700,
    cursor: "pointer", border: `1.5px solid ${active ? on.bd : C.border}`, background: active ? on.bg : "#fff",
    color: active ? on.color : C.muted,
  });
  return (
    <div style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <button onClick={() => onChange(value === "yes" ? null : "yes")} style={{ ...pill(value === "yes", { bg: C.greenLt, color: C.green, bd: C.greenMed }), borderRadius: 0, borderLeft: "none", borderTop: "none", borderBottom: "none", borderRight: `1px solid ${C.border}` }}>✓ Yes</button>
      <button onClick={() => onChange(value === "no" ? null : "no")} style={{ ...pill(value === "no", { bg: C.redLt, color: C.red, bd: C.redMed }), borderRadius: 0, border: "none" }}>✕ No</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
export type PpeTabKey = "entries" | "depnDT" | "connected" | "assertions" | "variance" | "improvements";

export type CheckStatus = Record<string, "yes" | "no">;
export type ConnData = Record<string, { amount?: string; classification?: string }>;

export function TemplateTabs({
  tab,
  name,
  content,
  stages,
  onStagesChange,
  checkStatus,
  onSetStatus,
  connData,
  onSetConn,
  isSigned,
  signoffName,
  signoffAt,
  onOpenSignOff,
  onResetSignOff,
}: {
  tab: PpeTabKey;
  name: string;
  content: TemplateContent;
  stages: LifecycleStage[];
  onStagesChange: (next: LifecycleStage[]) => void;
  checkStatus: CheckStatus;
  onSetStatus: (id: string, val: "yes" | "no" | null) => void;
  connData: ConnData;
  onSetConn: (account: string, patch: { amount?: string; classification?: string }) => void;
  isSigned: boolean;
  signoffName?: string;
  signoffAt?: string | number;
  onOpenSignOff: () => void;
  onResetSignOff: () => void | Promise<void>;
}) {
  // shared register state (survives tab switches; mirrors HTML module-global)
  const [register, setRegister] = useState<CalcAsset[]>([]);
  const [taxRate, setTaxRate] = useState("25.168");

  const totals = useMemo(() => {
    let gross = 0, opwdv = 0, bookDepn = 0, clwdv = 0, itDepn = 0, tempDiff = 0, dtl = 0, dta = 0, dtlCount = 0, dtaCount = 0;
    for (const a of register) {
      gross += a.gross; opwdv += a.openWDV; bookDepn += a.bookDepn; clwdv += a.closingWDV;
      itDepn += a.itDepn; tempDiff += a.tempDiff;
      if (a.dtType === "DTL") { dtl += a.dtAmt; dtlCount++; }
      if (a.dtType === "DTA") { dta += a.dtAmt; dtaCount++; }
    }
    return { gross, opwdv, bookDepn, clwdv, itDepn, tempDiff, dtl, dta, dtlCount, dtaCount };
  }, [register]);

  return (
    <div style={{ fontFamily: "var(--font, 'DM Sans', sans-serif)" }}>
      {tab === "entries" && <LifecycleTab stages={stages} onChange={onStagesChange} framework={content.framework} headChip={content.headChip} />}
      {tab === "depnDT" && content.hasDepnCalc && (
        <DepnTab register={register} setRegister={setRegister} taxRate={taxRate} setTaxRate={setTaxRate} totals={totals} />
      )}
      {tab === "connected" && <ConnectedTab stages={stages} name={name} connected={content.connected} connData={connData} onSetConn={onSetConn} />}
      {tab === "assertions" && <AssertionsTab name={name} assertions={content.assertions} status={checkStatus} onSet={onSetStatus} />}
      {tab === "variance" && (
        <VarianceTab name={name} hasDepnCalc={!!content.hasDepnCalc} totals={totals} taxRate={taxRate} isSigned={isSigned} signoffName={signoffName} signoffAt={signoffAt} onOpenSignOff={onOpenSignOff} onResetSignOff={onResetSignOff} />
      )}
      {tab === "improvements" && <ImprovementsTab name={name} checks={content.checks} status={checkStatus} onSet={onSetStatus} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — Lifecycle JEs
// ════════════════════════════════════════════════════════════════════════════
function LifecycleTab({ stages, onChange, framework, headChip }: { stages: LifecycleStage[]; onChange: (next: LifecycleStage[]) => void; framework: FrameworkDef; headChip: string }) {
  const [active, setActive] = useState(stages[0]?.key ?? "purchase");
  const stage = stages.find((s) => s.key === active) ?? stages[0];

  // ── mutators (persist via onChange) ──────────────────────────────────────
  const mutStages = (fn: (s: LifecycleStage) => LifecycleStage) => onChange(stages.map((s) => (s.key === active ? fn(s) : s)));
  const patchEntry = (eid: string, patch: Partial<LifecycleEntry>) =>
    mutStages((s) => ({ ...s, entries: s.entries.map((e) => (e.id === eid ? { ...e, ...patch } : e)) }));
  const patchLine = (eid: string, lid: string, patch: Partial<LifecycleLine>) =>
    mutStages((s) => ({ ...s, entries: s.entries.map((e) => (e.id !== eid ? e : { ...e, lines: e.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) })) }));
  const addLine = (eid: string, side: "Dr" | "Cr") =>
    mutStages((s) => ({ ...s, entries: s.entries.map((e) => (e.id !== eid ? e : { ...e, lines: [...e.lines, { id: uid("ll"), label: "", side }] })) }));
  const removeLine = (eid: string, lid: string) =>
    mutStages((s) => ({ ...s, entries: s.entries.map((e) => (e.id !== eid ? e : { ...e, lines: e.lines.filter((l) => l.id !== lid) })) }));
  const addEntry = () =>
    mutStages((s) => ({ ...s, entries: [...s.entries, { id: uid("le"), entryRef: `Entry ${s.entries.length + 1}`, title: "New Journal Entry", tone: "ppe", note: "", lines: [{ id: uid("ll"), label: "", side: "Dr" }, { id: uid("ll"), label: "", side: "Cr" }] }] }));
  const removeEntry = (eid: string) => mutStages((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== eid) }));

  return (
    <div>
      {/* heading */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Journal Entries — Full Lifecycle</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Every field below is editable — click any account, GL No or note to change it. Add or remove entries & lines freely. Changes auto-save.</div>
        </div>
        <Chip text={headChip} tone="ppe" />
      </div>

      {/* framework banner */}
      <div style={{ background: `linear-gradient(135deg, ${C.ppeLt}, #F0FFF4)`, border: `1.5px solid ${C.ppeMed}`, borderRadius: 10, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 14 }}>
        <span style={{ fontSize: 20, marginTop: 2 }}>ℹ</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ppe }}>{framework.title}</div>
          <div style={{ fontSize: 11.5, color: C.text2, marginTop: 4, lineHeight: 1.7 }}>{framework.body}</div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {framework.chips.slice(0, 3).map((c, i) => <Chip key={c} text={c} tone={i === 0 ? "ppe" : i === 1 ? "std" : "amber"} />)}
        </div>
      </div>

      {/* lifecycle flow-bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {stages.map((s, i) => {
          const on = s.key === active;
          return (
            <button key={s.key} onClick={() => setActive(s.key)}
              style={{ flex: 1, padding: "10px 6px", textAlign: "center", cursor: "pointer", border: "none", borderRight: i < stages.length - 1 ? `1px solid ${C.border}` : "none", background: on ? C.ppe : "transparent" }}>
              <div style={{ fontSize: 16 }}>{s.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: on ? "#fff" : C.muted }}>{s.label} <span style={{ opacity: .7 }}>({s.entries.length})</span></div>
            </button>
          );
        })}
      </div>

      {/* JE grid for active stage — every card is inline-editable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
        {stage?.entries.map((e) => (
          <JeCard key={e.id} e={e}
            onPatch={(p) => patchEntry(e.id, p)}
            onPatchLine={(lid, p) => patchLine(e.id, lid, p)}
            onAddLine={(side) => addLine(e.id, side)}
            onRemoveLine={(lid) => removeLine(e.id, lid)}
            onRemove={() => removeEntry(e.id)} />
        ))}
      </div>

      {/* Add entry */}
      <div style={{ marginTop: 16 }}>
        <button onClick={addEntry} style={{ ...btnGhost, padding: "9px 16px", borderColor: C.ppeMed, color: C.ppe, borderStyle: "dashed" }}>
          ＋ Add Journal Entry to “{stage?.label}” stage
        </button>
      </div>
    </div>
  );
}

const TONE_OPTS: LifecycleTone[] = ["ppe", "amber", "purple", "red", "accent", "green"];

// Inline-editable text field: looks like plain text, reveals a border on hover/focus.
const EDITABLE = "rounded border border-transparent hover:border-gray-300 focus:border-emerald-500 focus:bg-white outline-none transition-colors";

function JeCard({
  e, onPatch, onPatchLine, onAddLine, onRemoveLine, onRemove,
}: {
  e: LifecycleEntry;
  onPatch: (patch: Partial<LifecycleEntry>) => void;
  onPatchLine: (lid: string, patch: Partial<LifecycleLine>) => void;
  onAddLine: (side: "Dr" | "Cr") => void;
  onRemoveLine: (lid: string) => void;
  onRemove: () => void;
}) {
  const h = HEADER_TONE[e.tone ?? "ppe"];
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      {/* header — editable ref + title, tone picker, delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: h.bg, borderBottom: `1px solid ${h.border}` }}>
        <input value={e.entryRef} onChange={(ev) => onPatch({ entryRef: ev.target.value })} className={EDITABLE}
          style={{ width: 120, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: h.color, background: "transparent", padding: "2px 4px" }} />
        <span style={{ color: h.color, fontWeight: 700 }}>—</span>
        <input value={e.title} onChange={(ev) => onPatch({ title: ev.target.value })} placeholder="Entry title" className={EDITABLE}
          style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: h.color, background: "transparent", padding: "2px 4px" }} />
        <select value={e.tone ?? "ppe"} onChange={(ev) => onPatch({ tone: ev.target.value as LifecycleTone })} title="Colour tone"
          className={EDITABLE} style={{ width: 78, fontSize: 10, color: h.color, background: "transparent", padding: "2px 4px" }}>
          {TONE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onRemove} title="Delete this entry" style={{ background: "rgba(255,255,255,.6)", border: `1px solid ${C.redMed}`, color: C.red, borderRadius: 6, padding: "2px 7px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
      </div>

      {/* posting lines */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {(e.lines ?? []).map((l) => (
            <tr key={l.id}>
              <td style={{ padding: "5px 8px 5px 14px", borderBottom: `1px solid ${C.border}`, ...(l.side === "Cr" ? { paddingLeft: 22 } : {}) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {l.side === "Cr" && <span style={{ color: C.muted, fontSize: 12 }}>To</span>}
                  <input value={l.label} onChange={(ev) => onPatchLine(l.id, { label: ev.target.value })} placeholder="Account name" className={EDITABLE}
                    style={{ flex: 1, fontSize: 12.5, background: "transparent", padding: "3px 4px", ...(l.side === "Dr" ? { fontWeight: 700, color: C.green } : { color: C.text2 }) }} />
                  <span style={{ fontSize: 9.5, color: C.muted, flexShrink: 0 }}>GL</span>
                  <input value={l.glNo ?? ""} onChange={(ev) => onPatchLine(l.id, { glNo: ev.target.value })} placeholder="—" title="GL number — flows to Connected GLs" className={EDITABLE}
                    style={{ width: 60, fontSize: 11, fontFamily: C.mono, textAlign: "center", background: "transparent", padding: "3px 4px", color: C.ppe, fontWeight: 700 }} />
                </div>
                <input value={l.emph ?? ""} onChange={(ev) => onPatchLine(l.id, { emph: ev.target.value })} placeholder="+ qualifier (optional)" className={EDITABLE}
                  style={{ width: "100%", fontSize: 10, fontStyle: "italic", color: C.muted, background: "transparent", padding: "1px 4px", marginTop: 1 }} />
              </td>
              <td style={{ padding: "5px 6px", textAlign: "center", borderBottom: `1px solid ${C.border}`, width: 52 }}>
                <select value={l.side} onChange={(ev) => onPatchLine(l.id, { side: ev.target.value as "Dr" | "Cr" })} className={EDITABLE}
                  style={{ fontSize: 11, fontWeight: 700, background: "transparent", padding: "2px", color: l.side === "Dr" ? C.green : C.text2 }}>
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </td>
              <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: C.mono, color: C.text2, fontSize: 12, borderBottom: `1px solid ${C.border}`, width: 56 }}>₹ —</td>
              <td style={{ padding: "5px 6px", borderBottom: `1px solid ${C.border}`, width: 28 }}>
                <button onClick={() => onRemoveLine(l.id)} title="Remove line" style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>✕</button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => onAddLine("Dr")} style={{ ...btnGhost, fontSize: 10.5, padding: "3px 9px", marginRight: 6 }}>＋ Dr line</button>
              <button onClick={() => onAddLine("Cr")} style={{ ...btnGhost, fontSize: 10.5, padding: "3px 9px" }}>＋ Cr line</button>
            </td>
          </tr>
          <tr>
            <td colSpan={4} style={{ padding: "6px 12px 10px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                <span style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>↳</span>
                <textarea value={e.note} onChange={(ev) => onPatch({ note: ev.target.value })} rows={2} placeholder="Ind AS / commentary note…" className={EDITABLE}
                  style={{ flex: 1, fontSize: 10.5, color: C.muted, fontStyle: "italic", background: "transparent", padding: "3px 4px", resize: "vertical", lineHeight: 1.5 }} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Depreciation & DT
// ════════════════════════════════════════════════════════════════════════════
function DepnTab({
  register, setRegister, taxRate, setTaxRate, totals,
}: {
  register: CalcAsset[];
  setRegister: React.Dispatch<React.SetStateAction<CalcAsset[]>>;
  taxRate: string;
  setTaxRate: (v: string) => void;
  totals: { gross: number; opwdv: number; bookDepn: number; clwdv: number; itDepn: number; tempDiff: number; dtl: number; dta: number; dtlCount: number; dtaCount: number };
}) {
  // asset form
  const [f, setF] = useState({ assetId: "", desc: "", cls: "plant", method: "SLM" as "SLM" | "WDV", life: "15", gross: "", residual: "", openWDV: "", itBlock: "15", itRate: "15", taxWDV: "" });
  const upd = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const applySchII = (cls: string) => {
    const sch = SCHEDULE_II.find((r) => r.cls === cls) ?? SCHEDULE_II[2];
    setF((p) => ({ ...p, cls, life: String(sch.life), itBlock: String(sch.it), itRate: String(sch.it) }));
  };

  // live computation for the form
  const calc = useMemo(() => {
    const gross = pc(f.gross), residual = pc(f.residual), life = pc(f.life);
    const openWDV = pc(f.openWDV) || gross;
    const itRate = pc(f.itRate) / 100;
    const taxWDV = pc(f.taxWDV);
    const taxRatePct = pc(taxRate) / 100;
    if (!gross || !life) return null;
    const depreciable = Math.max(0, gross - residual);
    const sch = SCHEDULE_II.find((r) => r.cls === f.cls) ?? SCHEDULE_II[2];
    let bookRate: number, bookDepn: number;
    if (f.method === "SLM") { bookRate = (depreciable / (gross || 1) / life) * 100; bookDepn = depreciable / life; }
    else { bookRate = sch.wdv; bookDepn = (openWDV * sch.wdv) / 100; }
    const closingWDV = Math.max(residual, openWDV - bookDepn);
    const itDepn = taxWDV > 0 ? taxWDV * itRate : gross * itRate;
    const closingTaxWDV = Math.max(0, (taxWDV || gross) - itDepn);
    const tempDiff = closingWDV - closingTaxWDV;
    const dtAmt = Math.abs(tempDiff) * taxRatePct;
    const dtType = tempDiff > 0.5 ? "DTA (Deductible Temp. Diff.)" : tempDiff < -0.5 ? "DTL (Taxable Temp. Diff.)" : "Nil";
    return { bookRate, bookDepn, closingWDV, itDepn, closingTaxWDV, tempDiff, dtAmt, dtType };
  }, [f, taxRate]);

  const addAsset = () => {
    const gross = pc(f.gross);
    if (!gross) return;
    const raw: RawAsset = {
      id: f.assetId || `FA-${String(register.length + 1).padStart(3, "0")}`,
      desc: f.desc || "New Asset", cls: f.cls, method: f.method, life: pc(f.life),
      gross, residual: pc(f.residual), openWDV: pc(f.openWDV) || gross, taxWDV: pc(f.taxWDV) || gross, itRate: pc(f.itRate),
    };
    setRegister((p) => [...p, computeAsset(raw, pc(taxRate) || 25.168)]);
  };
  const loadDemo = () => setRegister(DEMO_ASSETS.map((a) => computeAsset(a, pc(taxRate) || 25.168)));
  const recalc = () => setRegister((p) => (p.length ? p.map((a) => computeAsset(a, pc(taxRate) || 25.168)) : DEMO_ASSETS.map((a) => computeAsset(a, pc(taxRate) || 25.168))));
  const del = (i: number) => setRegister((p) => p.filter((_, idx) => idx !== i));

  const G = (cols: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 });
  const grp: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
  const net = totals.dtl - totals.dta;

  return (
    <div>
      {/* heading */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Depreciation Calculator — Ind AS 16 (SLM / WDV) &amp; Income Tax Act (Block Method)</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Schedule II useful lives · IT Act rates · Deferred tax computation · Asset register upload</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadDemo} style={{ ...btnGhost, borderColor: C.ppeMed, color: C.ppe }}>⚡ Load Demo Register</button>
          <button onClick={recalc} style={btnPrimary}>⚙ Calculate All</button>
        </div>
      </div>

      {/* upload zone */}
      <div onClick={loadDemo} style={{ border: `2px dashed ${C.ppeMed}`, borderRadius: 10, padding: 18, textAlign: "center", cursor: "pointer", background: C.ppeLt, marginBottom: 18 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>📂</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ppe }}>Upload Asset Register</div>
        <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>.xlsx · .csv · .pdf</div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>Expected: Asset ID · Description · Class · Date of Purchase · Gross Block · Accumulated Depreciation · Method · Useful Life</div>
      </div>

      {/* add / edit asset */}
      <div style={{ background: C.ppeLt, border: `1.5px solid ${C.ppeMed}`, borderRadius: 10, padding: "16px 18px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.ppe, marginBottom: 14 }}>＋ Add / Edit Asset</div>
        <div style={{ ...G(4), marginBottom: 12 }}>
          <div style={grp}><label style={lbl}>Asset ID</label><input style={monoInput} value={f.assetId} onChange={(e) => upd("assetId", e.target.value)} placeholder="e.g. FA-001" /></div>
          <div style={grp}><label style={lbl}>Description</label><input style={inputStyle} value={f.desc} onChange={(e) => upd("desc", e.target.value)} placeholder="e.g. CNC Machine — Line 2" /></div>
          <div style={grp}><label style={lbl}>Asset Class</label>
            <select style={inputStyle} value={f.cls} onChange={(e) => applySchII(e.target.value)}>
              {SCHEDULE_II.map((s) => <option key={s.cls} value={s.cls}>{s.name}</option>)}
            </select>
          </div>
          <div style={grp}><label style={lbl}>Date of Acquisition</label><input type="date" style={inputStyle} /></div>
        </div>
        <div style={{ ...G(4), marginBottom: 12 }}>
          <div style={grp}><label style={lbl}>Gross Block (₹L)</label><input style={monoInput} value={f.gross} onChange={(e) => upd("gross", e.target.value)} placeholder="Cost incl. all attributable costs" /></div>
          <div style={grp}><label style={lbl}>Residual Value (₹L)</label><input style={monoInput} value={f.residual} onChange={(e) => upd("residual", e.target.value)} placeholder="Scrap value (min 5% for Sch II)" /></div>
          <div style={grp}><label style={lbl}>Depreciation Method</label>
            <select style={inputStyle} value={f.method} onChange={(e) => upd("method", e.target.value)}>
              <option value="SLM">SLM (Straight Line)</option>
              <option value="WDV">WDV (Written Down Value)</option>
            </select>
          </div>
          <div style={grp}><label style={lbl}>Useful Life (Years) <Tag text="Sch II" kind="ppe" /></label><input style={monoInput} value={f.life} onChange={(e) => upd("life", e.target.value)} placeholder="e.g. 15" /></div>
        </div>
        <div style={{ ...G(4), marginBottom: 12 }}>
          <div style={grp}><label style={lbl}>Opening WDV (₹L) <Tag text="Book" kind="ppe" /></label><input style={ppeFilled} value={f.openWDV} onChange={(e) => upd("openWDV", e.target.value)} placeholder="As at 1-Apr-2025" /></div>
          <div style={grp}><label style={lbl}>Book Depn Rate (%) <Tag text="Auto" kind="auto" /></label><input style={autofilled} readOnly value={calc ? calc.bookRate.toFixed(2) : ""} /></div>
          <div style={grp}><label style={lbl}>Book Depn for Year <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={calc && calc.bookDepn > 0 ? fmtN(calc.bookDepn) : ""} /></div>
          <div style={grp}><label style={lbl}>Closing Book WDV <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={calc && calc.closingWDV > 0 ? fmtN(calc.closingWDV) : ""} /></div>
        </div>

        {/* IT Act block */}
        <div style={{ borderTop: `1px solid ${C.ppeMed}`, paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.amber, marginBottom: 10 }}>📊 Income Tax Act — Block Rates (IT Depreciation for Deferred Tax)</div>
          <div style={G(5)}>
            <div style={grp}><label style={lbl}>IT Block <Tag text="IT Act" kind="it" /></label>
              <select style={inputStyle} value={f.itBlock} onChange={(e) => { upd("itBlock", e.target.value); upd("itRate", e.target.value); }}>
                <option value="5">5% — Buildings (RCC)</option>
                <option value="10">10% — Buildings (Other)</option>
                <option value="15">15% — Plant &amp; Machinery (General)</option>
                <option value="30">30% — General Plant</option>
                <option value="40">40% — Computers / Data Processing</option>
                <option value="45">45% — AoPs / Buses</option>
                <option value="60">60% — Energy-saving Devices</option>
                <option value="100">100% — Pollution Control / Solar</option>
              </select>
            </div>
            <div style={grp}><label style={lbl}>IT Rate (%) <Tag text="Block" kind="it" /></label><input style={monoInput} value={f.itRate} onChange={(e) => upd("itRate", e.target.value)} /></div>
            <div style={grp}><label style={lbl}>Opening Tax WDV (₹L) <Tag text="Block" kind="it" /></label><input style={monoInput} value={f.taxWDV} onChange={(e) => upd("taxWDV", e.target.value)} placeholder="Block WDV at 1-Apr-2025" /></div>
            <div style={grp}><label style={lbl}>IT Depreciation <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={calc && calc.itDepn > 0 ? fmtN(calc.itDepn) : ""} /></div>
            <div style={grp}><label style={lbl}>Temp. Difference <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={calc ? (calc.tempDiff !== 0 ? (calc.tempDiff > 0 ? "+" : "-") + fmtN(Math.abs(calc.tempDiff)) : "Nil") : ""} /></div>
          </div>
        </div>

        {/* deferred tax */}
        <div style={{ borderTop: `1px solid ${C.ppeMed}`, paddingTop: 12, marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.accent, marginBottom: 10 }}>💹 Deferred Tax Computation</div>
          <div style={{ ...G(4), marginBottom: 10 }}>
            <div style={grp}><label style={lbl}>Applicable Tax Rate (%)</label>
              <select style={inputStyle} value={taxRate} onChange={(e) => setTaxRate(e.target.value)}>
                <option value="25.168">25.168% — Sec 115BAA (New Regime)</option>
                <option value="34.944">34.944% — Standard (Surcharge 10%)</option>
                <option value="34.608">34.608% — Standard (Surcharge 7%)</option>
                <option value="30">30% — Base Rate</option>
                <option value="22">22% — Sec 115BAA Base</option>
              </select>
            </div>
            <div style={grp}><label style={lbl}>DT Balance Type <Tag text="Auto" kind="auto" /></label><input style={{ ...autofilled, fontFamily: "inherit" }} readOnly value={calc ? calc.dtType : ""} /></div>
            <div style={grp}><label style={lbl}>DT Amount (₹L) <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={calc && calc.dtAmt > 0.01 ? fmtN(calc.dtAmt) : "Nil"} /></div>
            <div style={{ ...grp, alignSelf: "end" }}><button onClick={addAsset} style={{ ...btnPrimary, width: "100%" }}>＋ Add to Register</button></div>
          </div>
          {calc && pc(f.gross) > 0 && <DtBanner calc={calc} taxRate={taxRate} />}
        </div>
      </div>

      {/* Schedule II reference */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.muted, marginBottom: 10 }}>📋 Schedule II — Useful Life Reference &amp; IT Act Rates</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: C.text }}>
                {["Asset Class", "Sch II Life (Yrs)", "SLM Rate", "WDV Rate (Sch II)", "IT Block Rate", "Notes"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,.6)", textAlign: i === 0 || i === 5 ? "left" : "center" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_II.map((r, i) => (
                <tr key={r.cls + i} style={{ background: i % 2 ? C.surface2 : "#fff" }}>
                  <td style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{r.name}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "center", fontFamily: C.mono, fontWeight: 700, color: C.ppe, borderBottom: `1px solid ${C.border}` }}>{r.life}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "center", fontFamily: C.mono, color: C.accent, borderBottom: `1px solid ${C.border}` }}>{r.slm}%</td>
                  <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "center", fontFamily: C.mono, color: C.purple, borderBottom: `1px solid ${C.border}` }}>{r.wdv}%</td>
                  <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "center", fontFamily: C.mono, fontWeight: 700, color: C.amber, borderBottom: `1px solid ${C.border}` }}>{r.it}%</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.border}` }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset register */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "10px 16px", background: C.text, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.7)" }}>
            Asset Register — FY 2025–26 <span style={{ background: C.ppe, color: "#fff", padding: "1px 8px", borderRadius: 10, fontSize: 10, marginLeft: 6 }}>{register.length} assets</span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead>
              <tr>
                {["Asset ID", "Description", "Class", "Method", "Gross Block", "Op. WDV (Book)", "Book Depn", "Cl. WDV (Book)", "IT Depn", "Temp. Diff.", "DT Amt", "DT Type", ""].map((h, i) => (
                  <th key={h + i} style={{ background: C.ppe, color: "rgba(255,255,255,.8)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", padding: "9px 12px", textAlign: i >= 4 && i <= 10 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {register.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 12.5 }}>⚡ Click <strong>Load Demo Register</strong> or add assets above</td></tr>
              ) : register.map((a, i) => {
                const dtColor = a.dtType === "DTL" ? C.amber : a.dtType === "DTA" ? C.accent : C.muted;
                return (
                  <tr key={a.id + i} style={{ background: i % 2 ? "#f0fdf4" : "#fff" }}>
                    <td style={td({ fontFamily: C.mono, fontSize: 11.5, fontWeight: 700 })}>{a.id}</td>
                    <td style={td({ fontSize: 12, fontWeight: 600 })}>{a.desc}</td>
                    <td style={td({ fontSize: 11 })}><span style={{ background: C.ppeLt, color: C.ppe, padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>{a.cls}</span></td>
                    <td style={td({ fontSize: 11, textAlign: "center" })}><span style={{ background: C.surface2, padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>{a.method}</span></td>
                    <td style={tdR()}>{fmtN(a.gross)}</td>
                    <td style={tdR()}>{fmtN(a.openWDV)}</td>
                    <td style={tdR({ fontWeight: 700, color: C.ppe })}>{fmtN(a.bookDepn)}</td>
                    <td style={tdR()}>{fmtN(a.closingWDV)}</td>
                    <td style={tdR({ color: C.amber })}>{fmtN(a.itDepn)}</td>
                    <td style={tdR({ color: a.tempDiff >= 0 ? C.accent : C.amber })}>{(a.tempDiff >= 0 ? "+" : "") + fmtN(a.tempDiff)}</td>
                    <td style={tdR({ fontWeight: 700, color: dtColor })}>{fmtN(a.dtAmt)}</td>
                    <td style={td({ fontSize: 10.5, fontWeight: 700, color: dtColor })}>{a.dtType}</td>
                    <td style={td({})}><button onClick={() => del(i)} style={{ background: C.redLt, border: `1px solid ${C.redMed}`, color: C.red, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
            {register.length > 0 && (
              <tfoot>
                <tr style={{ background: C.ppe, color: "#fff", fontWeight: 700 }}>
                  <td colSpan={4} style={{ padding: "8px 12px" }}>TOTAL</td>
                  <td style={tfR()}>{fmtN(totals.gross)}</td>
                  <td style={tfR()}>{fmtN(totals.opwdv)}</td>
                  <td style={tfR()}>{fmtN(totals.bookDepn)}</td>
                  <td style={tfR()}>{fmtN(totals.clwdv)}</td>
                  <td style={tfR()}>{fmtN(totals.itDepn)}</td>
                  <td style={tfR()}>{(totals.tempDiff >= 0 ? "+" : "") + fmtN(totals.tempDiff)}</td>
                  <td style={tfR()}>{fmtN(totals.dtl + totals.dta)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* DT summary */}
      {register.length > 0 && (
        <div style={{ border: `2px solid ${C.amber}`, borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
          <div style={{ padding: "12px 18px", background: `linear-gradient(90deg, ${C.amberLt}, #FFFFF0)`, borderBottom: `1px solid ${C.amberMed}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.amber }}>💹 Deferred Tax Summary — PPE Timing Differences</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff" }}>
            <div style={{ padding: "16px 20px", borderRight: `1px solid ${C.border}` }}>
              <div style={{ padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${C.amberMed}`, background: "#FEF9EE" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>⚠ Deferred Tax Liability (DTL)</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>Tax depn &gt; Book depn → Tax WDV &lt; Book WDV → Taxable temporary diff.</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.amber, fontFamily: C.mono, marginTop: 8 }}>{fmt(totals.dtl)}</div>
                <div style={{ fontSize: 10, color: C.muted }}>Balance sheet liability</div>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${C.accentMed}`, background: "#EFF6FF" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>✓ Deferred Tax Asset (DTA)</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>Book depn &gt; Tax depn → Tax WDV &gt; Book WDV → Deductible temporary diff.</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, fontFamily: C.mono, marginTop: 8 }}>{fmt(totals.dta)}</div>
                <div style={{ fontSize: 10, color: C.muted }}>Balance sheet asset (if probable recovery)</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 18px", background: C.surface2, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>NET DT BALANCE</div><div style={{ fontSize: 15, fontWeight: 800, fontFamily: C.mono, color: C.text }}>{(net >= 0 ? "Net DTL: " : "Net DTA: ") + fmt(Math.abs(net))}</div></div>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>DTL ASSETS</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: C.mono }}>{totals.dtlCount}</div></div>
            <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>DTA ASSETS</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: C.mono }}>{totals.dtaCount}</div></div>
            <div style={{ marginLeft: "auto" }}><Chip text="Ind AS 12 — Income Taxes" tone="amber" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DtBanner({ calc, taxRate }: { calc: { tempDiff: number; dtAmt: number; closingWDV: number; closingTaxWDV: number; dtType: string }; taxRate: string }) {
  const isNil = Math.abs(calc.tempDiff) < 0.01;
  const isDTL = calc.dtType.includes("DTL");
  const style: React.CSSProperties = { padding: "10px 14px", borderRadius: 8, border: "1.5px solid", fontSize: 12, lineHeight: 1.65, marginTop: 8, ...(isDTL && !isNil ? { background: "#FEF9EE", borderColor: C.amberMed } : { background: "#EFF6FF", borderColor: C.accentMed }) };
  if (isNil) return <div style={style}>✓ No deferred tax on this asset — Book WDV and Tax WDV are approximately equal.</div>;
  if (isDTL) return <div style={style}><strong>⚠ DTL ₹{fmtN(calc.dtAmt)}L</strong> — Tax WDV ({fmtN(calc.closingTaxWDV)}L) &lt; Book WDV ({fmtN(calc.closingWDV)}L). IT depreciation was higher this year; temporary taxable difference = ₹{fmtN(Math.abs(calc.tempDiff))}L × {taxRate}% = DTL ₹{fmtN(calc.dtAmt)}L. This will reverse in future years when book depreciation exceeds tax depreciation.</div>;
  return <div style={style}><strong>✓ DTA ₹{fmtN(calc.dtAmt)}L</strong> — Book WDV ({fmtN(calc.closingWDV)}L) &lt; Tax WDV ({fmtN(calc.closingTaxWDV)}L). Book depreciation was higher; deductible temporary difference = ₹{fmtN(Math.abs(calc.tempDiff))}L × {taxRate}% = DTA ₹{fmtN(calc.dtAmt)}L. Recognise only if future taxable profits are probable.</div>;
}

// table cell helpers
const td = (extra: React.CSSProperties): React.CSSProperties => ({ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", ...extra });
const tdR = (extra: React.CSSProperties = {}): React.CSSProperties => td({ textAlign: "right", fontFamily: C.mono, fontSize: 12.5, ...extra });
const tfR = (): React.CSSProperties => ({ padding: "8px 12px", textAlign: "right", fontFamily: C.mono });

const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: C.surface2, color: C.text2, border: `1px solid ${C.border}` };
const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 16px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: C.ppe, color: "#fff", border: "none" };

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Connected GLs
// ════════════════════════════════════════════════════════════════════════════
const typeClr: Record<AcctType, string> = {
  Asset: C.greenLt, Contra: C.purpleLt, Expense: C.amberLt, Income: C.tealLt, Liability: C.redLt, Equity: C.ppeLt,
};
const GRID = "26px 1fr 120px 100px 130px 200px";

// Normalise an account label so JE line labels join to Connected-GL account names
// (drops "To ", parentheticals, bracketed placeholders, "A/c", punctuation).
function normAcct(s: string): string {
  return s.toLowerCase()
    .replace(/^to\s+/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\ba\/c\b|\baccount\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Connected GLs derived from JE lines (used by every template except PPE).
function DerivedConnectedTab({ stages, name }: { stages: LifecycleStage[]; name: string }) {
  const accounts = useMemo(() => {
    const m = new Map<string, { label: string; glNo: string; dr: boolean; cr: boolean; refs: string[] }>();
    for (const s of stages) for (const e of s.entries) for (const l of e.lines ?? []) {
      const label = (l.label ?? "").trim();
      if (!label) continue;
      const key = normAcct(label);
      const cur = m.get(key) ?? { label, glNo: "", dr: false, cr: false, refs: [] };
      if (l.glNo?.trim()) cur.glNo = l.glNo.trim();
      if (l.side === "Dr") cur.dr = true; else cur.cr = true;
      if (!cur.refs.includes(e.entryRef)) cur.refs.push(e.entryRef);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) =>
      a.glNo && b.glNo ? a.glNo.localeCompare(b.glNo, undefined, { numeric: true }) : a.glNo ? -1 : b.glNo ? 1 : a.label.localeCompare(b.label));
  }, [stages]);
  const assigned = accounts.filter((a) => a.glNo).length;
  const GR = "120px 1fr 90px 1fr";

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Connected GL Accounts — {name}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Auto-populated from every account used in the Lifecycle JEs. Assign a GL number on each JE line (Lifecycle JEs tab) and it appears here.</div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 16px", marginBottom: 12 }}>
        <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>CONNECTED ACCOUNTS</div><div style={{ fontSize: 15, fontWeight: 800, fontFamily: C.mono, color: C.text }}>{accounts.length}</div></div>
        <div><div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>GL NO. ASSIGNED</div><div style={{ fontSize: 15, fontWeight: 800, fontFamily: C.mono, color: assigned === accounts.length && accounts.length ? C.green : C.amber }}>{assigned} / {accounts.length}</div></div>
        <div style={{ marginLeft: "auto" }}><Chip text="Source: Lifecycle JEs" tone="ppe" /></div>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: GR, gap: 10, alignItems: "center", padding: "8px 14px", background: C.text }}>
          {["GL Number", "Account Name", "Nature", "Used In (Entries)"].map((h) => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>{h}</div>
          ))}
        </div>
        {accounts.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 12.5 }}>No accounts yet — add Journal Entries on the Lifecycle JEs tab.</div>
        ) : accounts.map((a, i) => (
          <div key={a.label + i} style={{ display: "grid", gridTemplateColumns: GR, gap: 10, alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: i % 2 ? C.surface2 : "#fff" }}>
            <div>{a.glNo
              ? <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.ppe, background: C.ppeLt, border: `1px solid ${C.ppeMed}`, borderRadius: 6, padding: "3px 8px" }}>{a.glNo}</span>
              : <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>unassigned</span>}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.label}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {a.dr && <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenLt, border: `1px solid ${C.greenMed}`, borderRadius: 4, padding: "1px 6px" }}>Dr</span>}
              {a.cr && <span style={{ fontSize: 10, fontWeight: 700, color: C.text2, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>Cr</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {a.refs.map((r) => <span key={r} style={{ fontSize: 9.5, color: C.text2, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px" }}>{r}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACCT_TYPES: AcctType[] = ["Asset", "Contra", "Expense", "Income", "Liability", "Equity"];

function ConnectedTab({ stages, name, connected, connData, onSetConn }: { stages: LifecycleStage[]; name: string; connected?: ConnectedDef; connData: ConnData; onSetConn: (account: string, patch: { amount?: string; classification?: string }) => void }) {
  // GL numbers entered on JE lines, keyed by normalised account name.
  const glFromJE = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stages) for (const e of s.entries) for (const l of e.lines ?? []) {
      const g = (l.glNo ?? "").trim();
      if (g && l.label?.trim()) m.set(normAcct(l.label), g);
    }
    return m;
  }, [stages]);

  // Templates without a curated account list fall back to deriving from JE lines.
  if (!connected) return <DerivedConnectedTab stages={stages} name={name} />;

  const clsOptions = [...new Set(connected.accts.map((x) => x.cls))];

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Connected GL Accounts — {name}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{connected.caption}</div>
        <div style={{ fontSize: 11, color: C.ppe, marginTop: 4 }}>GL No. auto-fills from the matching Lifecycle JE line (green = sourced from a JE); blank rows remain manually editable.</div>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 10, alignItems: "center", padding: "8px 14px", background: C.text }}>
          <div />
          {["Account Name", "GL Number", "Type", "Amount (₹L)", "Classification"].map((h) => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>{h}</div>
          ))}
        </div>
        {connected.accts.map((a, i) => {
          const grp = connected.groups.find((g) => g.startAt === i);
          const jeGl = glFromJE.get(normAcct(a.name));
          return (
            <div key={a.name + i}>
              {grp && (
                <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 10, padding: "7px 14px", background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                  <div />
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: HEADER_TONE[grp.tone].color }}>{grp.label}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 10, alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: typeClr[a.type], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{a.icon}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div>
                {jeGl
                  ? <input value={jeGl} readOnly title="Auto-filled from the Lifecycle JEs tab" style={{ ...monoInput, fontSize: 12, height: 30, textAlign: "center", padding: "0 6px", background: C.ppeLt, borderColor: C.ppeMed, color: C.ppe, fontWeight: 700 }} />
                  : <input placeholder="GL No." style={{ ...monoInput, fontSize: 12, height: 30, textAlign: "center", padding: "0 6px" }} />}
                <select defaultValue={a.type} style={{ ...inputStyle, fontSize: 11, height: 30, padding: "0 6px" }}>
                  {ACCT_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>₹</span>
                  <input type="number" min={0} step="0.01" placeholder="0.00" value={connData[a.name]?.amount ?? ""} onChange={(e) => onSetConn(a.name, { amount: e.target.value })} title="Working amount — rolls up into the P&L (AUTO)" style={{ ...monoInput, fontSize: 12, height: 30, textAlign: "right", padding: "0 6px" }} />
                </div>
                <select value={connData[a.name]?.classification ?? a.cls} onChange={(e) => onSetConn(a.name, { classification: e.target.value })} style={{ ...inputStyle, fontSize: 11, height: 30, padding: "0 6px" }}>
                  {clsOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — Audit Assertions
// ════════════════════════════════════════════════════════════════════════════
const badgeTone: Record<Tone, { bg: string; color: string }> = {
  ppe: { bg: C.ppeLt, color: C.ppe }, green: { bg: C.greenLt, color: C.green }, amber: { bg: C.amberLt, color: C.amber },
  purple: { bg: C.purpleLt, color: C.purple }, red: { bg: C.redLt, color: C.red }, accent: { bg: C.accentLt, color: C.accent },
};

function AssertionsTab({ name, assertions, status, onSet }: { name: string; assertions: AssertionDef[]; status: CheckStatus; onSet: (id: string, val: "yes" | "no" | null) => void }) {
  const done = assertions.filter((a) => status[`assert:${a.badge}`] === "yes").length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Audit Assertions — {name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Mark each assertion Yes (satisfied) or No once evidence is evaluated. Marks auto-save.</div>
        </div>
        <Chip text={`${done} / ${assertions.length} marked Yes`} tone={done === assertions.length ? "green" : "amber"} />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {assertions.map((a) => {
          const bt = badgeTone[a.tone];
          const id = `assert:${a.badge}`;
          return (
            <div key={a.badge} style={{ display: "grid", gridTemplateColumns: "260px 1fr", borderBottom: `1px solid ${C.border}`, padding: "16px 4px", alignItems: "start" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingRight: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0, background: bt.bg, color: bt.color }}>{a.badge}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{a.desc}</div>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  {a.chips.map((c) => <Chip key={c.text} text={c.text} tone={c.tone} />)}
                  <span style={{ marginLeft: "auto" }}><YesNo value={status[id]} onChange={(v) => onSet(id, v)} /></span>
                </div>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.75, padding: "10px 14px", background: C.surface2, borderRadius: 8, borderLeft: `3px solid ${C.ppe}` }}>{a.note}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — Variance Check (+ D1 sign-off)
// ════════════════════════════════════════════════════════════════════════════
function VarBox({ computed, tb }: { computed: number; tb: number }) {
  if (!computed || !tb) return <div style={{ ...varBoxBase, ...varNil }}>Enter values</div>;
  const d = Math.abs(computed - tb);
  const nil = d < 0.5;
  return <div style={{ ...varBoxBase, ...(nil ? varNil : varDiff) }}>{nil ? "NIL — Agrees" : "₹" + fmtN(d) + "L"}</div>;
}
const varBoxBase: React.CSSProperties = { padding: "10px 14px", borderRadius: 8, border: "1.5px solid", fontSize: 13, fontWeight: 600, fontFamily: C.mono, textAlign: "center" };
const varNil: React.CSSProperties = { borderColor: C.greenMed, background: C.greenLt, color: C.green };
const varDiff: React.CSSProperties = { borderColor: C.redMed, background: C.redLt, color: C.red };

function VarianceTab({
  name, hasDepnCalc, totals, taxRate, isSigned, signoffName, signoffAt, onOpenSignOff, onResetSignOff,
}: {
  name: string;
  hasDepnCalc: boolean;
  totals: { gross: number; bookDepn: number; clwdv: number };
  taxRate: string;
  isSigned: boolean;
  signoffName?: string;
  signoffAt?: string | number;
  onOpenSignOff: () => void;
  onResetSignOff: () => void | Promise<void>;
}) {
  // editable inputs
  const [v, setV] = useState({ opGross: "", disposals: "", transfers: "", tbGross: "", opAccum: "", depnDisposals: "", impairment: "", tbAccum: "", tbNet: "", taxWdvTotal: "", dtBooks: "", vTaxRate: taxRate });
  const s = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));
  const G = (cols: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, alignItems: "end" });
  const grp: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
  const step: React.CSSProperties = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 };

  // computed (mirrors HTML, additions/charge/bookWDV "from register")
  const additions = totals.gross, depnCharge = totals.bookDepn, bookWdv = totals.clwdv;
  const compGross = pc(v.opGross) + additions - pc(v.disposals) + pc(v.transfers);
  const compAccum = pc(v.opAccum) + depnCharge - pc(v.depnDisposals) + pc(v.impairment);
  const compNet = Math.max(0, compGross - compAccum);
  const tempDiffTotal = bookWdv - pc(v.taxWdvTotal);
  const dtComputed = Math.abs(tempDiffTotal) * (pc(v.vTaxRate) / 100);

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.muted, marginBottom: 16 }}>GL Reconciliation &amp; Reviewer Sign-off — {name}</div>

      {hasDepnCalc && (<>
      {/* Step 1 */}
      <div style={step}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Step 1 — Gross Block Movement Reconciliation</div>
        <div style={G(4)}>
          <div style={grp}><label style={lbl}>Opening Gross Block (₹L)</label><input style={monoInput} value={v.opGross} onChange={(e) => s("opGross", e.target.value)} placeholder="Prior year closing" /></div>
          <div style={grp}><label style={lbl}>Additions (₹L) <Tag text="From Register" kind="ppe" /></label><input style={ppeFilled} readOnly value={additions ? fmtN(additions) : ""} placeholder="From asset register" /></div>
          <div style={grp}><label style={lbl}>Disposals (₹L)</label><input style={monoInput} value={v.disposals} onChange={(e) => s("disposals", e.target.value)} placeholder="Gross block of disposed" /></div>
          <div style={grp}><label style={lbl}>Transfers / Adjustments (₹L)</label><input style={monoInput} value={v.transfers} onChange={(e) => s("transfers", e.target.value)} placeholder="CWIP → PPE transfers" /></div>
        </div>
        <div style={{ ...G(3), marginTop: 12 }}>
          <div style={grp}><label style={lbl}>Computed Closing Gross Block <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={compGross ? fmtN(compGross) : ""} /></div>
          <div style={grp}><label style={lbl}>Gross Block per TB (₹L)</label><input style={monoInput} value={v.tbGross} onChange={(e) => s("tbGross", e.target.value)} placeholder="Per trial balance" /></div>
          <div style={grp}><label style={lbl}>Variance <Tag text="Calculated" kind="auto" /></label><VarBox computed={compGross} tb={pc(v.tbGross)} /></div>
        </div>
      </div>

      {/* Step 2 */}
      <div style={step}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Step 2 — Accumulated Depreciation Roll-forward</div>
        <div style={G(4)}>
          <div style={grp}><label style={lbl}>Opening Accum. Depn (₹L)</label><input style={monoInput} value={v.opAccum} onChange={(e) => s("opAccum", e.target.value)} placeholder="Prior year" /></div>
          <div style={grp}><label style={lbl}>Depn Charge (₹L) <Tag text="From Register" kind="ppe" /></label><input style={ppeFilled} readOnly value={depnCharge ? fmtN(depnCharge) : ""} placeholder="From asset register" /></div>
          <div style={grp}><label style={lbl}>Depn on Disposals (₹L)</label><input style={monoInput} value={v.depnDisposals} onChange={(e) => s("depnDisposals", e.target.value)} placeholder="Accum depn on disposed assets" /></div>
          <div style={grp}><label style={lbl}>Impairment / Adjustments (₹L)</label><input style={monoInput} value={v.impairment} onChange={(e) => s("impairment", e.target.value)} placeholder="If any" /></div>
        </div>
        <div style={{ ...G(3), marginTop: 12 }}>
          <div style={grp}><label style={lbl}>Computed Closing Accum. Depn <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={compAccum ? fmtN(compAccum) : ""} /></div>
          <div style={grp}><label style={lbl}>Accum. Depn per TB (₹L)</label><input style={monoInput} value={v.tbAccum} onChange={(e) => s("tbAccum", e.target.value)} placeholder="Per trial balance" /></div>
          <div style={grp}><label style={lbl}>Variance <Tag text="Calculated" kind="auto" /></label><VarBox computed={compAccum} tb={pc(v.tbAccum)} /></div>
        </div>
      </div>

      {/* Step 3 */}
      <div style={step}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Step 3 — Net Block (Gross Block − Accum. Depn − Impairment)</div>
        <div style={G(3)}>
          <div style={grp}><label style={lbl}>Net Block Computed <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={compNet ? fmtN(compNet) : ""} placeholder="Gross − Accum. Depn" /></div>
          <div style={grp}><label style={lbl}>Net Block per TB (₹L)</label><input style={monoInput} value={v.tbNet} onChange={(e) => s("tbNet", e.target.value)} placeholder="Per trial balance" /></div>
          <div style={grp}><label style={lbl}>Variance <Tag text="Calculated" kind="auto" /></label><VarBox computed={compNet} tb={pc(v.tbNet)} /></div>
        </div>
      </div>

      {/* Step 4 */}
      <div style={step}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Step 4 — Deferred Tax Balance Check (Book WDV vs Tax WDV)</div>
        <div style={G(4)}>
          <div style={grp}><label style={lbl}>Total Book WDV (₹L) <Tag text="From Register" kind="ppe" /></label><input style={ppeFilled} readOnly value={bookWdv ? fmtN(bookWdv) : ""} placeholder="From depn calculator" /></div>
          <div style={grp}><label style={lbl}>Total Tax WDV (₹L)</label><input style={monoInput} value={v.taxWdvTotal} onChange={(e) => s("taxWdvTotal", e.target.value)} placeholder="Per IT computation" /></div>
          <div style={grp}><label style={lbl}>Temporary Difference <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={v.taxWdvTotal ? (tempDiffTotal >= 0 ? "+" : "") + fmtN(tempDiffTotal) : ""} /></div>
          <div style={grp}><label style={lbl}>Applicable Tax Rate (%)</label><input style={monoInput} value={v.vTaxRate} onChange={(e) => s("vTaxRate", e.target.value)} /></div>
        </div>
        <div style={{ ...G(3), marginTop: 12 }}>
          <div style={grp}><label style={lbl}>Computed DT Balance <Tag text="Calculated" kind="auto" /></label><input style={autofilled} readOnly value={v.taxWdvTotal ? fmtN(dtComputed) : ""} /></div>
          <div style={grp}><label style={lbl}>DT Balance per Books (₹L)</label><input style={monoInput} value={v.dtBooks} onChange={(e) => s("dtBooks", e.target.value)} placeholder="Per TB (DTL/DTA)" /></div>
          <div style={grp}><label style={lbl}>DT Variance <Tag text="Calculated" kind="auto" /></label><VarBox computed={dtComputed} tb={pc(v.dtBooks)} /></div>
        </div>
      </div>
      </>)}

      {/* Reviewer sign-off (D1) */}
      <div style={{ background: "#fff", border: `1.5px solid ${isSigned ? C.greenMed : C.ppeMed}`, borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: isSigned ? C.greenLt : C.surface2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.ppeLt, border: `1px solid ${C.ppeMed}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>💬</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{isSigned ? "✓ Reviewer Signoff (recorded)" : "Reviewer Signoff"}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Overall conclusion on PPE existence, depreciation accuracy, deferred tax, CWIP, impairment</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.65, marginBottom: 14 }}>
            {isSigned
              ? `Signed off by ${signoffName} on ${signoffAt ? new Date(signoffAt).toLocaleString("en-IN") : ""}.`
              : "Signing off this template marks it complete in Execution AND flips the matching FS row in Planning → GL Line Items to 'Complete' (the D1 cross-module back-flow)."}
          </p>
          {isSigned ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={onResetSignOff} style={{ ...btnGhost, padding: "7px 14px" }}>Reset Signoff</button>
              <Link href="/planning/gl-items" style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>See Planning → GL Line Items (D1 mirror) →</Link>
            </div>
          ) : (
            <button onClick={onOpenSignOff} style={btnPrimary}>Sign Off Template</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 6 — Improvements
// ════════════════════════════════════════════════════════════════════════════
function ImprovementsTab({ name, checks, status, onSet }: { name: string; checks: CheckDef[]; status: CheckStatus; onSet: (id: string, val: "yes" | "no" | null) => void }) {
  const done = checks.filter((m) => status[`check:${m.n}`] === "yes").length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: C.amberLt, border: `1px solid ${C.amberMed}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💡</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Additional Checks — {name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Audit procedures & verification points for this GL · mark each Yes/No once performed.</div>
        </div>
        <span style={{ marginLeft: "auto" }}><Chip text={`${done} / ${checks.length} done`} tone={done === checks.length ? "green" : "amber"} /></span>
      </div>
      {checks.map((m) => {
        const h = HEADER_TONE[m.tone];
        const id = `check:${m.n}`;
        return (
          <div key={m.n} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, background: h.bg }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: h.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 800, flexShrink: 0 }}>{m.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: h.color }}>{m.title}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{m.sub}</div>
              </div>
              <span style={{ flexShrink: 0 }}><Chip text={m.priority} tone={m.tone} /></span>
              <span style={{ flexShrink: 0 }}><YesNo value={status[id]} onChange={(v) => onSet(id, v)} /></span>
            </div>
            <div style={{ padding: "14px 16px", fontSize: 12.5, color: C.text2, lineHeight: 1.75 }}>{m.body}</div>
          </div>
        );
      })}
    </div>
  );
}
