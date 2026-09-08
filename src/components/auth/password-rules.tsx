import { PASSWORD_RULES } from "@/lib/domain/account-policy";

export function PasswordRules({
  id,
  password,
}: {
  id: string;
  password: string;
}) {
  return (
    <div id={id} aria-live="polite">
      <ul className="space-y-1 text-xs leading-5" aria-label="비밀번호 규칙">
        {PASSWORD_RULES.map((rule) => {
          const met = password.length > 0 && rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-2">
              <span
                className={
                  met
                    ? "rounded-sm bg-primary px-1.5 text-foreground"
                    : "rounded-sm bg-muted px-1.5 text-muted-foreground"
                }
              >
                {password.length === 0 ? "입력 전" : met ? "충족" : "미충족"}
              </span>
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
