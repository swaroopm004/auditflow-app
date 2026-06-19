"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { emptyEngagementAcceptance, type EngagementAcceptance } from "@/lib/types";
import {
  APPT_TYPE_OPTIONS,
  B1_FRAMEWORK_OPTIONS,
  COI_OPTIONS,
  DECISION_OPTIONS,
  NOC_OPTIONS,
  RISK_RATING_OPTIONS,
} from "@/lib/constants";
import { engagementAcceptanceSchema } from "@/lib/schemas/engagement";
import { errorFieldId, scrollToFirstError, useFieldErrors } from "@/lib/utils/errors";

export default function EngagementAcceptancePage() {
  const router = useRouter();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const updateActiveB1 = useFirmStore((s) => s.updateActiveB1);
  const active = clients.find((c) => c.id === activeClientId) ?? null;
  const [submitMsg, setSubmitMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Use empty B1 placeholder if no active client so hooks order stays stable across renders.
  const b1: EngagementAcceptance = active ? active.b1 : emptyEngagementAcceptance();

  const onPatch = (patch: Partial<EngagementAcceptance>) => {
    if (!active) return;
    updateActiveB1(patch);
    if (submitMsg) setSubmitMsg(null);
  };

  // Summary values
  const pcDone = [b1.pcFs, b1.pcIc, b1.pcAccess].filter(Boolean).length;
  const indDone =
    b1.indNoInterest &&
    b1.indCode &&
    b1.indNoclar &&
    !!b1.coi &&
    (b1.coi === "none" || !!b1.coiNotes.trim());

  let predTxt = "—";
  let predTone: "blue" | "green" | "amber" | "red" = "blue";
  if (b1.apptType === "first") predTxt = "N/A";
  else if (b1.apptType === "continuing") {
    predTxt = "N/A — Continuing";
    predTone = "green";
  } else if (b1.apptType === "incoming") {
    if (b1.noc === "received") {
      predTxt = "✓ NOC Received";
      predTone = "green";
    } else if (b1.noc === "pending") {
      predTxt = "⏳ Pending";
      predTone = "amber";
    } else if (b1.noc === "objected") {
      predTxt = "⚠ Objection";
      predTone = "red";
    }
  }

  const errors = useFieldErrors(engagementAcceptanceSchema, b1);
  const missingCount = Object.keys(errors).length;

  const onContinue = () => {
    if (missingCount > 0) {
      setSubmitMsg({ kind: "err", text: `Complete ${missingCount} pending field(s) before continuing` });
      scrollToFirstError(errors);
      return;
    }
    if (b1.decision !== "accept") {
      setSubmitMsg({
        kind: "err",
        text: "Set Decision to Accept to proceed (or Decline to halt fieldwork).",
      });
      return;
    }
    setSubmitMsg({ kind: "ok", text: `Engagement accepted ✓ — signed by ${b1.signedBy} on ${b1.signedOn}` });
    router.push("/planning/resources");
  };

  const statusChip = (() => {
    if (b1.decision === "accept") return { label: "✅ Accepted", tone: "green" as const };
    if (b1.decision === "decline") return { label: "❌ Declined", tone: "red" as const };
    return { label: "⏳ Not Accepted", tone: "amber" as const };
  })();

  // NOC date disabled when first-time/N/A
  const nocDateDisabled = b1.noc === "na" || b1.apptType === "first";

  if (!active) {
    return (
      <div>
        <Banner
          title="Audit Planning — Engagement Acceptance"
          subtitle="Per SA 210 — confirm pre-conditions, independence, predecessor communication & accept the engagement"
        />
        <Card>
          <CardContent>
            <div className="text-center py-10 text-sm text-gray-600">
              <div className="text-2xl mb-2">👈</div>
              <div className="font-medium mb-1">No active client</div>
              <div className="mb-4">Add or select a client first to begin the engagement acceptance.</div>
              <Button size="sm" onClick={() => router.push("/clients")}>
                Go to Clients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Banner
        title="Audit Planning — Engagement Acceptance"
        subtitle="Per SA 210 — confirm pre-conditions, independence, predecessor communication & accept the engagement before fieldwork begins"
        chips={[
          active.profile.currentFy
            ? { label: `📅 ${active.profile.currentFy}`, tone: "blue" }
            : { label: "📅 FY —", tone: "amber" },
          statusChip,
        ]}
      />

      {/* SA 210 info tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 mb-5 flex gap-2">
        <span>💡</span>
        <span>
          <strong>SA 210 — Agreeing the Terms of Audit Engagements.</strong> Before accepting an engagement the auditor must
          (i) establish pre-conditions, (ii) confirm independence under the ICAI Code of Ethics, (iii) where incoming,
          communicate with the predecessor under Companies Act §139/§140, and (iv) document acceptance via a signed
          engagement letter.
        </span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card>
          <CardContent className="text-center">
            <div className="text-xl font-bold text-blue-600">{pcDone}/3</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">Pre-conditions Met</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <div className={`text-xl font-bold ${indDone ? "text-green-600" : "text-gray-400"}`}>
              {indDone ? "✓ Confirmed" : "—"}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">Independence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <div
              className={`text-xl font-bold ${
                predTone === "green" ? "text-green-600" : predTone === "amber" ? "text-amber-600" : predTone === "red" ? "text-red-600" : "text-gray-400"
              }`}
            >
              {predTxt}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">Predecessor Comm</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <div
              className={`text-xl font-bold ${
                b1.decision === "accept" ? "text-green-600" : b1.decision === "decline" ? "text-red-600" : "text-gray-400"
              }`}
            >
              {b1.decision === "accept" ? "✅ Accepted" : b1.decision === "decline" ? "❌ Declined" : "Pending"}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mt-1">Decision</div>
          </CardContent>
        </Card>
      </div>

      {/* CARD 1 — Pre-conditions */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">📜</span>
            <div>
              <CardTitle>Pre-conditions for the Audit</CardTitle>
              <CardDescription>
                SA 210 §6 · Acceptable financial reporting framework + management acknowledges responsibilities
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Financial reporting framework *</Label>
              <Select
                id={errorFieldId("framework")}
                error={!!errors.framework}
                value={b1.framework}
                onChange={(e) => onPatch({ framework: e.target.value })}
              >
                <option value="">— Select —</option>
                {B1_FRAMEWORK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError name="framework" errors={errors} />
            </div>
            <div>
              <Label>Engagement risk rating *</Label>
              <Select
                id={errorFieldId("riskRating")}
                error={!!errors.riskRating}
                value={b1.riskRating}
                onChange={(e) => onPatch({ riskRating: e.target.value })}
              >
                <option value="">— Select —</option>
                {RISK_RATING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError name="riskRating" errors={errors} />
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-600 mb-2">Management acknowledges its responsibilities for:</div>
          <CheckRow name="pcFs" checked={b1.pcFs} error={!!errors.pcFs} onChange={(v) => onPatch({ pcFs: v })}>
            Preparation of the financial statements in accordance with the selected framework
          </CheckRow>
          <FieldError name="pcFs" errors={errors} />
          <CheckRow name="pcIc" checked={b1.pcIc} error={!!errors.pcIc} onChange={(v) => onPatch({ pcIc: v })}>
            Maintaining internal control sufficient to enable preparation of FS free from material misstatement
          </CheckRow>
          <FieldError name="pcIc" errors={errors} />
          <CheckRow name="pcAccess" checked={b1.pcAccess} error={!!errors.pcAccess} onChange={(v) => onPatch({ pcAccess: v })}>
            Providing the auditor with access to all relevant information, additional info requested, and unrestricted access to persons within the entity
          </CheckRow>
          <FieldError name="pcAccess" errors={errors} />
        </CardContent>
      </Card>

      {/* CARD 2 — Independence & Ethics */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <div>
              <CardTitle>Independence & Ethics</CardTitle>
              <CardDescription>
                ICAI Code of Ethics · No financial/family/business relationship that impairs independence
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CheckRow name="indNoInterest" checked={b1.indNoInterest} error={!!errors.indNoInterest} onChange={(v) => onPatch({ indNoInterest: v })}>
            Confirmed: no financial / family / business interest in the entity by partner or team members
          </CheckRow>
          <FieldError name="indNoInterest" errors={errors} />
          <CheckRow name="indCode" checked={b1.indCode} error={!!errors.indCode} onChange={(v) => onPatch({ indCode: v })}>
            Confirmed: engagement team complies with the ICAI Code of Ethics & applicable independence standards
          </CheckRow>
          <FieldError name="indCode" errors={errors} />
          <CheckRow name="indNoclar" checked={b1.indNoclar} error={!!errors.indNoclar} onChange={(v) => onPatch({ indNoclar: v })}>
            NOCLAR check completed — no known instances of non-compliance with laws & regulations (SA 250)
          </CheckRow>
          <FieldError name="indNoclar" errors={errors} />
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 mt-3">
            <div>
              <Label>Conflict of interest</Label>
              <Select
                id={errorFieldId("coi")}
                value={b1.coi}
                onChange={(e) => onPatch({ coi: e.target.value })}
              >
                <option value="">— Select —</option>
                {COI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Notes (if any conflict / threats identified)</Label>
              <Input
                id={errorFieldId("coiNotes")}
                error={!!errors.coiNotes}
                value={b1.coiNotes}
                onChange={(e) => onPatch({ coiNotes: e.target.value })}
                placeholder="Describe threat & safeguard applied"
              />
              <FieldError name="coiNotes" errors={errors} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 3 — Predecessor Communication */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">✉️</span>
            <div>
              <CardTitle>Predecessor Auditor Communication</CardTitle>
              <CardDescription>
                Companies Act 2013 §139 / §140 · Mandatory for incoming auditor before acceptance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Appointment type *</Label>
              <Select
                id={errorFieldId("apptType")}
                error={!!errors.apptType}
                value={b1.apptType}
                onChange={(e) => onPatch({ apptType: e.target.value })}
              >
                <option value="">— Select —</option>
                {APPT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError name="apptType" errors={errors} />
            </div>
            <div>
              <Label>Predecessor auditor (if any)</Label>
              <Input
                id={errorFieldId("predName")}
                error={!!errors.predName}
                value={b1.predName}
                onChange={(e) => onPatch({ predName: e.target.value })}
                placeholder="Firm name"
              />
              <FieldError name="predName" errors={errors} />
            </div>
            <div>
              <Label>Communication sent on</Label>
              <Input
                id={errorFieldId("predSent")}
                type="date"
                value={b1.predSent}
                onChange={(e) => onPatch({ predSent: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>NOC / professional clearance</Label>
              <Select
                id={errorFieldId("noc")}
                error={!!errors.noc}
                value={b1.noc}
                onChange={(e) => onPatch({ noc: e.target.value })}
              >
                <option value="">— Select —</option>
                {NOC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError name="noc" errors={errors} />
            </div>
            <div>
              <Label>NOC received on</Label>
              <Input
                id={errorFieldId("nocDate")}
                error={!!errors.nocDate}
                type="date"
                value={b1.nocDate}
                onChange={(e) => onPatch({ nocDate: e.target.value })}
                disabled={nocDateDisabled}
              />
              <FieldError name="nocDate" errors={errors} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4 — Engagement Letter */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <CardTitle>Engagement Letter</CardTitle>
              <CardDescription>Terms of audit engagement signed by entity (SA 210 §10–§12)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Letter ref # *</Label>
              <Input
                id={errorFieldId("elRef")}
                error={!!errors.elRef}
                value={b1.elRef}
                onChange={(e) => onPatch({ elRef: e.target.value })}
                placeholder="EL/2025-26/001"
              />
              <FieldError name="elRef" errors={errors} />
            </div>
            <div>
              <Label>Drafted on</Label>
              <Input
                id={errorFieldId("elDrafted")}
                type="date"
                value={b1.elDrafted}
                onChange={(e) => onPatch({ elDrafted: e.target.value })}
              />
            </div>
            <div>
              <Label>Sent to client on</Label>
              <Input
                id={errorFieldId("elSent")}
                type="date"
                value={b1.elSent}
                onChange={(e) => onPatch({ elSent: e.target.value })}
              />
            </div>
            <div>
              <Label>Signed by client on *</Label>
              <Input
                id={errorFieldId("elSigned")}
                error={!!errors.elSigned}
                type="date"
                value={b1.elSigned}
                onChange={(e) => onPatch({ elSigned: e.target.value })}
              />
              <FieldError name="elSigned" errors={errors} />
            </div>
          </div>
          <div className="mt-3 p-3 border border-dashed border-border rounded-md bg-gray-50">
            <div className="text-xs text-gray-600 mb-1">
              📎 <strong>Upload signed letter</strong> — file content is not stored yet; only the filename is persisted in this milestone.
            </div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                onPatch({ elFileName: file?.name ?? "" });
              }}
              className="text-xs mt-1"
            />
            {b1.elFileName && (
              <div className="text-[11px] text-gray-700 mt-1">Stored filename: <code>{b1.elFileName}</code></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD 5 — Acceptance Decision */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <CardTitle>Acceptance Decision</CardTitle>
              <CardDescription>Confirm skills, resources & sign acceptance — by Partner</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CheckRow name="skills" checked={b1.skills} error={!!errors.skills} onChange={(v) => onPatch({ skills: v })}>
            Confirmed: engagement team has the competence, capabilities & sufficient time to perform the audit
          </CheckRow>
          <FieldError name="skills" errors={errors} />
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr_1fr] gap-3 mt-3">
            <div>
              <Label>Decision *</Label>
              <Select
                id={errorFieldId("decision")}
                error={!!errors.decision}
                value={b1.decision}
                onChange={(e) => onPatch({ decision: e.target.value })}
              >
                <option value="">— Select —</option>
                {DECISION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <FieldError name="decision" errors={errors} />
            </div>
            <div>
              <Label>Signed by (Partner) *</Label>
              <Input
                id={errorFieldId("signedBy")}
                error={!!errors.signedBy}
                value={b1.signedBy}
                onChange={(e) => onPatch({ signedBy: e.target.value })}
                placeholder="Partner name"
              />
              <FieldError name="signedBy" errors={errors} />
            </div>
            <div>
              <Label>Membership No. / FRN *</Label>
              <Input
                id={errorFieldId("memFrn")}
                error={!!errors.memFrn}
                value={b1.memFrn}
                onChange={(e) => onPatch({ memFrn: e.target.value })}
                placeholder="M.No. 123456 · FRN 001234N"
              />
              <FieldError name="memFrn" errors={errors} />
            </div>
            <div>
              <Label>Signed on *</Label>
              <Input
                id={errorFieldId("signedOn")}
                error={!!errors.signedOn}
                type="date"
                value={b1.signedOn}
                onChange={(e) => onPatch({ signedOn: e.target.value })}
              />
              <FieldError name="signedOn" errors={errors} />
            </div>
          </div>
          {b1.decision === "decline" && (
            <div className="mt-3">
              <Label>Reason for declining *</Label>
              <Input
                id={errorFieldId("declineReason")}
                error={!!errors.declineReason}
                value={b1.declineReason}
                onChange={(e) => onPatch({ declineReason: e.target.value })}
                placeholder="Document the reason for declining the engagement"
              />
              <FieldError name="declineReason" errors={errors} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3 sticky bottom-2 shadow-sm">
        <div className="text-xs">
          {submitMsg ? (
            <span className={submitMsg.kind === "ok" ? "text-green-700" : "text-red-700"}>{submitMsg.text}</span>
          ) : missingCount === 0 ? (
            b1.decision === "accept"
              ? "✓ Engagement accepted — ready to proceed to Resources"
              : b1.decision === "decline"
                ? "❌ Engagement declined — fieldwork will not commence"
                : "All fields filled — set decision to Accept"
          ) : (
            <span className="text-gray-600">{missingCount} field{missingCount === 1 ? "" : "s"} pending — complete to proceed</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}>
            ← Back to Client
          </Button>
          <Button size="sm" onClick={onContinue}>
            Save & Continue to Resources →
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  children,
  error,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  error?: boolean;
  name?: string;
}) {
  return (
    <label className="flex items-start gap-2 py-1.5 text-sm cursor-pointer">
      <Checkbox
        id={name ? errorFieldId(name) : undefined}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        error={error}
        className="mt-0.5 flex-shrink-0"
      />
      <span className={error ? "text-red-600" : undefined}>{children}</span>
    </label>
  );
}
