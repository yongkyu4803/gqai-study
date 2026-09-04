import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";
import { sendAndLogEmail } from "@/lib/server/email";

const bodySchema = z.object({ messageId: z.string().uuid() });

const kindLabel: Record<string, string> = {
  feedback: "피드백",
  revision_request: "보완 요청",
  final_approval: "최종 승인",
  completion_reopened: "재제출 요청",
};

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { messageId } = bodySchema.parse(await request.json());
    const admin = createSupabaseAdminClient();

    const { data: message, error: messageError } = await admin
      .from("gqai_aistudy_feedback_messages")
      .select("learner_assignment_id, kind, body")
      .eq("id", messageId)
      .single();
    if (messageError || !message) throw messageError ?? new Error("메시지를 찾을 수 없습니다.");
    // Student-authored replies never notify the student about their own message.
    if (message.kind === "student_reply") return NextResponse.json({ sent: 0, skipped: "not_admin_message" });

    const { data: assignment, error: assignmentError } = await admin
      .from("gqai_aistudy_learner_assignments")
      .select("student_id, module_version_id")
      .eq("id", message.learner_assignment_id)
      .single();
    if (assignmentError || !assignment) throw assignmentError ?? new Error("배정을 찾을 수 없습니다.");

    const { data: version, error: versionError } = await admin
      .from("gqai_aistudy_module_versions")
      .select("title_snapshot")
      .eq("id", assignment.module_version_id)
      .single();
    if (versionError || !version) throw versionError ?? new Error("모듈 버전을 찾을 수 없습니다.");

    const { data: recipient, error: profileError } = await admin
      .from("gqai_aistudy_profiles")
      .select("id, email, display_name")
      .eq("id", assignment.student_id)
      .single();
    if (profileError || !recipient) throw profileError ?? new Error("학생을 찾을 수 없습니다.");
    if (!recipient.email) return NextResponse.json({ sent: 0, skipped: "no_email" });

    const label = kindLabel[message.kind] || "피드백";
    const sent = await sendAndLogEmail({
      admin,
      kind: "feedback",
      to: recipient.email,
      subject: `[GQAI Study] "${version.title_snapshot}"에 새 ${label}가 도착했습니다`,
      text: `${recipient.display_name}님, "${version.title_snapshot}" 학습 카드에 강사의 ${label}가 도착했습니다.${
        message.body ? `\n\n내용: ${message.body}` : ""
      }\n\n로그인 후 확인해주세요.`,
      studentId: recipient.id,
      relatedId: messageId,
    });
    return NextResponse.json({ sent: sent ? 1 : 0 });
  } catch (error) {
    return NextResponse.json(
      { error: "알림 이메일을 보내지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
