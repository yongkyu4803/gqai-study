import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";

const bodySchema = z.object({ batchId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { batchId } = bodySchema.parse(await request.json());
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ sent: 0, skipped: "no_provider" });

    const admin = createSupabaseAdminClient();
    const { data: batch, error: batchError } = await admin
      .from("gqai_aistudy_assignment_batches")
      .select("module_version_id, common_instruction")
      .eq("id", batchId)
      .single();
    if (batchError || !batch) throw batchError ?? new Error("배치를 찾을 수 없습니다.");

    const { data: version, error: versionError } = await admin
      .from("gqai_aistudy_module_versions")
      .select("title_snapshot")
      .eq("id", batch.module_version_id)
      .single();
    if (versionError || !version) throw versionError ?? new Error("모듈 버전을 찾을 수 없습니다.");

    const { data: assignments, error: assignmentsError } = await admin
      .from("gqai_aistudy_learner_assignments")
      .select("student_id")
      .eq("assignment_batch_id", batchId);
    if (assignmentsError) throw assignmentsError;

    const studentIds = [...new Set((assignments ?? []).map((row) => row.student_id))];
    if (!studentIds.length) return NextResponse.json({ sent: 0 });

    const { data: recipients, error: profileError } = await admin
      .from("gqai_aistudy_profiles")
      .select("email, display_name")
      .in("id", studentIds)
      .not("email", "is", null);
    if (profileError) throw profileError;
    if (!recipients?.length) return NextResponse.json({ sent: 0, skipped: "no_email" });

    const resend = new Resend(apiKey);
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        resend.emails.send({
          from: process.env.RESEND_FROM_ADDRESS || "GQAI Study <onboarding@resend.dev>",
          to: recipient.email as string,
          subject: `[GQAI Study] 새 학습 카드가 배정되었습니다: ${version.title_snapshot}`,
          text: `${recipient.display_name}님, "${version.title_snapshot}" 학습 카드가 배정되었습니다.${
            batch.common_instruction ? `\n\n안내: ${batch.common_instruction}` : ""
          }\n\n로그인 후 확인해주세요.`,
        }),
      ),
    );
    const sent = results.filter((result) => result.status === "fulfilled").length;
    return NextResponse.json({ sent, total: recipients.length });
  } catch (error) {
    return NextResponse.json(
      { error: "알림 이메일을 보내지 못했습니다." },
      { status: adminGuardStatus(error) },
    );
  }
}
