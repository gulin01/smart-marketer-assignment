import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieJar } from "../helpers/next-headers";
import { resetDatabase, seedOperator } from "../helpers/db";
import { jsonRequest, readJson } from "../helpers/request";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as listCampaigns } from "@/app/api/campaigns/route";

const LOGIN_URL = "http://localhost:3000/api/auth/login";

beforeAll(async () => {
  await resetDatabase();
  await seedOperator();
});

beforeEach(() => cookieJar.clear());

describe("POST /api/auth/login", () => {
  it("signs the operator in and starts a session", async () => {
    const response = await login(
      jsonRequest(LOGIN_URL, { email: "admin@example.com", password: "admin1234" }),
    );
    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({ email: "admin@example.com" });

    const session = await me();
    expect(session.status).toBe(200);
  });

  it("rejects a wrong password with 401", async () => {
    const response = await login(
      jsonRequest(LOGIN_URL, { email: "admin@example.com", password: "nope" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects an unknown email with the same 401 and message", async () => {
    const response = await login(
      jsonRequest(LOGIN_URL, { email: "nobody@example.com", password: "admin1234" }),
    );
    expect(response.status).toBe(401);
    // Identical to the wrong-password response: no account enumeration.
    const body = await readJson(response);
    expect(body.error).toMatchObject({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
  });

  it("rejects a malformed body with 400", async () => {
    const response = await login(jsonRequest(LOGIN_URL, { email: "not-an-email" }));
    expect(response.status).toBe(400);
  });
});

describe("session lifecycle", () => {
  it("GET /api/auth/me is 401 without a session", async () => {
    expect((await me()).status).toBe(401);
  });

  it("logout ends the session", async () => {
    await login(jsonRequest(LOGIN_URL, { email: "admin@example.com", password: "admin1234" }));
    expect((await me()).status).toBe(200);

    await logout();
    expect((await me()).status).toBe(401);
  });
});

describe("protected routes", () => {
  it("GET /api/campaigns is 401 without a session", async () => {
    const response = await listCampaigns();
    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("GET /api/campaigns succeeds once signed in", async () => {
    await login(jsonRequest(LOGIN_URL, { email: "admin@example.com", password: "admin1234" }));
    const response = await listCampaigns();
    expect(response.status).toBe(200);
  });
});
