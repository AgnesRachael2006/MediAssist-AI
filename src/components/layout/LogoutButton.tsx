"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { logout } from "@/lib/api";

export function LogoutButton({
  className,
  label = "Logout",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <LogOut size={14} />
        {label}
      </button>
      <Modal
        open={open}
        title="Are you sure you want to logout?"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await logout();
                setBusy(false);
                setOpen(false);
                router.push("/login");
              }}
              className="rounded-xl bg-indigo-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Logging out..." : "Logout"}
            </button>
          </>
        }
      >
        You will return to the login screen. Demo data on this device stays until you reset it from
        the doctor dashboard.
      </Modal>
    </>
  );
}
