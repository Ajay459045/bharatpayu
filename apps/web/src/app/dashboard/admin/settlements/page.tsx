"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, PauseCircle, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function AdminSettlementsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [approvalInputs, setApprovalInputs] = useState<
    Record<string, { bbpsReferenceId: string; notes: string }>
  >({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/settlements");
      setRequests(data.requests ?? []);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.error?.message ??
          requestError?.message ??
          "Could not load settlements.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function action(id: string, type: "approve" | "reject" | "hold") {
    const input = approvalInputs[id] ?? { bbpsReferenceId: "", notes: "" };
    if (type === "approve" && !input.bbpsReferenceId.trim()) {
      setError(
        "Enter provider transaction ID / BBPS reference ID before approval.",
      );
      return;
    }
    const payload =
      type === "approve"
        ? { bbpsReferenceId: input.bbpsReferenceId.trim(), notes: input.notes }
        : type === "reject"
          ? { rejectionReason: input.notes }
          : { notes: input.notes };
    try {
      setError("");
      await api.patch(`/admin/settlements/${id}/${type}`, payload);
      setApprovalInputs((current) => ({
        ...current,
        [id]: { bbpsReferenceId: "", notes: "" },
      }));
      await load();
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.error?.message ??
          requestError?.message ??
          "Settlement action failed.",
      );
    }
  }

  function exportCsv() {
    const keys = [
      "transactionId",
      "customerName",
      "consumerNumber",
      "operator",
      "serviceCategory",
      "amount",
      "walletStatus",
      "status",
    ];
    const csv = [
      keys.join(","),
      ...requests.map((row) =>
        keys.map((key) => JSON.stringify(row[key] ?? "")).join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "settlements.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
              Manual BBPS settlement
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Pending settlement requests
            </h1>
          </div>
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={16} /> Export Reports
          </Button>
        </div>
        {loading && <Card>Loading settlements...</Card>}
        {error && (
          <Card className="border-red-400/20 bg-red-500/10 text-red-100">
            {error}
          </Card>
        )}
        <div className="grid gap-5">
          {requests.map((request) => (
            <Card
              key={request._id}
              className="grid gap-5 xl:grid-cols-[1fr_0.9fr]"
            >
              <section>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-sm text-amber-100">
                    {request.status}
                  </span>
                  <span className="rounded-full bg-blue-400/15 px-3 py-1 text-sm text-blue-100">
                    {request.walletStatus}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold">
                  {request.transactionId}
                </h2>
                <p className="text-slate-300">
                  {request.retailerId?.name} |{" "}
                  {request.retailerId?.retailerCode}
                </p>
                <div className="mt-5 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                  <p>Customer: {request.customerName}</p>
                  <p>Consumer: {request.consumerNumber}</p>
                  <p>Operator: {request.operator}</p>
                  <p>Service: {request.serviceCategory}</p>
                  <p>
                    Amount:{" "}
                    <b className="text-white">
                      {formatCurrency(Number(request.amount))}
                    </b>
                  </p>
                  <p>
                    Time:{" "}
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleString("en-IN")
                      : "-"}
                  </p>
                  {request.bbpsReferenceId && (
                    <p>BBPS Ref: {request.bbpsReferenceId}</p>
                  )}
                  {request.notes && <p>Notes: {request.notes}</p>}
                </div>
              </section>
              <section className="grid gap-3">
                <Input
                  placeholder="Provider transaction ID / BBPS reference ID"
                  value={approvalInputs[request._id]?.bbpsReferenceId ?? ""}
                  onChange={(event) =>
                    setApprovalInputs((current) => ({
                      ...current,
                      [request._id]: {
                        bbpsReferenceId: event.target.value,
                        notes: current[request._id]?.notes ?? "",
                      },
                    }))
                  }
                />
                <Input
                  placeholder="Notes / rejection reason"
                  value={approvalInputs[request._id]?.notes ?? ""}
                  onChange={(event) =>
                    setApprovalInputs((current) => ({
                      ...current,
                      [request._id]: {
                        bbpsReferenceId:
                          current[request._id]?.bbpsReferenceId ?? "",
                        notes: event.target.value,
                      },
                    }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={request.status === "final_success"}
                    onClick={() => action(request._id, "approve")}
                  >
                    <CheckCircle2 size={16} /> Approve
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={request.status === "final_success"}
                    onClick={() => action(request._id, "hold")}
                  >
                    <PauseCircle size={16} /> Hold
                  </Button>
                  <Button
                    variant="danger"
                    disabled={
                      request.status === "final_success" ||
                      request.status === "rejected"
                    }
                    onClick={() => action(request._id, "reject")}
                  >
                    <ShieldX size={16} /> Reject & Refund
                  </Button>
                </div>
              </section>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
