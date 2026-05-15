"use client";

import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function AdminWalletAdjustmentsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    userId: "",
    walletType: "main",
    direction: "credit",
    amount: "",
    reason: "",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users ?? []);
    } catch (requestError: any) {
      const message =
        requestError?.response?.status === 401
          ? "Admin session expired. Please login again to adjust wallets."
          : (requestError?.response?.data?.error?.message ??
            requestError?.message ??
            "Could not load users.");
      setError(Array.isArray(message) ? message.join(", ") : message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      const { data } = await api.patch("/admin/wallet-adjustments", {
        ...form,
        amount: Number(form.amount),
      });
      setStatus(`Wallet updated. Reference ${data.referenceId}`);
      setForm({ ...form, amount: "", reason: "" });
    } catch (requestError: any) {
      const message =
        requestError?.response?.status === 401
          ? "Admin session expired. Please login again before submitting."
          : (requestError?.response?.data?.error?.message ??
            requestError?.message ??
            "Could not adjust wallet.");
      setError(Array.isArray(message) ? message.join(", ") : message);
    }
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
          Admin wallet control
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">
          Add or deduct wallet balance
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
        <Card className="mt-6">
          <WalletCards className="mb-4 text-blue-300" />
          <form className="grid gap-4" onSubmit={submit}>
            <select
              className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
              value={form.userId}
              onChange={(event) =>
                setForm({ ...form, userId: event.target.value })
              }
              required
            >
              <option className="bg-slate-950" value="">
                {loading
                  ? "Loading retailers and distributors..."
                  : "Select retailer or distributor"}
              </option>
              {users.map((user) => (
                <option
                  className="bg-slate-950"
                  key={user._id}
                  value={user._id}
                >
                  {user.role} - {user.retailerCode ?? ""} {user.name}
                </option>
              ))}
            </select>
            {!loading && !error && users.length === 0 && (
              <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-100">
                No retailer or distributor accounts found yet.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={form.walletType}
                onChange={(event) =>
                  setForm({ ...form, walletType: event.target.value })
                }
              >
                <option className="bg-slate-950" value="main">
                  Main wallet
                </option>
                <option className="bg-slate-950" value="commission">
                  Commission wallet
                </option>
              </select>
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={form.direction}
                onChange={(event) =>
                  setForm({ ...form, direction: event.target.value })
                }
              >
                <option className="bg-slate-950" value="credit">
                  Add amount
                </option>
                <option className="bg-slate-950" value="debit">
                  Deduct amount
                </option>
              </select>
            </div>
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
              placeholder="Amount"
              required
            />
            <Input
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
              placeholder="Reason"
              required
            />
            <Button>Submit Wallet Adjustment</Button>
          </form>
          {status && (
            <p className="mt-4 rounded-md bg-white/5 p-3 text-sm text-slate-300">
              {status}
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
