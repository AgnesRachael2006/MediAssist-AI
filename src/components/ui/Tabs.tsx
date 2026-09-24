import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 rounded-lg px-4 text-sm font-medium",
              selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
