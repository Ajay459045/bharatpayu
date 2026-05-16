"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type AdminTransaction = {
  id: string;
  retailer: string;
  distributor?: string;
  service: string;
  operator: string;
  amount: number;
  retailerCommission: number;
  distributorCommission: number;
  status: string;
  settlementStatus?: string;
  billNumber?: string;
  consumerNumber?: string;
  time: string;
};

export function AdminTransactionsPage({
  status = "all",
  role,
  service,
  title,
}: {
  status?: string;
  role?: "distributor";
  service?: string;
  title: string;
}) {
  const [rows, setRows] = useState<AdminTransaction[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalAmount: 0,
    totalCommission: 0,
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/admin/transactions", {
          params: { status, role, service },
        });
        setRows(data.transactions ?? []);
        setSummary(
          data.summary ?? { count: 0, totalAmount: 0, totalCommission: 0 },
        );
      } catch (requestError: any) {
        setError(
          requestError?.response?.data?.error?.message ??
            requestError?.message ??
            "Could not load transactions.",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [role, service, status]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return rows;
    return rows.filter((row) =>
      [
        row.id,
        row.retailer,
        row.distributor,
        row.service,
        row.operator,
        row.status,
        row.billNumber,
        row.consumerNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, search]);

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(11,92,255,.18),transparent_28rem),radial-gradient(circle_at_86%_16%,rgba(255,138,0,.12),transparent_26rem),radial-gradient(circle_at_50%_100%,rgba(34,197,94,.08),transparent_32rem)]" />
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/admin">
          <Button variant="secondary">
            <ArrowLeft size={16} /> Admin Dashboard
          </Button>
        </Link>
        <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
              Transaction control
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{title}</h1>
          </div>
          <Input
            className="md:w-96"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transaction, retailer, operator"
          />
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <ReceiptText className="mb-3 text-blue-300" />
            <p className="text-2xl font-black">{summary.count}</p>
            <p className="text-sm text-slate-400">Transactions</p>
          </Card>
          <Card>
            <p className="text-2xl font-black">
              {formatCurrency(summary.totalAmount)}
            </p>
            <p className="text-sm text-slate-400">Total amount</p>
          </Card>
          <Card>
            <p className="text-2xl font-black">
              {formatCurrency(summary.totalCommission)}
            </p>
            <p className="text-sm text-slate-400">Total commission</p>
          </Card>
        </section>

        {error && (
          <Card className="mt-5 border-red-400/20 bg-red-500/10 text-red-100">
            {error}
          </Card>
        )}
        {loading && (
          <Card className="mt-5 border-blue-300/15 bg-white/[0.055]">
            Loading transaction details...
          </Card>
        )}

        {!loading && !error && (
          <Card className="mt-5 overflow-hidden border-blue-300/15 bg-white/[0.055]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    {[
                      "Transaction",
                      "Retailer",
                      "Distributor",
                      "Service",
                      "Operator",
                      "Consumer",
                      "Amount",
                      "Commission",
                      "Status",
                      "Time",
                    ].map((header) => (
                      <th key={header} className="px-4 py-3 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="px-4 py-3 font-semibold">{row.id}</td>
                      <td className="px-4 py-3">{row.retailer}</td>
                      <td className="px-4 py-3">{row.distributor || "-"}</td>
                      <td className="px-4 py-3">{row.service}</td>
                      <td className="px-4 py-3">{row.operator}</td>
                      <td className="px-4 py-3">
                        {row.consumerNumber || row.billNumber || "-"}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(
                          row.retailerCommission + row.distributorCommission,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.status} / {row.settlementStatus ?? "-"}
                      </td>
                      <td className="px-4 py-3">{row.time}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={10}>
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
