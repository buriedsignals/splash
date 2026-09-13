/**
 * A DIRECTED LAYOUT TYPES NO LEADING AND NO BLOCK GAP AS A MULTIPLE OF A SIZE.
 *
 * The line is the face's (spec `docs/splash/2026-09-13-adaptive-leading-spec.md` §2): `leadOf(r)`
 * and `gapOf(r, n)` from `#shared/design-base/register.mjs`. A `display.fontSize * 1.22` typed into
 * a component is the same number on every face, and it was typed forty times.
 *
 * ── THE RATCHET ────────────────────────────────────────────────────────────────────────────────
 * The migration ran in four lots. A count of the literals still standing was lowered in the commit
 * that migrated each lot — 244 before the first, then 187, 127, 63 — and it only went down. The last
 * lot brought it to zero, and the count was replaced by the list itself: it is empty, and it stays
 * empty.
 *
 * What it reads: every `Directed*.tsx` beside a `render-directions.mjs` under `proof/`, whitespace
 * normalised so a gap split across lines is still one expression. It is a floor — the geometry
 * comparison of `scripts/design-base/renders-moved.mjs` is what proves nothing else moved.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");

/** Each pattern carries one expression it must catch, from the corpus before the migration — so a
 *  regex that stops matching anything cannot keep the empty list below green on its own. */
const PATTERNS = [
  {
    what: "a lead typed as a multiple of a size",
    re: /const \w*[Ll]ead\s*=\s*\w+\.(?:fontSize|filedSize)\s*\*\s*[\d.]+/g,
    offending: "const titleLead = display.fontSize * 1.22;",
  },
  {
    what: "the eyebrow gap typed as a multiple of a size",
    re: /eyebrowReg\.(?:fontSize|filedSize)\s*\*/g,
    offending: "const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9;",
  },
  {
    what: "a gap after a text block typed as a multiple of a size",
    offending: "const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.6;",
    re: /(?:Lines\.length\s*\*\s*\w*[Ll]ead\s*[+-]|(?:readingTop|sourceTop)\s*-|annotBand\.ascent\s*-)\s*\(?\s*(?:display|body|annot)\.(?:fontSize|filedSize)\s*\*\s*[\d.]+/g,
  },
];

const directed = readdirSync(PROOF, { withFileTypes: true })
  .filter(
    (e) =>
      e.isDirectory() &&
      existsSync(join(PROOF, e.name, "render-directions.mjs")),
  )
  .flatMap((e) =>
    readdirSync(join(PROOF, e.name))
      .filter((f) => /^Directed.*\.tsx$/.test(f))
      .map((f) => join(PROOF, e.name, f)),
  );

const offences = directed.flatMap((file) => {
  const text = readFileSync(file, "utf8").replace(/\s+/g, " ");
  return PATTERNS.flatMap(({ what, re }) =>
    [...text.matchAll(re)].map(
      (m) => `${relative(ROOT, file)}: ${what}: ${m[0]}`,
    ),
  );
});

describe("a directed layout's leading", () => {
  it("should find the directed components (premise)", () => {
    expect(directed.length).toBeGreaterThanOrEqual(40);
  });

  it("should catch the expression each pattern is written for (premise)", () => {
    const missed = PATTERNS.filter(
      ({ re, offending }) => [...offending.matchAll(re)].length === 0,
    ).map(({ what }) => what);
    expect(missed).toEqual([]);
  });

  it("should type no leading and no block gap as a multiple of a size", () => {
    expect(offences).toEqual([]);
  });
});
