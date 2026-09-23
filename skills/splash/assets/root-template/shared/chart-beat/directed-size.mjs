// twin/shared/chart-beat/directed-size.mjs
//
// A DIRECTED STATIC BEAT DRAWS AT THE SIZE ITS SLOT PINNED, and for a long time it drew at one.
//
// Two lineages grew side by side. `render.mjs` — the catalogue's own, un-directed — takes `--size`, spends
// `sizeFor`, asks `formForSize` whether the type may enter a tall frame at all, and verifies the delivered
// file against what gate 2c pinned. `render-directions.mjs` — the one a journalist actually receives, the one
// that reads the run's art direction — hardcoded `width: 960, height: 540, scale: 2` in all thirty-two of
// them. So the size-aware renderer existed and was never the one handed over: measured 2026-09-23, a story's
// static chart could be produced in landscape and in nothing else, while its video did all three.
//
// This is the half of `render.mjs` the directed lineage was missing, in one place rather than thirty-two.

import { sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The three this toolchain exports, in the order R2 names them. */
export const SIZES = ["landscape", "portrait", "square"];

/**
 * The size on the command line, or landscape.
 *
 * The DEFAULT is landscape and not "whatever the beat was pinned at", because this runner draws every
 * direction of a run and a journalist asking for no size is asking for the article's own shape. An unknown
 * name is refused rather than rounded to the nearest one.
 */
export function exportSizeFromArgv(argv = process.argv.slice(2)) {
  const at = argv.indexOf("--size");
  if (at === -1) return "landscape";
  const size = argv[at + 1];
  if (!SIZES.includes(size))
    throw new Error(
      `--size takes one of ${SIZES.join(", ")}, got ${JSON.stringify(size)}. It is chosen at gate 2c and ` +
        "recorded on the slot in STORYBOARD.md; it is not a default anything may fall back to.",
    );
  return size;
}

/**
 * The frame this lineage draws in, for a size.
 *
 * HALF THE EXPORT SIZE AT SCALE 2, which is what every directed runner already did for landscape
 * (960 x 540 at 2 delivers 1920 x 1080) and what the rest of this lineage's tuning was measured against.
 * The un-directed `render.mjs` draws 1:1 instead; the two agree on the delivered pixels and differ on what a
 * `strokeWidth` of 1 means, which is a migration this file does not make on its own.
 */
export function directedFrame(size) {
  const row = sizeFor(size);
  return { width: row.width / 2, height: row.height / 2, scale: 2 };
}

/** `still` in landscape, `still-portrait` and `still-square` beside it — so one beat's three sizes can sit
 *  in one folder without a run overwriting the one before it. */
export function nameAtSize(id, size) {
  return size === "landscape" ? id : `${id}-${size}`;
}

/** The `type:` a beat's own BRIEF.md declares, or null when it carries no front matter. */
export function beatTypeOf(dir) {
  const brief = join(dir, "BRIEF.md");
  if (!existsSync(brief)) return null;
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(brief, "utf8"));
  if (!front) return null;
  return /^type:\s*(\S+)\s*$/m.exec(front[1])?.[1] ?? null;
}

/**
 * Whether this beat's own type may be drawn at this size — `type-at-size.mjs`'s question, asked with the
 * type the beat itself declares rather than one passed in by hand.
 *
 * A beat with no `type:` is not refused: it is told that nothing can be checked for it, because a refusal
 * for a missing declaration is a different conversation from a refusal for a measured limit.
 */
export function assertBeatMayEnter(dir, size, { what = "this beat" } = {}) {
  if (size === "landscape") return { type: beatTypeOf(dir), verdict: "as-is" };
  const type = beatTypeOf(dir);
  if (!type)
    throw new Error(
      `${what} declares no \`type:\` in its BRIEF.md front matter, so nothing can say whether it may be ` +
        `drawn at ${size}. Declare the type, or render at landscape.`,
    );
  const form = assertTypeMayEnter(type, size, { what });
  /**
   * A VERDICT OF `transpose` IS AN INSTRUCTION, AND NOTHING WAS CARRYING IT OUT.
   *
   * `assertTypeMayEnter` throws on `refuse` and returns on `transpose` — so a band-scale type sailed
   * through and the component drew its columns into a 540 x 960 frame anyway. Measured 2026-09-23 on the
   * validated ranking beat at portrait: ten columns squeezed to a finger's width, the names printed through
   * each other — « ChineÉtats-UnisInde », « CoréeAllemagne » — and « Corée du Sud » cut to « Corée du ».
   * `assertNoOverlappingText` did not fire: it is calibrated to refuse a plate where MOST of the ink
   * overlaps, and three collisions among twenty labels is not most.
   *
   * So the instruction is enforced here. A component that knows about forms asks `formForSize` itself and
   * draws rows where it is told to; one that does not cannot be handed a tall frame, and says so with the
   * sizes that do work — which is the offer R9 asks for in the same breath as the refusal.
   */
  if (form.verdict === "transpose" && !componentKnowsForms(dir))
    throw new Error(
      `${what} is a ${type}, and at ${size} that type has a twin FORM — rows running down the frame, every ` +
        `name horizontal on one line — not a stretched version of its columns. This beat's own ` +
        `Directed*.tsx never asks \`formForSize\`, so it would draw its columns into a tall frame: ten of ` +
        `them at a finger's width with the names printed through each other. Teach the component its row ` +
        `form (proof/static-bar-top-emitters-2024/TopEmittersColumns.tsx is the worked one), or render ` +
        `this beat at landscape, where it is accepted.`,
    );
  return { type, ...form };
}

/** Whether a beat's own directed component adapts its FORM to the size, rather than only its frame. */
function componentKnowsForms(dir) {
  let files;
  try {
    files = readdirSync(dir).filter((f) => /^Directed[A-Za-z0-9]*\.tsx$/.test(f));
  } catch {
    return false;
  }
  return files.some((f) => /\bformForSize\b/.test(readFileSync(join(dir, f), "utf8")));
}

export { sizeFor, stageFor };
