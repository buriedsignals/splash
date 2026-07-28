// image-native's ONE assembler — the journalist's own photographs plus the journalist's own
// authored beats, composed into the ImageStory the engine renders (skills/image-native/src/
// image-story.ts). Unlike chart-native/map-native, there is no data to re-derive a plan from:
// every word and every image already belongs to someone, so this assembler ZIPS the two
// declared lists together rather than measuring anything of its own.
//
// `sourcePassage` is never set (see image-story.ts's own comment on the field): the loop runs
// no vision matching between a photograph and an article passage, the caption IS the
// journalist's authored beat, and inventing a passage would give the anti-copy tripwire a
// reference nobody wrote for it to compare a caption against words it never came from.
import { fail, ok, type VerbResult } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import {
  checkImageConformance,
  type ImageStep,
  type ImageStory,
} from "../../../skills/image-native/src/image-story";

export function assembleImageNative(
  brief: ProductionBrief,
): VerbResult<unknown> {
  if (!brief.images)
    return fail(
      "invalid-request",
      "an image scrolly needs the journalist's own photographs declared with the run — " +
        "bring a photograph (with its alt text and credit) for each beat of the walk",
    );

  const beats = brief.beats ?? [];
  const frameCount = brief.images.frames.length;
  const beatCount = beats.length;
  if (frameCount !== beatCount)
    return fail(
      "invalid-request",
      `${frameCount} photograph${frameCount === 1 ? "" : "s"} declared but ` +
        `${beatCount} authored beat${beatCount === 1 ? "" : "s"} — one caption per ` +
        "photograph, and the caption is the journalist's own beat, so the two counts must agree",
    );

  // The arc's peak (spec's own "single Peak", lib/core/claim-arc.ts's `turn` role) is the
  // representative frame when the journalist marked one; absent a marked turn, the first frame
  // stands in, exactly as ImageStory's own doc comment on `keyFrame` assumes.
  const turnIndex = beats.findIndex((b) => b.role === "turn");
  const keyFrame = turnIndex >= 0 ? turnIndex : 0;

  const frames: ImageStep[] = brief.images.frames.map((f, i) => ({
    id: `f${i + 1}`,
    frameRef: f.frameRef,
    // The journalist's own authored beat — never a derivation. The photographs are theirs,
    // the words are theirs.
    caption: beats[i]!.text,
    alt: f.alt,
    credit: f.credit,
  }));

  const story: ImageStory = {
    title: brief.angle.confirmedTakeaway,
    description: brief.angle.altInsight,
    source: {
      name: brief.attribution,
      ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
    },
    // Absolute — the spine writes specs to a tmp config, so a relative imageDir would resolve
    // against that tmp directory instead of where the photographs actually live.
    imageDir: brief.images.dir,
    frames,
    keyFrame,
    fit: "canvas-frame",
  };

  // The engine's own floor/cap (3-6 frames for a scrolly) is enforced by its own conformance
  // check, not re-derived here — a refusal that reaches this window reads the engine's exact
  // sentence, never a second wording of the same rule.
  const violations = checkImageConformance(story, { format: "scrolly" });
  if (violations.length) return fail("invalid-request", violations.join(" — "));

  return ok(story);
}
