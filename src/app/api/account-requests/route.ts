import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { accountRequestSchema } from "@/lib/domain/validation";

async function notifyAdminOfNewRequest(input: {
  displayName: string;
  loginId: string;
  contact: string;
  note?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !adminEmail) return;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_ADDRESS || "GQAI Study <onboarding@resend.dev>",
    to: adminEmail,
    subject: `[GQAI Study] 새 계정 발급 요청: ${input.displayName}`,
    text: `이름: ${input.displayName}\n요청 아이디: ${input.loginId}\n이메일: ${input.contact}${
      input.note ? `\n메모: ${input.note}` : ""
    }\n\n관리자 화면의 "계정 요청"에서 확인하세요.`,
  });
  if (error) console.error("[account-requests] admin notify failed", error);
}

export async function POST(request: Request) {
  try {
    const input = accountRequestSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("gqai_aistudy_account_requests").insert({
      display_name: input.displayName,
      requested_login_id: input.loginId,
      contact: input.contact,
      note: input.note || null,
    });
    if (error) throw error;
    // Awaited (not fire-and-forget): a detached promise can be cut off once
    // the response is sent, before the serverless function finishes it.
    await notifyAdminOfNewRequest(input).catch((cause) =>
      console.error("[account-requests] admin notify threw", cause),
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    return NextResponse.json(
      { error: validation ? "입력값을 확인하세요." : "요청을 접수하지 못했습니다." },
      { status: validation ? 400 : 500 },
    );
  }
}
