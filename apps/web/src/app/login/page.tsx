"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Eye, Fingerprint, LocateFixed, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type LoginStep = "password" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  async function getDeviceContext() {
    const device = {
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      fingerprint: `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
    };
    const location = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
    });
    return {
      ...device,
      location: location
        ? { latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy }
        : undefined
    };
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      setMessage("Verifying secure password and device context...");
      const { data } = await api.post("/auth/login", { email, password, device: await getDeviceContext() });
      if (data.requiresOtp) {
        setChallengeId(data.challengeId);
        setStep("otp");
        setMessage("Email OTP sent. Verify to continue.");
        return;
      }
      setSession(data.user.role, data.user.email, data.accessToken, data.user.approvalStatus);
      window.location.href = `/dashboard/${data.user.role === "retailer" ? "retailer" : data.user.role === "distributor" ? "distributor" : "admin"}`;
    } catch (error: any) {
      setMessage(error?.response?.data?.error?.message ?? error?.response?.data?.error ?? error?.message ?? "Login failed. Check API and credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login/otp/verify", { email, otp, challengeId, device: await getDeviceContext() });
      setSession(data.user.role, data.user.email, data.accessToken, data.user.approvalStatus);
      window.location.href = `/dashboard/${data.user.role === "retailer" ? "retailer" : data.user.role === "distributor" ? "distributor" : "admin"}`;
    } catch (error: any) {
      setMessage(error?.response?.data?.error?.message ?? error?.response?.data?.error ?? error?.message ?? "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#03091f] text-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute left-10 top-10 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-12 right-16 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
      <section className="relative hidden flex-col justify-between border-r border-white/10 p-10 lg:flex">
        <BrandLogo />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
          <p className="mb-4 inline-flex rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-sm text-blue-100">Trusted fintech access layer</p>
          <h1 className="text-5xl font-black leading-tight">Secure login for BharatPayU BBPS operations</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Email password login, mandatory email OTP when enabled, device fingerprinting, location intelligence and audit logs protect every dashboard session.</p>
        </motion.div>
        <div className="grid grid-cols-3 gap-3">
          {["JWT Sessions", "Email OTP", "Geo Tracking"].map((item) => (
            <div key={item} className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-200"><ShieldCheck className="mb-3 text-green-300" size={18} /> {item}</div>
          ))}
        </div>
      </section>

      <section className="relative grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md border-blue-300/20 bg-white/[0.07]">
          <div className="mb-7 lg:hidden"><BrandLogo /></div>
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/15 text-blue-200"><LockKeyhole /></div>
            <h2 className="text-3xl font-bold">{step === "password" ? "Login securely" : "Verify email OTP"}</h2>
            <p className="mt-2 text-sm text-slate-400">{step === "password" ? "Use your registered email and password." : "Enter the 6 digit code sent to your email."}</p>
          </div>

          {step === "password" ? (
            <form className="grid gap-4" onSubmit={submitPassword}>
              <label className="grid gap-2 text-sm text-slate-300">Email Address<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="retailer@business.com" /></label>
              <label className="grid gap-2 text-sm text-slate-300">Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Enter password" /></label>
              <Button type="submit" disabled={loading}><Mail size={16} /> {loading ? "Verifying..." : "Continue with Email"}</Button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={submitOtp}>
              <label className="grid gap-2 text-sm text-slate-300">Email OTP<Input inputMode="numeric" minLength={6} maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} required placeholder="123456" /></label>
              <Button type="submit" disabled={loading}><Fingerprint size={16} /> {loading ? "Verifying..." : "Verify OTP"}</Button>
            </form>
          )}

          {message && <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2"><LocateFixed size={14} /> Location detection</span>
            <span className="flex items-center gap-2"><Eye size={14} /> Device tracking</span>
          </div>
        </Card>
      </section>
    </main>
  );
}
