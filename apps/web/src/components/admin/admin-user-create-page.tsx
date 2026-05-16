"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export function AdminUserCreatePage({
  role,
}: {
  role: "retailer" | "distributor";
}) {
  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    mobile: "",
    email: "",
    password: "",
    state: "",
    district: "",
    fullAddress: "",
    pincode: "",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    setError("");
    try {
      const { data } = await api.patch("/admin/users", { ...form, role });
      setStatus(
        `${role === "retailer" ? "Retailer" : "Distributor"} created: ${
          data.user?.retailerCode ?? data.user?.email
        }`,
      );
      setForm({
        fullName: "",
        businessName: "",
        mobile: "",
        email: "",
        password: "",
        state: "",
        district: "",
        fullAddress: "",
        pincode: "",
      });
    } catch (requestError: any) {
      const message =
        requestError?.response?.data?.error?.message ??
        requestError?.message ??
        "Could not create user.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setSubmitting(false);
    }
  }

  const title = role === "retailer" ? "Add retailer" : "Add distributor";

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(11,92,255,.18),transparent_28rem),radial-gradient(circle_at_86%_16%,rgba(255,138,0,.12),transparent_26rem)]" />
      <div className="relative mx-auto max-w-4xl">
        <Link href="/dashboard/admin">
          <Button variant="secondary">
            <ArrowLeft size={16} /> Admin Dashboard
          </Button>
        </Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
          Manual onboarding
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">{title}</h1>
        <Card className="mt-6 border-blue-300/15 bg-white/[0.055]">
          <UserPlus className="mb-4 text-blue-300" />
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Full name"
                required
              />
              <Input
                value={form.businessName}
                onChange={(event) => update("businessName", event.target.value)}
                placeholder="Business name"
                required
              />
              <Input
                value={form.mobile}
                onChange={(event) => update("mobile", event.target.value)}
                placeholder="Mobile number"
                required
              />
              <Input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="Email"
                required
              />
              <Input
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="Temporary password"
                required
              />
              <Input
                value={form.pincode}
                onChange={(event) => update("pincode", event.target.value)}
                placeholder="Pincode"
              />
              <Input
                value={form.state}
                onChange={(event) => update("state", event.target.value)}
                placeholder="State"
              />
              <Input
                value={form.district}
                onChange={(event) => update("district", event.target.value)}
                placeholder="District"
              />
            </div>
            <Input
              value={form.fullAddress}
              onChange={(event) => update("fullAddress", event.target.value)}
              placeholder="Full address"
            />
            <Button disabled={submitting}>
              {submitting ? "Creating..." : title}
            </Button>
          </form>
          {status && (
            <p className="mt-4 rounded-md bg-green-500/10 p-3 text-sm text-green-100">
              {status}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
