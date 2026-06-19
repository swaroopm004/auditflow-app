import { z } from "zod";

// B1 — Engagement Acceptance schema. Mirrors S0_REQUIRED_TEXT/CHECK + conditional
// rules from the HTML demo's s0Validate(). Conditional checks live in superRefine
// because some fields are only required given another field's value.
export const engagementAcceptanceSchema = z
  .object({
    framework: z.string().min(1, "Framework required"),
    riskRating: z.string().min(1, "Risk rating required"),

    pcFs: z.boolean(),
    pcIc: z.boolean(),
    pcAccess: z.boolean(),

    indNoInterest: z.boolean(),
    indCode: z.boolean(),
    indNoclar: z.boolean(),
    coi: z.string(),
    coiNotes: z.string(),

    apptType: z.string().min(1, "Appointment type required"),
    predName: z.string(),
    predSent: z.string(),
    noc: z.string(),
    nocDate: z.string(),

    elRef: z.string().min(1, "Engagement letter ref required"),
    elDrafted: z.string(),
    elSent: z.string(),
    elSigned: z.string().min(1, "Signed-by-client date required"),
    elFileName: z.string(),

    skills: z.boolean(),
    decision: z.string().min(1, "Decision required"),
    signedBy: z.string().min(1, "Signer name required"),
    memFrn: z.string().min(1, "M.No. / FRN required"),
    signedOn: z.string().min(1, "Signed-on date required"),
    declineReason: z.string(),
  })
  .superRefine((d, ctx) => {
    const requireCheck = (key: keyof typeof d, msg: string) => {
      if (!d[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: msg });
    };
    requireCheck("pcFs", "Acknowledge framework FS preparation");
    requireCheck("pcIc", "Acknowledge internal control responsibility");
    requireCheck("pcAccess", "Acknowledge access to information");
    requireCheck("indNoInterest", "Confirm no financial/family/business interest");
    requireCheck("indCode", "Confirm ICAI Code of Ethics compliance");
    requireCheck("indNoclar", "Confirm NOCLAR check");
    requireCheck("skills", "Confirm team competence/capacity");

    if (d.coi === "disclosed" && !d.coiNotes.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coiNotes"], message: "Describe threat & safeguard" });
    }
    if (d.apptType === "incoming") {
      if (!d.predName.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["predName"], message: "Predecessor name required for incoming" });
      if (!d.noc)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["noc"], message: "NOC status required for incoming" });
      if (d.noc === "received" && !d.nocDate)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nocDate"], message: "NOC received date required" });
    }
    if (d.decision === "decline" && !d.declineReason.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["declineReason"], message: "Reason required when declining" });
    }
  });

export type EngagementAcceptanceInput = z.infer<typeof engagementAcceptanceSchema>;
