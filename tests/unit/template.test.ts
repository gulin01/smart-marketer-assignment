import { describe, expect, it } from "vitest";
import { TemplateValidationError, diffFields, extractCrmFields, parseTemplate } from "@/lib/template";

const wrap = (body: string) => `<!doctype html><html><body>${body}</body></html>`;

describe("parseTemplate", () => {
  it("collects named fields from input, select and textarea", () => {
    const { fieldNames } = parseTemplate(
      wrap(`<form>
        <input name="name">
        <input type="email" name="email">
        <select name="plan"><option>a</option></select>
        <textarea name="message"></textarea>
      </form>`),
    );
    expect(fieldNames).toEqual(["name", "email", "plan", "message"]);
  });

  it("rejects HTML with no form", () => {
    expect(() => parseTemplate(wrap("<p>no form</p>"))).toThrow(TemplateValidationError);
  });

  it("rejects more than one form", () => {
    expect(() =>
      parseTemplate(wrap('<form><input name="a"></form><form><input name="b"></form>')),
    ).toThrow(/manyForms/);
  });

  it("rejects a form with no named fields", () => {
    expect(() => parseTemplate(wrap("<form><button>Send</button></form>"))).toThrow(
      /noNamedFields/,
    );
  });

  it("ignores submit, button and reset controls", () => {
    const { fieldNames } = parseTemplate(
      wrap(`<form>
        <input name="name">
        <input type="submit" name="send" value="Send">
        <input type="reset" name="clear">
        <input type="button" name="noop">
      </form>`),
    );
    expect(fieldNames).toEqual(["name"]);
  });

  it("ignores the reserved __ prefix so templates cannot forge platform metadata", () => {
    const { fieldNames } = parseTemplate(
      wrap('<form><input name="name"><input name="__channel" value="YOUTUBE"></form>'),
    );
    expect(fieldNames).toEqual(["name"]);
  });

  it("deduplicates repeated field names", () => {
    const { fieldNames } = parseTemplate(
      wrap('<form><input type="radio" name="plan"><input type="radio" name="plan"></form>'),
    );
    expect(fieldNames).toEqual(["plan"]);
  });

  it("rejects templates over 200 KB", () => {
    const huge = wrap(`<form><input name="a"></form>${"x".repeat(210 * 1024)}`);
    expect(() => parseTemplate(huge)).toThrow(/tooLarge/);
  });
});

describe("extractCrmFields", () => {
  it("maps common English field names", () => {
    expect(
      extractCrmFields({ name: "Alex", phone: "010-0000-0000", email: "a@b.com" }),
    ).toEqual({ name: "Alex", phone: "010-0000-0000", email: "a@b.com" });
  });

  it("maps common Korean field names", () => {
    expect(extractCrmFields({ 이름: "김민수", 연락처: "010-1234-5678", 이메일: "m@e.com" })).toEqual({
      name: "김민수",
      phone: "010-1234-5678",
      email: "m@e.com",
    });
  });

  it("ignores unrelated and empty fields", () => {
    expect(extractCrmFields({ message: "hi", name: "" })).toEqual({});
  });

  it("keeps the first match when several fields map to one column", () => {
    expect(extractCrmFields({ email: "first@e.com", "e-mail": "second@e.com" }).email).toBe(
      "first@e.com",
    );
  });
});

describe("diffFields", () => {
  it("reports added, removed and kept fields", () => {
    expect(diffFields(["name", "phone"], ["name", "email"])).toEqual({
      added: ["email"],
      removed: ["phone"],
      kept: ["name"],
    });
  });

  it("reports nothing when the field set is unchanged", () => {
    const diff = diffFields(["name", "phone"], ["phone", "name"]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("treats a first version as all-added", () => {
    expect(diffFields([], ["name"])).toMatchObject({ added: ["name"], removed: [] });
  });
});
