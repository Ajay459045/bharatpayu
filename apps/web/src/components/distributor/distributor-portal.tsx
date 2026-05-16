"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CheckCircle2,
  Gauge,
  Landmark,
  LogOut,
  PlusCircle,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const serviceOptions = ["electricity", "water", "lpg", "gas", "insurance"];

const navItems = [
  { label: "Overview", href: "/dashboard/distributor", Icon: Gauge },
  { label: "Retailers", href: "/dashboard/distributor/retailers", Icon: Users },
  {
    label: "Add Retailer",
    href: "/dashboard/distributor/retailers/add",
    Icon: PlusCircle,
  },
  {
    label: "Wallet Topup",
    href: "/dashboard/distributor/retailers",
    Icon: WalletCards,
  },
  {
    label: "Service Control",
    href: "/dashboard/distributor/retailers",
    Icon: ShieldCheck,
  },
  {
    label: "Commission",
    href: "/dashboard/distributor",
    Icon: BadgeIndianRupee,
  },
  {
    label: "Security",
    href: "/dashboard/distributor/security",
    Icon: Settings,
  },
];

export function DistributorPortal() {
  const [distributor, setDistributor] = useState<any>(null);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [ruleForm, setRuleForm] = useState({
    retailerId: "",
    serviceCategory: "electricity",
    operator: "ALL",
    minAmount: "0",
    maxAmount: "5000",
    retailerType: "percent",
    retailerValue: "2",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const wallet = retailers.reduce(
      (sum, retailer) => sum + Number(retailer.walletBalance ?? 0),
      0,
    );
    const earnings = retailers.reduce(
      (sum, retailer) => sum + Number(retailer.earnings ?? 0),
      0,
    );
    const transactions = retailers.reduce(
      (sum, retailer) => sum + Number(retailer.transactions ?? 0),
      0,
    );
    return {
      total: retailers.length,
      active: retailers.filter((retailer) => retailer.isActive).length,
      suspended: retailers.filter((retailer) => !retailer.isActive).length,
      wallet,
      earnings,
      transactions,
      verified: retailers.filter(
        (retailer) => retailer.kycStatus === "verified",
      ).length,
    };
  }, [retailers]);

  async function load() {
    const retailerResponse = await api.get("/distributor/retailers");
    setDistributor(retailerResponse.data.distributor ?? null);
    setRetailers(retailerResponse.data.retailers ?? []);
    if (retailerResponse.data.distributor?.approvalStatus !== "approved") {
      setRules([]);
      setStatus("Your distributor account is waiting for admin approval.");
      return;
    }
    const ruleResponse = await api.get("/distributor/commission-rules");
    setRules(ruleResponse.data.rules ?? []);
  }

  async function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch("/distributor/commission-rules", {
      ...ruleForm,
      minAmount: Number(ruleForm.minAmount),
      maxAmount: Number(ruleForm.maxAmount),
      retailerValue: Number(ruleForm.retailerValue),
    });
    setStatus("Retailer commission rule saved.");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-[#06102b] p-4 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-[#0b5cff]">
              <Landmark size={22} />
            </div>
            <div>
              <p className="text-lg font-black">BHARATPAYU</p>
              <p className="text-xs text-blue-200">Distributor workspace</p>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-blue-400/20 bg-blue-500/10 p-4">
            <p className="text-sm text-slate-300">Signed in as</p>
            <p className="mt-1 font-bold">
              {distributor?.businessName ?? distributor?.name ?? "Distributor"}
            </p>
            <span className="mt-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold capitalize text-emerald-200">
              {distributor?.approvalStatus ?? "checking"}
            </span>
          </div>

          <nav className="mt-6 grid gap-2">
            {navItems.map(({ label, href, Icon }) => (
              <Link
                className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                href={href as "/dashboard/distributor"}
                key={label}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 grid gap-2 rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Network health</p>
            <p>{stats.active} active retailers</p>
            <p>{stats.suspended} suspended retailers</p>
            <p>{stats.verified} verified KYC accounts</p>
          </div>

          <button
            className="mt-6 flex h-11 w-full items-center gap-3 rounded-md border border-white/10 px-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            type="button"
          >
            <LogOut size={17} />
            Logout
          </button>
        </aside>

        <section className="bg-[radial-gradient(circle_at_top_right,rgba(11,92,255,0.18),transparent_34%),#03091f] p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
                  Distributor panel
                </p>
                <h1 className="mt-2 text-3xl font-black md:text-5xl">
                  Retailer network command center
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Add retailers, monitor wallets, control service access, tune
                  commission and keep your complete retailer network in view.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/distributor/retailers/add">
                  <Button>
                    <PlusCircle size={16} /> Add Retailer
                  </Button>
                </Link>
                <Link href="/dashboard/distributor/retailers">
                  <Button variant="secondary">
                    Manage Network <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>

            {distributor?.approvalStatus !== "approved" && (
              <Card className="mt-6 border-orange-300/20 bg-orange-500/10 text-orange-50">
                <h2 className="text-xl font-bold">Approval pending</h2>
                <p className="mt-2 text-sm leading-6">
                  Admin approval is required before you can add retailers or
                  manage commission rules.
                </p>
              </Card>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Users size={18} />}
                label="Retailers"
                value={String(stats.total)}
                detail={`${stats.active} active`}
              />
              <MetricCard
                icon={<WalletCards size={18} />}
                label="Retailer wallet"
                value={formatCurrency(stats.wallet)}
                detail="Main wallet total"
              />
              <MetricCard
                icon={<ReceiptText size={18} />}
                label="Transactions"
                value={String(stats.transactions)}
                detail="Network volume count"
              />
              <MetricCard
                icon={<BadgeIndianRupee size={18} />}
                label="Commission"
                value={formatCurrency(stats.earnings)}
                detail="Retailer earnings"
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <Card>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <Store className="mb-3 text-blue-300" />
                    <h2 className="text-2xl font-bold">Retailer network</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Live view of retailers created under this distributor.
                    </p>
                  </div>
                  <Link href="/dashboard/distributor/retailers">
                    <Button variant="secondary">
                      View All <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[840px] text-left text-sm">
                    <thead className="text-slate-400">
                      <tr>
                        {[
                          "Retailer",
                          "Mobile",
                          "Wallet",
                          "KYC",
                          "Status",
                          "Actions",
                        ].map((heading) => (
                          <th className="p-3 font-semibold" key={heading}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {retailers.slice(0, 7).map((retailer) => (
                        <tr
                          className="border-t border-white/10"
                          key={retailer._id}
                        >
                          <td className="p-3">
                            <p className="font-semibold">{retailer.name}</p>
                            <p className="text-xs text-slate-400">
                              {retailer.businessName || retailer.retailerCode}
                            </p>
                          </td>
                          <td className="p-3">{retailer.mobile}</td>
                          <td className="p-3">
                            {formatCurrency(
                              Number(retailer.walletBalance ?? 0),
                            )}
                          </td>
                          <td className="p-3 capitalize">
                            {retailer.kycStatus}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${retailer.isActive ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}
                            >
                              {retailer.isActive ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="p-3">
                            <Link
                              href={`/dashboard/distributor/retailers/${retailer._id}`}
                            >
                              <Button variant="secondary">Open</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {retailers.length === 0 && (
                    <div className="rounded-md border border-dashed border-white/15 p-6 text-sm text-slate-300">
                      No retailers added yet. Start with premium onboarding to
                      create the first retailer under this distributor.
                    </div>
                  )}
                </div>
              </Card>

              <div className="grid gap-5">
                <Card>
                  <BarChart3 className="mb-4 text-cyan-300" />
                  <h2 className="text-xl font-bold">Network mix</h2>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Active", stats.active, "bg-emerald-400"],
                      ["Suspended", stats.suspended, "bg-rose-400"],
                      ["KYC verified", stats.verified, "bg-blue-400"],
                    ].map(([label, value, color]) => (
                      <div key={label as string}>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">{label}</span>
                          <span>{value}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10">
                          <div
                            className={`h-2 rounded-full ${color}`}
                            style={{
                              width: `${stats.total ? (Number(value) / stats.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <Settings className="mb-4 text-green-300" />
                  <h2 className="text-xl font-bold">Service controls</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {serviceOptions.map((service) => (
                      <Link
                        className="rounded-md border border-white/10 bg-white/5 p-3 text-sm capitalize transition hover:bg-white/10"
                        href="/dashboard/distributor/retailers"
                        key={service}
                      >
                        {service}
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <Save className="mb-4 text-green-300" />
                <h2 className="text-2xl font-bold">Set retailer commission</h2>
                <form className="mt-5 grid gap-3" onSubmit={saveRule}>
                  <select
                    className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                    value={ruleForm.retailerId}
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        retailerId: event.target.value,
                      })
                    }
                    required
                  >
                    <option className="bg-slate-950" value="">
                      Select retailer
                    </option>
                    {retailers.map((retailer) => (
                      <option
                        className="bg-slate-950"
                        key={retailer._id}
                        value={retailer._id}
                      >
                        {retailer.retailerCode} - {retailer.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                    value={ruleForm.serviceCategory}
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        serviceCategory: event.target.value,
                      })
                    }
                  >
                    {serviceOptions.map((service) => (
                      <option className="bg-slate-950" key={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={ruleForm.operator}
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        operator: event.target.value || "ALL",
                      })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      value={ruleForm.minAmount}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          minAmount: event.target.value,
                        })
                      }
                    />
                    <Input
                      type="number"
                      value={ruleForm.maxAmount}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          maxAmount: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                      value={ruleForm.retailerType}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          retailerType: event.target.value,
                        })
                      }
                    >
                      <option className="bg-slate-950" value="percent">
                        Percent
                      </option>
                      <option className="bg-slate-950" value="flat">
                        Flat Rs
                      </option>
                    </select>
                    <Input
                      type="number"
                      value={ruleForm.retailerValue}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          retailerValue: event.target.value,
                        })
                      }
                    />
                  </div>
                  <Button disabled={distributor?.approvalStatus !== "approved"}>
                    Save Commission
                  </Button>
                </form>
              </Card>

              <Card>
                <h2 className="text-2xl font-bold">Custom rules</h2>
                <div className="mt-5 grid gap-2">
                  {rules.slice(0, 7).map((rule) => (
                    <p
                      key={rule._id}
                      className="rounded-md bg-white/5 p-3 text-sm"
                    >
                      {rule.serviceCategory} {rule.minAmount}-{rule.maxAmount}:{" "}
                      {rule.retailerValue} {rule.retailerType}
                    </p>
                  ))}
                  {rules.length === 0 && (
                    <p className="rounded-md border border-dashed border-white/15 p-4 text-sm text-slate-300">
                      No custom commission rules configured yet.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {status && (
              <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                {status}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <span className="text-blue-300">{icon}</span>
        <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </Card>
  );
}
