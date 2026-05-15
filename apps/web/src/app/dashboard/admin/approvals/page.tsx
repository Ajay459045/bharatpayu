"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileImage,
  MapPin,
  RotateCcw,
  ShieldX,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type ApprovalRequest = {
  id: string;
  fullName: string;
  businessName: string;
  mobile: string;
  email: string;
  retailerCode?: string;
  role?: "retailer" | "distributor";
  address: {
    state: string;
    district: string;
    fullAddress: string;
    pincode: string;
  };
  documents: {
    panImage?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    selfie?: string;
  };
  location: {
    latitude?: number;
    longitude?: number;
    ipAddress?: string;
    deviceInfo?: Record<string, unknown>;
  };
  approvalStatus: string;
  emailVerified?: boolean;
};

export default function AdminApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/retailer-approvals");
      setRequests(data.requests ?? []);
    } catch (requestError: any) {
      const message =
        requestError?.response?.status === 401
          ? "Admin session expired. Please login again to view approval requests."
          : (requestError?.response?.data?.error?.message ??
            requestError?.message ??
            "Could not load approval requests.");
      setRequests([]);
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }

  async function action(id: string, approvalStatus: string) {
    await api.patch(`/admin/retailer-approvals/${id}`, {
      approvalStatus,
      rejectionReason: reason,
    });
    setRequests((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
            Admin control
          </p>
          <h1 className="text-3xl font-bold">User approval requests</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadApprovals}>
              Refresh Requests
            </Button>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              {requests.length} pending
            </span>
          </div>
        </div>
        {loading && <Card>Loading approval requests...</Card>}
        {error && (
          <Card className="border-red-400/20 bg-red-500/10 text-red-100">
            {error}
          </Card>
        )}
        {!loading && !error && requests.length === 0 && (
          <Card>
            <h2 className="text-xl font-bold">No pending approvals</h2>
            <p className="mt-2 text-sm text-slate-300">
              New retailer and distributor registrations will appear here after
              form submission.
            </p>
          </Card>
        )}
        <div className="grid gap-5">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"
            >
              <section>
                <span className="rounded-full bg-orange-400/15 px-3 py-1 text-sm text-orange-100">
                  {request.approvalStatus}
                </span>
                {request.role && (
                  <span className="ml-2 rounded-full bg-blue-400/15 px-3 py-1 text-sm capitalize text-blue-100">
                    {request.role}
                  </span>
                )}
                <span
                  className={`ml-2 rounded-full px-3 py-1 text-sm ${request.emailVerified ? "bg-green-400/15 text-green-100" : "bg-yellow-400/15 text-yellow-100"}`}
                >
                  {request.emailVerified ? "Email verified" : "OTP pending"}
                </span>
                <h2 className="mt-4 text-2xl font-bold">{request.fullName}</h2>
                <p className="text-slate-300">{request.businessName}</p>
                <div className="mt-5 grid gap-2 text-sm text-slate-300">
                  <p>
                    {request.role === "distributor"
                      ? "Distributor"
                      : "Retailer"}{" "}
                    ID: {request.retailerCode ?? "-"}
                  </p>
                  <p>Mobile: {request.mobile}</p>
                  <p>Email: {request.email}</p>
                  <p>State: {request.address.state}</p>
                  <p>District: {request.address.district}</p>
                  <p>Address: {request.address.fullAddress}</p>
                  <p>Pincode: {request.address.pincode}</p>
                </div>
                <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-4 text-sm">
                  <MapPin className="mb-2 text-green-300" size={18} />
                  <p>
                    Lat/Lng: {request.location.latitude},{" "}
                    {request.location.longitude}
                  </p>
                  <p>IP: {request.location.ipAddress}</p>
                  <p className="mt-2 break-words text-slate-400">
                    Device: {JSON.stringify(request.location.deviceInfo ?? {})}
                  </p>
                  {request.location.latitude && request.location.longitude && (
                    <a
                      className="mt-3 inline-block text-blue-200"
                      target="_blank"
                      href={`https://www.google.com/maps?q=${request.location.latitude},${request.location.longitude}`}
                    >
                      Open Google Maps preview
                    </a>
                  )}
                </div>
              </section>
              <section>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries({
                    panImage: "PAN image",
                    aadhaarFront: "Aadhaar front",
                    aadhaarBack: "Aadhaar back",
                    selfie: "Selfie",
                  }).map(([key, label]) => (
                    <div
                      key={key}
                      className="rounded-md border border-white/10 bg-white/5 p-3"
                    >
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <FileImage size={15} /> {label}
                      </p>
                      {request.documents[
                        key as keyof ApprovalRequest["documents"]
                      ] ? (
                        <img
                          src={
                            request.documents[
                              key as keyof ApprovalRequest["documents"]
                            ]
                          }
                          alt={`${label} preview`}
                          className="h-32 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="grid h-32 place-items-center rounded-md bg-white/5 text-sm text-slate-400">
                          No preview
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-3">
                  <Input
                    placeholder="Rejection or re-request reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => action(request.id, "approved")}>
                      <CheckCircle2 size={16} /> Approve{" "}
                      {request.role === "distributor"
                        ? "Distributor"
                        : "Retailer"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => action(request.id, "rejected")}
                    >
                      <ShieldX size={16} /> Reject
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => action(request.id, "suspended")}
                    >
                      <UserX size={16} /> Suspend
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => action(request.id, "documents_requested")}
                    >
                      <RotateCcw size={16} /> Re-request Documents
                    </Button>
                  </div>
                </div>
              </section>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
