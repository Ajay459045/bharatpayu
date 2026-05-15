"use client";

import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  BadgeIndianRupee,
  Bell,
  CheckCircle2,
  Download,
  FileImage,
  FileSpreadsheet,
  History,
  LockKeyhole,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  WalletCards,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const serviceNames: Record<string, string> = {
  electricity: "Electricity Bill Payment",
  water: "Water Bill Payment",
  insurance: "Insurance Premium Payment",
  gas: "Piped Gas Bill Payment",
  lpg: "LPG Gas Payment",
};

const serviceIcons: Record<string, string> = {
  electricity: "Power distribution",
  water: "Municipal utility",
  lpg: "Cylinder booking",
  gas: "Piped gas network",
  insurance: "Premium collection",
};

const fetchSchema = z.object({
  operator: z.string().min(2, "Select operator"),
  consumerNumber: z.string().min(4, "Enter consumer number"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter valid mobile number"),
});

function statusClass(status: string) {
  if (
    status === "success" ||
    status === "approved" ||
    status === "verified" ||
    status === "sent"
  )
    return "border-green-400/20 bg-green-500/15 text-green-200";
  if (status === "pending" || status === "submitted" || status === "queued")
    return "border-amber-400/20 bg-amber-500/15 text-amber-200";
  return "border-red-400/20 bg-red-500/15 text-red-200";
}

function PageShell({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(11,92,255,.18),transparent_28rem),radial-gradient(circle_at_88%_18%,rgba(255,138,0,.12),transparent_28rem)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <BrandLogo />
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/retailer">
              <Button variant="secondary">Dashboard</Button>
            </Link>
            {actions}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="grid place-items-center py-12 text-center">
      <ReceiptText className="mb-3 text-slate-400" size={28} />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-slate-400">{body}</p>
    </Card>
  );
}

function downloadCsv(filename: string, rows: Array<Record<string, any>>) {
  const keys = Object.keys(rows[0] ?? { status: "", message: "No records" });
  const csv = [
    keys.join(","),
    ...rows.map((row) =>
      keys.map((key) => JSON.stringify(row[key] ?? "")).join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function RetailerServicePage({ service }: { service: string }) {
  const [bill, setBill] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["retailer-services"],
    queryFn: async () => (await api.get("/retailer/services")).data,
  });
  const selected = data?.services?.find((item: any) => item.key === service);
  const form = useForm<z.infer<typeof fetchSchema>>({
    resolver: zodResolver(fetchSchema),
    defaultValues: {
      operator: selected?.operators?.[0] ?? "",
      consumerNumber: "",
      mobile: "",
    },
  });
  const operators = selected?.operators ?? [];

  async function fetchBill(values: z.infer<typeof fetchSchema>) {
    setBusy(true);
    setStatus("Fetching bill from BBPS...");
    setPayment(null);
    try {
      const { data: fetched } = await api.post("/bbps/fetch-bill", {
        serviceCategory: service,
        ...values,
      });
      setBill({
        ...fetched,
        mobile: values.mobile,
        consumerNumber: values.consumerNumber,
        billAmount: Number(fetched.billAmount ?? fetched.amount ?? 0),
      });
      setStatus(
        "Bill fetched successfully. Verify details before wallet payment.",
      );
    } catch (error: any) {
      setBill(null);
      setStatus(
        error?.response?.data?.error?.message ??
          error?.message ??
          "Bill fetch failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function payBill() {
    if (!bill) return;
    setBusy(true);
    setStatus("Creating transaction lock and debiting wallet...");
    try {
      const idempotencyKey = crypto.randomUUID();
      const { data: paid } = await api.post("/bbps/pay", {
        billNumber: bill.billNumber,
        serviceCategory: service,
        operator: bill.operator,
        consumerNumber: bill.consumerNumber,
        mobile: bill.mobile,
        amount: Number(bill.billAmount),
        customerName: bill.customerName,
        idempotencyKey,
      });
      setPayment(paid);
      setStatus(`Payment ${paid.status}. Transaction ${paid.transactionId}`);
    } catch (error: any) {
      setStatus(
        error?.response?.data?.error?.message ??
          error?.message ??
          "Wallet payment failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title={serviceNames[service] ?? "BBPS Service"}
      eyebrow="BBPS payment flow"
    >
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <Zap className="mb-4 text-blue-300" />
          <h2 className="text-2xl font-bold">{serviceNames[service]}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {serviceIcons[service]} payment with bill fetch, wallet debit,
            commission credit, TDS and receipt generation.
          </p>
          <form
            className="mt-6 grid gap-4"
            onSubmit={form.handleSubmit(fetchBill)}
          >
            <label className="grid gap-2 text-sm text-slate-300">
              Operator
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm text-white outline-none"
                {...form.register("operator")}
              >
                {operators.map((operator: string) => (
                  <option
                    className="bg-slate-950"
                    key={operator}
                    value={operator}
                  >
                    {operator}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Consumer Number
              <Input
                {...form.register("consumerNumber")}
                placeholder="Enter consumer / CA number"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Customer Mobile
              <Input
                {...form.register("mobile")}
                placeholder="10 digit mobile number"
              />
            </label>
            <Button disabled={busy} type="submit">
              {busy ? "Processing..." : "Fetch Bill"}
            </Button>
          </form>
          {status && (
            <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {status}
            </p>
          )}
        </Card>
        <Card>
          <h2 className="text-2xl font-bold">Bill confirmation</h2>
          {!bill && (
            <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
              Fetched bill details will appear here before payment.
            </p>
          )}
          {bill && (
            <div className="mt-5 rounded-lg border border-blue-300/20 bg-blue-500/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-blue-100">Customer</p>
                  <h3 className="text-2xl font-black">{bill.customerName}</h3>
                </div>
                <span className="rounded-full border border-green-400/20 bg-green-500/15 px-3 py-1 text-sm text-green-200">
                  Fetched
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <p className="rounded-md bg-white/5 p-3 text-sm">
                  Amount
                  <br />
                  <b className="text-xl">
                    {formatCurrency(Number(bill.billAmount))}
                  </b>
                </p>
                <p className="rounded-md bg-white/5 p-3 text-sm">
                  Due Date
                  <br />
                  <b>{new Date(bill.dueDate).toLocaleDateString("en-IN")}</b>
                </p>
                <p className="rounded-md bg-white/5 p-3 text-sm">
                  Bill Number
                  <br />
                  <b>{bill.billNumber}</b>
                </p>
                <p className="rounded-md bg-white/5 p-3 text-sm">
                  Operator
                  <br />
                  <b>{bill.operator}</b>
                </p>
              </div>
              <Button
                className="mt-5 w-full"
                disabled={busy || Boolean(payment)}
                onClick={payBill}
              >
                Pay via BharatPayU Wallet
              </Button>
            </div>
          )}
          {payment && (
            <div className="mt-5 rounded-lg border border-green-400/20 bg-green-500/10 p-5">
              <CheckCircle2 className="mb-3 text-green-300" />
              <h3 className="text-xl font-bold">Receipt generated</h3>
              <p className="mt-2 text-sm text-green-50">
                Transaction ID: {payment.transactionId}
              </p>
              <p className="text-sm text-green-50">Status: {payment.status}</p>
              <Link
                href={`/dashboard/retailer/transactions/${payment.transactionId}`}
              >
                <Button className="mt-4" variant="secondary">
                  View Transaction Details
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function RetailerWalletPage() {
  const { data, refetch } = useQuery({
    queryKey: ["retailer-wallet"],
    queryFn: async () => (await api.get("/retailer/wallet")).data,
  });
  const [amount, setAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const history = data?.history ?? [];
  const ledger = data?.ledger ?? [];
  const loadRequests = data?.loadRequests ?? [];
  const bank = data?.bankDetails ?? {
    bankName: "AXIS BANK",
    accountName: "PAYORAMA BILLPAYSHOP PRIVATE LIMITED",
    accountNumber: "920020056409544",
    ifsc: "UTIB0000686",
  };

  async function uploadScreenshot(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function submitLoadRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      await api.post("/retailer/wallet/load-requests", {
        amount: Number(amount),
        utrNumber,
        screenshot,
      });
      setAmount("");
      setUtrNumber("");
      setScreenshot("");
      setStatus("Wallet load request sent to admin for approval.");
      await refetch();
    } catch (error: any) {
      setStatus(
        error?.response?.data?.error?.message ??
          error?.message ??
          "Could not submit wallet load request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Wallet & Ledger"
      eyebrow="Retailer wallet system"
      actions={
        <Button onClick={() => downloadCsv("wallet-history.csv", history)}>
          <Download size={16} /> Export CSV
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <WalletCards className="mb-4 text-blue-300" />
          <p className="text-sm text-slate-400">Main Wallet</p>
          <h2 className="text-4xl font-black">
            {formatCurrency(data?.wallets?.main ?? 0)}
          </h2>
        </Card>
        <Card>
          <BadgeIndianRupee className="mb-4 text-green-300" />
          <p className="text-sm text-slate-400">Commission Wallet</p>
          <h2 className="text-4xl font-black">
            {formatCurrency(data?.wallets?.commission ?? 0)}
          </h2>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <WalletCards className="mb-4 text-blue-300" />
          <h2 className="text-2xl font-bold">Load wallet</h2>
          <div className="mt-5 rounded-md border border-green-400/20 bg-green-500/10 p-4 text-sm text-green-50">
            <p className="font-bold">{bank.bankName}</p>
            <p className="mt-2">{bank.accountName}</p>
            <p>
              Account: <b>{bank.accountNumber}</b>
            </p>
            <p>
              IFSC: <b>{bank.ifsc}</b>
            </p>
          </div>
          <form className="mt-5 grid gap-4" onSubmit={submitLoadRequest}>
            <label className="grid gap-2 text-sm text-slate-300">
              Amount
              <Input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount paid"
                required
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              UTR Number
              <Input
                value={utrNumber}
                onChange={(event) =>
                  setUtrNumber(event.target.value.toUpperCase())
                }
                placeholder="Enter bank UTR / reference number"
                required
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Payment Screenshot
              <Input
                type="file"
                accept="image/*"
                onChange={uploadScreenshot}
                required={!screenshot}
              />
            </label>
            {screenshot && (
              <img
                src={screenshot}
                alt="Payment screenshot preview"
                className="h-44 w-full rounded-md border border-white/10 object-cover"
              />
            )}
            <Button disabled={submitting} type="submit">
              {submitting ? "Submitting..." : "Send Load Request"}
            </Button>
          </form>
          {status && (
            <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {status}
            </p>
          )}
        </Card>
        <RecordsTable
          title="Wallet load requests"
          rows={loadRequests}
          columns={[
            "amount",
            "utrNumber",
            "status",
            "adminNote",
            "creditedTransactionId",
          ]}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <RecordsTable
          title="Wallet history"
          rows={history}
          columns={[
            "direction",
            "amount",
            "openingBalance",
            "closingBalance",
            "reason",
            "referenceId",
          ]}
        />
        <RecordsTable
          title="Ledger accounting"
          rows={ledger}
          columns={[
            "transactionId",
            "openingBalance",
            "debit",
            "credit",
            "commission",
            "tds",
            "closingBalance",
          ]}
        />
      </div>
    </PageShell>
  );
}

export function RetailerTransactionsPage() {
  const { data } = useQuery({
    queryKey: ["retailer-transactions"],
    queryFn: async () => (await api.get("/retailer/transactions")).data,
  });
  const rows = data?.transactions ?? [];
  return (
    <PageShell
      title="Transaction Management"
      eyebrow="BBPS monitoring"
      actions={
        <Button onClick={() => downloadCsv("transactions.csv", rows)}>
          <Download size={16} /> Export CSV
        </Button>
      }
    >
      {rows.length ? (
        <RecordsTable
          title="All transactions"
          rows={rows}
          columns={[
            "transactionId",
            "serviceCategory",
            "operator",
            "consumerNumber",
            "amount",
            "status",
            "retailerCommission",
            "tdsAmount",
          ]}
          linkPrefix="/dashboard/retailer/transactions"
        />
      ) : (
        <EmptyState
          title="No transactions yet"
          body="Fetched and paid BBPS transactions will appear here with filters, exports and receipts."
        />
      )}
    </PageShell>
  );
}

export function RetailerTransactionDetailPage({
  transactionId,
}: {
  transactionId: string;
}) {
  const { data } = useQuery({
    queryKey: ["retailer-transaction", transactionId],
    queryFn: async () =>
      (await api.get(`/retailer/transactions/${transactionId}`)).data,
  });
  const txn = data?.transaction;
  return (
    <PageShell title="Transaction Details" eyebrow={transactionId}>
      {!txn && (
        <EmptyState
          title="Transaction not found"
          body="This transaction is not available for the logged-in retailer."
        />
      )}
      {txn && (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <ReceiptText className="mb-4 text-blue-300" />
            <h2 className="text-2xl font-bold">Premium receipt</h2>
            <div className="mt-5 grid gap-3 text-sm">
              {[
                "transactionId",
                "customerName",
                "serviceCategory",
                "operator",
                "consumerNumber",
                "billNumber",
                "amount",
                "status",
              ].map((key) => (
                <p
                  key={key}
                  className="flex justify-between gap-4 rounded-md bg-white/5 p-3"
                >
                  <span className="capitalize text-slate-400">{key}</span>
                  <b>
                    {key === "amount"
                      ? formatCurrency(Number(txn[key] ?? 0))
                      : String(txn[key] ?? "-")}
                  </b>
                </p>
              ))}
            </div>
            <Button className="mt-5" onClick={() => window.print()}>
              <Download size={16} /> Print Receipt
            </Button>
          </Card>
          <div className="grid gap-5">
            <RecordsTable
              title="Ledger entries"
              rows={data?.ledgers ?? []}
              columns={[
                "transactionId",
                "debit",
                "credit",
                "commission",
                "tds",
                "closingBalance",
              ]}
            />
            <RecordsTable
              title="TDS reports"
              rows={data?.tds ?? []}
              columns={[
                "transactionId",
                "grossCommission",
                "tdsAmount",
                "netCommission",
              ]}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}

export function RetailerReportsPage() {
  const { data } = useQuery({
    queryKey: ["retailer-reports"],
    queryFn: async () => (await api.get("/retailer/reports")).data,
  });
  const txns = data?.transactions ?? [];
  const wallet = data?.walletHistory ?? [];
  const tds = data?.tdsReports ?? [];
  return (
    <PageShell title="Reports Center" eyebrow="Excel CSV PDF ready exports">
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Transaction Report", txns],
          ["Wallet Report", wallet],
          ["TDS Report", tds],
        ].map(([title, rows]: any) => (
          <Card key={title}>
            <FileSpreadsheet className="mb-4 text-blue-300" />
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {rows.length} records available.
            </p>
            <Button
              className="mt-5"
              onClick={() =>
                downloadCsv(
                  `${String(title).toLowerCase().replaceAll(" ", "-")}.csv`,
                  rows,
                )
              }
            >
              <Download size={16} /> Download CSV
            </Button>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function RetailerNotificationsPage() {
  const { data } = useQuery({
    queryKey: ["retailer-notifications"],
    queryFn: async () => (await api.get("/retailer/notifications")).data,
  });
  const rows = data?.notifications ?? [];
  return (
    <PageShell title="Notification Center" eyebrow="Wallet BBPS KYC alerts">
      <div className="grid gap-3">
        {rows.length === 0 && (
          <EmptyState
            title="No notifications yet"
            body="Transaction, wallet, KYC and security notifications will appear here."
          />
        )}
        {rows.map((item: any) => (
          <Card key={item._id} className="flex items-start gap-3">
            <Bell className="mt-1 text-blue-300" />
            <div>
              <p className="font-semibold">{item.event}</p>
              <p className="mt-1 text-sm text-slate-400">
                {JSON.stringify(item.payload ?? {})}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(item.status)}`}
              >
                {item.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function RetailerProfilePage() {
  const { data } = useQuery({
    queryKey: ["retailer-profile"],
    queryFn: async () => (await api.get("/retailer/profile")).data,
  });
  const user = data?.user;
  const documents = data?.documents ?? {};
  return (
    <PageShell title="Profile & KYC" eyebrow="Retailer verification">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <ShieldCheck className="mb-4 text-green-300" />
          <h2 className="text-2xl font-bold">{user?.name ?? "Retailer"}</h2>
          <p className="text-slate-300">{user?.businessName}</p>
          <div className="mt-5 grid gap-2 text-sm text-slate-300">
            <p>Email: {user?.email}</p>
            <p>Mobile: {user?.mobile}</p>
            <p>State: {user?.address?.state}</p>
            <p>District: {user?.address?.district}</p>
            <p>Address: {user?.address?.fullAddress}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-sm ${statusClass(user?.approvalStatus ?? "pending")}`}
            >
              {user?.approvalStatus}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-sm ${statusClass(user?.kycStatus ?? "submitted")}`}
            >
              {user?.kycStatus}
            </span>
          </div>
          {data?.location && (
            <p className="mt-5 text-sm text-slate-400">
              <MapPin className="mr-2 inline" size={15} />{" "}
              {data.location.latitude}, {data.location.longitude} | IP{" "}
              {data.location.ipAddress}
            </p>
          )}
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries({
            panImage: "PAN image",
            aadhaarFront: "Aadhaar front",
            aadhaarBack: "Aadhaar back",
            selfie: "Selfie",
          }).map(([key, label]) => (
            <Card key={key}>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <FileImage size={15} /> {label}
              </p>
              {documents[key] ? (
                <img
                  src={documents[key]}
                  alt={label}
                  className="h-44 w-full rounded-md object-cover"
                />
              ) : (
                <div className="grid h-44 place-items-center rounded-md bg-white/5 text-sm text-slate-400">
                  Not uploaded
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export function RetailerSecurityPage() {
  const { data } = useQuery({
    queryKey: ["retailer-security"],
    queryFn: async () => (await api.get("/retailer/security")).data,
  });
  return (
    <PageShell title="Security Center" eyebrow="Device IP session logs">
      <div className="grid gap-5 xl:grid-cols-2">
        <RecordsTable
          title="Device history"
          rows={data?.devices ?? []}
          columns={["userAgent", "ip", "timezone", "fingerprint", "trusted"]}
        />
        <RecordsTable
          title="Session activity"
          rows={data?.sessions ?? []}
          columns={["deviceId", "expiresAt", "revokedAt"]}
        />
      </div>
    </PageShell>
  );
}

function RecordsTable({
  title,
  rows,
  columns,
  linkPrefix,
}: {
  title: string;
  rows: any[];
  columns: string[];
  linkPrefix?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );
  return (
    <Card className="overflow-hidden">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-slate-400">{filtered.length} records</p>
        </div>
        <Input
          className="md:w-72"
          placeholder="Search records"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-slate-300">
            <tr>
              {columns.map((column) => (
                <th className="border-b border-white/10 px-3 py-3" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr
                key={row._id ?? row.transactionId ?? index}
                className="hover:bg-white/[0.04]"
              >
                {columns.map((column) => {
                  const value = row[column];
                  const display =
                    typeof value === "number" &&
                    [
                      "amount",
                      "openingBalance",
                      "closingBalance",
                      "debit",
                      "credit",
                      "commission",
                      "tds",
                      "grossCommission",
                      "tdsAmount",
                      "netCommission",
                      "retailerCommission",
                    ].includes(column)
                      ? formatCurrency(value)
                      : String(value ?? "-");
                  const content =
                    column === "status" ? (
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${statusClass(String(value))}`}
                      >
                        {display}
                      </span>
                    ) : (
                      display
                    );
                  return (
                    <td
                      className="border-b border-white/5 px-3 py-3 text-slate-200"
                      key={column}
                    >
                      {linkPrefix && column === "transactionId" ? (
                        <Link
                          className="text-blue-200"
                          href={
                            `${linkPrefix}/${value}` as "/dashboard/retailer/transactions"
                          }
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
          No records found.
        </p>
      )}
    </Card>
  );
}
