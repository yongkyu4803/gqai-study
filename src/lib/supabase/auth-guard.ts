import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("SUPABASE_NOT_CONFIGURED");
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) throw new Error("UNAUTHENTICATED");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();
  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    !profile.is_active
  )
    throw new Error("FORBIDDEN");
  return { user, client };
}

export function adminGuardStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message === "SUPABASE_NOT_CONFIGURED") return 503;
  return 500;
}
