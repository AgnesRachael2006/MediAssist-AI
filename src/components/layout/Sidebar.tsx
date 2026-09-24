"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, GitFork, History, LayoutDashboard, Pill } from "lucide-react";
import { DEMO_DOCTOR } from "@/lib/mockData";
import { cn } from "@/lib/cn";
import { LogoutButton } from "./LogoutButton";
import { getSession } from "@/lib/session";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/reports", label: "Reports", icon: ClipboardList },
  { href: "/doctor/history", label: "Patient History", icon: History },
  { href: "/doctor/graph", label: "Clinical Graph", icon: GitFork },
  { href: "/doctor/medication-safety", label: "Medication Safety", icon: Pill },
  { href: "/doctor/audit", label: "Audit Trail", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [name, setName] = useState(DEMO_DOCTOR.name);
  const [title, setTitle] = useState(DEMO_DOCTOR.title);

  useEffect(() => {
    const session = getSession();
    if (session?.role !== "doctor") return;
    const nextName = session.name;
    const nextTitle = session.title ?? DEMO_DOCTOR.title;
    queueMicrotask(() => {
      setName(nextName);
      setTitle(nextTitle);
    });
  }, []);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="px-5 py-5">
        <Link href="/doctor" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-700 text-sm font-semibold text-white">
            MA
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">MediAssist AI</p>
            <p className="text-[11px] text-slate-500">Clinical intelligence</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/doctor"
              ? pathname === "/doctor"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Profile</p>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            {name
              .split(" ")
              .slice(-2)
              .map((part) => part[0])
              .join("")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{title}</p>
            <p className="text-[11px] text-slate-400">Doctor</p>
          </div>
        </div>
        <LogoutButton className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50" />
      </div>
    </aside>
  );
}
