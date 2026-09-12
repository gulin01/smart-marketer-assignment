import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type { Channel } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";

dotenv.config({ path: ".env.production.local" });
dotenv.config();

/**
 * Replaces demo content with a coherent, realistic dataset.
 *
 * The operator account is never touched — only campaigns, templates and the
 * traffic hanging off them. Numbers are fixed rather than random so the demo
 * looks identical everywhere and screenshots stay reproducible.
 *
 *   npm run seed:demo                     # local
 *   SEED_TARGET=production npm run seed:demo
 */
const target = process.env.SEED_TARGET === "production";
const connectionString = target
  ? process.env.DATABASE_URL_UNPOOLED
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    target
      ? "SEED_TARGET=production requires DATABASE_URL_UNPOOLED (.env.production.local)"
      : "DATABASE_URL is not set",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const TEMPLATE_HTML = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>무료 스킨케어 루틴 가이드</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 2.5rem 1.5rem;
      font: 16px/1.6 -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
      color: #1a1a1a; background: #fbfaf8;
    }
    .card { max-width: 26rem; margin: 0 auto; background: #fff; border-radius: 14px;
            padding: 2rem 1.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    h1 { margin: 0 0 .5rem; font-size: 1.5rem; line-height: 1.3; letter-spacing: -.02em; }
    p.lead { margin: 0 0 1.75rem; color: #6b6b6b; font-size: .95rem; }
    label { display: block; margin-bottom: 1rem; font-size: .85rem; font-weight: 600; color: #444; }
    input, select { width: 100%; margin-top: .4rem; padding: .7rem .8rem; font: inherit;
                    border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    input:focus, select:focus { outline: 2px solid #c9a227; outline-offset: 1px; border-color: #c9a227; }
    button { width: 100%; margin-top: .5rem; padding: .85rem; font: inherit; font-weight: 700;
             color: #fff; background: #1a1a1a; border: 0; border-radius: 8px; cursor: pointer; }
    small { display: block; margin-top: 1rem; color: #9a9a9a; font-size: .75rem; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>피부 타입별 스킨케어 루틴 가이드</h1>
    <p class="lead">30페이지 PDF를 무료로 보내드립니다.</p>
    <form>
      <label>이름
        <input name="name" required placeholder="홍길동">
      </label>
      <label>연락처
        <input name="phone" required placeholder="010-0000-0000">
      </label>
      <label>이메일
        <input type="email" name="email" required placeholder="you@example.com">
      </label>
      <label>피부 타입
        <select name="skinType">
          <option>지성</option>
          <option>건성</option>
          <option>복합성</option>
          <option>민감성</option>
        </select>
      </label>
      <button type="submit">무료로 받아보기</button>
    </form>
    <small>제출하시면 이메일로 가이드를 보내드립니다.</small>
  </div>
</body>
</html>`;

const FIELD_NAMES = ["name", "phone", "email", "skinType"];

/** visits / visitors / submissions per channel. Threads converts best on less volume. */
const SPRING_TRAFFIC: Record<Channel, [number, number, number]> = {
  INSTAGRAM: [64, 52, 14],
  THREADS: [23, 20, 8],
  YOUTUBE: [37, 31, 6],
  X: [18, 15, 2],
};

const WINTER_TRAFFIC: Record<Channel, [number, number, number]> = {
  INSTAGRAM: [21, 18, 3],
  THREADS: [9, 8, 1],
  YOUTUBE: [12, 11, 2],
  X: [6, 5, 0],
};

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"];
const GIVEN = ["민수", "지훈", "서연", "예은", "도윤", "하준", "수아", "지우", "은우", "채원", "시우", "유진", "현서", "다인", "주원"];
const SKIN = ["지성", "건성", "복합성", "민감성"];

const CHANNELS = Object.keys(SPRING_TRAFFIC) as Channel[];

/** Spreads timestamps backwards from now so date filters have something to bite on. */
function daysAgo(days: number, index: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9 + (index % 12), (index * 7) % 60, 0, 0);
  return date;
}

async function seedCampaign(
  name: string,
  description: string,
  formTitle: string,
  slug: string,
  templateId: string,
  traffic: Record<Channel, [number, number, number]>,
  spreadDays: number,
) {
  const campaign = await prisma.campaign.create({ data: { name, description } });

  const form = await prisma.form.create({
    data: {
      slug,
      title: formTitle,
      campaignId: campaign.id,
      templateId,
      links: {
        create: CHANNELS.map((channel) => ({
          channel,
          url: `${process.env.FORM_HOST ?? "http://localhost:3000"}/f/${slug}?ch=${channel.toLowerCase()}`,
        })),
      },
    },
  });

  let seq = 0;
  const visits: { formId: string; channel: Channel; visitorId: string; createdAt: Date }[] = [];
  const submissions: Prisma.SubmissionCreateManyInput[] = [];

  for (const channel of CHANNELS) {
    const [visitCount, visitorCount, submissionCount] = traffic[channel];

    // Reuse a subset of visitor ids so visits > visitors, which is what makes
    // the visitors column mean something.
    const visitorIds = Array.from(
      { length: visitorCount },
      (_, i) => `${slug}-${channel.toLowerCase()}-v${i}`,
    );

    for (let i = 0; i < visitCount; i++) {
      visits.push({
        formId: form.id,
        channel,
        visitorId: visitorIds[i % visitorCount],
        createdAt: daysAgo(spreadDays - (i % spreadDays), seq++),
      });
    }

    for (let i = 0; i < submissionCount; i++) {
      const name = `${SURNAMES[seq % SURNAMES.length]}${GIVEN[seq % GIVEN.length]}`;
      const phone = `010-${String(2000 + (seq * 37) % 7999).padStart(4, "0")}-${String(1000 + (seq * 61) % 8999).padStart(4, "0")}`;
      const email = `lead${seq}@example.com`;
      const skinType = SKIN[seq % SKIN.length];

      submissions.push({
        formId: form.id,
        channel,
        visitorId: visitorIds[i % visitorCount],
        name,
        phone,
        email,
        data: { name, phone, email, skinType },
        createdAt: daysAgo(spreadDays - (i % spreadDays), seq++),
      });
    }
  }

  await prisma.visit.createMany({ data: visits });
  await prisma.submission.createMany({ data: submissions });

  return { campaign, form, visits: visits.length, submissions: submissions.length };
}

async function main() {
  console.log(`Seeding demo data (${target ? "PRODUCTION" : "local"})…`);

  // Campaigns cascade to forms, links, visits and submissions. The operator is
  // deliberately left alone — wiping it would lock everyone out.
  await prisma.campaign.deleteMany();
  await prisma.htmlTemplate.deleteMany();

  const template = await prisma.htmlTemplate.create({
    data: {
      name: "스킨케어 루틴 가이드 랜딩",
      html: TEMPLATE_HTML,
      fieldNames: FIELD_NAMES,
    },
  });

  const spring = await seedCampaign(
    "2026 봄 스킨케어 가이드",
    "피부 타입별 루틴 PDF 리드 매그넷",
    "봄 가이드 신청 폼",
    "spring-guide",
    template.id,
    SPRING_TRAFFIC,
    14,
  );

  const winter = await seedCampaign(
    "겨울 수분 케어 이벤트",
    "종료된 캠페인 — 비교용",
    "겨울 이벤트 신청 폼",
    "winter-care",
    template.id,
    WINTER_TRAFFIC,
    30,
  );

  for (const { campaign, visits, submissions } of [spring, winter]) {
    console.log(`  ${campaign.name}: 방문 ${visits} · 제출 ${submissions}`);
  }
  console.log("Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
