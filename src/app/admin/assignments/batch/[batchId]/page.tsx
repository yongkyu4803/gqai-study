import { BatchDetailView } from "@/components/admin/assignments-view";
export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  return <BatchDetailView batchId={batchId} />;
}
