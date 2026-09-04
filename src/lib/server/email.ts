import "server-only";

import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type EmailKind = "assignment" | "account_request" | "feedback";

export async function sendAndLogEmail(params: {
  admin: SupabaseClient;
  kind: EmailKind;
  to: string;
  subject: string;
  text: string;
  studentId?: string | null;
  relatedId?: string | null;
}) {
  const { admin, kind, to, subject, text, studentId, relatedId } = params;
  const apiKey = process.env.RESEND_API_KEY;
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  if (!apiKey) {
    status = "failed";
    errorMessage = "RESEND_API_KEY가 설정되지 않았습니다.";
  } else {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS || "GQAI Study <onboarding@resend.dev>",
      to,
      subject,
      text,
    });
    if (error) {
      status = "failed";
      errorMessage = error.message || JSON.stringify(error);
      console.error(`[email:${kind}] send failed`, to, error);
    }
  }

  await admin.from("gqai_aistudy_email_logs").insert({
    kind,
    recipient_email: to,
    student_id: studentId ?? null,
    subject,
    status,
    error_message: errorMessage,
    related_id: relatedId ?? null,
  });

  return status === "sent";
}
