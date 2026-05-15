import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-3", className)} aria-label="BharatPayU home">
      <img
        src="/brand/bharatpayu-logo.png"
        alt="BharatPayU"
        className="h-11 w-11 shrink-0 rounded-md bg-white object-contain p-1 shadow-lg shadow-blue-950/30"
      />
      {!compact && (
        <span className="leading-none">
          <span className="block text-xl font-black tracking-normal">
            <span className="text-white">BHARAT</span>
            <span className="text-[#0787ff]">PAYU</span>
          </span>
          <span className="mt-1 block text-[11px] font-medium text-slate-400">Trusted Digital Payments Since 2021</span>
        </span>
      )}
    </Link>
  );
}
