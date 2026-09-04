import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";

export async function GET() {
  try {
    await requireAdmin();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("gqai_aistudy_account_requests")
      .select("id, display_name, requested_login_id, contact, note, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      requests: (data ?? []).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        requestedLoginId: row.requested_login_id,
        contact: row.contact,
        note: row.note,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "요청 목록을 불러오지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
