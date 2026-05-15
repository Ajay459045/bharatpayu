"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileImage,
  KeyRound,
  MapPin,
  ShieldCheck,
  UserX,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const serviceOptions = ["electricity", "water", "lpg", "gas", "insurance"];

export function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users ?? []);
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message ?? error?.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
          Admin control
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">
          Users & retailer network
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Distributor-created retailers, direct retailers, and distributors are
          visible here with admin action access.
        </p>
        {status && <Card className="mt-5">{status}</Card>}
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                {[
                  "Name",
                  "Business",
                  "Role",
                  "Mobile",
                  "Status",
                  "KYC",
                  "Created By",
                  "Actions",
                ].map((heading) => (
                  <th className="p-3 font-semibold" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-t border-white/10" key={user._id}>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.businessName}</td>
                  <td className="p-3 capitalize">{user.role}</td>
                  <td className="p-3">{user.mobile}</td>
                  <td className="p-3">{user.approvalStatus}</td>
                  <td className="p-3">{user.kycStatus}</td>
                  <td className="p-3 capitalize">{user.createdBy ?? "self"}</td>
                  <td className="p-3">
                    <Link href={`/dashboard/admin/users/${user._id}`}>
                      <Button variant="secondary">
                        Open <ArrowRight size={15} />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="p-6 text-sm text-slate-400">No users found.</p>
          )}
        </Card>
      </div>
    </main>
  );
}

export function AdminUserDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [password, setPassword] = useState("");
  const [walletForm, setWalletForm] = useState({
    direction: "credit",
    walletType: "main",
    amount: "",
    reason: "Admin adjustment",
  });

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const response = await api.get(`/admin/users/${id}`);
    setData(response.data);
  }

  async function updateStatus(next: string) {
    await api.patch(`/admin/users/${id}/status`, { status: next });
    setStatus(`User ${next}.`);
    await load();
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch(`/admin/users/${id}/password`, { password });
    setPassword("");
    setStatus("Password reset.");
  }

  async function walletAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch("/admin/wallet-adjustments", {
      userId: id,
      walletType: walletForm.walletType,
      direction: walletForm.direction,
      amount: Number(walletForm.amount),
      reason: walletForm.reason,
    });
    setWalletForm({ ...walletForm, amount: "" });
    setStatus("Wallet adjusted.");
    await load();
  }

  async function toggleService(key: string, enabled: boolean) {
    const current = data?.user?.serviceAccess ?? {};
    await api.patch(`/admin/users/${id}/services`, {
      services: { ...current, [key]: enabled },
    });
    await load();
  }

  const user = data?.user;
  const mainWallet = data?.wallets?.find(
    (wallet: any) => wallet.type === "main",
  );
  const commissionWallet = data?.wallets?.find(
    (wallet: any) => wallet.type === "commission",
  );
  const documents = user?.kyc?.documents ?? {};
  const location = user?.kyc?.location ?? {};

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/admin/users">
          <Button variant="secondary">All Users</Button>
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
              Admin full access
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              {user?.name ?? "User"}
            </h1>
            <p className="mt-2 text-slate-300">{user?.businessName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => updateStatus("active")}>
              <CheckCircle2 size={16} /> Activate
            </Button>
            <Button variant="danger" onClick={() => updateStatus("suspended")}>
              <UserX size={16} /> Suspend
            </Button>
            <Button
              variant="secondary"
              onClick={() => updateStatus("documents_requested")}
            >
              Request Documents
            </Button>
          </div>
        </div>

        {status && <Card className="mt-5">{status}</Card>}

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <h2 className="text-xl font-bold">Personal & business</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <p>Role: {user?.role}</p>
              <p>Mobile: {user?.mobile}</p>
              <p>Email: {user?.email}</p>
              <p>Status: {user?.approvalStatus}</p>
              <p>KYC: {user?.kycStatus}</p>
              <p>Created by: {user?.createdBy ?? "self"}</p>
              <p>Distributor: {user?.distributorId?.businessName ?? "-"}</p>
              <p>Address: {user?.address?.fullAddress}</p>
              <p>
                {user?.address?.district}, {user?.address?.state}{" "}
                {user?.address?.pincode}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Wallet & admin actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="rounded-md bg-white/5 p-3">
                Main: {formatCurrency(Number(mainWallet?.balance ?? 0))}
              </p>
              <p className="rounded-md bg-white/5 p-3">
                Commission:{" "}
                {formatCurrency(Number(commissionWallet?.balance ?? 0))}
              </p>
            </div>
            <form
              className="mt-4 grid gap-3 md:grid-cols-5"
              onSubmit={walletAdjust}
            >
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={walletForm.direction}
                onChange={(event) =>
                  setWalletForm({
                    ...walletForm,
                    direction: event.target.value,
                  })
                }
              >
                <option className="bg-slate-950" value="credit">
                  Credit
                </option>
                <option className="bg-slate-950" value="debit">
                  Debit
                </option>
              </select>
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={walletForm.walletType}
                onChange={(event) =>
                  setWalletForm({
                    ...walletForm,
                    walletType: event.target.value,
                  })
                }
              >
                <option className="bg-slate-950" value="main">
                  Main
                </option>
                <option className="bg-slate-950" value="commission">
                  Commission
                </option>
              </select>
              <Input
                type="number"
                value={walletForm.amount}
                onChange={(event) =>
                  setWalletForm({ ...walletForm, amount: event.target.value })
                }
                placeholder="Amount"
              />
              <Input
                value={walletForm.reason}
                onChange={(event) =>
                  setWalletForm({ ...walletForm, reason: event.target.value })
                }
                placeholder="Reason"
              />
              <Button>
                <WalletCards size={16} /> Adjust
              </Button>
            </form>
            <form className="mt-4 flex gap-2" onSubmit={resetPassword}>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
              />
              <Button variant="secondary">
                <KeyRound size={16} /> Reset
              </Button>
            </form>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FileImage size={18} /> KYC documents
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries({
                panImage: "PAN image",
                aadhaarFront: "Aadhaar front",
                aadhaarBack: "Aadhaar back",
                selfie: "Selfie",
              }).map(([key, label]) => (
                <div
                  className="rounded-md border border-white/10 bg-white/5 p-3"
                  key={key}
                >
                  <p className="mb-2 text-sm font-semibold">{label}</p>
                  {documents[key] ? (
                    <img
                      alt={`${label} preview`}
                      className="h-40 w-full rounded-md object-cover"
                      src={documents[key]}
                    />
                  ) : (
                    <div className="grid h-40 place-items-center rounded-md bg-white/5 text-sm text-slate-400">
                      No preview
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <MapPin size={18} /> Location, device & services
            </h2>
            <div className="mt-4 rounded-md bg-white/5 p-3 text-sm text-slate-300">
              <p>
                Lat/Lng: {location.latitude ?? "-"}, {location.longitude ?? "-"}
              </p>
              <p>IP: {location.ipAddress ?? "-"}</p>
              <p className="mt-2 break-words">
                Device: {JSON.stringify(location.deviceInfo ?? {})}
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {serviceOptions.map((service) => {
                const enabled = user?.serviceAccess?.[service] !== false;
                return (
                  <button
                    className={`rounded-md border p-3 text-left text-sm capitalize ${
                      enabled
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-100"
                    }`}
                    key={service}
                    onClick={() => toggleService(service, !enabled)}
                    type="button"
                  >
                    <ShieldCheck className="mb-2" size={16} />
                    {service}: {enabled ? "Enabled" : "Disabled"}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="text-xl font-bold">Transactions</h2>
            <div className="mt-4 grid gap-2">
              {(data?.transactions ?? []).slice(0, 8).map((txn: any) => (
                <p className="rounded-md bg-white/5 p-3 text-sm" key={txn._id}>
                  {txn.transactionId} - {txn.serviceCategory} -{" "}
                  {formatCurrency(Number(txn.amount ?? 0))} - {txn.status}
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold">Ledger & audit logs</h2>
            <div className="mt-4 grid gap-2">
              {(data?.ledgers ?? []).slice(0, 5).map((ledger: any) => (
                <p
                  className="rounded-md bg-white/5 p-3 text-sm"
                  key={ledger._id}
                >
                  {ledger.transactionId}: +{ledger.credit} / -{ledger.debit} =
                  {ledger.closingBalance}
                </p>
              ))}
              {(data?.activities ?? []).slice(0, 5).map((item: any) => (
                <p className="rounded-md bg-white/5 p-3 text-sm" key={item._id}>
                  {item.action}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
