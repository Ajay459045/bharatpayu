import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#020617]/90">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-5">
        <div>
          <BrandLogo />
          <p className="mt-4 text-sm leading-6 text-slate-400">Enterprise BBPS portal for secure bill payment networks, retailer onboarding, wallet settlement and reports.</p>
        </div>
        {[
          ["SEO Links", ["BBPS Portal", "BBPS Software", "BBPS Retailer Portal"]],
          ["Services", ["Electricity Bill Payment", "Water Bill Payment", "Insurance Premium Payment", "Piped Gas Bill Payment", "LPG Gas Payment"]],
          ["Company", ["About", "Contact", "Support"]],
          ["Legal", ["Terms", "Privacy Policy", "Security"]]
        ].map(([title, items]) => (
          <div key={title as string}>
            <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
            <div className="mt-3 grid gap-2 text-sm text-slate-400">
              {(items as string[]).map((item) => (
                <Link key={item} href="/services" className="hover:text-white">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t border-white/10 px-4 py-5 text-sm text-slate-400 md:flex-row">
        <p>contact@bharatpayu.com | +91 98765 43210</p>
        <p>LinkedIn | X | Facebook | Copyright 2021-2026 BharatPayU</p>
      </div>
    </footer>
  );
}
