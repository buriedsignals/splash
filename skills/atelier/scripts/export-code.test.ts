import { describe, it, expect } from "bun:test";
import { embedSnippet, staticHtml, isEphemeralPath } from "./export-code.mjs";

describe("staticHtml", () => {
  it("is a single self-contained document with the image inlined (no external refs)", () => {
    const html = staticHtml("data:image/png;base64,AAAA", "chart");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('alt="chart"');
    // self-contained: no external asset references
    expect(html).not.toMatch(/src="\.?\/?assets/);
    expect(html).not.toContain("<script");
  });
});

describe("embedSnippet", () => {
  it("wraps an .html file in a responsive iframe", () => {
    const s = embedSnippet("chart.html");
    expect(s).toContain("<iframe");
    expect(s).toContain('src="chart.html"');
  });
  it("wraps a .png in an img and an .mp4 in a video", () => {
    expect(embedSnippet("static.png")).toContain("<img");
    expect(embedSnippet("clip.mp4")).toContain("<video");
  });
  it("throws on an unsupported extension", () => {
    expect(() => embedSnippet("data.csv")).toThrow(/unsupported/i);
  });
});

describe("isEphemeralPath", () => {
  it("flags temp / scratchpad destinations the journalist would lose", () => {
    expect(isEphemeralPath("/tmp/co2-export")).toBe(true);
    expect(
      isEphemeralPath("/private/tmp/claude-501/session/scratchpad/x"),
    ).toBe(true);
    expect(isEphemeralPath("/var/folders/ab/xyz/T/out")).toBe(true);
  });
  it("accepts a stable project location", () => {
    expect(isEphemeralPath("exports/co2-share")).toBe(false);
    expect(isEphemeralPath("/Users/journalist/Atelier/exports/co2-share")).toBe(
      false,
    );
  });
});
