import { GroupDetailView } from "@/components/admin/people-view";
export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupDetailView groupId={groupId} />;
}
