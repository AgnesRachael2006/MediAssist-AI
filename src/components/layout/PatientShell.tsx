"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Home,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Volume2,
  LineChart,
  History,
  X,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { hydrateDemoState } from "@/lib/store";
import { cn } from "@/lib/cn";
import { TopNavbar } from "./TopNavbar";
import { LogoutButton } from "./LogoutButton";
import { LOGGED_IN_PATIENT_ID } from "@/lib/mockData";

const NAV = [
  { href: "/patient", label: "Overview", icon: Home },
  { href: "/patient/reports", label: "My Reports", icon: FileText },
  { href: "/patient/trends", label: "Health Trends", icon: LineChart },
  { href: "/patient/ask", label: "Ask MediAssist", icon: MessageCircle },
  { href: "/patient/report-voice", label: "Report Voice", icon: Volume2 },
  { href: "/patient/doctor-reviews", label: "Doctor Reviews", icon: ShieldCheck },
  { href: "/patient/timeline", label: "Health Timeline", icon: History },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/patient": {
    title: "Overview",
    subtitle: "Understand your health reports in simple language.",
  },
  "/patient/reports": {
    title: "My Reports",
    subtitle: "Doctor-reviewed explanations and report history.",
  },
  "/patient/trends": {
    title: "Health Trends",
    subtitle: "Your previous results are shown for comparison.",
  },
  "/patient/ask": {
    title: "Ask MediAssist",
    subtitle: "Ask questions about medical terms and your reports.",
  },
  "/patient/report-voice": {
    title: "Report Voice Assistant",
    subtitle: "Listen to a simple explanation of your doctor-reviewed report.",
  },
  "/patient/doctor-reviews": {
    title: "Doctor Reviews",
    subtitle: "Only approved information is shown here.",
  },
  "/patient/timeline": {
    title: "Health Timeline",
    subtitle: "How your report moved from upload to explanation.",
  },
};

export function PatientShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Arun");
  const [menuOpen, setMenuOpen] = useState(false);
  const [patientId, setPatientId] = useState(LOGGED_IN_PATIENT_ID);

  useEffect(() => {
    hydrateDemoState();
    const session = getSession();
    if (!session || session.role !== "patient") {
      router.replace("/login");
      return;
    }
    const displayName = session.name;
    const profileId = session.profileId;
    queueMicrotask(() => {
      setName(displayName);
      setPatientId(profileId);
      setReady(true);
    });
  }, [router]);

  const meta =
    TITLES[pathname] ??
    (pathname.startsWith("/patient/reports/")
      ? { title: "Report", subtitle: "Doctor-reviewed explanation." }
      : { title: "MediAssist AI", subtitle: "" });

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-5 py-5">
          <Link href="/patient" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 text-sm font-semibold text-white">
              MA
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">MediAssist AI</p>
              <p className="text-[11px] text-slate-500">Patient view</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/patient"
                ? pathname === "/patient"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-indigo-50 text-indigo-800"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Profile</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">Patient</p>
          <LogoutButton className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50" />
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">MediAssist AI</p>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700"
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Profile</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{name}</p>
              <p className="text-xs text-slate-500">Patient</p>
              <LogoutButton className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenu={() => setMenuOpen(true)}
          role="patient"
          patientId={patientId}
        />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 md:pb-8">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white md:hidden">
          <div className="grid grid-cols-4">
            {[
              { href: "/patient", label: "Home", icon: Home },
              { href: "/patient/reports", label: "Reports", icon: FileText },
              { href: "/patient/ask", label: "Ask", icon: Sparkles },
              { href: "/patient/report-voice", label: "Voice", icon: Volume2 },
            ].map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/patient"
                  ? pathname === "/patient"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center py-2 text-[11px]",
                    active ? "text-indigo-700" : "text-slate-500",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
