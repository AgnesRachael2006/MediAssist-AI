import { ArrowDown, Check, FileText, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";

const STEPS = [
  { label: "Patient report", icon: FileText },
  { label: "AI analysis", icon: Sparkles },
  { label: "Clinical insights", icon: Stethoscope },
  { label: "Evidence", icon: FileText },
  { label: "Doctor review", icon: ShieldCheck },
  { label: "Accept / Edit / Reject", icon: Check },
  { label: "Approved information", icon: ShieldCheck },
  { label: "Patient explanation", icon: FileText },
];

export function WorkflowStrip() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Human-in-the-loop workflow</h2>
          <p className="text-xs text-slate-500">
            AI assists. The doctor decides. Patients see only approved information.
          </p>
        </div>
      </div>
      <div className="hidden gap-2 overflow-x-auto pb-1 lg:flex">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex min-w-0 flex-1 items-center">
              <div className="flex w-full flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-2 py-3 text-center">
                <Icon size={16} className="text-indigo-700" />
                <p className="mt-2 text-[11px] font-medium leading-tight text-slate-700">
                  {step.label}
                </p>
              </div>
              {index < STEPS.length - 1 ? (
                <span className="px-1 text-slate-300">→</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <ol className="space-y-2 lg:hidden">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.label} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Icon size={14} />
              </span>
              {step.label}
              <ArrowDown size={12} className="ml-auto text-slate-300 last:hidden" />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
