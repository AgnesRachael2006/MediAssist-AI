export function BrandLogo({
  size = "md",
  light = false,
}: {
  size?: "sm" | "md";
  light?: boolean;
}) {
  const box = size === "sm" ? "h-8 w-8 text-xs rounded-lg" : "h-11 w-11 text-sm rounded-2xl";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex items-center justify-center font-semibold ${box} ${
          light ? "bg-white/10 text-white" : "bg-indigo-700 text-white"
        }`}
      >
        MA
      </span>
      <div>
        <p className={`font-semibold ${light ? "text-white" : "text-slate-900"} ${size === "sm" ? "text-sm" : "text-lg"}`}>
          MediAssist AI
        </p>
        {size === "md" ? (
          <p className={`text-xs ${light ? "text-indigo-200" : "text-slate-500"}`}>
            Human-Centered Clinical Intelligence
          </p>
        ) : null}
      </div>
    </div>
  );
}
