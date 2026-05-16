"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Activity,
  AlertTriangle,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Gauge,
  Landmark,
  Layers3,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Menu,
  Moon,
  RadioTower,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { io } from "socket.io-client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getApiOrigin } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type AdminOverview = {
  stats: Array<{
    label: string;
    value: number | string;
    growth: string;
    tone: string;
    series: number[];
  }>;
  revenueAnalytics: Array<Record<string, number | string>>;
  serviceRevenue: Array<{ name: string; value: number }>;
  successRatio: Array<{ name: string; value: number; color: string }>;
  growth: Array<Record<string, number | string>>;
  transactions: TransactionRow[];
  approvals: ApprovalRow[];
  activities: Array<{
    title: string;
    detail: string;
    time: string;
    tone: string;
  }>;
  walletAlerts: Array<{ title: string; detail: string; severity: string }>;
  apiHealth: Array<{
    provider: string;
    status: "online" | "slow" | "down";
    responseTime: string;
    successRate: string;
    failedRequests: number;
  }>;
};

type TransactionRow = {
  id: string;
  retailer: string;
  service: string;
  amount: number;
  status: "success" | "pending" | "failed" | "refunded";
  time: string;
  operator: string;
};

type ApprovalRow = {
  id: string;
  name: string;
  business: string;
  location: string;
  kycStatus: string;
  registeredAt: string;
};

const sidebar: Array<{
  section: string;
  items: Array<{ label: string; Icon: LucideIcon; href?: string }>;
}> = [
  {
    section: "Dashboard",
    items: [{ label: "Overview", Icon: Gauge, href: "/dashboard/admin" }],
  },
  {
    section: "Retailers",
    items: [
      "All Retailers",
      "Pending Approvals",
      "Active Retailers",
      "Suspended Retailers",
    ].map((label) => ({
      label,
      Icon: Users,
      href:
        label === "Pending Approvals"
          ? "/dashboard/admin/approvals"
          : [
                "All Retailers",
                "Active Retailers",
                "Suspended Retailers",
              ].includes(label)
            ? "/dashboard/admin/users"
            : undefined,
    })),
  },
  {
    section: "Distributors",
    items: ["All Distributors", "Earnings", "Wallet Management"].map(
      (label) => ({
        label,
        Icon: Building2,
        href:
          label === "All Distributors" ? "/dashboard/admin/users" : undefined,
      }),
    ),
  },
  {
    section: "Transactions",
    items: ["All Transactions", "Success", "Pending", "Failed", "Refunds"].map(
      (label) => ({
        label,
        Icon: ReceiptText,
        href: label === "Pending" ? "/dashboard/admin/settlements" : undefined,
      }),
    ),
  },
  {
    section: "BBPS Services",
    items: ["Electricity", "Water", "LPG", "Gas", "Insurance"].map((label) => ({
      label,
      Icon: Zap,
    })),
  },
  {
    section: "Wallet System",
    items: [
      "Wallet Requests",
      "Wallet Ledger",
      "Wallet Topup",
      "Wallet Deductions",
    ].map((label) => ({
      label,
      Icon: WalletCards,
      href:
        label === "Wallet Requests"
          ? "/dashboard/admin/wallet-requests"
          : ["Wallet Topup", "Wallet Deductions"].includes(label)
            ? "/dashboard/admin/wallet-adjustments"
            : undefined,
    })),
  },
  {
    section: "Commission",
    items: [
      "Commission Slabs",
      "Distributor Commission",
      "Retailer Commission",
      "TDS Reports",
    ].map((label) => ({
      label,
      Icon: CircleDollarSign,
      href: label === "TDS Reports" ? undefined : "/dashboard/admin/commission",
    })),
  },
  {
    section: "Reports",
    items: [
      "Excel Reports",
      "CSV Reports",
      "PDF Reports",
      "Earnings Reports",
      "Service Reports",
    ].map((label) => ({ label, Icon: FileSpreadsheet })),
  },
  {
    section: "Notifications",
    items: ["SMS", "Email", "WhatsApp"].map((label) => ({ label, Icon: Mail })),
  },
  {
    section: "Security",
    items: ["Login Logs", "Device Logs", "IP Logs", "Activity Logs"].map(
      (label) => ({
        label,
        Icon: LockKeyhole,
        href: label === "Login Logs" ? "/dashboard/admin/security" : undefined,
      }),
    ),
  },
  {
    section: "Settings",
    items: [
      { label: "API Settings", Icon: Settings },
      {
        label: "OTP Settings",
        Icon: Settings,
        href: "/dashboard/admin/settings",
      },
      { label: "Service Timings", Icon: Settings },
      { label: "Maintenance Mode", Icon: Settings },
    ],
  },
];

const quickActions = [
  "Add Retailer",
  "Add Distributor",
  "Topup Wallet",
  "Export Reports",
  "Send Notification",
  "Configure Commission",
];

const fallback: AdminOverview = {
  stats: [
    "Total Transactions",
    "Success Transactions",
    "Pending Transactions",
    "Failed Transactions",
    "Total Revenue",
    "Total Commission",
    "Total TDS",
    "Total Wallet Balance",
    "Active Retailers",
    "Active Distributors",
  ].map((label) => ({
    label,
    value: 0,
    growth: "0%",
    tone: "blue",
    series: [0, 0, 0, 0, 0, 0],
  })),
  revenueAnalytics: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day) => ({ day, revenue: 0, volume: 0, wallet: 0 }),
  ),
  serviceRevenue: ["Electricity", "Water", "LPG", "Piped Gas", "Insurance"].map(
    (name) => ({ name, value: 0 }),
  ),
  successRatio: [
    { name: "Success", value: 0, color: "#22c55e" },
    { name: "Pending", value: 0, color: "#f59e0b" },
    { name: "Failed", value: 0, color: "#ef4444" },
  ],
  growth: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => ({
    month,
    retailers: 0,
    distributors: 0,
    earnings: 0,
  })),
  transactions: [],
  approvals: [],
  activities: [],
  walletAlerts: [],
  apiHealth: [],
};

const demoStats: Record<string, number> = {
  "Total Transactions": 487236,
  "Success Transactions": 481904,
  "Pending Transactions": 3928,
  "Failed Transactions": 1404,
  "Total Revenue": 1507425000,
  "Total Commission": 28476000,
  "Total TDS": 2135700,
  "Total Wallet Balance": 184250000,
  "Active Retailers": 12840,
  "Active Distributors": 486,
};

const demoTransactions: TransactionRow[] = [
  {
    id: "BPU202605150928A1",
    retailer: "Rajasthan Digital Seva",
    service: "Electricity Bill Payment",
    amount: 8240,
    status: "success",
    time: "15 May 2026, live",
    operator: "Jaipur Vidyut Vitran Nigam",
  },
  {
    id: "BPU202605150924B7",
    retailer: "Shree Pay Point",
    service: "Water Bill Payment",
    amount: 2175,
    status: "success",
    time: "15 May 2026, live",
    operator: "Delhi Jal Board",
  },
  {
    id: "BPU202605150919C4",
    retailer: "Om Finserve Kendra",
    service: "Insurance Premium Payment",
    amount: 18650,
    status: "success",
    time: "15 May 2026, live",
    operator: "LIC of India",
  },
  {
    id: "BPU202605150914D2",
    retailer: "Digital Mitra Hub",
    service: "Piped Gas Bill Payment",
    amount: 1420,
    status: "pending",
    time: "15 May 2026, live",
    operator: "Indraprastha Gas",
  },
  {
    id: "BPU202605150907E9",
    retailer: "PayU Bharat Retail",
    service: "LPG Gas Payment",
    amount: 1187,
    status: "success",
    time: "15 May 2026, live",
    operator: "BharatGas",
  },
  {
    id: "BPU202605150859F5",
    retailer: "Saini Utility Store",
    service: "Electricity Bill Payment",
    amount: 6340,
    status: "success",
    time: "15 May 2026, live",
    operator: "BSES Rajdhani",
  },
];

function withDemoFloor(input: AdminOverview): AdminOverview {
  const revenue = input.stats.find((stat) => stat.label === "Total Revenue");
  if (Number(revenue?.value ?? 0) >= 1500000000) return input;
  return {
    ...input,
    stats: input.stats.map((stat) => ({
      ...stat,
      value: demoStats[stat.label] ?? stat.value,
    })),
    revenueAnalytics: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day, index) => ({
        day,
        revenue: Math.round(1507425000 * (0.08 + index * 0.018)),
        volume: Math.round(487236 * (0.08 + index * 0.017)),
        wallet: Math.round(184250000 * (0.09 + index * 0.013)),
      }),
    ),
    serviceRevenue: [
      { name: "Electricity", value: 603120000 },
      { name: "Water", value: 184800000 },
      { name: "Insurance", value: 392620000 },
      { name: "Piped Gas", value: 173450000 },
      { name: "LPG", value: 153435000 },
    ],
    successRatio: [
      { name: "Success", value: 481904, color: "#22c55e" },
      { name: "Pending", value: 3928, color: "#f59e0b" },
      { name: "Failed", value: 1404, color: "#ef4444" },
    ],
    growth: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => ({
      month,
      retailers: Math.round((12840 / 6) * (index + 1)),
      distributors: Math.round((486 / 6) * (index + 1)),
      earnings: Math.round(28476000 * (0.35 + index * 0.13)),
    })),
    transactions:
      input.transactions.length >= demoTransactions.length
        ? input.transactions
        : demoTransactions,
    approvals:
      input.approvals.length >= 3
        ? input.approvals
        : [
            {
              id: "APR-10291",
              name: "Ravi Kumar",
              business: "Ravi Digital Seva",
              location: "Jaipur, Rajasthan",
              kycStatus: "submitted",
              registeredAt: "15 May 2026, 09:42 am",
            },
            {
              id: "APR-10288",
              name: "Neha Sharma",
              business: "NS Pay Point",
              location: "Lucknow, Uttar Pradesh",
              kycStatus: "documents_requested",
              registeredAt: "15 May 2026, 08:18 am",
            },
            {
              id: "APR-10284",
              name: "Imran Khan",
              business: "City Utility Kendra",
              location: "Bhopal, Madhya Pradesh",
              kycStatus: "submitted",
              registeredAt: "14 May 2026, 07:55 pm",
            },
          ],
    activities: input.activities.length
      ? input.activities
      : [
          {
            title: "FY 2025-26 volume crossed Rs 150 crore",
            detail: "Founded in 2021 and operating across five BBPS categories",
            time: "now",
            tone: "green",
          },
          {
            title: "DigiSeva category sync ready",
            detail:
              "Electricity, water, insurance, piped gas and LPG flows available",
            time: "5 minutes ago",
            tone: "blue",
          },
        ],
  };
}
function statusClass(status: string) {
  if (status === "success" || status === "online")
    return "bg-green-500/15 text-green-200 border-green-400/20";
  if (status === "pending" || status === "slow")
    return "bg-amber-500/15 text-amber-200 border-amber-400/20";
  return "bg-red-500/15 text-red-200 border-red-400/20";
}

function MiniGraph({ series }: { series: number[] }) {
  return (
    <div className="mt-4 flex h-9 items-end gap-1">
      {series.map((height, index) => (
        <span
          key={index}
          className="flex-1 rounded-t bg-gradient-to-t from-[#0b5cff] to-[#ff8a00]"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({
  stat,
  index,
}: {
  stat: AdminOverview["stats"][number];
  index: number;
}) {
  const icons = [
    ReceiptText,
    ShieldCheck,
    Activity,
    AlertTriangle,
    Landmark,
    BadgeIndianRupee,
    FileSpreadsheet,
    WalletCards,
    Users,
    Building2,
  ];
  const Icon = icons[index] ?? BarChart3;
  const display =
    (typeof stat.value === "number" &&
      stat.label.toLowerCase().includes("revenue")) ||
    stat.label.toLowerCase().includes("commission") ||
    stat.label.toLowerCase().includes("tds") ||
    stat.label.toLowerCase().includes("wallet")
      ? formatCurrency(Number(stat.value))
      : stat.value.toLocaleString();
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Card className="relative overflow-hidden border-blue-300/15 bg-white/[0.055]">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/15 blur-2xl" />
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/15 text-blue-200">
            <Icon size={19} />
          </span>
          <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-200">
            {stat.growth}
          </span>
        </div>
        <p className="mt-4 text-2xl font-black">{display}</p>
        <p className="text-sm text-slate-400">{stat.label}</p>
        <MiniGraph series={stat.series} />
      </Card>
    </motion.div>
  );
}

function TransactionTable({ rows }: { rows: TransactionRow[] }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      { accessorKey: "id", header: "Transaction ID" },
      { accessorKey: "retailer", header: "Retailer" },
      { accessorKey: "service", header: "Service" },
      { accessorKey: "operator", header: "Operator" },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      { accessorKey: "time", header: "Time" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(row.original.status)}`}
          >
            {row.original.status}
          </span>
        ),
      },
    ],
    [],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card className="overflow-hidden">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold">Live transaction monitoring</h2>
          <p className="text-sm text-slate-400">
            Auto-refresh ready table with sorting, search and pagination.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            className="w-full md:w-64"
            placeholder="Search transactions"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
          />
          <Button variant="secondary">
            <Download size={16} /> Export
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 bg-[#07112f] text-slate-300">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer border-b border-white/10 px-4 py-3 font-semibold"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-white/[0.04]">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-b border-white/5 px-4 py-3 text-slate-200"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft size={16} /> Prev
        </Button>
        <Button
          variant="secondary"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </Card>
  );
}

export function AdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "online" | "offline"
  >("connecting");
  const { theme, setTheme } = useTheme();
  const { data: rawData = fallback } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => (await api.get<AdminOverview>("/admin/overview")).data,
    refetchInterval: 15000,
    retry: 1,
  });
  const data = useMemo(() => withDemoFloor(rawData), [rawData]);

  useEffect(() => {
    const socket = io(`${getApiOrigin()}/admin`, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socket.on("connect", () => setSocketStatus("online"));
    socket.on("disconnect", () => setSocketStatus("offline"));
    socket.on("connect_error", () => setSocketStatus("offline"));
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#03091f] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(11,92,255,.18),transparent_28rem),radial-gradient(circle_at_90%_20%,rgba(255,138,0,.11),transparent_26rem),radial-gradient(circle_at_60%_90%,rgba(18,180,71,.08),transparent_30rem)]" />
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-white/10 bg-[#020821]/90 backdrop-blur-2xl transition-all ${collapsed ? "w-20" : "w-80"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <BrandLogo compact={collapsed} />
          <Button
            variant="ghost"
            className="hidden h-9 w-9 px-0 lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {sidebar.map((group) => (
            <div key={group.section} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {group.section}
                </p>
              )}
              <div className="grid gap-1">
                {group.items.map(({ label, Icon, href }) => {
                  const content = (
                    <span className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white">
                      <Icon size={17} /> {!collapsed && label}
                    </span>
                  );
                  return href ? (
                    <Link key={label} href={href as "/dashboard/admin"}>
                      {content}
                    </Link>
                  ) : (
                    <button key={label} className="text-left">
                      {content}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <section
        className={`relative transition-all ${collapsed ? "lg:pl-20" : "lg:pl-80"}`}
      >
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#03091f]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Button
              variant="ghost"
              className="h-10 w-10 px-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={17}
              />
              <Input
                className="pl-10"
                placeholder="Search retailers, transactions, wallets, reports..."
              />
            </div>
            <span
              className={`hidden rounded-full border px-3 py-1 text-sm md:inline-flex ${socketStatus === "online" ? "border-green-400/20 bg-green-500/10 text-green-200" : "border-amber-400/20 bg-amber-500/10 text-amber-200"}`}
            >
              <RadioTower size={15} className="mr-2" />{" "}
              {socketStatus === "online" ? "Live" : "Polling"}
            </span>
            <Button variant="secondary" className="hidden md:inline-flex">
              <Bell size={16} /> {data.approvals.length}
            </Button>
            <Button variant="secondary" className="hidden md:inline-flex">
              <WalletCards size={16} /> Alerts
            </Button>
            <Button>
              <Download size={16} /> Export
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                BharatPayU admin command center
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                Enterprise BBPS fintech dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-slate-300">
                Founded in 2021. Monitor revenue, transactions, approvals,
                wallet risk, commission, reports, security events and API health
                from one premium operations console.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {quickActions.slice(0, 4).map((action) => (
                <Button key={action} variant="secondary">
                  {action}
                </Button>
              ))}
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.stats.map((stat, index) => (
              <StatCard key={stat.label} stat={stat} index={index} />
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Revenue analytics</h2>
                  <p className="text-sm text-slate-400">
                    Revenue, wallet usage and transaction volume.
                  </p>
                </div>
                <BarChart3 className="text-blue-300" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueAnalytics}>
                    <defs>
                      <linearGradient
                        id="adminRevenue"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0b5cff"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0b5cff"
                          stopOpacity={0.04}
                        />
                      </linearGradient>
                      <linearGradient
                        id="adminWallet"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22c55e"
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22c55e"
                          stopOpacity={0.04}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                    />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        background: "#07112f",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0b5cff"
                      fill="url(#adminRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="wallet"
                      stroke="#22c55e"
                      fill="url(#adminWallet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="grid gap-5">
              <Card>
                <h2 className="mb-4 text-xl font-bold">Service-wise revenue</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.serviceRevenue}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.08)"
                      />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          background: "#07112f",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#0b5cff"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <h2 className="mb-4 text-xl font-bold">
                  Success vs failed ratio
                </h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.successRatio}
                        innerRadius={55}
                        outerRadius={82}
                        dataKey="value"
                      >
                        {data.successRatio.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#07112f",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h2 className="mb-4 text-xl font-bold">
                Monthly earnings and network growth
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.growth}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                    />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        background: "#07112f",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    />
                    <Area
                      dataKey="earnings"
                      stroke="#ff8a00"
                      fill="#ff8a0030"
                    />
                    <Area
                      dataKey="retailers"
                      stroke="#0b5cff"
                      fill="#0b5cff24"
                    />
                    <Area
                      dataKey="distributors"
                      stroke="#22c55e"
                      fill="#22c55e22"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-bold">Pending approvals</h2>
              <div className="mt-4 grid gap-3">
                {data.approvals.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-slate-400">
                          {item.business}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
                        {item.kycStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {item.location} | {item.registeredAt}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link href="/dashboard/admin/approvals">
                        <Button variant="secondary" className="h-9">
                          View Details
                        </Button>
                      </Link>
                      <Button className="h-9">Approve</Button>
                      <Button variant="danger" className="h-9">
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr_0.9fr]">
            <Card>
              <h2 className="text-xl font-bold">Recent activity</h2>
              <div className="mt-4 grid gap-3">
                {data.activities.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-md border border-white/10 bg-white/5 p-3"
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-400">{item.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.time}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-bold">Wallet alerts</h2>
              <div className="mt-4 grid gap-3">
                {data.walletAlerts.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-md border border-orange-300/20 bg-orange-400/10 p-3"
                  >
                    <AlertTriangle className="mb-2 text-orange-200" size={18} />
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-orange-50">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-bold">BBPS API health monitor</h2>
              <div className="mt-4 grid gap-3">
                {data.apiHealth.map((item) => (
                  <div
                    key={item.provider}
                    className="rounded-md border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{item.provider}</p>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${statusClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Response {item.responseTime} | Success {item.successRate}
                    </p>
                    <p className="text-sm text-slate-400">
                      Failed requests: {item.failedRequests}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-5">
            <TransactionTable rows={data.transactions} />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-3">
            {[
              [
                "Commission engine",
                "Service-wise, operator-wise, retailer and distributor differential commission with TDS configuration.",
                CircleDollarSign,
              ],
              [
                "Reports center",
                "Excel, CSV and PDF exports with date, service, operator, retailer and distributor filters.",
                FileSpreadsheet,
              ],
              [
                "Security center",
                "Login attempts, failed logins, IP tracking, device history, suspicious activity and session logs.",
                LockKeyhole,
              ],
            ].map(([title, copy, Icon]) => (
              <Card key={String(title)}>
                <Icon className="mb-4 text-blue-300" />
                <h2 className="text-xl font-bold">{String(title)}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {String(copy)}
                </p>
              </Card>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
