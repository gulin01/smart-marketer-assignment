import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_HOST, ADMIN_PASSWORD, FORM_HOST, LEGACY_HOST, SMOKE } from "./hosts";

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
  await page.goto(`${ADMIN_HOST}/login`);
  await page.getByLabel("이메일").fill(ADMIN_EMAIL);
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("deployment topology", () => {
  test("the two serving domains respond and the legacy domain redirects", async ({ request }) => {
    expect((await request.get(`${ADMIN_HOST}/login`)).status()).toBe(200);
    expect((await request.get(`${FORM_HOST}/login`)).status()).toBe(200);

    // The legacy vercel.app host is absent from frame-ancestors, so it must not
    // serve the app directly — it redirects, preserving the path.
    const redirected = await request.get(`${LEGACY_HOST}/admin`, { maxRedirects: 0 });
    expect([301, 307, 308]).toContain(redirected.status());
    expect(redirected.headers()["location"]).toBe(`${ADMIN_HOST}/admin`);
  });

  test("API documentation is served and its spec is reachable", async ({ page, request }) => {
    const spec = await request.get(`${ADMIN_HOST}/api-docs/openapi.yaml`);
    expect(spec.status()).toBe(200);
    expect(await spec.text()).toContain("openapi: 3.1.0");

    await page.goto(`${ADMIN_HOST}/api-docs`);
    await expect(page.getByRole("heading", { name: /Lead Magnet CRM API/ })).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("authentication", () => {
  test("rejects a wrong password", async ({ request }) => {
    const response = await request.post(`${ADMIN_HOST}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: "definitely-not-the-password" },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(401);
  });

  test("admin API is closed to anonymous callers on both hosts", async ({ request }) => {
    for (const host of [ADMIN_HOST, FORM_HOST]) {
      const response = await request.get(`${host}/api/stats/campaigns`, {
        failOnStatusCode: false,
      });
      expect(response.status(), `${host} must not serve stats anonymously`).toBe(401);
    }
  });
});

test("full journey: publish a form, submit through a channel link, see it attributed", async ({
  page,
  browser,
}) => {
  const runId = `${SMOKE} ${new Date().toISOString().slice(11, 19)}`;
  let instagramUrl = "";

  await test.step("operator signs in and uploads a template", async () => {
    await login(page);
    await page.goto(`${ADMIN_HOST}/admin/templates`);
    await page.getByLabel("이름 (선택)").fill(`${runId} 템플릿`);
    await page.getByLabel("HTML 파일").setInputFiles({
      name: "smoke.html",
      mimeType: "text/html",
      buffer: Buffer.from(TEMPLATE_HTML, "utf-8"),
    });
    await page.getByRole("button", { name: "업로드" }).click();
    await expect(page.getByRole("row", { name: new RegExp(escapeRe(runId)) })).toBeVisible();
  });

  await test.step("creates a campaign and a form", async () => {
    await page.goto(`${ADMIN_HOST}/admin/campaigns`);
    await page.getByLabel("캠페인 이름").fill(`${runId} 캠페인`);
    await page.getByRole("button", { name: "캠페인 생성" }).click();
    await page.getByRole("link", { name: new RegExp(escapeRe(runId)) }).first().click();

    await page.getByLabel("폼 제목").fill(`${runId} 폼`);
    await page.getByLabel("HTML 템플릿").selectOption({ label: `${runId} 템플릿` });
    await page.getByRole("button", { name: "폼 생성" }).click();
    await page.getByRole("link", { name: `${runId} 폼` }).click();
  });

  await test.step("the four links point at the forms domain", async () => {
    const links = page.locator("code", { hasText: "/f/" });
    await expect(links).toHaveCount(4);

    for (const text of await links.allInnerTexts()) {
      expect(text.trim().startsWith(FORM_HOST)).toBe(true);
    }
    instagramUrl = (await links.filter({ hasText: "ch=instagram" }).first().innerText()).trim();
  });

  await test.step("a stranger opens the Instagram link and submits", async () => {
    // Fresh context: no operator session, which is the point.
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(instagramUrl);

    const form = visitorPage.frameLocator("iframe");
    await expect(form.getByRole("heading", { name: "무료 스킨케어 가이드 받기" })).toBeVisible();
    await form.locator('input[name="name"]').fill("스모크 테스터");
    await form.locator('input[name="phone"]').fill("010-0000-0000");
    await form.locator('input[name="email"]').fill("smoke@example.com");
    await form.getByRole("button", { name: "신청하기" }).click();
    await expect(form.getByText("제출이 완료되었습니다")).toBeVisible();

    // The operator's session cookie must not exist on the forms origin.
    const cookies = await visitor.cookies();
    expect(cookies.map((c) => c.name)).not.toContain("leadmagnet_session");
    await visitor.close();
  });

  await test.step("the dashboard attributes it to Instagram", async () => {
    await page.goto(`${ADMIN_HOST}/admin`);
    const row = page.getByRole("row", { name: new RegExp(escapeRe(`${runId} 캠페인`)) });
    const cells = row.locator("td");
    await expect(cells.nth(1)).toHaveText("1"); // 방문
    await expect(cells.nth(2)).toHaveText("1"); // 방문자
    await expect(cells.nth(3)).toHaveText("1"); // 제출
    await expect(cells.nth(4)).toHaveText("100.0%");

    await row.getByRole("link").first().click();
    await expect(page.getByRole("row", { name: /^Instagram/ }).locator("td").nth(3)).toHaveText("1");
    await expect(page.getByRole("row", { name: /^YouTube/ }).locator("td").nth(3)).toHaveText("0");
  });
});

test("the public submission endpoint refuses a third-party origin", async ({ request }) => {
  const response = await request.post(`${FORM_HOST}/api/public/forms/does-not-matter/submissions`, {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: { data: { name: "x" } },
    failOnStatusCode: false,
  });
  // Origin is checked before the form is looked up, so this is 403 and not 404.
  expect(response.status()).toBe(403);
});

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
