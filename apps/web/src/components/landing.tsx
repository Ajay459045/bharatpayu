"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  Droplets,
  FileSpreadsheet,
  Flame,
  Landmark,
  LifeBuoy,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Zap,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const trust = ["Secure BBPS Infrastructure", "Real-Time Settlements", "Multi-Service Platform", "Advanced Security", "24/7 Availability"];

const services: Array<{ title: string; body: string; Icon: LucideIcon }> = [
  { title: "Electricity Bill Payment", body: "Enable fast electricity bill collection with real-time bill fetch, payment confirmation and printable receipts.", Icon: Zap },
  { title: "Water Bill Payment", body: "Accept municipal and water board payments through a retailer-ready BBPS retailer portal.", Icon: Droplets },
  { title: "LPG Gas Payment", body: "Offer LPG booking and payment workflows with secure wallet debit and instant commission visibility.", Icon: Flame },
  { title: "Piped Gas Bill Payment", body: "Collect piped gas payments for urban households with reliable BBPS API platform controls.", Icon: Building2 },
  { title: "Insurance Premium Payment", body: "Help customers pay insurance premiums through a compliant utility bill payment software stack.", Icon: ShieldCheck }
];

const features = [
  "Instant Wallet Settlement",
  "Real-Time Commission",
  "Retailer Dashboard",
  "Distributor Management",
  "Transaction Reports",
  "TDS Reports",
  "Excel & CSV Export",
  "AI Fraud Monitoring",
  "Enterprise Security"
];

const why = [
  "Secure BBPS APIs with idempotency and audit trails",
  "Advanced fintech architecture for scale and observability",
  "Automated settlements, commission and TDS accounting",
  "Fast onboarding with KYC, device and location verification",
  "Live reporting for admins, distributors and retailers",
  "Premium support for operations and reconciliation"
];

const testimonials = [
  { name: "Amit Sharma", role: "Distributor, Jaipur", quote: "BharatPayU gave our retailer network a cleaner BBPS flow, predictable settlements and better daily visibility." },
  { name: "Neha Patil", role: "Retailer, Pune", quote: "The wallet ledger and commission reports make customer bill payments easier to explain and reconcile every evening." },
  { name: "Rahul Verma", role: "Fintech Operator, Lucknow", quote: "The approval-first onboarding and audit logs are exactly what a serious BBPS operation needs." }
];

const faqs = [
  ["What is a BBPS Portal?", "A BBPS Portal is a secure platform that lets authorized retailers and distributors offer bill payment services such as electricity, water, gas, LPG and insurance premium payments."],
  ["How does retailer registration work?", "Retailers complete email-based onboarding, KYC document upload, location capture and email OTP verification before admin approval activates BBPS services."],
  ["How is commission calculated?", "Commission can be tracked in real time for every successful transaction, with reports available for retailer, distributor and admin reconciliation."],
  ["Is wallet usage secure?", "Wallet access is protected through JWT sessions, device tracking, audit logs, login limits and optional email OTP verification at every login."],
  ["How fast are settlements?", "BharatPayU is designed for instant wallet settlement visibility and operational reporting after successful BBPS transactions."],
  ["What security controls are included?", "The platform includes device fingerprinting, geo tracking, OTP expiration, resend cooldown, suspicious login alerts and role-based admin approval workflows."]
];

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay: 0.1 }}
      className="relative"
    >
      <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="absolute -right-4 bottom-10 h-32 w-32 rounded-full bg-green-500/20 blur-3xl" />
      <div className="glass relative rounded-lg p-4">
        <div className="rounded-md border border-white/10 bg-[#03091f]/85 p-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Live dashboard preview</p>
              <h2 className="text-xl font-semibold">BBPS Command Center</h2>
            </div>
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm text-green-200">Online</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Wallet Balance", formatCurrency(384500), WalletCards],
              ["Today Commission", formatCurrency(18420), BadgeIndianRupee],
              ["Success Rate", "99.1%", Activity]
            ].map(([label, value, Icon]) => (
              <div key={String(label)} className="rounded-md border border-white/10 bg-white/5 p-4">
                <Icon className="mb-3 text-blue-300" size={20} />
                <p className="text-xl font-semibold">{String(value)}</p>
                <p className="text-xs text-slate-400">{String(label)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-slate-300">Revenue graph</span>
              <span className="font-semibold text-green-200">+18.4%</span>
            </div>
            <div className="flex h-36 items-end gap-2">
              {[34, 58, 46, 72, 63, 88, 76, 92, 68, 96, 82, 100].map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 8 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.8, delay: index * 0.04 }}
                  className="flex-1 rounded-t bg-gradient-to-t from-[#0b5cff] via-[#0787ff] to-[#ff8a00]"
                />
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {["Electricity bill paid", "Insurance premium received", "LPG payment settled"].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                <span className="flex items-center gap-2"><ReceiptText size={15} /> {item}</span>
                <span className={index === 1 ? "text-orange-200" : "text-green-200"}>{index === 1 ? "VERIFYING" : "SUCCESS"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Landing() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BharatPayU BBPS Portal",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: "BBPS software and utility bill payment platform for retailers and distributors in India.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" }
  };

  return (
    <main className="grid-bg overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_0.95fr]">
        <div className="absolute left-10 top-16 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute bottom-10 right-20 h-44 w-44 rounded-full bg-orange-400/10 blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-300/10 px-3 py-1 text-sm text-blue-100">
            <CheckCircle2 size={15} /> Secure BBPS Portal for retailers, distributors and fintech operators
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-white md:text-6xl">
            India's Trusted BBPS Fintech Portal for Retailers & Distributors
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Offer electricity, water, gas, LPG, and insurance bill payment services with instant settlement, secure transactions, and real-time commission earnings.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register/retailer"><Button className="w-full sm:w-auto">Become Retailer</Button></Link>
            <Link href="/register/distributor"><Button variant="secondary" className="w-full sm:w-auto">Become Distributor</Button></Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {["JWT Security", "Email OTP", "KYC Approval", "BBPS API Ready"].map((badge) => (
              <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">{badge}</span>
            ))}
          </div>
        </motion.div>
        <DashboardMockup />
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 sm:grid-cols-2 lg:grid-cols-5">
          {trust.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-200"><ShieldCheck className="text-green-300" size={17} /> {item}</div>
          ))}
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-4 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">BBPS services</p>
          <h2 className="mt-3 text-3xl font-bold md:text-5xl">Utility bill payment software built for daily scale</h2>
          <p className="mt-4 text-slate-300">Launch a BBPS retailer portal with service cards, wallet-ledger controls and fast payment workflows for high-trust customer counters.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {services.map(({ title, body, Icon }) => (
            <Card key={title} className="group transition hover:-translate-y-1 hover:border-blue-300/50">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-blue-500/15 text-blue-200"><Icon /></div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
              <span className="mt-5 inline-flex rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-200">Fast payment</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Features</p>
          <h2 className="mt-3 text-3xl font-bold md:text-5xl">Enterprise fintech controls from onboarding to export</h2>
          <p className="mt-4 text-slate-300">Every transaction, commission event and KYC decision is designed for visibility, security and reconciliation.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature} className="rounded-md border border-white/10 bg-white/5 p-4 text-sm font-semibold text-slate-100"><Sparkles className="mb-3 text-orange-300" size={18} /> {feature}</div>
          ))}
        </div>
      </section>

      <section className="bg-white/[0.03] px-4 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h2 className="text-3xl font-bold">Why choose BharatPayU</h2>
            <p className="mt-4 text-slate-300">A BBPS API platform engineered for secure growth, fast onboarding and daily operations.</p>
          </Card>
          <div className="grid gap-3 lg:col-span-2 md:grid-cols-2">
            {why.map((item) => <div key={item} className="rounded-md border border-white/10 bg-[#03091f]/70 p-4 text-sm text-slate-200"><CheckCircle2 className="mb-2 text-green-300" size={18} /> {item}</div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-20 lg:grid-cols-2">
        <Card>
          <Users className="mb-4 text-blue-300" />
          <h2 className="text-2xl font-bold">Retailer benefits</h2>
          <div className="mt-5 grid gap-3 text-sm text-slate-300">
            {["Earn commission on every transaction", "Easy onboarding", "Secure wallet", "Real-time transaction tracking", "Multi-service support"].map((item) => <p key={item}>- {item}</p>)}
          </div>
        </Card>
        <Card>
          <Landmark className="mb-4 text-orange-300" />
          <h2 className="text-2xl font-bold">Distributor benefits</h2>
          <div className="mt-5 grid gap-3 text-sm text-slate-300">
            {["Manage retailers", "Differential commission earning", "Wallet management", "Retailer analytics", "Export reports"].map((item) => <p key={item}>- {item}</p>)}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">Live dashboard</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Revenue, wallets and reports in one view</h2>
          </div>
          <FileSpreadsheet className="hidden text-blue-300 md:block" size={44} />
        </div>
        <DashboardMockup />
      </section>

      <section className="bg-white/[0.03] px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold md:text-5xl">Trusted by growing BBPS networks</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name}>
                <p className="text-slate-200">"{item.quote}"</p>
                <p className="mt-5 font-semibold">{item.name}</p>
                <p className="text-sm text-slate-400">{item.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="text-3xl font-bold md:text-5xl">BBPS Portal FAQs</h2>
        <div className="mt-8 grid gap-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="rounded-md border border-white/10 bg-white/5 p-5">
              <summary className="cursor-pointer font-semibold">{question}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-300">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
