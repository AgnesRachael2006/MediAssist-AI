"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

export type ToastTone = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const value = useMemo(
    () => ({
      notify: (message: string, tone: ToastTone = "success") => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((current) => [...current, { id, message, tone }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3800);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(100%-2rem,360px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.tone === "success"
                ? "border-emerald-200 bg-white text-emerald-900"
                : toast.tone === "warning"
                  ? "border-amber-200 bg-white text-amber-900"
                  : toast.tone === "error"
                    ? "border-red-200 bg-white text-red-900"
                    : "border-indigo-200 bg-white text-slate-800"
            }`}
          >
            <p>{toast.message}</p>
            <button
              type="button"
              className="rounded-md p-0.5 text-slate-400 hover:text-slate-700"
              onClick={() =>
                setToasts((current) => current.filter((item) => item.id !== toast.id))
              }
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
