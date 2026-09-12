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
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";
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
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<
    string,
    string
  >;
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
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

  // ── header ────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = display.fontSize * 1.22;
  const limitLines = wrap(set(limits, body), column, body);
  const bodyLead = body.fontSize * 1.45;
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + body.fontSize * 0.6;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  const plot = {
    left: PAD + widthOf("00", axis) + 16,
    right: width - PAD,
    top: limitsTop + limitLines.length * bodyLead + annot.fontSize * 2.4,
    // Two rows below the plot in the axis register: the ticks, then the axis name with its
    // qualifier beside it.
    bottom: sourceTop - body.fontSize * 1.6 - axis.fontSize * 3.4,
  };

  const xs = pairs.map((p) => p.x);
  const ys = pairs.map((p) => p.y);
  const x = scaleLog()
    .domain([Math.min(...xs) * 0.9, Math.max(...xs) * 1.1])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([
      Math.floor(Math.min(...ys) / 10) * 10,
      Math.ceil(Math.max(...ys) / 10) * 10,
    ])
    .range([plot.bottom, plot.top]);
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

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = drawBreak
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

  /** Every point is a mark. A cloud of 165 is what an annotation has to clear. */
  const marks = pairs.map((p) => ({
    x: x(p.x) - MARK_RADIUS,
    y: y(p.y) - MARK_RADIUS,
    width: MARK_RADIUS * 2,
    height: MARK_RADIUS * 2,
  }));

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
        const b = measureTextBand(text, sizeOf(request.register));
        return {
          width: widthOf(text, request.register),
          height: b.ascent + b.descent,
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

  const claimAt = (id: string) => {
    const p = byId.get(id);
    if (!p) return null;
    return (
      <text
        key={id}
        x={p.box.x}
        y={baselineOf(p, annot)}
        fill={claimInk}
        fontFamily={annot.fontFamily}
        fontSize={annot.fontSize}
        fontWeight={annot.fontWeight}
        fontStyle={annot.fontStyle}
        letterSpacing={annot.letterSpacing}
      >
        {p.text}
      </text>
    );
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
