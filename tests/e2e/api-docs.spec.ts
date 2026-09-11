import { expect, test } from "@playwright/test";

/** The spec is hand-written, so this guards against it silently failing to parse. */
test("Swagger UI renders the OpenAPI spec", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/api-docs");

  await expect(page.getByRole("heading", { name: /Lead Magnet CRM API/ })).toBeVisible({
    timeout: 20_000,
  });

  // Every tag group from the spec is rendered, so the document parsed cleanly.
  await expect(page.locator(".opblock-tag")).toHaveCount(7);
  await expect(page.getByText("/api/public/forms/{slug}/submissions").first()).toBeVisible();

  expect(pageErrors).toEqual([]);
});
