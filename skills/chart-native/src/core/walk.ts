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
import { entranceOf, chartWalk, type EntranceSchedule } from "./chart-walk";

export type WalkBeat = { x?: string; category?: string };

/**
 * THE WALK AS A COMPONENT CONFIG CARRIES IT — anchor, role and the journalist's SENTENCE.
 *
 * Declared once here rather than copied into each anchored type's Config. `BarChart` learned why
 * the hard way: its own copy left `text` out, so the caption stage was handed beats with no words
 * and the video showed none of the sentences the journalist had written. Six more copies would be
 * six more chances to make the same omission.
 */
export type ConfigWalkBeats = readonly {
  x?: string;
  category?: string;
  role?: string;
  text?: string;
}[];

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
export const BAR_ENTRANCE = entranceOf("bar");

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
 * ★ IT WORKS IN BEAT SPACE, and two earlier versions did not. The first asked which SUBJECT was
 * entering and then indexed the BEATS array with it — two different spaces, so a sentence landed
 * over the wrong bar. The second resolved each beat's subject through `config.rows`, which is not
 * the order a component that SORTS actually renders — same wrong bar, one layer down, and only a
 * rendered frame could show it.
 *
 * Now there is nothing to resolve: every anchored type permutes its entrance so that beat k's
 * subject enters at position k (`walkEntryOrder`), so the k-th window is the k-th sentence.
 *
 * Returns `null` when there is no walk, which keeps a video nobody storyboarded byte-identical.
 * An EMPTY text yields null rather than an empty band: `produce` already refuses to build a walk
 * whose claims are unwritten (`unauthoredBeats`), so a blank here can only come from a
 * hand-authored spec — and an empty caption box is a worse answer than none.
 */
export type CaptionClock =
  /**
   * The type's own per-subject entrance, and how many subjects share it.
   *
   * ★ NO ANCHORS. Beat k's subject enters at position k — `walkEntryOrder` guarantees it, and
   * every anchored type now permutes. So the window opens at `start + k * step`, and the caption
   * never re-derives a subject index. The version that did was wrong twice over: it read
   * `config.rows`, which is not the order a component that sorts actually renders, and it needed
   * to know whether the type permuted at all.
   */
  | { grain: "entrance"; entrance: EntranceSchedule; count: number }
  /** No per-subject entrance to sit on: the beats share the timeline in equal parts, in the order
   *  the journalist wrote them. A stepped video in the plainest sense — the step carries the
   *  argument and the clock turns the page. */
  | { grain: "sequenced" };

export function captionAt(
  beats: readonly { x?: string; category?: string; text?: string }[] | undefined,
  clock: CaptionClock,
  progress: number,
): { text: string; index: number } | null {
  if (!beats?.length) return null;
  if (clock.grain === "sequenced") {
    // Equal segments, clamped: progress 0 reads the first sentence and progress 1 the last.
    const k = Math.min(
      beats.length - 1,
      Math.max(0, Math.floor(progress * beats.length)),
    );
    const t = beats[k]?.text?.trim();
    return t ? { text: t, index: k } : null;
  }
  const start = clock.entrance.start;
  const step = clock.entrance.step(Math.max(1, clock.count));
  let active = -1;
  let bestBegin = -Infinity;
  beats.forEach((_, k) => {
    const begin = start + k * step;
    if (begin <= progress && begin >= bestBegin) {
      bestBegin = begin;
      active = k;
    }
  });
  // Before the first window opens, the opening beat is already the one being announced — a frame
  // with no sentence is not something the journalist asked for.
  if (active < 0) active = 0;
  const text = beats[active]?.text?.trim();
  return text ? { text, index: active } : null;
}

/**
 * ★ THE ENTRANCE ORDER OF AN ANCHORED TYPE — the walk leads, the rest follows.
 *
 * Measured on the first rendered proof of a non-bar walk (lollipop, 2026-08-06): the sentences
 * played in the DATA's order, not the journalist's — their `establish` beat second, their
 * `payoff` first — because only `bar` permuted its entrance. A walk whose steps arrive out of
 * order is not a walk, so every anchored type permutes now, through this one helper rather than
 * six copies of BarChart's four lines.
 *
 * ★ THE LABELS MUST BE THE ONES THE COMPONENT ACTUALLY STAGGERS OVER. The same render proof
 * caught the second half of it: a lollipop's geometry SORTS its rows by value, so a permutation
 * built from `config.rows` addressed positions the component never used and the caption sat on
 * the wrong subject anyway. Each component therefore hands its own laid-out labels here.
 *
 * The result is the invariant everything else rests on: **beat k's subject enters at position
 * k**. That is what lets a caption ask "which step is it now" without re-deriving any anchor —
 * see `captionAt`'s anchored clock.
 *
 * With no walk it returns the identity, so a chart nobody storyboarded is byte-identical.
 */
export function walkEntryOrder(
  /** The subjects' labels IN THE ORDER THE COMPONENT LAYS THEM OUT (after any sort). */
  laidOutLabels: readonly string[],
  beats: readonly WalkBeat[] | undefined,
): (i: number) => number {
  if (!beats?.length) return (i) => i;
  const order = walkPositions([...laidOutLabels], beats);
  return (i) => order[i] ?? i;
}

/**
 * ★ THE STEPPED FRAME — what a video shows at this progress, for a type that stages like a scrolly.
 *
 * Rémy, after watching the first stepped bar video (2026-08-06): *« le stepped devrait avoir le
 * même rendu qu'un scrolly, juste en format vidéo »*. He was right, and the scrolly is where this
 * staging was already settled — `ScrollyChart`'s bar branch draws every bar (`progress={1}`) and
 * accents the ACTIVE beat's subject, step by step. What the video did instead was race the bars in
 * while a fixed accent stayed put, so the closing sentence pointed at another subject. That is not
 * a polish note; it is a caption asserting something about the wrong bar.
 *
 * So: the chart stands COMPLETE, the timeline is cut into equal steps, and each step accents the
 * subject its sentence is about. Time replaces scroll, and nothing else changes.
 *
 * Returns `null` when there is no walk, so a video nobody storyboarded is byte-identical.
 */
export function steppedFrame(
  nativeType: string,
  config: {
    rows?: readonly Record<string, unknown>[];
    beats?: readonly WalkBeat[];
  },
  progress: number,
): { chartProgress: number; accent: Record<string, unknown> } | null {
  const walk = chartWalk(nativeType);
  if (walk?.grain !== "accent" || !walk.accent || !config.beats?.length)
    return null;
  const beats = config.beats;
  const k = Math.min(
    beats.length - 1,
    Math.max(0, Math.floor(progress * beats.length)),
  );
  const subject = String(beats[k]?.category ?? beats[k]?.x ?? "");
  const accent: Record<string, unknown> = {};
  if (walk.accent.by === "label") accent[walk.accent.prop] = subject;
  else {
    // The row's own position. Safe for the index-addressed types because their mapper pins the
    // display sort OFF when a walk is present (`resolveBarSort`), so rendered order IS data
    // order — the sortedIndex the scrolly's own story beats carry.
    // `anchorField` names the CONFIG key that holds the COLUMN name (`catField: "region"`), not
    // the column itself — one indirection, and forgetting it silently accents nothing at all.
    const column = String(
      (config as Record<string, unknown>)[walk.anchorField ?? ""] ?? "",
    );
    const i = (config.rows ?? []).findIndex(
      (r) => String(r[column] ?? "") === subject,
    );
    if (i >= 0) accent[walk.accent.prop] = i;
  }
  // COMPLETE from the first frame, as a scrolly is when the reader arrives at it.
  return { chartProgress: 1, accent };
}
