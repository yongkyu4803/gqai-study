import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { accountRequestSchema } from "@/lib/domain/validation";
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

    const { data: existingRequest } = await admin
      .from("gqai_aistudy_account_requests")
      .select("id")
      .eq("contact", input.contact)
      .eq("status", "pending")
      .maybeSingle();
    if (existingRequest) {
      return NextResponse.json(
        { error: "이미 접수된 요청입니다. 강사의 확인을 기다려주세요." },
        { status: 409 },
      );
    }
    const { data: existingProfile } = await admin
      .from("gqai_aistudy_profiles")
      .select("id")
      .eq("login_id", input.loginId)
      .maybeSingle();
    if (existingProfile) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다. 다른 아이디를 입력하세요." },
        { status: 409 },
      );
    }

    const { data, error } = await admin
      .from("gqai_aistudy_account_requests")
      .insert({
        display_name: input.displayName,
        requested_login_id: input.loginId,
        contact: input.contact,
        note: input.note || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      // Awaited (not fire-and-forget): a detached promise can be cut off once
      // the response is sent, before the serverless function finishes it.
      await sendAndLogEmail({
        admin,
        kind: "account_request",
        to: adminEmail,
        subject: `[GQAI Study] 새 계정 발급 요청: ${input.displayName}`,
        text: `이름: ${input.displayName}\n요청 아이디: ${input.loginId}\n이메일: ${input.contact}${
          input.note ? `\n메모: ${input.note}` : ""
        }\n\n관리자 화면의 "계정 요청"에서 확인하세요.`,
        relatedId: data.id,
      });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "요청을 접수하지 못했습니다." },
      { status: validation ? 400 : 500 },
    );
  }
}
