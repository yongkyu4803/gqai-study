export const ACCOUNT_POLICY_VERSION = "2026-09-07";

export const PASSWORD_GUIDANCE =
  "8자 이상 72자 이하로 입력하고, 영문 대문자와 숫자를 각각 1개 이상 포함하세요.";

export const PASSWORD_RULES = [
  {
    id: "min-length",
    label: "8자 이상",
    message: "비밀번호는 8자 이상 입력하세요.",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "max-length",
    label: "72자 이하",
    message: "비밀번호는 72자 이하로 입력하세요.",
    test: (value: string) => value.length <= 72,
  },
  {
    id: "uppercase",
    label: "영문 대문자 1개 이상",
    message: "영문 대문자를 한 글자 이상 포함하세요.",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "숫자 1개 이상",
    message: "숫자를 한 글자 이상 포함하세요.",
    test: (value: string) => /[0-9]/.test(value),
  },
] as const;
