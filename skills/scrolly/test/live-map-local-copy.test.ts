import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KEY_PLACEHOLDER, keyedPage, localPageOf } from "../scripts/live-map-cards.mjs";

// A LIVE MAP PAGE OPENED FROM DISK ALWAYS HAS A LIVE MAP: every written page gets a local copy with the key in it,
// `renders/<id>.local.html`, git-ignored, while the committed page keeps the placeholder (owner, 2026-09-15).

const ROOT = join(import.meta.dirname, "../../..");
const LIVE_PAGES = [
  "proof/scrolly-choropleth-europe-lowcarbon/renders/creme.html",
  "proof/scrolly-choropleth-europe-lowcarbon/renders/nocturne.html",
  "proof/scrolly-choropleth-europe-lowcarbon/renders/rapport.html",
  "proof/scrolly-proportional-symbol-europe-capacity/renders/creme.html",
];

describe("the local copy of a live map page", () => {
  it("should live beside the page as <id>.local.html", () => {
    expect(localPageOf("/x/renders/creme.html")).toBe("/x/renders/creme.local.html");
  });

  it("should carry the key where the page carries the placeholder", () => {
    expect(keyedPage(`<a href="?key=${KEY_PLACEHOLDER}">`, "abc")).toBe('<a href="?key=abc">');
  });

  it("should refuse loudly when there is no key", () => {
    expect(() => keyedPage(`?key=${KEY_PLACEHOLDER}`, "", "creme.html")).toThrow(/no MapTiler key.*creme\.html/);
  });

  it("should refuse a page with no placeholder", () => {
    expect(() => keyedPage("<p>no map</p>", "abc")).toThrow(/placeholder/);
  });

  it("should be ignored by git", () => {
    expect(readFileSync(join(ROOT, ".gitignore"), "utf8").split("\n")).toContain("proof/**/renders/*.local.html");
  });
});

describe("a committed live map page", () => {
  for (const page of LIVE_PAGES) {
    it(`should carry the placeholder and no key-like string: ${page}`, () => {
      const html = readFileSync(join(ROOT, page), "utf8");
      expect([html.includes(KEY_PLACEHOLDER), /key=[A-Za-z0-9]{16,}/.test(html)]).toEqual([true, false]);
    });
  }
});
