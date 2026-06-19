/**
 * S4 — Planning Artifacts schema. Mirrors HTML demo's `s4Validate` cross-
 * field rules (see `auditflow-suite.html` ~L52760).
 *
 * Validation rules enforced here (gating advance to GL Line Items):
 *  - Materiality: ≥1 row with `benchmarkAmt > 0` AND `matPct > 0`
 *  - Going Concern: `conclusion` non-empty
 *  - Risks: ≥1 row in the list (content can be empty — matches HTML)
 *
 * Custom-row section names are required (UI hint via inline error) but
 * empty custom-name rows still count as a row for the ≥1-row rule —
 * the count check is structural, the per-row validity check below
 * surfaces an explicit field-level error.
 *
 * Issue paths (per first-segment, useFieldErrors style):
 *  - "materiality"  → top-level "need ≥1 complete row"
 *  - "goingConcern" → conclusion missing
 *  - "risks"        → no risks at all
 *  - "matRow:<id>:bench" / "matRow:<id>:pct" / "matRow:<id>:section"
 *      → per-row, scoped error keys so the page can paint each cell
 *
 * Why a factory? Symmetric with `makeS2Schema` and easy to extend in
 * Milestone 3c if GL-Items needs to introspect the artifacts schema with
 * a runtime parameter.
 */

import { z } from "zod";

export const s4MaterialityRowShape = z.object({
  id: z.string(),
  section: z.string(),
  benchmarkAmt: z.string(),
  matPct: z.string(),
  perfPct: z.string(),
  ctPct: z.string(),
  isCustom: z.boolean(),
});

export const s4RiskRowShape = z.object({
  id: z.string(),
  description: z.string(),
  area: z.string(),
  level: z.union([z.literal("low"), z.literal("medium"), z.literal("high"), z.literal("")]),
  significant: z.boolean(),
  response: z.string(),
});

export const s4GoingConcernShape = z.object({
  conclusion: z.string(),
  period: z.string(),
  notes: z.string(),
});

const s4TcwgShape = z.object({
  recipients: z.string(),
  method: z.string(),
  freq: z.string(),
});

const s4SpecialistShape = z.object({
  required: z.string(),
  areas: z.string(),
  name: z.string(),
});

const s4GroupShape = z.object({
  required: z.string(),
  components: z.string(),
  ca: z.string(),
  notes: z.string(),
});

const s4BudgetShape = z.object({
  partner: z.string(),
  manager: z.string(),
  senior: z.string(),
  associate: z.string(),
});

/** Parse a possibly-empty numeric input string. Returns NaN if blank or
 *  unparseable so callers can use `> 0` for "non-empty positive" checks
 *  without falling into the JS coercion trap where `"" > 0 === false`
 *  but `parseFloat("") === NaN`. */
export function s4ParseNum(v: string): number {
  if (!v) return NaN;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Lowest-Overall ("binding") materiality across rows. Returns null if
 *  no row has both benchmarkAmt > 0 AND matPct > 0. Mirrors HTML's
 *  `_s4MatBindingOverall`. */
export function s4BindingOverall(rows: { benchmarkAmt: string; matPct: string }[]): number | null {
  let lowest: number | null = null;
  for (const r of rows) {
    const bench = s4ParseNum(r.benchmarkAmt);
    const mp = s4ParseNum(r.matPct);
    if (!(bench > 0) || !(mp > 0)) continue;
    const overall = bench * (mp / 100);
    if (lowest === null || overall < lowest) lowest = overall;
  }
  return lowest;
}

export function makeS4Schema() {
  return z
    .object({
      materiality: z.array(s4MaterialityRowShape),
      risks: z.array(s4RiskRowShape),
      matRationale: z.string(),
      fraudNotes: z.string(),
      goingConcern: s4GoingConcernShape,
      tcwg: s4TcwgShape,
      specialist: s4SpecialistShape,
      group: s4GroupShape,
      budget: s4BudgetShape,
    })
    .superRefine((data, ctx) => {
      // ---- Materiality: ≥1 complete row + custom rows must have a section name
      const completeCount = data.materiality.filter((r) => {
        const bench = s4ParseNum(r.benchmarkAmt);
        const mp = s4ParseNum(r.matPct);
        return bench > 0 && mp > 0;
      }).length;
      if (completeCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["materiality"],
          message: "Fill Benchmark Amt + Mat % on at least one section",
        });
        // Paint the FIRST row's missing cells so the user sees concrete
        // red boxes (HTML behaviour: highlight `firstRow`'s bench / matPct).
        const first = data.materiality[0];
        if (first) {
          if (!(s4ParseNum(first.benchmarkAmt) > 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [`matRow:${first.id}:bench`],
              message: "Benchmark amount required",
            });
          }
          if (!(s4ParseNum(first.matPct) > 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [`matRow:${first.id}:pct`],
              message: "Materiality % required",
            });
          }
        }
      }
      data.materiality.forEach((r) => {
        if (r.isCustom && !r.section.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [`matRow:${r.id}:section`],
            message: "Section name required",
          });
        }
      });

      // ---- Going Concern: conclusion required
      if (!data.goingConcern.conclusion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["goingConcern"],
          message: "Going-concern conclusion is required (SA 570)",
        });
      }

      // ---- Risks: at least 1 row (content can be empty per HTML)
      if (data.risks.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["risks"],
          message: "Add at least one Risk of Material Misstatement (SA 315 / 240)",
        });
      }
    });
}

export type S4Input = z.infer<ReturnType<typeof makeS4Schema>>;
