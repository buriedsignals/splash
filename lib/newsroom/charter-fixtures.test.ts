// charter-fixtures.test.ts — pins what `proposeCharter` reads from three REAL newsroom sites,
// captured to disk (see lib/newsroom/fixtures/sites/README.md for when, from where, with what
// command, and why each site is here). No network here: `loadSiteFixture` reads the captured
// files.
//
// These tests do not assert what we WISH the extractor found — they pin what it finds TODAY, so
// every later task in this chantier can show what it changed by moving these numbers. Never
// soften an assertion to make it pass; if a task improves the extraction, update the number
// here and say so in the commit, don't quietly loosen the check.

import { expect, test } from "bun:test";
import { proposeCharter } from "./charter.ts";
import { loadSiteFixture } from "./fixtures/sites/load.ts";

// heidi.news — the site this whole feature was built for, and the one whose reading (2026-08-06,
// via `main`) exposed the defect this chantier fixes: a single colour from <meta theme-color>,
// zero stylesheets, no typography.

test("heidi.news, as captured — the colour theme-color declares", () => {
  const p = proposeCharter(loadSiteFixture("heidi-news"));
  expect(p.candidates).toHaveLength(1);
  expect(p.candidates[0]?.value).toBe("#d5121e");
  expect(p.candidates[0]?.score).toBe(100);
  expect(p.candidates[0]?.evidence[0]?.signal).toBe("theme-color");
  expect(p.confidence).toBe("declared");
  expect(p.ground).toBeUndefined();
});

test("heidi.news, as captured — zero stylesheets read, today", () => {
  const p = proposeCharter(loadSiteFixture("heidi-news"));
  // heidi.news links its CSS from heidi-17455.kxcdn.com — its own CDN, a different host than
  // www.heidi.news. `stylesheetHrefs`'s same-host filter drops it, and the note below blames
  // JavaScript for a stylesheet that was never even attempted. Both are what task 2 fixes.
  expect(p.notes).toEqual([
    "no stylesheet was read — the page may build its styles in JavaScript, in which case nothing here is reliable",
  ]);
});

// Pending: the same-host filter above means this reads NO typography today, even though the CSS
// sitting in fixtures/sites/heidi-news.css (captured alongside the page, from the CDN) carries
// "Sang Bleu Kingdom" — heidi.news's real headline face. Task 2 of this chantier lifts the
// same-host filter in `stylesheetHrefs`; once it does, `loadSiteFixture` starts passing that CSS
// through with no change here, and this assertion is expected to start finding it. Do not delete
// this record in the meantime — it is the "before" half of the evidence task 2 provides.
test.todo(
  "heidi.news, as captured — typography (blocked on task 2's same-host fix)",
  () => {
    const p = proposeCharter(loadSiteFixture("heidi-news"));
    expect(p.typography.map((t) => t.family)).toContain("Sang Bleu Kingdom");
  },
);

// therecord.media — builds on Next.js: its CSS ships as hashed webpack/Tailwind-utility chunks
// with no --brand/--primary/--accent property, no <meta theme-color>, and no masthead SVG naming
// a colour. It links real, same-host stylesheets (so it is not blocked by the filter above), and
// still yields nothing the site itself labelled as its brand — the "carries no brand" half of
// the JS-built site this chantier's spec asks for.

test("therecord.media, as captured — no declared brand, only inferred colour", () => {
  const p = proposeCharter(loadSiteFixture("therecord-media"));
  expect(p.confidence).toBe("inferred");
  expect(
    p.candidates.map((c) => ({
      value: c.value,
      signal: c.evidence[0]?.signal,
    })),
  ).toEqual([
    { value: "#e06b2c", signal: "declared" },
    { value: "#fca532", signal: "link" },
  ]);
  expect(p.notes).toEqual([
    "the site names no brand colour anywhere (no theme-color, no --brand property, no masthead SVG); what follows is inferred from links and controls and is a guess",
  ]);
});

test("therecord.media, as captured — webfonts, no house colour to pair them with", () => {
  const p = proposeCharter(loadSiteFixture("therecord-media"));
  expect(p.typography).toEqual([
    {
      family: "icomoon",
      role: "webfont",
      token: "@font-face { font-family: icomoon }",
    },
    {
      family: "Inter",
      role: "webfont",
      token: "@font-face { font-family: Inter }",
    },
    {
      family: "Inter Fallback",
      role: "webfont",
      token: "@font-face { font-family: Inter Fallback }",
    },
  ]);
});

// restofworld.org — a plain, honest declaration: <meta theme-color content="rgb(36, 46, 247)">
// (exercising the rgb() parser, not just hex) matches a `--primary` custom property in its own
// stylesheet almost exactly (#242ef7 vs #242EF7), and its typography is named for what it is
// ("Moderat", "GT Sectra") rather than hidden behind a generic stack. The site this chantier's
// extraction was designed around: a newsroom that says what its colours are.

test("restofworld.org, as captured — theme-color and --primary agree", () => {
  const p = proposeCharter(loadSiteFixture("restofworld-org"));
  expect(p.confidence).toBe("declared");
  expect(
    p.candidates.map((c) => ({
      value: c.value,
      signal: c.evidence[0]?.signal,
    })),
  ).toEqual([
    { value: "#242ef7", signal: "theme-color" },
    { value: "#d231a0", signal: "brand-property" },
    { value: "#ffbef0", signal: "accent-property" },
  ]);
  expect(p.notes).toEqual([]);
});

test("restofworld.org, as captured — named typefaces, not a generic stack", () => {
  const p = proposeCharter(loadSiteFixture("restofworld-org"));
  const families = p.typography.map((t) => t.family);
  expect(families).toContain("Moderat");
  expect(families).toContain("GT Sectra");
  expect(p.typography).toHaveLength(6);
});
