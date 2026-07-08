// Shared channel model — the cross-producer hub (Slice 1, Task 1). Pure, no deps.
// Every consumer (dw-chart export-aspect, suggest-chart routing/eval, produce-all
// conformance) imports these exact names — see the plan
// docs/superpowers/plans/2026-07-08-channel-driven-format-slice-1.md.
import { describe, it, expect } from "bun:test";
import {
  CHANNELS,
  ALL_CHANNELS,
  allowedFormats,
  isFormatAllowed,
  mediaSize,
  normalizeChannel,
  channelAspect,
  renderSize,
  assertRenderedSize,
  type Channel,
} from "../src/channel";

describe("ALL_CHANNELS / CHANNELS", () => {
  it("lists the 3 canonical channels in a stable order", () => {
    expect(ALL_CHANNELS).toEqual([
      "social-vertical",
      "social-feed",
      "article-web",
    ]);
  });

  it("has a CHANNELS entry for each channel in ALL_CHANNELS", () => {
    for (const ch of ALL_CHANNELS) {
      expect(CHANNELS[ch]).toBeDefined();
    }
  });
});

describe("allowedFormats / isFormatAllowed", () => {
  it("social-vertical excludes interactive and scrolly", () => {
    const formats = allowedFormats("social-vertical");
    expect(formats).not.toContain("interactive");
    expect(formats).not.toContain("scrolly");
    expect(formats).toContain("static");
    expect(formats).toContain("video");
  });

  it("social-feed excludes interactive and scrolly", () => {
    const formats = allowedFormats("social-feed");
    expect(formats).not.toContain("interactive");
    expect(formats).not.toContain("scrolly");
    expect(formats).toContain("static");
    expect(formats).toContain("video");
  });

  it("article-web includes all four formats", () => {
    const formats = allowedFormats("article-web");
    expect(formats).toContain("static");
    expect(formats).toContain("interactive");
    expect(formats).toContain("video");
    expect(formats).toContain("scrolly");
  });

  it("isFormatAllowed(social-feed, interactive) === false", () => {
    expect(isFormatAllowed("social-feed", "interactive")).toBe(false);
  });

  it("isFormatAllowed(article-web, interactive) === true", () => {
    expect(isFormatAllowed("article-web", "interactive")).toBe(true);
  });

  it("isFormatAllowed(social-vertical, video) === true", () => {
    expect(isFormatAllowed("social-vertical", "video")).toBe(true);
  });

  it("isFormatAllowed(social-vertical, static) === true", () => {
    expect(isFormatAllowed("social-vertical", "static")).toBe(true);
  });

  it("isFormatAllowed(social-feed, scrolly) === false", () => {
    expect(isFormatAllowed("social-feed", "scrolly")).toBe(false);
  });
});

describe("interactiveDefault", () => {
  it("is true only for article-web", () => {
    for (const ch of ALL_CHANNELS) {
      const expected = ch === "article-web";
      expect(CHANNELS[ch].interactiveDefault).toBe(expected);
    }
  });
});

describe("interactiveAspect", () => {
  it("is responsive for every channel", () => {
    for (const ch of ALL_CHANNELS) {
      expect(CHANNELS[ch].interactiveAspect).toBe("responsive");
    }
  });
});

describe("mediaSize", () => {
  it("social-vertical → 1080x1920 (9:16 portrait)", () => {
    expect(mediaSize("social-vertical")).toEqual({ width: 1080, height: 1920 });
  });

  it("social-feed → 1080x1080 (1:1 square)", () => {
    expect(mediaSize("social-feed")).toEqual({ width: 1080, height: 1080 });
  });

  it("article-web → 1200x675 (16:9 landscape)", () => {
    expect(mediaSize("article-web")).toEqual({ width: 1200, height: 675 });
  });
});

describe("CHANNELS aspect field", () => {
  it("social-vertical is portrait, social-feed is square, article-web is landscape", () => {
    expect(CHANNELS["social-vertical"].aspect).toBe("portrait");
    expect(CHANNELS["social-feed"].aspect).toBe("square");
    expect(CHANNELS["article-web"].aspect).toBe("landscape");
  });
});

describe("normalizeChannel", () => {
  const cases: Array<[string | undefined, Channel]> = [
    ["Stories", "social-vertical"],
    ["stories", "social-vertical"],
    ["social", "social-vertical"],
    ["social-vertical", "social-vertical"],
    ["vertical", "social-vertical"],
    ["story", "social-vertical"],
    ["reel", "social-vertical"],
    ["reels", "social-vertical"],
    ["tiktok", "social-vertical"],
    ["shorts", "social-vertical"],
    ["portrait", "social-vertical"],
    ["feed", "social-feed"],
    ["square", "social-feed"],
    ["web", "article-web"],
    ["article", "article-web"],
    ["embed", "article-web"],
    ["article embed", "article-web"],
    ["landscape", "article-web"],
    ["print", "article-web"],
    ["youtube", "article-web"],
    [undefined, "article-web"],
    ["", "article-web"],
    ["   ", "article-web"],
    ["something-unknown", "article-web"],
  ];

  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${expected}`, () => {
      expect(normalizeChannel(input)).toBe(expected);
    });
  }

  it("is case/space-insensitive (mixed case + surrounding whitespace)", () => {
    expect(normalizeChannel("  SOCIAL-VERTICAL  ")).toBe("social-vertical");
    expect(normalizeChannel("Feed")).toBe("social-feed");
  });
});

describe("channelAspect (Slice 2)", () => {
  it("social-vertical → portrait, social-feed → square, article-web → landscape", () => {
    expect(channelAspect("social-vertical")).toBe("portrait");
    expect(channelAspect("social-feed")).toBe("square");
    expect(channelAspect("article-web")).toBe("landscape");
  });

  it("matches CHANNELS[*].aspect for every channel", () => {
    for (const ch of ALL_CHANNELS) {
      expect(channelAspect(ch)).toBe(CHANNELS[ch].aspect);
    }
  });
});

describe("renderSize (Slice 2)", () => {
  it("social-vertical → 1080x1920 (true 9:16)", () => {
    expect(renderSize("social-vertical")).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it("social-feed → 1080x1080", () => {
    expect(renderSize("social-feed")).toEqual({ width: 1080, height: 1080 });
  });

  it("article-web → 1200x675", () => {
    expect(renderSize("article-web")).toEqual({ width: 1200, height: 675 });
  });

  it("matches mediaSize/CHANNELS[*].mediaSize for every channel", () => {
    for (const ch of ALL_CHANNELS) {
      expect(renderSize(ch)).toEqual(mediaSize(ch));
      expect(renderSize(ch)).toEqual(CHANNELS[ch].mediaSize);
    }
  });
});

describe("assertRenderedSize (Slice 2)", () => {
  it("passes silently on an exact match (social-vertical, 1080x1920)", () => {
    expect(() =>
      assertRenderedSize(1080, 1920, "social-vertical"),
    ).not.toThrow();
  });

  it("passes silently on an exact match for every channel", () => {
    for (const ch of ALL_CHANNELS) {
      const { width, height } = CHANNELS[ch].mediaSize;
      expect(() => assertRenderedSize(width, height, ch)).not.toThrow();
    }
  });

  it("throws on a 4:5 (1080x1350) render for a social-vertical (9:16) channel — the exact bug this slice fixes", () => {
    expect(() => assertRenderedSize(1080, 1350, "social-vertical")).toThrow(
      "rendered size 1080x1350 does not match channel 'social-vertical' (1080x1920)",
    );
  });

  it("throws on any width/height mismatch, not just height", () => {
    expect(() => assertRenderedSize(1200, 1080, "social-feed")).toThrow(
      "rendered size 1200x1080 does not match channel 'social-feed' (1080x1080)",
    );
  });
});
