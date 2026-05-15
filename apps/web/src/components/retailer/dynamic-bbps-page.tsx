"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Search, WalletCards, Zap } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const serviceCategories: Record<string, { title: string; aliases: string[] }> =
  {
    electricity: {
      title: "Electricity Bill Payment",
      aliases: ["electricity"],
    },
    water: {
      title: "Water Bill Payment",
      aliases: ["water"],
    },
    insurance: {
      title: "Insurance Premium Payment",
      aliases: ["insurance", "life insurance", "health insurance"],
    },
    gas: {
      title: "Piped Gas Bill Payment",
      aliases: ["piped gas", "png"],
    },
    lpg: {
      title: "LPG Gas Payment",
      aliases: ["lpg gas", "lpg"],
    },
  };

export function DynamicBbpsPage({
  initialCategoryKey = "",
  serviceKey = "",
}: {
  initialCategoryKey?: string;
  serviceKey?: string;
}) {
  const [categoryKey, setCategoryKey] = useState(initialCategoryKey);
  const [billerId, setBillerId] = useState("");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [bill, setBill] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: categoryData } = useQuery({
    queryKey: ["bbps-categories"],
    queryFn: async () => (await api.get("/bbps/categories")).data,
  });
  const categories = categoryData?.categories ?? [];
  const requestedService = serviceKey ? serviceCategories[serviceKey] : null;
  const allowedCategories = requestedService
    ? categories.filter(
        (category: any) =>
          category.serviceKey === serviceKey ||
          requestedService.aliases.some((alias) =>
            String(category.categoryName ?? "")
              .toLowerCase()
              .includes(alias),
          ),
      )
    : categories;
  const selectedCategory =
    allowedCategories.find(
      (category: any) => category.categoryKey === categoryKey,
    ) ?? allowedCategories[0];

  useEffect(() => {
    const nextCategoryKey =
      selectedCategory?.categoryKey ?? allowedCategories[0]?.categoryKey ?? "";
    if (nextCategoryKey && nextCategoryKey !== categoryKey) {
      setCategoryKey(nextCategoryKey);
      setBillerId("");
      setConsumerNumber("");
    }
  }, [allowedCategories, categoryKey, selectedCategory?.categoryKey]);

  const { data: billerData } = useQuery({
    queryKey: ["bbps-billers", categoryKey],
    queryFn: async () =>
      (await api.get("/bbps/billers", { params: { categoryKey } })).data,
    enabled: Boolean(categoryKey),
  });
  const billers = billerData?.billers ?? [];
  const selectedBiller =
    billers.find((biller: any) => biller.billerId === billerId) ?? billers[0];

  useEffect(() => {
    if (billers[0]?.billerId && billers[0].billerId !== billerId)
      setBillerId(billers[0].billerId);
  }, [billers, billerId]);

  useEffect(() => {
    setConsumerNumber("");
    setBill(null);
    setReceipt(null);
  }, [billerId, categoryKey]);

  function validate() {
    if (!selectedCategory?.categoryKey)
      return "Service category not available.";
    if (!billerId) return "Operator is required";
    if (!consumerNumber.trim()) return "Consumer Number is required";
    return "";
  }

  async function fetchBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validate();
    if (error) return setStatus(error);
    setBusy(true);
    setStatus("Fetching bill from DigiSeva...");
    setReceipt(null);
    try {
      await api.get("/bbps/biller-details", { params: { billerId } });
      const { data } = await api.post("/bbps/fetch-bill", {
        billerId,
        categoryKey,
        categoryName: selectedCategory?.categoryName ?? categoryKey,
        billerName: selectedBiller?.billerName ?? billerId,
        inputParameters: { consumerNumber: consumerNumber.trim() },
      });
      setBill(data);
      setStatus("Bill fetched. Verify details before wallet payment.");
    } catch (requestError: any) {
      setBill(null);
      setStatus(
        requestError?.response?.data?.error?.message ??
          requestError?.message ??
          "Bill fetch failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function payViaWallet() {
    if (!bill) return;
    setBusy(true);
    setStatus("Debiting BharatPayU wallet...");
    try {
      const { data } = await api.post("/bbps/pay", {
        externalRef: bill.externalRef,
        billerId: bill.billerId,
        categoryKey: bill.categoryKey,
        serviceCategory: bill.serviceCategory,
        operator: bill.operator,
        consumerNumber: bill.consumerNumber,
        billNumber: bill.billNumber,
        amount: Number(bill.billAmount),
        customerName: bill.customerName,
        dueDate: bill.dueDate,
        inputParameters: bill.inputParameters,
        idempotencyKey: crypto.randomUUID(),
      });
      setReceipt(data);
      setStatus("SUCCESS - Processing by BharatPayU");
    } catch (requestError: any) {
      setStatus(
        requestError?.response?.data?.error?.message ??
          requestError?.message ??
          "Wallet payment failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <BrandLogo />
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
              Semi-manual BBPS
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              {requestedService?.title ?? "Fetch bill & pay by wallet"}
            </h1>
          </div>
          <Link href="/dashboard/retailer">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <Zap className="mb-4 text-blue-300" />
            <form className="grid gap-4" onSubmit={fetchBill}>
              <label className="grid gap-2 text-sm text-slate-300">
                Biller / Operator
                <select
                  className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                  value={billerId}
                  onChange={(event) => setBillerId(event.target.value)}
                >
                  {billers.map((biller: any) => (
                    <option
                      className="bg-slate-950"
                      key={biller.billerId}
                      value={biller.billerId}
                    >
                      {biller.billerName}
                    </option>
                  ))}
                </select>
                {requestedService && allowedCategories.length === 0 && (
                  <span className="text-xs text-amber-200">
                    Sync Digiseva categories to enable this service.
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Consumer Number
                <Input
                  value={consumerNumber}
                  onChange={(event) => setConsumerNumber(event.target.value)}
                  placeholder="Enter consumer number"
                  required
                />
              </label>
              <Button
                disabled={
                  busy || !billerId || !categoryKey || !consumerNumber.trim()
                }
                type="submit"
              >
                <Search size={16} /> {busy ? "Processing..." : "Fetch Bill"}
              </Button>
            </form>
            {status && (
              <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                {status}
              </p>
            )}
          </Card>
          <Card>
            <h2 className="text-2xl font-bold">Bill details</h2>
            {!bill && (
              <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                Fetched bill details will appear here.
              </p>
            )}
            {bill && (
              <div className="mt-5 rounded-md border border-blue-300/20 bg-blue-500/10 p-5">
                <h3 className="text-2xl font-black">{bill.customerName}</h3>
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
                  <p className="rounded-md bg-white/5 p-3 text-sm">
                    Consumer
                    <br />
                    <b>{bill.consumerNumber}</b>
                  </p>
                </div>
                <Button
                  className="mt-5 w-full"
                  disabled={busy || Boolean(receipt)}
                  onClick={payViaWallet}
                >
                  <WalletCards size={16} /> Pay via BharatPayU Wallet
                </Button>
              </div>
            )}
            {receipt && (
              <div className="mt-5 rounded-md border border-green-400/20 bg-green-500/10 p-5">
                <CheckCircle2 className="mb-3 text-green-300" />
                <h3 className="text-xl font-bold">SUCCESS</h3>
                <p className="mt-2 text-sm text-green-50">
                  Processing by BharatPayU
                </p>
                <p className="text-sm text-green-50">
                  Internal Transaction ID: {receipt.transactionId}
                </p>
                <p className="text-sm text-green-50">
                  Amount: {formatCurrency(Number(receipt.amount))}
                </p>
                <p className="text-sm text-green-50">
                  Service: {receipt.service}
                </p>
                <p className="text-sm text-green-50">
                  Operator: {receipt.operator}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
