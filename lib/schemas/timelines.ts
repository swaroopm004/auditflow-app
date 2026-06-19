/**
 * S2 — Estimated Timelines schema. Mirrors HTML demo's `s2RevalidateAll`
 * cross-field rules (see `auditflow-suite.html` ~L51654).
 *
 * Why a factory? `engagement.signedOn` lives on `client.b1`, NOT on the s2
 * form itself, so a static schema can't see it. `makeS2Schema(signedOn)`
 * closes over the value and returns a ZodSchema that validates against
 * the engagement signed-on date supplied at call time. This keeps the s2
 * form data model narrow (just est + statements) while still enforcing
 * the SA 210 cross-screen constraint.
 *
 * Validation rules enforced here:
 *  - estCompletion required + not Sunday + ≥ engagement.signedOn
 *  - each statement.start / .end required + not Sunday
 *  - sequential FS — each .start ≥ previous .start
 *  - .start ≥ engagement.signedOn
 *  - .start ≤ estCompletion
 *  - .end ≥ .start
 *  - .end ≤ estCompletion
 *
 * Issue paths use the convention `[ 'statements', i, 'start' | 'end' ]`
 * or `[ 'estCompletion' ]`. `useFieldErrors` is keyed by first path
 * segment so the page builds a separate `errors` map per statement.
 */

import { z } from "zod";

/** True if the ISO date string is a Sunday (UTC). Matches HTML's s2IsSunday. */
export function s2IsSunday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCDay() === 0;
}

export const s2StatementShape = z.object({
  id: z.enum(["bs", "il", "cf", "eq"]),
  name: z.string(),
  start: z.string(),
  end: z.string(),
});

/**
 * Build a Zod schema for the s2 form whose superRefine has visibility of
 * `signedOn` (the engagement-acceptance signed-on date, normally
 * `client.b1.signedOn`). Pass empty string when not yet known — the
 * cross-screen rules are only emitted when `signedOn` is truthy.
 */
export function makeS2Schema(signedOn: string) {
  return z
    .object({
      estCompletion: z.string(),
      statements: z.array(s2StatementShape).length(4),
    })
    .superRefine((data, ctx) => {
      const { estCompletion, statements } = data;

      // ---- overall completion ----
      if (!estCompletion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estCompletion"],
          message: "Estimated completion date required",
        });
      } else if (s2IsSunday(estCompletion)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estCompletion"],
          message: "Sundays excluded — pick another day",
        });
      } else if (signedOn && estCompletion < signedOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["estCompletion"],
          message: `Completion cannot be before engagement signed-on (${signedOn})`,
        });
      }

      // ---- per-FS rows ----
      let prevStart = "";
      statements.forEach((s, i) => {
        // Start
        if (!s.start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "start"],
            message: "Start date required",
          });
        } else if (s2IsSunday(s.start)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "start"],
            message: "Sundays excluded",
          });
        } else if (signedOn && s.start < signedOn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "start"],
            message: `Start cannot be before engagement signed-on (${signedOn})`,
          });
        } else if (prevStart && s.start < prevStart) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "start"],
            message: `Start cannot be earlier than previous statement (${prevStart})`,
          });
        } else if (estCompletion && s.start > estCompletion) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "start"],
            message: `Start cannot be after overall completion (${estCompletion})`,
          });
        }

        // End
        if (!s.end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "end"],
            message: "End date required",
          });
        } else if (s2IsSunday(s.end)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "end"],
            message: "Sundays excluded",
          });
        } else if (s.start && s.end < s.start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "end"],
            message: "End cannot be before start date",
          });
        } else if (estCompletion && s.end > estCompletion) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "end"],
            message: `End cannot be after overall completion (${estCompletion})`,
          });
        } else if (signedOn && s.end < signedOn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["statements", i, "end"],
            message: `End cannot be before engagement signed-on (${signedOn})`,
          });
        }

        // Only chain start ordering off VALID previous starts so a missing /
        // out-of-range earlier row doesn't cascade an extra "earlier than
        // previous" error onto every later row.
        if (s.start && !s2IsSunday(s.start) && (!signedOn || s.start >= signedOn)) {
          prevStart = s.start;
        }
      });
    });
}

export type S2Input = z.infer<ReturnType<typeof makeS2Schema>>;
