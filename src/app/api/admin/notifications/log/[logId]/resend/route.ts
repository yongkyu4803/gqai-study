import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";
import { sendAndLogEmail, type EmailKind } from "@/lib/server/email";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> },
) {
  try {
    await requireAdmin();
    const { logId } = await params;
    const admin = createSupabaseAdminClient();
    const { data: log, error } = await admin
      .from("gqai_aistudy_email_logs")
      .select("kind, recipient_email, subject, body, student_id, related_id")
      .eq("id", logId)
      .single();
    if (error || !log) throw error ?? new Error("발송 기록을 찾을 수 없습니다.");

    const sent = await sendAndLogEmail({
      admin,
      kind: log.kind as EmailKind,
      to: log.recipient_email,
      subject: log.subject,
      text: log.body,
      studentId: log.student_id,
      relatedId: log.related_id,
    });
    return NextResponse.json({ sent });
  } catch (error) {
    return NextResponse.json(
      { error: "다시 보내지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
