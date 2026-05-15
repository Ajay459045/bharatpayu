"use client";

import { Bell, Download, FileText, Landmark, LockKeyhole, ReceiptText, ShieldCheck, Users, WalletCards, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function DashboardShell({ role }: { role: "admin" | "distributor" | "retailer" }) {
  const approvalStatus = typeof window !== "undefined" ? localStorage.getItem("bharatpayu.approvalStatus") ?? "pending" : "pending";
  const isRestrictedRetailer = role === "retailer" && approvalStatus !== "approved";
  const cards: Array<{ label: string; value: string; Icon: LucideIcon }> = [
    { label: role === "retailer" ? "Today Transactions" : "Network Transactions", value: "0", Icon: ReceiptText },
    { label: role === "retailer" ? "Today Earnings" : "Total Volume", value: formatCurrency(0), Icon: Landmark },
    { label: "Commission", value: formatCurrency(0), Icon: WalletCards },
    { label: role === "retailer" ? "Wallet" : "Network users", value: role === "retailer" ? formatCurrency(0) : "0", Icon: Users }
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-teal-200">{role} panel</p>
            <h1 className="text-3xl font-semibold">BharatPayU dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary"><Bell size={16} /> Alerts</Button>
            {role === "admin" && <Link href="/dashboard/admin/approvals"><Button variant="secondary"><ShieldCheck size={16} /> Approvals</Button></Link>}
            <Button disabled={isRestrictedRetailer}><Download size={16} /> Export</Button>
          </div>
        </div>
        {isRestrictedRetailer && (
          <Card className="mb-4 border-orange-300/30 bg-orange-400/10">
            <LockKeyhole className="mb-3 text-orange-200" />
            <h2 className="text-xl font-semibold">Your account is under verification.</h2>
            <p className="mt-2 text-sm text-orange-50">Please wait for admin approval. BBPS services, transactions and wallet usage are disabled. You can view profile, KYC status and logout.</p>
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, Icon }) => (
            <Card key={label} className={isRestrictedRetailer && ["Transactions", "Revenue", "Commission", "Wallet"].includes(label) ? "opacity-45" : ""}>
              <Icon className="mb-4 text-teal-200" />
              <p className="text-2xl font-semibold">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className={isRestrictedRetailer ? "pointer-events-none opacity-45" : ""}>
            <h2 className="mb-4 text-lg font-semibold">Revenue analytics</h2>
            <div className="grid h-80 place-items-center rounded-md border border-white/10 bg-white/5 text-center">
              <div>
                <p className="font-semibold text-slate-200">No live analytics yet</p>
                <p className="mt-2 text-sm text-slate-400">Approved transactions will populate this chart from the BBPS ledger.</p>
              </div>
            </div>
          </Card>
          <Card className={isRestrictedRetailer ? "pointer-events-none opacity-45" : ""}>
            <h2 className="mb-4 text-lg font-semibold">Live transaction feed</h2>
            <div className="grid place-items-center rounded-md border border-white/10 bg-white/5 p-8 text-center">
              <FileText className="mb-3 text-slate-400" size={24} />
              <p className="font-semibold text-slate-200">No transactions yet</p>
              <p className="mt-2 text-sm text-slate-400">Live BBPS activity will appear here after wallet-enabled payments.</p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
