"use client";

/**
 * Monitoring board — tracks GL / line-item review requests across templates:
 * testing area, assertion, client query, response, reference, due date and
 * status. KPI cards + completion progress + filters. Persists on
 * ClientRecord.monitoring.
 */

import { useMemo, useState } from "react";
import { useFirmStore } from "@/lib/store/firmStore";
import { EXEC_REGISTRY } from "@/lib/execution/defaults";
import type { MonitoringItem, MonitoringStatus } from "@/lib/types";
import { uid } from "@/lib/utils";

const TESTING_AREAS = ["Substantive Testing", "Compliance Testing", "Assertion Testing", "Tax Compliance", "Test of Controls", "External Confirmation", "Analytical Review"];
const ASSERTIONS = ["Completeness", "Existence", "Accuracy", "Cut-off", "Valuation", "Rights & Obligations", "Presentation & Disclosure", "Occurrence"];
const STATUSES: MonitoringStatus[] = ["open", "pending", "overdue", "resolved"];
const STATUS_LABEL: Record<MonitoringStatus, string> = { open: "Open", pending: "Pending Client", overdue: "Overdue", resolved: "Resolved" };
const STATUS_STYLE: Record<MonitoringStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function MonitoringBoard() {
  const active = useFirmStore((s) => s.getActiveClient());
  const update = useFirmStore((s) => s.updateMonitoring);
  const [fGl, setFGl] = useState("");
  const [fStatus, setFStatus] = useState<"" | MonitoringStatus>("");

  const glOptions = useMemo(() => EXEC_REGISTRY.bs.map((t) => t.name), []);
  const items = active?.monitoring ?? [];

  if (!active) return <div className="text-sm text-gray-500 py-6">Add or select a client first.</div>;

  const kpis = {
    total: items.length,
    open: items.filter((i) => i.status === "open").length,
    pending: items.filter((i) => i.status === "pending").length,
    overdue: items.filter((i) => i.status === "overdue").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };
  const pct = items.length ? Math.round((kpis.resolved / items.length) * 100) : 0;

  const shown = items.filter((i) => (!fGl || i.glTemplate === fGl) && (!fStatus || i.status === fStatus));

  const patch = (id: string, p: Partial<MonitoringItem>) => update(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id: string) => update(items.filter((i) => i.id !== id));
  const add = () => {
    const n = items.length + 1;
    update([...items, { id: uid("mon"), reqId: `REQ-${String(n).padStart(3, "0")}`, glTemplate: glOptions[0] ?? "", lineItem: "", testingArea: TESTING_AREAS[0], assertion: ASSERTIONS[0], query: "", response: "", ref: "", dueDate: "", status: "open" }]);
  };
  const loadDemo = () => update(DEMO(glOptions));

  const cell = "w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400";

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          ["Total Items", kpis.total, "text-gray-900"],
          ["Open", kpis.open, "text-blue-600"],
          ["Pending Client", kpis.pending, "text-amber-600"],
          ["Overdue", kpis.overdue, "text-red-600"],
          ["Resolved", kpis.resolved, "text-emerald-600"],
        ] as const).map(([label, val, color]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* progress */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-gray-700">Overall Completion</span>
          <span className="font-mono font-bold text-emerald-600">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* filters + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={fGl} onChange={(e) => setFGl(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1.5">
          <option value="">All GL Templates</option>
          {glOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as MonitoringStatus | "")} className="text-xs border border-gray-300 rounded px-2 py-1.5">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          {items.length === 0 && <button onClick={loadDemo} className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">⚡ Load Demo</button>}
          <button onClick={add} className="text-xs font-semibold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">+ Add Item</button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="bg-gray-900 text-left text-[10px] uppercase tracking-wide text-gray-300">
              {["Req. ID", "GL / Line Item", "Testing Area", "Assertion", "Query / Supporting", "Client Response", "Ref / Reg.", "Due", "Status", ""].map((h) => (
                <th key={h} className="px-2 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-500">No monitoring items{items.length ? " match the filter" : " yet — add one or load demo"}.</td></tr>
            ) : shown.map((i) => (
              <tr key={i.id} className="border-t border-gray-100 align-top">
                <td className="px-2 py-1.5 font-mono font-semibold text-gray-700 whitespace-nowrap">{i.reqId}</td>
                <td className="px-2 py-1.5" style={{ minWidth: 160 }}>
                  <select value={i.glTemplate} onChange={(e) => patch(i.id, { glTemplate: e.target.value })} className={cell}>
                    {[...new Set([i.glTemplate, ...glOptions])].filter(Boolean).map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input value={i.lineItem} onChange={(e) => patch(i.id, { lineItem: e.target.value })} placeholder="line item" className={`${cell} mt-1`} />
                </td>
                <td className="px-2 py-1.5" style={{ minWidth: 130 }}>
                  <select value={i.testingArea} onChange={(e) => patch(i.id, { testingArea: e.target.value })} className={cell}>
                    {[...new Set([i.testingArea, ...TESTING_AREAS])].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5" style={{ minWidth: 130 }}>
                  <select value={i.assertion} onChange={(e) => patch(i.id, { assertion: e.target.value })} className={cell}>
                    {[...new Set([i.assertion, ...ASSERTIONS])].map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5" style={{ minWidth: 180 }}><textarea value={i.query} onChange={(e) => patch(i.id, { query: e.target.value })} rows={2} placeholder="query / supporting required" className={cell} /></td>
                <td className="px-2 py-1.5" style={{ minWidth: 180 }}><textarea value={i.response} onChange={(e) => patch(i.id, { response: e.target.value })} rows={2} placeholder="client response" className={cell} /></td>
                <td className="px-2 py-1.5" style={{ minWidth: 110 }}><input value={i.ref} onChange={(e) => patch(i.id, { ref: e.target.value })} placeholder="e.g. SA 505" className={cell} /></td>
                <td className="px-2 py-1.5" style={{ minWidth: 120 }}><input type="date" value={i.dueDate} onChange={(e) => patch(i.id, { dueDate: e.target.value })} className={cell} /></td>
                <td className="px-2 py-1.5" style={{ minWidth: 120 }}>
                  <select value={i.status} onChange={(e) => patch(i.id, { status: e.target.value as MonitoringStatus })} className={`text-xs font-semibold border rounded px-2 py-1 outline-none ${STATUS_STYLE[i.status]}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5"><button onClick={() => remove(i.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">Every field is editable and auto-saves. Resolved items drive the completion %.</p>
    </div>
  );
}

function DEMO(gl: string[]): MonitoringItem[] {
  const g = (i: number) => gl[i % gl.length] ?? "General";
  const rows: Omit<MonitoringItem, "id" | "reqId">[] = [
    { glTemplate: g(0), lineItem: "Plant & Machinery additions", testingArea: "Substantive Testing", assertion: "Existence", query: "Provide invoices & GRNs for additions > ₹10L", response: "Shared 12 invoices; 2 pending", ref: "SA 501", dueDate: "", status: "pending" },
    { glTemplate: g(4), lineItem: "Trade receivables > 180 days", testingArea: "External Confirmation", assertion: "Valuation", query: "Confirm top 10 debtor balances (SA 505)", response: "", ref: "SA 505 · Ind AS 109", dueDate: "", status: "open" },
    { glTemplate: g(5), lineItem: "Closing inventory valuation", testingArea: "Substantive Testing", assertion: "Valuation", query: "NRV working for slow-moving SKUs", response: "Provided; under review", ref: "Ind AS 2", dueDate: "", status: "pending" },
    { glTemplate: g(9), lineItem: "MSME creditors ageing", testingArea: "Compliance Testing", assertion: "Completeness", query: "Udyam registration list + ageing", response: "Not received", ref: "MSMED Sec 16", dueDate: "", status: "overdue" },
    { glTemplate: g(0), lineItem: "Depreciation recompute", testingArea: "Substantive Testing", assertion: "Accuracy", query: "Fixed-asset register with rates", response: "Reconciled — no diff", ref: "Schedule II", dueDate: "", status: "resolved" },
  ];
  return rows.map((r, i) => ({ ...r, id: uid("mon"), reqId: `REQ-${String(i + 1).padStart(3, "0")}` }));
}
