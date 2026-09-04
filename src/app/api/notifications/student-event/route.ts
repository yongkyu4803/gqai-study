import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireUser } from "@/lib/supabase/auth-guard";
import { sendAndLogEmail } from "@/lib/server/email";

const bodySchema = z.object({
  type: z.enum(["submitted", "reply"]),
  assignmentId: z.string().uuid(),
});

// Student → admin direction: "a student submitted" / "a student replied".
// Called by the signed-in student; the assignment must be their own.
export async function POST(request: Request) {
  try {
    const { profile } = await requireUser();
    const { type, assignmentId } = bodySchema.parse(await request.json());
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!adminEmail) return NextResponse.json({ sent: 0, skipped: "no_admin_email" });

    const admin = createSupabaseAdminClient();
    const { data: assignment, error: assignmentError } = await admin
      .from("gqai_aistudy_learner_assignments")
      .select("student_id, module_version_id")
      .eq("id", assignmentId)
      .single();
    if (assignmentError || !assignment) throw assignmentError ?? new Error("배정을 찾을 수 없습니다.");
    if (assignment.student_id !== profile.id) throw new Error("FORBIDDEN");

    const { data: version } = await admin
      .from("gqai_aistudy_module_versions")
      .select("title_snapshot")
      .eq("id", assignment.module_version_id)
      .single();
    const title = version?.title_snapshot ?? "학습 카드";
    const origin = new URL(request.url).origin;

    const sent =
      type === "submitted"
        ? await sendAndLogEmail({
            admin,
            kind: "submission",
            to: adminEmail,
            subject: `[GQAI Study] ${profile.display_name}님이 제출했습니다: ${title}`,
            text: `${profile.display_name}님이 "${title}" 결과물을 제출했습니다.\n\n검토: ${origin}/admin/assignments/${assignmentId}`,
            studentId: profile.id,
            relatedId: assignmentId,
          })
        : await sendAndLogEmail({
            admin,
            kind: "feedback",
            to: adminEmail,
            subject: `[GQAI Study] ${profile.display_name}님의 답글: ${title}`,
            text: `${profile.display_name}님이 "${title}" 피드백에 답글을 남겼습니다.\n\n확인: ${origin}/admin/assignments/${assignmentId}`,
            studentId: profile.id,
            relatedId: assignmentId,
          });
    return NextResponse.json({ sent: sent ? 1 : 0 });
  } catch (error) {
    return NextResponse.json(
      { error: "알림을 보내지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
