// WHICH NATIVE CHART TYPES CANNOT BE SHIPPED AS A VIDEO TODAY — and, for each, the sentence a
// journalist reads instead of meeting a dead end.
//
// WHY THIS FILE EXISTS. Every type listed here renders a static and an interactive chart
// perfectly well; the video is the form that fails, and it fails INSIDE produce, after the mp4
// has already been encoded — the producer's own reveal contract (scripts/snap-video.mjs) refuses
// the file it just wrote. So the fault is per-(type, format), which is the one axis the producer
// manifest's `deferred` flag cannot express: `deferred` takes a TYPE out of every format at once,
// and would delete three working forms to close one broken one.
//
// The consequence before this list existed was measured on 2026-07-28 (the motion + narrative
// grid pass, docs/splash/motion-narrative-grid-2026-07-28.md): the brain offered all four of
// these video forms CLEAN — no mark, nothing to warn a journalist — and produce then refused every
// one of them. That is the worst of the four quadrants that pass names: a form on the table that
// cannot be built is a trap, and the journalist only finds out after choosing it.
//
// HOW IT IS ENFORCED. lib/loop/assemble/index.ts reads this map in chart-native's `supports` /
// `declines` pair, which is the ONE place the loop decides what it can compose a spec for. From
// there the same sentence reaches both readers that matter, because both already resolve through
// that table: lib/brain/eligibility.ts's `buildabilityMark` puts it in the offer, and
// lib/loop/produce.ts refuses the choice with it. The journalist reads one wording, once.
//
// THIS LIST MUST SHRINK. Each entry is a motion defect with a known measurement, not a decision
// about what a newsroom needs — every one of these charts is a legitimate thing to animate.
// Removing an entry is a one-line change, and the thing that earns it is the render measurement
// going green, not an opinion.

/**
 * type id → why its VIDEO cannot ship, in the journalist's words.
 *
 * The wording says what will not happen and what to do instead — never which guard fired, and
 * never a percentage. A journalist choosing a form is not debugging the renderer.
 */
export const VIDEO_UNREACHABLE_TYPES: Readonly<Record<string, string>> = {
  // MEASURED: snap-video's still-match check, twice each, same figures both times — the mp4's
  // reviewed frame and its final frame both drift past the 1% tolerance (population pyramid
  // 1.12% / 1.23%, treemap 2.22% / 2.29%, waffle 1.19% / 1.30%). All three are dense-tile
  // shapes: hundreds of small hard-edged rectangles, which is exactly the picture video
  // compression cannot hold to a still's precision. The still a human approves and the video
  // that ships are therefore not the same picture.
  pyramid:
    "a population pyramid cannot be shipped as a video yet: the frame you would be shown to " +
    "approve it and the video that would actually go out are not the same picture — the many " +
    "small bars do not survive video compression cleanly. Publish it as a static or " +
    "interactive chart, which are unaffected",
  treemap:
    "a treemap cannot be shipped as a video yet: the frame you would be shown to approve it " +
    "and the video that would actually go out are not the same picture — the tiles' edges do " +
    "not survive video compression cleanly. Publish it as a static or interactive chart, " +
    "which are unaffected",
  waffle:
    "a waffle chart cannot be shipped as a video yet: the frame you would be shown to approve " +
    "it and the video that would actually go out are not the same picture — the grid of small " +
    "squares does not survive video compression cleanly. Publish it as a static or " +
    "interactive chart, which are unaffected",
  // MEASURED: snap-video's progression check — the mid-point frame is already the final frame
  // (0.06 away from it, against a 0.15 threshold, while the first frame sits 1.72 away). The
  // reveal finishes in the first half and the rest of the file is a held image.
  "dot-strip":
    "a dot strip plot cannot be shipped as a video yet: the animation is over before the video " +
    "is half-way through, so most of the clip is a still image and there is no reveal left to " +
    "watch. Publish it as a static or interactive chart, which are unaffected",
};

/** Can chart-native ship this (type, format) pairing? Only the video form is ever restricted —
 *  every listed type's static and interactive forms are untouched, which is the whole reason the
 *  restriction is expressed per-format and not as a `deferred` type. */
export function chartNativeSupports(
  nativeType: string,
  format?: string,
): boolean {
  return !(format === "video" && nativeType in VIDEO_UNREACHABLE_TYPES);
}

/** The sentence for a declined pairing, or undefined when the pairing is fine. */
export function chartNativeDeclineReason(
  nativeType: string,
  format?: string,
): string | undefined {
  return format === "video" ? VIDEO_UNREACHABLE_TYPES[nativeType] : undefined;
}
