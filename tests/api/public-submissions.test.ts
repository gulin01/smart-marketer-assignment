import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import "../helpers/next-headers";
import { resetDatabase, seedForm } from "../helpers/db";
import { ctx, jsonRequest, readJson } from "../helpers/request";
import { resetRateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

import {
  OPTIONS as preflight,
  POST as submit,
} from "@/app/api/public/forms/[slug]/submissions/route";

const url = (slug: string) => `http://localhost:3000/api/public/forms/${slug}/submissions`;

/** Mirrors the sandboxed iframe: opaque origin, unique IP so limits don't bleed across tests. */
function iframeRequest(slug: string, body: unknown, origin = "null", ip = "10.0.0.1") {
  return jsonRequest(url(slug), body, { headers: { origin, "x-forwarded-for": ip } });
}

let slug: string;
let formId: string;

beforeAll(async () => {
  await resetDatabase();
});

beforeEach(async () => {
  resetRateLimits();
  await prisma.submission.deleteMany();
});

afterEach(() => resetRateLimits());

describe("POST /api/public/forms/[slug]/submissions", () => {
  beforeAll(async () => {
    const seeded = await seedForm({ slug: "public-form" });
    slug = seeded.form.slug;
    formId = seeded.form.id;
  });

  it("accepts a valid submission (201) and stores the answers", async () => {
    const response = await submit(
      iframeRequest(slug, {
        channel: "INSTAGRAM",
        visitorId: "visitor-1",
        data: { name: "김민수", phone: "010-1234-5678", email: "m@example.com", message: "안녕하세요" },
      }),
      ctx({ slug }),
    );

    expect(response.status).toBe(201);

    const stored = await prisma.submission.findFirst({ where: { formId } });
    expect(stored).toMatchObject({
      channel: "INSTAGRAM",
      visitorId: "visitor-1",
      // Extracted into CRM columns as well as the jsonb blob.
      name: "김민수",
      phone: "010-1234-5678",
      email: "m@example.com",
    });
    expect(stored?.data).toMatchObject({ message: "안녕하세요" });
  });

  it("records a null channel when the visitor arrived without one", async () => {
    await submit(iframeRequest(slug, { data: { name: "직접" } }), ctx({ slug }));
    const stored = await prisma.submission.findFirst({ where: { formId } });
    expect(stored?.channel).toBeNull();
  });

  it("ignores a junk channel rather than failing the submission", async () => {
    const response = await submit(
      iframeRequest(slug, { channel: "tiktok", data: { name: "x" } }),
      ctx({ slug }),
    );
    expect(response.status).toBe(201);
    expect((await prisma.submission.findFirst({ where: { formId } }))?.channel).toBeNull();
  });

  it("rejects an unknown slug with 404", async () => {
    const response = await submit(
      iframeRequest("no-such-form", { data: { name: "x" } }),
      ctx({ slug: "no-such-form" }),
    );
    expect(response.status).toBe(404);
  });

  it("rejects a deactivated form with 410", async () => {
    const { form } = await seedForm({ slug: "closed-form", isActive: false });
    const response = await submit(
      iframeRequest(form.slug, { data: { name: "x" } }),
      ctx({ slug: form.slug }),
    );
    expect(response.status).toBe(410);
  });

  it("rejects fields the template never declared with 400", async () => {
    const response = await submit(
      iframeRequest(slug, { data: { name: "x", is_admin: "true" } }),
      ctx({ slug }),
    );
    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: { message: "템플릿에 없는 필드입니다: is_admin" },
    });
  });

  it("rejects a malformed body with 400", async () => {
    const response = await submit(
      iframeRequest(slug, { data: "not-an-object" }),
      ctx({ slug }),
    );
    expect(response.status).toBe(400);
  });

  it("rate limits after 10 submissions from one IP (429)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const response = await submit(
        iframeRequest(slug, { data: { name: `spam-${i}` } }, "null", "10.9.9.9"),
        ctx({ slug }),
      );
      statuses.push(response.status);
    }
    expect(statuses.filter((s) => s === 201)).toHaveLength(10);
    expect(statuses.filter((s) => s === 429)).toHaveLength(2);
  });

  it("sets a Retry-After header when rate limited", async () => {
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await submit(
        iframeRequest(slug, { data: { name: "x" } }, "null", "10.8.8.8"),
        ctx({ slug }),
      );
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBeTruthy();
  });
});

describe("origin enforcement", () => {
  beforeAll(async () => {
    await seedForm({ slug: "origin-form" });
  });

  it("accepts the sandboxed iframe's opaque origin", async () => {
    const response = await submit(
      iframeRequest("origin-form", { data: { name: "x" } }, "null", "10.1.1.1"),
      ctx({ slug: "origin-form" }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("access-control-allow-origin")).toBe("null");
  });

  it("accepts our own form host", async () => {
    const response = await submit(
      iframeRequest("origin-form", { data: { name: "x" } }, "http://localhost:3000", "10.1.1.2"),
      ctx({ slug: "origin-form" }),
    );
    expect(response.status).toBe(201);
  });

  it("rejects a third-party origin with 403", async () => {
    const response = await submit(
      iframeRequest("origin-form", { data: { name: "x" } }, "https://evil.example", "10.1.1.3"),
      ctx({ slug: "origin-form" }),
    );
    expect(response.status).toBe(403);
  });

  it("answers the CORS preflight for the opaque origin", async () => {
    const response = await preflight(
      new Request(url("origin-form"), { method: "OPTIONS", headers: { origin: "null" } }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("null");
  });

  it("refuses the preflight from a third-party origin", async () => {
    const response = await preflight(
      new Request(url("origin-form"), {
        method: "OPTIONS",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(403);
  });
});
