"use client";

import { Banner } from "@/components/layout/banner";
import { MonitoringBoard } from "@/components/monitoring/monitoring-board";

export default function MonitoringPage() {
  return (
    <div className="space-y-4">
      <Banner
        title="◉ Audit Monitoring"
        subtitle="Track GL line items across templates · testing areas · client queries · responses · evidence — with status & completion tracking."
        chips={[{ label: "Review phase", tone: "blue" }]}
      />
      <MonitoringBoard />
    </div>
  );
}
