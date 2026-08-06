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
  // Still ONE candidate after task 4's `recurrent-role` signal — measured, not assumed. Heidi's
  // CSS is a design-token system: real colour values are declared once per token name
  // (`--lt-color-red-500-rgb`, `--lt-color-primary-500-rgb`, …) and almost every rule that PAINTS
  // something references those tokens via `var(--…)`, which this extractor does not resolve — so
  // very few literal hexes ever land on a brand-carrying property twice, let alone
  // RECURRENT_ROLE_MIN_COUNT (3) times. The closest is `#569ff7` at exactly two (flatpickr's
  // bundled date-picker default, not Heidi's brand — see this task's report) — below the floor,
  // and correctly so.
  expect(p.candidates).toHaveLength(1);
  expect(p.candidates[0]?.value).toBe("#d5121e");
  // 101, not 100: task 2 lifted the same-host filter, so the CDN stylesheet is now read too, and
  // it repeats #d5121e in three more `declared` custom properties — one point of frequency bonus
  // on top of the theme-color signal's weight. The colour and its top signal are unchanged.
  expect(p.candidates[0]?.score).toBe(101);
  expect(p.candidates[0]?.evidence[0]?.signal).toBe("theme-color");
  expect(p.confidence).toBe("declared");
  expect(p.ground).toBeUndefined();
});

test("heidi.news, as captured — the CDN stylesheet is read, and what it still misses", () => {
  const p = proposeCharter(loadSiteFixture("heidi-news"));
  // Before task 2: heidi.news links its CSS from heidi-17455.kxcdn.com — its own CDN, a
  // different host than www.heidi.news. `stylesheetHrefs`'s same-host filter dropped it, and the
  // note this test used to pin blamed JavaScript for a stylesheet that was never even attempted.
  // After task 2: the filter is lifted, the 557 KB sheet is read, and the note that survives is
  // an honest, different one — the sheet uses `color-mix()`/`oklch()` colour notation this
  // extractor does not parse, so a brand colour expressed only that way would still be missed.
  expect(p.notes).toEqual([
    "the site declares colours in color-mix/oklch() notation, which is NOT read here — a brand colour expressed only that way was missed",
  ]);
});

// Was pending on task 2's same-host fix in `stylesheetHrefs`. Now that the CDN stylesheet is
// read, "Sang Bleu Kingdom" — heidi.news's real headline face — is found. This is the "after"
// half of the evidence task 2 provides; the "before" half is preserved in git history (see the
// commit that lifted the same-host filter).
test("heidi.news, as captured — typography, now that the CDN stylesheet is read", () => {
  const p = proposeCharter(loadSiteFixture("heidi-news"));
  expect(p.typography.map((t) => t.family)).toContain("Sang Bleu Kingdom");
});

// therecord.media — builds on Next.js: its CSS ships as hashed webpack/Tailwind-utility chunks
// with no --brand/--primary/--accent property, no <meta theme-color>, and no masthead SVG naming
// a colour. It links real, same-host stylesheets (so it is not blocked by the filter above), and
// still yields nothing the site itself labelled as its brand — the "carries no brand" half of
// the JS-built site this chantier's spec asks for.

test("therecord.media, as captured — no declared brand, only inferred colour", () => {
  const p = proposeCharter(loadSiteFixture("therecord-media"));
  expect(p.confidence).toBe("inferred");
  // Before task 4: #e06b2c's first-scanned reading (`.article__categories a
  // {background-color:#e06b2c}`) was just `declared` (weight 8) — an unlabelled colour picked out
  // of the bundle. After task 4: the same colour repeats on `background-color`/`border-color`
  // (category pills, the warning box, search-result highlights, pagination) far past
  // RECURRENT_ROLE_MIN_COUNT, so that reading is promoted in place to `recurrent-role` (weight
  // 60) — still `inferred`, never `declared`, but now the STRONGEST reason this candidate ranks
  // where it does is named honestly, instead of the weakest one.
  expect(
    p.candidates.map((c) => ({
      value: c.value,
      signal: c.evidence[0]?.signal,
    })),
  ).toEqual([
    { value: "#e06b2c", signal: "recurrent-role" },
    { value: "#fca532", signal: "link" },
  ]);
  expect(p.notes).toEqual([
    "the site names no brand colour anywhere (no theme-color, no --brand property, no masthead SVG); what follows is inferred from links and controls and is a guess",
  ]);
});

test("therecord.media, as captured — webfonts, no house colour to pair them with", () => {
  const p = proposeCharter(loadSiteFixture("therecord-media"));
  // "icomoon" no longer appears here: it is an icon font, not a house typeface (ICON_FAMILY).
  expect(p.typography).toEqual([
    {
      family: "Inter",
      role: "webfont",
      token: "@font-face { font-family: Inter }",
      source: "https://therecord.media/_next/static/chunks/3t3yknc51puyw.css",
    },
    {
      family: "Inter Fallback",
      role: "webfont",
      token: "@font-face { font-family: Inter Fallback }",
      source: "https://therecord.media/_next/static/chunks/3t3yknc51puyw.css",
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
