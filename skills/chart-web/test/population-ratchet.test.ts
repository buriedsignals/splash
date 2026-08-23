/**
 * THE RATCHET ITSELF, AND THE ONE PLACE THE RECORD IS COMPARED TO THE TREE.
 *
 * The five capability walks each assert `pagesThatLeftTheWalk(...)` is empty, so a page that
 * vanishes is named by whichever of them runs — the ratchet travels with the check that needed it.
 * This file is the ratchet's OWN test: the decision on literals (so a mutation of it is caught
 * without a tree), the record's own hygiene, and the printed list of pages that have joined and are
 * not yet recorded.
 *
 * A JOIN IS NOT A FAILURE. `test/delivered-pages-ratchet.ts` argues why at length: the five loops
 * run over what the walk FOUND, so a new page is measured by every capability on its first run.
 * Printing it here is what keeps the record from rotting without charging a shipped story a
 * five-file edit.
 *
 * ── MUTATIONS RUN, 2026-08-23 ─────────────────────────────────────────────────────────────────
 *   `pagesThatLeftTheWalk` returns `[]` unconditionally               RED 1/6 here, 5 red in the
 *                                                                        five capability walks
 *   one recorded path deleted from `RECORDED_PAGES`                   RED (the record is no longer
 *                                                                        a superset of the walk)
 *   `deliveredPages` made to drop `stories/…/renders/slope.html`      RED in all five, NAMING it
 */
import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { deliveredPages } from "../scripts/delivered-pages.mjs";
import {
  RECORDED_PAGES,
  pagesThatJoinedTheWalk,
  pagesThatLeftTheWalk,
} from "./delivered-pages-ratchet.ts";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

describe("pagesThatLeftTheWalk", () => {
  it("names a recorded page the walk no longer finds", () => {
    expect(pagesThatLeftTheWalk(["a/one.html", "b/two.html"], ["/root/a/one.html"], "/root")).toEqual([
      "b/two.html",
    ]);
  });

  it("says nothing when every recorded page is still found", () => {
    expect(
      pagesThatLeftTheWalk(["a/one.html"], ["/root/a/one.html", "/root/c/new.html"], "/root"),
    ).toEqual([]);
  });

  it("is not fooled by a page whose path merely ends the same way", () => {
    expect(pagesThatLeftTheWalk(["a/one.html"], ["/root/b/a/one.html"], "/root")).toEqual([
      "a/one.html",
    ]);
  });
});

describe("pagesThatJoinedTheWalk", () => {
  it("names a found page that is not yet recorded", () => {
    expect(
      pagesThatJoinedTheWalk(["a/one.html"], ["/root/a/one.html", "/root/c/new.html"], "/root"),
    ).toEqual(["c/new.html"]);
  });
});

describe("the record itself", () => {
  // THE RATCHET'S OWN DIRECTION, enforced rather than only written down. Deleting a path from
  // `RECORDED_PAGES` is precisely the edit that would paper over a page falling out of the walk, and
  // it is otherwise invisible — the walk would simply stop being asked about that page. A FLOOR, not
  // an equality: the record may only grow, so its length may only grow, and a page joining costs
  // nothing. Raise this when the record is re-recorded upward; never lower it.
  it("has never shrunk — the record held 25 pages when it was last re-recorded", () => {
    expect(RECORDED_PAGES.length).toBeGreaterThanOrEqual(25);
  });

  it("holds no duplicate, and is sorted so a join is a one-line diff", () => {
    expect([...new Set(RECORDED_PAGES)].length).toBe(RECORDED_PAGES.length);
    expect([...RECORDED_PAGES].sort()).toEqual([...RECORDED_PAGES]);
  });

  // The ratchet, stated once against the real tree. Every capability walk asserts the same thing;
  // this is the one that fails even if all five walks were deleted.
  it("names every page that has left the walk — and there are none", () => {
    const found = deliveredPages(TWIN);
    expect(pagesThatLeftTheWalk(RECORDED_PAGES, found, TWIN)).toEqual([]);
  });

  // Not an assertion about the tree: an assertion that this file KNOWS when it is stale. A page may
  // join freely, so the answer here is allowed to be non-empty — it is printed, and copying it into
  // `RECORDED_PAGES` is the whole maintenance this instrument asks for.
  it("prints any page that has joined and is not yet under the ratchet", () => {
    const joined = pagesThatJoinedTheWalk(RECORDED_PAGES, deliveredPages(TWIN), TWIN);
    if (joined.length) console.log(`joined the walk, not yet recorded:\n  ${joined.join("\n  ")}`);
    expect(Array.isArray(joined)).toBe(true);
  });
});
