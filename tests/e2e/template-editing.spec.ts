import { expect, test, type Page } from "@playwright/test";

/**
 * The point of in-place editing: a template change reaches the live public form
 * without re-uploading or relinking anything.
 */

const ORIGINAL = `<!doctype html><html lang="ko"><head><meta charset="utf-8"></head>
<body><h1>원래 제목</h1>
<form>
  <label>이름 <input name="name" required></label>
  <label>연락처 <input name="phone" required></label>
  <button type="submit">신청하기</button>
</form></body></html>`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("admin@example.com");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("editing a template updates the live form, and the edit can be rolled back", async ({
  page,
  browser,
}) => {
  await login(page);

  await test.step("register a template and publish a form from it", async () => {
    await page.goto("/admin/templates");
    await page.getByLabel("이름 (선택)").fill("편집 대상");
    await page.getByLabel("HTML 파일").setInputFiles({
      name: "editable.html",
      mimeType: "text/html",
      buffer: Buffer.from(ORIGINAL, "utf-8"),
    });
    await page.getByRole("button", { name: "업로드" }).click();
    await expect(page.getByRole("row", { name: /편집 대상/ })).toBeVisible();

    await page.goto("/admin/campaigns");
    await page.getByLabel("캠페인 이름").fill("편집 캠페인");
    await page.getByRole("button", { name: "캠페인 생성" }).click();
    await page.getByRole("link", { name: "편집 캠페인" }).click();

    await page.getByLabel("폼 제목").fill("편집 폼");
    await page.getByLabel("HTML 템플릿").selectOption({ label: "편집 대상" });
    await page.getByRole("button", { name: "폼 생성" }).click();
    await page.getByRole("link", { name: "편집 폼" }).click();
  });

  const formUrl = (
    await page.locator("code", { hasText: "ch=instagram" }).first().innerText()
  ).trim();

  await test.step("the published form shows the original heading", async () => {
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(formUrl);
    await expect(visitorPage.frameLocator("iframe").getByText("원래 제목")).toBeVisible();
    await visitor.close();
  });

  await test.step("edit the HTML in the browser and save", async () => {
    await page.goto("/admin/templates");
    await page.getByRole("row", { name: /편집 대상/ }).getByRole("link", { name: "편집" }).click();
    await expect(page.getByRole("heading", { name: "HTML 소스" })).toBeVisible();

    // The live preview reflects the stored source before any typing.
    await expect(page.frameLocator('iframe[title="미리보기"]').getByText("원래 제목")).toBeVisible();

    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(ORIGINAL.replace("원래 제목", "수정된 제목"));

    // Debounced preview catches up without a save.
    await expect(
      page.frameLocator('iframe[title="미리보기"]').getByText("수정된 제목"),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장되었습니다")).toBeVisible();
  });

  await test.step("the live public form serves the edit immediately", async () => {
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(formUrl);
    const frame = visitorPage.frameLocator("iframe");
    await expect(frame.getByText("수정된 제목")).toBeVisible();
    await expect(frame.getByText("원래 제목")).toHaveCount(0);
    await visitor.close();
  });

  await test.step("restore the previous version from history", async () => {
    await page.getByRole("button", { name: /변경 이력/ }).click();
    await page.getByRole("button", { name: "복원" }).first().click();

    await expect(
      page.frameLocator('iframe[title="미리보기"]').getByText("원래 제목"),
    ).toBeVisible({ timeout: 10_000 });

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(formUrl);
    await expect(visitorPage.frameLocator("iframe").getByText("원래 제목")).toBeVisible();
    await visitor.close();
  });
});

test("the language switch translates the admin UI", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: "대시보드", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Templates" })).toBeVisible();

  // The preference survives navigation, since it lives in a cookie.
  await page.goto("/admin/campaigns");
  await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "한", exact: true }).click();
  await expect(page.getByRole("heading", { name: "캠페인", level: 1 })).toBeVisible();
});
