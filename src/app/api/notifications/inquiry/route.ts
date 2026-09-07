import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireUser } from "@/lib/supabase/auth-guard";
import { sendAndLogEmail } from "@/lib/server/email";

const bodySchema = z.object({ messageId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const { profile: caller } = await requireUser();
    const { messageId } = bodySchema.parse(await request.json());
    const admin = createSupabaseAdminClient();

    const { data: message, error: messageError } = await admin
      .from("gqai_aistudy_inquiry_messages")
      .select("student_id, author_id, body")
      .eq("id", messageId)
      .single();
    if (messageError || !message) throw messageError ?? new Error("메시지를 찾을 수 없습니다.");
    // Only the caller who actually wrote this message can trigger its notification.
    if (message.author_id !== caller.id) return NextResponse.json({ sent: 0, skipped: "not_author" });

    const fromStudent = message.author_id === message.student_id;
    const origin = new URL(request.url).origin;

    if (fromStudent) {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (!adminEmail) return NextResponse.json({ sent: 0, skipped: "no_admin_email" });
      const sent = await sendAndLogEmail({
        admin,
        kind: "inquiry",
        to: adminEmail,
        subject: `[GQAI Study] ${caller.display_name}님의 문의`,
        text: `${caller.display_name}님이 문의를 남겼습니다.\n\n"${message.body}"\n\n확인: ${origin}/admin/inquiries/${message.student_id}`,
        studentId: message.student_id,
        relatedId: messageId,
      });
      return NextResponse.json({ sent: sent ? 1 : 0 });
    }

    const { data: student } = await admin
      .from("gqai_aistudy_profiles")
      .select("email, display_name")
      .eq("id", message.student_id)
      .single();
    if (!student?.email) return NextResponse.json({ sent: 0, skipped: "no_email" });
    const sent = await sendAndLogEmail({
      admin,
      kind: "inquiry",
      to: student.email,
      subject: "[GQAI Study] 문의에 답변이 도착했습니다",
      text: `${student.display_name}님, 문의하신 내용에 강사가 답변했습니다.\n\n"${message.body}"\n\n확인: ${origin}/inquiry`,
      studentId: message.student_id,
      relatedId: messageId,
    });
    return NextResponse.json({ sent: sent ? 1 : 0 });
  } catch (error) {
    return NextResponse.json(
      { error: "알림을 보내지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
