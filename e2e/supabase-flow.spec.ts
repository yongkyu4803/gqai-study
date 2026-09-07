import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env.RUN_SUPABASE_E2E !== "true",
  "Supabase 로컬 통합 검증에서만 실행",
);

const adminPassword = "LocalAdmin1234!";
const studentPassword = "TempStudent1234!";
const changedPassword = "ChangedStudent1234!";

async function login(page: Page, id: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(id);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: "로그아웃" });

  if (!(await logoutButton.isVisible())) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
  }

  await logoutButton.click();
}

test("실제 Auth/API/DB를 거쳐 모듈부터 최종 완료까지 완주한다", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const suffix = `${Date.now().toString(36)}-${testInfo.workerIndex}`;
  const studentLogin = `student.${suffix}`;
  const moduleTitle = `운영 연결 검증 ${suffix}`;

  await login(page, "localadmin", adminPassword);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/students/new");
  await page.getByLabel("이름").fill("운영 학생");
  await page.getByLabel("로그인 아이디").fill(studentLogin);
  await page.getByLabel("임시 비밀번호").fill(studentPassword);
  const createStudentResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/students") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "계정 발급" }).click();
  const studentResponse = await createStudentResponse;
  expect(studentResponse.status(), await studentResponse.text()).toBe(201);
  await expect(page).toHaveURL(/\/admin\/students\/(?!new$)[^/]+$/);
  const studentDetailUrl = page.url();
  await expect(page.getByRole("heading", { name: "운영 학생" })).toBeVisible();

  await page.goto("/admin/modules/new");
  await page.getByRole("button", { name: "빈 초안 만들기" }).click();
  await page.getByLabel("제목", { exact: true }).fill(moduleTitle);
  await page.getByLabel("한 줄 요약").fill("실제 Supabase 세로 흐름 검증");
  await page.getByLabel("제출 요구사항").fill("학습 결과 텍스트");
  await page.getByLabel("기타 블록 추가").selectOption("pdf");
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: `guide-${suffix}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% integration fixture\n"),
    });
  await expect(page.getByText("자료를 첨부했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "발행", exact: true }).click();
  await expect(page).toHaveURL("/admin/modules");

  await page.goto(studentDetailUrl);
  await page.getByRole("button", { name: "모듈 배정" }).click();
  const assignDialog = page.getByRole("dialog");
  await assignDialog.locator("label").filter({ hasText: moduleTitle }).click();
  await assignDialog.getByRole("button", { name: /개 모듈 배정/ }).click();
  await expect(page.getByText(/개의 학습 카드를 만들었습니다\./)).toBeVisible();
  await page
    .locator('a[href^="/admin/assignments/"]')
    .filter({ hasText: moduleTitle })
    .click();
  await page
    .getByLabel("학생별 안내")
    .fill("이 학생에게만 보이는 추가 안내입니다.");
  await page.getByRole("button", { name: "안내 저장" }).click();
  await expect(page.getByText("학생별 안내를 저장했습니다.")).toBeVisible();

  await logout(page);
  await login(page, studentLogin, studentPassword);
  await expect(page).toHaveURL("/change-password");
  await page.getByLabel("새 비밀번호", { exact: true }).fill(changedPassword);
  await page.getByLabel("새 비밀번호 확인").fill(changedPassword);
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page).toHaveURL("/learn");
  await page.getByText(moduleTitle).click();
  await expect(
    page.getByText("이 학생에게만 보이는 추가 안내입니다."),
  ).toBeVisible();
  await page.getByRole("button", { name: "학습 시작" }).click();
  await page.getByRole("button", { name: "수강 완료 기록" }).click();
  await page.getByRole("button", { name: "결과물 제출" }).click();
  await page
    .getByLabel("1. 나의 목적")
    .fill("실제 업무에 적용할 방법을 찾는다.");
  await page
    .getByLabel("2. 내가 한 선택")
    .fill("가장 작은 실행 단계를 골랐다.");
  await page.getByLabel("3. 실행 결과").fill("예상한 결과를 직접 확인했다.");
  await page.getByLabel("4. 다음 단계").fill("반복 실행하며 개선한다.");
  await page.getByRole("button", { name: "텍스트" }).click();
  await page
    .getByPlaceholder("수행 결과와 배운 점을 적어 주세요.")
    .fill("실제 데이터베이스에 저장하는 학습 결과입니다.");
  await page.getByRole("button", { name: "링크" }).click();
  await page.getByPlaceholder("https://").fill("https://example.com/result");
  await page.getByRole("button", { name: "이미지" }).click();
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: `result-${suffix}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(page.getByText("파일을 추가했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "파일", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: `notes-${suffix}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("integration submission fixture"),
    });
  await expect(page.getByText(`notes-${suffix}.txt`)).toBeVisible();
  await page.getByRole("button", { name: "최종 제출" }).click();
  await expect(page.getByText("1차 제출")).toBeVisible();
  await expect(
    page.getByRole("img", { name: `result-${suffix}.png` }),
  ).toBeVisible();
  await expect(page.getByText(`notes-${suffix}.txt`)).toBeVisible();

  await logout(page);
  await login(page, "localadmin", adminPassword);
  await page.goto("/admin/reviews");
  await page
    .locator('a[href^="/admin/assignments/"]')
    .filter({ hasText: moduleTitle })
    .click();
  await page.getByRole("button", { name: "최종 완료" }).click();
  await page
    .getByPlaceholder("학생이 다음 행동을 알 수 있도록 구체적으로 작성하세요.")
    .fill("실제 연결 검증을 완료했습니다.");
  const feedbackFileName = `feedback-${suffix}.txt`;
  await page.getByLabel("파일 첨부").setInputFiles({
    name: feedbackFileName,
    mimeType: "text/plain",
    buffer: Buffer.from("integration feedback fixture"),
  });
  await expect(page.getByText(feedbackFileName)).toBeVisible();
  await page.getByRole("button", { name: "피드백 저장" }).click();
  await expect(page.getByText("최종 완료").first()).toBeVisible();
  await expect(page.getByText(new RegExp(feedbackFileName))).toBeVisible();
  await page.getByRole("button", { name: "완료 취소" }).click();
  await page
    .getByPlaceholder("학생이 다음 행동을 알 수 있도록 구체적으로 작성하세요.")
    .fill("추가 확인을 위해 완료를 취소합니다.");
  await page.getByRole("button", { name: "피드백 저장" }).click();
  await expect(
    page.getByText("완료를 취소하고 피드백 상태로 되돌렸습니다."),
  ).toBeVisible();
  await page.getByRole("button", { name: "최종 완료" }).click();
  await page
    .getByPlaceholder("학생이 다음 행동을 알 수 있도록 구체적으로 작성하세요.")
    .fill("추가 확인까지 마쳐 다시 완료합니다.");
  await page.getByRole("button", { name: "피드백 저장" }).click();
  await expect(page.getByText("최종 완료").first()).toBeVisible();
});
