"use client";

import { useRouter } from "next/navigation";
import { resetDemo } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { notify } = useToast();
  const router = useRouter();

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Demo workspace</h2>
      <p className="text-sm text-slate-600">
        Reset restores the original synthetic patients, reports, and pending review for Agnes
        Kumar. This does not affect any backend.
      </p>
      <button
        type="button"
        onClick={() => {
          resetDemo();
          notify("Demo data restored");
          router.push("/doctor");
        }}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Reset demo data
      </button>
    </div>
  );
}
