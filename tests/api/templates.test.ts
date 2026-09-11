import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieJar } from "../helpers/next-headers";
import { SAMPLE_TEMPLATE, resetDatabase, seedOperator } from "../helpers/db";
import { jsonRequest, readJson } from "../helpers/request";

import { POST as login } from "@/app/api/auth/login/route";
import { GET as listTemplates, POST as createTemplate } from "@/app/api/templates/route";

const URL_ = "http://localhost:3000/api/templates";

async function signIn() {
  await login(
    jsonRequest("http://localhost:3000/api/auth/login", {
      email: "admin@example.com",
      password: "admin1234",
    }),
  );
}

beforeAll(async () => {
  await resetDatabase();
  await seedOperator();
});

beforeEach(async () => {
  cookieJar.clear();
  await signIn();
});

describe("POST /api/templates", () => {
  it("stores a valid template and extracts its field names", async () => {
    const response = await createTemplate(
      jsonRequest(URL_, { name: "리드 폼", html: SAMPLE_TEMPLATE }),
    );
    expect(response.status).toBe(201);
    expect(await readJson(response)).toMatchObject({
      name: "리드 폼",
      fieldNames: ["name", "phone", "email", "message"],
    });
  });

  it("rejects HTML with no <form> (400)", async () => {
    const response = await createTemplate(
      jsonRequest(URL_, { name: "bad", html: "<html><body>no form</body></html>" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a form with no named inputs (400)", async () => {
    const response = await createTemplate(
      jsonRequest(URL_, { name: "bad", html: "<form><button>go</button></form>" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a body missing required fields (400)", async () => {
    const response = await createTemplate(
      jsonRequest(URL_, { html: SAMPLE_TEMPLATE }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a non-HTML upload (400)", async () => {
    const body = new FormData();
    body.set("file", new File(["id,name\n1,a"], "leads.csv", { type: "text/csv" }));
    const response = await createTemplate(
      new Request(URL_, { method: "POST", body }),
    );
    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: { message: "Only .html files are accepted" },
    });
  });

  it("accepts a multipart .html upload", async () => {
    const body = new FormData();
    body.set("file", new File([SAMPLE_TEMPLATE], "landing.html", { type: "text/html" }));
    const response = await createTemplate(
      new Request(URL_, { method: "POST", body }),
    );
    expect(response.status).toBe(201);
    expect(await readJson(response)).toMatchObject({ name: "landing.html" });
  });

  it("rejects an upload over 200 KB (400)", async () => {
    const huge = `<form><input name="a"></form>${"<p>x</p>".repeat(40_000)}`;
    const body = new FormData();
    body.set("file", new File([huge], "huge.html", { type: "text/html" }));
    const response = await createTemplate(
      new Request(URL_, { method: "POST", body }),
    );
    expect(response.status).toBe(400);
  });

  it("requires a session (401)", async () => {
    cookieJar.clear();
    const response = await createTemplate(
      jsonRequest(URL_, { name: "x", html: SAMPLE_TEMPLATE }),
    );
    expect(response.status).toBe(401);
  });
});

describe("GET /api/templates", () => {
  it("lists templates for a signed-in operator", async () => {
    await createTemplate(
      jsonRequest(URL_, { name: "목록 확인", html: SAMPLE_TEMPLATE }),
    );
    const response = await listTemplates();
    expect(response.status).toBe(200);
    const body = (await readJson(response)) as { templates: unknown[] };
    expect(body.templates.length).toBeGreaterThan(0);
  });
});
