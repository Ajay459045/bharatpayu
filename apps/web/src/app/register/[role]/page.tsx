"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CloudUpload,
  LocateFixed,
  MailCheck,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Role = "retailer" | "distributor";

type FormState = {
  fullName: string;
  businessName: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  state: string;
  district: string;
  fullAddress: string;
  pincode: string;
  documents: Record<
    "panImage" | "aadhaarFront" | "aadhaarBack" | "selfie",
    string
  >;
  location?: {
    latitude: number;
    longitude: number;
    deviceInfo: Record<string, unknown>;
    ipAddress?: string;
  };
};

const steps = [
  "Basic Details",
  "Address Details",
  "Document Verification",
  "Location Permission",
];
const documentLabels = {
  panImage: "PAN Card Image",
  aadhaarFront: "Aadhaar Front Image",
  aadhaarBack: "Aadhaar Back Image",
  selfie: "User Selfie",
} as const;

const initialForm: FormState = {
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
  documents: { panImage: "", aadhaarFront: "", aadhaarBack: "", selfie: "" },
};

function fileToCompressedDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1100;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const context = canvas.getContext("2d");
        context?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function RegistrationPage() {
  const params = useParams<{ role: Role }>();
  const role = params.role;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [otp, setOtp] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function updateDocument(
    key: keyof FormState["documents"],
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Upload a valid image file.");
      return;
    }
    const preview = await fileToCompressedDataUrl(file);
    setForm((current) => ({
      ...current,
      documents: { ...current.documents, [key]: preview },
    }));
  }

  async function captureLocation() {
    setStatus("Requesting browser location permission...");
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        if (!navigator.geolocation)
          return reject(
            new Error("Geolocation is not available in this browser."),
          );
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        });
      },
    ).catch(() => null);
    if (!position) {
      setStatus(
        "Location permission is mandatory. Registration cannot continue without location access.",
      );
      return;
    }
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fingerprint: `${navigator.userAgent}|${screen.width}x${screen.height}`,
    };
    let ipAddress = "";
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      ipAddress = data.ip;
    } catch {
      ipAddress = "";
    }
    setForm((current) => ({
      ...current,
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        deviceInfo,
        ipAddress,
      },
    }));
    setStatus("Location captured. You can submit onboarding.");
  }

  function validateCurrentStep() {
    if (step === 0)
      return (
        form.fullName &&
        form.businessName &&
        form.mobile &&
        form.email &&
        form.password &&
        form.confirmPassword &&
        form.password === form.confirmPassword
      );
    if (step === 1)
      return form.state && form.district && form.fullAddress && form.pincode;
    if (step === 2) return Object.values(form.documents).every(Boolean);
    return Boolean(form.location);
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCurrentStep()) {
      setStatus("Complete all mandatory fields before continuing.");
      return;
    }
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      setStatus("");
      return;
    }
    setLoading(true);
    try {
      setStatus("Submitting KYC and sending email OTP...");
      const { data } = await api.post("/auth/register", { ...form, role });
      setRegistrationId(data.registrationId);
      setChallengeId(data.challengeId);
      setStep(steps.length);
      setStatus("Registration received. Email OTP sent for verification.");
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ??
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message;
      setStatus(
        Array.isArray(message)
          ? message.join(", ")
          : (message ??
              "Registration submit failed. Please check all fields and try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/otp/verify", {
        email: form.email,
        otp,
        challengeId,
      });
      localStorage.setItem("bharatpayu.accessToken", data.accessToken);
      localStorage.setItem(
        "bharatpayu.approvalStatus",
        data.user?.approvalStatus ?? "pending",
      );
      localStorage.setItem("bharatpayu.registrationId", registrationId);
      window.location.href = `/dashboard/${data.user?.role === "distributor" ? "distributor" : "retailer"}`;
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ??
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message;
      setStatus(
        Array.isArray(message)
          ? message.join(", ")
          : (message ?? "OTP verification failed."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#03091f] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo />
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 md:flex">
            <ShieldCheck size={16} /> Email OTP only
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-300">
              Premium onboarding
            </p>
            <h1 className="mt-3 text-4xl font-black capitalize md:text-5xl">
              {role} registration
            </h1>
            <p className="mt-4 leading-7 text-slate-300">
              Complete KYC, upload documents, approve browser location and
              verify your email OTP. Dashboard access remains limited until
              admin approval.
            </p>
            <div className="mt-8 grid gap-3">
              {steps.map((label, index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${index <= step ? "bg-blue-500 text-white" : "bg-white/10 text-slate-400"}`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <Card>
            <div className="mb-6 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#0b5cff] via-[#0787ff] to-[#ff8a00]"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <AnimatePresence mode="wait">
              {step < steps.length ? (
                <motion.form
                  key={step}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  className="grid gap-4"
                  onSubmit={submitRegistration}
                >
                  <h2 className="text-2xl font-bold">{steps[step]}</h2>
                  {step === 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        required
                        placeholder="Full Name"
                        value={form.fullName}
                        onChange={(event) =>
                          update("fullName", event.target.value)
                        }
                      />
                      <Input
                        required
                        placeholder="Business Name"
                        value={form.businessName}
                        onChange={(event) =>
                          update("businessName", event.target.value)
                        }
                      />
                      <Input
                        required
                        placeholder="Mobile Number"
                        value={form.mobile}
                        onChange={(event) =>
                          update("mobile", event.target.value)
                        }
                      />
                      <Input
                        required
                        type="email"
                        placeholder="Email Address"
                        value={form.email}
                        onChange={(event) =>
                          update("email", event.target.value)
                        }
                      />
                      <Input
                        required
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(event) =>
                          update("password", event.target.value)
                        }
                      />
                      <Input
                        required
                        type="password"
                        placeholder="Confirm Password"
                        value={form.confirmPassword}
                        onChange={(event) =>
                          update("confirmPassword", event.target.value)
                        }
                      />
                    </div>
                  )}
                  {step === 1 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        required
                        placeholder="State"
                        value={form.state}
                        onChange={(event) =>
                          update("state", event.target.value)
                        }
                      />
                      <Input
                        required
                        placeholder="District"
                        value={form.district}
                        onChange={(event) =>
                          update("district", event.target.value)
                        }
                      />
                      <Input
                        required
                        placeholder="Pincode"
                        value={form.pincode}
                        onChange={(event) =>
                          update("pincode", event.target.value)
                        }
                      />
                      <Input
                        required
                        className="md:col-span-2"
                        placeholder="Full Address"
                        value={form.fullAddress}
                        onChange={(event) =>
                          update("fullAddress", event.target.value)
                        }
                      />
                    </div>
                  )}
                  {step === 2 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {(
                        Object.keys(documentLabels) as Array<
                          keyof typeof documentLabels
                        >
                      ).map((key) => (
                        <label
                          key={key}
                          className="rounded-md border border-dashed border-blue-300/30 bg-white/5 p-4"
                        >
                          <span className="mb-3 flex items-center gap-2 text-sm font-semibold">
                            <CloudUpload size={16} /> {documentLabels[key]}
                          </span>
                          <input
                            className="hidden"
                            type="file"
                            accept="image/*"
                            onChange={(event) => updateDocument(key, event)}
                          />
                          {form.documents[key] ? (
                            <img
                              src={form.documents[key]}
                              alt={`${documentLabels[key]} preview`}
                              className="h-32 w-full rounded-md object-cover"
                            />
                          ) : (
                            <span className="block rounded-md bg-white/5 p-6 text-center text-sm text-slate-400">
                              Drag and drop or click to upload
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  {step === 3 && (
                    <div className="rounded-md border border-white/10 bg-white/5 p-5">
                      <LocateFixed className="mb-3 text-green-300" />
                      <h3 className="text-lg font-semibold">
                        Mandatory browser location
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Registration is blocked if location is denied. Latitude,
                        longitude, IP address and device information will be
                        sent for admin verification.
                      </p>
                      <Button
                        type="button"
                        className="mt-5"
                        onClick={captureLocation}
                      >
                        Capture Location
                      </Button>
                      {form.location && (
                        <p className="mt-4 text-sm text-green-200">
                          Captured: {form.location.latitude.toFixed(5)},{" "}
                          {form.location.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={step === 0}
                      onClick={() => setStep((value) => Math.max(0, value - 1))}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading
                        ? "Submitting..."
                        : step === steps.length - 1
                          ? "Submit & Send Email OTP"
                          : "Continue"}
                    </Button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid gap-4"
                  onSubmit={verifyEmailOtp}
                >
                  <MailCheck className="text-green-300" size={34} />
                  <h2 className="text-2xl font-bold">Verify email OTP</h2>
                  <p className="text-sm text-slate-300">
                    Enter the code sent to {form.email}. Phone OTP is not used.
                  </p>
                  <Input
                    required
                    inputMode="numeric"
                    minLength={6}
                    maxLength={6}
                    placeholder="6 digit email OTP"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                  />
                  <Button type="submit" disabled={loading}>
                    <UserRoundCheck size={16} />{" "}
                    {loading
                      ? "Verifying..."
                      : "Verify & Enter Limited Dashboard"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
            {status && (
              <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                {status}
              </p>
            )}
            <div className="mt-5 rounded-md border border-orange-300/20 bg-orange-400/10 p-4 text-sm text-orange-100">
              Your account is under verification. Please wait for admin
              approval. BBPS services, transactions and wallet usage stay
              disabled until approval.
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
