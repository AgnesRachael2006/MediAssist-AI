"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import type { UserRole } from "@/lib/types";

interface TopNavbarProps {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  role?: UserRole;
  patientId?: string;
}

export function TopNavbar({
  title,
  subtitle,
  onMenu,
  role = "doctor",
  patientId,
}: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {onMenu ? (
            <button
              type="button"
              onClick={onMenu}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={16} />
            </button>
          ) : null}
          <div>
            <h1 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
            {subtitle ? <p className="text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-100">
            Demo Mode
          </span>
          <NotificationBell role={role} patientId={patientId} />
        </div>
      </div>
    </header>
  );
}
