"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function AdminSettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/admin/security-settings")
      .then(({ data }) => setEnabled(data.settings?.loginOtpEnabled !== false))
      .catch(() => setMessage("Unable to load current OTP setting. Login as admin and try again."));
  }, []);

  async function save(next: boolean) {
    setEnabled(next);
    setMessage("Saving...");
    await api.patch("/admin/security-settings", { loginOtpEnabled: next });
    setMessage(next ? "Login OTP verification enabled." : "Login OTP verification disabled.");
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">Security settings</p>
        <h1 className="mt-2 text-3xl font-bold">Admin controls</h1>
        <Card className="mt-6">
          <ShieldCheck className="mb-4 text-green-300" />
          <h2 className="text-xl font-semibold">Enable Login OTP Verification</h2>
          <p className="mt-2 text-sm text-slate-300">When ON, every password login requires an email OTP before dashboard access. When OFF, users enter directly after password verification.</p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => save(true)} variant={enabled ? "primary" : "secondary"}>ON</Button>
            <Button onClick={() => save(false)} variant={!enabled ? "primary" : "secondary"}>OFF</Button>
          </div>
          {message && <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
        </Card>
      </div>
    </main>
  );
}
