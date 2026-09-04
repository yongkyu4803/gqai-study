import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";

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
    const { error } = await admin
      .from("gqai_aistudy_account_requests")
      .update({
        status: input.status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "요청을 처리하지 못했습니다." },
      { status: validation ? 400 : adminGuardStatus(error) },
    );
  }
}
