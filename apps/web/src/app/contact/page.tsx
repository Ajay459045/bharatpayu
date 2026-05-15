import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h1 className="text-4xl font-semibold">Contact BharatPayU</h1>
          <p className="mt-3 leading-7 text-slate-300">Talk to our onboarding team for BBPS operations, DigiSeva integration, and distributor rollout.</p>
        </div>
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Name" />
            <Input placeholder="Mobile" />
            <Input className="md:col-span-2" placeholder="Business email" />
            <textarea className="min-h-32 rounded-md border border-white/10 bg-white/8 p-3 text-sm outline-none md:col-span-2" placeholder="Message" />
          </div>
          <Button className="mt-4">Send enquiry</Button>
        </Card>
      </main>
      <Footer />
    </>
  );
}
