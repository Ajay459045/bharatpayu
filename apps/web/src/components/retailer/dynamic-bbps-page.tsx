"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Search,
  WalletCards,
  Zap,
} from "lucide-react";
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

type BbpsInputField = {
  name: string;
  desc: string;
  regex?: string;
  mandatory: boolean;
};

const fallbackFieldByService: Record<string, Omit<BbpsInputField, "mandatory">> = {
  electricity: { name: "param1", desc: "K Number" },
  water: { name: "param1", desc: "Consumer Number" },
  insurance: { name: "param1", desc: "Policy Number" },
  gas: { name: "param1", desc: "Consumer Number" },
  lpg: { name: "param1", desc: "LPG ID / Consumer Number" },
};

function isMandatory(parameter: any) {
  return (
    Number(parameter?.mandatory ?? parameter?.isMandatory ?? 0) === 1 ||
    parameter?.required === true
  );
}

function normalizeParameters(parameters: any[], key: string): BbpsInputField[] {
  const normalized = parameters
    .map((parameter, index) => ({
      name:
        String(
          parameter?.name ??
            parameter?.paramName ??
            parameter?.parameterName ??
            `param${index + 1}`,
        ).trim() || `param${index + 1}`,
      desc:
        String(
          parameter?.desc ??
            parameter?.description ??
            parameter?.displayName ??
            parameter?.label ??
            parameter?.name ??
            `Field ${index + 1}`,
        ).trim() || `Field ${index + 1}`,
      regex: parameter?.regex ?? parameter?.pattern ?? parameter?.regEx,
      mandatory: isMandatory(parameter),
    }))
    .filter((parameter) => parameter.name);

  return normalized.length
    ? normalized
    : [
        {
          ...(fallbackFieldByService[key] ?? fallbackFieldByService.water),
          mandatory: true,
        },
      ];
}

function settlementLabel(status?: string) {
  if (status === "final_success") return "Approved by admin";
  if (status === "hold") return "On hold";
  if (status === "rejected") return "Rejected / refunded";
  return "Pending admin approval";
}

export function DynamicBbpsPage({
  initialCategoryKey = "",
  serviceKey = "",
}: {
  initialCategoryKey?: string;
  serviceKey?: string;
}) {
  const [categoryKey, setCategoryKey] = useState(initialCategoryKey);
  const [billerId, setBillerId] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
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
      setInputValues({});
    }
  }, [allowedCategories, categoryKey, selectedCategory?.categoryKey]);

  const { data: billerData } = useQuery({
    queryKey: ["bbps-operators", categoryKey],
    queryFn: async () =>
      (await api.get("/bbps/operators", { params: { categoryKey } })).data,
    enabled: Boolean(categoryKey),
  });
  const billers = billerData?.billers ?? [];
  const selectedBiller =
    billers.find((biller: any) => biller.billerId === billerId) ?? billers[0];

  const { data: detailData, isFetching: loadingDetails } = useQuery({
    queryKey: ["bbps-biller-details", billerId],
    queryFn: async () =>
      (await api.get("/bbps/biller-details", { params: { billerId } })).data,
    enabled: Boolean(billerId),
  });
  const inputFields = normalizeParameters(
    detailData?.details?.parameters ?? [],
    serviceKey || selectedCategory?.serviceKey || "",
  );

  useEffect(() => {
    if (billers[0]?.billerId && billers[0].billerId !== billerId)
      setBillerId(billers[0].billerId);
  }, [billers, billerId]);

  useEffect(() => {
    setInputValues({});
    setBill(null);
    setReceipt(null);
  }, [billerId, categoryKey]);

  function validate() {
    if (!selectedCategory?.categoryKey)
      return "Service category not available.";
    if (!billerId) return "Operator is required";
    for (const field of inputFields) {
      const value = inputValues[field.name]?.trim() ?? "";
      if (field.mandatory && !value) return `${field.desc} is required`;
      if (value && field.regex) {
        try {
          if (!new RegExp(String(field.regex)).test(value))
            return `${field.desc} is invalid`;
        } catch {
          return "";
        }
      }
    }
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
      const inputParameters = Object.fromEntries(
        inputFields.map((field) => [
          field.name,
          inputValues[field.name]?.trim() ?? "",
        ]),
      );
      const { data } = await api.post("/bbps/fetch-bill", {
        billerId,
        categoryKey,
        categoryName: selectedCategory?.categoryName ?? categoryKey,
        billerName: selectedBiller?.billerName ?? billerId,
        inputParameters,
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
      setStatus("Payment successful. Awaiting admin settlement approval.");
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
                  {billers.length === 0 && (
                    <option className="bg-slate-950" value="">
                      No live operators found
                    </option>
                  )}
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
                Service Details
                <div className="grid gap-3">
                  {inputFields.map((field) => (
                    <Input
                      key={field.name}
                      value={inputValues[field.name] ?? ""}
                      onChange={(event) =>
                        setInputValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                      placeholder={`Enter ${field.desc}`}
                      required={field.mandatory}
                    />
                  ))}
                </div>
                {loadingDetails && (
                  <span className="text-xs text-slate-400">
                    Loading operator fields...
                  </span>
                )}
              </label>
              <Button
                disabled={
                  busy ||
                  !billerId ||
                  !categoryKey ||
                  inputFields.some(
                    (field) =>
                      field.mandatory && !inputValues[field.name]?.trim(),
                  )
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
              <>
                <div
                  id="bbps-print-receipt"
                  className="mt-5 overflow-hidden rounded-md border border-white/10 bg-white text-slate-950 shadow-2xl shadow-blue-950/30"
                >
                  <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src="/brand/bharatpayu-logo.png"
                          alt="BharatPayU"
                          className="h-14 w-14 rounded-md bg-white object-contain p-1"
                        />
                        <div>
                          <p className="text-xl font-black">BHARATPAYU</p>
                          <p className="text-xs text-slate-300">
                            Trusted Digital Payments Since 2021
                          </p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-green-200">
                          Payment receipt
                        </p>
                        <p className="mt-1 text-lg font-black text-green-300">
                          SUCCESS
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-5 p-5">
                    <div className="rounded-md border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 size={20} />
                        <b>Retailer payment successful</b>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {receipt.message ??
                          "Pending admin settlement approval."}
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      {[
                        ["Internal Transaction ID", receipt.transactionId],
                        [
                          "Provider Transaction ID",
                          receipt.bbpsReferenceId ??
                            "Pending admin approval",
                        ],
                        [
                          "Settlement Status",
                          settlementLabel(receipt.settlementStatus),
                        ],
                        ["Paid Amount", formatCurrency(Number(receipt.amount))],
                        ["Service", receipt.service],
                        ["Operator", receipt.operator],
                        ["Customer", receipt.customerName],
                        ["Consumer Number", receipt.consumerNumber],
                        ["Bill Number", receipt.billNumber],
                        [
                          "Due Date",
                          receipt.dueDate
                            ? new Date(receipt.dueDate).toLocaleDateString(
                                "en-IN",
                              )
                            : "-",
                        ],
                        [
                          "Receipt Time",
                          receipt.time
                            ? new Date(receipt.time).toLocaleString("en-IN")
                            : new Date().toLocaleString("en-IN"),
                        ],
                      ].map(([label, value]) => (
                        <p
                          key={label}
                          className="rounded-md border border-slate-200 bg-slate-50 p-3"
                        >
                          <span className="block text-xs font-semibold uppercase text-slate-500">
                            {label}
                          </span>
                          <b className="mt-1 block break-words text-slate-950">
                            {String(value ?? "-")}
                          </b>
                        </p>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-4 text-xs leading-5 text-slate-500">
                      This receipt confirms wallet debit and bill payment request
                      submission through BharatPayU. The provider transaction ID
                      appears after admin approval.
                    </div>
                  </div>
                </div>
                <Button
                  className="no-print mt-4 w-full"
                  variant="secondary"
                  onClick={() => window.print()}
                >
                  <Download size={16} /> Print Receipt Only
                </Button>
                <style jsx global>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }

                    #bbps-print-receipt,
                    #bbps-print-receipt * {
                      visibility: visible !important;
                    }

                    #bbps-print-receipt {
                      position: absolute !important;
                      inset: 0 auto auto 0 !important;
                      width: 100% !important;
                      border: 0 !important;
                      border-radius: 0 !important;
                      box-shadow: none !important;
                    }

                    .no-print {
                      display: none !important;
                    }
                  }
                `}</style>
              </>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
