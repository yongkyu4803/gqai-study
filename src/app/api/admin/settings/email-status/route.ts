import { NextResponse } from "next/server";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";

export async function GET() {
  try {
    await requireAdmin();
    const hasApiKey = Boolean(process.env.RESEND_API_KEY);
    const fromAddress = process.env.RESEND_FROM_ADDRESS || null;
    return NextResponse.json({
      hasApiKey,
      domainVerified: Boolean(fromAddress),
      fromAddress,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "이메일 설정을 확인하지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
