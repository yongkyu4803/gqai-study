import { expect, test, type Page } from "@playwright/test";

test.skip(Boolean(process.env.RUN_SUPABASE_E2E), "데모 모드 전용 시나리오");

async function login(page: Page, loginId: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(loginId);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

test("강사가 모듈을 작성·발행하고 3명 그룹에 배정한다", async ({ page }) => {
  await login(page, "admin", "admin1234");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: /오늘도 이어가 볼까요/ }),
  ).toBeVisible();

  await page.goto("/admin/modules");
  await expect(page.getByRole("button", { name: "미리보기" })).toHaveCount(14);
  const moduleSequenceBadges = page.getByLabel(/관리자용 모듈 순서 \d+번/);
  await expect(moduleSequenceBadges).toHaveCount(14);
  await expect(moduleSequenceBadges).toHaveText([
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "14",
  ]);
  await expect(
    page.getByText("데이터 보여주기", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/modules/module-tools/preview");
  const lessonPreview = page.getByRole("article");
  await expect(
    lessonPreview.getByRole("heading", {
      name: "AI와 외부 서비스 연결하기",
    }),
  ).toBeVisible();
  await expect(lessonPreview.locator("img")).toHaveCount(2);
  const imageResponse = await page.request.get(
    "/api/module-assets/notion/tools-01.png",
  );
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()["content-type"]).toBe("image/png");

  await page.goto("/admin/modules/module-skills/preview");
  const skillImages = page.getByRole("article").locator("img");
  await expect(skillImages).toHaveCount(3);
  await expect
    .poll(async () =>
      skillImages.evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement && image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);

  await page.goto("/admin/modules/new");
  await page.getByRole("button", { name: "빈 초안 만들기" }).click();
  await expect(page).toHaveURL(/\/admin\/modules\/.+\/edit/);
  await page.getByLabel("제목", { exact: true }).fill("E2E 실습 모듈");
  await page.getByLabel("한 줄 요약").fill("브라우저 자동 검증을 위한 실습");
  await page
    .getByLabel("학습 목표")
    .fill("핵심 흐름을 완주한다\n개별 결과를 남긴다");
  await expect(page.getByText("본문 편집", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "소제목", exact: true }).click();
  await page
    .getByRole("textbox", { name: "3번 제목 내용" })
    .fill("E2E 학습 순서");
  await page.getByRole("button", { name: "3번 블록 복제" }).click();
  await expect(page.getByLabel(/블록 유형/)).toHaveCount(4);
  await expect(page.getByText("저장되지 않은 변경")).toBeVisible();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("초안을 저장했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "발행", exact: true }).click();
  await expect(page).toHaveURL("/admin/modules");
  await expect(page.getByText("E2E 실습 모듈")).toBeVisible();

  await page.goto("/admin/groups/group-beginner");
  await page.getByRole("button", { name: "모듈 배정" }).click();
  const assignDialog = page.getByRole("dialog");
  await assignDialog
    .locator("label")
    .filter({ hasText: "E2E 실습 모듈" })
    .click();
  await assignDialog.getByRole("button", { name: /개 모듈 배정/ }).click();
  await expect(
    page.getByText(/개의 학생별 카드를 만들었습니다\./),
  ).toBeVisible();

  await page.goto("/admin/assignments");
  const assignmentStatusLink = page.getByRole("link", { name: "배정 현황" });
  let openedMobileMenu = false;
  if (!(await assignmentStatusLink.isVisible())) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    openedMobileMenu = true;
  }
  await expect(assignmentStatusLink).toHaveClass(/bg-accent/);
  if (openedMobileMenu) await page.keyboard.press("Escape");
  await expect(
    page.getByRole("link", { name: /E2E 실습 모듈/ }).first(),
  ).toBeVisible();
});

test("학생이 학습·재제출하고 다른 학생 카드는 볼 수 없다", async ({ page }) => {
  await login(page, "minji", "student1234");
  await expect(page).toHaveURL(/\/learn$/);
  await expect(
    page.getByRole("heading", { name: "김민지님의 학습" }),
  ).toBeVisible();
  await expect(page.getByLabel(/관리자용 모듈 순서/)).toHaveCount(0);

  await page.goto("/learn/assignment-ai-junho");
  await expect(page.getByText("학습 카드를 열 수 없습니다")).toBeVisible();

  await page.goto("/learn/assignment-work-minji/submit");
  await expect(
    page.getByRole("heading", { name: "수정해서 재제출" }),
  ).toBeVisible();
  await page.getByLabel("1. 나의 목적").fill("반복 업무를 더 짧게 처리한다.");
  await page.getByLabel("2. 내가 한 선택").fill("업무 단계를 다시 나눴다.");
  await page.getByLabel("3. 실행 결과").fill("병목이 되는 단계를 찾았다.");
  await page.getByLabel("4. 다음 단계").fill("한 단계를 자동화해 본다.");
  await page.getByRole("button", { name: "링크" }).click();
  await page
    .getByPlaceholder("https://")
    .fill("https://example.com/revised-work");
  await page.getByRole("button", { name: "최종 제출" }).click();
  await expect(page).toHaveURL("/learn/assignment-work-minji/submissions");
  await expect(page.getByText("2차 제출")).toBeVisible();
  await expect(page.getByText("1차 제출")).toBeVisible();
});

test("최초 로그인 학생은 비밀번호를 바꾼 뒤 학습한다", async ({ page }) => {
  await login(page, "suyeon", "student1234");
  await expect(page).toHaveURL("/change-password");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("Changed1234!");
  await page.getByLabel("새 비밀번호 확인").fill("Changed1234!");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page).toHaveURL("/learn");
  await expect(page.getByText("AI와 친해지기")).toBeVisible();
});

test("관리자가 설정에서 자신의 비밀번호를 변경하고 새 비밀번호로 로그인한다", async ({
  page,
}) => {
  await page.route("**/api/admin/settings/email-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        hasApiKey: false,
        domainVerified: false,
        fromAddress: null,
      }),
    }),
  );
  await login(page, "admin", "admin1234");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/settings");
  await page.getByRole("link", { name: "내 비밀번호 변경" }).click();
  await expect(page).toHaveURL(/\/admin\/account#password-change$/);
  const password = page.getByLabel("새 비밀번호", { exact: true });
  const confirm = page.getByLabel("새 비밀번호 확인");
  const submit = page.getByRole("button", {
    name: "비밀번호 변경",
    exact: true,
  });
  await password.fill("lowercase1");
  await confirm.fill("lowercase1");
  await expect(submit).toBeDisabled();
  await password.fill("AdminChanged1234!");
  await expect(submit).toBeDisabled();
  await confirm.fill("AdminChanged1234!");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/admin-password-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  await confirm.press("Enter");
  await expect(
    page.getByText("다음 로그인부터 새 비밀번호를 사용하세요."),
  ).toBeVisible();
  await expect(password).toHaveValue("");
  await expect(confirm).toHaveValue("");
  if (await page.getByRole("button", { name: "메뉴 열기" }).isVisible()) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
  }
  await page
    .getByRole("button", { name: "로그아웃", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "admin", "admin1234");
  await expect(page.locator("#login-error")).toContainText(
    "아이디 또는 비밀번호를 확인하세요.",
  );
  await login(page, "admin", "AdminChanged1234!");
  await expect(page).toHaveURL(/\/admin$/);
});

test("관리자가 수강생 제출 파일을 내려받는다", async ({ page }) => {
  await login(page, "admin", "admin1234");
  await expect(page).toHaveURL(/\/admin$/);
  await page.evaluate(() => {
    const key = "gqai-study-demo-state-v3";
    const state = JSON.parse(localStorage.getItem(key) ?? "{}");
    const submission = state.submissions.find(
      (item: { id: string }) => item.id === "submission-ai-minji-1",
    );
    submission.items.push({
      id: "item-demo-download",
      type: "file",
      order: submission.items.length,
      asset: {
        id: "asset-demo-download",
        name: "학습 결과.pdf",
        size: 128,
        mimeType: "application/pdf",
        storagePath: "student/assignment/submission/result.pdf",
      },
    });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.route(
    "**/api/admin/submission-items/item-demo-download/download",
    (route) =>
      route.fulfill({
        status: 200,
        body: "result",
        headers: {
          "content-type": "application/pdf",
          "content-disposition":
            "attachment; filename*=UTF-8''%ED%95%99%EC%8A%B5%20%EA%B2%B0%EA%B3%BC.pdf",
        },
      }),
  );
  await page.goto("/admin/assignments/assignment-ai-minji");
  const downloadLink = page.getByRole("link", { name: /다운로드 128 B/ });
  await expect(downloadLink).toHaveAttribute(
    "href",
    "/api/admin/submission-items/item-demo-download/download",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/admin-submission-download-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadLink.click(),
  ]);
  expect(download.suggestedFilename()).toBe("학습 결과.pdf");
});

test("계정 신청에서 사전 설문을 함께 제출하고 실패해도 응답을 유지한다", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/account-requests", async (route) => {
    requests += 1;
    expect(route.request().postDataJSON()).toMatchObject({
      survey: {
        aiTools: ["none"],
        aiSkillDetail: "처음 배우려고 합니다.",
        os: "windows",
      },
    });
    await route.fulfill({
      status: requests === 1 ? 503 : 201,
      contentType: "application/json",
      body: JSON.stringify(
        requests === 1 ? { error: "잠시 후 다시 신청하세요." } : { ok: true },
      ),
    });
  });
  await page.goto("/request-access");
  await page.getByLabel("이름", { exact: true }).fill("테스트 학습자");
  await page.getByLabel("사이트에서 사용할 아이디").fill("learner");
  await page.getByLabel("이메일 (필수)").fill("learner@example.com");
  await page.getByLabel("사용할 비밀번호").fill("Learning1");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("Learning1");
  await page
    .getByLabel("구체적으로 어떻게 활용하고 계신가요?")
    .fill("처음 배우려고 합니다.");
  await page.getByRole("checkbox", { name: /개인정보 처리방침/ }).check();
  await page.getByRole("button", { name: "요청 보내기" }).click();
  await expect(
    page.getByText("하나 이상 선택하세요.", { exact: true }),
  ).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole("checkbox", { name: "ChatGPT", exact: true }).check();
  await page.getByRole("checkbox", { name: "사용 안 함", exact: true }).check();
  await expect(
    page.getByRole("checkbox", { name: "ChatGPT", exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/signup-survey-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "요청 보내기" }).click();
  await expect(
    page.getByText("잠시 후 다시 신청하세요.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("구체적으로 어떻게 활용하고 계신가요?"),
  ).toHaveValue("처음 배우려고 합니다.");
  await expect(page.getByLabel("사용할 비밀번호")).toHaveValue("Learning1");
  await page.getByRole("button", { name: "요청 보내기" }).click();
  await expect(
    page.getByText("요청을 접수했습니다", { exact: true }),
  ).toBeVisible();
});

test("설문이 없는 기존 학생은 설문 강제 이동 없이 학습한다", async ({
  page,
}) => {
  await login(page, "suyeon", "student1234");
  await expect(page).toHaveURL("/change-password");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("Changed1234!");
  await page.getByLabel("새 비밀번호 확인").fill("Changed1234!");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page).toHaveURL("/learn");
  await expect(page.getByText("사전 설문에 참여해주세요.")).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL("/learn");
  await expect(page.getByRole("heading", { name: /님의 학습/ })).toBeVisible();
});

test("관리자가 승인 전에 신청 설문을 확인하고 이전 신청은 설문 없이 승인할 수 있다", async ({
  page,
}) => {
  await page.route("**/api/admin/account-requests", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        requests: [
          {
            id: "new-request",
            displayName: "새 신청자",
            requestedLoginId: "newlearner",
            email: "new@example.com",
            note: null,
            status: "pending",
            createdAt: "2026-09-08T00:00:00Z",
            credentialReady: true,
            surveyAnswers: {
              os: "windows",
              aiTools: ["none"],
              aiSubscription: "",
              aiUsageFrequency: "rarely",
              toolFamiliarity: {},
              aiSkillLevel: 1,
              aiSkillDetail: "이제 처음 시작합니다.",
              learningGoal: "automation",
              learningGoalDetail: "",
            },
          },
          {
            id: "old-request",
            displayName: "이전 신청자",
            requestedLoginId: "oldlearner",
            email: "old@example.com",
            note: null,
            status: "pending",
            createdAt: "2026-09-07T00:00:00Z",
            credentialReady: true,
            surveyAnswers: null,
          },
        ],
      }),
    }),
  );
  let approved = false;
  await page.route(
    "**/api/admin/account-requests/old-request",
    async (route) => {
      expect(route.request().postDataJSON()).toEqual({ status: "approved" });
      approved = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    },
  );
  await login(page, "admin", "admin1234");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/account-requests");
  await page.getByText("사전 설문 보기", { exact: true }).click();
  await expect(
    page.getByText("이제 처음 시작합니다.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("사전 설문 없음 · 이전 신청 건", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/admin-signup-survey-${page.viewportSize()?.width}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "승인 및 계정 활성화" })
    .nth(1)
    .click();
  await expect.poll(() => approved).toBe(true);
});
