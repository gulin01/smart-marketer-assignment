import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { CHANNELS, distributionUrl } from "@/lib/channels";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const form = await prisma.form.findUnique({
    where: { id },
    select: { id: true, links: true },
  });
  if (!form) return apiError("NOT_FOUND", "폼을 찾을 수 없습니다");
  return apiOk({ links: form.links });
});

/** Regenerates the four links — used after FORM_HOST changes between environments. */
export const POST = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const form = await prisma.form.findUnique({ where: { id }, select: { slug: true } });
  if (!form) return apiError("NOT_FOUND", "폼을 찾을 수 없습니다");

  const links = await prisma.$transaction(
    CHANNELS.map((channel) =>
      prisma.distributionLink.upsert({
        where: { formId_channel: { formId: id, channel } },
        update: { url: distributionUrl(form.slug, channel) },
        create: { formId: id, channel, url: distributionUrl(form.slug, channel) },
      }),
    ),
  );

  return apiOk({ links });
});
