import { DashboardShell } from "@/components/dashboard-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { DistributorPortal } from "@/components/distributor/distributor-portal";
import { RetailerPortal } from "@/components/retailer/retailer-portal";

export default async function DashboardRolePage({
  params,
}: {
  params: Promise<{ role: "admin" | "distributor" | "retailer" }>;
}) {
  const { role } = await params;
  if (role === "admin") return <AdminDashboard />;
  if (role === "retailer") return <RetailerPortal />;
  if (role === "distributor") return <DistributorPortal />;
  return <DashboardShell role={role} />;
}
