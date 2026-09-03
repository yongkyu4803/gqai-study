import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env.CAPTURE_VISUALS !== "true" ||
    process.env.RUN_SUPABASE_E2E === "true",
  "명시적인 데모 화면 캡처에서만 실행",
);

async function login(page: Page, id: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(id);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("관리자 대시보드 시각 검증", async ({ page }, testInfo) => {
  const consoleErrors = failOnConsoleErrors(page);
  await login(page, "admin", "admin1234");
  await expect(
    page.getByRole("heading", { name: /오늘도 이어가 볼까요/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/verification/admin-dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test("학생 학습 카드 시각 검증", async ({ page }, testInfo) => {
  const consoleErrors = failOnConsoleErrors(page);
  await login(page, "minji", "student1234");
  await expect(
    page.getByRole("heading", { name: /김민지님의 학습/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/verification/student-learning-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});
