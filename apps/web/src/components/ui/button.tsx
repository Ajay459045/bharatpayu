import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[#0b5cff] text-white shadow-lg shadow-blue-950/30 hover:bg-[#0787ff]",
        variant === "secondary" && "border border-blue-200/20 bg-white/10 text-white hover:bg-white/15",
        variant === "ghost" && "bg-transparent text-slate-100 hover:bg-white/10",
        variant === "danger" && "bg-rose-400 text-slate-950 hover:bg-rose-300",
        className
      )}
      {...props}
    />
  );
}
