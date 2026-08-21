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

/** A function's own doc comment and body, as written, plus the constants it decides with.
 *
 *  `async` OR NOT — a capability's own detector drives a live page and has to be one; a guard's own
 *  decision usually reads a string and never needs to be. Both are found by the same declaration,
 *  so a copy cannot drift from sync to async (or back) without this test's own body-comparison
 *  catching the changed source text either way. */
function declaration(file: string, name: string): string {
  const source = readFileSync(file, "utf8");
  const sync = source.indexOf(`export function ${name}(`);
  const async = source.indexOf(`export async function ${name}(`);
  const at = sync >= 0 ? sync : async;
  expect(`${file} declares ${name}`).toBe(
    at >= 0 ? `${file} declares ${name}` : `${file} does NOT declare ${name}`,
  );
  const comment = source.lastIndexOf("/**", at);
  // The doc comment has to be the thing immediately above it — nothing but whitespace between.
  const between = source.slice(source.indexOf("*/", comment) + 2, at);
  expect(
    `${name} in ${file}: ${between.trim() === "" ? "commented" : "detached comment"}`,
  ).toBe(`${name} in ${file}: commented`);
  const end = source.indexOf("\n}\n", at);
  const body = source.slice(comment, end + 2);
  const constants = constantsBehind(source, body);
  return constants
    ? `${body}\n// constants it decides with:\n${constants}`
    : body;
}

const COPIES: Record<string, string[]> = {
  // Task A (round-three stress redesign): the shared number reader. `ground-claim.mjs`'s free-text
  // numeral scanner and `profile.mjs`'s column-level numeric parsing both hand an isolated token
  // to this one decision — a thousands-grouped integer settles itself only with its own trailing
  // decimal tail, everything else ambiguous stays a named refusal, never a guess and never two
  // fragments out of one token.
  readNumericToken: [
    "storyboard/scripts/ground-claim.mjs",
    "intake/scripts/profile.mjs",
  ],
  // decided by → the verification scripts that carry it
  plateFollowsGround: [
    "scrolly/scripts/verify-scrolly.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    // The fourth copy measures something none of the others do: not a plate this tree baked, but the
    // PNG a delegated renderer handed back. The decision cannot tell them apart, which is the whole
    // argument for copying it rather than writing a fourth one.
    "dw-beat/scripts/verify-owned.mjs",
  ],
  surfaceLuminance: [
    "scrolly/scripts/verify-scrolly.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "dw-beat/scripts/verify-owned.mjs",
  ],
  plateMatchesGeometry: [
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "scrolly/scripts/verify-scrolly.mjs",
  ],
  groundFromPalette: [
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "dw-beat/scripts/verify-owned.mjs",
  ],
  plateLuminance: [
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "dw-beat/scripts/verify-owned.mjs",
  ],
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
    "map-beat/scripts/verify-map.mjs",
  ],
  neverArrives: [
    "chart-video/scripts/verify-video.mjs",
    "map-beat/scripts/verify-map.mjs",
  ],
  csvSplitByHand: [
    "chart-video/scripts/verify-video.mjs",
    "dw-beat/scripts/verify-owned.mjs",
    "map-beat/scripts/verify-map.mjs",
    "scrolly/scripts/verify-scrolly.mjs",
  ],
  // FINDING 1 (stress round two): a delivered page's own `<html lang>` used to be a literal baked
  // in for its first caller — every skill that ships a standalone page can carry the same defect,
  // so the check reads the artefact rather than trusting what the render step meant to write.
  pageLanguageMatchesStory: [
    "chart-web/scripts/verify-guards.mjs",
    "map-web/scripts/verify-guards.mjs",
    "scrolly/scripts/verify-scrolly.mjs",
    "dw-beat/scripts/verify-owned.mjs",
  ],
  // FINDING 2 (round-two stress, added to this wave by the coordinator): a credential read by its
  // canonical name with no declared alias list is the exact gap that let a real, present token
  // under the root's own name (DATAWRAPPER_API_TOKEN) read back as "not set". Carried by every
  // producing skill whose own scripts read a provider credential at all.
  credentialNamesRead: [
    "dw-beat/scripts/verify-owned.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "scrolly/scripts/verify-scrolly.mjs",
  ],
  credentialReadsWithoutAlias: [
    "dw-beat/scripts/verify-owned.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "scrolly/scripts/verify-scrolly.mjs",
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
  // Also a READER, not a guard, and the argument for walking it is the same one: neverArrives
  // decides on the shape this returns, and a copy that read a ramp's bounds differently would
  // refuse a different set of beats while looking like the same decision.
  rampsFromSource: [
    "chart-video/scripts/verify-video.mjs",
    "map-beat/scripts/verify-map.mjs",
  ],
  // A capability, not a guard, and the first one this map reaches carried by more than one skill:
  // chart-web's seed baked `tabIndex`/`aria-label` on every point; map-web's marks are native
  // `<button>`s with the same `aria-label`/`data-detail` pairing. Same detector, same contract.
  keyboardReachesEveryMark: [
    "chart-web/scripts/detect-reachable-by-keyboard.mjs",
    "map-web/scripts/detect-reachable-by-keyboard.mjs",
  ],
  // A capability, not a guard, carried by the same two skills for the same underlying reason: both
  // bake every mark's `data-detail` at build time rather than assemble it from a script, so the
  // population survives scripting being removed. A copy that read the count differently before and
  // after the reload would silently redefine "survives" per format.
  staticFrameSurvives: [
    "chart-web/scripts/detect-degrades-without-javascript.mjs",
    "map-web/scripts/detect-degrades-without-javascript.mjs",
  ],
  // A capability, not a guard: same-facts-without-the-picture, now carried by two skills after fix
  // round 1 widened the detector to accept a value split across typed columns as well as one
  // joined cell -- a copy that only kept the exact-cell path (or only the fallback) would refuse a
  // table its sibling accepts, silently narrowing what "the same facts" means depending which
  // skill's copy a reader happened to be looking at.
  tableCarriesTheMarks: [
    "chart-web/scripts/detect-accessible-table.mjs",
    "map-web/scripts/detect-accessible-table.mjs",
  ],
  // A capability, not a guard, carried by every format that inlines its own assets: the delivered
  // file's own weight, measured against a ceiling this format's own beats have already earned by
  // how much they weigh today. `ceiling` is a parameter here rather than a module constant each
  // copy's own body would reference by name, precisely so the five different numbers behind it
  // (chart-web, map-beat, map-web, image-beat, scrolly each measure a different population) live
  // outside the compared span and cannot make five honest ceilings look like five drifted copies.
  weightAgainstCeiling: [
    "chart-web/scripts/detect-weight-has-a-ceiling.mjs",
    "map-beat/scripts/detect-weight-has-a-ceiling.mjs",
    "map-web/scripts/detect-weight-has-a-ceiling.mjs",
    "image-beat/scripts/detect-weight-has-a-ceiling.mjs",
    "scrolly/scripts/detect-weight-has-a-ceiling.mjs",
  ],
  // FINDING 3 (round-two stress): the fraction of the reader's own window the graphic's own box
  // actually covers, against a per-format floor — same shape as weightAgainstCeiling, a shared
  // comparison with the ceiling/floor itself living outside the compared span as each copy's own
  // measured constant.
  graphicFillsItsFrame: [
    "chart-web/scripts/detect-fills-its-frame.mjs",
    "map-web/scripts/detect-fills-its-frame.mjs",
    "scrolly/scripts/detect-fills-its-frame.mjs",
    "dw-beat/scripts/detect-fills-its-frame.mjs",
  ],
  // FINDING 8's own capability, carried by the three chart formats. Declared in
  // `render-still.mjs` itself (a beat's `render.mjs` calls it directly, on the values it is about
  // to draw, the same way it already calls `readPalette` there) rather than in a `detect-*.mjs` —
  // each skill's own `detect-framing-is-measured.mjs` re-exports it for the `GUARDS` declaration
  // `carriedBy` reads, but the declaration compared here is the one place the decision is written.
  framingMeasurement: [
    "chart-beat/scripts/render-still.mjs",
    "chart-web/scripts/render-still.mjs",
    "chart-video/scripts/render-still.mjs",
  ],
  // FINDING 9 (round-three stress): the capability every producing skill carries once it declares
  // it has one — `materialises-a-beat` reaches all eight, so this is the first decision walked
  // here that all eight skills share a copy of.
  storyboardGateStatus: [
    "chart-beat/scripts/storyboard-gate.mjs",
    "chart-web/scripts/storyboard-gate.mjs",
    "chart-video/scripts/storyboard-gate.mjs",
    "dw-beat/scripts/storyboard-gate.mjs",
    "map-beat/scripts/storyboard-gate.mjs",
    "map-web/scripts/storyboard-gate.mjs",
    "image-beat/scripts/storyboard-gate.mjs",
    "scrolly/scripts/storyboard-gate.mjs",
  ],
};

describe("every copied guard decision is still the same decision", () => {
  for (const [name, files] of Object.entries(COPIES)) {
    it(`${name} should be identical in all ${files.length} scripts that carry it`, () => {
      const [first, ...rest] = files.map((file) => join(SKILLS, file));
      const canonical = declaration(first, name);
      expect(canonical.length).toBeGreaterThan(200);
      for (const file of rest)
        expect(`${file}\n${declaration(file, name)}`).toBe(
          `${file}\n${canonical}`,
        );
    });
  }

  it("should name every decision the catalogue says more than one skill carries", () => {
    const catalogue = JSON.parse(
      readFileSync(
        join(SKILLS, "doctrine", "references", "guard-catalogue.json"),
        "utf8",
      ),
    );
    const shared = catalogue.rules
      .filter(
        (rule: { kind: string; states: Record<string, string> }) =>
          // A discipline names no decision function at all — `disciplineIsWritten` reads PROSE, a
          // skill's own sentence in its own words, and two skills carrying the same discipline are
          // not two copies of one decision the way two `plateFollowsGround`s are. Requiring them
          // byte-identical would be requiring every skill to say the same thing about a doctrine it
          // reads for its own reasons, which is not what this test exists to catch.
          rule.kind !== "discipline" &&
          Object.values(rule.states).filter((state) => state === "carried")
            .length > 1,
      )
      // `decidedBy` names a guard's own decision function; `detectedBy` names a capability's own —
      // the same fallback `guard-parity.test.ts`'s own assertions use, under whichever name a
      // rule's `kind` carries it as.
      .map(
        (rule: { decidedBy?: string; detectedBy?: string }) =>
          rule.decidedBy ?? rule.detectedBy,
      )
      .sort();
    // A guard carried by two skills and NOT walked here is a decision free to drift. This is the
    // assertion that makes adding the next one to `COPIES` unavoidable rather than remembered.
    for (const name of shared) expect(Object.keys(COPIES)).toContain(name);
  });
});
