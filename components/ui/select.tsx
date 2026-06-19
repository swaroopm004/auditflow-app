import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** When true, paint a red border to indicate a field-level validation error. */
  error?: boolean;
}

// Native select — keeps things light and matches HTML demo's UX precisely.
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, error, ...props }, ref) => {
  return (
    <select
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-red-500 focus-visible:ring-red-300" : "border-input",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
