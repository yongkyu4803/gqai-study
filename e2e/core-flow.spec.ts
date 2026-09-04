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
  await expect(page.getByRole("button", { name: "미리보기" })).toHaveCount(11);
  const moduleSequenceBadges = page.getByLabel(/관리자용 모듈 순서 \d+번/);
  await expect(moduleSequenceBadges).toHaveCount(11);
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
  ]);
  await expect(page.getByText("웹크롤링", { exact: true })).toBeVisible();
  await page.goto("/admin/modules/module-tools/preview");
  const lessonPreview = page.getByRole("article");
  await expect(
    lessonPreview.getByRole("heading", { name: "툴과 친해지기" }),
  ).toBeVisible();
  await expect(lessonPreview.locator("img")).toHaveCount(5);
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
