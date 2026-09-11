import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import "../helpers/next-headers";
import { resetDatabase, seedForm } from "../helpers/db";
import { prisma } from "@/lib/db";
import { getCampaignStats, getChannelStats, getFormMetrics } from "@/lib/stats";
import type { Channel } from "@/generated/prisma/enums";

let campaignId: string;
let formId: string;

const visit = (visitorId: string, channel: Channel | null, createdAt?: Date) =>
  prisma.visit.create({ data: { formId, visitorId, channel, createdAt } });

const submission = (channel: Channel | null, createdAt?: Date) =>
  prisma.submission.create({ data: { formId, channel, data: { name: "x" }, createdAt } });

beforeAll(async () => {
  await resetDatabase();
  const seeded = await seedForm({ slug: "stats-form" });
  campaignId = seeded.campaign.id;
  formId = seeded.form.id;
});

beforeEach(async () => {
  await prisma.visit.deleteMany();
  await prisma.submission.deleteMany();
});

describe("getCampaignStats", () => {
  it("counts visits, deduplicates visitors, and computes conversion", async () => {
    // Visitor A lands three times, visitor B once; one of them submits.
    await visit("visitor-a", "INSTAGRAM");
    await visit("visitor-a", "INSTAGRAM");
    await visit("visitor-a", "YOUTUBE");
    await visit("visitor-b", "INSTAGRAM");
    await submission("INSTAGRAM");

    const [stats] = await getCampaignStats();
    expect(stats).toMatchObject({
      visits: 4,
      visitors: 2,
      submissions: 1,
      conversionRate: 0.5,
    });
  });

  it("does not multiply counts when visits and submissions coexist", async () => {
    // A naive single join would report 3 × 2 = 6 for both columns.
    await visit("a", "X");
    await visit("b", "X");
    await visit("c", "X");
    await submission("X");
    await submission("X");

    const [stats] = await getCampaignStats();
    expect(stats.visits).toBe(3);
    expect(stats.submissions).toBe(2);
  });

  it("reports a campaign with no traffic as all zeroes", async () => {
    const [stats] = await getCampaignStats();
    expect(stats).toMatchObject({ visits: 0, visitors: 0, submissions: 0, conversionRate: 0 });
  });

  it("honours a date range filter", async () => {
    const old = new Date("2026-01-01T00:00:00Z");
    const recent = new Date("2026-06-01T00:00:00Z");
    await visit("old-visitor", "X", old);
    await visit("recent-visitor", "X", recent);
    await submission("X", recent);

    const [filtered] = await getCampaignStats({ from: new Date("2026-05-01T00:00:00Z") });
    expect(filtered).toMatchObject({ visits: 1, visitors: 1, submissions: 1 });
  });
});

describe("getChannelStats", () => {
  it("splits metrics by channel and always returns all four", async () => {
    await visit("a", "INSTAGRAM");
    await visit("a", "INSTAGRAM"); // same visitor, second view
    await visit("b", "INSTAGRAM");
    await visit("c", "YOUTUBE");
    await submission("INSTAGRAM");
    await submission("YOUTUBE");

    const stats = await getChannelStats(campaignId);
    const byChannel = Object.fromEntries(stats.map((row) => [row.channel, row]));

    expect(stats).toHaveLength(4);
    expect(byChannel.INSTAGRAM).toMatchObject({
      visits: 3,
      visitors: 2,
      submissions: 1,
      conversionRate: 0.5,
    });
    expect(byChannel.YOUTUBE).toMatchObject({ visits: 1, visitors: 1, submissions: 1, conversionRate: 1 });
    expect(byChannel.X).toMatchObject({ visits: 0, submissions: 0 });
    expect(byChannel.THREADS).toMatchObject({ visits: 0, submissions: 0 });
  });

  it("surfaces direct traffic as a separate row when it exists", async () => {
    await visit("direct-visitor", null);
    await submission(null);

    const stats = await getChannelStats(campaignId);
    const direct = stats.find((row) => row.channel === null);
    expect(direct).toMatchObject({ visits: 1, visitors: 1, submissions: 1 });
  });

  it("omits the direct row when all traffic is attributed", async () => {
    await visit("a", "THREADS");
    const stats = await getChannelStats(campaignId);
    expect(stats.every((row) => row.channel !== null)).toBe(true);
  });

  it("counts a submission whose channel saw no visit", async () => {
    // Possible if a visitor's page load fails to record but the submit succeeds.
    await submission("THREADS");
    const stats = await getChannelStats(campaignId);
    const threads = stats.find((row) => row.channel === "THREADS");
    expect(threads).toMatchObject({ visits: 0, visitors: 0, submissions: 1, conversionRate: 0 });
  });
});

describe("getFormMetrics", () => {
  it("aggregates a single form", async () => {
    await visit("a", "X");
    await visit("a", "X");
    await visit("b", "X");
    await submission("X");

    expect(await getFormMetrics(formId)).toEqual({
      visits: 3,
      visitors: 2,
      submissions: 1,
      conversionRate: 0.5,
    });
  });

  it("returns zeroes for a form with no traffic", async () => {
    expect(await getFormMetrics(formId)).toEqual({
      visits: 0,
      visitors: 0,
      submissions: 0,
      conversionRate: 0,
    });
  });
});
