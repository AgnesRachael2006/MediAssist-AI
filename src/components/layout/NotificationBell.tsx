"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Info } from "lucide-react";
import type { AppNotification, UserRole } from "@/lib/types";
import { getNotifications, markNotificationRead, markNotificationsRead } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDemoStore } from "@/lib/useDemoStore";

export function NotificationBell({
  role,
  patientId,
}: {
  role: UserRole;
  patientId?: string;
}) {
  const { notifications } = useDemoStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    getNotifications(role, patientId).then(setItems);
  }, [role, patientId, notifications]);

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-700 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Updates
          </p>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <>
              <div className="flex justify-end px-2">
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-700"
                  onClick={() => markNotificationsRead(role, patientId)}
                >
                  Mark all read
                </button>
              </div>
              <ul className="max-h-80 space-y-1 overflow-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <NotificationItem
                      item={item}
                      onOpen={() => {
                        markNotificationRead(item.id);
                        setOpen(false);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: () => void;
}) {
  const Icon = item.tone === "info" ? Info : CheckCircle2;
  const mark = item.tone === "info" ? "ℹ" : item.tone === "success" ? "✓" : "⚠";
  const content = (
    <>
      <div className="flex items-start gap-2">
        <Icon size={16} className={item.tone === "success" ? "text-emerald-700" : "text-indigo-700"} aria-hidden />
        <p className="text-sm font-medium text-slate-900">
          {mark} {item.title}
        </p>
      </div>
      <p className="mt-1 pl-6 text-xs text-slate-500">{item.body}</p>
      <p className="mt-1 pl-6 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
    </>
  );
  const className = `block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 ${
    item.read ? "" : "bg-indigo-50/40"
  }`;

  if (item.href) {
    return (
      <Link href={item.href} onClick={onOpen} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onOpen} className={className}>
      {content}
    </button>
  );
}
