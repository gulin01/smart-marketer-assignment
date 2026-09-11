import { expect, test, type Page } from "@playwright/test";

/**
 * A hostile template must not be able to reach the operator's session, the
 * admin API, or the parent page — even though its script really does execute.
 */
const HOSTILE_TEMPLATE = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"></head>
<body>
  <form><input name="name"></form>
  <p id="own-cookie">pending</p>
  <p id="parent-cookie">pending</p>
  <p id="admin-api">pending</p>
  <script>
    // 1. Can this document see any cookie at all?
    try {
      document.getElementById('own-cookie').textContent = 'cookie:[' + document.cookie + ']';
    } catch (error) {
      document.getElementById('own-cookie').textContent = 'blocked:' + error.name;
    }

    // 2. Can it reach up into the admin page that framed it?
    try {
      var stolen = window.parent.document.cookie;
      document.getElementById('parent-cookie').textContent = 'stolen:[' + stolen + ']';
    } catch (error) {
      document.getElementById('parent-cookie').textContent = 'blocked:' + error.name;
    }

    // 3. Can it call the operator-only API?
    fetch('/api/stats/campaigns')
      .then(function (response) {
        document.getElementById('admin-api').textContent = 'status:' + response.status;
      })
      .catch(function (error) {
        document.getElementById('admin-api').textContent = 'blocked:' + error.name;
      });
  </script>
</body></html>`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("admin@example.com");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("a hostile template cannot read cookies or call the admin API", async ({ page, browser }) => {
  await login(page);

  await page.goto("/admin/templates");
  await page.getByLabel("이름 (선택)").fill("악성 템플릿");
  await page.getByLabel("HTML 파일").setInputFiles({
    name: "hostile.html",
    mimeType: "text/html",
    buffer: Buffer.from(HOSTILE_TEMPLATE, "utf-8"),
  });
  await page.getByRole("button", { name: "업로드" }).click();
  await expect(page.getByRole("row", { name: /악성 템플릿/ })).toBeVisible();

  await page.goto("/admin/campaigns");
  await page.getByLabel("캠페인 이름").fill("보안 캠페인");
  await page.getByRole("button", { name: "캠페인 생성" }).click();
  await page.getByRole("link", { name: "보안 캠페인" }).click();

  await page.getByLabel("폼 제목").fill("보안 폼");
  await page.getByLabel("HTML 템플릿").selectOption({ label: "악성 템플릿" });
  await page.getByRole("button", { name: "폼 생성" }).click();
  await page.getByRole("link", { name: "보안 폼" }).click();

  const formUrl = (
    await page.locator("code", { hasText: "/f/" }).first().innerText()
  ).trim();

  await test.step("the operator's own session cookie exists", async () => {
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === "leadmagnet_session")).toBe(true);
  });

  await test.step("the hostile template runs but is contained", async () => {
    // Same browser context as the logged-in operator: the session cookie is
    // present in this browser, which is exactly the threat being tested.
    await page.goto(formUrl);
    const frame = page.frameLocator("iframe");

    // It cannot read any cookie — the sandbox gives it an opaque origin.
    const ownCookie = frame.locator("#own-cookie");
    await expect(ownCookie).not.toHaveText("pending");
    await expect(ownCookie).not.toContainText("leadmagnet_session");

    // It cannot climb into the parent document.
    await expect(frame.locator("#parent-cookie")).toContainText("blocked:");

    // And its call to the operator-only API is refused.
    const adminApi = frame.locator("#admin-api");
    await expect(adminApi).not.toHaveText("pending");
    await expect(adminApi).not.toContainText("status:200");
  });

  await test.step("the admin API refuses the request without a session", async () => {
    const anonymous = await browser.newContext();
    const response = await anonymous.request.get("/api/stats/campaigns", {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(401);
    await anonymous.close();
  });
});
