import { test } from "@playwright/test";

const OUT = process.env.SHOT_DIR ?? "shots";

const TEMPLATE = `<!doctype html><html lang="ko"><head><meta charset="utf-8"></head>
<body style="font:15px/1.6 system-ui;padding:2.5rem;max-width:28rem;margin:auto">
<h1 style="font-size:1.4rem">무료 스킨케어 가이드</h1>
<form><p><label>이름<br><input name="name" style="width:100%;padding:.5rem"></label></p>
<p><label>연락처<br><input name="phone" style="width:100%;padding:.5rem"></label></p>
<p><label>이메일<br><input name="email" type="email" style="width:100%;padding:.5rem"></label></p>
<button type="submit" style="padding:.6rem 1rem">신청하기</button></form></body></html>`;

test("capture every page", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/login");
  await shot("01-login");

  await page.getByLabel("이메일").fill("admin@example.com");
  await page.getByLabel("비밀번호").fill("admin1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/admin$/);

  await page.goto("/admin/templates");
  await page.getByLabel("이름 (선택)").fill("스킨케어 가이드");
  await page.getByLabel("HTML 파일").setInputFiles({
    name: "guide.html", mimeType: "text/html", buffer: Buffer.from(TEMPLATE, "utf-8"),
  });
  await page.getByRole("button", { name: "업로드" }).click();
  await page.getByRole("row", { name: /스킨케어/ }).waitFor();
  await shot("02-templates");

  await page.getByRole("button", { name: "미리보기" }).first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/03-preview-modal.png` });
  await page.getByRole("button", { name: "닫기" }).click();

  await page.goto("/admin/campaigns");
  await page.getByLabel("캠페인 이름").fill("2026 봄 캠페인");
  await page.getByRole("button", { name: "캠페인 생성" }).click();
  await page.getByRole("link", { name: "2026 봄 캠페인" }).waitFor();
  await shot("04-campaigns");

  await page.getByRole("link", { name: "2026 봄 캠페인" }).click();
  await page.getByLabel("폼 제목").fill("봄 스킨케어 가이드");
  await page.getByRole("button", { name: "폼 생성" }).click();
  await page.getByRole("link", { name: "봄 스킨케어 가이드" }).waitFor();

  await page.getByRole("link", { name: "봄 스킨케어 가이드" }).click();
  const url = (await page.locator("code", { hasText: "ch=instagram" }).first().innerText()).trim();

  // generate traffic so the charts have something to show
  for (const [ch, n] of [["instagram", 4], ["youtube", 2], ["x", 1]] as const) {
    for (let i = 0; i < n; i++) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await p.goto(url.replace("ch=instagram", `ch=${ch}`));
      if (i % 2 === 0) {
        const f = p.frameLocator("iframe");
        await f.locator('input[name="name"]').fill(`방문자${i}`);
        await f.locator('input[name="phone"]').fill("010-1234-5678");
        await f.locator('input[name="email"]').fill(`v${i}@example.com`);
        await f.getByRole("button", { name: "신청하기" }).click();
        await f.getByText("제출이 완료되었습니다").waitFor();
      }
      await ctx.close();
    }
  }

  await page.goto("/admin");
  await page.getByRole("heading", { name: "대시보드" }).waitFor();
  await shot("05-dashboard");

  await page.getByRole("link", { name: "2026 봄 캠페인" }).click();
  await page.waitForURL(/\/admin\/campaigns\/[^/]+$/);
  await page.getByRole("heading", { name: "채널별 성과" }).waitFor();
  await shot("06-campaign-detail");

  await page.getByRole("link", { name: "봄 스킨케어 가이드" }).click();
  await page.waitForURL(/\/admin\/forms\/[^/]+$/);
  await page.getByRole("heading", { name: "채널별 배포 링크" }).waitFor();
  await shot("07-form-links");

  await page.getByRole("link", { name: "제출 내역 보기" }).click();
  await page.waitForURL(/\/submissions$/);
  await page.getByRole("heading", { name: "제출 내역" }).waitFor();
  await shot("08-submissions");

  const visitor = await browser.newContext();
  const vp = await visitor.newPage();
  await vp.setViewportSize({ width: 1280, height: 900 });
  await vp.goto(url);
  await vp.screenshot({ path: `${OUT}/09-public-form.png` });
  await vp.goto("/f/nope-does-not-exist");
  await vp.screenshot({ path: `${OUT}/10-form-404.png` });
  await visitor.close();
});
