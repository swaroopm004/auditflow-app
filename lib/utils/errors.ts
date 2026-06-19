/**
 * Field-level error utilities for Zod-validated forms.
 *
 * Pattern used across the app (see /clients, /planning/engagement-acceptance,
 * and forthcoming Milestone 2/3 forms):
 *
 *   const errors = useFieldErrors(schema, formState);
 *   // -> { entityName: "Entity name is required", pan: "PAN must be 10 chars", ... }
 *
 *   <Input
 *     id={errorFieldId("entityName")}
 *     error={!!errors.entityName}
 *     ...
 *   />
 *   <FieldError name="entityName" errors={errors} />
 *
 *   onSubmit() {
 *     if (Object.keys(errors).length) {
 *       scrollToFirstError(errors);
 *       return;
 *     }
 *   }
 *
 * The `errorFieldId` helper produces a stable DOM id from the field name
 * so `scrollToFirstError` can locate the element without refs.
 */

import { useMemo } from "react";
import type { ZodSchema } from "zod";

export type FieldErrorMap = Record<string, string>;

/** Build a stable DOM id for a form field — used by scrollToFirstError. */
export function errorFieldId(name: string): string {
  return `field-${name}`;
}

/**
 * Run safeParse on `formState` and return a `{ fieldName -> errorMessage }` map
 * keyed by the FIRST path segment of each Zod issue. Memoized on the form state.
 */
export function useFieldErrors<T>(schema: ZodSchema<T>, formState: T): FieldErrorMap {
  return useMemo(() => {
    const result = schema.safeParse(formState);
    if (result.success) return {};
    const out: FieldErrorMap = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!key) continue;
      if (!out[key]) out[key] = issue.message;
    }
    return out;
  }, [schema, formState]);
}

/**
 * Find the DOM element for the first field in `errors`, scroll it into view
 * smoothly and focus it. Falls back gracefully if the element is not found.
 *
 * Looks up elements in this order: `#field-<name>`, `[name="<name>"]`,
 * `[data-field="<name>"]`.
 */
export function scrollToFirstError(errors: FieldErrorMap): void {
  if (typeof document === "undefined") return;
  const keys = Object.keys(errors);
  if (keys.length === 0) return;
  const firstKey = keys[0];

  const candidates = [
    document.getElementById(errorFieldId(firstKey)),
    document.querySelector<HTMLElement>(`[name="${firstKey}"]`),
    document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`),
  ];
  const el = candidates.find((c): c is HTMLElement => !!c);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Focus after the smooth-scroll begins; some browsers cancel the scroll if
  // focus runs synchronously on a non-focusable wrapper.
  window.setTimeout(() => {
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, 50);
}
