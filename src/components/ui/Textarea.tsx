import { cn } from "@/lib/cn";

export function Textarea({
  label,
  className,
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        id={inputId}
        className={cn(
          "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none ring-indigo-200 focus:ring-2",
          className,
        )}
        {...props}
      />
    </label>
  );
}
