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
  // ROUND-FIVE FINDING T2 widened this from four to eight: it required `ships-standalone-html` and
  // now requires `materialises-a-beat`, so the four FIXED-frame formats carry it too. The decision
  // is unchanged and stays one decision across both kinds of frame — what differs is only where the
  // fraction comes from (a browser's bounding box for a page, `frameFillFraction`'s own reading of
  // the delivered PNG for a fixed frame) and the per-format floor, both of which live outside the
  // compared span on purpose.
  graphicFillsItsFrame: [
    "chart-beat/scripts/detect-fills-its-frame.mjs",
    "chart-web/scripts/detect-fills-its-frame.mjs",
    "chart-video/scripts/detect-fills-its-frame.mjs",
    "map-beat/scripts/detect-fills-its-frame.mjs",
    "map-web/scripts/detect-fills-its-frame.mjs",
    "image-beat/scripts/detect-fills-its-frame.mjs",
    "scrolly/scripts/detect-fills-its-frame.mjs",
    "dw-beat/scripts/detect-fills-its-frame.mjs",
  ],
  // The reading behind the four fixed-frame copies. Not a catalogue decision of its own, walked for
  // the same reason `readerVisibleText` is: a copy that moved the ink threshold, or counted coverage
  // where its neighbour measures a box, would make one format's floor mean something else entirely
  // while the shared decision above still looked identical.
  frameFillFraction: [
    "chart-beat/scripts/detect-fills-its-frame.mjs",
    "chart-video/scripts/detect-fills-its-frame.mjs",
    "map-beat/scripts/detect-fills-its-frame.mjs",
    "image-beat/scripts/detect-fills-its-frame.mjs",
  ],
  // ROUND-FIVE, the owner's ruling on the staggered reveal: whether a build's stagger follows an
  // order the data actually carries. Both video formats decide it, and they decide OPPOSITE cases —
  // chart-video's line earns its stagger (one mark per year, distinct and ascending), map-beat's
  // choropleth cannot (one snapshot, no order across its shapes). That is precisely why the two
  // copies have to be one decision: a copy that softened the tie rule, or stopped requiring a
  // position at all, would let the format it lives in ship the exact build the other refuses.
  staggerLacksAnOrder: [
    "chart-video/scripts/detect-reveal-order.mjs",
    "map-beat/scripts/detect-reveal-order.mjs",
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
  // FINDING 16 (round-four stress): the sweep that CALLS a format's own committed runners. All four
  // of its functions are compared, not only the decision: the discovery is what defines the
  // population a red is measured over, and a copy that quietly narrowed its own discovery would
  // report an empty sweep as a green one — the exact shape of the failure the rule exists to close.
  // Nothing in any of them is skill-specific; the skill is a parameter.
  exampleRunnersFor: [
    "chart-beat/scripts/example-runners.mjs",
    "chart-web/scripts/example-runners.mjs",
    "chart-video/scripts/example-runners.mjs",
    "dw-beat/scripts/example-runners.mjs",
    "map-beat/scripts/example-runners.mjs",
    "map-web/scripts/example-runners.mjs",
    "image-beat/scripts/example-runners.mjs",
    "scrolly/scripts/example-runners.mjs",
  ],
  runExampleRunners: [
    "chart-beat/scripts/example-runners.mjs",
    "chart-web/scripts/example-runners.mjs",
    "chart-video/scripts/example-runners.mjs",
    "dw-beat/scripts/example-runners.mjs",
    "map-beat/scripts/example-runners.mjs",
    "map-web/scripts/example-runners.mjs",
    "image-beat/scripts/example-runners.mjs",
    "scrolly/scripts/example-runners.mjs",
  ],
  deadExampleRunners: [
    "chart-beat/scripts/example-runners.mjs",
    "chart-web/scripts/example-runners.mjs",
    "chart-video/scripts/example-runners.mjs",
    "dw-beat/scripts/example-runners.mjs",
    "map-beat/scripts/example-runners.mjs",
    "map-web/scripts/example-runners.mjs",
    "image-beat/scripts/example-runners.mjs",
    "scrolly/scripts/example-runners.mjs",
  ],
  spawnRunner: [
    "chart-beat/scripts/example-runners.mjs",
    "chart-web/scripts/example-runners.mjs",
    "chart-video/scripts/example-runners.mjs",
    "dw-beat/scripts/example-runners.mjs",
    "map-beat/scripts/example-runners.mjs",
    "map-web/scripts/example-runners.mjs",
    "image-beat/scripts/example-runners.mjs",
    "scrolly/scripts/example-runners.mjs",
  ],
  // ROUND-FOUR FINDING 8: not a guard on the pixels but a decision about a STORY's state, and the
  // first entry here shared by a craft-less pair. `deliver` writes both closing-offer receipts as
  // `pending` and reads them back; `whereIs` had to learn the same reading before it could stop
  // calling a story `done` with the offer unasked. Two readings of "pending is not an answer" would
  // be two definitions of finished, one per caller, which is what this whole file exists to prevent.
  deliveryClosed: [
    "deliver/scripts/another-format.mjs",
    "splash/scripts/where.mjs",
  ],
  // ROUND-FOUR FINDINGS 12, 13 and 14: a de-collided label stack that stopped naming what it
  // names. Reachable wherever a skill draws its own marks, which is all seven — the defect is in
  // the arithmetic that places a label, not in a genre, and the same slope, dumbbell or ranked
  // column can be drawn as a still, a page, a build or a track inside a scrolly. A copy that
  // loosened either clause would accept, on one format, a graphic its neighbour refuses — and
  // what it would be accepting is a chart printing a number against the wrong row.
  mislabelledRows: [
    "chart-beat/scripts/detect-label-rows.mjs",
    "chart-web/scripts/detect-label-rows.mjs",
    "chart-video/scripts/detect-label-rows.mjs",
    "map-beat/scripts/detect-label-rows.mjs",
    "map-web/scripts/detect-label-rows.mjs",
    "image-beat/scripts/detect-label-rows.mjs",
    "scrolly/scripts/detect-label-rows.mjs",
  ],
  // The READER, walked for the same reason `marksFromSource` is: `mislabelledRows` decides on the
  // shape this returns, and a copy that stopped recognising a leader would hand it an empty set
  // of stacks and report a crossed chart as a clean one — the vacuous green this whole file
  // exists to make impossible.
  labelStacksFrom: [
    "chart-beat/scripts/detect-label-rows.mjs",
    "chart-web/scripts/detect-label-rows.mjs",
    "chart-video/scripts/detect-label-rows.mjs",
    "map-beat/scripts/detect-label-rows.mjs",
    "map-web/scripts/detect-label-rows.mjs",
    "image-beat/scripts/detect-label-rows.mjs",
    "scrolly/scripts/detect-label-rows.mjs",
  ],
  // Not a decision about a defect but the MECHANISM that makes two of them impossible, and the
  // reason findings 12 and 13 happened at all: `types/slope.md` requires vertical de-collision
  // and no skill offered one, so every author wrote it again. Declared in `render-still.mjs`
  // itself — where an author already reaches for `measureText` and `wrap`'s measurer — and
  // compared here across all seven copies, so a skill cannot quietly drop it. `render-still-parity`
  // walks the same file but accepts a copy that simply lacks a function; this does not.
  decollide: [
    "chart-beat/scripts/render-still.mjs",
    "chart-web/scripts/render-still.mjs",
    "chart-video/scripts/render-still.mjs",
    "map-beat/scripts/render-still.mjs",
    "map-web/scripts/render-still.mjs",
    "image-beat/scripts/render-still.mjs",
    "scrolly/scripts/render-still.mjs",
  ],
  // ROUND-FOUR FINDING 5: a beat drawn from a count with a denominator beside it says which
  // reading it draws. `materialises-a-beat` reaches all eight, and the decision is entirely about
  // a story's own frozen table and a BRIEF.md — nothing in it is skill-specific. Six of the eight
  // sweep an empty population today; a copy that quietly narrowed what counts as a denominator, or
  // what counts as a stated reading, would go green on a beat its neighbour refuses on the day one
  // of them meets its first denominator, which is precisely the drift this file exists to catch.
  denominatorReadingStated: [
    "chart-beat/scripts/detect-denominator-reading.mjs",
    "chart-web/scripts/detect-denominator-reading.mjs",
    "chart-video/scripts/detect-denominator-reading.mjs",
    "dw-beat/scripts/detect-denominator-reading.mjs",
    "map-beat/scripts/detect-denominator-reading.mjs",
    "map-web/scripts/detect-denominator-reading.mjs",
    "image-beat/scripts/detect-denominator-reading.mjs",
    "scrolly/scripts/detect-denominator-reading.mjs",
  ],
  // The DISCOVERY, walked for the same reason `exampleRunnersFor` is: it defines the population a
  // red is measured over, and a copy that narrowed it would report an empty sweep as a green one.
  beatsCalling: [
    "chart-beat/scripts/detect-denominator-reading.mjs",
    "chart-web/scripts/detect-denominator-reading.mjs",
    "chart-video/scripts/detect-denominator-reading.mjs",
    "dw-beat/scripts/detect-denominator-reading.mjs",
    "map-beat/scripts/detect-denominator-reading.mjs",
    "map-web/scripts/detect-denominator-reading.mjs",
    "image-beat/scripts/detect-denominator-reading.mjs",
    "scrolly/scripts/detect-denominator-reading.mjs",
    "chart-beat/scripts/detect-delivered-text.mjs",
    "chart-web/scripts/detect-delivered-text.mjs",
    "chart-video/scripts/detect-delivered-text.mjs",
    "dw-beat/scripts/detect-delivered-text.mjs",
    "map-beat/scripts/detect-delivered-text.mjs",
    "map-web/scripts/detect-delivered-text.mjs",
    "image-beat/scripts/detect-delivered-text.mjs",
    "scrolly/scripts/detect-delivered-text.mjs",
  ],
  // ROUND-FOUR FINDING 11: the value `credit` takes when the journalist named no source, and the
  // line a delivered artefact prints for it. `storyboard` records the answer; `deliver` renders it.
  // Two readings of "unattributed" would be two definitions of what an absent source looks like to
  // a reader — one of them a maintainer's token reaching a newsroom, or a blank where a credit
  // goes — which is the same class of divergence `deliveryClosed` is walked for one field over.
  isUnattributedCredit: [
    "storyboard/scripts/storyboard.mjs",
    "deliver/scripts/format-handover.mjs",
  ],
  creditLine: [
    "storyboard/scripts/storyboard.mjs",
    "deliver/scripts/format-handover.mjs",
  ],
  // ROUND-FOUR FINDINGS 11 AND 15: what a DELIVERED artefact is allowed to say. Both decisions read
  // the files under `stories/<story>/export/<outputId>/` — the hand-over a newsroom pastes from and
  // the vector or page it ships — and nothing in either is skill-specific; the skill is a parameter.
  // `materialises-a-beat` reaches all eight. A copy that narrowed what counts as an attribution, or
  // what counts as reader-visible, would go green on a delivery its neighbour refuses — and what it
  // would be passing is a real named organisation credited with data it never touched.
  creditTracesToRecord: [
    "chart-beat/scripts/detect-delivered-text.mjs",
    "chart-web/scripts/detect-delivered-text.mjs",
    "chart-video/scripts/detect-delivered-text.mjs",
    "dw-beat/scripts/detect-delivered-text.mjs",
    "map-beat/scripts/detect-delivered-text.mjs",
    "map-web/scripts/detect-delivered-text.mjs",
    "image-beat/scripts/detect-delivered-text.mjs",
    "scrolly/scripts/detect-delivered-text.mjs",
  ],
  doubleHyphenInDeliveredText: [
    "chart-beat/scripts/detect-delivered-text.mjs",
    "chart-web/scripts/detect-delivered-text.mjs",
    "chart-video/scripts/detect-delivered-text.mjs",
    "dw-beat/scripts/detect-delivered-text.mjs",
    "map-beat/scripts/detect-delivered-text.mjs",
    "map-web/scripts/detect-delivered-text.mjs",
    "image-beat/scripts/detect-delivered-text.mjs",
    "scrolly/scripts/detect-delivered-text.mjs",
  ],
  // The READER both decisions stand on, walked for the same reason `marksFromSource` is: a copy that
  // stopped stripping `<style>` would report 21 code comments as defects, and a copy that stopped
  // reading `alt`/`aria-label` would report a page as clean while a screen reader speaks the defect
  // aloud. Either way the two formats would disagree about what a reader receives.
  readerVisibleText: [
    "chart-beat/scripts/detect-delivered-text.mjs",
    "chart-web/scripts/detect-delivered-text.mjs",
    "chart-video/scripts/detect-delivered-text.mjs",
    "dw-beat/scripts/detect-delivered-text.mjs",
    "map-beat/scripts/detect-delivered-text.mjs",
    "map-web/scripts/detect-delivered-text.mjs",
    "image-beat/scripts/detect-delivered-text.mjs",
    "scrolly/scripts/detect-delivered-text.mjs",
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
