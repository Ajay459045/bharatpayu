"use client";

import { useEffect, useState } from "react";
import { Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export function DistributorPortal() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [retailerForm, setRetailerForm] = useState({
    fullName: "",
    businessName: "",
    mobile: "",
    email: "",
    password: "",
  });
  const [ruleForm, setRuleForm] = useState({
    retailerId: "",
    serviceCategory: "electricity",
    operator: "ALL",
    minAmount: "0",
    maxAmount: "5000",
    retailerType: "percent",
    retailerValue: "2",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [retailerResponse, ruleResponse] = await Promise.all([
      api.get("/distributor/retailers"),
      api.get("/distributor/commission-rules"),
    ]);
    setRetailers(retailerResponse.data.retailers ?? []);
    setRules(ruleResponse.data.rules ?? []);
  }

  async function addRetailer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.post("/distributor/retailers", retailerForm);
    setRetailerForm({
      fullName: "",
      businessName: "",
      mobile: "",
      email: "",
      password: "",
    });
    setStatus("Retailer added under distributor.");
    await load();
  }

  async function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch("/distributor/commission-rules", {
      ...ruleForm,
      minAmount: Number(ruleForm.minAmount),
      maxAmount: Number(ruleForm.maxAmount),
      retailerValue: Number(ruleForm.retailerValue),
    });
    setStatus("Retailer commission rule saved.");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#03091f] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">
          Distributor panel
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">
          Retailers & commission
        </h1>
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <Card>
            <Users className="mb-4 text-blue-300" />
            <h2 className="text-2xl font-bold">Add retailer</h2>
            <form className="mt-5 grid gap-3" onSubmit={addRetailer}>
              {(
                [
                  "fullName",
                  "businessName",
                  "mobile",
                  "email",
                  "password",
                ] as const
              ).map((key) => (
                <Input
                  key={key}
                  type={key === "password" ? "password" : "text"}
                  value={retailerForm[key]}
                  onChange={(event) =>
                    setRetailerForm({
                      ...retailerForm,
                      [key]: event.target.value,
                    })
                  }
                  placeholder={key}
                  required
                />
              ))}
              <Button>Add Retailer</Button>
            </form>
          </Card>
          <Card>
            <Save className="mb-4 text-green-300" />
            <h2 className="text-2xl font-bold">Set retailer commission</h2>
            <form className="mt-5 grid gap-3" onSubmit={saveRule}>
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={ruleForm.retailerId}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, retailerId: event.target.value })
                }
                required
              >
                <option className="bg-slate-950" value="">
                  Select retailer
                </option>
                {retailers.map((retailer) => (
                  <option
                    className="bg-slate-950"
                    key={retailer._id}
                    value={retailer._id}
                  >
                    {retailer.retailerCode} - {retailer.name}
                  </option>
                ))}
              </select>
              <select
                className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                value={ruleForm.serviceCategory}
                onChange={(event) =>
                  setRuleForm({
                    ...ruleForm,
                    serviceCategory: event.target.value,
                  })
                }
              >
                {["electricity", "water", "lpg", "gas", "insurance"].map(
                  (service) => (
                    <option className="bg-slate-950" key={service}>
                      {service}
                    </option>
                  ),
                )}
              </select>
              <Input
                value={ruleForm.operator}
                onChange={(event) =>
                  setRuleForm({
                    ...ruleForm,
                    operator: event.target.value || "ALL",
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={ruleForm.minAmount}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, minAmount: event.target.value })
                  }
                />
                <Input
                  type="number"
                  value={ruleForm.maxAmount}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, maxAmount: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="h-11 rounded-md border border-white/10 bg-white/8 px-3 text-sm"
                  value={ruleForm.retailerType}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      retailerType: event.target.value,
                    })
                  }
                >
                  <option className="bg-slate-950" value="percent">
                    Percent
                  </option>
                  <option className="bg-slate-950" value="flat">
                    Flat Rs
                  </option>
                </select>
                <Input
                  type="number"
                  value={ruleForm.retailerValue}
                  onChange={(event) =>
                    setRuleForm({
                      ...ruleForm,
                      retailerValue: event.target.value,
                    })
                  }
                />
              </div>
              <Button>Save Commission</Button>
            </form>
          </Card>
        </div>
        {status && (
          <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            {status}
          </p>
        )}
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="text-xl font-bold">My retailers</h2>
            <div className="mt-4 grid gap-2">
              {retailers.map((retailer) => (
                <p
                  key={retailer._id}
                  className="rounded-md bg-white/5 p-3 text-sm"
                >
                  {retailer.retailerCode} - {retailer.name} - {retailer.mobile}
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold">Custom rules</h2>
            <div className="mt-4 grid gap-2">
              {rules.map((rule) => (
                <p key={rule._id} className="rounded-md bg-white/5 p-3 text-sm">
                  {rule.serviceCategory} {rule.minAmount}-{rule.maxAmount}:{" "}
                  {rule.retailerValue} {rule.retailerType}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
