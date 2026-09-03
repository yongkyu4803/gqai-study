import { SubmissionView } from "@/components/student/student-views";
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <SubmissionView assignmentId={assignmentId} />;
}
