"use client";

import { useEffect, useState } from "react";
import { BadgeIndianRupee, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const services = ["electricity", "water", "lpg", "gas", "insurance"];

export default function AdminCommissionPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    serviceCategory: "electricity",
    operator: "ALL",
    scope: "default",
    retailerId: "",
    distributorId: "",
    minAmount: "0",
    maxAmount: "5000",
    retailerType: "percent",
    retailerValue: "2",
    distributorType: "percent",
    distributorValue: "1",
    adminType: "flat",
    adminValue: "0",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rulesResponse, usersResponse] = await Promise.all([
        api.get("/admin/commission-rules"),
        api.get("/admin/users"),
      ]);
      setRules(rulesResponse.data.rules ?? []);
      setUsers(usersResponse.data.users ?? []);
    } catch (requestError: any) {
      const message =
        requestError?.response?.status === 401
          ? "Admin session expired. Please login again to manage commission rules."
          : (requestError?.response?.data?.error?.message ??
            requestError?.message ??
            "Could not load commission data.");
      setError(Array.isArray(message) ? message.join(", ") : message);
      setRules([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    try {
      await api.patch("/admin/commission-rules", {
        ...form,
        retailerId:
          form.scope === "admin_retailer" ? form.retailerId : undefined,
        distributorId: form.distributorId || undefined,
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        retailerValue: Number(form.retailerValue),
        distributorValue: Number(form.distributorValue),
        adminValue: Number(form.adminValue),
      });
      setStatus("Commission rule saved.");
      await load();
    } catch (requestError: any) {
      const message =
        requestError?.response?.status === 401
          ? "Admin session expired. Please login again before saving."
          : (requestError?.response?.data?.error?.message ??
            requestError?.message ??
            "Could not save commission rule.");
      setError(Array.isArray(message) ? message.join(", ") : message);
    }
  }

  const retailers = users.filter((user) => user.role === "retailer");
  const distributors = users.filter((user) => user.role === "distributor");

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
          Admin commission engine
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">
          Service slabs & custom commission
        </h1>
        {error && (
          <Card className="mt-5 border-red-400/20 bg-red-500/10 text-red-100">
            <p>{error}</p>
            {error.toLowerCase().includes("login") && (
              <Link href="/login">
                <Button className="mt-3" variant="secondary">
                  Login Again
                </Button>
              </Link>
            )}
          </Card>
        )}
        <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <BadgeIndianRupee className="mb-4 text-green-300" />
            <h2 className="text-2xl font-bold">Create commission rule</h2>
            <form className="mt-5 grid gap-3" onSubmit={save}>
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={form.serviceCategory}
                onChange={(event) =>
                  setForm({ ...form, serviceCategory: event.target.value })
                }
              >
                {services.map((service) => (
                  <option className="bg-slate-950" key={service}>
                    {service}
                  </option>
                ))}
              </select>
              <Input
                value={form.operator}
                onChange={(event) =>
                  setForm({ ...form, operator: event.target.value || "ALL" })
                }
                placeholder="Operator or ALL"
              />
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={form.scope}
                onChange={(event) =>
                  setForm({ ...form, scope: event.target.value })
                }
              >
                <option className="bg-slate-950" value="default">
                  Default service rule
                </option>
                <option className="bg-slate-950" value="admin_retailer">
                  Custom retailer rule
                </option>
              </select>
              {form.scope === "admin_retailer" && (
                <select
                  className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                  value={form.retailerId}
                  onChange={(event) =>
                    setForm({ ...form, retailerId: event.target.value })
                  }
                >
                  <option className="bg-slate-950" value="">
                    Select retailer
                  </option>
                  {retailers.map((user) => (
                    <option
                      className="bg-slate-950"
                      key={user._id}
                      value={user._id}
                    >
                      {user.retailerCode} - {user.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={form.distributorId}
                onChange={(event) =>
                  setForm({ ...form, distributorId: event.target.value })
                }
              >
                <option className="bg-slate-950" value="">
                  {loading ? "Loading distributors..." : "All distributors"}
                </option>
                {distributors.map((user) => (
                  <option
                    className="bg-slate-950"
                    key={user._id}
                    value={user._id}
                  >
                    {user.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={form.minAmount}
                  onChange={(event) =>
                    setForm({ ...form, minAmount: event.target.value })
                  }
                />
                <Input
                  type="number"
                  value={form.maxAmount}
                  onChange={(event) =>
                    setForm({ ...form, maxAmount: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-3">
                <select
                  className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                  value={form.retailerType}
                  onChange={(event) =>
                    setForm({ ...form, retailerType: event.target.value })
                  }
                >
                  <option className="bg-slate-950" value="percent">
                    Retailer %
                  </option>
                  <option className="bg-slate-950" value="flat">
                    Retailer flat
                  </option>
                </select>
                <Input
                  type="number"
                  value={form.retailerValue}
                  onChange={(event) =>
                    setForm({ ...form, retailerValue: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-3">
                <select
                  className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                  value={form.distributorType}
                  onChange={(event) =>
                    setForm({ ...form, distributorType: event.target.value })
                  }
                >
                  <option className="bg-slate-950" value="percent">
                    Distributor %
                  </option>
                  <option className="bg-slate-950" value="flat">
                    Distributor flat
                  </option>
                </select>
                <Input
                  type="number"
                  value={form.distributorValue}
                  onChange={(event) =>
                    setForm({ ...form, distributorValue: event.target.value })
                  }
                />
              </div>
              <Button>
                <Save size={16} /> Save Rule
              </Button>
            </form>
            {status && (
              <p className="mt-4 rounded-md bg-white/5 p-3 text-sm text-slate-300">
                {status}
              </p>
            )}
          </Card>
          <Card>
            <h2 className="text-2xl font-bold">Active rules</h2>
            {loading && (
              <p className="mt-4 rounded-md bg-white/5 p-3 text-sm text-slate-300">
                Loading commission rules...
              </p>
            )}
            {!loading && !error && users.length === 0 && (
              <p className="mt-4 rounded-md bg-amber-500/10 p-3 text-sm text-amber-100">
                No retailers or distributors found yet. New users will appear
                here after registration or distributor onboarding.
              </p>
            )}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    {[
                      "service",
                      "operator",
                      "scope",
                      "slab",
                      "retailer",
                      "distributor",
                      "active",
                    ].map((head) => (
                      <th key={head} className="border-b border-white/10 p-3">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule._id}>
                      <td className="border-b border-white/5 p-3">
                        {rule.serviceCategory}
                      </td>
                      <td className="border-b border-white/5 p-3">
                        {rule.operator}
                      </td>
                      <td className="border-b border-white/5 p-3">
                        {rule.scope}
                      </td>
                      <td className="border-b border-white/5 p-3">
                        {rule.minAmount} - {rule.maxAmount}
                      </td>
                      <td className="border-b border-white/5 p-3">
                        {rule.retailerValue} {rule.retailerType}
                      </td>
                      <td className="border-b border-white/5 p-3">
                        {rule.distributorValue} {rule.distributorType}
                      </td>
                      <td className="border-b border-white/5 p-3">
                        {String(rule.active)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
