"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { useEffect } from "react";
import { hydrateDemoState } from "@/lib/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateDemoState();
  }, []);

  return <ToastProvider>{children}</ToastProvider>;
}
