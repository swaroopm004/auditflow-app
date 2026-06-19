import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** When true, paint a red border to indicate a field-level validation error. */
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-invalid={error || undefined}
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border shadow-sm cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-red-500 focus-visible:ring-red-300" : "border-input",
        className
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
