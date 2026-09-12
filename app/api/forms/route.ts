import { customAlphabet } from "nanoid";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { CHANNELS, distributionUrl } from "@/lib/channels";

// URL-safe, unambiguous alphabet — these slugs get pasted into social bios.
const nanoid = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

const createSchema = z.object({
  campaignId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,64}$/, "Slug may contain lowercase letters, digits and hyphens")
    .optional(),
});

export const GET = withOperator(async (_operator, request: Request) => {
  const campaignId = new URL(request.url).searchParams.get("campaignId") ?? undefined;
  const forms = await prisma.form.findMany({
    where: campaignId ? { campaignId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      links: true,
      campaign: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  });
  return apiOk({ forms });
});

export const POST = withOperator(async (_operator, request: Request) => {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", parsed.error.issues);
  }
  const { campaignId, templateId, title } = parsed.data;

  const [campaign, template] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } }),
    prisma.htmlTemplate.findUnique({ where: { id: templateId }, select: { id: true } }),
  ]);
  if (!campaign) return apiError("NOT_FOUND", "캠페인을 찾을 수 없습니다");
  if (!template) return apiError("NOT_FOUND", "템플릿을 찾을 수 없습니다");

  const slug = parsed.data.slug ?? nanoid();
  if (await prisma.form.findUnique({ where: { slug }, select: { id: true } })) {
    return apiError("CONFLICT", `슬러그 "${slug}" 는 이미 사용 중입니다`);
  }

  // The four distribution links are created with the form so the operator never
  // sees a form without links (ADR 0006).
  const form = await prisma.form.create({
    data: {
      slug,
      title,
      campaignId,
      templateId,
      links: {
        create: CHANNELS.map((channel) => ({
          channel,
          url: distributionUrl(slug, channel),
        })),
      },
    },
    include: { links: true },
  });

  return apiOk(form, 201);
});
