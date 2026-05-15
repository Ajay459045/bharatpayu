import { DynamicBbpsPage } from "@/components/retailer/dynamic-bbps-page";

export default async function RetailerBbpsServicePage({
  params,
}: {
  params: Promise<{ service: string }>;
}) {
  const { service } = await params;
  return <DynamicBbpsPage serviceKey={service} />;
}
