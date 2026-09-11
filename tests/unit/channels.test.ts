import { describe, expect, it } from "vitest";
import { CHANNELS, channelSlug, distributionUrl, parseChannel } from "@/lib/channels";

describe("parseChannel", () => {
  it("accepts the four known channel slugs", () => {
    expect(parseChannel("instagram")).toBe("INSTAGRAM");
    expect(parseChannel("x")).toBe("X");
    expect(parseChannel("youtube")).toBe("YOUTUBE");
    expect(parseChannel("threads")).toBe("THREADS");
  });

  it("is case and whitespace insensitive", () => {
    expect(parseChannel("  InStaGram ")).toBe("INSTAGRAM");
  });

  it("accepts the enum value itself, as sent by the injected form script", () => {
    expect(parseChannel("INSTAGRAM")).toBe("INSTAGRAM");
  });

  it("degrades to null instead of throwing on junk", () => {
    // A visitor editing ?ch= must still get a working form (ADR 0006).
    expect(parseChannel("tiktok")).toBeNull();
    expect(parseChannel("")).toBeNull();
    expect(parseChannel(null)).toBeNull();
    expect(parseChannel(undefined)).toBeNull();
  });
});

describe("distributionUrl", () => {
  it("builds a FORM_HOST link carrying the channel", () => {
    expect(distributionUrl("abc123", "INSTAGRAM")).toBe(
      "http://localhost:3000/f/abc123?ch=instagram",
    );
  });

  it("round-trips through parseChannel for every channel", () => {
    for (const channel of CHANNELS) {
      const url = new URL(distributionUrl("abc123", channel));
      expect(parseChannel(url.searchParams.get("ch"))).toBe(channel);
      expect(channelSlug(channel)).toBe(channel.toLowerCase());
    }
  });
});
