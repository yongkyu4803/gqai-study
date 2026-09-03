import { SubmissionHistoryView } from "@/components/student/student-views";
export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <SubmissionHistoryView assignmentId={assignmentId} />;
}
