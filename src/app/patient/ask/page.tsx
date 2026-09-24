"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AskMediAssist } from "@/components/patient/AskMediAssist";
import { useDemoStore } from "@/lib/useDemoStore";
import { usePatientSession } from "@/lib/usePatientSession";
import { Suspense } from "react";

function AskInner() {
  const params = useSearchParams();
  const reportId = params.get("report");
  const { patientId } = usePatientSession();
  const { reports } = useDemoStore();
  const report = reports.find((item) => item.id === reportId && item.patientId === patientId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Ask MediAssist</h1>
        <p className="mt-1 text-base text-slate-500">
          Ask questions about medical terms and your reports.
        </p>
      </div>
      <AskMediAssist key={report?.id ?? "general"} reportTitle={report?.title} />
      <p className="text-sm text-slate-500">
        Want the report read aloud?{" "}
        <Link href="/patient/report-voice" className="font-medium text-indigo-700">
          Open Report Voice Assistant
        </Link>
      </p>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense>
      <AskInner />
    </Suspense>
  );
}
