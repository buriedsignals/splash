// lib/newsroom/house-ground-single-home.test.ts
//
// The house ground — "light" | "dark" | "#rrggbb", declared once in NEWSROOM-PROFILE.md — has
// ONE home on the decor: `Decor.house.theme`.
//
// It briefly had two. The charter fix (3a1af005) added `Decor.house` (the parsed profile, whole)
// beside a pre-existing `Decor.theme`, and `loadDecor` filled both from `profile.theme` in the
// same return expression. They could not disagree the day they were written — same source, same
// statement — which is exactly why the duplication was easy to keep and hard to notice: the
// argument for it was that the two fields answer different QUESTIONS (offer-time "can
// Datawrapper render this ground" vs build-time "what are the marks painted"). That is a true
// statement about the two READERS and not a reason for two FIELDS; the fact is one string.
//
// What this file pins, and why each half is needed:
//   · the type carries no second ground field — so nobody can add one back "just for the offer";
//   · loadDecor lifts the ground exactly once — so the type staying clean cannot hide a literal
//     that projects `profile.theme` onto some other name;
//   · the offer's reader takes it off the charter — so the one production consumer of the
//     ground cannot quietly reacquire a private copy.
//
// This is a SOURCE SCAN, the same instrument as schema-version-drift.test.ts and
// mappers-doc-parity.test.ts, and for the same reason: once the two fields are collapsed, a
// behavioural test comparing them would be asserting `x === x`. The drift risk is structural, so
// the guard is structural.
//
// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed before
// results were read; files restored from backups between them). Measured counts, not guessed:
//   · re-adding `theme?: string;` to the Decor type in decor.ts → 3 pass / 1 fail, the
//     second-ground-field case red, naming "theme" in the diff.
//   · re-adding `...(profile?.theme ? { theme: profile.theme } : {}),` to loadDecor's return
//     (WITHOUT touching the type — the half a type-only guard would miss) → 3 pass / 1 fail,
//     the single-lift case red.
//   · pointing propose.ts back at a bare `decor?.theme` → 3 pass / 1 fail, the reader case red.
//   · renaming the `Decor` type so the anchor regex stops matching → 2 pass / 2 fail, led by the
//     non-vacuity case with its "update the regex, do not delete the guard" message.
//   · NEGATIVE CONTROL — adding an unrelated field (`route?: string;`) to Decor and an unrelated
//     `profile?.lang` read to loadDecor → ALL 4 PASS. The guard pins the GROUND, not the shape
//     of the type; ordinary growth must not churn it.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DECOR_TS = join(import.meta.dir, "decor.ts");
const PROPOSE_TS = join(import.meta.dir, "..", "loop", "propose.ts");

const decorSrc = readFileSync(DECOR_TS, "utf8");
const proposeSrc = readFileSync(PROPOSE_TS, "utf8");

/** The body of `export type Decor = { … };`, comments stripped so prose about the old field
 *  (which this very commit's doc deliberately contains) is never mistaken for a declaration. */
function decorTypeBody(): string {
  const m = decorSrc.match(/export type Decor = \{([\s\S]*?)\n\};/);
  expect(
    m,
    "lib/newsroom/decor.ts no longer contains the `export type Decor = { … };` declaration " +
      "this guard reads. If it was renamed or restructured, update the regex — do not delete " +
      "the guard.",
  ).not.toBeNull();
  return stripComments(m![1]!);
}

/** The body of `export function loadDecor(…) { … }` up to its closing brace, comments stripped. */
function loadDecorBody(): string {
  const start = decorSrc.indexOf("export function loadDecor(");
  expect(
    start,
    "lib/newsroom/decor.ts no longer contains `export function loadDecor(`, the function this " +
      "guard reads. If it was renamed, update this anchor — do not delete the guard.",
  ).toBeGreaterThan(-1);
  const rest = decorSrc.slice(start);
  const end = rest.indexOf("\n}");
  expect(end).toBeGreaterThan(-1);
  return stripComments(rest.slice(0, end));
}

/** Block and line comments removed. The comments in these files EXPLAIN the collapsed field by
 *  name; scanning them would make this guard fail on its own documentation. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("the house ground has exactly one home on the Decor", () => {
  it("finds the declarations it scans (never passes vacuously)", () => {
    // Anchors resolve, and the scanned regions are real and non-trivial — a guard whose scan
    // silently comes back empty passes for the wrong reason.
    expect(decorTypeBody().length).toBeGreaterThan(50);
    expect(loadDecorBody().length).toBeGreaterThan(50);
    expect(decorTypeBody()).toContain("house?:");
    expect(proposeSrc).toContain("themeBg");
  });

  it("Decor declares no second ground field beside house", () => {
    // Any `theme…:` / `ground…:` / `themeBg…:` member of the type. `house?: BrandProfile` is the
    // home; the ground reached through it is BrandProfile's own field, not a member here.
    const offenders = [
      ...decorTypeBody().matchAll(/^\s*(theme\w*|ground\w*)\??\s*:/gm),
    ].map((m) => m[1]!);
    expect(
      offenders,
      "The Decor type grew a ground field beside `house`. The newsroom declares its ground " +
        "ONCE; a second field holding a copy is only a place for the two to disagree. Read " +
        "`decor.house?.theme` — and if the reader needs a different QUESTION answered, put that " +
        "at the reader, not in a new field (see Decor.house's doc).",
    ).toEqual([]);
  });

  it("loadDecor lifts the ground exactly once — onto house, and nowhere else", () => {
    // Catches the half a type-only guard misses: a literal that projects the profile's ground
    // onto some other key while the type stays superficially clean.
    const offenders = [
      ...loadDecorBody().matchAll(/(\w+)\s*:\s*profile\??\.theme/g),
    ].map((m) => m[0]!);
    expect(
      offenders,
      "loadDecor projects the profile's ground onto a second key. The whole profile already " +
        "rides on `house` — read `decor.house?.theme` instead of lifting a copy out of it.",
    ).toEqual([]);
  });

  it("the offer reads the ground off the charter, not off a private copy", () => {
    // The one production consumer of the ground at offer time (lib/loop/propose.ts -> the
    // brain's eligibility style exclusion). Pinned positively AND negatively so neither a
    // rewrite nor a re-added shortcut passes.
    expect(
      /decor\??\.house\??\.theme/.test(proposeSrc),
      "lib/loop/propose.ts no longer reads the house ground off `decor.house`. It is the " +
        "offer-time reader of the ground (it feeds `themeBg` into eligibility's isDark); if it " +
        "moved, move this anchor with it rather than dropping the guard.",
    ).toBe(true);
    expect(
      /decor\??\.theme\b/.test(proposeSrc),
      "lib/loop/propose.ts reads a bare `decor.theme` again. That field was collapsed into " +
        "`decor.house.theme` — one fact, one home.",
    ).toBe(false);
  });
});

// HONEST CEILING: this reads source text, not behaviour. It cannot tell whether the ground the
// offer judges is the ground the RENDERER finally paints (that is proved on pixels, by the
// charter fix's own render evidence), nor stop a third consumer elsewhere in the tree from
// caching the ground in a shape this file does not know to look at. It pins the one thing that
// actually rotted: a single declared fact quietly acquiring a second home.
