import { FeedbackView } from "@/components/student/student-views";
export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <FeedbackView assignmentId={assignmentId} />;
}
