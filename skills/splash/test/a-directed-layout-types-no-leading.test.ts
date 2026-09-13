/**
 * A DIRECTED LAYOUT TYPES NO LEADING AND NO BLOCK GAP AS A MULTIPLE OF A SIZE.
 *
 * The line is the face's (spec `docs/splash/2026-09-13-adaptive-leading-spec.md` §2): `leadOf(r)`
 * and `gapOf(r, n)` from `#shared/design-base/register.mjs`. A `display.fontSize * 1.22` typed into
 * a component is the same number on every face, and it was typed forty times.
 *
 * ── THE RATCHET ────────────────────────────────────────────────────────────────────────────────
 * The migration runs in four lots. `LITERAL_LEADING_ALLOWED` is the count still standing, lowered
 * in the commit that migrates a lot, and it may only go down. When it reaches zero the count is
 * replaced by the list itself, empty.
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

/** MAY ONLY GO DOWN. Measured 2026-09-13 before the migration: 244. */
const LITERAL_LEADING_ALLOWED = 244;

const PATTERNS = [
  {
    what: "a lead typed as a multiple of a size",
    re: /const \w*[Ll]ead\s*=\s*\w+\.(?:fontSize|filedSize)\s*\*\s*[\d.]+/g,
  },
  {
    what: "the eyebrow gap typed as a multiple of a size",
    re: /eyebrowReg\.(?:fontSize|filedSize)\s*\*/g,
  },
  {
    what: "a gap after a text block typed as a multiple of a size",
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

  it("should type no more literal leading than the ratchet allows", () => {
    expect([
      offences.length <= LITERAL_LEADING_ALLOWED,
      offences.length,
    ]).toEqual([true, LITERAL_LEADING_ALLOWED]);
  });
});
