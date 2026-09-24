"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { getSession } from "@/lib/session";
import { hydrateDemoState } from "@/lib/store";
import { cn } from "@/lib/cn";
import Link from "next/link";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  Pill,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/doctor": {
    title: "Dashboard",
    subtitle: "Review patient reports and AI-assisted clinical insights.",
  },
  "/doctor/patients": {
    title: "Patients",
    subtitle: "Synthetic patient list for this demonstration.",
  },
  "/doctor/reports": {
    title: "Clinical Reports",
    subtitle: "Upload and review patient medical reports with AI-assisted analysis.",
  },
  "/doctor/insights": {
    title: "AI Insights",
    subtitle: "Suggestions for clinician review — not diagnoses.",
  },
  "/doctor/medication-safety": {
    title: "Medication Safety Center",
    subtitle: "Review medication-related safety information before making a clinical decision.",
  },
  "/doctor/audit": {
    title: "Audit Trail",
    subtitle: "Traceability of AI output and doctor decisions.",
  },
  "/doctor/settings": {
    title: "Settings",
    subtitle: "Demo workspace preferences.",
  },
};

const MOBILE_NAV = [
  { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/patients", label: "Patients", icon: Users },
  { href: "/doctor/reports", label: "Reports", icon: ClipboardList },
  { href: "/doctor/insights", label: "AI Insights", icon: Sparkles },
  { href: "/doctor/medication-safety", label: "Medication Safety", icon: Pill },
  { href: "/doctor/audit", label: "Audit Trail", icon: Activity },
  { href: "/doctor/settings", label: "Settings", icon: Settings },
];

export function DoctorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    hydrateDemoState();
    const session = getSession();
    if (!session || session.role !== "doctor") {
      router.replace("/login");
      return;
    }
    queueMicrotask(() => setReady(true));
  }, [router]);

  const meta =
    TITLES[pathname] ??
    (pathname.startsWith("/doctor/reports/")
      ? { title: "Report review", subtitle: "Original report, AI insight, and doctor decision." }
      : { title: "MediAssist AI", subtitle: "" });

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-slate-900">MediAssist AI</p>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {MOBILE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                      pathname === item.href ? "bg-indigo-50 text-indigo-800" : "text-slate-600",
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <LogoutButton className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600" />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenu={() => setMenuOpen(true)}
          role="doctor"
        />
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
