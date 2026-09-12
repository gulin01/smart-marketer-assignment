import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", parsed.error.issues);
  }

  const operator = await prisma.operator.findUnique({
    where: { email: parsed.data.email },
  });

  // Compare against a dummy hash when the operator is missing so that a wrong
  // email and a wrong password take the same amount of time.
  const hash = operator?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";
  const valid = await bcrypt.compare(parsed.data.password, hash);

  if (!operator || !valid) {
    return apiError("UNAUTHORIZED", "이메일 또는 비밀번호가 올바르지 않습니다");
  }

  const session = await getSession();
  session.operatorId = operator.id;
  session.email = operator.email;
  await session.save();

  return apiOk({ id: operator.id, email: operator.email });
}
