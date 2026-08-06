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

/**
 * THE BAR ENTRANCE SCHEDULE — the one BarChart drives its bars from, named here so a caption can
 * read it instead of redefining it.
 *
 * Exported as data rather than duplicated as numbers: a caption computed from a second set of
 * windows is a second clock, and a second clock is a sentence sitting over the wrong bar. That is
 * not hypothetical — it is what route-story.ts's header documents at length, from a caption that
 * followed a confirmed arc while the camera kept following the geographic walk.
 */
export const BAR_ENTRANCE = {
  start: 0.18,
  step: (count: number) => 0.5 / count,
  span: 0.35,
} as const;

/**
 * WHICH BEAT a caption should name at this progress — the subject whose entrance has most
 * recently BEGUN, in the journalist's order.
 *
 * Most recently begun, not nearest to finishing: a caption names what the reader's eye has just
 * been drawn to. Clamped at both ends, so progress 0 reads the first beat and progress 1 the
 * last — never -1, never past the end.
 *
 * `entryOrder` is `walkPositions`' output: position i tells where subject i enters. The answer is
 * a SUBJECT index, which is what a caption needs to find its beat.
 */
export function activeBeatAt(
  progress: number,
  entryOrder: readonly number[],
  count: number,
): number {
  if (count <= 0 || !entryOrder.length) return -1;
  const start = BAR_ENTRANCE.start;
  const step = BAR_ENTRANCE.step(count);
  let active = -1;
  let bestBegin = -Infinity;
  for (let subject = 0; subject < entryOrder.length; subject++) {
    const begin = start + (entryOrder[subject] ?? subject) * step;
    if (begin <= progress && begin >= bestBegin) {
      bestBegin = begin;
      active = subject;
    }
  }
  // Before the first window opens nothing has begun — the caption still names the opening beat,
  // because a title card with no sentence is a frame the journalist did not ask for.
  if (active < 0) {
    const first = entryOrder.indexOf(Math.min(...entryOrder));
    return first < 0 ? 0 : first;
  }
  return active;
}

/**
 * THE SENTENCE ON SCREEN at this progress — the journalist's own words, or nothing.
 *
 * Pure, so the "which words" decision is unit-testable without a browser and the video stage
 * that shows them stays a thin renderer. Returns `null` when there is no walk, which is what
 * keeps a video nobody storyboarded byte-identical to before.
 *
 * A beat with an EMPTY text yields null rather than an empty band: `produce` already refuses to
 * build a walk whose claims are unwritten (`unauthoredBeats`), so an empty string here can only
 * come from a hand-authored spec — and an empty caption box is a worse answer than none.
 */
export function captionAt(
  beats: readonly { text?: string }[] | undefined,
  entryOrder: readonly number[],
  progress: number,
): { text: string; index: number } | null {
  if (!beats?.length) return null;
  const i = activeBeatAt(progress, entryOrder, beats.length);
  if (i < 0) return null;
  const text = beats[i]?.text?.trim();
  return text ? { text, index: i } : null;
}
