import Dexie, { Table } from "dexie";
import type { ClientRecord, FirmState } from "@/lib/types";

// Single-tenant: one firm-state row keyed "firm". Each ClientRecord lives in `clients`
// so we can query/index individually as the data set grows.
export interface FirmRow {
  id: string; // always "firm"
  name: string;
  activeClientId: string | null;
}

export class AuditFlowDB extends Dexie {
  firm!: Table<FirmRow, string>;
  clients!: Table<ClientRecord, string>;

  constructor() {
    super("auditflow");
    this.version(1).stores({
      firm: "id",
      clients: "id, updatedAt",
    });
  }
}

let _db: AuditFlowDB | null = null;
export function getDB(): AuditFlowDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie cannot be used during SSR. Call getDB() only from client components.");
  }
  if (!_db) _db = new AuditFlowDB();
  return _db;
}

export async function loadFirmState(): Promise<FirmState> {
  const db = getDB();
  const firmRow = await db.firm.get("firm");
  const clients = await db.clients.toArray();
  return {
    firm: { name: firmRow?.name ?? "My Audit Firm" },
    clients: clients.sort((a, b) => b.updatedAt - a.updatedAt),
    activeClientId: firmRow?.activeClientId ?? null,
  };
}

export async function persistFirmRow(row: FirmRow) {
  await getDB().firm.put(row);
}

export async function persistClient(client: ClientRecord) {
  await getDB().clients.put(client);
}

export async function deleteClientById(id: string) {
  await getDB().clients.delete(id);
}
