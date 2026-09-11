import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieJar } from "../helpers/next-headers";
import { SAMPLE_TEMPLATE, resetDatabase, seedOperator } from "../helpers/db";
import { ctx, getRequest, jsonRequest, readJson } from "../helpers/request";
import { prisma } from "@/lib/db";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as createCampaign } from "@/app/api/campaigns/route";
import { POST as createTemplate } from "@/app/api/templates/route";
import { POST as createForm } from "@/app/api/forms/route";
import { GET as getLinks, POST as regenerateLinks } from "@/app/api/forms/[id]/links/route";

const CHANNELS = ["INSTAGRAM", "X", "YOUTUBE", "THREADS"];

async function signIn() {
  await login(
    jsonRequest("http://localhost:3000/api/auth/login", {
      email: "admin@example.com",
      password: "admin1234",
    }),
  );
}

async function makeCampaignAndTemplate() {
  const campaign = await readJson(
    await createCampaign(
      jsonRequest("http://localhost:3000/api/campaigns", { name: "캠페인" }),
    ),
  );
  const template = await readJson(
    await createTemplate(
      jsonRequest("http://localhost:3000/api/templates", { name: "폼", html: SAMPLE_TEMPLATE }),
    ),
  );
  return { campaignId: campaign.id as string, templateId: template.id as string };
}

const post = (body: unknown) =>
  createForm(
    jsonRequest("http://localhost:3000/api/forms", body),
  );

beforeAll(async () => {
  await resetDatabase();
  await seedOperator();
});

beforeEach(async () => {
  cookieJar.clear();
  await signIn();
});

describe("POST /api/forms", () => {
  it("creates a form with all four distribution links", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    const response = await post({ campaignId, templateId, title: "봄 가이드" });

    expect(response.status).toBe(201);
    const form = (await readJson(response)) as {
      slug: string;
      links: { channel: string; url: string }[];
    };

    expect(form.links).toHaveLength(4);
    expect(form.links.map((link) => link.channel).sort()).toEqual([...CHANNELS].sort());

    // Each link must carry its own channel in the query string.
    for (const link of form.links) {
      const url = new URL(link.url);
      expect(url.pathname).toBe(`/f/${form.slug}`);
      expect(url.searchParams.get("ch")).toBe(link.channel.toLowerCase());
    }
  });

  it("auto-generates a slug when none is given", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    const form = (await readJson(await post({ campaignId, templateId, title: "무슬러그" }))) as {
      slug: string;
    };
    expect(form.slug).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
  });

  it("honours an explicit slug", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    const form = (await readJson(
      await post({ campaignId, templateId, title: "커스텀", slug: "spring-guide" }),
    )) as { slug: string };
    expect(form.slug).toBe("spring-guide");
  });

  it("rejects a duplicate slug with 409", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    await post({ campaignId, templateId, title: "첫번째", slug: "taken" });
    const response = await post({ campaignId, templateId, title: "두번째", slug: "taken" });
    expect(response.status).toBe(409);
  });

  it("rejects an invalid slug format with 400", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    const response = await post({ campaignId, templateId, title: "x", slug: "Has Spaces!" });
    expect(response.status).toBe(400);
  });

  it("rejects an unknown campaign with 404", async () => {
    const { templateId } = await makeCampaignAndTemplate();
    const response = await post({ campaignId: "does-not-exist", templateId, title: "x" });
    expect(response.status).toBe(404);
  });

  it("rejects an unknown template with 404", async () => {
    const { campaignId } = await makeCampaignAndTemplate();
    const response = await post({ campaignId, templateId: "does-not-exist", title: "x" });
    expect(response.status).toBe(404);
  });

  it("requires a session (401)", async () => {
    cookieJar.clear();
    expect((await post({ campaignId: "a", templateId: "b", title: "c" })).status).toBe(401);
  });
});

describe("/api/forms/[id]/links", () => {
  it("returns the four links", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    const form = (await readJson(await post({ campaignId, templateId, title: "링크" }))) as {
      id: string;
    };

    const response = await getLinks(
      getRequest(`http://localhost:3000/api/forms/${form.id}/links`),
      ctx({ id: form.id }),
    );
    expect(response.status).toBe(200);
    expect((await readJson(response)).links).toHaveLength(4);
  });

  it("regenerates links idempotently rather than duplicating them", async () => {
    const { campaignId, templateId } = await makeCampaignAndTemplate();
    const form = (await readJson(await post({ campaignId, templateId, title: "재생성" }))) as {
      id: string;
    };

    await regenerateLinks(
      new Request(`http://localhost:3000/api/forms/${form.id}/links`, { method: "POST" }),
      ctx({ id: form.id }),
    );

    expect(await prisma.distributionLink.count({ where: { formId: form.id } })).toBe(4);
  });

  it("404s for an unknown form", async () => {
    const response = await getLinks(
      getRequest("http://localhost:3000/api/forms/nope/links"),
      ctx({ id: "nope" }),
    );
    expect(response.status).toBe(404);
  });
});
