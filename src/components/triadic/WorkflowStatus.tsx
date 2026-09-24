const STEPS = [
  "Extracted",
  "Jev triaged",
  "Doctor review",
  "Accept / Edit / Reject",
  "Approved / Rejected",
  "Patient visible",
];

export function WorkflowStatus() {
  return (
    <ol className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-800">{step}</span>
          {index < STEPS.length - 1 ? <span aria-hidden>↓</span> : null}
        </li>
      ))}
    </ol>
  );
}
