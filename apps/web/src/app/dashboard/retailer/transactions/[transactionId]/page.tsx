import { RetailerTransactionDetailPage } from "@/components/retailer/retailer-pages";

export default async function RetailerTransactionDetailRoute({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return <RetailerTransactionDetailPage transactionId={transactionId} />;
}
