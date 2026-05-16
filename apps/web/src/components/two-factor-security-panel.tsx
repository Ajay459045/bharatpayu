"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import QRCode from "react-qr-code";
import { KeyRound, QrCode, RefreshCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type CodeForm = { code: string };

export function TwoFactorSecurityPanel() {
  const [setup, setSetup] = useState<any>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset } = useForm<CodeForm>();
  const { data, refetch } = useQuery({
    queryKey: ["auth-2fa-status"],
    queryFn: async () => (await api.get("/auth/2fa/status")).data,
  });

  async function beginSetup() {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await api.post("/auth/2fa/setup");
      setSetup(data);
      setBackupCodes([]);
      setMessage("Scan the QR code and enter the 6-digit authenticator code.");
    } catch (error: any) {
      setMessage(errorMessage(error, "Could not start 2FA setup."));
    } finally {
      setBusy(false);
    }
  }

  async function enable(values: CodeForm) {
    if (!setup?.setupChallengeId) return;
    setBusy(true);
    try {
      const { data } = await api.post("/auth/2fa/enable", {
        setupChallengeId: setup.setupChallengeId,
        code: values.code,
      });
      setBackupCodes(data.backupCodes ?? []);
      setSetup(null);
      reset();
      await refetch();
      setMessage("2FA enabled. Store these backup codes securely.");
    } catch (error: any) {
      setMessage(errorMessage(error, "Could not enable 2FA."));
    } finally {
      setBusy(false);
    }
  }

  async function disable(values: CodeForm) {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/2fa/disable", values);
      reset();
      setBackupCodes([]);
      await refetch();
      setMessage(data.message ?? "2FA disabled.");
    } catch (error: any) {
      setMessage(errorMessage(error, "Could not disable 2FA."));
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(values: CodeForm) {
    setBusy(true);
    try {
      const { data } = await api.post("/auth/2fa/regenerate-backup-codes", values);
      reset();
      setBackupCodes(data.backupCodes ?? []);
      await refetch();
      setMessage("New backup codes generated. Old backup codes no longer work.");
    } catch (error: any) {
      setMessage(errorMessage(error, "Could not regenerate backup codes."));
    } finally {
      setBusy(false);
    }
  }

  const enabled = Boolean(data?.twoFactorEnabled);

  return (
    <Card className="border-blue-300/20 bg-white/[0.07]">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
            Authenticator 2FA
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Google Authenticator protection
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Works with Google Authenticator, Microsoft Authenticator and Authy.
            Backup codes are shown once and stored only as hashes.
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-sm ${
            enabled
              ? "border-green-300/30 bg-green-500/10 text-green-100"
              : "border-amber-300/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {enabled ? "Enabled" : "Not enabled"}
        </span>
      </div>

      {!enabled && !setup && (
        <Button className="mt-5" disabled={busy} onClick={beginSetup}>
          <QrCode size={16} /> {busy ? "Preparing..." : "Enable 2FA"}
        </Button>
      )}

      {setup && (
        <form className="mt-5 grid gap-4 md:grid-cols-[260px_1fr]" onSubmit={handleSubmit(enable)}>
          <div className="rounded-md bg-white p-4">
            <QRCode value={setup.otpauthUrl} className="h-auto w-full" />
          </div>
          <div className="grid content-start gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              6-digit authenticator code
              <Input inputMode="numeric" maxLength={6} minLength={6} required {...register("code")} />
            </label>
            <Button disabled={busy} type="submit">
              <ShieldCheck size={16} /> {busy ? "Verifying..." : "Verify & Enable"}
            </Button>
          </div>
        </form>
      )}

      {enabled && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form className="grid gap-3" onSubmit={handleSubmit(disable)}>
            <label className="grid gap-2 text-sm text-slate-300">
              Authenticator code to disable
              <Input inputMode="numeric" required {...register("code")} />
            </label>
            <Button disabled={busy} variant="danger" type="submit">
              <ShieldOff size={16} /> Disable 2FA
            </Button>
          </form>
          <form className="grid gap-3" onSubmit={handleSubmit(regenerate)}>
            <label className="grid gap-2 text-sm text-slate-300">
              Authenticator code for new backup codes
              <Input inputMode="numeric" required {...register("code")} />
            </label>
            <Button disabled={busy} variant="secondary" type="submit">
              <RefreshCcw size={16} /> Regenerate Backup Codes
            </Button>
          </form>
        </div>
      )}

      {backupCodes.length > 0 && (
        <div className="mt-5 rounded-md border border-green-300/20 bg-green-500/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-green-100">
            <KeyRound size={16} /> Backup recovery codes
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {backupCodes.map((code) => (
              <code className="rounded bg-slate-950/80 px-3 py-2 text-blue-100" key={code}>
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
          {message}
        </p>
      )}
    </Card>
  );
}

function errorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.message ??
    error?.response?.data?.error ??
    error?.message ??
    fallback
  );
}
