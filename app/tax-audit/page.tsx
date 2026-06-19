"use client";

import { Banner } from "@/components/layout/banner";
import { TaxAudit } from "@/components/taxaudit/tax-audit";

export default function TaxAuditPage() {
  return (
    <div className="space-y-4">
      <Banner
        title="🧾 Tax Audit — Form No. 26"
        subtitle="Section 63, Income-tax Act 2025 · Rule 47 (replaces Form 3CA/3CB/3CD). Clauses auto-fill from the Execution GL/P&L data; preview & print the form."
        chips={[{ label: "Review phase", tone: "blue" }]}
      />
      <TaxAudit />
    </div>
  );
}
