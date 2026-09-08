import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";
import { sendAndLogEmail } from "@/lib/server/email";
import { surveyAnswersSchema } from "@/lib/domain/survey";

const patchSchema = z.object({
  status: z.enum(["approved", "dismissed"]),
});

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { user: adminUser } = await requireAdmin();
    const { requestId } = await params;
    const input = patchSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data: accountRequest, error: requestError } = await admin
      .from("gqai_aistudy_account_requests")
      .select(
        "id, display_name, requested_login_id, contact, status, auth_user_id, survey_answers, created_at",
      )
      .eq("id", requestId)
      .single();
    if (requestError || !accountRequest) {
      throw new RequestError("계정 요청을 찾을 수 없습니다.", 404);
    }
    if (accountRequest.status !== "pending") {
      throw new RequestError("이미 처리된 계정 요청입니다.", 409);
    }

    if (input.status === "dismissed") {
      const { data: dismissed, error } = await admin
        .from("gqai_aistudy_account_requests")
        .update({
          status: "dismissed",
          reviewed_by: adminUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!dismissed)
        throw new RequestError("이미 처리된 계정 요청입니다.", 409);

      if (accountRequest.auth_user_id) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(
          accountRequest.auth_user_id,
        );
        if (deleteError) {
          await admin
            .from("gqai_aistudy_account_requests")
            .update({ status: "pending", reviewed_by: null, reviewed_at: null })
            .eq("id", requestId)
            .eq("status", "dismissed");
          throw deleteError;
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (!accountRequest.requested_login_id || !accountRequest.auth_user_id) {
      throw new RequestError(
        "이전 방식으로 접수된 요청입니다. 신청자가 비밀번호를 직접 설정해 다시 신청해야 합니다.",
        409,
      );
    }

    const authUserId = accountRequest.auth_user_id;
    // Legacy requests can still be approved without fabricating a response.
    const survey =
      accountRequest.survey_answers == null
        ? null
        : surveyAnswersSchema.parse(accountRequest.survey_answers);
    const now = new Date().toISOString();
    const { error: profileError } = await admin
      .from("gqai_aistudy_profiles")
      .insert({
        id: authUserId,
        role: "student",
        login_id: accountRequest.requested_login_id,
        display_name: accountRequest.display_name,
        email: accountRequest.contact,
        must_change_password: false,
        must_complete_survey: false,
        is_active: false,
        deactivated_at: now,
        created_by: adminUser.id,
      });
    if (profileError) {
      if (profileError.code === "23505") {
        throw new RequestError(
          "아이디 또는 이메일이 이미 사용 중입니다. 신청 내용을 확인해 주세요.",
          409,
        );
      }
      throw profileError;
    }

    const rollbackProfile = async () => {
      await admin
        .from("gqai_aistudy_profiles")
        .delete()
        .eq("id", authUserId)
        .eq("is_active", false);
    };
    if (survey) {
      const { error: surveyError } = await admin
        .from("gqai_aistudy_survey_responses")
        .insert({
          student_id: authUserId,
          answers: survey,
          submitted_at: accountRequest.created_at,
          updated_at: accountRequest.created_at,
        });
      if (surveyError) {
        await rollbackProfile();
        throw surveyError;
      }
    }
    const { data: approved, error: approveError } = await admin
      .from("gqai_aistudy_account_requests")
      .update({
        status: "approved",
        reviewed_by: adminUser.id,
        reviewed_at: now,
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (approveError || !approved) {
      await rollbackProfile();
      if (!approved)
        throw new RequestError("이미 처리된 계정 요청입니다.", 409);
      throw approveError;
    }

    const rollbackApproval = async () => {
      await admin
        .from("gqai_aistudy_account_requests")
        .update({ status: "pending", reviewed_by: null, reviewed_at: null })
        .eq("id", requestId)
        .eq("status", "approved");
      await rollbackProfile();
    };
    const { error: unbanError } = await admin.auth.admin.updateUserById(
      authUserId,
      {
        ban_duration: "none",
        user_metadata: {
          login_id: accountRequest.requested_login_id,
          display_name: accountRequest.display_name,
          account_status: "active",
        },
      },
    );
    if (unbanError) {
      await rollbackApproval();
      throw unbanError;
    }

    const { error: activateError } = await admin
      .from("gqai_aistudy_profiles")
      .update({ is_active: true, deactivated_at: null })
      .eq("id", authUserId)
      .eq("is_active", false);
    if (activateError) {
      await admin.auth.admin.updateUserById(authUserId, {
        ban_duration: "876000h",
      });
      await rollbackApproval();
      throw activateError;
    }

    const { error: activityError } = await admin
      .from("gqai_aistudy_activity_events")
      .insert({
        event_name: "student.created",
        actor_id: adminUser.id,
        student_id: authUserId,
        entity_type: "student",
        entity_id: authUserId,
        metadata: { source: "account_request" },
      });
    if (activityError) {
      console.error("[account-requests] activity log failed", activityError);
    }

    try {
      const origin = new URL(request.url).origin;
      await sendAndLogEmail({
        admin,
        kind: "account_created",
        to: accountRequest.contact,
        subject: "[GQAI Study] 학습 계정이 승인되었습니다",
        text: `${accountRequest.display_name}님, GQAI Study 학습 계정이 승인되었습니다.\n\n로그인: ${origin}/login\n아이디: ${accountRequest.requested_login_id}\n\n신청할 때 직접 설정한 비밀번호로 로그인해 주세요. 비밀번호는 관리자도 확인할 수 없습니다. 로그인 후 내 학습에서 배정된 카드를 확인할 수 있습니다.`,
        studentId: authUserId,
        relatedId: requestId,
      });
    } catch (cause) {
      console.error("[account-requests] approval email failed", cause);
    }

    return NextResponse.json({ ok: true, studentId: authUserId });
  } catch (error) {
    const validation = error instanceof z.ZodError;
    const status =
      error instanceof RequestError
        ? error.status
        : validation
          ? 400
          : adminGuardStatus(error);
    const message =
      error instanceof RequestError
        ? error.message
        : validation
          ? error.issues[0]?.message || "입력값을 확인하세요."
          : status < 500
            ? "관리자 권한을 확인하세요."
            : "요청을 처리하지 못했습니다.";
    return NextResponse.json({ error: message }, { status });
  }
}
