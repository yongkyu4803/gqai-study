import { InquiryThreadView } from "@/components/admin/inquiries-view";
export default async function AdminInquiryThreadPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <InquiryThreadView studentId={studentId} />;
}
