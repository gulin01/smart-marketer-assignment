import { z } from "zod";
import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const GET = withOperator(async () => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { forms: true } } },
  });
  return apiOk({
    campaigns: campaigns.map(({ _count, ...c }) => ({ ...c, formCount: _count.forms })),
  });
});

export const POST = withOperator(async (_operator, request: Request) => {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body", parsed.error.issues);
  }
  const campaign = await prisma.campaign.create({ data: parsed.data });
  return apiOk(campaign, 201);
});
