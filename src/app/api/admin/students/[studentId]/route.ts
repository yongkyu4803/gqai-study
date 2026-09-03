import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminGuardStatus, requireAdmin } from "@/lib/supabase/auth-guard";
import { passwordSchema } from "@/lib/domain/validation";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset_password"), password: passwordSchema }),
  z.object({ action: z.literal("set_active"), isActive: z.boolean() }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { user: adminUser } = await requireAdmin();
    const { studentId } = await params;
    const input = actionSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("gqai_aistudy_profiles")
      .select("id, role, is_active")
      .eq("id", studentId)
      .single();
    if (profileError || profile?.role !== "student")
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 },
      );
    if (input.action === "reset_password") {
      const { error } = await admin.auth.admin.updateUserById(studentId, {
        password: input.password,
      });
      if (error) throw error;
      const { error: updateError } = await admin
        .from("gqai_aistudy_profiles")
        .update({ must_change_password: true })
        .eq("id", studentId);
      if (updateError) throw updateError;
      await admin
        .from("gqai_aistudy_activity_events")
        .insert({
          event_name: "student.password_reset",
          actor_id: adminUser.id,
          student_id: studentId,
          entity_type: "student",
          entity_id: studentId,
        });
    } else {
      const previous = profile.is_active;
      const { error } = await admin.auth.admin.updateUserById(studentId, {
        ban_duration: input.isActive ? "none" : "876000h",
      });
      if (error) throw error;
      const { error: updateError } = await admin
        .from("gqai_aistudy_profiles")
        .update({
          is_active: input.isActive,
          deactivated_at: input.isActive ? null : new Date().toISOString(),
        })
        .eq("id", studentId);
      if (updateError) {
        await admin.auth.admin.updateUserById(studentId, {
          ban_duration: previous ? "none" : "876000h",
        });
        throw updateError;
      }
      await admin
        .from("gqai_aistudy_activity_events")
        .insert({
          event_name: input.isActive
            ? "student.activated"
            : "student.deactivated",
          actor_id: adminUser.id,
          student_id: studentId,
          entity_type: "student",
          entity_id: studentId,
        });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const validation = error instanceof Error && error.name === "ZodError";
    const status = validation ? 400 : adminGuardStatus(error);
    return NextResponse.json(
      {
        error: validation
          ? "입력값을 확인하세요."
          : status < 500
            ? "관리자 권한을 확인하세요."
            : "학생 계정을 변경하지 못했습니다.",
      },
      { status },
    );
  }
}
