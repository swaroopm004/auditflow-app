"use client";

import { Banner } from "@/components/layout/banner";
import { PostmortemBoard } from "@/components/postmortem/postmortem-board";

export default function PostmortemPage() {
  return (
    <div className="space-y-4">
      <Banner
        title="🔬 Fraud & Error Postmortem"
        subtitle="Post-audit risk review (SA 240) — fraud indicators with journal-entry signatures, detection ratios, real case studies and Clear / Investigate / Escalate verdicts."
        chips={[{ label: "Review phase", tone: "blue" }]}
      />
      <PostmortemBoard />
    </div>
  );
}
