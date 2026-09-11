import { beforeAll, describe, expect, it } from "vitest";
import { cookieJar } from "../helpers/next-headers";
import { resetDatabase, seedForm, seedOperator } from "../helpers/db";
import { ctx, getRequest, jsonRequest } from "../helpers/request";
import { prisma } from "@/lib/db";

import { POST as login } from "@/app/api/auth/login/route";
import { GET as listSubmissions } from "@/app/api/forms/[id]/submissions/route";

let formId: string;

beforeAll(async () => {
  await resetDatabase();
  await seedOperator();
  const { form } = await seedForm({ slug: "export-form" });
  formId = form.id;

  await prisma.submission.createMany({
    data: [
      {
        formId,
        channel: "INSTAGRAM",
        name: "김민수",
        phone: "010-1111-2222",
        email: "minsu@example.com",
        data: { name: "김민수", phone: "010-1111-2222", email: "minsu@example.com", message: "안녕" },
      },
      {
        formId,
        channel: null,
        name: "=cmd|calc",
        data: { name: "=cmd|calc", message: 'quote " and, comma' },
      },
    ],
  });

  await login(
    jsonRequest("http://localhost:3000/api/auth/login", {
      email: "admin@example.com",
      password: "admin1234",
    }),
  );
});

const request = (query = "") =>
  listSubmissions(
    getRequest(`http://localhost:3000/api/forms/${formId}/submissions${query}`),
    ctx({ id: formId }),
  );

describe("GET /api/forms/[id]/submissions", () => {
  it("returns JSON by default", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { submissions: unknown[] };
    expect(body.submissions).toHaveLength(2);
  });

  it("404s for an unknown form", async () => {
    const response = await listSubmissions(
      getRequest("http://localhost:3000/api/forms/nope/submissions"),
      ctx({ id: "nope" }),
    );
    expect(response.status).toBe(404);
  });

  it("requires a session", async () => {
    cookieJar.clear();
    expect((await request()).status).toBe(401);
    await login(
      jsonRequest("http://localhost:3000/api/auth/login", {
        email: "admin@example.com",
        password: "admin1234",
      }),
    );
  });
});

describe("CSV export", () => {
  it("serves a downloadable UTF-8 CSV", async () => {
    const response = await request("?format=csv");
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment");

    // `Response.text()` strips a leading BOM per the Fetch spec, so the raw
    // bytes are checked instead: Excel needs it to read Korean as UTF-8.
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await response.text()).toContain("김민수");
  });

  it("has one header row and one row per submission, with unique columns", async () => {
    const csv = await (await request("?format=csv")).text();
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    const header = lines[0].split(",").map((cell) => cell.replace(/"/g, ""));

    expect(new Set(header).size).toBe(header.length);
    expect(header).toContain("submittedAt");
    expect(header).toContain("answer.message");
    expect(lines).toHaveLength(3); // header + 2 submissions
  });

  it("neutralises spreadsheet formula injection", async () => {
    const csv = await (await request("?format=csv")).text();
    // A leading = would execute in Excel; it must be quoted off.
    expect(csv).toContain("\"'=cmd|calc\"");
    expect(csv).not.toMatch(/,"=cmd\|calc"/);
  });

  it("escapes embedded quotes and commas", async () => {
    const csv = await (await request("?format=csv")).text();
    expect(csv).toContain('quote "" and, comma');
  });

  it("rejects an invalid date filter with 400", async () => {
    expect((await request("?from=not-a-date")).status).toBe(400);
  });
});
