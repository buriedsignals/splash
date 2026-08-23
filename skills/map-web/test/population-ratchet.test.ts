/**
 * THE RATCHET ITSELF, AND THE ONE PLACE THE RECORD IS COMPARED TO THE TREE.
 *
 * The capability walks in this skill each assert `pagesThatLeftTheWalk(...)` is empty, so a page
 * that vanishes is named by whichever of them runs — the ratchet travels with the check that needed
 * it. This file is the ratchet's OWN test: the decision on literals (so a mutation of it is caught
 * without a tree), the record's own hygiene, and the printed list of pages that have joined and are
 * not yet recorded.
 *
 * A JOIN IS NOT A FAILURE. `test/delivered-pages-ratchet.ts` argues why at length: every loop runs
 * over what the walk FOUND, so a new page is measured by every capability on its first run.
 * Printing it here is what keeps the record from rotting without charging a shipped story an
 * eight-file edit in a skill it does not own — which is exactly the bill the counts sent on
 * 2026-08-23.
 *
 * ── MUTATIONS RUN, 2026-08-23 ─────────────────────────────────────────────────────────────────
 *   `pagesThatLeftTheWalk` returns `[]` unconditionally       RED here, and in every walk carrying it
 *   one recorded path deleted from `RECORDED_PAGES`           RED (the record stops being a superset)
 *   `discoverMapWebPages` made to drop the seed's page        RED in every walk, NAMING it
 */
import { describe, expect, it } from "bun:test";
import { discoverMapWebPages, TWIN } from "../scripts/discover-pages.mjs";
import {
  RECORDED_PAGES,
  pagesThatJoinedTheWalk,
  pagesThatLeftTheWalk,
} from "./delivered-pages-ratchet.ts";

describe("pagesThatLeftTheWalk", () => {
  it("names a recorded page the walk no longer finds", () => {
    expect(
      pagesThatLeftTheWalk(
        ["a/one.html", "b/two.html"],
        ["/root/a/one.html"],
        "/root",
      ),
    ).toEqual(["b/two.html"]);
  });

  it("says nothing when every recorded page is still found", () => {
    expect(
      pagesThatLeftTheWalk(
        ["a/one.html"],
        ["/root/a/one.html", "/root/c/new.html"],
        "/root",
      ),
    ).toEqual([]);
  });

  it("is not fooled by a page whose path merely ends the same way", () => {
    expect(
      pagesThatLeftTheWalk(["a/one.html"], ["/root/b/a/one.html"], "/root"),
    ).toEqual(["a/one.html"]);
  });
});

describe("pagesThatJoinedTheWalk", () => {
  it("names a found page that is not yet recorded", () => {
    expect(
      pagesThatJoinedTheWalk(
        ["a/one.html"],
        ["/root/a/one.html", "/root/c/new.html"],
        "/root",
      ),
    ).toEqual(["c/new.html"]);
  });
});

describe("the record and the tree", () => {
  const found = discoverMapWebPages().map((page) => page.abs);

  it("has lost no recorded page", () => {
    expect(pagesThatLeftTheWalk(RECORDED_PAGES, found, TWIN)).toEqual([]);
  });

  // THE RATCHET'S OWN DIRECTION, enforced rather than only written down. Deleting a path from
  // `RECORDED_PAGES` is precisely the edit that would paper over a page falling out of the walk, and
  // it is otherwise invisible — every walk would simply stop being asked about that page. A FLOOR,
  // not an equality: the record may only grow, so its length may only grow, and a page joining costs
  // nothing. Raise this when the record is re-recorded upward; never lower it.
  it("has never shrunk — the record held 14 pages when it was last re-recorded", () => {
    expect(RECORDED_PAGES.length).toBeGreaterThanOrEqual(14);
  });

  it("is sorted and free of duplicates, so a re-record is a readable diff", () => {
    expect([...RECORDED_PAGES].sort()).toEqual([...RECORDED_PAGES]);
    expect(new Set(RECORDED_PAGES).size).toBe(RECORDED_PAGES.length);
  });

  it("prints the pages that have joined and are not yet recorded", () => {
    // NOT AN ASSERTION ABOUT THE COUNT, and deliberately not a failure: a page that joins is
    // already measured by every capability walk. This line is how the record stays current without
    // a shipped story paying for it.
    const joined = pagesThatJoinedTheWalk(RECORDED_PAGES, found, TWIN);
    if (joined.length > 0)
      console.log(
        `not yet under the ratchet — add to RECORDED_PAGES:\n  ${joined.join("\n  ")}`,
      );
    expect(Array.isArray(joined)).toBe(true);
  });
});
