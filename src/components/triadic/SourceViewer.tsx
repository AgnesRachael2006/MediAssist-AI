import type { FindingCard, SourceLine } from "@/lib/types";

export function SourceViewer({
  fileName,
  lines,
  finding,
}: {
  fileName: string;
  lines: SourceLine[];
  finding: FindingCard | null;
}) {
  const page = finding?.source.page ?? lines[0]?.page ?? 1;
  const visible = lines.filter((line) => line.page === page);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original report</p>
        <p className="mt-1 font-semibold text-slate-900">{fileName}</p>
        <p className="text-sm text-slate-500">Page {page}</p>
      </div>
      <div className="max-h-[40rem] overflow-auto p-3 font-mono text-xs leading-6 sm:text-sm">
        {visible.map((line) => {
          const active =
            finding !== null &&
            line.line >= finding.source.line_start &&
            line.line <= finding.source.line_end;
          return (
            <div
              key={`${line.page}-${line.line}`}
              className={active ? "rounded-lg bg-amber-100 px-2 text-slate-950" : "px-2 text-slate-700"}
            >
              <span className="mr-3 inline-block w-6 text-right text-slate-400">{line.line}</span>
              {line.text}
            </div>
          );
        })}
      </div>
      {finding ? (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          Where did this finding come from? Page {finding.source.page} · Lines {finding.source.line_start}
          {finding.source.line_end === finding.source.line_start ? "" : `-${finding.source.line_end}`}
        </p>
      ) : null}
    </div>
  );
}
