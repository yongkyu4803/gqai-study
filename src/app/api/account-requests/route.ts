import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ACCOUNT_POLICY_VERSION } from "@/lib/domain/account-policy";
import { accountRequestSchema, toAuthEmail } from "@/lib/domain/validation";
import { sendAndLogEmail } from "@/lib/server/email";

const ENDPOINT = "account-requests";
const WINDOW_MINUTES = 10;
const MAX_HITS_PER_WINDOW = 5;

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  let createdUserId: string | undefined;
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    // Honeypot: real users never see or fill this field. Bots that do get a
    // convincing success response and nothing is stored or emailed.
    if (typeof raw.website === "string" && raw.website.trim()) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    const input = accountRequestSchema.parse(raw);
    const admin = createSupabaseAdminClient();
    const ip = clientIp(request);

    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count: recentHits } = await admin
      .from("gqai_aistudy_public_request_hits")
      .select("id", { count: "exact", head: true })
      .eq("endpoint", ENDPOINT)
      .eq("ip", ip)
      .gte("created_at", since);
    if ((recentHits ?? 0) >= MAX_HITS_PER_WINDOW) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." },
        { status: 429 },
      );
    }
    await admin
      .from("gqai_aistudy_public_request_hits")
      .insert({ ip, endpoint: ENDPOINT });

    const [
      { data: pendingEmailRequest },
      { data: pendingLoginRequest },
      { data: existingLoginProfile },
      { data: existingEmailProfile },
    ] = await Promise.all([
      admin
        .from("gqai_aistudy_account_requests")
        .select("id")
        .eq("contact", input.email)
        .eq("status", "pending")
        .maybeSingle(),
      admin
        .from("gqai_aistudy_account_requests")
        .select("id")
        .eq("requested_login_id", input.loginId)
        .eq("status", "pending")
        .maybeSingle(),
      admin
        .from("gqai_aistudy_profiles")
        .select("id")
        .eq("login_id", input.loginId)
        .maybeSingle(),
      admin
        .from("gqai_aistudy_profiles")
        .select("id")
        .eq("email", input.email)
        .maybeSingle(),
    ]);
    if (pendingEmailRequest || pendingLoginRequest) {
      return NextResponse.json(
        { error: "이미 접수된 요청입니다. 강사의 확인을 기다려주세요." },
        { status: 409 },
      );
    }
    if (existingLoginProfile) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다. 다른 아이디를 입력하세요." },
        { status: 409 },
      );
    }
    if (existingEmailProfile) {
      return NextResponse.json(
        { error: "이미 계정에 등록된 이메일입니다." },
        { status: 409 },
      );
    }

    const { data: authResult, error: authError } =
      await admin.auth.admin.createUser({
        email: toAuthEmail(input.loginId),
        password: input.password,
        email_confirm: true,
        ban_duration: "876000h",
        user_metadata: {
          login_id: input.loginId,
          display_name: input.displayName,
          account_status: "pending_approval",
        },
      });
    if (authError || !authResult.user) {
      const duplicate =
        authError?.message.toLowerCase().includes("already") ||
        authError?.status === 422;
      return NextResponse.json(
        {
          error: duplicate
            ? "이미 사용 중인 아이디입니다. 다른 아이디를 입력하세요."
            : "계정 신청을 준비하지 못했습니다.",
        },
        { status: duplicate ? 409 : 500 },
      );
    }
    createdUserId = authResult.user.id;

    const { data, error } = await admin
      .from("gqai_aistudy_account_requests")
      .insert({
        display_name: input.displayName,
        requested_login_id: input.loginId,
        contact: input.email,
        note: input.note || null,
        survey_answers: input.survey,
        auth_user_id: createdUserId,
        policy_version: ACCOUNT_POLICY_VERSION,
        policy_accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      // Awaited (not fire-and-forget): a detached promise can be cut off once
      // the response is sent, before the serverless function finishes it.
      try {
        await sendAndLogEmail({
          admin,
          kind: "account_request",
          to: adminEmail,
          subject: `[GQAI Study] 새 계정 발급 요청: ${input.displayName}`,
          text: `이름: ${input.displayName}\n요청 아이디: ${input.loginId}\n이메일: ${input.email}${
            input.note ? `\n메모: ${input.note}` : ""
          }\n\n관리자 화면의 "계정 요청"에서 승인 여부를 결정하세요. 비밀번호는 신청자가 직접 설정했으며 관리자에게 표시되지 않습니다.`,
          relatedId: data.id,
        });
      } catch (cause) {
        console.error("[account-requests] admin email failed", cause);
      }
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.deleteUser(createdUserId);
    }
    const validation = error instanceof ZodError;
    return NextResponse.json(
      {
        error: validation
          ? error.issues[0]?.message || "입력값을 확인하세요."
          : "요청을 접수하지 못했습니다.",
      },
      { status: validation ? 400 : 500 },
    );
  }
}
