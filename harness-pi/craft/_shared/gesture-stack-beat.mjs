// The Node half every Stack gesture kit's render-beat.mjs shares (static, web, video, scrolly): read the beat, hold
// the storyboard and the shared guards, build the family model, read the claim, and run the gesture staging with
// the SPLASH_GESTURE_REPAIR=1 repair loop. The bar kits' render-beat flow, once for three types. Node only: the
// browser-safe parts stay in gesture-family-stack.mjs.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { stackFromBeat } from "./gesture-family-stack.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, assertNumbers, errorText, importBeat, legibleFormat, rowFacts, runCheck } from "./guards.mjs";

/** The fields each variant's beat.mjs must export (CONTRACT.md lists them). */
export const REQUIRED = {
  "stacked-bar": ["eyebrow", "rows", "parts", "gestures", "format", "title", "limits", "source", "alt", "check"],
  "diverging-stacked-bar-likert": ["eyebrow", "rows", "left", "right", "gestures", "format", "title", "limits", "source", "alt", "check"],
  "waterfall-bridge": ["eyebrow", "opening", "steps", "gestures", "format", "title", "limits", "source", "alt", "check"],
};

export const refuse = (field, message, fix) => {
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  console.log(`REFUSED — ${field}: ${message}${hint}`);
  process.exit(1);
};

const fail = (error) => {
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
};

/** STORYBOARD.md's front matter, two folders up from the beat. */
export function front(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

/**
 * The beat, guarded and modelled: importBeat → applyStoryboard → REQUIRED → the family model → the values guards
 * → check(). Every failure prints REFUSED with the field to change and exits.
 */
export async function loadStackBeat(here, variant) {
  const beat = await importBeat(here).catch(fail);
  try {
    applyStoryboard(beat, here);
    const missing = REQUIRED[variant].filter((key) => beat[key] === undefined);
    if (missing.length)
      throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
    const stack = stackFromBeat(beat, variant);
    const values = stack.marks.map((m) => m.value);
    assertNumbers(stack.marks.map((m) => [m.name, m.value]));
    beat.format = legibleFormat(values, beat.format);
    assertLegibleLabels(values, beat.format);
    runCheck(beat);
    assertNoAggregates(stack.names, here);
    const wholes = stack.names.map((b) => stack.whole(b));
    assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, ...wholes, ...(stack.closing ? [stack.closing.value, stack.closing.value - stack.opening.value] : [])], variant === "waterfall-bridge" ? "steps" : "segments");
    stack.conservation();
    const field = front(here);
    const claim = {
      takeaway: field("takeaway") ?? [beat.title].flat()[0],
      subject: field("subject"),
      comparison: field("comparison"),
      entity: field("claimEntity"),
      versus: field("claimVersus"),
      unit: beat.unit,
      facts: rowFacts(here),
    };
    return { beat, stack, claim };
  } catch (error) {
    fail(error);
  }
}

/**
 * Stage the beat's gestures: `stage(gestures)` validates and schedules; a GestureRefusal prints REFUSED, or with
 * SPLASH_GESTURE_REPAIR=1 its fix is applied and the list staged again, at most 12 times.
 */
export function stageWithRepair(stage, gestures) {
  const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
  let list = gestures;
  for (let step = 0; ; step++) {
    try {
      return { ...stage(list), gestures: list };
    } catch (error) {
      if (!(error instanceof GestureRefusal)) fail(error);
      if (!REPAIR || step >= 12) refuse(error.field, error.message.slice(error.field.length + 2), error.fix);
      console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
      list = applyFix(list, error.fix);
    }
  }
}

/** The words a plate prints, per register, for the direction's composition. */
export function textPerRegister(beat, stack, notes = []) {
  const limits = [beat.limits].flat();
  return {
    display: [beat.title].flat().join(" "),
    eyebrow: beat.eyebrow,
    body: `${limits.join(" ")} ${beat.source}`,
    axis: [beat.unit ?? "", ...(stack.anchorMode === "running" ? stack.names : [])].join(" "),
    annot: [...stack.names, ...stack.parts, ...notes].join(" "),
    value: stack.marks.map((m) => beat.format(m.value)).join(" "),
  };
}
