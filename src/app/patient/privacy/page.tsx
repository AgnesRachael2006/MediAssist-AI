"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { listShares, revokeShare } from "@/lib/api";
import type { RecordShare } from "@/lib/types";

export default function PrivacyPage() {
  const [shares, setShares] = useState<RecordShare[]>([]);

  useEffect(() => {
    listShares().then(setShares).catch(() => setShares([]));
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Privacy and access</h2>
      <p className="text-sm text-slate-500">Active codes stop working as soon as you revoke them.</p>
      {shares.length === 0 ? <p className="text-sm text-slate-500">No shares yet.</p> : null}
      {shares.map((share) => (
        <article key={share.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold">{share.access_token}</p>
          <p className="text-slate-600">{share.status} · {share.purpose}</p>
          {share.status === "ACTIVE" ? (
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => void revokeShare(share.id).then(() => listShares().then(setShares))}
            >
              Revoke
            </Button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
