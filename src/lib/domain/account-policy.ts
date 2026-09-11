export const ACCOUNT_POLICY_VERSION = "2026-09-08";

export const PASSWORD_GUIDANCE =
  "8자 이상 72자 이하로 입력하고, 영문 대문자와 숫자를 각각 1개 이상 포함하세요.";

export const LOGIN_ID_RULES = [
  {
    id: "min-length",
    label: "4자 이상",
    message: "아이디는 4자 이상 입력하세요.",
    test: (value: string) => value.trim().length >= 4,
  },
  {
    id: "max-length",
    label: "32자 이하",
    message: "아이디는 32자 이하로 입력하세요.",
    test: (value: string) => value.trim().length <= 32,
  },
  {
    id: "starts-with-alnum",
    label: "영문 소문자 또는 숫자로 시작",
    message: "아이디는 영문 소문자나 숫자로 시작해야 합니다.",
    test: (value: string) => /^[a-z0-9]/.test(value.trim().toLowerCase()),
  },
  {
    id: "allowed-chars",
    label: "영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용",
    message: "영문 소문자, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.",
    test: (value: string) => /^[a-z0-9._-]*$/.test(value.trim().toLowerCase()),
  },
] as const;

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
