"use client";

import { Banner } from "@/components/layout/banner";
import { AuditReport } from "@/components/report/audit-report";

export default function ReportPage() {
  return (
    <div className="space-y-4">
      <Banner
        title="📄 Independent Auditor's Report"
        subtitle="Compose the statutory audit opinion (SA 700 · 705 · 706 · CARO 2020) section-by-section, then preview & print the official report."
        chips={[{ label: "Review phase", tone: "blue" }]}
      />
      <AuditReport />
    </div>
  );
}
