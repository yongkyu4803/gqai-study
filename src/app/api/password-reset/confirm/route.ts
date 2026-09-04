import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { passwordSchema } from "@/lib/domain/validation";

const bodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: passwordSchema,
});

export async function POST(request: Request) {
  try {
    const input = bodySchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const tokenHash = createHash("sha256").update(input.token).digest("hex");

    const { data: reset } = await admin
      .from("gqai_aistudy_password_resets")
      .select("id, profile_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!reset || reset.used_at || new Date(reset.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "링크가 만료되었거나 이미 사용되었습니다. 다시 요청하세요." },
        { status: 400 },
      );
    }

    // Mark used first so a double-submit cannot set the password twice.
    const { data: claimed } = await admin
      .from("gqai_aistudy_password_resets")
      .update({ used_at: new Date().toISOString() })
      .eq("id", reset.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      return NextResponse.json(
        { error: "링크가 이미 사용되었습니다. 다시 요청하세요." },
        { status: 400 },
      );
    }

    const { error: authError } = await admin.auth.admin.updateUserById(reset.profile_id, {
      password: input.password,
    });
    if (authError) throw authError;
    await admin
      .from("gqai_aistudy_profiles")
      .update({ must_change_password: false })
      .eq("id", reset.profile_id);
    await admin.from("gqai_aistudy_activity_events").insert({
      event_name: "student.password_self_reset",
      actor_id: reset.profile_id,
      student_id: reset.profile_id,
      entity_type: "student",
      entity_id: reset.profile_id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "비밀번호를 변경하지 못했습니다." },
      { status: validation ? 400 : 500 },
    );
  }
}
