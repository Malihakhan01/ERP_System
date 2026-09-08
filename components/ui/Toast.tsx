"use client";

import * as React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ---- Types ----

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number; // ms, default 4000. 0 = persistent
}

// ---- Context ----

interface ToastContextValue {
  toasts: ToastData[];
  toast: (data: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

// ---- Provider ----

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((data: Omit<ToastData, "id">): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const next = [...prev, { ...data, id }];
      return next.slice(-5); // max 5 toasts
    });
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

// ---- Hook ----

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");

  const success = React.useCallback(
    (message: string, opts?: Partial<ToastData>) =>
      ctx.toast({ type: "success", message, ...opts }),
    [ctx.toast]
  );

  const error = React.useCallback(
    (message: string, opts?: Partial<ToastData>) =>
      ctx.toast({ type: "error", message, duration: 6000, ...opts }),
    [ctx.toast]
  );

  const warning = React.useCallback(
    (message: string, opts?: Partial<ToastData>) =>
      ctx.toast({ type: "warning", message, ...opts }),
    [ctx.toast]
  );

  const info = React.useCallback(
    (message: string, opts?: Partial<ToastData>) =>
      ctx.toast({ type: "info", message, ...opts }),
    [ctx.toast]
  );

  return React.useMemo(
    () => ({
      toast: ctx.toast,
      dismiss: ctx.dismiss,
      success,
      error,
      warning,
      info,
    }),
    [ctx.toast, ctx.dismiss, success, error, warning, info]
  );
}

// ---- Single Toast ----

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-[var(--color-erp-success)]",
    borderClass: "border-l-[var(--color-erp-success)]",
  },
  error: {
    icon: XCircle,
    iconClass: "text-[var(--color-erp-danger)]",
    borderClass: "border-l-[var(--color-erp-danger)]",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-[var(--color-erp-warning)]",
    borderClass: "border-l-[var(--color-erp-warning)]",
  },
  info: {
    icon: Info,
    iconClass: "text-[var(--color-erp-info)]",
    borderClass: "border-l-[var(--color-erp-info)]",
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const [exiting, setExiting] = React.useState(false);
  const { icon: Icon, iconClass, borderClass } = TOAST_CONFIG[toast.type];

  const handleDismiss = React.useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  React.useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration === 0) return;
    const timer = setTimeout(handleDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-[var(--color-erp-border)] border-l-4 bg-[var(--color-erp-surface)] p-4 shadow-[var(--shadow-toast)] min-w-[280px] max-w-[380px]",
        borderClass,
        exiting ? "toast-exit" : "toast-enter"
      )}
    >
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-erp-text-primary)]">
          {toast.message}
        </p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-[var(--color-erp-text-muted)]">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-0.5 text-[var(--color-erp-text-muted)] hover:text-[var(--color-erp-text-primary)] hover:bg-[var(--color-erp-surface-2)] transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---- Toaster (renders all toasts) ----

function Toaster() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {ctx.toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => ctx.dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
