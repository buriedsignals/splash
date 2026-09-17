import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  KEY_PLACEHOLDER,
  keyedPage,
  localPageOf,
} from "../scripts/live-map-cards.mjs";

// A LIVE MAP PAGE OPENED FROM DISK ALWAYS HAS A LIVE MAP: every written page gets a local copy with the key in it,
// `renders/<id>.local.html`, git-ignored, while the committed page keeps the placeholder (owner, 2026-09-15).

const ROOT = join(import.meta.dirname, "../../..");

/**
 * EVERY COMMITTED PAGE THAT REACHES MAPTILER, DISCOVERED FROM THE TREE.
 *
 * This was four paths typed by hand — three directions of one beat and one direction of another —
 * while the corpus held twenty-four such pages. A frozen sample of a corpus that grows is a guard
 * that covers less of it every week, and the thing it guards is the one that must never be wrong:
 * the committed page keeps the placeholder, the keyed copy stays out of the repository.
 *
 * The population is every TRACKED `renders/*.html` that reaches a MapTiler style URL — asked of
 * git rather than of a directory walk, because an untracked in-flight page is not yet committed
 * and is not this guard's business. `no-key-in-the-repository.test.ts` scans every committable
 * file for a real key value; this file is the other half, and says the placeholder is what is
 * there in its place.
 */
const MAPTILER_STYLE = "api.maptiler.com/maps/";
const LIVE_PAGES = Bun.spawnSync(
  ["git", "ls-files", "-z", "--", "*/renders/*.html"],
  { cwd: ROOT },
)
  .stdout.toString()
  .split("\0")
  .filter(Boolean)
  .filter((rel) =>
    readFileSync(join(ROOT, rel), "utf8").includes(MAPTILER_STYLE),
  )
  .sort();

describe("the local copy of a live map page", () => {
  it("should live beside the page as <id>.local.html", () => {
    expect(localPageOf("/x/renders/creme.html")).toBe(
      "/x/renders/creme.local.html",
    );
  });

  it("should carry the key where the page carries the placeholder", () => {
    expect(keyedPage(`<a href="?key=${KEY_PLACEHOLDER}">`, "abc")).toBe(
      '<a href="?key=abc">',
    );
  });

  it("should refuse loudly when there is no key", () => {
    expect(() =>
      keyedPage(`?key=${KEY_PLACEHOLDER}`, "", "creme.html"),
    ).toThrow(/no MapTiler key.*creme\.html/);
  });

  it("should refuse a page with no placeholder", () => {
    expect(() => keyedPage("<p>no map</p>", "abc")).toThrow(/placeholder/);
  });

  // Asks git itself rather than matching a line of .gitignore: a keyed page is written wherever the
  // run puts its beat, and a rule anchored to `proof/` left a story beat's copy stageable.
  it("should be ignored by git wherever a beat lives", () => {
    const ignored = (path: string) =>
      Bun.spawnSync(["git", "check-ignore", "-q", path], { cwd: ROOT })
        .exitCode === 0;
    expect([
      ignored("proof/scrolly-any/renders/creme.local.html"),
      ignored("stories/any-story/beats/1/renders/creme.local.html"),
    ]).toEqual([true, true]);
  });
});

describe("a committed live map page", () => {
  // ANTI-VACUITY. A `git ls-files` that matches nothing — a renamed `renders/` directory, a
  // pathspec that stops applying — makes every assertion below it disappear rather than fail.
  // Measured 2026-09-17 on a clean checkout of `main`: twenty-four committed pages reach a
  // MapTiler style, where the hand-written list named four.
  it("should discover the committed live map pages, not a sample of them", () => {
    expect(LIVE_PAGES.length).toBeGreaterThanOrEqual(24);
  });

  for (const page of LIVE_PAGES) {
    it(`should carry the placeholder and no key-like string: ${page}`, () => {
      const html = readFileSync(join(ROOT, page), "utf8");
      expect([
        html.includes(KEY_PLACEHOLDER),
        /key=[A-Za-z0-9]{16,}/.test(html),
      ]).toEqual([true, false]);
    });
  }
});
