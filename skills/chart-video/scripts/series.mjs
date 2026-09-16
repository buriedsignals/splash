// twin/skills/chart-video/scripts/series.mjs
//
// THE TYPE-FAMILY MATHS A CHART VIDEO BEAT KEPT RE-TYPING — pure functions, nothing else.
//
// WHY THIS FILE EXISTS. The scaffold (`scaffold-video-beat.mjs`) removed the PLUMBING a new beat used to copy from the
// last worked example. The cold tests then measured what was left: `.superpowers/sdd/cold-test2-chart-friction.md`
// item 2 counted ~40 lines of TYPE-FAMILY arithmetic still hand-copied into an area/line beat — the fill outline from
// points, the "a word stands clear of the curve" check, the per-year counter texts measured and keyed, the crossing
// search. Every one of them was already written three times or more somewhere under `proof/video-*`. They are here,
// each with the beats it was harvested from.
//
// WHAT IS DELIBERATELY NOT HERE, and stays written per beat (the owner's doctrine limit): the ARGUMENT (what the beat
// proves, and the sentence a failed check throws), the GESTURES (which fields exist, their WINDOWS, which are LINEAR),
// the LAYOUT (where anything is seated, and what it is measured against) and the COMPOSITION (direction, colours,
// registers). There is no parameterised chart here, no component, and no config object that draws one. A function that
// would have to know a beat's subject to be useful did not qualify.
//
// WHY THE EASING PRIMITIVES ARE COPIED AND NOT IMPORTED. `skills/scrolly/assets/reveal.mjs` carries the same
// `clamp01`/`ease`/`lerp`, and 42 of the 44 beats under `proof/video-*` import them from there — a chart-video beat
// reaching into the scrolly skill, which `skills/splash/test/no-cross-skill-imports.test.ts` forbids a SKILL to do
// (a skill directory must be copy-pasteable on its own). So chart-video carries its own three lines; they are the same
// easeInOutQuad, and `series.test.ts` holds them to it.
//
// BROWSER-SAFE. `scene.mjs` imports this file and is run by the composition in Chrome as well as by the tests in Bun,
// so: no Node import, no global, no I/O.

// ═══ THE MOTION MECHANICS ═════════════════════════════════════════════════════════════════════════════════════════

/** Harvested from: every beat under `proof/video-*` (44 of 44 scenes). */
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** easeInOutQuad — a reading leaves and arrives calmly, and holds still in between. */
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export const lerp = (a, b, t) => a + (b - a) * t;

/** One decimal: what a path rounds its coordinates to, so a re-render is byte-stable. */
export const round1 = (v) => Math.round(v * 10) / 10;

/**
 * HOW FAR THE `k`-th OF `n` STAGGERED MOVES HAS GONE when the whole is at `t`: each move takes `share` of the whole
 * and they start evenly spread across the rest, so the last one starts as the first one ends minus the overlap.
 *
 * Harvested from: `video-bar-top-emitters-2024`, `video-connected-scatter-lowcarbon`, `video-heatmap-europe-electricity`,
 * `video-grouped-bar-wind-vs-solar` — and 22 more scenes carrying the same line (26 in all on 2026-09-16), plus
 * `video-cold2-world-population`, which had written it out again inline for its flying blocks.
 */
export const moveOf = (t, k, n, share = 0.35) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);

/**
 * THE FIELD ACCUMULATOR, MADE ONCE FOR A BEAT. Every scene under `proof/video-*` builds a field's value the same way:
 * one state per event, each event's CHANGE to the field run through the window that event gives it (shares of the
 * event's own duration), eased unless the field is linear. Only `windows` and `linear` are the beat's — they are its
 * gestures — so the beat declares those and takes the arithmetic from here.
 *
 * `progressOf` and `order` are handed in rather than imported: a skill may not import `#shared/chart-video/timing.ts`
 * (see the header), and a beat already has both.
 *
 * Harvested from: all 44 scenes under `proof/video-*`, byte-identical modulo the two tables — among them
 * `video-area-swiss-co2`, `video-line-swiss-co2`, `video-cold2-world-population`.
 *
 * @returns {(field: string, frame: number, states: object[], timing: object) => number}
 */
export function fieldAtOf({ order, progressOf, windows = {}, linear = new Set(), ease: easing = ease }) {
  if (!Array.isArray(order) || order.length === 0) throw new Error("fieldAtOf needs the event order");
  if (typeof progressOf !== "function") throw new Error("fieldAtOf needs progressOf(frame, event)");
  return function fieldAt(field, frame, states, timing) {
    let value = 0;
    order.forEach((event, i) => {
      const delta = states[i][field] - (i === 0 ? 0 : states[i - 1][field]);
      if (delta === 0) return;
      const [a, b] = windows[event]?.[field] ?? [0, 1];
      const t = clamp01((progressOf(frame, timing[event]) - a) / (b - a));
      value += delta * (linear.has(field) ? t : easing(t));
    });
    return value;
  };
}

// ═══ A SERIES DRAWN SO FAR ════════════════════════════════════════════════════════════════════════════════════════

/**
 * WHERE A CLOCK RUNNING 0 → 1 OVER A SERIES HAS REACHED: the last whole reading, and how far it stands toward the next.
 *
 * Harvested from: `video-area-swiss-co2`, `video-line-swiss-co2`, `video-cold-world-population`,
 * `video-cold2-world-population` (and, in its own shape, `video-bump-emitter-rank`).
 *
 * @returns {{ index: number, f: number }} `index` is the last whole reading, `f` ∈ [0, 1) the way toward `index + 1`.
 */
export function reachAlong(points, t) {
  if (!Array.isArray(points) || points.length === 0) throw new Error("reachAlong needs at least one point");
  const reach = clamp01(t) * (points.length - 1);
  const index = Math.min(Math.floor(reach), points.length - 1);
  return { index, f: reach - index };
}

/**
 * THE SERIES AS DRAWN AT THAT CLOCK: every reading up to the last whole one, plus the point interpolated toward the
 * next, so the tip moves smoothly rather than jumping from reading to reading.
 *
 * Harvested from: `video-area-swiss-co2`, `video-line-swiss-co2`, `video-cold-world-population`,
 * `video-cold2-world-population`.
 *
 * @param {Array<{x: number, y: number}>} points
 * @returns {{ index: number, f: number, top: Array<[number, number]>, tip: [number, number] }}
 */
export function drawnTo(points, t) {
  const { index, f } = reachAlong(points, t);
  const top = points.slice(0, index + 1).map((p) => [p.x, p.y]);
  if (index + 1 < points.length && f > 0) {
    const a = points[index];
    const b = points[index + 1];
    top.push([lerp(a.x, b.x, f), lerp(a.y, b.y, f)]);
  }
  return { index, f, top, tip: top.at(-1) };
}

/**
 * THE OPEN OUTLINE of a drawn series — `""` while fewer than two points stand, because a one-point path draws nothing
 * and an `M` alone is a defect a renderer swallows silently.
 *
 * Harvested from: `video-line-swiss-co2`, `video-bump-emitter-rank`, and the outline `video-area-swiss-co2` and
 * `video-cold2-world-population` draw over their own fill.
 */
export function polylinePath(top, round = round1) {
  if (!Array.isArray(top) || top.length < 2) return "";
  return `M${top.map((p) => `${round(p[0])} ${round(p[1])}`).join("L")}`;
}

/**
 * THE CLOSED SURFACE under a drawn series: down to the baseline at the first point, along the outline, back down at
 * the last. `""` while fewer than two points stand, for the same reason as `polylinePath`.
 *
 * Harvested from: `video-area-swiss-co2`, `video-cold-world-population`, `video-cold2-world-population`.
 */
export function areaPath(top, baseY, round = round1) {
  if (!Array.isArray(top) || top.length < 2) return "";
  const body = top.map((p) => `L${round(p[0])} ${round(p[1])}`).join("");
  return `M${round(top[0][0])} ${round(baseY)}${body}L${round(top.at(-1)[0])} ${round(baseY)}Z`;
}

// ═══ WHAT THE SERIES LEAVES ROOM FOR ══════════════════════════════════════════════════════════════════════════════

/**
 * THE TOP OF THE CURVE OVER A SPAN, in screen coordinates: the smallest `y` of every point standing between `from` and
 * `to`, widened by `pad` so a word does not sit a hair off a reading it overlaps. `Infinity` when the span holds no
 * point — nothing is there to collide with.
 *
 * Harvested from: `video-area-swiss-co2` (`highestUnder`), `video-cold-world-population` (`highestUnder`),
 * `video-cold2-world-population` (`highestOver`) — all three had written the same filter-and-max in data units and
 * then projected it; in screen units it is the same check and needs no scale.
 */
export function curveTopOver(points, from, to, pad = 3) {
  let top = Infinity;
  for (const p of points) if (p.x >= from - pad && p.x <= to + pad && p.y < top) top = p.y;
  return top;
}

/**
 * DOES A WORD STAND CLEAR OF THE CURVE? True when the curve, over the word's own width, stays BELOW the word's
 * bottom edge — screen `y` grows downward, so clear means the curve's top is greater than the word's floor.
 *
 * The beat still writes the sentence it throws and decides what `bottom` is (the baseline plus the register's descent,
 * plus whatever gap it wants); only the measurement is here.
 *
 * Harvested from: `video-area-swiss-co2` (the stock's gauge), `video-cold-world-population` (the counter),
 * `video-cold2-world-population` (the counter, and the crossing's name).
 */
export function standsClearOfCurve({ points, from, to, bottom, pad = 3 }) {
  return curveTopOver(points, from, to, pad) > bottom;
}

// ═══ WHAT A COUNTER CAN SAY ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * EVERY TEXT A COUNTER CAN SHOW, MEASURED ONCE AND KEYED. A value counting up cannot be measured in the browser, so
 * the build measures every text the counter will ever hold and the frame looks one up by key. Two items keying the
 * same text is refused: it is silent data loss, and the frame would show one year's text under another's key.
 *
 * Harvested from: `video-cold-world-population` and `video-cold2-world-population` (the running population),
 * `video-area-swiss-co2` (the stock at every year), `video-line-swiss-co2` (the tip), `video-bump-emitter-rank`
 * (the rank), `video-calendar-heatmap-geneva`, `video-connected-scatter-lowcarbon`, `video-gantt-top-ten-tenure` and
 * a dozen more (the count).
 *
 * @param items    what the counter steps through
 * @param keyOf    the key the frame will look a text up by — stringified
 * @param textOf   the measured text for that item, as the beat's own `measure(copy…, register)` returns it
 */
export function measuredTexts(items, keyOf, textOf) {
  const table = {};
  for (const item of items) {
    const key = String(keyOf(item));
    if (Object.hasOwn(table, key)) throw new Error(`two items key the counter's text ${JSON.stringify(key)}; one would hide the other`);
    table[key] = textOf(item);
  }
  return table;
}

/**
 * THE WIDEST OF A MEASURED TABLE, as drawn — `spread` is the allowance a drawn face takes over its measured width
 * (`DRAWN_WIDER` in a beat). What a layout reserves for a counter, so the column does not breathe as the value changes.
 *
 * Harvested from: the same beats as `measuredTexts`.
 */
export function widestOf(table, spread = 0) {
  const widths = Object.values(table).map((t) => t.width);
  if (widths.length === 0) throw new Error("widestOf was handed an empty table of texts");
  return Math.max(...widths) * (1 + spread);
}

// ═══ WHERE A SERIES MEETS A LEVEL ═════════════════════════════════════════════════════════════════════════════════

/**
 * WHERE A RISING SERIES FIRST REACHES A LEVEL — the first reading at or above it, the one before, and `t`, where the
 * DRAWN line (straight between readings) meets the level, as a share of the step between them. `null` when the series
 * never reaches it: the beat says what that means for its own claim.
 *
 * Harvested from: `video-cold-world-population` (8 billion, and the fractional year the ring is seated at),
 * `video-cold2-world-population` (8 billion), `video-area-swiss-co2` (the cumulative half, its midpoint year).
 *
 * @returns {{ index: number, at: any, before: any, t: number } | null}
 */
export function firstCrossing(series, level, valueOf = (d) => d) {
  const index = series.findIndex((d) => valueOf(d) >= level);
  if (index === -1) return null;
  const at = series[index];
  if (index === 0) return { index, at, before: null, t: 0 };
  const before = series[index - 1];
  const span = valueOf(at) - valueOf(before);
  return { index, at, before, t: span === 0 ? 0 : (level - valueOf(before)) / span };
}

/**
 * THE FIRST GAP IN A YEARLY SERIES, or `null` when every year follows the one before. A surface or a line drawn over a
 * gap invents the years between, so a beat of that family checks first — and throws its own sentence, which is why
 * this returns the gap instead of raising.
 *
 * Harvested from: `video-area-swiss-co2`, `video-cold-world-population`, `video-cold2-world-population`,
 * `video-gantt-top-ten-tenure`.
 *
 * @returns {{ before: any, after: any } | null}
 */
export function firstYearGap(readings, yearOf = (r) => r.year) {
  for (let i = 1; i < readings.length; i++) if (yearOf(readings[i]) !== yearOf(readings[i - 1]) + 1) return { before: readings[i - 1], after: readings[i] };
  return null;
}
