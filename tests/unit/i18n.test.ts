import { describe, expect, it } from "vitest";
import { dictionaries, en, ko } from "@/lib/i18n/dictionaries";
import { interpolate } from "@/lib/i18n";

type Node = Record<string, unknown>;

function paths(node: Node, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : paths(value as Node, path);
  });
}

function placeholders(node: Node, prefix = ""): Record<string, string[]> {
  return Object.entries(node).reduce<Record<string, string[]>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      const found = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      if (found.length) acc[path] = found;
    } else {
      Object.assign(acc, placeholders(value as Node, path));
    }
    return acc;
  }, {});
}

describe("dictionaries", () => {
  it("ships exactly the locales the app offers", () => {
    expect(Object.keys(dictionaries).sort()).toEqual(["en", "ko"]);
  });

  it("has the same keys in every locale", () => {
    // A missing key would otherwise surface as `undefined` in the UI.
    expect(paths(en).sort()).toEqual(paths(ko).sort());
  });

  it("uses the same placeholders for the same key in every locale", () => {
    // `{count}` becoming `{total}` in translation silently breaks interpolation.
    expect(placeholders(en)).toEqual(placeholders(ko));
  });

  it("has no empty strings", () => {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const path of paths(dict as Node)) {
        const value = path.split(".").reduce<unknown>((node, key) => (node as Node)[key], dict);
        expect(String(value).trim(), `${locale}.${path}`).not.toBe("");
      }
    }
  });
});

describe("interpolate", () => {
  it("substitutes named values", () => {
    expect(interpolate("폼 {forms}개 · 캠페인 {campaigns}개", { forms: 2, campaigns: 1 })).toBe(
      "폼 2개 · 캠페인 1개",
    );
  });

  it("leaves unknown placeholders visible rather than blanking them", () => {
    // A blank reads as finished copy; a visible {token} reads as a bug to fix.
    expect(interpolate("{a} and {b}", { a: "1" })).toBe("1 and {b}");
  });

  it("returns the template unchanged when it has no placeholders", () => {
    expect(interpolate("대시보드", { unused: 1 })).toBe("대시보드");
  });
});
