import { z } from "zod";

// PAN: 5 letters + 4 digits + 1 letter
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// GSTIN: 15 chars — 2-digit state + 10-char PAN + entity + Z + checksum
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/;
// CIN: 21 chars — L/U + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits
const cinRegex = /^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;

export const clientProfileSchema = z.object({
  entityName: z.string().min(1, "Entity name is required"),
  cin: z
    .string()
    .trim()
    .refine((v) => v === "" || cinRegex.test(v.toUpperCase()), "CIN must be 21 chars (e.g. L17110MH1973PLC019786)"),
  pan: z
    .string()
    .trim()
    .min(1, "PAN is required")
    .refine((v) => panRegex.test(v.toUpperCase()), "PAN must be 10 chars (e.g. AAACT2727Q)"),
  gstin: z
    .string()
    .trim()
    .refine((v) => v === "" || gstinRegex.test(v.toUpperCase()), "GSTIN must be 15 chars"),
  constitution: z.string().min(1, "Constitution is required"),
  incorporated: z.string(),
  industry: z.string().min(1, "Industry is required"),
  listed: z.string().min(1, "Listing status is required"),
  turnoverBand: z.string(),
  framework: z.string(),
  currentFy: z.string().min(1, "Current FY is required"),
  comparativeFy: z.string(),
  fyEnd: z.string(),
  group: z.string(),
  parent: z.string(),
  branchCount: z.union([z.number().int().min(0), z.literal("")]),
  priorAuditor: z.string(),
  priorTenure: z.union([z.number().int().min(0).max(20), z.literal("")]),
  regAddress: z.string(),
  notes: z.string(),
});

export type ClientProfileInput = z.infer<typeof clientProfileSchema>;
