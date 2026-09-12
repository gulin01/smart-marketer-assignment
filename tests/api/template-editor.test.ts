import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cookieJar } from "../helpers/next-headers";
import { SAMPLE_TEMPLATE, resetDatabase, seedForm, seedOperator } from "../helpers/db";
import { ctx, getRequest, jsonRequest, readJson } from "../helpers/request";
import { prisma } from "@/lib/db";

import { POST as login } from "@/app/api/auth/login/route";
import { GET as getTemplate, PUT as updateTemplate } from "@/app/api/templates/[id]/route";
import { GET as listVersions } from "@/app/api/templates/[id]/versions/route";
import { POST as restoreVersion } from "@/app/api/templates/[id]/versions/[versionId]/restore/route";

const EDITED = `<!doctype html><html><body>
<form>
  <input name="name">
  <input name="phone">
  <input type="email" name="email">
  <textarea name="message"></textarea>
  <input name="referrer">
</form></body></html>`;

const DROPS_PHONE = `<!doctype html><html><body>
<form><input name="name"><input type="email" name="email"><textarea name="message"></textarea></form>
</body></html>`;

const url = (id: string) => `http://localhost:3000/api/templates/${id}`;

async function signIn() {
  await login(
    jsonRequest("http://localhost:3000/api/auth/login", {
      email: "admin@example.com",
      password: "admin1234",
    }),
  );
}

const put = (id: string, body: unknown) =>
  updateTemplate(jsonRequest(url(id), body, { method: "PUT" }), ctx({ id }));

let templateId: string;
let formId: string;

beforeAll(async () => {
  await resetDatabase();
  await seedOperator();
});

beforeEach(async () => {
  cookieJar.clear();
  await signIn();
  await prisma.templateVersion.deleteMany();
  await prisma.submission.deleteMany();

  const seeded = await seedForm({ slug: `edit-${Math.floor(Math.random() * 1e9)}` });
  templateId = seeded.template.id;
  formId = seeded.form.id;
});

describe("GET /api/templates/[id]", () => {
  it("returns the source, fields and usage counts", async () => {
    const response = await getTemplate(getRequest(url(templateId)), ctx({ id: templateId }));
    expect(response.status).toBe(200);
    expect(await readJson(response)).toMatchObject({
      id: templateId,
      html: SAMPLE_TEMPLATE,
      fieldNames: ["name", "phone", "email", "message"],
      versionCount: 0,
      usage: { forms: 1, campaigns: 1 },
    });
  });

  it("404s for an unknown template", async () => {
    const response = await getTemplate(getRequest(url("nope")), ctx({ id: "nope" }));
    expect(response.status).toBe(404);
  });

  it("requires a session", async () => {
    cookieJar.clear();
    const response = await getTemplate(getRequest(url(templateId)), ctx({ id: templateId }));
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/templates/[id]", () => {
  it("saves in place, keeping the id so existing forms follow the edit", async () => {
    const response = await put(templateId, { html: EDITED });
    expect(response.status).toBe(200);

    const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id: templateId } });
    expect(stored.html).toBe(EDITED);
    expect(stored.fieldNames).toContain("referrer");

    // The form still points at the same template row — no relinking needed.
    const form = await prisma.form.findUniqueOrThrow({ where: { id: formId } });
    expect(form.templateId).toBe(templateId);
  });

  it("snapshots the previous content before overwriting", async () => {
    await put(templateId, { html: EDITED });

    const versions = await prisma.templateVersion.findMany({ where: { templateId } });
    expect(versions).toHaveLength(1);
    // The snapshot holds what was replaced, not what replaced it.
    expect(versions[0].html).toBe(SAMPLE_TEMPLATE);
  });

  it("updates the name when one is supplied", async () => {
    await put(templateId, { html: EDITED, name: "새 이름" });
    const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id: templateId } });
    expect(stored.name).toBe("새 이름");
  });

  it("rejects HTML that no longer has a form", async () => {
    const response = await put(templateId, { html: "<html><body>gone</body></html>" });
    expect(response.status).toBe(400);
    // The live template is untouched by a rejected save.
    const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id: templateId } });
    expect(stored.html).toBe(SAMPLE_TEMPLATE);
  });

  it("rejects two forms", async () => {
    const response = await put(templateId, {
      html: '<form><input name="a"></form><form><input name="b"></form>',
    });
    expect(response.status).toBe(400);
  });

  it("requires a session", async () => {
    cookieJar.clear();
    expect((await put(templateId, { html: EDITED })).status).toBe(401);
  });

  describe("when an edit drops a field", () => {
    it("asks for confirmation and reports the affected submissions", async () => {
      await prisma.submission.create({
        data: { formId, data: { name: "김민수", phone: "010-0000-0000" } },
      });

      const response = await put(templateId, { html: DROPS_PHONE });
      expect(response.status).toBe(409);
      expect(await readJson(response)).toMatchObject({
        error: {
          code: "CONFLICT",
          details: {
            removedFields: ["phone"],
            affectedSubmissions: 1,
            requiresConfirmation: true,
          },
        },
      });

      // Nothing was written while awaiting confirmation.
      const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id: templateId } });
      expect(stored.html).toBe(SAMPLE_TEMPLATE);
    });

    it("proceeds once confirmed, leaving collected data intact", async () => {
      const submission = await prisma.submission.create({
        data: { formId, data: { name: "김민수", phone: "010-0000-0000" } },
      });

      const response = await put(templateId, { html: DROPS_PHONE, confirmFieldRemoval: true });
      expect(response.status).toBe(200);

      const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id: templateId } });
      expect(stored.fieldNames).not.toContain("phone");

      // Already-collected answers survive; the field simply stops being captured.
      const kept = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
      expect(kept.data).toMatchObject({ phone: "010-0000-0000" });
    });

    it("does not ask when fields are only added", async () => {
      const response = await put(templateId, { html: EDITED });
      expect(response.status).toBe(200);
    });
  });
});

describe("version history", () => {
  it("lists versions newest first without the HTML payload", async () => {
    await put(templateId, { html: EDITED });
    await put(templateId, { html: DROPS_PHONE, confirmFieldRemoval: true });

    const response = await listVersions(
      getRequest(`${url(templateId)}/versions`),
      ctx({ id: templateId }),
    );
    expect(response.status).toBe(200);

    const body = (await readJson(response)) as {
      versions: { fieldNames: string[]; createdBy: { email: string } | null; html?: string }[];
    };
    expect(body.versions).toHaveLength(2);
    expect(body.versions[0].html).toBeUndefined();
    expect(body.versions[0].createdBy?.email).toBe("admin@example.com");
  });

  it("404s for an unknown template", async () => {
    const response = await listVersions(
      getRequest(`${url("nope")}/versions`),
      ctx({ id: "nope" }),
    );
    expect(response.status).toBe(404);
  });
});

describe("restore", () => {
  it("puts a past version back and is itself undoable", async () => {
    await put(templateId, { html: EDITED });
    const [version] = await prisma.templateVersion.findMany({ where: { templateId } });

    const response = await restoreVersion(
      new Request(`${url(templateId)}/versions/${version.id}/restore`, { method: "POST" }),
      ctx({ id: templateId, versionId: version.id }),
    );
    expect(response.status).toBe(200);

    const stored = await prisma.htmlTemplate.findUniqueOrThrow({ where: { id: templateId } });
    expect(stored.html).toBe(SAMPLE_TEMPLATE);

    // Restoring snapshots the content it replaced, so the edit is not lost.
    const versions = await prisma.templateVersion.findMany({
      where: { templateId },
      orderBy: { createdAt: "desc" },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0].html).toBe(EDITED);
    expect(versions[0].note).toBe(`restored-from:${version.id}`);
  });

  it("refuses a version belonging to a different template", async () => {
    await put(templateId, { html: EDITED });
    const [version] = await prisma.templateVersion.findMany({ where: { templateId } });

    const other = await prisma.htmlTemplate.create({
      data: { name: "other", html: SAMPLE_TEMPLATE, fieldNames: ["name"] },
    });

    const response = await restoreVersion(
      new Request(`${url(other.id)}/versions/${version.id}/restore`, { method: "POST" }),
      ctx({ id: other.id, versionId: version.id }),
    );
    expect(response.status).toBe(404);
  });
});
