import { AdminUserDetailPage } from "@/components/admin/user-management";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetailPage id={id} />;
}
