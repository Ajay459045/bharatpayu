"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  History,
  LockKeyhole,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UserRound,
  WalletCards,
  Zap,
  type LucideIcon
} from "lucide-react";
import { io } from "socket.io-client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type RetailerOverview = {
  profile: {
    name: string;
    businessName?: string;
    email: string;
    approvalStatus: string;
    kycStatus: string;
    isActive: boolean;
  };
  isRestricted: boolean;
  wallets: { main: number; commission: number; currency: string };
  stats: Array<{ label: string; value: number; type: "currency" | "number"; series: number[] }>;
  charts: {
    daily: Array<{ day: string; value: number }>;
    serviceWise: Array<{ name: string; value: number }>;
    walletUsage: Array<{ day: string; value: number }>;
  };
  transactions: Array<Record<string, any>>;
  notifications: Array<Record<string, any>>;
  services: Array<{ key: string; label: string; operators: string[] }>;
};

const zeroOverview: RetailerOverview = {
  profile: { name: "Retailer", email: "", approvalStatus: "pending", kycStatus: "submitted", isActive: true },
  isRestricted: true,
  wallets: { main: 0, commission: 0, currency: "INR" },
  stats: [
    "Main Wallet Balance",
    "Commission Wallet",
    "Today Transactions",
    "Success Transactions",
    "Pending Transactions",
    "Failed Transactions",
    "Today Earnings",
    "Total Commission",
    "Total TDS",
    "Monthly Volume"
  ].map((label) => ({ label, value: 0, type: label.includes("Transactions") ? "number" : "currency", series: [0, 0, 0, 0, 0, 0] as number[] })),
  charts: {
    daily: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, value: 0 })),
    serviceWise: ["Electricity", "Water", "LPG", "Piped Gas", "Insurance"].map((name) => ({ name, value: 0 })),
    walletUsage: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, value: 0 }))
  },
  transactions: [],
  notifications: [],
  services: []
};

const nav: Array<{ section: string; items: Array<{ label: string; href: string; Icon: LucideIcon; restricted?: boolean }> }> = [
  { section: "Dashboard", items: [{ label: "Overview", href: "/dashboard/retailer", Icon: Gauge }] },
  {
    section: "BBPS Services",
    items: [
      { label: "Electricity Bill Payment", href: "/dashboard/retailer/bbps/electricity", Icon: Zap, restricted: true },
      { label: "Water Bill Payment", href: "/dashboard/retailer/bbps/water", Icon: Zap, restricted: true },
      { label: "Insurance Premium Payment", href: "/dashboard/retailer/bbps/insurance", Icon: Zap, restricted: true },
      { label: "Piped Gas Bill Payment", href: "/dashboard/retailer/bbps/gas", Icon: Zap, restricted: true },
      { label: "LPG Gas Payment", href: "/dashboard/retailer/bbps/lpg", Icon: Zap, restricted: true }
    ]
  },
  {
    section: "Wallet",
    items: [
      { label: "Wallet Balance", href: "/dashboard/retailer/wallet", Icon: WalletCards, restricted: true },
      { label: "Ledger", href: "/dashboard/retailer/wallet", Icon: History, restricted: true },
      { label: "Settlement Reports", href: "/dashboard/retailer/reports", Icon: FileSpreadsheet, restricted: true }
    ]
  },
  {
    section: "Operations",
    items: [
      { label: "Transactions", href: "/dashboard/retailer/transactions", Icon: ReceiptText, restricted: true },
      { label: "Commission", href: "/dashboard/retailer/reports", Icon: CreditCard, restricted: true },
      { label: "Reports", href: "/dashboard/retailer/reports", Icon: Download, restricted: true },
      { label: "Notifications", href: "/dashboard/retailer/notifications", Icon: Bell }
    ]
  },
  {
    section: "Account",
    items: [
      { label: "Profile & KYC", href: "/dashboard/retailer/profile", Icon: UserRound },
      { label: "Security", href: "/dashboard/retailer/security", Icon: LockKeyhole }
    ]
  }
];

function MiniBars({ series }: { series: number[] }) {
  const max = Math.max(...series, 1);
  return (
    <div className="mt-4 flex h-8 items-end gap-1">
      {series.map((value, index) => (
        <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-orange-300" style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function statusClass(status: string) {
  if (status === "success" || status === "approved" || status === "verified") return "border-green-400/20 bg-green-500/15 text-green-200";
  if (status === "pending" || status === "submitted") return "border-amber-400/20 bg-amber-500/15 text-amber-200";
  return "border-red-400/20 bg-red-500/15 text-red-200";
}

export function RetailerPortal() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState("Polling");
  const { data = zeroOverview, refetch } = useQuery({
    queryKey: ["retailer-overview"],
    queryFn: async () => (await api.get<RetailerOverview>("/retailer/overview")).data,
    refetchInterval: 15000,
    retry: 1
  });

  useEffect(() => {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/api\/v1$/, "");
    const socket = io(`${baseUrl}/admin`, { transports: ["websocket"], reconnectionAttempts: 3 });
    socket.on("connect", () => setLiveStatus("Live"));
    socket.on("disconnect", () => setLiveStatus("Polling"));
    socket.on("admin:transactions", () => refetch());
    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  function logout() {
    localStorage.removeItem("bharatpayu.accessToken");
    localStorage.removeItem("bharatpayu.approvalStatus");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#03091f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(11,92,255,.18),transparent_28rem),radial-gradient(circle_at_86%_16%,rgba(255,138,0,.12),transparent_26rem),radial-gradient(circle_at_50%_100%,rgba(34,197,94,.08),transparent_32rem)]" />
      <aside className={`fixed inset-y-0 left-0 z-50 border-r border-white/10 bg-[#020821]/90 backdrop-blur-2xl transition-all ${collapsed ? "w-20" : "w-80"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <BrandLogo compact={collapsed} />
          <Button variant="ghost" className="hidden h-9 w-9 px-0 lg:inline-flex" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</Button>
        </div>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {nav.map((group) => (
            <div key={group.section} className="mb-5">
              {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{group.section}</p>}
              <div className="grid gap-1">
                {group.items.map(({ label, href, Icon, restricted }) => {
                  const disabled = data.isRestricted && restricted;
                  const content = (
                    <span className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${disabled ? "cursor-not-allowed text-slate-600" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}>
                      <Icon size={17} /> {!collapsed && label}
                    </span>
                  );
                  return disabled ? <span key={label}>{content}</span> : <Link key={label} href={href as "/dashboard/retailer"}>{content}</Link>;
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close sidebar" />}

      <section className={`relative transition-all ${collapsed ? "lg:pl-20" : "lg:pl-80"}`}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#03091f]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Button variant="ghost" className="h-10 w-10 px-0 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{data.profile.businessName || data.profile.name}</p>
              <p className="truncate text-xs text-slate-400">{data.profile.email}</p>
            </div>
            <span className="hidden rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-100 md:inline-flex"><WalletCards size={15} className="mr-2" /> {formatCurrency(data.wallets.main)}</span>
            <span className={`hidden rounded-full border px-3 py-1 text-sm md:inline-flex ${liveStatus === "Live" ? "border-green-400/20 bg-green-500/10 text-green-200" : "border-amber-400/20 bg-amber-500/10 text-amber-200"}`}>{liveStatus}</span>
            <Link href="/dashboard/retailer/notifications"><Button variant="secondary" className="h-10 w-10 px-0"><Bell size={16} /></Button></Link>
            <Button variant="secondary" onClick={logout}><LogOut size={16} /> <span className="hidden sm:inline">Logout</span></Button>
          </div>
        </header>

        <div className="p-4 md:p-6">
          {data.isRestricted && (
            <Card className="mb-5 border-orange-300/30 bg-orange-400/10">
              <LockKeyhole className="mb-3 text-orange-200" />
              <h2 className="text-xl font-bold">Your account is under verification.</h2>
              <p className="mt-2 text-sm leading-6 text-orange-50">Please wait for admin approval. BBPS services, bill payments and wallet transactions are disabled. Profile, KYC, notifications and security history remain available.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/retailer/profile"><Button variant="secondary"><FileCheck2 size={16} /> View KYC</Button></Link>
                <Link href="/dashboard/retailer/security"><Button variant="secondary"><ShieldCheck size={16} /> Security</Button></Link>
              </div>
            </Card>
          )}

          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">Retailer command center</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">BBPS wallet operations</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Fetch bills, pay from BharatPayU wallet, track commission, TDS, ledger entries, receipts and security from one premium counter dashboard.</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.stats.map((stat, index) => (
              <motion.div key={stat.label} whileHover={{ y: -4 }}>
                <Card className="relative overflow-hidden border-blue-300/15 bg-white/[0.055]">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/15 blur-2xl" />
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/15 text-blue-200">{index < 2 ? <WalletCards size={18} /> : <ReceiptText size={18} />}</span>
                  <p className="mt-4 text-2xl font-black">{stat.type === "currency" ? formatCurrency(stat.value) : stat.value.toLocaleString("en-IN")}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <MiniBars series={stat.series} />
                </Card>
              </motion.div>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <h2 className="text-xl font-bold">Transaction analytics</h2>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.daily}>
                    <defs><linearGradient id="retailerDaily" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#0b5cff" stopOpacity={0.8} /><stop offset="95%" stopColor="#0b5cff" stopOpacity={0.04} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="day" stroke="#94a3b8" /><YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: "#07112f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="value" stroke="#0b5cff" fill="url(#retailerDaily)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-bold">Service-wise earnings</h2>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.serviceWise}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="#94a3b8" /><YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: "#07112f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#ff8a00" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">BBPS services</h2>
                <span className={`rounded-full border px-3 py-1 text-sm ${data.isRestricted ? statusClass("pending") : statusClass("approved")}`}>{data.isRestricted ? "Locked" : "Live"}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.services.map((service) => (
                  <Link key={service.key} href={data.isRestricted ? "/dashboard/retailer/profile" : `/dashboard/retailer/bbps/${service.key}`}>
                    <div className="rounded-md border border-white/10 bg-white/5 p-4 transition hover:border-blue-300/30 hover:bg-white/8">
                      <Zap className="mb-3 text-blue-300" />
                      <p className="font-semibold">{service.label}</p>
                      <p className="mt-2 text-sm text-slate-400">{service.operators.length} operators available</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-bold">Live transaction feed</h2>
              <div className="mt-4 grid gap-3">
                {data.transactions.length === 0 && <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No BBPS transactions yet.</p>}
                {data.transactions.slice(0, 6).map((txn: any) => (
                  <Link key={txn.transactionId} href={`/dashboard/retailer/transactions/${txn.transactionId}`} className="rounded-md border border-white/10 bg-white/5 p-3 transition hover:bg-white/8">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{txn.serviceCategory} | {formatCurrency(Number(txn.amount ?? 0))}</p>
                      <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(txn.status)}`}>{txn.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{txn.transactionId} | {txn.operator}</p>
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}
