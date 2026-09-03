import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";
import { studentSchema, toAuthEmail } from "@/lib/domain/validation";

export async function POST(request: Request) {
  let createdUserId: string | undefined;
  try {
    const { user: adminUser } = await requireAdmin();
    const input = studentSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    if (input.groupIds.length) {
      const { data: groups, error } = await admin
        .from("groups")
        .select("id")
        .in("id", input.groupIds)
        .eq("is_archived", false);
      if (error || groups.length !== new Set(input.groupIds).size)
        return NextResponse.json(
          { error: "선택한 그룹을 확인하세요." },
          { status: 400 },
        );
    }
    const { data: authResult, error: authError } =
      await admin.auth.admin.createUser({
        email: toAuthEmail(input.loginId),
        password: input.password,
        email_confirm: true,
        user_metadata: {
          login_id: input.loginId,
          display_name: input.displayName,
        },
      });
    if (authError || !authResult.user) {
      const duplicate =
        authError?.message.toLowerCase().includes("already") ||
        authError?.status === 422;
      return NextResponse.json(
        {
          error: duplicate
            ? "이미 사용 중인 아이디입니다."
            : "인증 계정을 만들지 못했습니다.",
        },
        { status: duplicate ? 409 : 500 },
      );
    }
    createdUserId = authResult.user.id;
    const { error: profileError } = await admin
      .from("profiles")
      .insert({
        id: createdUserId,
        role: "student",
        login_id: input.loginId,
        display_name: input.displayName,
        must_change_password: true,
        is_active: true,
        created_by: adminUser.id,
      });
    if (profileError) throw profileError;
    if (input.groupIds.length) {
      const { error: memberError } = await admin
        .from("group_members")
        .insert(
          input.groupIds.map((groupId) => ({
            group_id: groupId,
            student_id: createdUserId,
            added_by: adminUser.id,
          })),
        );
      if (memberError) throw memberError;
    }
    await admin
      .from("activity_events")
      .insert({
        event_name: "student.created",
        actor_id: adminUser.id,
        student_id: createdUserId,
        entity_type: "student",
        entity_id: createdUserId,
        metadata: { groupCount: input.groupIds.length },
      });
    return NextResponse.json({ id: createdUserId }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      const admin = createSupabaseAdminClient();
      await admin.from("profiles").delete().eq("id", createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
    }
    const status = adminGuardStatus(error);
    const validation = error instanceof Error && error.name === "ZodError";
    const message = validation
      ? "입력값을 확인하세요."
      : status < 500
        ? "관리자 권한을 확인하세요."
        : "학생 계정을 만들지 못했습니다.";
    return NextResponse.json(
      { error: message },
      { status: validation ? 400 : status },
    );
  }
}
