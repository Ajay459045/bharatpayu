import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Droplets, Flame, Lightbulb, ShieldPlus, Waves, type LucideIcon } from "lucide-react";

const services: Array<{ title: string; slug: string; Icon: LucideIcon }> = [
  { title: "Electricity Bill Payment", slug: "electricity", Icon: Lightbulb },
  { title: "Water Bill Payment", slug: "water", Icon: Droplets },
  { title: "Insurance Premium Payment", slug: "insurance", Icon: ShieldPlus },
  { title: "Piped Gas Bill Payment", slug: "gas", Icon: Waves },
  { title: "LPG Gas Payment", slug: "lpg", Icon: Flame }
];

export default function ServicesPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-16">
        <h1 className="text-4xl font-semibold">BBPS services</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Operator-wise service enablement, timing windows, fetch bill APIs, settlement rules, and category exports.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map(({ title, slug, Icon }) => (
            <Card key={slug}>
              <Icon className="mb-4 text-teal-200" />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Fetch bill, collect payment, generate receipt, distribute commission, deduct TDS, and reconcile pending cases.
              </p>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
