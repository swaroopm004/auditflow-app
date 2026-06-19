import * as React from "react";
import type { FieldErrorMap } from "@/lib/utils/errors";

export interface FieldErrorProps {
  /** Field name (key into the error map). */
  name: string;
  /** Error map returned by useFieldErrors. */
  errors: FieldErrorMap;
  className?: string;
}

/**
 * Inline red error message rendered directly below a form field.
 * Renders nothing when there is no error for the given field name.
 */
export function FieldError({ name, errors, className }: FieldErrorProps) {
  const msg = errors[name];
  if (!msg) return null;
  return (
    <div className={`text-xs text-red-600 mt-1 font-medium ${className ?? ""}`}>{msg}</div>
  );
}
