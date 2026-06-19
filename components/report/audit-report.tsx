"use client";

/**
 * Independent Auditor's Report — section editor + print-ready document.
 *
 * Edit mode: 12-section nav + per-section fields, opinion-type selector,
 * KAM cards, standard-paragraph fills, completion tracking.
 * Preview mode: assembles a formal "Independent Auditor's Report" in a
 * print-isolated container; the Print button produces the official report.
 */

import { useMemo, useState } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { REPORT_SECTIONS, OPINION_META, type RField } from "@/lib/report/sections";
import type { AuditReportState, KamItem, OpinionType } from "@/lib/types";
import { uid } from "@/lib/utils";

const EMPTY: AuditReportState = { opinionType: "unmodified", fields: {}, kam: [], done: {} };
const OPINIONS: OpinionType[] = ["unmodified", "qualified", "adverse", "disclaimer"];

export function AuditReport() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updateReport);
  const [activeKey, setActiveKey] = useState("cover");
  const [preview, setPreview] = useState(false);

  if (!active) return <div className="text-sm text-gray-500 py-6">Add or select a client first.</div>;
  const r = active.report ?? EMPTY;
  const f = (k: string) => r.fields[k] ?? "";
  const setField = (k: string, v: string) => void update({ fields: { [k]: v } });

  const doneCount = REPORT_SECTIONS.filter((s) => r.done[s.key]).length;
  const pct = Math.round((doneCount / REPORT_SECTIONS.length) * 100);

  const fillAll = () => {
    const next: Record<string, string> = {};
    for (const s of REPORT_SECTIONS) for (const fld of s.fields) if (fld.std && !(r.fields[fld.key]?.trim())) next[fld.key] = fld.std(r.fields);
    if (Object.keys(next).length) void update({ fields: next });
  };

  if (preview) return <ReportDocument r={r} f={f} onBack={() => setPreview(false)} />;

  const section = REPORT_SECTIONS.find((s) => s.key === activeKey)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-4">
      {/* nav */}
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-700">Completion</span>
            <span className="font-mono font-bold text-emerald-600">{doneCount} / {REPORT_SECTIONS.length}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
        <nav className="rounded-lg border border-gray-200 bg-white p-1.5">
          {REPORT_SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setActiveKey(s.key)}
              className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-[12.5px] transition-colors ${activeKey === s.key ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}>
              <span className="w-4">{s.icon}</span>
              <span className="flex-1 truncate">{s.label}</span>
              {r.done[s.key] && <span className={activeKey === s.key ? "text-white" : "text-emerald-600"}>✓</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-1.5">
          <button onClick={fillAll} className="w-full text-xs font-semibold px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">⚡ Fill All Standards</button>
          <button onClick={() => setPreview(true)} className="w-full text-xs font-semibold px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800">👁 Preview &amp; Print Official Report</button>
        </div>
      </div>

      {/* section editor */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">{section.icon} {section.label}</h3>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <input type="checkbox" checked={!!r.done[section.key]} onChange={(e) => update({ done: { [section.key]: e.target.checked } })} className="h-4 w-4 rounded border-gray-300 text-emerald-600" />
            Mark complete
          </label>
        </div>
        {section.note && <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 mb-3">{section.note}</p>}

        {section.key === "opinion" && <OpinionPicker r={r} onPick={(t) => update({ opinionType: t })} />}
        {section.key === "kam" ? <KamEditor r={r} update={update} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((fld) => {
              // hide modification basis unless opinion is modified
              if (fld.key === "qualification" && r.opinionType === "unmodified") return null;
              const full = fld.type === "textarea";
              return (
                <div key={fld.key} className={full ? "md:col-span-2" : ""}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {fld.key === "qualification" ? OPINION_META[r.opinionType].basisHeading : fld.label}{fld.required && <span className="text-red-500"> *</span>}
                    </label>
                    {fld.std && <button onClick={() => setField(fld.key, fld.std!(r.fields))} className="text-[10px] font-semibold text-blue-600 hover:underline">⚡ Fill standard</button>}
                  </div>
                  <FieldInput fld={fld} value={f(fld.key)} onChange={(v) => setField(fld.key, v)} />
                </div>
              );
            })}
            {section.key === "signature" && <SignatureEcho f={f} />}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ fld, value, onChange }: { fld: RField; value: string; onChange: (v: string) => void }) {
  const cls = "w-full mt-1 text-sm border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:border-blue-400";
  if (fld.type === "textarea") return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={fld.rows ?? 4} placeholder={fld.placeholder} className={`${cls} leading-relaxed resize-y`} />;
  if (fld.type === "select") return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
      <option value="">— select —</option>
      {fld.options!.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return <input type={fld.type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={fld.placeholder} className={cls} />;
}

function OpinionPicker({ r, onPick }: { r: AuditReportState; onPick: (t: OpinionType) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      {OPINIONS.map((t) => {
        const m = OPINION_META[t];
        const on = r.opinionType === t;
        return (
          <button key={t} onClick={() => onPick(t)}
            className={`text-left rounded-lg border p-2.5 transition-colors ${on ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
            <div className="text-sm font-bold">{m.icon} {m.label}</div>
            <div className="text-[10.5px] text-gray-500 mt-0.5">{m.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function SignatureEcho({ f }: { f: (k: string) => string }) {
  return (
    <div className="md:col-span-2 mt-1 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 leading-relaxed">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Signature block (from Cover & Engagement)</div>
      For <strong>{f("firmName") || "[Firm Name]"}</strong>, Chartered Accountants · FRN {f("frn") || "[FRN]"}<br />
      <strong>{f("partner") || "[Partner]"}</strong>, Partner · Membership No. {f("membershipNo") || "[M. No.]"}<br />
      Place: {f("place") || "[Place]"} · Date: {f("reportDate") || "[Date]"}
    </div>
  );
}

function KamEditor({ r, update }: { r: AuditReportState; update: (p: Partial<AuditReportState>) => void }) {
  const patch = (id: string, p: Partial<KamItem>) => update({ kam: r.kam.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  const add = () => update({ kam: [...r.kam, { id: uid("kam"), title: "", description: "", procedures: "" }] });
  const remove = (id: string) => update({ kam: r.kam.filter((k) => k.id !== id) });
  const cls = "w-full mt-1 text-sm border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:border-blue-400";
  return (
    <div className="space-y-3">
      {r.kam.length === 0 && <p className="text-xs text-gray-500">No Key Audit Matters yet. Add one per significant matter (SA 701).</p>}
      {r.kam.map((k, i) => (
        <div key={k.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-500">KAM {i + 1}</span>
            <button onClick={() => remove(k.id)} className="text-gray-400 hover:text-red-600 text-sm">✕</button>
          </div>
          <input value={k.title} onChange={(e) => patch(k.id, { title: e.target.value })} placeholder="Matter title (e.g. Revenue recognition)" className={`${cls} font-semibold`} />
          <textarea value={k.description} onChange={(e) => patch(k.id, { description: e.target.value })} rows={2} placeholder="Why it was determined to be a key audit matter" className={cls} />
          <textarea value={k.procedures} onChange={(e) => patch(k.id, { procedures: e.target.value })} rows={2} placeholder="How the matter was addressed in the audit" className={cls} />
        </div>
      ))}
      <button onClick={add} className="text-xs font-semibold px-3 py-1.5 rounded border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50">+ Add Key Audit Matter</button>
    </div>
  );
}

// ── Print-ready official report ─────────────────────────────────────────────
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #report-doc, #report-doc * { visibility: visible !important; }
  #report-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 0 12mm; }
  .no-print { display: none !important; }
}`;

function ReportDocument({ r, f, onBack }: { r: AuditReportState; f: (k: string) => string; onBack: () => void }) {
  const m = OPINION_META[r.opinionType];
  const gcMaterial = f("gcStatus").startsWith("Material uncertainty");
  const para = (s: string) => s.split("\n").filter(Boolean).map((line, i) => <p key={i} className="mb-2 text-justify">{line}</p>);
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="font-bold text-[13px] mt-4 mb-1.5">{children}</h3>;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="no-print flex items-center justify-between mb-3">
        <button onClick={onBack} className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">← Back to editor</button>
        <button onClick={() => window.print()} className="text-xs font-semibold px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-gray-800">🖨 Print Official Report</button>
      </div>

      <div id="report-doc" className="mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-3xl text-[12.5px] text-gray-900 leading-relaxed" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <h1 className="text-center font-bold text-[16px] tracking-wide mb-1">INDEPENDENT AUDITOR&apos;S REPORT</h1>
        <p className="mb-3">{f("addressee") || `To the Members of ${f("companyName") || "[Company Name]"}`}</p>

        <p className="font-bold text-[13px] mb-1">Report on the Audit of the Financial Statements</p>

        <H>{m.heading}</H>
        {f("opinion") ? para(f("opinion")) : <p className="italic text-gray-400">[Opinion paragraph]</p>}

        <H>{m.basisHeading}</H>
        {r.opinionType !== "unmodified" && f("qualification") && para(f("qualification"))}
        {f("basis") ? para(f("basis")) : <p className="italic text-gray-400">[Basis for opinion]</p>}
        {f("basisAdd") && para(f("basisAdd"))}

        {f("emphasis") && (<><H>Emphasis of Matter</H>{para(f("emphasis"))}</>)}
        {gcMaterial && f("gcNote") && (<><H>Material Uncertainty Related to Going Concern</H>{para(f("gcNote"))}</>)}

        {r.kam.length > 0 && (
          <>
            <H>Key Audit Matters</H>
            <p className="mb-2 text-justify">Key audit matters are those matters that, in our professional judgement, were of most significance in our audit of the financial statements of the current period. These matters were addressed in the context of our audit of the financial statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.</p>
            {r.kam.map((k, i) => (
              <div key={k.id} className="mb-2">
                <p className="font-semibold">{i + 1}. {k.title || "[KAM title]"}</p>
                {k.description && <p className="text-justify">{k.description}</p>}
                {k.procedures && <p className="text-justify"><em>Auditor&apos;s response: </em>{k.procedures}</p>}
              </div>
            ))}
          </>
        )}

        {f("otherInfo") && (<><H>Other Information</H>{para(f("otherInfo"))}</>)}
        {f("mgmtResp") && (<><H>Responsibilities of Management and Those Charged with Governance for the Financial Statements</H>{para(f("mgmtResp"))}</>)}
        {f("auditorResp") && (<><H>Auditor&apos;s Responsibilities for the Audit of the Financial Statements</H>{para(f("auditorResp"))}</>)}

        {(f("caro") || f("ifc")) && (
          <>
            <p className="font-bold text-[13px] mt-4 mb-1">Report on Other Legal and Regulatory Requirements</p>
            {f("caro") && para(f("caro"))}
            {f("ifc") && (<><H>Annexure A — Report on Internal Financial Controls</H>{para(f("ifc"))}</>)}
          </>
        )}

        {/* signature */}
        <div className="mt-8 text-[12.5px]">
          <p className="font-semibold">For {f("firmName") || "[Firm Name]"}</p>
          <p>Chartered Accountants</p>
          <p>Firm Registration No.: {f("frn") || "[FRN]"}</p>
          <div className="mt-6">
            <p className="font-semibold">{f("partner") || "[Engagement Partner]"}</p>
            <p>Partner</p>
            <p>Membership No.: {f("membershipNo") || "[M. No.]"}</p>
            <p>UDIN: {f("udin") || "[UDIN]"}</p>
          </div>
          <div className="mt-3 flex gap-8">
            <span>Place: {f("place") || "[Place]"}</span>
            <span>Date: {f("reportDate") || "[Date]"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
