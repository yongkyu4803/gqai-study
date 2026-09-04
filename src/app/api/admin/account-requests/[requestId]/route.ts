import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";
import { sendAndLogEmail } from "@/lib/server/email";

const patchSchema = z.object({
  status: z.enum(["approved", "dismissed"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { user } = await requireAdmin();
    const { requestId } = await params;
    const input = patchSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data: updated, error } = await admin
      .from("gqai_aistudy_account_requests")
      .update({
        status: input.status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("display_name, contact")
      .single();
    if (error) throw error;

    if (input.status === "approved" && updated) {
      await sendAndLogEmail({
        admin,
        kind: "account_request",
        to: updated.contact,
        subject: "[GQAI Study] 계정 발급 요청이 승인되었습니다",
        text: `${updated.display_name}님, 계정 발급 요청이 승인되었습니다.\n\n강사가 아이디와 임시 비밀번호를 곧 별도로 전달할 예정입니다.`,
        relatedId: requestId,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "요청을 처리하지 못했습니다." },
      { status: validation ? 400 : adminGuardStatus(error) },
    );
  }
}
