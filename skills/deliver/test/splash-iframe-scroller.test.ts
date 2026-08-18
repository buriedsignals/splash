// Tests for `assets/splash-iframe-scroller.js` — the article page's companion script for a Splash
// embed. It ships VERBATIM to a newsroom's site as a classic (non-module) script, so there is no
// export to import here and no DOM to drive honestly (per doctrine, an interactive is verified by
// driving a real browser, not a DOM emulation nobody looked at). What follows are GREP-STYLE
// ASSERTIONS against the file's own SOURCE TEXT — an honest, narrow check that the properties which
// must never silently regress are still there, not a behavioural test of the script running.
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCE_PATH = join(
  import.meta.dirname,
  "..",
  "assets",
  "splash-iframe-scroller.js",
);

async function source(): Promise<string> {
  return readFile(SOURCE_PATH, "utf8");
}

describe("splash-iframe-scroller.js — source-text invariants", () => {
  it("should define window.splashScroller", async () => {
    const src = await source();
    expect(src).toContain("global.splashScroller = splashScroller");
  });

  it("should never assign .style.height or .style.width — the rule that makes it work on any site", async () => {
    const src = await source();
    expect(src).not.toMatch(/\.style\.height\s*=/);
    expect(src).not.toMatch(/\.style\.width\s*=/);
  });

  it("should recognise embeds by data-splash-embed", async () => {
    const src = await source();
    expect(src).toContain("data-splash-embed");
  });

  it("should recognise embeds by a ?splash / &splash marker in the iframe's src", async () => {
    const src = await source();
    expect(src).toContain("[?&]splash(=|&|$)");
  });

  it("should warn on the console when no embed matched", async () => {
    const src = await source();
    expect(src).toContain("console.warn");
    expect(src).toContain("no embed matched");
  });
});
