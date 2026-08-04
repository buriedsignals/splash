// core/walk.ts — the journalist's confirmed walk, as an ENTRANCE ORDER.
//
// Sub-project ④ for the chart track. A bar video's bars enter in reading order
// (BarChart's `stagger(p, i, …)`) whatever the confirmed walk says, so a plan the journalist
// wrote and validated changed nothing on screen — the same defect map-native's reveals had.
//
// PURE, and shared, for the reason every other core/ helper here is: one behaviour, unit-tested
// without rendering, rather than a near-copy per component.

/** The shape a brief beat arrives in (lib/core/production-brief.ts's BriefBeat, narrowed to what
 *  an order needs). `x` is a line's axis value, `category` a bar's category — the two anchors
 *  chart-native itself validates against (chart-story.ts's narrativeBeatErrors). */
export type WalkBeat = { x?: string; category?: string };

/**
 * WHICH POSITION each subject enters at, given the chart's own anchor values in data order.
 *
 * With no walk the position IS the index, so a chart nobody wrote a storyboard for is
 * byte-identical to before — the invariant this whole sub-project is bounded by.
 *
 * With a walk: the subjects it names come FIRST, in the walk's own order; everything else
 * follows, keeping its data order among itself. Same editorial choice as the map reveals — the
 * walk leads, the rest lands as the closing picture — and made here for the same reason: an
 * order the reader cannot see is not an order.
 *
 * An anchor the chart does not carry is IGNORED rather than shifting everyone by one. It cannot
 * reach here in a real run — narrativeBeatErrors refuses an unknown anchor by name, loudly,
 * before production — so treating it as a hole would trade a loud refusal upstream for a quiet
 * scramble downstream.
 *
 * The result is always a PERMUTATION of 0..n-1: no subject starved, none doubled.
 */
export function walkPositions(
  anchors: string[],
  beats: readonly WalkBeat[] | undefined,
): number[] {
  // DEDUPED: a walk that names the same subject twice (legal — a scrolly may return to a point)
  // would otherwise put one index in the order twice and leave another with no position at all,
  // turning the result into something that is not a permutation. First mention wins, which is
  // the position the reader meets it at.
  const walked: number[] = [];
  const seen = new Set<number>();
  for (const b of beats ?? []) {
    const i = anchors.indexOf(String(b.category ?? b.x ?? ""));
    if (i >= 0 && !seen.has(i)) {
      seen.add(i);
      walked.push(i);
    }
  }
  if (!seen.size) return anchors.map((_, i) => i);
  const order = [...walked, ...anchors.map((_, i) => i).filter((i) => !seen.has(i))];
  const pos = new Array<number>(anchors.length);
  order.forEach((subjectIndex, position) => {
    pos[subjectIndex] = position;
  });
  return pos;
}
