// twin/shared/editorial/retained.mjs
//
// THE RETAINED PROPOSAL — WHAT THE JOURNALIST CHOSE, AS ONE TYPED OBJECT EVERY LATER STEP READS.
//
// A beat is produced from a RETAINED PROPOSAL, not from a beat that resembles it. Gate 2 records
// the choice — medium, format, size, type, intent, interaction, and the claim's shape and
// grounding — and until this file existed nothing downstream read it back as one thing: each
// scaffold picked the two or three fields it happened to need and inferred the rest. This is the
// one reader, so a step that stops reading a field breaks a named test rather than quietly
// defaulting.
//
// WHY THE PARSERS ARE INJECTED, AND WHY THE SPEC'S SIGNATURE COULD NOT STAND.
//
// `docs/splash/2026-09-17-editorial-chain-spec.md` §2.3 writes `readRetained(storyDir, slotId)` and
// `retainedFromBrief(beatDir)`. Neither can be written that way HERE: `shared/` is shipped on its
// own into a newsroom root that has no `skills/` directory beside it, so a module under `shared/`
// may not import out of it (`skills/map-beat/test/the-trunk-stands-alone.test.ts`). `parseStoryboard`
// lives in `skills/storyboard/scripts/gate-contract.mjs` and the visual catalogue in
// `skills/storyboard/references/`, so both arrive as arguments. `readPinnedSize`
// (`shared/chart-beat/sizes.mjs`) already injects its filesystem for exactly this reason; this is
// the same seam, and the error a caller gets says so rather than leaving them to guess.
//
// NOTHING HERE DEFAULTS A GROUNDING. `requiredAssertions` behaves differently for each of the three
// verdicts — `supported` requires the claim's own datum, `unverifiable` FORBIDS it and widens the
// rounding, `overridden` makes the exactness note mandatory — so a guessed `supported` is not a
// safe default, it is a beat asserting a number the journalist said could not be verified.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBriefFrontMatter } from "#shared/chart-beat/sizes.mjs";

/** @typedef {{ kind: string, promise: string }} Interaction */
/**
 * @typedef {{
 *   slotId: string, proves: string|null, intent: string|null, language: string|null,
 *   medium: "chart"|"map"|"image", format: "static"|"video"|"web"|"scrolly",
 *   size: "landscape"|"square"|"portrait"|null, type: string,
 *   claim: { shape: string, grounding: string },
 *   interaction: Interaction }} RetainedProposal
 */

/** The fields a retained proposal cannot be built without. `size` is conditional by format. */
export const REQUIRED_RETAINED_FIELDS = ["medium", "format", "type", "interaction", "grounding"];

const FORMATS = ["static", "video", "web", "scrolly"];

function missing(field, where, how) {
  return new Error(
    `the retained proposal for ${where} records no ${field} — ${how} ` +
      "Nothing here guesses it: what the journalist retained is what the beat is produced from.",
  );
}

/**
 * The retained proposal for one slot of a parsed `STORYBOARD.md`.
 *
 * @param {object} meta    `parseStoryboard(text).meta`
 * @param {string} slotId  the slot's own id
 */
export function retainedFrom(meta, slotId) {
  const slots = Array.isArray(meta?.slots) ? meta.slots : [];
  const slot = slots.find((entry) => String(entry?.id) === String(slotId));
  if (!slot)
    throw new Error(
      `no slot ${JSON.stringify(slotId)} in this storyboard — it records ` +
        `${slots.length ? slots.map((s) => JSON.stringify(String(s.id))).join(", ") : "no slot at all"}.`,
    );
  const where = `slot ${slotId}`;
  const format = String(slot.format ?? "").trim();
  if (!FORMATS.includes(format))
    throw missing("format", where, `expected one of ${FORMATS.join(", ")}, got ${JSON.stringify(slot.format ?? null)}.`);
  const kind = String(slot.interaction ?? "").trim();
  if (!kind)
    throw missing("interaction", where, "the catalogue files one kind per medium/format pair, and gate 2 records which was accepted.");
  const grounding = String(meta?.grounding ?? "").trim();
  if (!grounding)
    throw missing("grounding", where, "the claim was never grounded at G1.");
  return {
    slotId: String(slotId),
    proves: slot.proves ?? null,
    intent: slot.intent ?? null,
    language: meta?.language ?? null,
    medium: slot.medium,
    format,
    size: slot.size ?? null,
    type: slot.chosen ?? null,
    claim: { shape: String(meta?.claimShape ?? "none").trim().toLowerCase(), grounding },
    interaction: { kind, promise: slot.interactionPromise ?? null },
  };
}

/**
 * The retained proposal for one slot of a story on disk.
 *
 * @param {string} storyDir
 * @param {string} slotId
 * @param {{ parseStoryboard: (text: string) => { meta: object } }} deps
 */
export function readRetained(storyDir, slotId, { parseStoryboard } = {}) {
  if (typeof parseStoryboard !== "function")
    throw new Error(
      "readRetained needs { parseStoryboard } injected — `shared/` is shipped without `skills/` " +
        "beside it, so the trunk may not import `storyboard/scripts/gate-contract.mjs` itself " +
        "(skills/map-beat/test/the-trunk-stands-alone.test.ts).",
    );
  const path = join(storyDir, "STORYBOARD.md");
  if (!existsSync(path))
    throw new Error(
      `No STORYBOARD.md at ${path}. Gate 2 is where a proposal is retained; run storyboard's own ` +
        "exchange and let the journalist close it before producing a beat.",
    );
  return retainedFrom(parseStoryboard(readFileSync(path, "utf8")).meta, slotId);
}

/**
 * The retained proposal of a CATALOGUE beat, reconstructed from its own `BRIEF.md`.
 *
 * Exactly one of the 160 proofs has a `STORYBOARD.md`, and the other 159 are nevertheless real
 * retained proposals: the front matter pins `format`, `size`, `type` and `grounding`, and the
 * catalogue supplies the `interaction` for that `medium`/`format` pair. Same typed object; only
 * the source differs.
 *
 * @param {string} beatDir
 * @param {{ catalogueInteraction: (medium: string, format: string) => Interaction }} deps
 */
export function retainedFromBrief(beatDir, { catalogueInteraction } = {}) {
  if (typeof catalogueInteraction !== "function")
    throw new Error(
      "retainedFromBrief needs { catalogueInteraction } injected — the visual catalogue lives in " +
        "`skills/storyboard/references/`, and the trunk may not reach into `skills/`.",
    );
  const path = join(beatDir, "BRIEF.md");
  if (!existsSync(path)) throw new Error(`No BRIEF.md at ${path}.`);
  const record = parseBriefFrontMatter(readFileSync(path, "utf8"));
  if (!record)
    throw new Error(
      `${path} has no front matter, so it pins no format, type or grounding. A beat's front matter ` +
        "is where its retained proposal is recorded when no storyboard holds one.",
    );
  const where = path;
  const format = String(record.format ?? "").trim();
  if (!FORMATS.includes(format))
    throw missing("format", where, `expected one of ${FORMATS.join(", ")}, got ${JSON.stringify(record.format ?? null)}.`);
  const medium = String(record.medium ?? "chart").trim();
  const grounding = String(record.grounding ?? "").trim();
  if (!grounding)
    throw missing(
      "grounding",
      where,
      "the three verdicts require three different things of a beat's precision — `supported` " +
        "requires the claim's own datum, `unverifiable` forbids it, `overridden` makes the " +
        "exactness note mandatory — so there is no safe default to fall back on.",
    );
  return {
    slotId: record.slot ?? null,
    proves: record.proves ?? null,
    intent: record.intent ?? null,
    language: record.language ?? null,
    medium,
    format,
    size: record.size ?? null,
    type: record.type ?? null,
    claim: { shape: String(record.claimShape ?? "none").trim().toLowerCase(), grounding },
    interaction: catalogueInteraction(medium, format),
  };
}
