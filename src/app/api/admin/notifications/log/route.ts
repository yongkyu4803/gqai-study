import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";

export async function GET() {
  try {
    await requireAdmin();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("gqai_aistudy_email_logs")
      .select("id, kind, recipient_email, subject, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({
      logs: (data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind,
        recipientEmail: row.recipient_email,
        subject: row.subject,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "발송 로그를 불러오지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
