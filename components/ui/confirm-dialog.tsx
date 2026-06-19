"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Optional body content rendered between description and action buttons.
   *  Use this for in-dialog form fields (e.g. reviewer name on signoff). */
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Aliases — older call sites use confirmLabel/cancelLabel. */
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const finalConfirm = confirmText ?? confirmLabel ?? "Confirm";
  const finalCancel = cancelText ?? cancelLabel ?? "Cancel";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-base font-semibold mb-2">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        {children && <div className="mb-4">{children}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {finalCancel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
          >
            {finalConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
