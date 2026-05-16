"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { TwoFactorSecurityPanel } from "@/components/two-factor-security-panel";

export function ChangePasswordPanel({
  backHref,
  title = "Change password",
}: {
  backHref: string;
  title?: string;
}) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setMessage("New password and confirm password must match.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/password/change", form);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage(data.message ?? "Password changed successfully.");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Could not change password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-3xl">
        <a className="text-sm font-semibold text-blue-300" href={backHref}>
          Back to dashboard
        </a>
        <Card className="mt-5 border-blue-300/20 bg-white/[0.07]">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-blue-500/15 text-blue-200">
              <LockKeyhole />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
                Security
              </p>
              <h1 className="text-3xl font-black">{title}</h1>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm text-slate-300">
              Current Password
              <Input
                minLength={8}
                onChange={(event) =>
                  setForm({ ...form, currentPassword: event.target.value })
                }
                required
                type="password"
                value={form.currentPassword}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              New Password
              <Input
                minLength={8}
                onChange={(event) =>
                  setForm({ ...form, newPassword: event.target.value })
                }
                required
                type="password"
                value={form.newPassword}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Confirm Password
              <Input
                minLength={8}
                onChange={(event) =>
                  setForm({ ...form, confirmPassword: event.target.value })
                }
                required
                type="password"
                value={form.confirmPassword}
              />
            </label>
            <Button disabled={loading}>
              <KeyRound size={16} />{" "}
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </form>
          {message && (
            <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {message}
            </p>
          )}
        </Card>
        <div className="mt-5">
          <TwoFactorSecurityPanel />
        </div>
      </div>
    </main>
  );
}
