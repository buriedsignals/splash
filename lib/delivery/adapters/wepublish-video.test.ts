// The block a video becomes — and the refusal that guards it.
//
// This is the one format with no native home in the CMS: no self-hosted mp4 block exists, so
// the bytes are served from wherever the newsroom already publishes its files and the article
// carries a player pointing there. Which makes the ORDER load-bearing: an mp4 that has not been
// hosted yet has nothing to point at, and inserting a block with an empty src would put a
// broken player into a journalist's piece.
import { describe, it, expect } from "bun:test";
import { buildVideoBlockHtml, carriesMarker } from "./wepublish-block";

describe("buildVideoBlockHtml", () => {
  it("should build a real player pointing at the hosted file", () => {
    const html = buildVideoBlockHtml({
      url: "https://splash.example.pages.dev/budget.mp4",
      id: "budget",
      title: "Le budget",
    });
    expect(html).toContain("<video");
    expect(html).toContain('src="https://splash.example.pages.dev/budget.mp4"');
    expect(html).toContain("controls");
  });

  it("should carry the same ownership marker as the other two forms", () => {
    // Without it a second delivery stacks a duplicate player instead of replacing the first.
    const html = buildVideoBlockHtml({ url: "https://x/y.mp4", id: "budget", title: "T" });
    expect(carriesMarker(html, "budget")).toBe(true);
    expect(carriesMarker(html, "autre")).toBe(false);
  });

  it("should escape a title and a url that would otherwise break out of the attribute", () => {
    const html = buildVideoBlockHtml({
      url: 'https://x/y.mp4" onerror="alert(1)',
      id: "budget",
      title: 'Le "budget"',
    });
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html.match(/src="[^"]*"/)![0]).toBe(
      'src="https://x/y.mp4&quot; onerror=&quot;alert(1)"',
    );
  });
});
