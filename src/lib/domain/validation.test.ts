import { describe, expect, it } from "vitest";
import { accountRequestSchema, passwordSchema } from "@/lib/domain/validation";

describe("passwordSchema", () => {
  it.each([
    ["A123456", false],
    ["A1234567", true],
    ["A1" + "a".repeat(70), true],
    ["A1" + "a".repeat(71), false],
    ["abcdefgh1", false],
    ["Abcdefgh", false],
    ["가나다라마바사1", false],
    ["Abcdefg１", false],
    ["", false],
  ])("길이 경계와 필수 문자 검증: %s", (password, valid) => {
    expect(passwordSchema.safeParse(password).success).toBe(valid);
  });

  it("영문 대문자와 숫자를 포함한 8~72자 비밀번호를 허용한다", () => {
    expect(passwordSchema.safeParse("MyPassword1").success).toBe(true);
  });

  it("영문 대문자가 없으면 거부한다", () => {
    const result = passwordSchema.safeParse("mypassword1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("대문자");
    }
  });

  it("8자보다 짧으면 거부한다", () => {
    expect(passwordSchema.safeParse("Short1").success).toBe(false);
  });
});

describe("accountRequestSchema", () => {
  const validRequest = {
    displayName: "김학습",
    loginId: "learner.01",
    email: "learner@example.com",
    password: "Learning1",
    policyAccepted: true,
    note: "업무 자동화를 배우고 싶습니다.",
  } as const;

  it("필수 이메일, 사용자 비밀번호와 정책 동의를 검증한다", () => {
    expect(accountRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("이메일 또는 정책 동의가 없으면 거부한다", () => {
    expect(
      accountRequestSchema.safeParse({
        displayName: validRequest.displayName,
        loginId: validRequest.loginId,
        password: validRequest.password,
        policyAccepted: true,
      }).success,
    ).toBe(false);
    expect(
      accountRequestSchema.safeParse({
        ...validRequest,
        policyAccepted: false,
      }).success,
    ).toBe(false);
  });
});
