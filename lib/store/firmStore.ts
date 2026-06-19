"use client";

import { create } from "zustand";
import {
  emptyClientProfile,
  emptyEngagementAcceptance,
  emptyPLReconState,
  emptyS3State,
  type ClientProfile,
  type PLReconState,
  type ClientRecord,
  type EngagementAcceptance,
  type ExecutionState,
  type ExecutionTemplate,
  emptyAuditReport,
  emptyPostmortem,
  emptyTaxAudit,
  type AuditReportState,
  type FirmState,
  type PostmortemState,
  type TaxAuditState,
  type MonitoringItem,
  type S1State,
  type S2State,
  type S3GLRow,
  type S3State,
  type S4State,
} from "@/lib/types";
import {
  deleteClientById,
  loadFirmState,
  persistClient,
  persistFirmRow,
} from "@/lib/db/dexie";
import { uid } from "@/lib/utils";

interface FirmStore extends FirmState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addClient: (entityName?: string) => Promise<string>;
  setActiveClient: (id: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  updateActiveProfile: (patch: Partial<ClientProfile>) => Promise<void>;
  updateActiveB1: (patch: Partial<EngagementAcceptance>) => Promise<void>;
  updateActiveS1: (next: S1State) => Promise<void>;
  updateActiveS2: (next: S2State) => Promise<void>;
  updateActiveS3: (next: S3State) => Promise<void>;
  updateActiveS4: (next: S4State) => Promise<void>;
  // Execution (E1+)
  updateActiveExecution: (next: ExecutionState) => Promise<void>;
  upsertExecutionTemplate: (template: ExecutionTemplate) => Promise<void>;
  signOffTemplate: (templateId: string, reviewerName: string) => Promise<void>;
  resetTemplateSignoff: (templateId: string) => Promise<void>;
  // P&L / Cash-Flow / Equity reconciliation (client amounts + reviewer comments)
  updatePLRecon: (patch: Partial<PLReconState>) => Promise<void>;
  updateCFRecon: (patch: Partial<PLReconState>) => Promise<void>;
  updateEQRecon: (patch: Partial<PLReconState>) => Promise<void>;
  updateMonitoring: (items: MonitoringItem[]) => Promise<void>;
  updateReport: (patch: Partial<AuditReportState>) => Promise<void>;
  updatePostmortem: (patch: Partial<PostmortemState>) => Promise<void>;
  updateTaxAudit: (patch: Partial<TaxAuditState>) => Promise<void>;
  getActiveClient: () => ClientRecord | null;
}

// D1 mapping: signOffTemplate looks up GL rows in s3.glRows by `templateId`
// rather than mirroring to a fixed FS-level row. This is finer-grained —
// signing off `bs-ppe` flips ONLY the "Property, Plant & Equipment" row, not
// the entire Balance Sheet section. See s3-defaults.ts for the templateId
// → row mapping.

function newClient(name = "Untitled Client"): ClientRecord {
  const now = Date.now();
  const profile = emptyClientProfile();
  profile.entityName = name;
  return {
    id: uid("c"),
    createdAt: now,
    updatedAt: now,
    profile,
    b1: emptyEngagementAcceptance(),
  };
}

export const useFirmStore = create<FirmStore>((set, get) => ({
  firm: { name: "My Audit Firm" },
  clients: [],
  activeClientId: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const state = await loadFirmState();
    set({ ...state, hydrated: true });
  },

  addClient: async (entityName?: string) => {
    const c = newClient(entityName?.trim() || `Client ${get().clients.length + 1}`);
    await persistClient(c);
    await persistFirmRow({ id: "firm", name: get().firm.name, activeClientId: c.id });
    set({ clients: [c, ...get().clients], activeClientId: c.id });
    return c.id;
  },

  setActiveClient: async (id: string) => {
    await persistFirmRow({ id: "firm", name: get().firm.name, activeClientId: id });
    set({ activeClientId: id });
  },

  deleteClient: async (id: string) => {
    await deleteClientById(id);
    const remaining = get().clients.filter((c) => c.id !== id);
    const newActive = get().activeClientId === id ? (remaining[0]?.id ?? null) : get().activeClientId;
    await persistFirmRow({ id: "firm", name: get().firm.name, activeClientId: newActive });
    set({ clients: remaining, activeClientId: newActive });
  },

  updateActiveProfile: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id
        ? { ...c, profile: { ...c.profile, ...patch }, updatedAt: Date.now() }
        : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateActiveB1: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id ? { ...c, b1: { ...c.b1, ...patch }, updatedAt: Date.now() } : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateActiveS1: async (next) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id ? { ...c, s1: next, updatedAt: Date.now() } : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateActiveS2: async (next) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id ? { ...c, s2: next, updatedAt: Date.now() } : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateActiveS3: async (next) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id ? { ...c, s3: next, updatedAt: Date.now() } : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateActiveS4: async (next) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id ? { ...c, s4: next, updatedAt: Date.now() } : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateActiveExecution: async (next) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) =>
      c.id === id ? { ...c, execution: next, updatedAt: Date.now() } : c
    );
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  upsertExecutionTemplate: async (template) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const execution = c.execution ?? { templates: {} };
      return {
        ...c,
        execution: { templates: { ...execution.templates, [template.id]: template } },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  // D1 — Execution Reviewer Signoff → Planning S3 GL row (see SPEC §7)
  // Finds GL rows in s3.glRows where templateId matches, and flips them to
  // completed=true with the signoff timestamp + reviewer name. Multiple
  // matching rows are all updated (typically 0 or 1).
  signOffTemplate: async (templateId, reviewerName) => {
    const id = get().activeClientId;
    if (!id) return;
    const signedAt = new Date().toISOString();
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const execution = c.execution ?? { templates: {} };
      const tpl = execution.templates[templateId];
      if (!tpl) return c;
      // 1. Mark execution template signed off + complete
      const nextTpl: ExecutionTemplate = {
        ...tpl,
        reviewerSignoff: { reviewerName, signedAt },
        status: "complete",
      };
      // 2. Mirror to Planning S3 — flip any matching GL row(s) by templateId
      const s3 = c.s3 ?? emptyS3State();
      const glRows: S3GLRow[] = s3.glRows.map((row) =>
        row.templateId === templateId
          ? { ...row, completed: true, completionDate: signedAt, signedOffBy: reviewerName }
          : row
      );
      return {
        ...c,
        execution: { templates: { ...execution.templates, [templateId]: nextTpl } },
        s3: { ...s3, glRows },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  // Reverse D1 — clears Execution signoff AND any matching S3 GL rows
  resetTemplateSignoff: async (templateId) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const execution = c.execution ?? { templates: {} };
      const tpl = execution.templates[templateId];
      if (!tpl) return c;
      const nextTpl: ExecutionTemplate = {
        ...tpl,
        reviewerSignoff: null,
        status: "pending",
      };
      const s3 = c.s3 ?? emptyS3State();
      const glRows: S3GLRow[] = s3.glRows.map((row) =>
        row.templateId === templateId
          ? { ...row, completed: false, completionDate: "", signedOffBy: "" }
          : row
      );
      return {
        ...c,
        execution: { templates: { ...execution.templates, [templateId]: nextTpl } },
        s3: { ...s3, glRows },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updatePLRecon: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const cur = c.plRecon ?? emptyPLReconState();
      return {
        ...c,
        plRecon: {
          clientLine: { ...cur.clientLine, ...(patch.clientLine ?? {}) },
          clientGL: { ...cur.clientGL, ...(patch.clientGL ?? {}) },
          comments: { ...cur.comments, ...(patch.comments ?? {}) },
        },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateCFRecon: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const cur = c.cfRecon ?? emptyPLReconState();
      return {
        ...c,
        cfRecon: {
          clientLine: { ...cur.clientLine, ...(patch.clientLine ?? {}) },
          clientGL: { ...cur.clientGL, ...(patch.clientGL ?? {}) },
          comments: { ...cur.comments, ...(patch.comments ?? {}) },
        },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateEQRecon: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const cur = c.eqRecon ?? emptyPLReconState();
      return {
        ...c,
        eqRecon: {
          clientLine: { ...cur.clientLine, ...(patch.clientLine ?? {}) },
          clientGL: { ...cur.clientGL, ...(patch.clientGL ?? {}) },
          comments: { ...cur.comments, ...(patch.comments ?? {}) },
        },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateMonitoring: async (items) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => (c.id === id ? { ...c, monitoring: items, updatedAt: Date.now() } : c));
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateReport: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const cur = c.report ?? emptyAuditReport();
      return {
        ...c,
        report: {
          opinionType: patch.opinionType ?? cur.opinionType,
          fields: { ...cur.fields, ...(patch.fields ?? {}) },
          kam: patch.kam ?? cur.kam,
          done: { ...cur.done, ...(patch.done ?? {}) },
        },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updatePostmortem: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const cur = c.postmortem ?? emptyPostmortem();
      return {
        ...c,
        postmortem: {
          verdicts: { ...cur.verdicts, ...(patch.verdicts ?? {}) },
          remarks: { ...cur.remarks, ...(patch.remarks ?? {}) },
          ratios: { ...cur.ratios, ...(patch.ratios ?? {}) },
        },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  updateTaxAudit: async (patch) => {
    const id = get().activeClientId;
    if (!id) return;
    const clients = get().clients.map((c) => {
      if (c.id !== id) return c;
      const cur = c.taxAudit ?? emptyTaxAudit();
      return {
        ...c,
        taxAudit: {
          fields: { ...cur.fields, ...(patch.fields ?? {}) },
          done: { ...cur.done, ...(patch.done ?? {}) },
          depnFull: patch.depnFull ?? cur.depnFull,
          depnHalf: patch.depnHalf ?? cur.depnHalf,
          tds: patch.tds ?? cur.tds,
          icds: patch.icds ?? cur.icds,
          quant: patch.quant ?? cur.quant,
        },
        updatedAt: Date.now(),
      };
    });
    const updated = clients.find((c) => c.id === id)!;
    await persistClient(updated);
    set({ clients });
  },

  getActiveClient: () => {
    const id = get().activeClientId;
    if (!id) return null;
    return get().clients.find((c) => c.id === id) ?? null;
  },
}));
