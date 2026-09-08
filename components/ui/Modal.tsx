"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ---- Modal (native <dialog> with fixed viewport centering) ----

export interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean;
}

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  children,
  closeOnBackdrop = true,
}: ModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isModalOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isModalOpen]);

  // Close on native dialog cancel event (Escape key)
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (clickedOutside) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 m-auto z-50 w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto",
        "rounded-2xl border border-slate-200/80 bg-white p-0 shadow-2xl",
        "backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs",
        "open:animate-in open:fade-in-0 open:zoom-in-95 duration-150",
        SIZE_CLASS[size]
      )}
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-desc" : undefined}
    >
      {/* Header */}
      {(title || description) && (
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md px-6 py-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h2
                id="modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-desc"
                className="mt-0.5 text-xs text-slate-500 leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}

// ---- ModalFooter ----

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---- ConfirmDialog ----

export interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  isOpen,
  onClose,
  onConfirm,
  title,
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const isDialogOpen = open ?? isOpen ?? false;
  return (
    <Modal open={isDialogOpen} onClose={onClose} size="sm" closeOnBackdrop={!loading}>
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="inline-flex h-9 items-center px-4 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "inline-flex h-9 items-center gap-2 px-4 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-50 cursor-pointer",
            destructive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
