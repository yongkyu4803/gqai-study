import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const loginId = (process.env.BOOTSTRAP_ADMIN_LOGIN_ID || "")
  .trim()
  .toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
const displayName = (process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME || "").trim();

if (!url || !serviceRole || !loginId || !password || !displayName) {
  throw new Error(
    "Supabase URL/service role과 BOOTSTRAP_ADMIN_LOGIN_ID, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_DISPLAY_NAME을 모두 설정하세요.",
  );
}
if (!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(loginId))
  throw new Error("관리자 아이디 형식을 확인하세요.");
if (
  password.length < 8 ||
  !/[A-Za-z]/.test(password) ||
  !/[0-9]/.test(password)
)
  throw new Error(
    "관리자 비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.",
  );

const client = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = `${loginId}@accounts.gqai.local`;
const { data, error } = await client.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { login_id: loginId, display_name: displayName },
});
if (error || !data.user)
  throw new Error(error?.message || "관리자 Auth 계정을 만들지 못했습니다.");
const { error: profileError } = await client
  .from("profiles")
  .insert({
    id: data.user.id,
    role: "admin",
    login_id: loginId,
    display_name: displayName,
    must_change_password: false,
    is_active: true,
  });
if (profileError) {
  await client.auth.admin.deleteUser(data.user.id);
  throw new Error(
    `프로필 생성 실패로 Auth 계정을 되돌렸습니다: ${profileError.message}`,
  );
}
process.stdout.write(`관리자 계정 생성 완료: ${loginId} (${data.user.id})\n`);
