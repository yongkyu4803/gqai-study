import { PASSWORD_RULES } from "@/lib/domain/account-policy";
import { RuleChecklist } from "@/components/auth/rule-checklist";

export function PasswordRules({
  id,
  password,
}: {
  id: string;
  password: string;
}) {
  return (
    <RuleChecklist
      id={id}
      value={password}
      rules={PASSWORD_RULES}
      ariaLabel="비밀번호 규칙"
    />
  );
}
