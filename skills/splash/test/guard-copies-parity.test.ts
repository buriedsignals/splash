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
  // ROUND SEVEN, findings D3/D6 and the panel-grounding defects: IS THIS FILE A PANEL, AND WHICH
  // COLUMN NAMES ITS SUBJECT. `intake` has to answer it to describe a frozen table at all, and
  // `storyboard` has to answer it before it reads a value out of one — on a 7 585-row Ember file it
  // answered "higher in 2023 than in 2000" from `ASEAN (Ember)`'s rows, the first rows of those
  // years, for a sentence about the world. A profiler that says panel while the check that decides
  // a gate says flat table is worse than neither saying it, so it is one decision, walked here.
  //
  // Its dependency `findYearColumn` is copied byte-identically beside it in `intake` and is NOT yet
  // walked: `declaration()` anchors on the doc comment immediately above a function and
  // `ground-claim.mjs`'s copy carries none, so registering it would fail on the missing anchor
  // rather than on a drift. A doc comment on the storyboard copy is all it needs.
  panelShapeOf: ["storyboard/scripts/ground-claim.mjs", "intake/scripts/profile.mjs"],
  // ROUND SIX, task GATE: gate 2's SECOND file. `SUBJECTS.md` was required at G4, produced at G2 by
  // `recordSurveyedSubjects`, and required by no gate in between — reported independently by six
  // formats across two rounds, the most-reported defect in this project's history. Both gate-2
  // readers now run this decision: `where.mjs` inside `whereIs`, and `storyboard.mjs` beside
  // `checkStoryboard`, which is pure over the frontmatter and structurally cannot see a file. One
  // reader learning the rule alone is the A7/A14 divergence class, so the copy is walked here.
  surveyGap: ["splash/scripts/where.mjs", "storyboard/scripts/storyboard.mjs"],
  // ROUND SEVEN, D7: which names one treatment answers to. The two gate-2 readings each held their
  // own hand-typed alias table, and both missed "Stacked area" — the natural name for the treatment
  // and half of `chart-beat/references/types/area.md`'s own title — which silently removed the
  // custom-or-Datawrapper human gate on a real story. Two tables were replaced by one derivation
  // over the type sheet's own title; a copy of it that drifted would let the storyboard open a gate
  // `whereIs` then refuses, or the reverse, which is the divergence the table shape already caused.
  treatmentNames: [
    "splash/scripts/where.mjs",
    "storyboard/scripts/producer-gate.mjs",
  ],
  // Task A (round-three stress redesign): the shared number reader. `ground-claim.mjs`'s free-text
  // numeral scanner and `profile.mjs`'s column-level numeric parsing both hand an isolated token
  // to this one decision — a thousands-grouped integer settles itself only with its own trailing
  // decimal tail, everything else ambiguous stays a named refusal, never a guess and never two
  // fragments out of one token.
  readNumericToken: [
    "storyboard/scripts/ground-claim.mjs",
    "intake/scripts/profile.mjs",
  ],
  // ROUND SIX, findings C1 and C2: the two coverage nets a name-based lexicon owes when it meets a
  // language it was never taught. `storyboard`'s grounding check and `intake`'s profiler are bound
  // to the SAME four declared languages and to the same denominator token list, so a gap either of
  // them can see the other must see identically — a Polish column name that made one withhold
  // `supported` while the other reported nothing would be the round-four defect re-opened at the
  // seam between two skills instead of inside one.
  scriptsNotRead: [
    "storyboard/scripts/ground-claim.mjs",
    "intake/scripts/profile.mjs",
  ],
  lettersNotRead: [
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
    // ROUND-FIVE FINDING Y2, and the fifth copy is the only one that is not a check after the fact.
    // A run against a dark-ground newsroom created a chart, uploaded 186 rows, PUBLISHED it,
    // exported the PNG and only then refused it for landing on the opposite side from the story's
    // own ground. Phase 0 already reads NEWSROOM.md and `ground` is in it, so preflight can answer
    // the question while it is still free to answer — but only if it decides "which side is this
    // ground on" the SAME way the producer that would later refuse decides it. A preflight that
    // said dark where the guard says middle would not have moved the surprise, only relocated it.
    "splash/scripts/preflight.mjs",
  ],
  surfaceLuminance: [
    "scrolly/scripts/verify-scrolly.mjs",
    "map-beat/scripts/verify-map.mjs",
    "map-web/scripts/verify-guards.mjs",
    "dw-beat/scripts/verify-owned.mjs",
    "splash/scripts/preflight.mjs",
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
  // ROUND-FIVE FINDING T4 (second half): whether a label's box escapes the plate's clip rectangle.
  // Carried by every format that BAKES a plate, and the copies matter because the failure mode is
  // silence: a copy that widened its tolerance, or stopped checking one of the four edges, would
  // ship a truncated word its neighbour refuses, and nothing downstream would say so. It imports
  // nothing, like `decollide.mjs`, because the place the decision has to be MADE is inside a
  // component a browser bundles.
  labelsClippedByPlate: [
    "map-beat/scripts/detect-label-clipped-by-plate.mjs",
    "map-web/scripts/detect-label-clipped-by-plate.mjs",
    "scrolly/scripts/detect-label-clipped-by-plate.mjs",
  ],
  // ROUND-FIVE, the owner's ruling on the staggered reveal: whether a build's stagger follows an
  // order the data actually carries. Both video formats decide it, and they decide OPPOSITE cases —
  // chart-video's line earns its stagger (one mark per year, distinct and ascending), map-beat's
  // choropleth cannot (one snapshot, no order across its shapes). That is precisely why the two
  // copies have to be one decision: a copy that softened the tie rule, or stopped requiring a
  // position at all, would let the format it lives in ship the exact build the other refuses.
  // ROUND SIX added the THIRD copy, and it is the one a story beat can actually reach. The decision
  // was imported by exactly one file in the tree — `chart-video/scripts/render-video.mjs`, which
  // renders that skill's own seed — and `shared/chart-video/` carried `sizes.mjs` and `timing.ts`
  // and nothing else, so no beat in an installed root could reach it at all. The vendored copy is
  // the route; holding it to the same decision is what keeps the route from becoming a softer one.
  staggerLacksAnOrder: [
    "chart-video/scripts/detect-reveal-order.mjs",
    "map-beat/scripts/detect-reveal-order.mjs",
    "../shared/chart-video/detect-reveal-order.mjs",
    "splash/assets/root-template/shared/chart-video/detect-reveal-order.mjs",
  ],
  // The BUILDER the decision now lives inside, walked for the same reason `marksFromSource` is: it
  // decides where every mark's window starts, and a copy that spread them differently would hand
  // `staggerLacksAnOrder` a different set of starts while the decision itself still looked identical.
  staggeredReveal: [
    "chart-video/scripts/detect-reveal-order.mjs",
    "../shared/chart-video/detect-reveal-order.mjs",
    "splash/assets/root-template/shared/chart-video/detect-reveal-order.mjs",
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
  //
  // ROUND-FIVE FINDING T4 doubled the list: `render-still.mjs` imports `@resvg/resvg-js` at module
  // load, so every copy above was unreachable from a component a browser bundles — which is every
  // VIDEO component in this tree. `scripts/decollide.mjs` is the same function in a module that
  // imports nothing, and the fourteen paths are compared together precisely so the browser-side
  // copy cannot become a second, softer de-collision.
  decollide: [
    "chart-beat/scripts/render-still.mjs",
    "chart-web/scripts/render-still.mjs",
    "chart-video/scripts/render-still.mjs",
    "map-beat/scripts/render-still.mjs",
    "map-web/scripts/render-still.mjs",
    "image-beat/scripts/render-still.mjs",
    "scrolly/scripts/render-still.mjs",
    "chart-beat/scripts/decollide.mjs",
    "chart-web/scripts/decollide.mjs",
    "chart-video/scripts/decollide.mjs",
    "map-beat/scripts/decollide.mjs",
    "map-web/scripts/decollide.mjs",
    "image-beat/scripts/decollide.mjs",
    "scrolly/scripts/decollide.mjs",
  ],
  // ROUND-SIX FINDING AC1: whether a guard this skill DECLARES is called by anything the skill
  // ships. `fills-its-frame` was distributed to all eight producing skills and called by none of
  // them, four hours after the re-declaration that was reported as the fix — the rule reached them
  // in the catalogue and not in the code. `guard-wired-to-run` had been the DISCIPLINE against
  // exactly that since round three and could not observe its own violation, because prose cannot.
  // Walked across all eight for the reason every entry here is walked, and one sharper: a copy that
  // started counting an IMPORT, a `export { … } from` shim or a COMMENT as a caller would report
  // its own format as wired while nothing ran — which is not a drift between two formats but a
  // mechanism certifying itself. All three of those weakenings were found by mutation while this
  // was being written, and each is refused in the compared body below.
  withoutComments: [
    "chart-beat/scripts/detect-guard-wiring.mjs",
    "chart-web/scripts/detect-guard-wiring.mjs",
    "chart-video/scripts/detect-guard-wiring.mjs",
    "dw-beat/scripts/detect-guard-wiring.mjs",
    "map-beat/scripts/detect-guard-wiring.mjs",
    "map-web/scripts/detect-guard-wiring.mjs",
    "image-beat/scripts/detect-guard-wiring.mjs",
    "scrolly/scripts/detect-guard-wiring.mjs",
  ],
  withoutQuotedNames: [
    "chart-beat/scripts/detect-guard-wiring.mjs",
    "chart-web/scripts/detect-guard-wiring.mjs",
    "chart-video/scripts/detect-guard-wiring.mjs",
    "dw-beat/scripts/detect-guard-wiring.mjs",
    "map-beat/scripts/detect-guard-wiring.mjs",
    "map-web/scripts/detect-guard-wiring.mjs",
    "image-beat/scripts/detect-guard-wiring.mjs",
    "scrolly/scripts/detect-guard-wiring.mjs",
  ],
  declaredDecisions: [
    "chart-beat/scripts/detect-guard-wiring.mjs",
    "chart-web/scripts/detect-guard-wiring.mjs",
    "chart-video/scripts/detect-guard-wiring.mjs",
    "dw-beat/scripts/detect-guard-wiring.mjs",
    "map-beat/scripts/detect-guard-wiring.mjs",
    "map-web/scripts/detect-guard-wiring.mjs",
    "image-beat/scripts/detect-guard-wiring.mjs",
    "scrolly/scripts/detect-guard-wiring.mjs",
  ],
  declarationsWithoutACaller: [
    "chart-beat/scripts/detect-guard-wiring.mjs",
    "chart-web/scripts/detect-guard-wiring.mjs",
    "chart-video/scripts/detect-guard-wiring.mjs",
    "dw-beat/scripts/detect-guard-wiring.mjs",
    "map-beat/scripts/detect-guard-wiring.mjs",
    "map-web/scripts/detect-guard-wiring.mjs",
    "image-beat/scripts/detect-guard-wiring.mjs",
    "scrolly/scripts/detect-guard-wiring.mjs",
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
  //
  // ROUND-FIVE FINDING Y1 added the THIRD copy, and it is the one that draws pixels. Measured by
  // the controller: `buildChartPayload({... credit: "unattributed" ...})` came back with
  // `metadata.describe["source-name"] === "unattributed, 2025-06-30"`, so round four's fix had
  // landed in the phase that RECORDS the answer and the phase that HANDS IT OVER and in neither of
  // the two places that draw pixels. `dw-beat` is the one producer that composes its credit line
  // mechanically rather than through a component an agent writes by hand, which is why it is the
  // one producer this decision can be copied INTO at all.
  isUnattributedCredit: [
    "storyboard/scripts/storyboard.mjs",
    "deliver/scripts/format-handover.mjs",
    "dw-beat/scripts/metadata-spec.mjs",
  ],
  creditLine: [
    "storyboard/scripts/storyboard.mjs",
    "deliver/scripts/format-handover.mjs",
    "dw-beat/scripts/metadata-spec.mjs",
  ],
  // ROUND-FOUR FINDINGS 11 AND 15: what a DELIVERED artefact is allowed to say. Both decisions read
  // the files under `stories/<story>/export/<outputId>/` — the hand-over a newsroom pastes from and
  // the vector or page it ships — and nothing in either is skill-specific; the skill is a parameter.
  // `materialises-a-beat` reaches all eight. A copy that narrowed what counts as an attribution, or
  // what counts as reader-visible, would go green on a delivery its neighbour refuses — and what it
  // would be passing is a real named organisation credited with data it never touched.
  // ROUND-FIVE FINDING X3: resvg ignores SVG's `direction` and lays every paragraph out left to
  // right, so a right-to-left run has to carry its own Unicode formatting characters or its
  // sentence-final punctuation is drawn at the wrong end of the line. `draws-own-geometry` reaches
  // seven skills — every format that rasterises its own SVG — and the decision is the same one in
  // all seven: which characters the rasteriser honours is a fact about the rasteriser, not about a
  // chart, a map or a photograph. A copy that started accepting `direction="rtl"` would certify the
  // exact defect, and a copy that stopped decoding numeric entities would pass a run a reader still
  // receives as Arabic.
  rtlRunsAreIsolated: [
    "chart-beat/scripts/detect-rtl-isolation.mjs",
    "chart-web/scripts/detect-rtl-isolation.mjs",
    "chart-video/scripts/detect-rtl-isolation.mjs",
    "map-beat/scripts/detect-rtl-isolation.mjs",
    "map-web/scripts/detect-rtl-isolation.mjs",
    "image-beat/scripts/detect-rtl-isolation.mjs",
    "scrolly/scripts/detect-rtl-isolation.mjs",
  ],
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

/** A module-level CONSTANT's whole declaration, from `const NAME` to the line that closes it.
 *
 *  `constantsBehind` above follows a constant a compared function references, and it can only see a
 *  ONE-LINE declaration — `^const NAME = .*;$`, with `.` never matching a newline. Every lexicon in
 *  this tree is a multi-line `new Set([…])` or array, so the denominator token list — copied into TEN
 *  files, and the single decision behind "is there a denominator beside this count" — was walked by
 *  nothing at all. Measured while writing this: eight of the ten spelled their Greek and Arabic
 *  entries as literal characters and two as `\u` escapes, two encodings of one list, and no test in
 *  this tree could see the difference, let alone a token added to one copy and not the nine others.
 *
 *  The declaration is compared WITH the comments inside it and WITHOUT the doc comment above it: the
 *  comments inside carry the languages the list claims to read and the generated region's own
 *  provenance, and they are the first thing a copy drops; the doc comment above legitimately differs,
 *  because `intake/scripts/profile.mjs` explains the whole denominator mechanism where a producer's
 *  `detect-denominator-reading.mjs` only says where the list came from. */
function constantDeclaration(file: string, name: string): string {
  const source = readFileSync(file, "utf8");
  const at = source.indexOf(`const ${name} = `);
  expect(`${file} declares ${name}`).toBe(
    at >= 0 ? `${file} declares ${name}` : `${file} does NOT declare ${name}`,
  );
  const closes = [source.indexOf("\n]);", at), source.indexOf("\n];", at)].filter((i) => i > at);
  const end = Math.min(...closes);
  return source.slice(at, source.indexOf("\n", end + 1));
}

/** A LEXICON IS A DECISION. `COPIES` walks functions; these are the word lists those functions
 *  decide WITH, and a list that grew in one copy and not the others is the same divergence in a
 *  different shape — one skill calling a column a denominator while its neighbour says nothing.
 *  Round six's own theme is what that costs: only the denominator column's NAME changing language
 *  moved a verdict from `unverifiable` to `supported`, which is a lexicon gap RAISING confidence. */
const SHARED_CONSTANTS: Record<string, string[]> = {
  DENOMINATOR_NAME_TOKENS: [
    "intake/scripts/profile.mjs",
    "storyboard/scripts/ground-claim.mjs",
    "chart-beat/scripts/detect-denominator-reading.mjs",
    "chart-web/scripts/detect-denominator-reading.mjs",
    "chart-video/scripts/detect-denominator-reading.mjs",
    "dw-beat/scripts/detect-denominator-reading.mjs",
    "map-beat/scripts/detect-denominator-reading.mjs",
    "map-web/scripts/detect-denominator-reading.mjs",
    "image-beat/scripts/detect-denominator-reading.mjs",
    "scrolly/scripts/detect-denominator-reading.mjs",
  ],
};

describe("every copied lexicon is still the same lexicon", () => {
  for (const [name, files] of Object.entries(SHARED_CONSTANTS)) {
    it(`${name} should be identical in all ${files.length} scripts that carry it`, () => {
      const [first, ...rest] = files.map((file) => join(SKILLS, file));
      const canonical = constantDeclaration(first, name);
      expect(canonical.length).toBeGreaterThan(200);
      for (const file of rest)
        expect(`${file}\n${constantDeclaration(file, name)}`).toBe(`${file}\n${canonical}`);
    });
  }
});

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
