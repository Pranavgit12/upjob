"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "default";
interface Toast {
  id: number;
  title: string;
  description?: string;
  type: ToastType;
}

const ToastContext = React.createContext<{
  toast: (title: string, opts?: { type?: ToastType; description?: string }) => void;
} | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(
    (title: string, opts?: { type?: ToastType; description?: string }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, title, description: opts?.description, type: opts?.type ?? "default" }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-80 items-start gap-3 rounded-xl border bg-white p-4 shadow-lg animate-fade-in-up",
              t.type === "success" && "border-emerald-200",
              t.type === "error" && "border-red-200",
              t.type === "info" && "border-blue-200"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
            {t.type === "error" && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
            {t.type === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-zinc-500">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}