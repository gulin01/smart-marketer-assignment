import { Prisma } from "@/generated/prisma/client";
import type { Channel } from "@/generated/prisma/enums";
import { prisma } from "./db";
import { CHANNELS } from "./channels";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface Metrics {
  visits: number;
  visitors: number;
  submissions: number;
  conversionRate: number;
}

export interface CampaignStats extends Metrics {
  campaignId: string;
  campaignName: string;
}

export interface ChannelStats extends Metrics {
  channel: Channel | null;
}

/**
 * Conversion is submissions ÷ unique visitors (ADR 0004). Visitors, not visits:
 * one person reloading the page five times should not dilute the rate.
 * Returns a 0–1 ratio rounded to four decimals; zero visitors means zero.
 */
export function conversionRate(submissions: number, visitors: number): number {
  if (visitors <= 0) return 0;
  return Math.round((submissions / visitors) * 10_000) / 10_000;
}

/** Postgres returns COUNT(*) as bigint, which the driver hands back as BigInt. */
function toNumber(value: bigint | number | null): number {
  return value === null ? 0 : Number(value);
}

function dateFilter(column: Prisma.Sql, range?: DateRange): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  if (range?.from) clauses.push(Prisma.sql`${column} >= ${range.from}`);
  if (range?.to) clauses.push(Prisma.sql`${column} <= ${range.to}`);
  if (clauses.length === 0) return Prisma.empty;
  return Prisma.sql` AND ${Prisma.join(clauses, " AND ")}`;
}

/**
 * Visits and submissions are aggregated in separate CTEs and joined afterwards.
 * Aggregating them in a single join would multiply rows (every visit paired with
 * every submission) and silently inflate both counts.
 */
export async function getCampaignStats(range?: DateRange): Promise<CampaignStats[]> {
  const rows = await prisma.$queryRaw<
    { campaignId: string; campaignName: string; visits: bigint; visitors: bigint; submissions: bigint }[]
  >(Prisma.sql`
    WITH visit_totals AS (
      SELECT f."campaignId" AS campaign_id,
             COUNT(*) AS visits,
             COUNT(DISTINCT v."visitorId") AS visitors
      FROM "Visit" v
      JOIN "Form" f ON f.id = v."formId"
      WHERE TRUE${dateFilter(Prisma.sql`v."createdAt"`, range)}
      GROUP BY f."campaignId"
    ),
    submission_totals AS (
      SELECT f."campaignId" AS campaign_id,
             COUNT(*) AS submissions
      FROM "Submission" s
      JOIN "Form" f ON f.id = s."formId"
      WHERE TRUE${dateFilter(Prisma.sql`s."createdAt"`, range)}
      GROUP BY f."campaignId"
    )
    SELECT c.id                             AS "campaignId",
           c.name                           AS "campaignName",
           COALESCE(v.visits, 0)            AS visits,
           COALESCE(v.visitors, 0)          AS visitors,
           COALESCE(s.submissions, 0)       AS submissions
    FROM "Campaign" c
    LEFT JOIN visit_totals v ON v.campaign_id = c.id
    LEFT JOIN submission_totals s ON s.campaign_id = c.id
    ORDER BY c."createdAt" DESC
  `);

  return rows.map((row) => {
    const visits = toNumber(row.visits);
    const visitors = toNumber(row.visitors);
    const submissions = toNumber(row.submissions);
    return {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      visits,
      visitors,
      submissions,
      conversionRate: conversionRate(submissions, visitors),
    };
  });
}

/** Per-channel breakdown for one campaign. Always returns all four channels. */
export async function getChannelStats(
  campaignId: string,
  range?: DateRange,
): Promise<ChannelStats[]> {
  const rows = await prisma.$queryRaw<
    { channel: Channel | null; visits: bigint; visitors: bigint; submissions: bigint }[]
  >(Prisma.sql`
    WITH visit_totals AS (
      SELECT v.channel,
             COUNT(*) AS visits,
             COUNT(DISTINCT v."visitorId") AS visitors
      FROM "Visit" v
      JOIN "Form" f ON f.id = v."formId"
      WHERE f."campaignId" = ${campaignId}${dateFilter(Prisma.sql`v."createdAt"`, range)}
      GROUP BY v.channel
    ),
    submission_totals AS (
      SELECT s.channel,
             COUNT(*) AS submissions
      FROM "Submission" s
      JOIN "Form" f ON f.id = s."formId"
      WHERE f."campaignId" = ${campaignId}${dateFilter(Prisma.sql`s."createdAt"`, range)}
      GROUP BY s.channel
    ),
    all_channels AS (
      SELECT channel FROM visit_totals
      UNION
      SELECT channel FROM submission_totals
    )
    SELECT a.channel                        AS channel,
           COALESCE(v.visits, 0)            AS visits,
           COALESCE(v.visitors, 0)          AS visitors,
           COALESCE(s.submissions, 0)       AS submissions
    FROM all_channels a
    -- NULL channel (direct traffic) is a real grouping key, so the join has to
    -- treat NULL = NULL as a match. Postgres rejects IS NOT DISTINCT FROM in a
    -- FULL JOIN, so the channel keys are unioned first and LEFT JOINed here.
    LEFT JOIN visit_totals v ON v.channel IS NOT DISTINCT FROM a.channel
    LEFT JOIN submission_totals s ON s.channel IS NOT DISTINCT FROM a.channel
  `);

  const byChannel = new Map<Channel | null, ChannelStats>();
  for (const row of rows) {
    const visits = toNumber(row.visits);
    const visitors = toNumber(row.visitors);
    const submissions = toNumber(row.submissions);
    byChannel.set(row.channel, {
      channel: row.channel,
      visits,
      visitors,
      submissions,
      conversionRate: conversionRate(submissions, visitors),
    });
  }

  const empty = (channel: Channel | null): ChannelStats => ({
    channel,
    visits: 0,
    visitors: 0,
    submissions: 0,
    conversionRate: 0,
  });

  // The four known channels always appear, plus a direct-traffic row when it has data.
  const result: ChannelStats[] = CHANNELS.map((c) => byChannel.get(c) ?? empty(c));
  const direct = byChannel.get(null);
  if (direct && (direct.visits > 0 || direct.submissions > 0)) result.push(direct);
  return result;
}

/** Totals for a single form, used on the form detail page. */
export async function getFormMetrics(formId: string, range?: DateRange): Promise<Metrics> {
  const [visitAgg, submissions] = await Promise.all([
    prisma.$queryRaw<{ visits: bigint; visitors: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS visits, COUNT(DISTINCT "visitorId") AS visitors
      FROM "Visit"
      WHERE "formId" = ${formId}${dateFilter(Prisma.sql`"createdAt"`, range)}
    `),
    prisma.submission.count({
      where: {
        formId,
        createdAt: range?.from || range?.to ? { gte: range.from, lte: range.to } : undefined,
      },
    }),
  ]);

  const visits = toNumber(visitAgg[0]?.visits ?? 0);
  const visitors = toNumber(visitAgg[0]?.visitors ?? 0);
  return { visits, visitors, submissions, conversionRate: conversionRate(submissions, visitors) };
}
