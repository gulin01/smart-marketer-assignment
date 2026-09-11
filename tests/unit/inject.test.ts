import { describe, expect, it } from "vitest";
import { CHANNEL_FIELD, VISITOR_FIELD, injectFormRuntime } from "@/lib/inject";

const template = `<!doctype html><html><body><form><input name="name"></form></body></html>`;
const options = {
  endpoint: "http://localhost:3000/api/public/forms/abc/submissions",
  channel: "INSTAGRAM" as const,
  visitorId: "visitor-123",
};

describe("injectFormRuntime", () => {
  it("adds the channel and visitor as hidden fields", () => {
    const html = injectFormRuntime(template, options);
    expect(html).toContain(`name="${CHANNEL_FIELD}" value="INSTAGRAM"`);
    expect(html).toContain(`name="${VISITOR_FIELD}" value="visitor-123"`);
  });

  it("injects the submit handler pointing at the endpoint", () => {
    const html = injectFormRuntime(template, options);
    expect(html).toContain("addEventListener('submit'");
    expect(html).toContain(options.endpoint);
  });

  it("keeps the operator's own markup intact", () => {
    const html = injectFormRuntime(template, options);
    expect(html).toContain('<input name="name">');
  });

  it("omits hidden fields that have no value", () => {
    const html = injectFormRuntime(template, { ...options, channel: null, visitorId: null });
    // The names still appear inside the injected script; what must be absent is
    // the hidden <input>, so the server records a null channel rather than a guess.
    expect(html).not.toContain(`name="${CHANNEL_FIELD}"`);
    expect(html).not.toContain(`name="${VISITOR_FIELD}"`);
  });

  it("escapes the visitor id so it cannot break out of the attribute", () => {
    const html = injectFormRuntime(template, {
      ...options,
      visitorId: '"><script>alert(1)</script>',
    });
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("returns the HTML untouched when there is no form to enhance", () => {
    const formless = "<html><body><p>nothing</p></body></html>";
    expect(injectFormRuntime(formless, options)).toBe(formless);
  });
});
