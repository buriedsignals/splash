/**
 * Income against life expectancy, 165 countries, drawn THROUGH the design base.
 *
 * The fifth component in this tree to do that, and the first whose marks are POINTS. A line has one
 * ordered series, a bridge and a pyramid have bars keyed to a category, a histogram has intervals;
 * this has a cloud in which no single mark is the argument. `references/types/scatter.md`'s own rule
 * is that a scatter's argument is the shape, not any one point, and the beat's `PALETTE.md` reserves
 * its accent and deliberately spends none of it on a country.
 *
 * WHAT THE HARVEST DECIDED.
 *
 * `apparatus-is-one-size-and-weight-separates-it` (three publications) — the axis name and its
 * qualifier share a size and are separated by weight. Our World in Data sets `GDP per capita` at
 * Lato 12/700 against `(international-$ … logarithmic axis)` at Lato 12/400, same size, same ink.
 * This beat set `GDP per capita (log scale)` as one run, which makes the caveat look like half of
 * what the axis measures.
 *
 * `declared-break-with-the-spread-on-each-side` (derived) — the title asserts that beyond roughly
 * $30,000 extra income buys far less extra life expectancy, and the plate drew 165 dots and neither
 * the line nor either band. Below the break: 124 countries across 41.1 years. Above: 41 countries
 * across 13.9. Three times narrower, which is what the sentence means.
 *
 * THE ACCENT IS SPENT ON THE ARGUMENT, NOT ON A COUNTRY. There is no named subject here, so the
 * direction's accent goes to the break and its two bands — the only thing on the plate that is a
 * claim rather than an observation.
 */

import { scaleLinear, scaleLog } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };
const MARK_RADIUS = 3.4;
const MARK_OPACITY = 0.55;

export type Pair = { x: number; y: number };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

/** Ticks are abbreviated and prose is not. The annotation says the same number the headline says —
 *  `30 000 $`, French spacing and French sign placement — while the axis keeps its compact `$30k`,
 *  which is what a tick is for. It read `124 pays sous $30k` under a headline reading `Au-delà de
 *  30 000 $`, two spellings of one threshold on one plate. */
const tick = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);
const money = (v: number) => `${v.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0")} $`;

export function DirectedScatter({
  pairs,
  breakAt,
  spread,
  xName,
  xQualifier,
  yName,
  yQualifier,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  pairs: Pair[];
  breakAt: number;
  spread: {
    below: { count: number; lo: number; hi: number; range: number };
    above: { count: number; lo: number; hi: number; range: number };
  } | null;
  xName: string;
  xQualifier: string;
  yName: string;
  yQualifier: string;
  title: string[];
  limits: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  /** Every rung the ladder spends is a decision, so it is reported rather than taken quietly. */
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
  }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

  /** RUNS ON ONE LINE SHARE A BASELINE, NOT AN INK-BOX EDGE — and the difference is visible.
   *
   *  MEASURED on this tree's own delivered SVGs: six country names under six groups came out on six
   *  different baselines, 1.5px apart at 960px, 3px in the delivered file. The cause is that
   *  `measureTextBand` answers per STRING — "Suède" carries an accent, "France" does not — so each
   *  label got a box of its own height, the arbiter aligned the boxes, and the baselines fell where
   *  they fell.
   *
   *  The COLLISION box stays the string's own ink, because inflating it to a common band costs real
   *  labels: doing that dropped this corpus's end-value label in all three directions. What changes
   *  is where the run is DRAWN inside the box the arbiter granted it — against the band of its
   *  REGISTER, measured once on a probe carrying an ascender, a descender and a comma, from
   *  whichever edge the chosen anchor holds fixed. Runs sharing an anchor and a y then share a
   *  baseline, whatever glyphs they happen to carry. */
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));
  const baselineOf = (p: any, r: any) => {
    const band = bandOf(r);
    // `above` holds the box's bottom edge, `below` its top, and the side anchors centre it.
    if (p.anchor === "above") return p.box.y + p.box.height - band.descent;
    if (p.anchor === "below") return p.box.y + band.ascent;
    return p.box.y + p.box.height / 2 + (band.ascent - band.descent) / 2;
  };

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  }

  /** THE FORM THE FRAME ASKS FOR, taken off the frame itself. Everything conditioned on it leaves
   *  landscape exactly as it was accepted; 960 x 540 is what this plate was measured against. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";

  // ── header ────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  const plotLeft = PAD + widthOf("00", axis) + 16;
  const plotRight = width - PAD;

  const layoutFor = (titleIndex: number, limitIndex: number) => {
    const titleLines = wrap(set(title[titleIndex], display), column, display);
    const limitLines =
      limitIndex < 0 ? [] : wrap(set(limits[limitIndex], body), column, body);
    const titleBottom = titleTop + titleLines.length * titleLead;
    const limitsTop = titleBottom + gapOf(body, 0.4138);
    const top =
      (limitLines.length ? limitsTop + limitLines.length * bodyLead : titleBottom) +
      gapOf(annot, 1.7143);
    // Two rows below the plot in the axis register: the ticks, then the axis name with its
    // qualifier beside it.
    const bottom = sourceTop - gapOf(body, 1.1034) - axis.fontSize * 3.4;
    return { titleLines, limitLines, limitsTop, top, bottom };
  };

  /**
   * THE REMOVAL LADDER. `scatter` has no twin form — rotating one violates reading direction, which
   * is why `type-at-size.mjs` refuses it at a tall frame by name — and no measured aspect range. It
   * is admitted at square on the strength of a render somebody read, and that render has to BE a
   * scatter.
   *
   * MEASURED at 1080x1080 with the copy this beat ships: the headline runs to four lines and the
   * standfirst to four more, and the plot comes out 12px tall. The five y ticks then landed 3px
   * apart — « 40 » through « 50 » through « 60 » — and the y axis name, which sits just above the
   * plot, landed on all of them. That is the refusal the square render fired, and nothing about it
   * is a type-setting problem: there was no plot left.
   *
   * So the plot is OWED a third of the frame, the share `proof/static-choropleth-europe-lowcarbon`
   * gives its map at the same size and for the same reason, and the ladder removes until it is paid:
   * the standfirst's shorter forms, then the standfirst itself, then the headline's. Landscape is
   * owed nothing and never leaves the first rung.
   */
  const rungs: Array<{ title: number; limit: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) rungs.push({ title: t, limit: l });
  for (let t = 0; t < title.length; t++) rungs.push({ title: t, limit: -1 });
  const tried = rungs.map((rung) => ({ rung, layout: layoutFor(rung.title, rung.limit) }));
  const plotOwed = SIZE === "landscape" ? 0 : height / 3;
  const fits =
    tried.find(({ layout }) => layout.bottom - layout.top >= plotOwed) ??
    tried.reduce((a, b) =>
      b.layout.bottom - b.layout.top > a.layout.bottom - a.layout.top ? b : a,
    );
  const layout = fits.layout;
  const { titleLines, limitLines, limitsTop } = layout;
  const plot = {
    left: plotLeft,
    right: plotRight,
    top: layout.top,
    bottom: layout.bottom,
  };
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ` +
      (fits.rung.limit < 0 ? "dropped" : `${fits.rung.limit + 1}`) +
      ` · plot ${(plot.right - plot.left).toFixed(0)} x ${(plot.bottom - plot.top).toFixed(0)}` +
      (plotOwed ? `, owed ${plotOwed.toFixed(0)} of height` : ""),
  );

  const xs = pairs.map((p) => p.x);
  const ys = pairs.map((p) => p.y);
  const x = scaleLog()
    .domain([Math.min(...xs) * 0.9, Math.max(...xs) * 1.1])
    .range([plot.left, plot.right]);
  /** HEADROOM FOR THE STACKED PAIR, AND ONLY WHERE THE PAIR STACKS.
   *
   *  At a narrow frame the break's two sentences become a two-line block that has to live inside
   *  the plot — there is no band above it — and the arbiter refuses to put a label on a mark.
   *  Measured at 1080x1080 in `nocturne`, whose plot is the shortest of the three at 165px, every
   *  anchor collided and the block was dropped. So the top of the plot is RESERVED: the y range
   *  stops short of `plot.top` by the block's own height, which leaves a strip no point can reach
   *  rather than hoping the cloud's top-left corner happens to be empty. The gridlines and ticks
   *  follow the scale, so nothing else moves. */
  const annotLeadForReserve = leadOf(annot);
  const stackedPair =
    SIZE !== "landscape" &&
    on("declared-break-with-the-spread-on-each-side") &&
    spread !== null;
  const headroom = stackedPair ? 2 * annotLeadForReserve + 14 : 0;
  const y = scaleLinear()
    .domain([
      Math.floor(Math.min(...ys) / 10) * 10,
      Math.ceil(Math.max(...ys) / 10) * 10,
    ])
    .range([plot.bottom, plot.top + headroom]);
  const yTicks = y.ticks(5);
  const xTicks = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].filter(
    (v) => v >= x.domain()[0] && v <= x.domain()[1],
  );

  const drawBreak =
    on("declared-break-with-the-spread-on-each-side") && spread !== null;
  const breakX = drawBreak ? x(breakAt) : null;
  /** The accent, held to the text floor on this direction's ground — two of the three filed
   *  directions carry an accent that does not clear it as drawn. */
  const claimInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );

  const belowText = drawBreak
    ? set(
        `${spread!.below.count} pays sous ${money(breakAt)} \u00b7 ${spread!.below.range.toFixed(0)} ans d\u2019écart`,
        annot,
      )
    : "";
  const aboveText = drawBreak
    ? set(`${spread!.above.count} au-dessus \u00b7 ${spread!.above.range.toFixed(0)} ans`, annot)
    : "";
  const annotLead = leadOf(annot);

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  /**
   * THE TWO SIDES OF THE BREAK STACK WHERE THE PLATE IS NARROW, AND THEY STACK AS ONE REQUEST.
   *
   * At 960px the two sentences sit on one line, one on each side of the break, which is the whole
   * point of the pair. At 540px they are 330px of ink over a 390px plot and the right-hand one is
   * anchored past the break, so its box ran off the frame: measured at 1080x1080 and 1080x1920, the
   * arbiter dropped « 133 au-dessus · 30 ans » outright, and at `nocturne` it dropped both. A
   * dropped half of a pair is worse than a stacked pair — the plate then states one side of a
   * comparison and not the other.
   *
   * Stacking them as TWO requests would let the arbiter place one and drop the other, which is the
   * defect again. One request carrying both lines cannot come apart.
   */
  const requests = stackedPair
    ? [
        {
          id: "break",
          treatment: "declared-break-with-the-spread-on-each-side",
          text: `${belowText}\n${aboveText}`,
          /** AND IT HANGS INSIDE THE PLOT, not above it. Two lines are about 30px, and the band
           *  between the standfirst and the plot is 16px: anchored `above` the block's own box fell
           *  outside the arbiter's frame and was dropped for want of room, which is the defect
           *  again. The plate's top-left corner is where a life-expectancy-against-income cloud has
           *  no points — low income with high life expectancy — and the arbiter checks that rather
           *  than trusting it. */
          at: {
            x:
              plot.left +
              8 +
              Math.max(widthOf(belowText, annot), widthOf(aboveText, annot)) / 2,
            y: plot.top,
          },
          anchors: ["below"],
          priority: 8,
          register: annot,
        },
      ]
    : drawBreak
    ? [
        {
          id: "below",
          treatment: "declared-break-with-the-spread-on-each-side",
          text: set(
            `${spread!.below.count} pays sous ${money(breakAt)} · ${spread!.below.range.toFixed(0)} ans d’écart`,
            annot,
          ),
          // `above` centres the box on its point, so the point is the label's own CENTRE — anchored
          // at the plot's left edge the box hung half its width off the frame and was refused.
          at: {
            x:
              plot.left +
              8 +
              widthOf(
                set(
                  `${spread!.below.count} pays sous ${money(breakAt)} · ${spread!.below.range.toFixed(0)} ans d’écart`,
                  annot,
                ),
                annot,
              ) /
                2,
            y: plot.top + annot.fontSize * 0.6,
          },
          // THE TWO SIDES OF ONE BREAK ARE READ AS A PAIR, so they are set on one line or not at
          // all. Left to the four-anchor default they took different anchors and landed 29px apart
          // — measured on the delivered SVG, 516.4 against 487.4 — which reads as two unrelated
          // notes rather than as the two halves of one sentence.
          anchors: ["above"],
          priority: 7,
          register: annot,
        },
        {
          id: "above",
          treatment: "declared-break-with-the-spread-on-each-side",
          text: set(
            `${spread!.above.count} au-dessus · ${spread!.above.range.toFixed(0)} ans`,
            annot,
          ),
          at: {
            x:
              breakX! +
              10 +
              widthOf(
                set(`${spread!.above.count} au-dessus · ${spread!.above.range.toFixed(0)} ans`, annot),
                annot,
              ) /
                2,
            y: plot.top + annot.fontSize * 0.6,
          },
          anchors: ["above"],
          priority: 8,
          register: annot,
        },
      ]
    : [];

  /** Every point is a mark. A cloud of 165 is what an annotation has to clear.
   *
   *  AND SO IS THE AXIS FURNITURE, which the arbiter could not see. The y axis name sits just above
   *  the plot, on the same band the break's labels are anchored to, and the tick labels line both
   *  edges of it — measured at 1080x1080, « 40 » and « Esp\u00e9rance de vie \u00e0 la naissance »
   *  shared 88% of the smaller run. Each of these sits at a box this component already knows, so
   *  each belongs in `avoid` exactly like a mark; `proof/co2-suisse/DirectedLine.tsx` records the
   *  same correction for its own y ticks. */
  const axisBand = bandOf(axis);
  /** AND ONLY WHERE THE PLATE IS NARROW. The furniture is ink at every size, but at 960px the
   *  break's left-hand label already sits one pixel under the y axis name and was accepted there;
   *  handing the arbiter that box made it drop the label instead, which is a worse plate than the
   *  one it was fixing. The measured defect is a 540px one, so the correction is too. */
  const furniture = SIZE === "landscape" ? [] : [
    ...yTicks.map((t) => {
      const text = set(String(t), axis);
      const w = widthOf(text, axis);
      return {
        x: plot.left - 8 - w,
        y: y(t) + axis.fontSize * 0.35 - axisBand.ascent,
        width: w,
        height: axisBand.ascent + axisBand.descent,
      };
    }),
    ...xTicks.map((t) => {
      const text = set(tick(t), axis);
      const w = widthOf(text, axis);
      return {
        x: x(t) - w / 2,
        y: plot.bottom + axis.fontSize * 1.7 - axisBand.ascent,
        width: w,
        height: axisBand.ascent + axisBand.descent,
      };
    }),
    {
      x: PAD,
      y: plot.top - annot.fontSize * 1.2 - axisBand.ascent,
      width:
        widthOf(set(yName, axis), axis) + widthOf(` ${set(yQualifier, axis)}`, axis),
      height: axisBand.ascent + axisBand.descent,
    },
    {
      x: plot.left,
      y: plot.bottom + axis.fontSize * 3.1 - axisBand.ascent,
      width:
        widthOf(set(xName, axis), axis) + widthOf(` ${set(xQualifier, axis)}`, axis),
      height: axisBand.ascent + axisBand.descent,
    },
  ];
  const marks = [
    ...pairs.map((p) => ({
      x: x(p.x) - MARK_RADIUS,
      y: y(p.y) - MARK_RADIUS,
      width: MARK_RADIUS * 2,
      height: MARK_RADIUS * 2,
    })),
    ...furniture,
  ];

  const { placed, dropped } = placeLabels(
    requests.map(({ id, treatment, text, at, anchors, priority }) => ({
      id,
      treatment,
      text,
      at,
      anchors,
      priority,
    })),
    {
      frame: {
        left: plot.left,
        top: plot.top - annot.fontSize * 1.6,
        right: width - PAD,
        bottom: plot.bottom,
      },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const lines = text.split("\n");
        const b = bandOf(request.register);
        return {
          width: Math.max(...lines.map((l) => widthOf(l, request.register))),
          height:
            b.ascent + b.descent + (lines.length - 1) * leadOf(request.register),
        };
      },
      avoid: marks,
    },
  );
  if (dropped.length)
    console.log(
      `  arbiter dropped ${dropped.length}: ` +
        dropped.map((d) => `${d.id} (${d.why})`).join("; "),
    );
  const byId = new Map(placed.map((p) => [p.id, p]));

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });

  /** A granted box is drawn from ITS OWN TOP, one lead a line. For a single run every anchor agrees
   *  with the per-anchor baseline — `above` holds the bottom edge and the box is exactly one band
   *  tall — so landscape is untouched; for a stacked pair only the top edge is a fixed point. */
  const claimAt = (id: string) => {
    const p = byId.get(id);
    if (!p) return null;
    return p.text.split("\n").map((l: string, i: number) => (
      <text
        key={`${id}-${i}`}
        x={p.box.x}
        y={p.box.y + bandOf(annot).ascent + i * annotLead}
        fill={claimInk}
        fontFamily={annot.fontFamily}
        fontSize={annot.fontSize}
        fontWeight={annot.fontWeight}
        fontStyle={annot.fontStyle}
        letterSpacing={annot.letterSpacing}
      >
        {l}
      </text>
    ));
  };

  /** The axis name and its qualifier: one size, weight apart. Three publications.
   *  The gap between them is a NO-BREAK space: SVG collapses leading whitespace inside a `tspan`,
   *  so a plain one produced `PIB par habitant(échelle logarithmique)` on the first render. */
  const qualified = on("apparatus-is-one-size-and-weight-separates-it");
  const nameWeight = qualified
    ? Math.max(axis.fontWeight, 700)
    : axis.fontWeight;
  const qualifierWeight = qualified ? 400 : axis.fontWeight;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {titleLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={l + i} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={y(t)}
            y2={y(t)}
            stroke={grid}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={plot.left - 8}
            y={y(t) + axis.fontSize * 0.35}
            textAnchor="end"
            {...line(axis)}
          >
            {set(String(t), axis)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={`x${t}`}
          x={x(t)}
          y={plot.bottom + axis.fontSize * 1.7}
          textAnchor="middle"
          {...line(axis)}
        >
          {set(tick(t), axis)}
        </text>
      ))}

      {/* THE BREAK AND ITS TWO BANDS. The accent goes here because this beat names no subject:
          `PALETTE.md` reserves it and spends none of it on a country, so the only thing on the
          plate that is a claim rather than an observation gets it. */}
      {drawBreak && (
        <>
          <rect
            x={breakX!}
            y={y(spread!.above.hi)}
            width={plot.right - breakX!}
            height={y(spread!.above.lo) - y(spread!.above.hi)}
            fill={direction.accent}
            fillOpacity={0.09}
          />
          <line
            x1={breakX!}
            x2={breakX!}
            y1={plot.top}
            y2={plot.bottom}
            stroke={claimInk}
            strokeWidth={direction.stroke.series}
          />
        </>
      )}

      {pairs.map((p, i) => (
        <circle
          key={i}
          cx={x(p.x)}
          cy={y(p.y)}
          r={MARK_RADIUS}
          fill={muted}
          fillOpacity={MARK_OPACITY}
        />
      ))}

      {claimAt("break")}
      {claimAt("below")}
      {claimAt("above")}

      {/* The axis name, and its qualifier at the same size in a lighter weight. */}
      <text
        x={plot.left}
        y={plot.bottom + axis.fontSize * 3.1}
        {...line(axis)}
        fontWeight={nameWeight}
        fill={muted}
      >
        {set(xName, axis)}
        <tspan
          fontWeight={qualifierWeight}
        >{`\u00a0${set(xQualifier, axis)}`}</tspan>
      </text>
      <text
        x={PAD}
        y={plot.top - annot.fontSize * 1.2}
        {...line(axis)}
        fontWeight={nameWeight}
        fill={muted}
      >
        {set(yName, axis)}
        <tspan
          fontWeight={qualifierWeight}
        >{`\u00a0${set(yQualifier, axis)}`}</tspan>
      </text>
    </svg>
  );
}
