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
// MEASURED. Seven types have been measured. Thirty-two type sheets exist.
//
// THE METHOD CHANGED, 2026-08-11, and the change is the point. `portrait-aspect-probe` derived a
// range from THREE points — the type's stretch arm at 900x560, 1920x1080 and 1080x1080, extremes
// rounded outward — and that method produced one bound this file already distrusted in writing (the
// line's 0.8 floor, learned from a square render "itself already stretched") and one it should have
// (a 1.8 ceiling below this corpus's own accepted landscape line at 1.94:1). Three accepted frames
// cannot bracket a bound they never straddle.
//
// `proof/aspect-range-probe/` SWEEPS instead: the plot's width and the type size are held constant
// and its height varied, so aspect is the only quantity differing between two arms; every arm is
// written out and a person opens it (`ASPECT-VERDICT.md`, arm by arm). A bound is recorded only
// where two arms bracket it — one that reads and one that does not — and each range below carries
// where it was measured and what the break was.
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
  // ADDED 2026-08-11, on renders rather than on the argument that it "looks like a bar chart".
  // `proof/aspect-range-probe/` swept it like every other type, and the SHAPE of its failure is
  // what decides it: it reads best at the tall frames (85.7px band pitch at 0.5:1, a textbook
  // pyramid) and fails at the flat ones by running out of ROWS — 28.6px pitch at 1.5 and the band
  // labels touch, 17.9px at 2.4 and "95-99" prints through "90-94". Nothing about a shape is
  // distorted; a count of bands stops fitting. That is the bar family's own failure and no other
  // kind's, which is what this list is for. Its category axis is ordinal age bands and it is
  // already row-driven, so R0 is the IDENTITY for it — see `ALREADY_ROW_DRIVEN` below.
  "population-pyramid",
];

/**
 * The band-scale types whose twin form is the form they are ALREADY IN.
 *
 * Every other member of the list above is drawn as columns and takes rows at a tall frame, so
 * "transpose" is an instruction. A population pyramid is drawn as rows already: telling a producer
 * to transpose it would be telling it to do what it does, and a verdict that reads as a change
 * when nothing changes is how a caller ends up drawing a pyramid on its side. The VERDICT stays
 * `transpose` — one vocabulary, and `assertPlotAspect` still correctly declines to clamp a
 * row-driven type — and only the reason differs, which is the part a human reads.
 *
 * What actually bounds these types at a tall frame is their ROW BUDGET, which `assertRowsFit`
 * measures off the labels' own ink. An aspect range cannot answer it: a row budget is a fact about
 * a COUNT, and this file's ranges are facts about a shape.
 */
const ALREADY_ROW_DRIVEN = ["population-pyramid"];

/**
 * Aspect ranges MEASURED by rendering, with where each came from. `plot width / plot height`.
 *
 * `suspect` is carried in the data rather than in a comment because it changes what a caller should
 * CONCLUDE from a pass. It began as the line's own warning that its floor came from an
 * already-stretched square render; that floor has since been re-measured, and the field now carries
 * the thing a passing line still must not be read as proving — that its labels fit. A guard's
 * silence is only as wide as what it looks at.
 */
export const MEASURED_ASPECT = {
  histogram: { min: 1.1, max: 2.9, from: "proof/portrait-aspect-probe/PORTRAIT-MEASUREMENTS.md" },
  // RE-MEASURED 2026-08-11. Both ends moved, and neither moved the way the corpus expected.
  //
  // The old range was 0.8–1.8 and BOTH bounds were unusable. The floor was the SQUARE render's
  // 0.81:1 from a three-point derivation, and that render "was itself already stretched" — this
  // file carried the doubt in a `suspect` field for exactly as long as nobody re-measured. The
  // ceiling of 1.8 sat UNDER this corpus's own accepted landscape line at 1.94:1, so a line could
  // not satisfy its own range at a table size; `proof/life-expectancy` delivers 2.4:1 at square and
  // 2.55:1 at portrait and recorded that as a finding for the table's owner rather than a defect.
  //
  // Swept and opened (ten arms at 900px plot / 26px type, and six more at the phone's own regime,
  // 700px / 36px, because a bound learned at one ratio of type to plot is worth nothing until it
  // has been checked at the other one this toolchain exports — the range did not move between
  // them). What bounds a line is its SLOPE, which is the one quantity an aspect change destroys
  // (Cleveland's banking-to-45°, formalised by Heer & Agrawala 2006).
  line: {
    min: 0.7,
    max: 3.6,
    from: "proof/aspect-range-probe/ASPECT-VERDICT.md §6 — arms 0.5 through 4.5, both regimes",
    countedOn: "one series over 74 annual readings, directly end-labelled",
    reads:
      "arms/line-0p7.png at 53.3° end to end, and arms/line-3p6.png at 14.6°, where the 2020 dip " +
      "is small and still present",
    breaks:
      "arms/line-0p5.png — 62° end to end, past banking-to-45° by 17°, so a steady 34-year climb " +
      "reads as a cliff and the 1950s year-to-year noise reads as drama; and arms/line-4p5.png — " +
      "11.8°, where the 2020 dip and the 1962 one have both gone. The trend survives at 4.5:1; " +
      "every event inside it does not.",
    // Kept, because the field's job is to change what a caller may conclude — and what it says now
    // is the opposite of what it used to say.
    suspect:
      "the SQUARE defect this range used to be blamed for is not an aspect defect. " +
      "vidx-line-life-expectancy at square passes at 0.83:1 and is unpublishable, and the probe " +
      "settled why: the same 0.83:1 READS at 700px of plot width and the same defects appear at " +
      "1.5:1 — comfortably inside this range — once the plot is the 370px that beat's own end-label " +
      "gutter leaves it. The failure travels with the plot's WIDTH against the ink drawn in it, and " +
      "it is aspect-blind. Tightening this floor would refuse a picture that reads and still pass " +
      "the one that does not; the honest instrument is a measured minimum plot width, or the " +
      "annotation-over-marks guard.",
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

  // ── THE SWEPT RANGES, 2026-08-11 ────────────────────────────────────────────────────────────
  //
  // Four types this file refused for want of a measurement, now measured the way §"why the default
  // is refusal" describes. Each bound is BRACKETED: the arm named in `reads` was opened and reads,
  // the arm named in `breaks` was opened and does not, and the reason is what broke rather than a
  // ratio that looked wrong.
  //
  // `countedOn` is not decoration either. Three of these four break because a COUNT of things stops
  // fitting down the frame — five waterfall steps' value axis, ten bump rank rows, six
  // small-multiples panels — so the range is a fact about the type AT THAT COUNT. A beat drawing
  // twenty-seven rows is a different measurement, and `assertRowsFit` (not this file) is the
  // instrument that reads a count.
  waterfall: {
    min: 0.35,
    max: 4.6,
    from: "proof/aspect-range-probe/ASPECT-VERDICT.md — arms 0.35 through 6.0, 900px plot, 26px type",
    countedOn: "5 steps, a 5-tick value axis",
    reads: "arms/waterfall-4p6.png — value-axis labels 39px apart at 26px, every step still a bar",
    breaks:
      "arms/waterfall-6.png — the value-axis labels touch at 30px pitch, and the two smallest steps " +
      "(17 and 22px against a 159px bar width) stop being comparable slabs. No floor was reached: " +
      "0.35 reads, with dead space rather than a defect, and no frame this toolchain exports goes flatter.",
  },
  slope: {
    min: 0.35,
    max: 1.8,
    from: "proof/aspect-range-probe/ASPECT-VERDICT.md — arms 0.35 through 3.6, 900px plot, 26px type",
    countedOn: "6 series, both ends directly labelled",
    reads: "arms/slope-1p8.png — the Poland/France crossing still reads mid-plot",
    breaks:
      "arms/slope-2.png and 2p2 — a slope chart states WHICH LINES CROSS, and by 2.0 the crossing " +
      "has been squeezed against the left rail; by 2.2 five of six end labels have been pushed off " +
      "their own value by the de-collider, so the label column stops encoding position at all.",
  },
  "small-multiples": {
    min: 0.5,
    max: 1.3,
    from: "proof/aspect-range-probe/ASPECT-VERDICT.md — arms 0.5 through 3.6, 900px grid, 26px type",
    countedOn:
      "6 panels, packed by the beat's own columnsFor rule (1x6 at 0.5, 2x3 in the middle, 3x2 flat)",
    reads: "arms/small-multiples-1p3.png — panels 429x152, the shared value labels 38px apart",
    breaks:
      "arms/small-multiples-1p5.png — panels 152px -> 121px tall and the five shared value labels " +
      "touch; by 3.6 they are an unreadable smear. The packing rule absorbs the tall side (one " +
      "column of six at 0.5 reads perfectly) and runs out of columns on the flat side.",
  },
  bump: {
    min: 0.5,
    max: 2.9,
    from: "proof/aspect-range-probe/ASPECT-VERDICT.md — arms 0.5 through 3.6, 900px plot, 26px type",
    countedOn: "6 tracks over 10 rank rows, names drawn at both ends",
    reads: "arms/bump-2p9.png — rank rows 34.4px apart against a 28px name",
    breaks:
      "arms/bump-3p2.png — the row pitch falls to 31.2px, under the name's own line, and the name " +
      "column at each end becomes one solid stack. The crossings survive far longer than the names do.",
  },
};

/** Types whose refusal has a reason of its own, rather than "nobody has measured it yet". */
const NAMED_REFUSALS = {
  map:
    "a map has no plot rectangle to clamp. R2 makes the target aspect an input the CAMERA takes, " +
    "which is a camera decision and belongs to the map chantier, not to a chart's aspect range. " +
    "That decision now exists: skills/map-beat/scripts/stage.mjs. A baked map's plate is a raster " +
    "whose camera already fitted the study bounds, so the PLATE's aspect is the shape its geography " +
    "takes; `mapStageBox` scales that to whichever dimension binds and hands the leftover back to " +
    "furniture, and `assertStageHonoursGeography` refuses a plate whose longitude its own aspect " +
    "cannot hold. This entry stays a refusal because it is a CHART's answer to a map, and it is " +
    "still the right one — nothing here should invent an aspect range for a camera.",
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
    return ALREADY_ROW_DRIVEN.includes(key)
      ? {
          verdict: "transpose",
          alreadyInIt: true,
          reason:
            `${key} has a nominal category axis — so it is a band-scale type and no clamp applies — ` +
            `and it is drawn as rows ALREADY, so its twin form is the form it is in. Nothing here ` +
            `asks for a redraw: it reads best at a tall frame (measured, ` +
            `proof/aspect-range-probe/ASPECT-VERDICT.md §5) and what bounds it is its ROW BUDGET, ` +
            `which assertRowsFit measures off the labels' own ink.`,
          cost:
            "none at a tall frame. The cost is at a FLAT one, where this type has no twin form left " +
            "to take and its rows run out — which landscape's `as-is` verdict does not see.",
        }
      : {
          verdict: "transpose",
          alreadyInIt: false,
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
    rung: "R6",
    what:
      "SHORTEN the title to the fewest words that still make its claim — never drop it. The " +
      "beat supplies the shorter form in its own words; `shortenTitle` refuses one that drops a " +
      "quantity, what that quantity counts, a named subject, or a qualifier class",
    recovers: "one line of the largest type on the frame — 89-100px on a video landscape",
    loses:
      "nothing the sentence asserts, or the rung does not fire. What it can cost is rhythm: the " +
      "shorter form is a real edit and a person has to read it",
    note:
      "the ONLY rung whose input is editorial. Added 2026-08-11 because four beats refused every " +
      "frame in the table with the title as the binding constraint, and the ladder had no rung " +
      "for a title at all — R7 removes the standfirst, and there was nothing between that and " +
      "refusing. A title cannot be REMOVED: it is the beat's claim, and a beat without its claim " +
      "is not the beat. It can very often be SAID SHORTER.",
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// R6 — THE TITLE RUNG. A CLAIM SAID SHORTER, NOT A CLAIM DROPPED.
//
// WHY IT EXISTS. Four beats refused every row of the export table with the same binding constraint,
// and the ledger names it in one line: **"the ladder has no rung for a TITLE, and on these beats
// the title is the claim."** At a video legibility floor a claim-length headline takes two to six
// lines of the largest type on the frame, and the ladder went straight from R5 (a no-op) to R7
// (remove the standfirst) to R9 (refuse). There was nothing between "remove something else" and
// "do not ship".
//
// WHY IT SHORTENS AND NEVER DROPS. Every other rung REMOVES — that is the ladder's founding rule,
// because "make it smaller" is the instruction that fails at the moment it is needed. A title is
// the one piece of furniture that rule cannot be applied to: removing a beat's claim removes the
// beat. So this rung is the exception, and it earns the exception by removing WORDS rather than
// MEANING: "six in ten countries emit under 4 tonnes of CO2 per person a year" is not shorter than
// what it means, but plenty of headlines are.
//
// WHERE THE WORDS COME FROM. The beat's own. Nothing here generates a title, and nothing here
// paraphrases one — a template that rewrote a journalist's sentence would be the same defect as a
// palette nobody chose, one layer up. The beat supplies BOTH forms and this decides whether the
// short one still says what the long one said.
//
// ── WHAT "STILL SAYS IT" MEANS, MECHANICALLY ──────────────────────────────────────────────────
//
// A claim asserts a SUBJECT, a QUANTITY and a DIRECTION. Each of the three is checked, and each
// check names what it would lose rather than returning a score:
//
//   1. QUANTITIES survive. Every numeral in the long form appears in the short one, and so does
//      every counting word (`one` … `twelve`, `half`, `third`, `quarter`, `both`). A dropped
//      number is a dropped fact.
//   2. WHAT A QUANTITY COUNTS survives. For each numeral, the next two content words in the long
//      form — its unit and the thing it measures — must appear in the short one. This is the check
//      that catches the shortening a proper-noun scan cannot see: "All 11 of these international
//      organisations" cut to "All 11" keeps every numeral and every proper noun, and states
//      nothing.
//   3. NAMED SUBJECTS survive. Capitalised words and acronyms, minus the function words a sentence
//      can open with, so `Croatia` at position 0 counts and `The` does not.
//   4. QUALIFIER CLASSES survive, and are not reversed. `only` may become `alone`; it may not
//      vanish, and `more` may not become `less`.
//
// ── ITS STATED LIMITS, BECAUSE A GUARD TRUSTED PAST ITS REACH IS WORSE THAN NO GUARD ──────────
//
//   · **A common-noun head that no numeral counts is invisible to it.** Rule 2 reaches the subject
//     of "11 international organisations"; it does not reach the subject of a title that counts
//     nothing. Rule 3 only sees proper nouns.
//   · **There is no thesaurus and no comparison-word list.** `than` / `out of` / `versus` were
//     considered and left out: a word list wide enough to accept "360 of 366" for "360 out of 366"
//     has to contain `of`, which every sentence carries, and a check that always passes is
//     decoration. Dropping a comparison in practice drops a quantity or a direction word, and both
//     of those are checked.
//   · **It cannot read.** It can say a claim was not dropped; it cannot say the shorter sentence
//     lands. That is why `shortenTitle` returns both forms for the render to emit, and why the
//     rung's discipline is that a person opens the result.
//
// ── AND IT DOES NOT FIRE FOR NOTHING ──────────────────────────────────────────────────────────
//
// The ladder's own R5 lesson, applied: dropping the median's label freed no budget at all and the
// reader lost the median for nothing, so every rung is applied speculatively and kept only if the
// slack really improved. A shorter title that still wraps to the same number of lines recovers
// zero pixels, and this rung declines it and says so — the journalist's sentence stays as written.
// `linesOf` is REQUIRED rather than defaulted, because a rung that guessed at line counts from a
// character count would be deciding an editorial question on a number it did not measure.

/** The counting words that are quantities. Indexed by value, so `one` and `1` are the same fact. */
export const COUNTING_WORDS = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  half: "half",
  third: "third",
  quarter: "quarter",
  both: "both",
};

/**
 * The qualifier classes. A claim may swap a word for another in its own class and still say the
 * same thing; it may not lose the class, and it may not swap a class for its opposite.
 */
export const QUALIFIER_CLASSES = {
  universal: ["all", "every", "each", "whole", "entire", "always", "throughout"],
  exclusive: ["only", "alone", "sole", "solely", "lone", "just", "single"],
  negation: ["not", "no", "never", "none", "nor", "without", "neither", "nothing", "isn't", "does't"],
  increase: [
    "more", "higher", "greater", "above", "over", "up", "rose", "rise", "rises", "risen",
    "grew", "grow", "grown", "gained", "increase", "increased", "added", "larger", "bigger",
  ],
  decrease: [
    "less", "fewer", "lower", "below", "under", "down", "fell", "fall", "falls", "fallen",
    "cut", "shrank", "shrunk", "dropped", "lost", "decrease", "decreased", "smaller",
  ],
  rate: ["per", "apiece", "each"],
};

/** Classes that mean the opposite of one another. Swapping one for the other reverses the claim. */
const OPPOSED_CLASSES = [["increase", "decrease"]];

/**
 * Words a sentence may OPEN with that are not its subject. Only consulted at position 0 — anywhere
 * else a capital is a name.
 */
const OPENING_FUNCTION_WORDS = new Set([
  "the", "a", "an", "this", "that", "these", "those", "in", "on", "at", "of", "for", "from",
  "and", "but", "or", "not", "no", "all", "every", "each", "half", "one", "two", "three", "four",
  "five", "six", "seven", "eight", "nine", "ten", "only", "just", "its", "their", "his", "her",
  "by", "with", "to", "as", "after", "before", "when", "where", "how", "why", "what", "which",
  "who", "there", "here", "it", "they", "we", "you", "more", "fewer", "less", "most", "over",
  "under", "nearly", "almost", "about", "up", "down", "since", "between", "across", "within",
]);

/** Words rule 2 walks past when it looks for what a number counts. */
const COUNTED_STOPWORDS = new Set([
  ...OPENING_FUNCTION_WORDS,
  "is", "are", "was", "were", "be", "been", "being", "has", "have", "had", "do", "does", "did",
  "than", "out", "per", "into", "onto", "off", "own", "still", "already", "yet", "then", "so",
  "s", "and", "or", "any", "some", "other", "another", "same", "such", "own",
]);

/** Everything a claim asserts that this file can name, read off one sentence. Pure. */
export function claimTokens(sentence) {
  const raw = String(sentence ?? "").split(/\s+/).filter(Boolean);
  const bare = (token) =>
    token
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .replace(/[^\p{L}\p{N}%]+$/u, "")
      .replace(/['’]s$/u, "");
  const words = raw.map(bare);
  const lower = words.map((w) => w.toLowerCase());
  // A numeral, with thousands separators removed and the decimal point kept: `14,175` and `14 175`
  // are the same quantity as `14175`, and `4.4` is not the same as `44`.
  const numeralIn = (word) => {
    const hit = /\d[\d.,   ]*\d|\d/u.exec(word);
    return hit ? hit[0].replace(/[,   ]/gu, "").replace(/\.$/, "") : null;
  };
  const numerals = [];
  const counted = [];
  for (let at = 0; at < words.length; at++) {
    const value = numeralIn(words[at]);
    if (value === null) continue;
    numerals.push(value);
    const phrase = [];
    for (let next = at + 1; next < words.length && phrase.length < 2; next++) {
      if (numeralIn(words[next]) !== null) break;
      if (!lower[next] || COUNTED_STOPWORDS.has(lower[next])) continue;
      phrase.push(words[next]);
    }
    if (phrase.length) counted.push({ numeral: value, phrase });
  }
  const quantityWords = lower.filter((w) => Object.hasOwn(COUNTING_WORDS, w));
  const subjects = words.filter((word, at) => {
    if (!/^\p{Lu}/u.test(word)) return false;
    if (at === 0 && OPENING_FUNCTION_WORDS.has(lower[at])) return false;
    return true;
  });
  const qualifiers = Object.entries(QUALIFIER_CLASSES)
    .filter(([, members]) => members.some((m) => lower.includes(m)))
    .map(([name]) => name);
  return { numerals, counted, subjects, qualifiers, words, lower };
}

/** Whether `sentence` still carries `word` — allowing a plural or a possessive, nothing looser. */
function carries(sentence, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?:['’]?s)?(?![\\p{L}\\p{N}])`, "iu").test(
    String(sentence),
  );
}

/**
 * WHETHER A SHORTER FORM STILL MAKES THE LONGER ONE'S CLAIM.
 *
 * Returns `{ ok, lost }` where every entry of `lost` names what would go and which rule saw it —
 * never a score, because "the title lost 12% of its claim" is not a sentence anybody can act on.
 */
export function claimSurvives(long, short) {
  const before = claimTokens(long);
  const after = claimTokens(short);
  const lost = [];
  for (const numeral of new Set(before.numerals))
    if (!after.numerals.includes(numeral))
      lost.push({ rule: "quantity", token: numeral, why: `the number ${numeral} is not in the shorter form` });
  for (const word of new Set(before.quantityWords ?? []))
    if (!after.lower.includes(word) && !after.numerals.includes(COUNTING_WORDS[word]))
      lost.push({ rule: "quantity", token: word, why: `the counting word "${word}" is not in the shorter form` });
  for (const { numeral, phrase } of before.counted)
    for (const word of phrase)
      if (!carries(short, word))
        lost.push({
          rule: "what the quantity counts",
          token: word,
          why: `${numeral} counts "${phrase.join(" ")}" and the shorter form does not say "${word}"`,
        });
  for (const subject of new Set(before.subjects))
    if (!carries(short, subject))
      lost.push({ rule: "named subject", token: subject, why: `"${subject}" is not in the shorter form` });
  for (const name of before.qualifiers)
    if (!after.qualifiers.includes(name))
      lost.push({
        rule: "qualifier",
        token: name,
        why:
          `the long form qualifies its claim as ${name} (${QUALIFIER_CLASSES[name]
            .filter((m) => before.lower.includes(m))
            .join(", ")}) and the shorter form carries no word of that class`,
      });
  for (const [one, other] of OPPOSED_CLASSES)
    for (const [from, to] of [
      [one, other],
      [other, one],
    ])
      if (before.qualifiers.includes(from) && !before.qualifiers.includes(to) && after.qualifiers.includes(to))
        lost.push({
          rule: "reversed",
          token: to,
          why: `the long form says ${from} and the shorter form says ${to} — that is a different claim, not a shorter one`,
        });
  // De-duplicated: one word can be both a named subject and what a number counts, and reporting it
  // twice makes a single loss read as two.
  const seen = new Set();
  return {
    ok: lost.length === 0,
    lost: lost.filter((l) => {
      const key = `${l.rule}|${l.token}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

/**
 * R6, AS THE THING A PRODUCER CALLS.
 *
 * `linesOf(text)` is the beat's OWN wrap, at its own measure and its own title font — required,
 * never defaulted, because the rung's whole justification is the line it recovers and a line count
 * guessed from a character count is not a measurement.
 *
 * It never throws. A rung that cannot fire is a RESULT the render reports beside the picture, the
 * same shape `formForSize` returns a refusal in: the journalist's own sentence stays as written and
 * the reason is on the record.
 */
export function shortenTitle({ long, short, linesOf, what = "this beat" } = {}) {
  if (typeof linesOf !== "function")
    throw new Error(
      `${what}: R6 needs the beat's own line measurer — shortenTitle({ long, short, linesOf }). ` +
        `A title rung that counted characters would be deciding an editorial question on a number ` +
        `it never measured.`,
    );
  const declined = (reason) => ({ rung: "R6", fires: false, title: long, long, short, reason });
  if (typeof short !== "string" || !short.trim())
    return declined(`no shorter form was written for this title, so R6 has nothing to apply.`);
  if (short.trim() === String(long).trim())
    return declined(`the shorter form is the title itself.`);
  if (short.length >= String(long).length)
    return declined(
      `the "shorter" form is ${short.length} characters against the title's ${String(long).length} — ` +
        `that is a rewrite, and R6 only shortens.`,
    );
  const survives = claimSurvives(long, short);
  if (!survives.ok)
    return {
      ...declined(
        `the shorter form would drop what the title asserts, so R6 does not fire:\n  ` +
          survives.lost.map((l) => `${l.rule}: ${l.why}`).join("\n  ") +
          `\nA claim said in fewer words is a rung; a claim said less is not. Write a form that ` +
          `keeps these, or take the next rung.`,
      ),
      lost: survives.lost,
    };
  const before = linesOf(long);
  const after = linesOf(short);
  if (!(after < before))
    return declined(
      `the shorter form still wraps to ${after} line${after === 1 ? "" : "s"}, the same as the ` +
        `title's ${before}, so R6 recovers nothing and the journalist's own sentence stays. ` +
        `(The ladder's R5 is the precedent: a rung that frees no budget costs the reader something ` +
        `for nothing.)`,
    );
  return {
    rung: "R6",
    fires: true,
    title: short,
    long,
    short,
    linesBefore: before,
    linesAfter: after,
    recoveredLines: before - after,
    reason:
      `R6 fired: the title was said in ${short.length} characters instead of ${String(long).length}, ` +
      `${before} lines instead of ${after === 1 ? "one" : after}, and every quantity, everything ` +
      `those quantities count, every named subject and every qualifier class survived. ` +
      `Both forms are on the record so a person can read the one that ships.`,
  };
}
