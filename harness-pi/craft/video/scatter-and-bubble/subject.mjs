// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-scatter-income-life-expectancy/subject.mjs, which
// read that beat's frozen CSV. The derivation is the proof's: every point with both measures, the declared break, the
// spread of y on each side of it, and the ratio of the two spreads — the number of copies of the short bar the video stacks
// onto the long one. The proof asserted its own answers (165 countries, « 3 fois » within 0,15); a story's answers are
// whatever its data gives, so each assertion becomes a refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

import { scaleLinear } from "d3-scale";

/** Past this many copies the stack is a ladder of slivers, not a count a viewer follows. */
export const MAX_COPIES = 8;
/** The proof's own rule: the ratio rounds to the number of copies within this much. */
export const TOLERANCE = 0.15;

const n = (v) => String(+Number(v).toPrecision(4));

/** Round values across a log domain: 1, 2, 5 × every power of ten inside it. */
function logTicks([lo, hi]) {
  const ticks = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (const m of [1, 2, 5]) ticks.push(m * 10 ** e);
  return ticks.filter((v) => v >= lo && v <= hi);
}

/**
 * @param beat   beat.mjs's default export: `points` [{ x, y }], `breakAt`, `xLog`, `xTicks?`, `yTicks?`
 * @returns  `{ countries, below, above, ratio, times, breakAt, xLog, xDomain, xTicks, yTicks }` — the names build.mjs reads
 */
export function subjectOf(beat) {
  const points = beat.points;
  if (!Array.isArray(points)) throw new Error("beat.mjs: points must be an array of { x, y }");
  if (points.length < 10)
    throw new Error(`beat.mjs gives ${points.length} points; a scatter's argument is the shape of a cloud, and under 10 points there is no cloud — include every row data.json holds with both measures, or choose another type`);
  const sized = points.filter((p) => p.size !== undefined || p.r !== undefined || p.radius !== undefined);
  if (sized.length) throw new Error(`${sized.length} points carry a size (size / r / radius), but this video draws every point at one radius: remove the size field from points in beat.mjs`);
  const xLog = beat.xLog;
  if (typeof xLog !== "boolean") throw new Error("beat.mjs: xLog must be true (a logarithmic x axis) or false (linear)");
  if (xLog) {
    const bad = points.filter((p) => !(p.x > 0));
    if (bad.length) throw new Error(`${bad.length} points have x <= 0 (first: ${bad[0].x}), which a logarithmic axis cannot place: filter them out of points in beat.mjs, or set xLog: false`);
  }
  const countries = points.map((p, i) => ({ code: `p${i}`, entity: String(p.label ?? p.name ?? i), age: p.y, income: p.x }));

  // THE Y AXIS: the proof's tens (40 … 90), or the beat's own ticks. Every point inside them; a cloud spanning far less
  // than the axis is a flat band.
  const ys = countries.map((c) => c.age);
  const [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  let yTicks = beat.yTicks;
  if (yTicks === undefined) {
    const lo = Math.floor(yMin / 10) * 10;
    const hi = Math.ceil(yMax / 10) * 10;
    yTicks = [];
    for (let v = lo; v <= hi; v += 10) yTicks.push(v);
    if (yTicks.length < 2) yTicks = [lo, lo + 10];
  }
  if (!Array.isArray(yTicks) || yTicks.length < 2 || yTicks.some((v, i) => !Number.isFinite(v) || (i > 0 && !(v > yTicks[i - 1]))))
    throw new Error(`yTicks is ${JSON.stringify(beat.yTicks)}: give at least two increasing numbers, or leave it out (tens from the least y to the most)`);
  if (yMin < yTicks[0] || yMax > yTicks.at(-1))
    throw new Error(`the y values run from ${n(yMin)} to ${n(yMax)}, outside yTicks (${yTicks[0]} to ${yTicks.at(-1)}): widen yTicks in beat.mjs, or leave it out`);
  if (yMax - yMin < 0.4 * (yTicks.at(-1) - yTicks[0]))
    throw new Error(`the y values span ${n(yMin)} to ${n(yMax)}, but the y axis runs ${yTicks[0]} to ${yTicks.at(-1)}, so the cloud would be a flat band: rescale y in beat.mjs (a share as a percentage), or give yTicks closer to the data`);

  // THE X AXIS: the proof's domain on a log scale (0.9 × the least to 1.1 × the most); 5 % air each side on a linear one.
  const xs = countries.map((c) => c.income);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  const pad = (xMax - xMin) * 0.05 || Math.abs(xMax) * 0.05 || 1;
  const xDomain = xLog ? [xMin * 0.9, xMax * 1.1] : [xMin - pad, xMax + pad];
  const xTicks = (beat.xTicks ?? (xLog ? logTicks(xDomain) : scaleLinear().domain(xDomain).ticks(6))).filter((v) => v >= xDomain[0] && v <= xDomain[1]);
  if (xTicks.length < 2)
    throw new Error(`xTicks leaves ${xTicks.length} tick(s) between ${n(xDomain[0])} and ${n(xDomain[1])}: give round values across the x range in beat.mjs, or leave xTicks out`);

  // THE BREAK and the spread each side of it — the proof's derivation.
  const breakAt = beat.breakAt;
  if (!(typeof breakAt === "number" && Number.isFinite(breakAt)))
    throw new Error(`breakAt is ${JSON.stringify(breakAt)}: this video folds the cloud against a declared break, so give the threshold on the x axis as a number`);
  const side = (keep) => {
    const ages = countries.filter(keep).map((c) => c.age);
    const lo = Math.min(...ages);
    const hi = Math.max(...ages);
    return { count: ages.length, lo, hi, range: hi - lo };
  };
  const below = side((c) => c.income < breakAt);
  const above = side((c) => c.income >= breakAt);
  if (below.count < 3 || above.count < 3)
    throw new Error(`breakAt ${n(breakAt)} leaves ${below.count} points below and ${above.count} at or above it: the fold compares two columns, each needs at least 3 points — move breakAt in beat.mjs`);
  if (!(above.range > 0)) throw new Error(`every point at or above ${n(breakAt)} has the same y (${n(above.lo)}): there is no short bar to copy — move breakAt`);
  const ratio = below.range / above.range;
  if (ratio < 1)
    throw new Error(
      `the spread above the break (${n(above.range)}) is wider than below it (${n(below.range)}): this video stacks copies of the band ABOVE the break onto the band BELOW it, so it tells only "narrower above the break" — that argument does not hold for this data; choose another type or the static format`,
    );
  const times = Math.round(ratio);
  if (times < 2)
    throw new Error(`the band below the break is ${n(ratio)} times the band above it: one copy is no count, so the video's stack has nothing to show — this argument does not hold for this data; choose another type or the static format`);
  if (times > MAX_COPIES)
    throw new Error(`the band below the break is ${n(ratio)} times the band above it: the video stacks at most ${MAX_COPIES} copies — move breakAt, or choose another type`);
  if (!(Math.abs(ratio - times) < TOLERANCE))
    throw new Error(
      `the band below the break is ${n(ratio)} times the band above it: ${times} stacked copies would visibly ${ratio > times ? "fall short of" : "overshoot"} the long bar (the video allows ${TOLERANCE} either side of a whole number) — the "N times" argument does not hold for this data at this break; move breakAt, or choose another type`,
    );
  return { countries, below, above, ratio, times, breakAt, xLog, xDomain, xTicks, yTicks };
}
