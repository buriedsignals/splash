// twin/skills/chart-beat/scripts/type-at-size.mjs
//
// WHETHER A CHART TYPE CAN ENTER A SIZE AT ALL, AND IN WHAT FORM.
//
// This is deliberately NOT in `sizes.mjs`. That file is a table of three rows, and §2 of
// `specs/W4-export-sizes.md` forbids it learning a second question — a table that both sizes and
// gates is the original Splash's own defect. Which TYPE may be drawn at which size is a fact about
// the type, so it lives beside the type sheets (`references/types/*.md`) and is carried per craft
// skill like everything else here.
//
// ── THE EVIDENCE ──────────────────────────────────────────────────────────────────────────────
//
// `proof/portrait-aspect-probe/` drew three types at 1080x1920 and a person opened all ten arms
// (`PORTRAIT-VERDICT.md`). Three findings decide this file:
//
// 1. **A stretched plot is a defect that NO counter sees.** Every arm scored zero clipped runs and
//    zero collisions, including the three worst-reading ones. The histogram's plot went from 2.35:1
//    to 0.54:1 and its tallest bar from 4.2:1 to 18.4:1 — a right-skewed distribution became one
//    enormous column beside nine slivers, with every assertion green. A distribution's argument is
//    a shape and a line's argument is a slope; both are aspect ratios.
//
// 2. **Types with a NOMINAL category axis have a twin FORM, and the form beats the clamp.**
//    Vertical columns to horizontal rows is not a rescaling, it is the right drawing for a tall
//    frame: it is row-driven, so there is no aspect to distort, every category name is horizontal
//    and legible on one line, and the frame is used without a hole in it. `r-c-bars-transposed.png`
//    was the arm the reviewer would publish "and it is not close". Horak et al., *Responsive
//    Visualization Design for Mobile Devices* §2.4.2 names the same move — "converting a vertical
//    bar chart into a horizontal one" — and NN/g's *Choosing Chart Types* gives the reason a
//    counter cannot: long names.
//
// 3. **It does not generalise.** The same source, same section, against over-applying it:
//    "rotating a scatterplot would violate conventions of reading direction… Line charts also
//    resist rotation, due to the convention that the horizontal axis represents time proceeding
//    from left to right". The histogram's x is a CONTINUUM — transposing it would put a continuous
//    variable on a band scale and lie about it. The probe deliberately rendered no transposed arm
//    for it.
//
// ── WHY THE DEFAULT IS REFUSAL ────────────────────────────────────────────────────────────────
//
// A type with no twin form needs its plot clamped into an aspect range, and that range has to be
// MEASURED — the probe's own method, rendering the type's stretch arm at the frames already
// accepted and taking the extremes. Three types have been measured. Thirty-two type sheets exist.
//
// So every unmeasured type REFUSES portrait and square, naming the measurement that is missing.
// That is invariant 1 applied to a shape instead of a colour: a chart drawn at an aspect nobody
// measured looks every bit as deliberate as one drawn in a hex nobody chose, and the probe proved
// that no assertion in this project can tell the difference. Refusal is cheap to reverse — one
// probe run per type — and a bad portrait render is not.
//
// The alternative that was rejected: default to `clamp` with a borrowed range. That is how the
// line arm inherited a floor of 0.8 learned from a square render which was ALREADY stretched, and
// the probe says so in its own verdict. A borrowed range is a guess with a decimal point on it.

/**
 * The types whose category axis is NOMINAL — a band scale — and which therefore have a twin form at
 * a tall frame. Transposing them is not a compromise; it is the drawing a tall frame asks for.
 *
 * The names are the vocabulary `references/types/` uses.
 */
export const BAND_SCALE_TYPES = [
  "bar",
  "column",
  "grouped-bar",
  "stacked-bar",
  "diverging-bar",
  "lollipop",
  "dumbbell",
  "ranking",
];

/**
 * Aspect ranges MEASURED by rendering, with where each came from. `plot width / plot height`.
 *
 * `suspect` is carried in the data rather than in a comment because it changes what a caller should
 * do: the line's floor was learned from a square render that already contained the defect, so a
 * line that lands exactly at 0.8 has satisfied a number the probe distrusts. It is used as given so
 * comparisons stay honest, and it is reported.
 */
export const MEASURED_ASPECT = {
  histogram: { min: 1.1, max: 2.9, from: "proof/portrait-aspect-probe/PORTRAIT-MEASUREMENTS.md" },
  line: {
    min: 0.8,
    max: 1.8,
    suspect:
      "the floor is the SQUARE render's 0.81:1, and that render was itself already stretched — " +
      "PORTRAIT-VERDICT.md distrusts it. Derive a line's range from its landscape and base renders " +
      "only, or state it as a slope target (Cleveland's bank-to-45°, Heer & Agrawala 2006).",
    from: "proof/portrait-aspect-probe/PORTRAIT-MEASUREMENTS.md",
  },
  // The COLUMN form of a ranking, kept because it was measured and because it is what the probe's
  // A and B arms rendered — not because it is reachable. `ranking` itself is a band-scale type, so
  // `formForSize` answers `transpose` for it and this range is never consulted at a tall frame.
  // The verdict is blunt about which wins: "C beats B beats A… and it is not close."
  "ranking-columns": {
    min: 1.3,
    max: 3.4,
    from: "proof/portrait-aspect-probe/PORTRAIT-MEASUREMENTS.md",
  },
};

/** Types whose refusal has a reason of its own, rather than "nobody has measured it yet". */
const NAMED_REFUSALS = {
  map:
    "a map has no plot rectangle to clamp. R2 makes the target aspect an input the CAMERA takes, " +
    "which is a camera decision and belongs to the map chantier, not to a chart's aspect range.",
  scatter:
    "rotating a scatter violates conventions of reading direction (Horak et al. §2.4.2), so it has " +
    "no twin form; and its density, not its aspect, is what a phone frame runs out of budget on. " +
    "Neither has been measured.",
};

/**
 * What form `type` takes at `size`, and whether it may be drawn there at all.
 *
 * Returns one of:
 *   { verdict: "as-is" }                 — landscape: the frame every one of these was designed at
 *   { verdict: "transpose", … }          — a band-scale type at a tall or square frame
 *   { verdict: "clamp", aspect, … }      — a measured type: keep the plot inside its own range
 *   { verdict: "refuse", reason }        — say so, and do not draw
 *
 * It never throws. Refusal is a RESULT a caller reports to the journalist with the reason and the
 * sizes that do work, which is `assertTypeMayEnter`'s job below; a throw here would make the answer
 * unavailable to the code that has to explain it.
 */
export function formForSize(type, size) {
  const key = String(type ?? "").toLowerCase();
  if (size === "landscape")
    return {
      verdict: "as-is",
      reason: "landscape is the frame this corpus was designed and accepted at",
    };
  if (BAND_SCALE_TYPES.includes(key))
    return {
      verdict: "transpose",
      reason:
        `${key} has a nominal category axis, so it has a twin FORM: rows running down the frame, ` +
        `every name horizontal on one line, read top to bottom. Row-driven layout has no aspect to ` +
        `distort, so no clamp applies.`,
      cost:
        "an argument drawn ACROSS the columns degrades — a reference rule at one category's level " +
        "becomes a vertical line hard against the frame edge, where it reads as a border. Redraw " +
        "the comparison as a mark, not as a rule.",
    };
  const measured = MEASURED_ASPECT[key];
  if (measured)
    return {
      verdict: "clamp",
      aspect: { min: measured.min, max: measured.max },
      from: measured.from,
      suspect: measured.suspect ?? null,
      reason:
        `${key} has no twin form — its x axis is a continuum — so the plot is held inside the ` +
        `aspect range its own accepted renders produced, ${measured.min}:1 to ${measured.max}:1.`,
    };
  if (NAMED_REFUSALS[key]) return { verdict: "refuse", reason: NAMED_REFUSALS[key] };
  return {
    verdict: "refuse",
    reason:
      `no aspect range has been measured for ${JSON.stringify(key)} at a tall frame, and it is not ` +
      `a band-scale type with a twin form. The probe's method is cheap: render the type's stretch ` +
      `arm at the frames already accepted, take the extremes, record them in MEASURED_ASPECT with ` +
      `where they came from. Until then a ${size} render of this type is an aspect nobody chose — ` +
      `and the probe proved no clipping or collision counter in this project can see the difference ` +
      `(zero clipped, zero collisions, and a destroyed distribution).`,
  };
}

/**
 * The refusal, as a throw, for a producer that is about to draw. Names the sizes that DO work, so
 * the journalist is offered the alternative in the same breath as the refusal — the wireframe's own
 * R9: "the beat does not ship portrait; the journalist is offered square or landscape with the
 * reason named."
 */
export function assertTypeMayEnter(type, size, { what = "this beat" } = {}) {
  const form = formForSize(type, size);
  if (form.verdict !== "refuse") return form;
  const works = ["landscape", "square", "portrait"].filter(
    (s) => formForSize(type, s).verdict !== "refuse",
  );
  throw new Error(
    `${what}: ${type} cannot be drawn at ${size}. ${form.reason}\n` +
      (works.length
        ? `It ships at: ${works.join(", ")}.`
        : `It ships at no size other than the one it was measured at.`),
  );
}

/**
 * THE REMOVAL LADDER, in order, as data.
 *
 * The stage is a BUDGET — 979 px at a 36 px floor — and a budget that cannot be exceeded is not a
 * budget. What makes this a ladder rather than advice is that **no rung makes anything smaller**:
 * "make it smaller" is the rule that fails at exactly the moment it is needed, so every rung removes
 * something and the type floor is never lowered.
 *
 * The order is argued from information lost per pixel recovered, cheapest first, data last. It is
 * OURS, not quoted: Horak et al. §2.4.6 states plainly that no published order of precedence exists
 * ("in some cases, a critical annotation for a single data mark may be more important to retain and
 * emphasize than an axis"). Rungs 1, 2 and 5 do follow one documented order — Andrews & Smrdel's
 * responsive line, via the same chapter.
 *
 * Three things RENDERING changed about it, recorded rather than quietly edited:
 *   - reclassification moved from the middle to the end: consolidating ten histogram bins into six
 *     merged two bins into a single 179-country column and the right-skew — the whole claim —
 *     disappeared;
 *   - removing the standfirst became its own late rung, separate from shortening it, because the
 *     histogram refused while 13 px short of its plot floor;
 *   - a rung that recovers nothing does not fire. Dropping the median's label freed no budget at
 *     all and the reader lost the median for nothing. Every rung is applied speculatively and kept
 *     only if the slack actually improved.
 *
 * Every rung that fires is RECORDED AND EMITTED with the render: "the standfirst lost a line" is a
 * decision, and invariant 1 says a decision nobody chose does not happen silently.
 */
export const REMOVAL_LADDER = [
  {
    rung: "R0",
    what: "take the twin FORM, before anything else — transpose the band-scale types",
    recovers: "the whole problem",
    loses: "an argument drawn across the columns; redraw it as a mark",
  },
  {
    rung: "R1",
    what: "the axis TITLE; its unit folds into the last tick label",
    recovers: "~75px",
    loses: "the unit's prominence, nothing else",
  },
  {
    rung: "R2",
    what: "value-axis ticks 5 -> 3 (floor, middle, top)",
    recovers: "a narrower y gutter, so the plot gets WIDER and its height floor DROPS",
    loses: "reading precision between gridlines",
    note: "the only rung that gives slack back without removing anything vertical — always tried first",
  },
  {
    rung: "R3",
    what: "the standfirst's LAST SENTENCE, repeatedly, down to one",
    recovers: "60-170px a sentence",
    loses: "context the title mostly implies",
  },
  {
    rung: "R4",
    what: "annotations, dropped last-first, one at a time, to zero",
    recovers: "190-320px each — by far the largest single recovery",
    loses: "a stated fact per rung",
  },
  {
    rung: "R5",
    what: "the reference mark's LABEL; the rule stays drawn and the value is named in prose",
    recovers: "nothing vertical — a documented no-op that never fires",
    loses: "-",
  },
  {
    rung: "R7",
    what: "the standfirst entirely",
    recovers: "its whole height",
    loses: "the only line that says what the numbers ARE",
  },
  {
    rung: "R8",
    what: "reclassify the data — bins 10 -> 6, rows 10 -> 6 — AND SAY SO",
    recovers: "large, and it is the only rung that changes what the chart states",
    loses: "the shape itself; for a ranking, the claim",
    note: "Horak §2.4.4, with §2.4.5's condition that the reader is told it happened",
  },
  {
    rung: "R9",
    what: "refuse. The beat does not ship this size; the journalist is offered the others",
    recovers: "-",
    loses: "the format",
  },
];

/**
 * REFUSE A PLOT STRETCHED OUT OF THE SHAPE ITS TYPE ARGUES IN.
 *
 * This is the probe's finding #1 made mechanical, and it is the single thing no counter in this
 * project could see: every arm of `proof/portrait-aspect-probe/` scored ZERO clipped runs and ZERO
 * collisions, including the three worst-reading ones, while a histogram's plot went from 2.35:1 to
 * 0.54:1 and its tallest bar from 4.2:1 to 18.4:1. A distribution's argument is a shape.
 *
 * It caught a live one immediately. `static-carbon-footprint-spread` at 1080x1080, with its type at
 * the phone's 36px floor, laid a three-line title, a four-line standfirst and a three-line credit
 * into a 1080px frame and left the plot **915 x 30 px — 30:1**. The delivered PNG measured exactly
 * the pinned size, every run cleared the type floor, and the picture was a row of overlapping
 * labels where a chart should be. `assertDeliveredSize` and `assertTypeFloor` both passed it.
 *
 * The refusal names the ladder rather than a number, because "make it smaller" is the rule that
 * fails at the moment it is needed: what recovers a plot is REMOVING something above it.
 *
 * A type with no measured range is not silently exempt — `formForSize` refuses it outright before a
 * caller ever gets here.
 */
export function assertPlotAspect(plot, type, size, { what = "this render" } = {}) {
  const form = formForSize(type, size);
  if (form.verdict !== "clamp") return form;
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;
  if (height <= 0 || width <= 0)
    throw new Error(
      `${what}: the plot has no area at ${size} (${width} x ${height}). Everything above it — the ` +
        `title, the standfirst, the credit — has taken the whole frame.`,
    );
  const aspect = width / height;
  if (aspect >= form.aspect.min && aspect <= form.aspect.max) return form;
  const ladder = aspect > form.aspect.max ? "too FLAT" : "too TALL";
  throw new Error(
    `${what}: the plot is ${ladder} at ${size} — ${width.toFixed(0)} x ${height.toFixed(0)} is ` +
      `${aspect.toFixed(2)}:1, outside ${type}'s measured range ${form.aspect.min}:1 to ` +
      `${form.aspect.max}:1 (${form.from}).\n` +
      (aspect > form.aspect.max
        ? `Nothing here is clipped and nothing collides — that is the point, and it is why no ` +
          `counter in this project could see it before. Run the removal ladder: R2 (fewer value ` +
          `ticks) is free, then R1 (the axis title), R3 (the standfirst's last sentence), R4 (the ` +
          `annotations, last first). The last rung is to ship the other sizes and say why.`
        : `A plot taller than its type's own range distorts the marks whose SHAPE is the argument. ` +
          `Give the height back to the furniture, or ship a size whose frame it fits.`) +
      (form.suspect ? `\nNote on this range: ${form.suspect}` : ""),
  );
}
