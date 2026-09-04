import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailSchema, loginIdSchema } from "@/lib/domain/validation";
import { sendAndLogEmail } from "@/lib/server/email";

const bodySchema = z.object({ loginId: loginIdSchema, email: emailSchema });
const ENDPOINT = "password-reset";
const WINDOW_MINUTES = 15;
const MAX_HITS_PER_WINDOW = 5;
const TOKEN_TTL_MINUTES = 30;

// Always answers 200 with the same message so the form cannot be used to
// probe which login IDs or emails exist.
const GENERIC = { ok: true, message: "입력한 정보와 일치하는 계정이 있으면 재설정 링크를 보냈습니다." };

export async function POST(request: Request) {
  try {
    const input = bodySchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await admin
      .from("gqai_aistudy_public_request_hits")
      .select("id", { count: "exact", head: true })
      .eq("endpoint", ENDPOINT)
      .eq("ip", ip)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_HITS_PER_WINDOW) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
        { status: 429 },
      );
    }
    await admin.from("gqai_aistudy_public_request_hits").insert({ ip, endpoint: ENDPOINT });

    const { data: profile } = await admin
      .from("gqai_aistudy_profiles")
      .select("id, display_name, email, is_active")
      .eq("login_id", input.loginId)
      .maybeSingle();
    if (!profile || !profile.is_active || profile.email !== input.email) {
      return NextResponse.json(GENERIC);
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { error } = await admin.from("gqai_aistudy_password_resets").insert({
      profile_id: profile.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString(),
    });
    if (error) throw error;

    const origin = new URL(request.url).origin;
    await sendAndLogEmail({
      admin,
      kind: "password_reset",
      to: profile.email,
      subject: "[GQAI Study] 비밀번호 재설정 링크",
      text: `${profile.display_name}님, 아래 링크에서 새 비밀번호를 설정하세요. 링크는 ${TOKEN_TTL_MINUTES}분 동안만 유효합니다.\n\n${origin}/reset-password?token=${token}\n\n본인이 요청한 것이 아니라면 이 메일은 무시하세요.`,
      studentId: profile.id,
      relatedId: profile.id,
    });
    return NextResponse.json(GENERIC);
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "요청을 처리하지 못했습니다." },
      { status: validation ? 400 : 500 },
    );
  }
}
