import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "red" | "yellow" | "green" | "blue";
}) {
  const tones = {
    neutral: "bg-white/10 text-slate-200",
    red: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    yellow: "bg-amber-500/20 text-amber-100 border-amber-500/40",
    green: "bg-emerald-500/20 text-emerald-100 border-emerald-500/40",
    blue: "bg-sky-500/20 text-sky-100 border-sky-500/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs font-semibold tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
