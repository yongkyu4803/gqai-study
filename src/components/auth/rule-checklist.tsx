type Rule = { id: string; label: string; test: (value: string) => boolean };

export function RuleChecklist({
  id,
  value,
  rules,
  ariaLabel,
}: {
  id: string;
  value: string;
  rules: readonly Rule[];
  ariaLabel: string;
}) {
  return (
    <div id={id} aria-live="polite">
      <ul className="space-y-1 text-xs leading-5" aria-label={ariaLabel}>
        {rules.map((rule) => {
          const met = value.length > 0 && rule.test(value);
          return (
            <li key={rule.id} className="flex items-center gap-2">
              <span
                className={
                  met
                    ? "rounded-sm bg-primary px-1.5 text-foreground"
                    : "rounded-sm bg-muted px-1.5 text-muted-foreground"
                }
              >
                {value.length === 0 ? "입력 전" : met ? "충족" : "미충족"}
              </span>
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
