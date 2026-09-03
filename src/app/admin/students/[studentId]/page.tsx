import { StudentDetailView } from "@/components/admin/people-view";
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentDetailView studentId={studentId} />;
}
