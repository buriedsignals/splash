/**
 * THE GUARD DECISIONS ARE COPIES, AND THIS IS WHAT KEEPS THEM ONE DECISION.
 *
 * `doctrine/test/guard-parity.test.ts` asks whether a skill DECLARES a guard the catalogue says it
 * carries. It cannot ask whether the copy still decides the same thing — `carriedBy` reads a name out
 * of an array, and a name is not a behaviour. Two copies of `revealDashInScreenSpace` that have
 * drifted apart both satisfy it, and the format with the weakened copy ships what its neighbour
 * refuses. That is exactly the failure this whole chantier exists to make impossible, one level down.
 *
 * So: for every decision that lives in more than one `verify-*.mjs`, the doc comment AND the body are
 * compared as text, byte for byte. There is nothing skill-specific in any of them — no path, no
 * threshold, no format — so a copy that differs at all differs by accident. The doc comment is
 * included on purpose: it carries the defect that earned the rule, and a copy that kept the code and
 * dropped the reasoning is a rule the next author will delete.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/** Every module-level `const NAME = value;` the given source references from `body`.
 *
 *  A THRESHOLD IS PART OF THE DECISION. Measured while writing this file: changing `DARK_SIDE` from
 *  0.25 to 0.40 in ONE copy of `plateFollowsGround` left this test green, because the constant lives
 *  outside the function it decides for. A copy whose threshold drifted would refuse what its
 *  neighbour accepts while looking byte-identical. Only SHOUTING_CASE names are followed, which is
 *  this tree's own convention for a tuning constant, and each is compared as its whole declaration
 *  line so a changed value and a changed name both show. */
function constantsBehind(source: string, body: string): string {
  const found: string[] = [];
  for (const token of new Set(body.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) ?? [])) {
    const declared = new RegExp(`^const ${token} = .*;$`, "m").exec(source);
    if (declared) found.push(declared[0]);
  }
  return found.sort().join("\n");
}

/** A function's own doc comment and body, as written, plus the constants it decides with. */
function declaration(file: string, name: string): string {
  const source = readFileSync(file, "utf8");
  const at = source.indexOf(`export function ${name}(`);
  expect(`${file} declares ${name}`).toBe(
    at >= 0 ? `${file} declares ${name}` : `${file} does NOT declare ${name}`,
  );
  const comment = source.lastIndexOf("/**", at);
  // The doc comment has to be the thing immediately above it — nothing but whitespace between.
  const between = source.slice(source.indexOf("*/", comment) + 2, at);
  expect(`${name} in ${file}: ${between.trim() === "" ? "commented" : "detached comment"}`).toBe(
    `${name} in ${file}: commented`,
  );
  const end = source.indexOf("\n}\n", at);
  const body = source.slice(comment, end + 2);
  const constants = constantsBehind(source, body);
  return constants ? `${body}\n// constants it decides with:\n${constants}` : body;
}

const COPIES: Record<string, string[]> = {
  // decided by → the verification scripts that carry it
  plateFollowsGround: [
    "scrolly/scripts/verify-scrolly.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
  ],
  surfaceLuminance: [
    "scrolly/scripts/verify-scrolly.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
  ],
  plateMatchesGeometry: ["map-beat/scripts/verify-map.mjs", "map-web/scripts/verify-guards.mjs"],
  groundFromPalette: ["map-beat/scripts/verify-map.mjs", "map-web/scripts/verify-guards.mjs"],
  plateLuminance: ["map-beat/scripts/verify-map.mjs", "map-web/scripts/verify-guards.mjs"],
  revealDashInScreenSpace: [
    "scrolly/scripts/verify-scrolly.mjs",
    "chart-video/scripts/verify-video.mjs",
    "map-beat/scripts/verify-map.mjs",
    "chart-beat/scripts/verify-static.mjs",
    "chart-web/scripts/verify-guards.mjs",
    "map-web/scripts/verify-guards.mjs",
  ],
  duplicatedPayload: [
    "scrolly/scripts/verify-scrolly.mjs",
    "image-beat/scripts/verify-image.mjs",
    "chart-web/scripts/verify-guards.mjs",
    "map-web/scripts/verify-guards.mjs",
  ],
  // Not a guard but a READER, and it drifted within one afternoon: the style-object form was added
  // to one copy and not the other, and the copy without it returned a mark with no offset and passed
  // it. Walked for the same reason as the decisions.
  marksFromSource: [
    "chart-video/scripts/verify-video.mjs",
    "map-beat/scripts/verify-map.mjs",
    "chart-beat/scripts/verify-static.mjs",
    "chart-web/scripts/verify-guards.mjs",
    "map-web/scripts/verify-guards.mjs",
  ],
};

describe("every copied guard decision is still the same decision", () => {
  for (const [name, files] of Object.entries(COPIES)) {
    it(`${name} should be identical in all ${files.length} scripts that carry it`, () => {
      const [first, ...rest] = files.map((file) => join(SKILLS, file));
      const canonical = declaration(first, name);
      expect(canonical.length).toBeGreaterThan(200);
      for (const file of rest)
        expect(`${file}\n${declaration(file, name)}`).toBe(`${file}\n${canonical}`);
    });
  }

  it("should name every decision the catalogue says more than one skill carries", () => {
    const catalogue = JSON.parse(
      readFileSync(join(SKILLS, "doctrine", "references", "guard-catalogue.json"), "utf8"),
    );
    const shared = catalogue.guards
      .filter(
        (guard: { formats: Record<string, string> }) =>
          Object.values(guard.formats).filter((state) => state === "carried").length > 1,
      )
      .map((guard: { decidedBy: string }) => guard.decidedBy)
      .sort();
    // A guard carried by two skills and NOT walked here is a decision free to drift. This is the
    // assertion that makes adding the next one to `COPIES` unavoidable rather than remembered.
    for (const name of shared) expect(Object.keys(COPIES)).toContain(name);
  });
});
