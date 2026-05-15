import { DistributorRetailerEditPage } from "@/components/distributor/retailer-management";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DistributorRetailerEditPage id={id} />;
}
