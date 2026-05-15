import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-white/10 bg-white/8 px-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-blue-300",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
