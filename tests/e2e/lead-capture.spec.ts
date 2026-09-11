import { expect, test, type Page } from "@playwright/test";

/**
 * The whole product in one pass: the operator registers an HTML file, builds a
 * form, hands out channel links, a visitor submits through one of them, and the
 * dashboard attributes it to that channel.
 */

const TEMPLATE_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>무료 가이드</title></head>
<body>
  <h1>무료 스킨케어 가이드 받기</h1>
  <form>
    <label>이름 <input name="name" required></label>
    <label>연락처 <input name="phone" required></label>
    <label>이메일 <input type="email" name="email"></label>
    <button type="submit">신청하기</button>
  </form>
</body></html>`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("admin@example.com");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("operator publishes a form and a visitor's submission is attributed to its channel", async ({
  page,
  browser,
}) => {
  await test.step("operator signs in", () => login(page));

  await test.step("uploads an HTML template", async () => {
    await page.goto("/admin/templates");
    await page.getByLabel("이름 (선택)").fill("스킨케어 가이드");
    await page.getByLabel("HTML 파일").setInputFiles({
      name: "guide.html",
      mimeType: "text/html",
      buffer: Buffer.from(TEMPLATE_HTML, "utf-8"),
    });
    await page.getByRole("button", { name: "업로드" }).click();

    const row = page.getByRole("row", { name: /스킨케어 가이드/ });
    await expect(row).toBeVisible();
    // Field names were parsed out of the uploaded file.
    await expect(row.getByText("name", { exact: true })).toBeVisible();
    await expect(row.getByText("phone", { exact: true })).toBeVisible();
  });

  await test.step("creates a campaign", async () => {
    await page.goto("/admin/campaigns");
    await page.getByLabel("캠페인 이름").fill("2026 봄 캠페인");
    await page.getByRole("button", { name: "캠페인 생성" }).click();
    await expect(page.getByRole("link", { name: "2026 봄 캠페인" })).toBeVisible();
  });

  let instagramUrl = "";

  await test.step("creates a form and receives four channel links", async () => {
    await page.getByRole("link", { name: "2026 봄 캠페인" }).click();
    await page.getByLabel("폼 제목").fill("봄 스킨케어 가이드");
    await page.getByRole("button", { name: "폼 생성" }).click();

    await page.getByRole("link", { name: "봄 스킨케어 가이드" }).click();
    await expect(page.getByRole("heading", { name: "봄 스킨케어 가이드" })).toBeVisible();

    const links = page.locator("code", { hasText: "/f/" });
    await expect(links).toHaveCount(4);

    instagramUrl = (await links.filter({ hasText: "ch=instagram" }).first().innerText()).trim();
    expect(instagramUrl).toContain("ch=instagram");
  });

  await test.step("a visitor opens the Instagram link and submits", async () => {
    // A separate context: no admin session, no shared cookies — a real stranger.
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();

    await visitorPage.goto(instagramUrl);

    // The operator's HTML lives inside the sandboxed iframe.
    const form = visitorPage.frameLocator("iframe");
    await expect(form.getByRole("heading", { name: "무료 스킨케어 가이드 받기" })).toBeVisible();

    await form.locator('input[name="name"]').fill("박지훈");
    await form.locator('input[name="phone"]').fill("010-9876-5432");
    await form.locator('input[name="email"]').fill("jihoon@example.com");
    await form.getByRole("button", { name: "신청하기" }).click();

    await expect(form.getByText("제출이 완료되었습니다")).toBeVisible();
    await visitorContext.close();
  });

  await test.step("the dashboard shows 1 visit / 1 visitor / 1 submission / 100%", async () => {
    await page.goto("/admin");

    const row = page.getByRole("row", { name: /2026 봄 캠페인/ });
    const cells = row.locator("td");
    await expect(cells.nth(1)).toHaveText("1"); // 방문
    await expect(cells.nth(2)).toHaveText("1"); // 방문자
    await expect(cells.nth(3)).toHaveText("1"); // 제출
    await expect(cells.nth(4)).toHaveText("100.0%"); // 전환율
  });

  await test.step("the submission is attributed to Instagram, not another channel", async () => {
    await page.getByRole("link", { name: "2026 봄 캠페인" }).click();

    const instagramRow = page.getByRole("row", { name: /^Instagram/ });
    await expect(instagramRow.locator("td").nth(3)).toHaveText("1");

    for (const channel of ["YouTube", "Threads"]) {
      const otherRow = page.getByRole("row", { name: new RegExp(`^${channel}`) });
      await expect(otherRow.locator("td").nth(3)).toHaveText("0");
    }
  });

  await test.step("the lead appears in the CRM list", async () => {
    await page.getByRole("link", { name: "봄 스킨케어 가이드" }).click();
    await page.getByRole("link", { name: "제출 내역 보기" }).click();

    const row = page.getByRole("row", { name: /박지훈/ });
    await expect(row).toBeVisible();
    // `exact` matters: the expandable JSON cell repeats every answer, so a loose
    // text match would resolve to two elements and fail strict mode.
    await expect(row.getByRole("cell", { name: "010-9876-5432", exact: true })).toBeVisible();
    await expect(row.getByRole("cell", { name: "Instagram", exact: true })).toBeVisible();
  });
});
