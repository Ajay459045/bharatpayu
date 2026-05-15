import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  ["About", "/about"],
  ["Services", "/services"],
  ["Contact", "/contact"]
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-400/15 bg-[#03091f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <BrandLogo />
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost">
              <ShieldCheck size={16} />
              Login
            </Button>
          </Link>
          <Link href="/register/retailer" className="hidden sm:block">
            <Button>Become Retailer</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
