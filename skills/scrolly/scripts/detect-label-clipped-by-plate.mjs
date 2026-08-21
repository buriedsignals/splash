/** The guard this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`.
 *
 *  It imports nothing, for the same reason `decollide.mjs` does not: the place this decision has to
 *  be MADE is inside a component a browser bundles, where the layout is decided, and a module that
 *  reaches a native rasteriser cannot be called from there. */
export const GUARDS = ["labelsClippedByPlate"];

/** Half a pixel, for the reason `decollide`'s own `MOVED_AT` is: a run half a pixel past the clip
 *  is not a truncated word, and a caller with no canvas measures text by an approximation good to
 *  rather worse than that. A guard that reddens on the measurer's own noise is a guard someone
 *  turns off. */
const CLIP_TOLERANCE_PX = 0.5;

/** How far past an edge, printed the way a caller has to read it — one decimal, because the number
 *  is the difference between a descender shaved and half a country's name gone. */
function overrun(px) {
  return `${Math.round(px * 10) / 10}px`;
}

/** A LABEL THE PLATE CLIPS IS A LABEL NOBODY READS, AND NOTHING SAID SO.
 *
 *  ROUND-FIVE FINDING T4 (the second half): a map beat draws its labels inside the plate's own clip
 *  path, because a label that escaped the plate would float over the frame's ground with no
 *  geography under it. A clip is SILENT by construction — nothing throws, nothing renders red, the
 *  run is simply cut. `stress-t-europe-recycling`'s first render put Macedonia's label south-east of
 *  it, over the Aegean; at that plate's scale the run passed the plate's right edge and the delivered
 *  frame read "Mac…" and "18.4". The beat's author found it by LOOKING at the render, wrote the
 *  check by hand inside their own component, and named the absence in their maintainer notes. This
 *  is that check, in the skill, so the next beat does not have to find it the same way.
 *
 *  WHAT IT MEASURES: boxes, in the frame's own pixels, against the plate's own box. Each label is
 *  the box the run WILL occupy once drawn — the caller measures its own text, because only the
 *  component knows the family and the size it is about to draw in — and the plate is the rectangle
 *  the clip path is cut to. A label is clipped when any edge of its box falls outside the plate's,
 *  and the reason names WHICH edge and by how much: a clip that takes two pixels off a descender and
 *  a clip that removes half a country's name are the same silence, and a caller deciding whether to
 *  re-bake an anchor needs the number, not a boolean.
 *
 *  Every label is reported, not the first, because anchors are moved in a bake and a re-bake that
 *  fixes one and breaks another should say so in one pass rather than two. An empty array means
 *  every run fits.
 */
export function labelsClippedByPlate(labels, plate) {
  const outside = [];
  for (const label of labels) {
    const edges = [];
    if (plate.left - label.left > CLIP_TOLERANCE_PX) edges.push(`${overrun(plate.left - label.left)} past the left edge`);
    if (label.right - plate.right > CLIP_TOLERANCE_PX) edges.push(`${overrun(label.right - plate.right)} past the right edge`);
    if (plate.top - label.top > CLIP_TOLERANCE_PX) edges.push(`${overrun(plate.top - label.top)} above the top edge`);
    if (label.bottom - plate.bottom > CLIP_TOLERANCE_PX) edges.push(`${overrun(label.bottom - plate.bottom)} below the bottom edge`);
    if (edges.length === 0) continue;
    outside.push(
      `${label.what} is clipped by the plate: ${edges.join(", ")}. It occupies ` +
        `${Math.round(label.left)}..${Math.round(label.right)} x ${Math.round(label.top)}..${Math.round(label.bottom)}, ` +
        `and the plate is ${Math.round(plate.left)}..${Math.round(plate.right)} x ${Math.round(plate.top)}..${Math.round(plate.bottom)}. ` +
        `Move its anchor in bake-plate.mjs and re-bake — a clipped label is silent, which is why this is not.`,
    );
  }
  return outside;
}
