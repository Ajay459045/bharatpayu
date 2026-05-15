import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { BadgeIndianRupee, Building2, CheckCircle2, Network, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
              Trusted digital payments since 2021
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
              BharatPayU is built for serious BBPS operations
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              BharatPayU gives retailers, distributors and fintech teams a secure operating layer for bill fetch,
              BharatPayU wallet payments, settlement review, commission distribution, TDS accounting, certificates,
              and service-wise reporting.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Founded", "2021"],
                ["Presentation Volume", "Rs 150 Cr+"],
                ["Services", "5 BBPS Verticals"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <img
            src="/brand/bharatpayu-office.jpg"
            alt="BharatPayU office brand wall"
            className="aspect-[16/10] w-full rounded-lg border border-white/10 object-cover shadow-2xl shadow-blue-950/30"
          />
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-4">
            {[
              ["Ledger accuracy", "Wallet debit, commission credit and TDS entries designed for reconciliation.", BadgeIndianRupee],
              ["Network controls", "Admin, distributor and retailer workflows with approval-first onboarding.", Network],
              ["API observability", "Digiseva biller/category/bill fetch logs with provider request tracking.", ShieldCheck],
              ["Publishing ready", "SEO pages, service pages, dashboards, branding and company proof points aligned.", Building2],
            ].map(([title, copy, Icon]) => (
              <Card key={String(title)}>
                <Icon className="mb-4 text-blue-300" />
                <h2 className="font-semibold">{String(title)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{String(copy)}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <Card>
            <h2 className="text-3xl font-bold">What we operate</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              BharatPayU focuses on high-frequency utility payment counters where speed, clarity and accounting
              discipline matter every day.
            </p>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Electricity Bill Payment",
              "Water Bill Payment",
              "Insurance Premium Payment",
              "Piped Gas Bill Payment",
              "LPG Gas Payment",
              "Retailer wallet settlement",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-4 text-sm font-semibold text-slate-100">
                <CheckCircle2 className="text-green-300" size={18} />
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 pb-16">
          <Card className="border-blue-300/20 bg-blue-500/10">
            <h2 className="text-2xl font-bold">Our promise</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-blue-50">
              From Digiseva-powered bill discovery to final BharatPayU wallet payment, the platform keeps the customer
              flow simple and the back office measurable: approvals, ledgers, settlements, reports and service health
              remain visible from one system.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
