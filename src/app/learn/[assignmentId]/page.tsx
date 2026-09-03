import { LearningDetailView } from "@/components/student/student-views";
export default async function LearnDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <LearningDetailView assignmentId={assignmentId} />;
}
