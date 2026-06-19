"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirmStore } from "@/lib/store/firmStore";
import { Banner } from "@/components/layout/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { CLIENT_PROFILE_REQUIRED, emptyClientProfile, type ClientProfile } from "@/lib/types";
import {
  CONSTITUTION_OPTIONS,
  INDUSTRY_OPTIONS,
  LISTING_OPTIONS,
  TURNOVER_OPTIONS,
  FRAMEWORK_OPTIONS,
  GROUP_OPTIONS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { clientProfileSchema } from "@/lib/schemas/client";
import { errorFieldId, scrollToFirstError, useFieldErrors } from "@/lib/utils/errors";

const EMPTY_PROFILE: ClientProfile = emptyClientProfile();

export default function ClientsPage() {
  const router = useRouter();
  const clients = useFirmStore((s) => s.clients);
  const activeClientId = useFirmStore((s) => s.activeClientId);
  const addClient = useFirmStore((s) => s.addClient);
  const setActiveClient = useFirmStore((s) => s.setActiveClient);
  const deleteClient = useFirmStore((s) => s.deleteClient);
  const updateActiveProfile = useFirmStore((s) => s.updateActiveProfile);
  const active = clients.find((c) => c.id === activeClientId) ?? null;

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const missingRequired = useMemo(() => {
    if (!active) return CLIENT_PROFILE_REQUIRED;
    return CLIENT_PROFILE_REQUIRED.filter((k) => {
      const v = active.profile[k];
      return typeof v === "string" ? !v.trim() : !v;
    });
  }, [active]);

  // Empty fallback keeps useFieldErrors stable across renders when no client is active.
  const errors = useFieldErrors(clientProfileSchema, active?.profile ?? EMPTY_PROFILE);
  const canContinue = active && missingRequired.length === 0 && Object.keys(errors).length === 0;

  const onPatch = (patch: Partial<ClientProfile>) => {
    updateActiveProfile(patch);
  };

  const onContinue = () => {
    if (!active) return;
    if (Object.keys(errors).length > 0 || missingRequired.length > 0) {
      // Build a combined error map so scroll prioritises required-but-empty fields too
      const combined: Record<string, string> = { ...errors };
      for (const k of missingRequired) if (!combined[k]) combined[k] = "Required";
      scrollToFirstError(combined);
      return;
    }
    router.push("/planning/engagement-acceptance");
  };

  return (
    <div>
      <Banner
        title="Client Profile"
        subtitle="Entity identification, constitution, industry & reporting framework — drives every downstream audit step"
        chips={[
          { label: `${clients.length} client${clients.length === 1 ? "" : "s"}`, tone: "blue" },
          active?.profile.currentFy
            ? { label: `📅 FY ${active.profile.currentFy}`, tone: "blue" }
            : { label: "📅 FY —", tone: "amber" },
          canContinue
            ? { label: "✓ Required fields complete", tone: "green" }
            : { label: "⏳ Incomplete", tone: "amber" },
        ]}
      />

      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div>
              <CardTitle>Client Manager</CardTitle>
              <CardDescription>
                Switch between clients · Add new clients · Each client has its own engagement workspace
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => addClient()}>
            + Add Client
          </Button>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-700">No clients yet</div>
              <div className="text-xs mb-3">Add your first client to begin an audit engagement.</div>
              <Button size="sm" onClick={() => addClient()}>
                + Add First Client
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveClient(c.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    c.id === activeClientId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}
                  title={c.profile.entityName || "Untitled"}
                >
                  {c.profile.entityName || "Untitled"}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {active && (
        <>
          {/* Card A — Entity Identification */}
          <Card className="mb-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xl">📇</span>
                <div>
                  <CardTitle>Entity Identification</CardTitle>
                  <CardDescription>Statutory IDs — required for Form 3CA/3CB/3CD and Audit Report</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
                <div>
                  <Label>Entity Name *</Label>
                  <Input
                    id={errorFieldId("entityName")}
                    error={!!errors.entityName}
                    value={active.profile.entityName}
                    onChange={(e) => onPatch({ entityName: e.target.value })}
                    placeholder="e.g. ABC Industries Pvt Ltd"
                  />
                  <FieldError name="entityName" errors={errors} />
                </div>
                <div>
                  <Label>CIN</Label>
                  <Input
                    id={errorFieldId("cin")}
                    error={!!errors.cin}
                    value={active.profile.cin}
                    onChange={(e) => onPatch({ cin: e.target.value.toUpperCase() })}
                    placeholder="L17110MH1973PLC019786"
                    maxLength={21}
                  />
                  <FieldError name="cin" errors={errors} />
                </div>
                <div>
                  <Label>PAN *</Label>
                  <Input
                    id={errorFieldId("pan")}
                    error={!!errors.pan}
                    value={active.profile.pan}
                    onChange={(e) => onPatch({ pan: e.target.value.toUpperCase() })}
                    placeholder="AAACT2727Q"
                    maxLength={10}
                  />
                  <FieldError name="pan" errors={errors} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <Label>GSTIN (Primary)</Label>
                  <Input
                    id={errorFieldId("gstin")}
                    error={!!errors.gstin}
                    value={active.profile.gstin}
                    onChange={(e) => onPatch({ gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAACT2727Q1ZA"
                    maxLength={15}
                  />
                  <FieldError name="gstin" errors={errors} />
                </div>
                <div>
                  <Label>Constitution *</Label>
                  <Select
                    id={errorFieldId("constitution")}
                    error={!!errors.constitution}
                    value={active.profile.constitution}
                    onChange={(e) => onPatch({ constitution: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {CONSTITUTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <FieldError name="constitution" errors={errors} />
                </div>
                <div>
                  <Label>Incorporated / Established</Label>
                  <Input
                    id={errorFieldId("incorporated")}
                    type="date"
                    value={active.profile.incorporated}
                    onChange={(e) => onPatch({ incorporated: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card B — Industry, Scale & Listing */}
          <Card className="mb-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xl">🏭</span>
                <div>
                  <CardTitle>Industry, Scale & Listing</CardTitle>
                  <CardDescription>Drives applicable Ind AS / AS, CARO 2020 applicability & SEBI reporting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
                <div>
                  <Label>Industry / Sector *</Label>
                  <Select
                    id={errorFieldId("industry")}
                    error={!!errors.industry}
                    value={active.profile.industry}
                    onChange={(e) => onPatch({ industry: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {INDUSTRY_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                  <FieldError name="industry" errors={errors} />
                </div>
                <div>
                  <Label>Listing Status *</Label>
                  <Select
                    id={errorFieldId("listed")}
                    error={!!errors.listed}
                    value={active.profile.listed}
                    onChange={(e) => onPatch({ listed: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {LISTING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <FieldError name="listed" errors={errors} />
                </div>
                <div>
                  <Label>Turnover band (₹ Cr, approx.)</Label>
                  <Select
                    id={errorFieldId("turnoverBand")}
                    value={active.profile.turnoverBand}
                    onChange={(e) => onPatch({ turnoverBand: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {TURNOVER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card C — Reporting Framework & FY */}
          <Card className="mb-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <CardTitle>Reporting Framework & Financial Year</CardTitle>
                  <CardDescription>
                    Ind AS / AS · Current FY + Comparative FY drives opening balances across the engagement
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Framework</Label>
                  <Select
                    id={errorFieldId("framework")}
                    value={active.profile.framework}
                    onChange={(e) => onPatch({ framework: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {FRAMEWORK_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Current FY *</Label>
                  <Input
                    id={errorFieldId("currentFy")}
                    error={!!errors.currentFy}
                    value={active.profile.currentFy}
                    onChange={(e) => onPatch({ currentFy: e.target.value })}
                    placeholder="FY 2025-26"
                  />
                  <FieldError name="currentFy" errors={errors} />
                </div>
                <div>
                  <Label>Comparative FY</Label>
                  <Input
                    id={errorFieldId("comparativeFy")}
                    value={active.profile.comparativeFy}
                    onChange={(e) => onPatch({ comparativeFy: e.target.value })}
                    placeholder="FY 2024-25"
                  />
                </div>
                <div>
                  <Label>FY end date</Label>
                  <Input
                    id={errorFieldId("fyEnd")}
                    type="date"
                    value={active.profile.fyEnd}
                    onChange={(e) => onPatch({ fyEnd: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card D — Group Structure */}
          <Card className="mb-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xl">🌳</span>
                <div>
                  <CardTitle>Group Structure</CardTitle>
                  <CardDescription>
                    Standalone vs Group — drives consolidation (Ind AS 110) & component-auditor scope (SA 600)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-3">
                <div>
                  <Label>Group structure</Label>
                  <Select value={active.profile.group} onChange={(e) => onPatch({ group: e.target.value })}>
                    <option value="">— Select —</option>
                    {GROUP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Parent / Group entity (if applicable)</Label>
                  <Input
                    value={active.profile.parent}
                    onChange={(e) => onPatch({ parent: e.target.value })}
                    placeholder="Parent company name (only for subsidiary / associate / JV)"
                  />
                </div>
                <div>
                  <Label># Branches / locations</Label>
                  <Input
                    type="number"
                    min={0}
                    value={active.profile.branchCount}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch({ branchCount: v === "" ? "" : Number(v) });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card E — Auditor History & Address */}
          <Card className="mb-5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <CardTitle>Auditor History & Registered Address</CardTitle>
                  <CardDescription>Prior auditor — for predecessor communication under §139/§140</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                <div>
                  <Label>Prior Auditor</Label>
                  <Input
                    value={active.profile.priorAuditor}
                    onChange={(e) => onPatch({ priorAuditor: e.target.value })}
                    placeholder="Firm name (or 'First-time appointment')"
                  />
                </div>
                <div>
                  <Label>Prior auditor tenure (years)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={active.profile.priorTenure}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch({ priorTenure: v === "" ? "" : Number(v) });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label>Registered Address</Label>
                <Textarea
                  rows={2}
                  value={active.profile.regAddress}
                  onChange={(e) => onPatch({ regAddress: e.target.value })}
                  placeholder="Registered office address as on PAN / CIN"
                />
              </div>
              <div className="mt-3">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={active.profile.notes}
                  onChange={(e) => onPatch({ notes: e.target.value })}
                  placeholder="Any other client-specific notes — special considerations, restructuring, recent corporate actions"
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer bar */}
          <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3 sticky bottom-2 shadow-sm">
            <div className="text-xs text-gray-600">
              {canContinue
                ? "✓ All required fields complete — ready to proceed"
                : `${missingRequired.length} required field${missingRequired.length === 1 ? "" : "s"} pending: ${missingRequired.join(", ")}`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setPendingDelete(active.id)}
              >
                🗑 Delete Client
              </Button>
              <Button size="sm" onClick={onContinue}>
                Continue to Audit Planning →
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete client?"
        description="This will permanently remove the client, their profile, and all engagement data. This cannot be undone."
        confirmText="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteClient(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
