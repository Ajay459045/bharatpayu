"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import {
  Eye,
  Fingerprint,
  LocateFixed,
  LockKeyhole,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type LoginStep = "password" | "otp" | "forgot" | "reset";
type ExtendedLoginStep = LoginStep | "twoFactor" | "twoFactorSetup";

export default function LoginPage() {
  const [step, setStep] = useState<ExtendedLoginStep>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [totp, setTotp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [setupChallengeId, setSetupChallengeId] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [finalDashboardHref, setFinalDashboardHref] = useState("/dashboard/admin");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  async function getDeviceContext() {
    const device = {
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      fingerprint: `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    };
    const location = await new Promise<GeolocationPosition | null>(
      (resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
          timeout: 5000,
        });
      },
    );
    return {
      ...device,
      location: location
        ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          }
        : undefined,
    };
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      setMessage("Verifying secure password and device context...");
      const { data } = await api.post("/auth/login", {
        email,
        password,
        device: await getDeviceContext(),
      });
      if (data.requiresOtp) {
        setChallengeId(data.challengeId);
        setStep("otp");
        setMessage("Email OTP sent. Verify to continue.");
        return;
      }
      if (await handleTwoFactorGate(data)) return;
      setSession(
        data.user.role,
        data.user.email,
        data.accessToken,
        data.user.approvalStatus,
      );
      window.location.href = `/dashboard/${data.user.role === "retailer" ? "retailer" : data.user.role === "distributor" ? "distributor" : "admin"}`;
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Login failed. Check API and credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login/otp/verify", {
        email,
        otp,
        challengeId,
        device: await getDeviceContext(),
      });
      if (await handleTwoFactorGate(data)) return;
      setSession(
        data.user.role,
        data.user.email,
        data.accessToken,
        data.user.approvalStatus,
      );
      window.location.href = `/dashboard/${data.user.role === "retailer" ? "retailer" : data.user.role === "distributor" ? "distributor" : "admin"}`;
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "OTP verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactorGate(data: any) {
    if (data.requiresTwoFactor) {
      setChallengeToken(data.challengeToken);
      setTotp("");
      setStep("twoFactor");
      setMessage(data.message ?? "Enter your authenticator code.");
      return true;
    }
    if (data.requiresTwoFactorSetup) {
      setSetupToken(data.setupToken);
      setStep("twoFactorSetup");
      setMessage(data.message ?? "Set up authenticator 2FA to continue.");
      const setup = await api.post("/auth/2fa/setup", {
        setupToken: data.setupToken,
      });
      setSetupChallengeId(setup.data.setupChallengeId);
      setOtpauthUrl(setup.data.otpauthUrl);
      return true;
    }
    return false;
  }

  async function submitTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/2fa/verify-login", {
        challengeToken,
        code: totp,
        device: await getDeviceContext(),
      });
      setSession(
        data.user.role,
        data.user.email,
        data.accessToken,
        data.user.approvalStatus,
      );
      window.location.href = `/dashboard/${data.user.role === "retailer" ? "retailer" : data.user.role === "distributor" ? "distributor" : "admin"}`;
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "2FA verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitTwoFactorSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/2fa/enable", {
        setupToken,
        setupChallengeId,
        code: totp,
        device: await getDeviceContext(),
      });
      setBackupCodes(data.backupCodes ?? []);
      setSession(
        data.user.role,
        data.user.email,
        data.accessToken,
        data.user.approvalStatus,
      );
      setFinalDashboardHref(
        `/dashboard/${data.user.role === "retailer" ? "retailer" : data.user.role === "distributor" ? "distributor" : "admin"}`,
      );
      setMessage("2FA enabled. Save your backup codes before continuing.");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Could not enable 2FA.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/password/forgot", { email });
      setChallengeId(data.challengeId ?? "");
      setOtp("");
      setStep("reset");
      setMessage(
        data.devOtp
          ? `Testing OTP: ${data.devOtp}`
          : (data.message ?? "Password reset OTP sent."),
      );
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Could not send password reset OTP.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/password/reset", {
        email,
        otp,
        challengeId,
        password: newPassword,
        confirmPassword,
      });
      setStep("password");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(data.message ?? "Password reset successfully.");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Password reset failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendPasswordOtp() {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/password/forgot", { email });
      setChallengeId(data.challengeId ?? "");
      setMessage(
        data.devOtp
          ? `Testing OTP: ${data.devOtp}`
          : (data.message ?? "Password reset OTP resent."),
      );
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Could not resend OTP.",
      );
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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl"
        >
          <p className="mb-4 inline-flex rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-sm text-blue-100">
            Trusted fintech access layer
          </p>
          <h1 className="text-5xl font-black leading-tight">
            Secure login for BharatPayU BBPS operations
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Email password login, mandatory email OTP when enabled, device
            fingerprinting, location intelligence and audit logs protect every
            dashboard session.
          </p>
        </motion.div>
        <div className="grid grid-cols-3 gap-3">
          {["JWT Sessions", "Email OTP", "Geo Tracking"].map((item) => (
            <div
              key={item}
              className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
            >
              <ShieldCheck className="mb-3 text-green-300" size={18} /> {item}
            </div>
          ))}
        </div>
      </section>

      <section className="relative grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md border-blue-300/20 bg-white/[0.07]">
          <div className="mb-7 lg:hidden">
            <BrandLogo />
          </div>
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/15 text-blue-200">
              <LockKeyhole />
            </div>
            <h2 className="text-3xl font-bold">
              {step === "password"
                ? "Login securely"
                : step === "otp"
                  ? "Verify email OTP"
                  : step === "twoFactor"
                    ? "Verify authenticator"
                    : step === "twoFactorSetup"
                      ? "Set up 2FA"
                  : step === "forgot"
                    ? "Reset password"
                    : "Verify reset OTP"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {step === "password"
                ? "Use your registered email and password."
                : step === "otp"
                  ? "Enter the 6 digit code sent to your email."
                  : step === "twoFactor"
                    ? "Enter your Google Authenticator, Microsoft Authenticator, Authy, or backup code."
                    : step === "twoFactorSetup"
                      ? "Scan the QR code and enter the 6 digit authenticator code."
                  : step === "forgot"
                    ? "Enter your email to receive a reset OTP."
                    : "Enter OTP and create a new password."}
            </p>
          </div>

          {step === "password" ? (
            <form className="grid gap-4" onSubmit={submitPassword}>
              <label className="grid gap-2 text-sm text-slate-300">
                Email Address
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="retailer@business.com"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="Enter password"
                />
              </label>
              <Button type="submit" disabled={loading}>
                <Mail size={16} />{" "}
                {loading ? "Verifying..." : "Continue with Email"}
              </Button>
              <button
                className="text-left text-sm font-semibold text-blue-300"
                onClick={() => {
                  setStep("forgot");
                  setMessage("");
                }}
                type="button"
              >
                Forgot password?
              </button>
            </form>
          ) : step === "otp" ? (
            <form className="grid gap-4" onSubmit={submitOtp}>
              <label className="grid gap-2 text-sm text-slate-300">
                Email OTP
                <Input
                  inputMode="numeric"
                  minLength={6}
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                  placeholder="123456"
                />
              </label>
              <Button type="submit" disabled={loading}>
                <Fingerprint size={16} />{" "}
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          ) : step === "twoFactor" ? (
            <form className="grid gap-4" onSubmit={submitTwoFactor}>
              <label className="grid gap-2 text-sm text-slate-300">
                Authenticator or Backup Code
                <Input
                  inputMode="numeric"
                  value={totp}
                  onChange={(event) => setTotp(event.target.value)}
                  required
                  placeholder="123456 or XXXXX-XXXXX"
                />
              </label>
              <Button type="submit" disabled={loading}>
                <Fingerprint size={16} />{" "}
                {loading ? "Verifying..." : "Verify 2FA"}
              </Button>
            </form>
          ) : step === "twoFactorSetup" ? (
            <form className="grid gap-4" onSubmit={submitTwoFactorSetup}>
              {otpauthUrl && backupCodes.length === 0 && (
                <div className="rounded-md bg-white p-4">
                  <QRCode value={otpauthUrl} className="h-auto w-full" />
                </div>
              )}
              {backupCodes.length > 0 ? (
                <div className="rounded-md border border-green-300/20 bg-green-500/10 p-4">
                  <p className="font-semibold text-green-100">
                    Backup codes
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {backupCodes.map((code) => (
                      <code
                        className="rounded bg-slate-950/80 px-2 py-1 text-blue-100"
                        key={code}
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    className="mt-4 w-full"
                    type="button"
                    onClick={() => {
                      window.location.href = finalDashboardHref;
                    }}
                  >
                    Continue
                  </Button>
                </div>
              ) : (
                <>
                  <label className="grid gap-2 text-sm text-slate-300">
                    Authenticator Code
                    <Input
                      inputMode="numeric"
                      minLength={6}
                      maxLength={6}
                      value={totp}
                      onChange={(event) => setTotp(event.target.value)}
                      required
                      placeholder="123456"
                    />
                  </label>
                  <Button type="submit" disabled={loading || !setupChallengeId}>
                    <Fingerprint size={16} />{" "}
                    {loading ? "Enabling..." : "Enable 2FA & Login"}
                  </Button>
                </>
              )}
            </form>
          ) : step === "forgot" ? (
            <form className="grid gap-4" onSubmit={requestPasswordOtp}>
              <label className="grid gap-2 text-sm text-slate-300">
                Email Address
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="registered@email.com"
                />
              </label>
              <Button type="submit" disabled={loading}>
                <RotateCcw size={16} />{" "}
                {loading ? "Sending..." : "Get Reset OTP"}
              </Button>
              <button
                className="text-left text-sm font-semibold text-blue-300"
                onClick={() => setStep("password")}
                type="button"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={submitPasswordReset}>
              <label className="grid gap-2 text-sm text-slate-300">
                Email OTP
                <Input
                  inputMode="numeric"
                  minLength={6}
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                  placeholder="123456"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                New Password
                <Input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  placeholder="New password"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Confirm Password
                <Input
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  placeholder="Confirm password"
                />
              </label>
              <Button type="submit" disabled={loading}>
                <LockKeyhole size={16} />{" "}
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <button
                className="text-left text-sm font-semibold text-blue-300"
                onClick={resendPasswordOtp}
                type="button"
              >
                Resend OTP
              </button>
            </form>
          )}

          {message && (
            <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {message}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <LocateFixed size={14} /> Location detection
            </span>
            <span className="flex items-center gap-2">
              <Eye size={14} /> Device tracking
            </span>
          </div>
        </Card>
      </section>
    </main>
  );
}
