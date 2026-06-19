"use client";

/**
 * Tax Audit — Form 26 editor + print-ready form.
 * Section nav (Part A / B / Schedules / Part C-D), scalar clause fields, the
 * Cl.36 depreciation (≥180/<180), Cl.40 ICDS, Cl.49–51 TDS and Cl.53
 * quantitative schedules, GL auto-fill ("Pull from GLs"), completion tracking
 * and a print-isolated official Form 26. Persists on ClientRecord.taxAudit.
 */

import { useState } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { FORM26_SECTIONS, FORM26_CLAUSE_COUNT, IT_RATES, ICDS_LIST, pullFromGL, type TaxField } from "@/lib/taxaudit/form26";
import type { TaxAuditState, TaxRow } from "@/lib/types";
import { pc } from "@/lib/execution/pl-lines";
import { uid } from "@/lib/utils";

const EMPTY: TaxAuditState = { fields: {}, done: {}, depnFull: [], depnHalf: [], tds: [], icds: [], quant: [] };
const n2 = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TaxAudit() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updateTaxAudit);
  const [activeKey, setActiveKey] = useState("particulars");
  const [preview, setPreview] = useState(false);

  if (!active) return <div className="text-sm text-gray-500 py-6">Add or select a client first.</div>;
  const ta = active.taxAudit ?? EMPTY;
  const f = (k: string) => ta.fields[k] ?? "";
  const setField = (k: string, v: string) => void update({ fields: { [k]: v } });

  const doneCount = FORM26_SECTIONS.filter((s) => ta.done[s.key]).length;
  const pctSections = Math.round((doneCount / FORM26_SECTIONS.length) * 100);

  if (preview) return <Form26Document ta={ta} f={f} onBack={() => setPreview(false)} />;

  const section = FORM26_SECTIONS.find((s) => s.key === activeKey)!;
  const groups = [...new Set(FORM26_SECTIONS.map((s) => s.group))];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
      {/* nav */}
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-700">Completion</span>
            <span className="font-mono font-bold text-emerald-600">{doneCount} / {FORM26_SECTIONS.length}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctSections}%` }} /></div>
          <div className="text-[10px] text-gray-400 mt-1">Form 26 structure · {FORM26_CLAUSE_COUNT} clauses</div>
        </div>
        <nav className="rounded-lg border border-gray-200 bg-white p-1.5 space-y-0.5">
          {groups.map((g) => (
            <div key={g}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-2 pt-2 pb-0.5">{g}</div>
              {FORM26_SECTIONS.filter((s) => s.group === g).map((s) => (
                <button key={s.key} onClick={() => setActiveKey(s.key)}
                  className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-[12px] transition-colors ${activeKey === s.key ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span className="w-4">{s.icon}</span>
                  <span className="flex-1 truncate">{s.label}</span>
                  {ta.done[s.key] && <span className={activeKey === s.key ? "text-white" : "text-emerald-600"}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-1.5">
          <button onClick={() => void update({ fields: pullFromGL(active.execution) })} className="w-full text-xs font-semibold px-3 py-2 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50">📥 Pull from GLs</button>
          <button onClick={() => setPreview(true)} className="w-full text-xs font-semibold px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800">👁 Preview &amp; Print Form 26</button>
        </div>
      </div>

      {/* section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">{section.icon} {section.label}</h3>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <input type="checkbox" checked={!!ta.done[section.key]} onChange={(e) => update({ done: { [section.key]: e.target.checked } })} className="h-4 w-4 rounded border-gray-300 text-emerald-600" />
            Mark complete
          </label>
        </div>
        {section.note && <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 mb-3">{section.note}</p>}

        {/* scalar fields */}
        {section.fields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((fld) => (
              <FieldInput key={fld.key} fld={fld} fields={ta.fields} onChange={(v) => setField(fld.key, v)} />
            ))}
          </div>
        )}

        {section.special === "icdsApplic" && <IcdsApplic f={f} setField={setField} />}
        {section.special === "depn" && <DepnSchedule ta={ta} update={update} />}
        {section.special === "tds" && <TdsSchedule ta={ta} update={update} />}
        {section.special === "icdsAdj" && <IcdsAdjSchedule ta={ta} update={update} />}
        {section.special === "quant" && <QuantSchedule ta={ta} update={update} />}
      </div>
    </div>
  );
}

function FieldInput({ fld, fields, onChange }: { fld: TaxField; fields: Record<string, string>; onChange: (v: string) => void }) {
  const value = fields[fld.key] ?? "";
  const full = fld.type === "textarea";
  const base = "w-full mt-1 text-sm border rounded px-2.5 py-1.5 outline-none focus:border-blue-400";
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{fld.label}{fld.type === "auto" && <span className="ml-1 text-[9px] text-emerald-600">⚡ auto</span>}</label>
      {fld.type === "computed" ? (
        <div className="mt-1 text-sm font-mono font-semibold bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 text-blue-800">{fld.compute!(fields) || "—"}</div>
      ) : fld.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${base} border-gray-300`}>
          <option value="">— select —</option>
          {fld.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : fld.type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${base} border-gray-300 resize-y`} />
      ) : (
        <input type={fld.type === "num" || fld.type === "auto" ? "number" : fld.type === "date" ? "date" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={fld.placeholder}
          className={`${base} font-mono ${fld.type === "auto" ? "bg-emerald-50 border-emerald-200" : "border-gray-300"}`} />
      )}
    </div>
  );
}

function IcdsApplic({ f, setField }: { f: (k: string) => string; setField: (k: string, v: string) => void }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">ICDS Applicability (Cl. 3)</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {ICDS_LIST.map((label, i) => {
          const k = `icds-${i}`; const v = f(k) || "No";
          return (
            <div key={k} className="flex items-center justify-between text-xs border border-gray-200 rounded px-2.5 py-1.5">
              <span className="text-gray-700">ICDS {label}</span>
              <div className="flex gap-1">
                {["Yes", "No"].map((opt) => (
                  <button key={opt} onClick={() => setField(k, opt)} className={`px-2 py-0.5 rounded text-[11px] font-semibold ${v === opt ? (opt === "Yes" ? "bg-emerald-600 text-white" : "bg-gray-700 text-white") : "bg-gray-100 text-gray-500"}`}>{opt}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Schedule editors ─────────────────────────────────────────────────────────
const tcell = "w-full text-xs border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400";

function DepnSchedule({ ta, update }: { ta: TaxAuditState; update: (p: Partial<TaxAuditState>) => void }) {
  const rate = (s: string) => parseFloat(s) || 0;
  const setFull = (rows: TaxRow[]) => update({ depnFull: rows });
  const setHalf = (rows: TaxRow[]) => update({ depnHalf: rows });
  const pf = (id: string, p: Record<string, string>) => setFull(ta.depnFull.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const ph = (id: string, p: Record<string, string>) => setHalf(ta.depnHalf.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const addFull = () => setFull([...ta.depnFull, { id: uid("df"), block: "", open: "", add: "", del: "", rate: IT_RATES[2] }]);
  const addHalf = () => setHalf([...ta.depnHalf, { id: uid("dh"), block: "", add: "", rate: IT_RATES[3] }]);

  let tFW = 0, tFDep = 0, tFC = 0, tHDep = 0;
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Assets used ≥180 days (full rate)</div>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-xs" style={{ minWidth: 760 }}>
            <thead><tr className="bg-gray-900 text-gray-300 text-[10px] uppercase">
              {["Block", "Opening WDV", "Additions", "Deletions", "WDV for Depn", "IT Rate", "Depreciation", "Closing WDV", ""].map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {ta.depnFull.length === 0 ? <tr><td colSpan={9} className="px-3 py-4 text-center text-gray-400">No blocks — add one.</td></tr> : ta.depnFull.map((r) => {
                const wdv = pc(r.open) + pc(r.add) - pc(r.del); const dep = wdv * rate(r.rate) / 100; const close = wdv - dep;
                tFW += wdv; tFDep += dep; tFC += close;
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-1.5 py-1" style={{ minWidth: 120 }}><input value={r.block} onChange={(e) => pf(r.id, { block: e.target.value })} placeholder="Plant & Machinery" className={tcell} /></td>
                    <td className="px-1.5 py-1"><input value={r.open} onChange={(e) => pf(r.id, { open: e.target.value })} type="number" className={`${tcell} font-mono text-right`} /></td>
                    <td className="px-1.5 py-1"><input value={r.add} onChange={(e) => pf(r.id, { add: e.target.value })} type="number" className={`${tcell} font-mono text-right`} /></td>
                    <td className="px-1.5 py-1"><input value={r.del} onChange={(e) => pf(r.id, { del: e.target.value })} type="number" className={`${tcell} font-mono text-right`} /></td>
                    <td className="px-1.5 py-1 text-right font-mono text-gray-600">{n2(wdv)}</td>
                    <td className="px-1.5 py-1" style={{ minWidth: 140 }}><select value={r.rate} onChange={(e) => pf(r.id, { rate: e.target.value })} className={tcell}>{IT_RATES.map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
                    <td className="px-1.5 py-1 text-right font-mono font-semibold text-emerald-700">{n2(dep)}</td>
                    <td className="px-1.5 py-1 text-right font-mono text-gray-600">{n2(close)}</td>
                    <td className="px-1.5 py-1"><button onClick={() => setFull(ta.depnFull.filter((x) => x.id !== r.id))} className="text-gray-400 hover:text-red-600">✕</button></td>
                  </tr>
                );
              })}
            </tbody>
            {ta.depnFull.length > 0 && <tfoot><tr className="bg-emerald-50 font-bold"><td colSpan={4} className="px-2 py-1.5">TOTAL</td><td className="px-1.5 py-1.5 text-right font-mono">{n2(tFW)}</td><td /><td className="px-1.5 py-1.5 text-right font-mono">{n2(tFDep)}</td><td className="px-1.5 py-1.5 text-right font-mono">{n2(tFC)}</td><td /></tr></tfoot>}
          </table>
        </div>
        <button onClick={addFull} className="mt-1.5 text-xs font-semibold text-blue-600 hover:underline">+ Add block (≥180 days)</button>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Assets used &lt;180 days (half rate)</div>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-xs" style={{ minWidth: 520 }}>
            <thead><tr className="bg-gray-900 text-gray-300 text-[10px] uppercase">{["Block", "Additions <180d", "IT Rate", "Depreciation @50%", ""].map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {ta.depnHalf.length === 0 ? <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No blocks — add one.</td></tr> : ta.depnHalf.map((r) => {
                const dep = pc(r.add) * rate(r.rate) / 200; tHDep += dep;
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-1.5 py-1" style={{ minWidth: 140 }}><input value={r.block} onChange={(e) => ph(r.id, { block: e.target.value })} placeholder="Computers" className={tcell} /></td>
                    <td className="px-1.5 py-1"><input value={r.add} onChange={(e) => ph(r.id, { add: e.target.value })} type="number" className={`${tcell} font-mono text-right`} /></td>
                    <td className="px-1.5 py-1" style={{ minWidth: 140 }}><select value={r.rate} onChange={(e) => ph(r.id, { rate: e.target.value })} className={tcell}>{IT_RATES.map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
                    <td className="px-1.5 py-1 text-right font-mono font-semibold text-emerald-700">{n2(dep)}</td>
                    <td className="px-1.5 py-1"><button onClick={() => setHalf(ta.depnHalf.filter((x) => x.id !== r.id))} className="text-gray-400 hover:text-red-600">✕</button></td>
                  </tr>
                );
              })}
            </tbody>
            {ta.depnHalf.length > 0 && <tfoot><tr className="bg-emerald-50 font-bold"><td colSpan={3} className="px-2 py-1.5">TOTAL</td><td className="px-1.5 py-1.5 text-right font-mono">{n2(tHDep)}</td><td /></tr></tfoot>}
          </table>
        </div>
        <button onClick={addHalf} className="mt-1.5 text-xs font-semibold text-blue-600 hover:underline">+ Add block (&lt;180 days)</button>
        <div className="mt-2 text-xs font-semibold text-gray-700">Total depreciation (Cl. 36): <span className="font-mono text-emerald-700">₹ {n2(tFDep + tHDep)} L</span></div>
      </div>
    </div>
  );
}

function GenericTable({ rows, cols, onChange, blank, addLabel }: { rows: TaxRow[]; cols: { key: string; label: string; type?: "text" | "num" | "select"; options?: string[]; w?: number }[]; onChange: (rows: TaxRow[]) => void; blank: () => TaxRow; addLabel: string }) {
  const patch = (id: string, p: Record<string, string>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <div>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs" style={{ minWidth: 640 }}>
          <thead><tr className="bg-gray-900 text-gray-300 text-[10px] uppercase">{cols.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-semibold">{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-center text-gray-400">No rows — add one.</td></tr> : rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                {cols.map((c) => (
                  <td key={c.key} className="px-1.5 py-1" style={{ minWidth: c.w ?? 90 }}>
                    {c.type === "select"
                      ? <select value={r[c.key] ?? ""} onChange={(e) => patch(r.id, { [c.key]: e.target.value })} className={tcell}>{c.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                      : <input value={r[c.key] ?? ""} onChange={(e) => patch(r.id, { [c.key]: e.target.value })} type={c.type === "num" ? "number" : "text"} className={`${tcell}${c.type === "num" ? " font-mono text-right" : ""}`} />}
                  </td>
                ))}
                <td className="px-1.5 py-1"><button onClick={() => onChange(rows.filter((x) => x.id !== r.id))} className="text-gray-400 hover:text-red-600">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => onChange([...rows, blank()])} className="mt-1.5 text-xs font-semibold text-blue-600 hover:underline">{addLabel}</button>
    </div>
  );
}

function TdsSchedule({ ta, update }: { ta: TaxAuditState; update: (p: Partial<TaxAuditState>) => void }) {
  return <GenericTable rows={ta.tds} onChange={(tds) => update({ tds })} blank={() => ({ id: uid("td"), section: "", nature: "", paid: "", deducted: "", deposited: "", txns: "", unrep: "", unrepAmt: "", complied: "✓ Yes" })}
    addLabel="+ Add TDS section" cols={[
      { key: "section", label: "Section", w: 80 }, { key: "nature", label: "Nature", w: 120 }, { key: "paid", label: "Amt Paid", type: "num" }, { key: "deducted", label: "TDS Deducted", type: "num" }, { key: "deposited", label: "TDS Deposited", type: "num" },
      { key: "txns", label: "Total Txns", type: "num", w: 80 }, { key: "unrep", label: "Unreported Txns", type: "num", w: 90 }, { key: "unrepAmt", label: "Unreported Amt", type: "num" }, { key: "complied", label: "Complied?", type: "select", options: ["✓ Yes", "✗ No", "⚠ Partial"], w: 90 },
    ]} />;
}
function IcdsAdjSchedule({ ta, update }: { ta: TaxAuditState; update: (p: Partial<TaxAuditState>) => void }) {
  return <GenericTable rows={ta.icds} onChange={(icds) => update({ icds })} blank={() => ({ id: uid("ic"), icds: ICDS_LIST[0], desc: "", inc: "", dec: "" })}
    addLabel="+ Add ICDS adjustment" cols={[{ key: "icds", label: "ICDS", type: "select", options: ICDS_LIST, w: 200 }, { key: "desc", label: "Description", w: 200 }, { key: "inc", label: "Increase in Income", type: "num" }, { key: "dec", label: "Decrease in Income", type: "num" }]} />;
}
function QuantSchedule({ ta, update }: { ta: TaxAuditState; update: (p: Partial<TaxAuditState>) => void }) {
  return <GenericTable rows={ta.quant} onChange={(quant) => update({ quant })} blank={() => ({ id: uid("q"), cat: "", unit: "", open: "", purch: "", sales: "", close: "", value: "" })}
    addLabel="+ Add category" cols={[{ key: "cat", label: "Category", w: 140 }, { key: "unit", label: "Unit", w: 70 }, { key: "open", label: "Opening Qty", type: "num" }, { key: "purch", label: "Purchases/Prod", type: "num" }, { key: "sales", label: "Sales/Consump", type: "num" }, { key: "close", label: "Closing Qty", type: "num" }, { key: "value", label: "Value (₹)", type: "num" }]} />;
}

// ── Print-ready Form 26 ─────────────────────────────────────────────────────
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #form26-doc, #form26-doc * { visibility: visible !important; }
  #form26-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 0 10mm; }
  .no-print { display: none !important; }
}`;

function Form26Document({ ta, f, onBack }: { ta: TaxAuditState; f: (k: string) => string; onBack: () => void }) {
  const rate = (s: string) => parseFloat(s) || 0;
  const depnFull = ta.depnFull.reduce((s, r) => s + (pc(r.open) + pc(r.add) - pc(r.del)) * rate(r.rate) / 100, 0);
  const depnHalf = ta.depnHalf.reduce((s, r) => s + pc(r.add) * rate(r.rate) / 200, 0);
  const totalReceipts = pc(f("revOps")) + pc(f("otherInc"));
  const totalExp = pc(f("matCost")) + pc(f("empCost")) + pc(f("finCost")) + pc(f("depnBooks")) + pc(f("otherExp"));
  const Row = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between border-b border-gray-200 py-1"><span className="text-gray-600">{l}</span><span className="font-mono font-semibold">{v || "—"}</span></div>;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="no-print flex items-center justify-between mb-3">
        <button onClick={onBack} className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">← Back to editor</button>
        <button onClick={() => window.print()} className="text-xs font-semibold px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-gray-800">🖨 Print Form 26</button>
      </div>

      <div id="form26-doc" className="mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-3xl text-[12px] text-gray-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <h1 className="text-center font-bold text-[15px]">FORM No. 26</h1>
        <p className="text-center text-[11px] text-gray-600 mb-1">Audit report under section 63 of the Income-tax Act, 2025 · Rule 47</p>
        <p className="text-center text-[11px] text-gray-500 mb-4">(Replaces Form 3CA / 3CB / 3CD · Tax Year {f("taxYear") || "2026-27"})</p>

        <h3 className="font-bold text-[13px] mb-1">Part A — Particulars of Assessee</h3>
        <Row l="Name of assessee" v={f("assesseeName")} />
        <Row l="PAN" v={f("pan")} /><Row l="Status" v={f("status")} />
        <Row l="Nature of business" v={f("natureBusiness")} /><Row l="GSTIN" v={f("gstin")} />
        <Row l="Accounting software / server" v={[f("software"), f("serverLocation")].filter(Boolean).join(" · ")} />

        <h3 className="font-bold text-[13px] mt-4 mb-1">Part B — Income, Expenditure &amp; Schedules</h3>
        <Row l="Method of accounting (Cl. 1)" v={f("method")} />
        <Row l="Revenue from operations (Cl. 6)" v={f("revOps")} /><Row l="Other income (Cl. 7)" v={f("otherInc")} />
        <Row l="Total receipts" v={n2(totalReceipts)} />
        <Row l="Total expenditure (Cl. 11–15)" v={n2(totalExp)} />
        <Row l="Depreciation — Cl. 36 (≥180 + <180 days)" v={n2(depnFull + depnHalf)} />
        <Row l="MSME disallowance — Sec 35(b) (Cl. 39)" v={n2(Math.max(0, pc(f("msmeBal")) - pc(f("msmePaid"))))} />
        <Row l="Turnover difference — books vs GSTR-1 (Cl. 52)" v={n2(pc(f("turnoverBooks")) - pc(f("gstr1Turn")))} />
        <Row l="ITC difference — books vs GSTR-2B (Cl. 52)" v={n2(pc(f("itcBooks")) - pc(f("itc2b")))} />

        <h3 className="font-bold text-[13px] mt-4 mb-1">{f("reportPart")?.startsWith("Part D") ? "Part D" : "Part C"} — Audit Report</h3>
        <p className="text-justify mb-2">In my / our opinion and to the best of my / our information and according to the explanations given to me / us, the particulars given in this Form No. 26 and the annexures thereto are true and correct, and the accounts examined give a true and fair view of the state of affairs of the assessee for the tax year ended {f("yearEnding") || "31 March"}.</p>

        <div className="mt-6 text-[12px]">
          <p className="font-semibold">For {f("caFirm") || "[Firm Name]"}</p>
          <p>Chartered Accountants · FRN {f("frn") || "[FRN]"}</p>
          <div className="mt-5">
            <p className="font-semibold">{f("partner") || "[Partner]"}</p>
            <p>Partner · Membership No. {f("membershipNo") || "[M. No.]"}</p>
            <p>UDIN: {f("udin") || "[UDIN]"}</p>
          </div>
          <div className="mt-3 flex gap-8"><span>Place: {f("place") || "[Place]"}</span><span>Date: {f("reportDate") || "[Date]"}</span></div>
        </div>
      </div>
    </div>
  );
}
