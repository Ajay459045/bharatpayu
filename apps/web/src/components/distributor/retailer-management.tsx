"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileImage,
  Landmark,
  LocateFixed,
  LockKeyhole,
  Plus,
  Save,
  Shield,
  Upload,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const services = ["electricity", "water", "lpg", "gas", "insurance"];

function emptyForm() {
  return {
    fullName: "",
    businessName: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    state: "",
    district: "",
    fullAddress: "",
    pincode: "",
    documents: {
      panImage: "",
      aadhaarFront: "",
      aadhaarBack: "",
      selfie: "",
    },
    location: {
      latitude: 0,
      longitude: 0,
      ipAddress: "",
      deviceInfo: {},
    },
  };
}

async function fileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }
  return await new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1280;
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Image compression failed"));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    image.onerror = () => reject(new Error("Invalid image file"));
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function DistributorRetailerListPage() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [distributor, setDistributor] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await api.get("/distributor/retailers");
    setDistributor(data.distributor ?? null);
    setRetailers(data.retailers ?? []);
  }

  async function updateStatus(id: string, next: "active" | "suspended") {
    await api.patch(`/distributor/retailers/${id}/status`, { status: next });
    setStatus(
      next === "active" ? "Retailer activated." : "Retailer suspended.",
    );
    await load();
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
              Distributor network
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Retailer management
            </h1>
          </div>
          <Link href="/dashboard/distributor/retailers/add">
            <Button disabled={distributor?.approvalStatus !== "approved"}>
              <Plus size={16} /> Add Retailer
            </Button>
          </Link>
        </div>
        {distributor?.approvalStatus !== "approved" && (
          <Card className="mt-5 border-orange-300/20 bg-orange-500/10">
            Admin approval is required before retailer services become active.
          </Card>
        )}
        {status && <Card className="mt-5">{status}</Card>}
        <Card className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                {[
                  "Retailer Name",
                  "Business Name",
                  "Mobile",
                  "Wallet Balance",
                  "Status",
                  "KYC Status",
                  "Transactions",
                  "Earnings",
                  "Join Date",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="p-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retailers.map((retailer) => (
                <tr key={retailer._id} className="border-t border-white/10">
                  <td className="p-3">{retailer.name}</td>
                  <td className="p-3">{retailer.businessName}</td>
                  <td className="p-3">{retailer.mobile}</td>
                  <td className="p-3">
                    {formatCurrency(Number(retailer.walletBalance ?? 0))}
                  </td>
                  <td className="p-3">
                    {retailer.isActive ? "Active" : "Suspended"}
                  </td>
                  <td className="p-3">{retailer.kycStatus}</td>
                  <td className="p-3">{retailer.transactions ?? 0}</td>
                  <td className="p-3">
                    {formatCurrency(Number(retailer.earnings ?? 0))}
                  </td>
                  <td className="p-3">
                    {retailer.createdAt
                      ? new Date(retailer.createdAt).toLocaleDateString("en-IN")
                      : "-"}
                  </td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <Link
                      href={`/dashboard/distributor/retailers/${retailer._id}`}
                    >
                      <Button variant="secondary">
                        <Eye size={14} /> View
                      </Button>
                    </Link>
                    <Link
                      href={`/dashboard/distributor/retailers/edit/${retailer._id}`}
                    >
                      <Button variant="secondary">Edit</Button>
                    </Link>
                    <Button
                      variant={retailer.isActive ? "danger" : "secondary"}
                      onClick={() =>
                        updateStatus(
                          retailer._id,
                          retailer.isActive ? "suspended" : "active",
                        )
                      }
                    >
                      {retailer.isActive ? "Suspend" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {retailers.length === 0 && (
            <p className="p-6 text-sm text-slate-400">No retailers found.</p>
          )}
        </Card>
      </div>
    </main>
  );
}

export function DistributorRetailerAddPage() {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const steps = ["Basic", "Address", "KYC", "Location", "OTP"];

  function update(key: string, value: any) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(
    key: keyof ReturnType<typeof emptyForm>["documents"],
    file: File,
  ) {
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((current) => ({
        ...current,
        documents: { ...current.documents, [key]: dataUrl },
      }));
      setStatus("Image validated and compressed.");
    } catch (error: any) {
      setStatus(error?.message ?? "Upload failed");
    }
  }

  async function captureLocation() {
    setStatus("Capturing location...");
    const location = await new Promise<GeolocationPosition | null>(
      (resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
          timeout: 7000,
        });
      },
    );
    setForm((current) => ({
      ...current,
      location: {
        latitude: location?.coords.latitude ?? 0,
        longitude: location?.coords.longitude ?? 0,
        ipAddress: "",
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen: `${screen.width}x${screen.height}`,
        },
      },
    }));
    setStatus(location ? "Location captured." : "Location unavailable.");
  }

  function validateStep(index = step) {
    const requiredByStep: Record<number, Array<[string, string]>> = {
      0: [
        ["fullName", "Full name"],
        ["businessName", "Business name"],
        ["mobile", "Mobile number"],
        ["email", "Email address"],
        ["password", "Password"],
        ["confirmPassword", "Confirm password"],
      ],
      1: [
        ["state", "State"],
        ["district", "District"],
        ["fullAddress", "Full address"],
        ["pincode", "Pincode"],
      ],
      2: [
        ["documents.panImage", "PAN card image"],
        ["documents.aadhaarFront", "Aadhaar front image"],
        ["documents.aadhaarBack", "Aadhaar back image"],
        ["documents.selfie", "User selfie"],
      ],
    };
    for (const [path, label] of requiredByStep[index] ?? []) {
      const value = path
        .split(".")
        .reduce((next: any, key) => next?.[key], form);
      if (!String(value ?? "").trim()) {
        setStatus(`${label} is required.`);
        return false;
      }
    }
    if (index === 0) {
      if (!/^[6-9]\d{9}$/.test(form.mobile)) {
        setStatus("Enter a valid 10 digit mobile number.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setStatus("Enter a valid email address.");
        return false;
      }
      if (form.password.length < 8) {
        setStatus("Password must be at least 8 characters.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setStatus("Password and confirm password must match.");
        return false;
      }
    }
    if (index === 1 && !/^\d{6}$/.test(form.pincode)) {
      setStatus("Enter a valid 6 digit pincode.");
      return false;
    }
    if (index === 3) {
      if (!form.location.latitude || !form.location.longitude) {
        setStatus("Capture location before sending OTP.");
        return false;
      }
      if (!Object.keys(form.location.deviceInfo ?? {}).length) {
        setStatus("Device information is required.");
        return false;
      }
    }
    setStatus("");
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((value) => Math.min(value + 1, 4));
  }

  function goToStep(index: number) {
    for (let current = 0; current < index; current += 1) {
      if (!validateStep(current)) return;
    }
    setStep(index);
  }

  async function sendOtp() {
    if (!validateStep(3)) return;
    setBusy(true);
    try {
      const { data } = await api.post("/distributor/retailers/otp", form);
      setChallengeId(data.challengeId);
      setStep(4);
      setStatus(
        data.devOtp
          ? `Testing OTP: ${data.devOtp}`
          : "OTP sent to retailer email.",
      );
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message ?? error?.message);
    } finally {
      setBusy(false);
    }
  }

  async function createRetailer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (let index = 0; index <= 3; index += 1) {
      if (!validateStep(index)) {
        setStep(index);
        return;
      }
    }
    if (!otp || otp.length !== 6) {
      setStatus("Enter the 6 digit email OTP.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/distributor/retailers", { ...form, otp, challengeId });
      setStatus("Retailer created and approved.");
      window.location.href = "/dashboard/distributor/retailers";
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message ?? error?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
          Premium onboarding
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">Add retailer</h1>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {steps.map((label, index) => (
            <button
              className={`rounded-md border px-3 py-2 text-sm ${index === step ? "border-blue-300 bg-blue-500/20" : "border-white/10 bg-white/5"}`}
              key={label}
              onClick={() => goToStep(index)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <Card className="mt-5">
          <form className="grid gap-4" onSubmit={createRetailer}>
            {step === 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {["fullName", "businessName", "mobile", "email"].map((key) => (
                  <Input
                    key={key}
                    value={(form as any)[key]}
                    onChange={(event) => update(key, event.target.value)}
                    placeholder={key}
                    required
                    type={
                      key === "email"
                        ? "email"
                        : key === "mobile"
                          ? "tel"
                          : "text"
                    }
                  />
                ))}
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  placeholder="Password"
                  required
                />
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    update("confirmPassword", event.target.value)
                  }
                  placeholder="Confirm Password"
                  required
                />
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-3 md:grid-cols-2">
                {["state", "district", "fullAddress", "pincode"].map((key) => (
                  <Input
                    key={key}
                    value={(form as any)[key]}
                    onChange={(event) => update(key, event.target.value)}
                    placeholder={key}
                    required
                    type={key === "pincode" ? "tel" : "text"}
                  />
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    ["panImage", "PAN Card Image"],
                    ["aadhaarFront", "Aadhaar Front Image"],
                    ["aadhaarBack", "Aadhaar Back Image"],
                    ["selfie", "User Selfie"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    className="rounded-md border border-dashed border-white/15 bg-white/5 p-4"
                    key={key}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files?.[0];
                      if (file) upload(key, file);
                    }}
                  >
                    <Upload className="mb-2 text-blue-300" />
                    <span className="text-sm">{label}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Drop image here or choose file
                    </span>
                    <input
                      accept="image/*"
                      className="mt-3 block w-full text-sm"
                      onChange={(event) =>
                        event.target.files?.[0] &&
                        upload(key, event.target.files[0])
                      }
                      required={!form.documents[key]}
                      type="file"
                    />
                    {form.documents[key] && (
                      <img
                        alt={`${label} preview`}
                        className="mt-3 h-32 w-full rounded-md object-cover"
                        src={form.documents[key]}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-4">
                <Button onClick={captureLocation} type="button">
                  <LocateFixed size={16} /> Capture location & device
                </Button>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={String(form.location.latitude)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        location: {
                          ...form.location,
                          latitude: Number(event.target.value),
                        },
                      })
                    }
                    placeholder="Latitude"
                  />
                  <Input
                    value={String(form.location.longitude)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        location: {
                          ...form.location,
                          longitude: Number(event.target.value),
                        },
                      })
                    }
                    placeholder="Longitude"
                  />
                </div>
                <pre className="overflow-auto rounded-md bg-black/30 p-3 text-xs text-slate-300">
                  {JSON.stringify(form.location.deviceInfo, null, 2)}
                </pre>
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-3">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  minLength={6}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Email OTP"
                  value={otp}
                />
                <Button disabled={busy || !otp || !challengeId} type="submit">
                  <CheckCircle2 size={16} /> Verify OTP & Create Retailer
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {step > 0 && (
                <Button
                  onClick={() => setStep((value) => value - 1)}
                  type="button"
                  variant="secondary"
                >
                  Back
                </Button>
              )}
              {step < 3 && (
                <Button onClick={goNext} type="button">
                  Next
                </Button>
              )}
              {step === 3 && (
                <Button disabled={busy} onClick={sendOtp} type="button">
                  Send Email OTP
                </Button>
              )}
            </div>
          </form>
        </Card>
        {status && <Card className="mt-5">{status}</Card>}
      </div>
    </main>
  );
}

export function DistributorRetailerDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const response = await api.get(`/distributor/retailers/${id}`);
    setData(response.data);
  }

  async function topup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.post(`/distributor/retailers/${id}/wallet/topup`, {
      amount: Number(amount),
    });
    setAmount("");
    setStatus("Retailer wallet credited.");
    await load();
  }

  async function toggleService(key: string, enabled: boolean) {
    const current = data?.retailer?.serviceAccess ?? {};
    await api.patch(`/distributor/retailers/${id}/services`, {
      services: { ...current, [key]: enabled },
    });
    await load();
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch(`/distributor/retailers/${id}/password`, { password });
    setPassword("");
    setStatus("Password reset.");
  }

  const retailer = data?.retailer;
  const mainWallet = data?.wallets?.find(
    (wallet: any) => wallet.type === "main",
  );
  const commissionWallet = data?.wallets?.find(
    (wallet: any) => wallet.type === "commission",
  );

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard/distributor/retailers">
          <Button variant="secondary">Retailers</Button>
        </Link>
        <h1 className="mt-5 text-3xl font-black">
          {retailer?.name ?? "Retailer"}
        </h1>
        {status && <Card className="mt-5">{status}</Card>}
        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <h2 className="text-xl font-bold">Personal & business details</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <p>Business: {retailer?.businessName}</p>
              <p>Mobile: {retailer?.mobile}</p>
              <p>Email: {retailer?.email}</p>
              <p>Status: {retailer?.approvalStatus}</p>
              <p>KYC: {retailer?.kycStatus}</p>
              <p>Address: {retailer?.address?.fullAddress}</p>
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold">Wallet & actions</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="rounded-md bg-white/5 p-3">
                Main: {formatCurrency(Number(mainWallet?.balance ?? 0))}
              </p>
              <p className="rounded-md bg-white/5 p-3">
                Commission:{" "}
                {formatCurrency(Number(commissionWallet?.balance ?? 0))}
              </p>
            </div>
            <form className="mt-4 flex gap-2" onSubmit={topup}>
              <Input
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Topup amount"
                type="number"
                value={amount}
              />
              <Button>
                <WalletCards size={16} /> Topup
              </Button>
            </form>
            <form className="mt-4 flex gap-2" onSubmit={resetPassword}>
              <Input
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                type="password"
                value={password}
              />
              <Button variant="secondary">
                <LockKeyhole size={16} /> Reset
              </Button>
            </form>
          </Card>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="text-xl font-bold">KYC documents</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(retailer?.kyc?.documents ?? {}).map(
                ([key, value]) => (
                  <div className="rounded-md bg-white/5 p-3" key={key}>
                    <p className="mb-2 flex items-center gap-2 text-sm">
                      <FileImage size={15} /> {key}
                    </p>
                    <img
                      alt={key}
                      className="h-36 w-full rounded-md object-cover"
                      src={String(value)}
                    />
                  </div>
                ),
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold">Service controls</h2>
            <div className="mt-4 grid gap-3">
              {services.map((service) => (
                <label
                  className="flex items-center justify-between rounded-md bg-white/5 p-3 capitalize"
                  key={service}
                >
                  {service}
                  <input
                    checked={retailer?.serviceAccess?.[service] !== false}
                    onChange={(event) =>
                      toggleService(service, event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </Card>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="text-xl font-bold">Transactions</h2>
            <div className="mt-4 grid gap-2">
              {(data?.transactions ?? []).map((txn: any) => (
                <p className="rounded-md bg-white/5 p-3 text-sm" key={txn._id}>
                  {txn.transactionId} - {txn.serviceCategory} -{" "}
                  {formatCurrency(Number(txn.amount ?? 0))}
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold">Ledger & audit logs</h2>
            <div className="mt-4 grid gap-2">
              {(data?.ledgers ?? []).slice(0, 8).map((ledger: any) => (
                <p
                  className="rounded-md bg-white/5 p-3 text-sm"
                  key={ledger._id}
                >
                  {ledger.transactionId}: +{ledger.credit} -{ledger.debit}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

export function DistributorRetailerEditPage({ id }: { id: string }) {
  const [form, setForm] = useState<any>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.get(`/distributor/retailers/${id}`).then(({ data }) => {
      const retailer = data.retailer;
      setForm({
        fullName: retailer.name ?? "",
        businessName: retailer.businessName ?? "",
        mobile: retailer.mobile ?? "",
        email: retailer.email ?? "",
        state: retailer.address?.state ?? "",
        district: retailer.address?.district ?? "",
        fullAddress: retailer.address?.fullAddress ?? "",
        pincode: retailer.address?.pincode ?? "",
      });
    });
  }, [id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch(`/distributor/retailers/${id}`, form);
    setStatus("Retailer updated.");
  }

  if (!form)
    return (
      <main className="min-h-screen bg-[#03091f] p-6 text-white">
        Loading...
      </main>
    );

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black">Edit retailer</h1>
        <Card className="mt-5">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
            {Object.keys(form).map((key) => (
              <Input
                key={key}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
                placeholder={key}
                value={form[key]}
              />
            ))}
            <Button>
              <Save size={16} /> Save Retailer
            </Button>
          </form>
        </Card>
        {status && <Card className="mt-5">{status}</Card>}
      </div>
    </main>
  );
}
