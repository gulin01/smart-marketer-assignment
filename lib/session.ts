import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { env } from "./env";
import { apiError } from "./http";

export interface SessionData {
  operatorId?: string;
  email?: string;
}

/**
 * Cookie is httpOnly + SameSite=Strict and host-scoped to APP_HOST, so a page
 * served from FORM_HOST can never attach it to a request (ADR 0003).
 */
export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "leadmagnet_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("로그인이 필요합니다");
    this.name = "UnauthorizedError";
  }
}

/**
 * Guard for every non-public API route. Throws `UnauthorizedError`, which
 * `withOperator` translates into a 401.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session.operatorId) throw new UnauthorizedError();
  return { operatorId: session.operatorId, email: session.email! };
}

/** Wraps a route handler so it runs only for an authenticated operator. */
export function withOperator<Args extends unknown[]>(
  handler: (
    operator: { operatorId: string; email: string },
    ...args: Args
  ) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      const operator = await requireSession();
      return await handler(operator, ...args);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return apiError("UNAUTHORIZED", "로그인이 필요합니다");
      }
      throw error;
    }
  };
}
