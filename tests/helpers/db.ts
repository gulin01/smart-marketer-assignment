import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/** Wipes every table. Order does not matter — one statement, cascading. */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Submission","Visit","DistributionLink","Form","HtmlTemplate","Campaign","Operator" RESTART IDENTITY CASCADE',
  );
}

export async function seedOperator(
  email = "admin@example.com",
  password = "admin1234",
) {
  return prisma.operator.create({
    data: { email, passwordHash: await bcrypt.hash(password, 4) },
  });
}

export const SAMPLE_TEMPLATE = `<!doctype html><html><body>
<form>
  <input name="name" placeholder="이름">
  <input name="phone" placeholder="연락처">
  <input type="email" name="email">
  <textarea name="message"></textarea>
  <button type="submit">신청</button>
</form>
</body></html>`;

/** Builds a campaign + template + form (with its four links) ready to receive traffic. */
export async function seedForm(overrides: { slug?: string; isActive?: boolean } = {}) {
  const [campaign, template] = await Promise.all([
    prisma.campaign.create({ data: { name: "테스트 캠페인" } }),
    prisma.htmlTemplate.create({
      data: {
        name: "테스트 템플릿",
        html: SAMPLE_TEMPLATE,
        fieldNames: ["name", "phone", "email", "message"],
      },
    }),
  ]);

  const slug = overrides.slug ?? "test-form";
  const form = await prisma.form.create({
    data: {
      slug,
      title: "테스트 폼",
      campaignId: campaign.id,
      templateId: template.id,
      isActive: overrides.isActive ?? true,
      links: {
        create: (["INSTAGRAM", "X", "YOUTUBE", "THREADS"] as const).map((channel) => ({
          channel,
          url: `http://localhost:3000/f/${slug}?ch=${channel.toLowerCase()}`,
        })),
      },
    },
    include: { links: true },
  });

  return { campaign, template, form };
}
