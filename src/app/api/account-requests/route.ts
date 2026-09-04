import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { accountRequestSchema } from "@/lib/domain/validation";

export async function POST(request: Request) {
  try {
    const input = accountRequestSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("gqai_aistudy_account_requests").insert({
      display_name: input.displayName,
      contact: input.contact,
      note: input.note || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "요청을 접수하지 못했습니다." },
      { status: validation ? 400 : 500 },
    );
  }
}
