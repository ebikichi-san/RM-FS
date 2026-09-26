import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
}) {
  const styles = {
    primary: "bg-sky-500 text-slate-950 hover:bg-sky-400",
    ghost: "bg-transparent text-slate-200 hover:bg-white/5",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
    outline: "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
