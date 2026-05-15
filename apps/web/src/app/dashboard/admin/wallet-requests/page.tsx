"use client";

import { useEffect, useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  FileImage,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type WalletLoadRequest = {
  _id: string;
  amount: number;
  utrNumber: string;
  screenshot: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  creditedTransactionId?: string;
  createdAt?: string;
  userId?: {
    name?: string;
    businessName?: string;
    mobile?: string;
    email?: string;
    retailerCode?: string;
  };
};

export default function AdminWalletRequestsPage() {
  const [requests, setRequests] = useState<WalletLoadRequest[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/wallet-load-requests");
      setRequests(data.requests ?? []);
    } catch (requestError: any) {
      const message =
        requestError?.response?.data?.error?.message ??
        requestError?.message ??
        "Could not load wallet requests.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }

  async function action(id: string, status: "approved" | "rejected") {
    await api.patch(`/admin/wallet-load-requests/${id}`, {
      status,
      adminNote: note,
    });
    await loadRequests();
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
              Admin wallet control
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Wallet load requests
            </h1>
          </div>
          <Button variant="secondary" onClick={loadRequests}>
            Refresh Requests
          </Button>
        </div>
        {loading && <Card>Loading wallet requests...</Card>}
        {error && (
          <Card className="border-red-400/20 bg-red-500/10 text-red-100">
            {error}
          </Card>
        )}
        {!loading && !error && requests.length === 0 && (
          <Card>No wallet load requests yet.</Card>
        )}
        <div className="grid gap-5">
          {requests.map((request) => (
            <Card
              key={request._id}
              className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"
            >
              <section>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-400/15 px-3 py-1 text-sm text-blue-100">
                    {request.userId?.retailerCode ?? "Retailer"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${request.status === "approved" ? "bg-green-400/15 text-green-100" : request.status === "pending" ? "bg-yellow-400/15 text-yellow-100" : "bg-red-400/15 text-red-100"}`}
                  >
                    {request.status}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold">
                  {request.userId?.name ?? "Retailer"}
                </h2>
                <p className="text-slate-300">{request.userId?.businessName}</p>
                <div className="mt-5 grid gap-2 text-sm text-slate-300">
                  <p>Mobile: {request.userId?.mobile}</p>
                  <p>Email: {request.userId?.email}</p>
                  <p>
                    Amount:{" "}
                    <b className="text-white">
                      {formatCurrency(Number(request.amount))}
                    </b>
                  </p>
                  <p>
                    UTR: <b className="text-white">{request.utrNumber}</b>
                  </p>
                  <p>
                    Submitted:{" "}
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleString("en-IN")
                      : "-"}
                  </p>
                  {request.creditedTransactionId && (
                    <p>Wallet Txn: {request.creditedTransactionId}</p>
                  )}
                  {request.adminNote && <p>Admin note: {request.adminNote}</p>}
                </div>
              </section>
              <section>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <FileImage size={15} /> Payment screenshot
                  </p>
                  {request.screenshot ? (
                    <img
                      src={request.screenshot}
                      alt="Payment screenshot"
                      className="max-h-[420px] w-full rounded-md object-contain"
                    />
                  ) : (
                    <div className="grid h-48 place-items-center rounded-md bg-white/5 text-sm text-slate-400">
                      No screenshot
                    </div>
                  )}
                </div>
                {request.status === "pending" && (
                  <div className="mt-5 grid gap-3">
                    <Input
                      placeholder="Approval or rejection note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => action(request._id, "approved")}>
                        <CheckCircle2 size={16} /> Approve & Credit Wallet
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => action(request._id, "rejected")}
                      >
                        <ShieldX size={16} /> Reject
                      </Button>
                    </div>
                  </div>
                )}
                {request.status === "approved" && (
                  <p className="mt-4 rounded-md border border-green-400/20 bg-green-500/10 p-3 text-sm text-green-50">
                    <BadgeIndianRupee className="mr-2 inline" size={16} />{" "}
                    Wallet credited.
                  </p>
                )}
              </section>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
