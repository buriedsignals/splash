/**
 * Switzerland's annual CO₂ emissions, 1858–2024, drawn as a FILLED AREA through the design base.
 * The first `area` component in this tree.
 *
 * WHAT A FILLED AREA SAYS THAT A LINE DOES NOT, AND WHAT IT OWES FOR SAYING IT.
 * A line carries a rate: how much in this year, and which way it is going. Filling it adds exactly
 * one claim — that the surface between the curve and the baseline is a QUANTITY, the stock the rate
 * accumulates to. That claim has a price, and it is not negotiable:
 *
 *   **The baseline is zero, or the fill measures nothing.** A line may be drawn over a clipped axis
 *   because the slope carries the reading and the axis says where it starts; the sibling line beat
 *   `proof/co2-suisse` does exactly that, and its BRIEF refuses a forced zero in as many words. The
 *   moment the same series is filled, every one of those clipped tonnes becomes surface a reader
 *   integrates. This component throws rather than draw one pixel over a non-zero base.
 *
 *   **A gap is filled in silently.** The polygon closes across a missing year, and the reader
 *   integrates a value nobody measured. `render-directions.mjs` refuses a series with a gap in it.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` (Datawrapper, Statista) — the plate cuts
 * the surface at the year the total reaches its midpoint. Those are two states of ONE quantity, not
 * two categories, so they are one hue at two chromas of the direction's own accent.
 *
 * `accent-marks-the-thread` — the accent is spent on the surface, which is the subject. The rule at
 * the midpoint, the axis and the baseline are neutrals.
 *
 * `direct-end-label-in-the-series-colour` — the last reading is written at the end of the curve, in
 * the surface's own colour, rather than left to the axis. `the-target-is-named-on-the-line-that-
 * draws-it` — the midpoint year is written on the rule that marks it, not in a legend.
 *
 * `raw-under-smoothed` is offered here and is NOT taken: a smoothed mean drawn over a filled area
 * would be a second curve bounding a surface it does not bound, and the reading is the surface.
 *
 * THE ONE RULE THIS BEAT TAKES FROM THE SINGLE REFERENCE FILED UNDER ITS FORM (Ferdio's #34, which
 * draws paired triangles rather than a time series): **let a guide rule stop at the data's own
 * extent rather than spanning the frame.** The midpoint rule rises from the baseline to the curve
 * and stops there. Everything else this plate does comes from the `line` and `streamgraph` families,
 * which are evidenced, and the BRIEF says so.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, contrast, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Reading = { year: number; mt: number };
export type Half = { from: number; to: number; share: number; years: number };

export function DirectedArea({
  readings,
  halves,
  midpoint,
  peak,
  last,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  readings: Reading[];
  halves: Half[];
  midpoint: number;
  peak: Reading;
  last: Reading;
  unit: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  /** THE FORM THE FRAME ASKS FOR, read off the frame rather than passed in, so one component serves
   *  the three export sizes without the runner having to tell it which it is drawing. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;

  const reg = (name: RegisterName) => registerOf(direction, name);
  const on = (id: string) => treatments.includes(id);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    return out;
  }

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);
  const valueBand = bandOf(value);

  /** ONE HUE, TWO CHROMAS. The earlier half is a tint of the direction's own accent, taken as far
   *  toward the ground as it can go while still clearing the non-text floor against that ground —
   *  the two halves have to read as two states of one quantity, and a tint nobody can see is not a
   *  state, it is a hole in the surface. */
  const full = direction.accent;
  let tint = mix(direction.accent, direction.ground, 0.62);
  if (contrast(tint, direction.ground) < NON_TEXT_CONTRAST_MIN) {
    const lifted = adjustToContrast(tint, direction.ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `the tinted half of the surface cannot be told from the ground: nothing between the ` +
          `direction's accent and its poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ` +
          `${direction.ground}.`,
      );
    tint = lifted;
  }
  const rule = mix(direction.ground, ink, 0.55);
  const baseline = mix(direction.ground, ink, 0.75);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  /** THE PLOT'S OWN FLOOR. An area is read by comparing surfaces, and a surface flattened into a
   *  band is not compared, it is glanced at. The floor is stated in the plate's own terms: the
   *  drawn plot must be at least six axis-bands tall — room for a zero, a top tick, and four bands
   *  of curve between them. */
  /** AND WHY THE FLOOR IS ALSO A SHARE OF THE FRAME AT A SQUARE OR TALL ONE. Six axis bands is 63px,
   *  and at 540 x 540 the ladder stopped at its very first rung: it kept the four-line headline and
   *  the four-line standfirst, handed the surface 64px, and drew a 7:1 strip under half a frame of
   *  type — measured 2026-09-23 on creme-square and nocturne-square. Nothing fired, because 64 is
   *  more than 63. A floor stated as a share of the frame is what makes the ladder descend: the
   *  surface owes 30 % of the height it is drawn in, so the headline shortens instead of the chart.
   *  Landscape keeps the six-band floor exactly — its accepted renders sit at 126-198px in a 540
   *  frame, which 30 % would have refused. */
  const plotOwes = Math.max(
    (axisBand.ascent + axisBand.descent) * 6,
    SIZE === "landscape" ? 0 : height * 0.3,
  );

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop =
      sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const plotTop =
      limitsTop +
      limitLines.length * bodyLead +
      gapOf(annot, 0.4286) +
      annotBand.ascent * 2.2;
    const plotBottom =
      (readingLines.length
        ? readingTop - annotBand.ascent - gapOf(annot, 0.6429)
        : sourceTop - bodyLead * 1.2) -
      axisBand.ascent -
      axisBand.descent -
      8;
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      readingTop,
      sourceTop,
      plotTop,
      plotBottom,
      plot: plotBottom - plotTop,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.plot > best) best = l.plot;
    if (l.plot >= plotOwes) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves the surface ${best.toFixed(0)}px of height and a surface a reader compares ` +
        `owes ${plotOwes.toFixed(0)}px. An area flattened into a band is glanced at, not read.`,
    );
  const layout = fits.layout;

  // ── the scales ────────────────────────────────────────────────────────────
  const top = Math.max(...readings.map((r) => r.mt));
  const yTicks = [0, Math.round(top / 2 / 5) * 5, Math.round(top / 5) * 5].filter(
    (v, i, all) => all.indexOf(v) === i && v <= top * 1.08,
  );
  const gutter = Math.max(...yTicks.map((t) => widthOf(set(String(t), axis), axis))) + 8;
  const x = scaleLinear()
    .domain([readings[0].year, last.year])
    .range([PAD + gutter, width - PAD]);
  /** ZERO IS IN THE DOMAIN, AND THE COMPONENT REFUSES IF IT IS NOT. This is the one line that
   *  separates a filled area from a decorated line, and it is written as a check rather than as a
   *  comment because a comment does not fail. */
  const yDomain = [0, top * 1.08];
  if (yDomain[0] !== 0)
    throw new Error(
      `a filled area drawn over a baseline of ${yDomain[0]} claims a surface the data does not ` +
        `have. Either the base is zero or the fill measures nothing.`,
    );
  /** THE PLOT IS NEVER TALLER THAN IT IS WIDE, AND ONLY A TALL FRAME CAN MAKE IT SO.
   *
   *  `type-at-size.mjs` has no measured range for `area`, so nothing clamped this plot and at
   *  1080x1920 it came out 394 x 466 in component units — 0.85:1. A hundred and sixty-seven years
   *  of a series whose whole growth sits in its last seventy then read as a wall rather than as a
   *  rise and a fall. That is the probe's finding #1 exactly: nothing was clipped, nothing
   *  collided, and the shape was wrong. The rule is stated in the plate's own terms rather than
   *  borrowed from `line`'s range, whose own floor this repo distrusts in writing: the surface
   *  keeps its width and REFUSES height beyond it, and the slack is split above and below so the
   *  drawing sits where a reader expects rather than hanging off the standfirst. Landscape is
   *  untouched — its plots are 5:1 and wider, nowhere near the cap. */
  const plotWidthAt = width - PAD - (PAD + gutter);
  const naturalPlot = layout.plotBottom - layout.plotTop;
  const slack =
    SIZE === "landscape"
      ? 0
      : Math.max(0, naturalPlot - Math.max(plotOwes, Math.min(naturalPlot, plotWidthAt)));
  const plotTop = layout.plotTop + slack / 2;
  const plotBottom = layout.plotBottom - slack / 2;

  const y = scaleLinear().domain(yDomain).range([plotBottom, plotTop]);

  const pathFor = (span: Reading[]) => {
    const head = span.map((r) => `${x(r.year).toFixed(1)} ${y(r.mt).toFixed(1)}`).join(" L ");
    return (
      `M ${x(span[0].year).toFixed(1)} ${y(0).toFixed(1)} L ${head} ` +
      `L ${x(span[span.length - 1].year).toFixed(1)} ${y(0).toFixed(1)} Z`
    );
  };
  /** The two surfaces share the year at the cut, so the cut is a line and not a seam of bare ground:
   *  the earlier half runs up to and including the midpoint year, the later half starts there. */
  const earlier = readings.filter((r) => r.year <= midpoint);
  const later = readings.filter((r) => r.year >= midpoint);

  const xTicks = readings
    .map((r) => r.year)
    .filter((yr, i, all) => yr % 25 === 0 || i === 0 || i === all.length - 1);

  /** A TICK LADDER, because a count tuned at 960px wide is not a count that fits at 540. Each label
   *  is measured where it will actually sit — the first year reads from its tick, the last back to
   *  it, the rest are centred — and a middle tick whose run would touch one already kept is dropped
   *  rather than printed through it. The two anchors are placed first and never go: they are what
   *  say where the series starts and ends. Measured at square, where « 1858 » and « 1875 » ran
   *  together at the left end. */
  const tickSpan = (yr: number): [number, number] => {
    const w = widthOf(set(String(yr), axis), axis);
    const at = x(yr);
    if (yr === readings[0].year) return [at, at + w];
    if (yr === last.year) return [at - w, at];
    return [at - w / 2, at + w / 2];
  };
  const anchorYears = [readings[0].year, last.year];
  const keptTicks = [...anchorYears];
  for (const yr of xTicks) {
    if (anchorYears.includes(yr)) continue;
    const [l, r] = tickSpan(yr);
    const clashes = keptTicks.some((k) => {
      const [kl, kr] = tickSpan(k);
      return l < kr + 6 && r > kl - 6;
    });
    if (!clashes) keptTicks.push(yr);
  }
  keptTicks.sort((a, b) => a - b);

  /** THE LAST READING'S SEAT, measured HERE rather than where it is drawn, because the value axis
   *  has to know about it. The seat clears the CURVE; nothing made it clear the axis's own
   *  hairlines, which are drawn the full width of the plot and ran straight through « 32,1 Mt » in
   *  nocturne. Lifting the label off the line is not available — above the 20 Mt rule there is no
   *  room left under `plotTop` — and dropping it below puts it back inside the surface it is
   *  labelling. So the LINE gives way: a gridline the label's band straddles stops short of it,
   *  which is the same answer this component already gives the subject's own marker below. */
  const endLabel = on("direct-end-label-in-the-series-colour")
    ? (() => {
        const label = `${last.mt.toFixed(1).replace(".", ",")} Mt`;
        const w = widthOf(set(label, value), value);
        const covered = readings.filter((r) => x(r.year) >= x(last.year) - w - 6);
        const crest = Math.min(...covered.map((r) => y(r.mt)));
        const above = crest - valueBand.descent - 7;
        const clears = above - valueBand.ascent >= plotTop;
        return {
          label,
          clears,
          baseline: clears ? above : y(last.mt) + valueBand.ascent + 9,
          left: x(last.year) - w,
        };
      })()
    : null;

  /** Where a horizontal rule must stop so it does not cross that label. */
  const ruleEnd = (at: number) =>
    endLabel !== null &&
    at > endLabel.baseline - valueBand.ascent - 2 &&
    at < endLabel.baseline + valueBand.descent + 2
      ? Math.max(PAD + gutter, endLabel.left - 6)
      : width - PAD;

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · plot ${layout.plot.toFixed(0)}px, floor ${plotOwes.toFixed(0)}px · ${readings.length} years`,
  );

  /** EACH HALF IS NAMED INSIDE ITSELF WHERE IT FITS. The label goes at the half's own widest,
   *  tallest place — measured, not guessed — and only if the surface there is taller than the label
   *  and the half wider. A half too small for its name is named above the plot instead of being
   *  written over a surface that cannot hold it. */
  const seatFor = (span: Reading[], label: string) => {
    const w = widthOf(set(label, annot), annot);
    const h = annotBand.ascent + annotBand.descent;
    let seat: { x: number; y: number } | null = null;
    let room = 0;
    for (const r of span) {
      const left = x(r.year) - w / 2;
      const right = x(r.year) + w / 2;
      if (left < x(span[0].year) + 2 || right > x(span[span.length - 1].year) - 2) continue;
      const covered = span.filter((s) => x(s.year) >= left && x(s.year) <= right);
      const lowest = Math.min(...covered.map((s) => s.mt));
      const headroom = y(0) - y(lowest);
      if (headroom > room) {
        room = headroom;
        seat = { x: x(r.year), y: y(0) - headroom / 2 + h / 2 - annotBand.descent };
      }
    }
    return seat && room >= h * 1.8 ? seat : null;
  };
  const halfSeats = halves.map((half, i) => {
    const span = i === 0 ? earlier : later;
    const label = `${half.from}–${half.to} · ${half.share.toFixed(1).replace(".", ",")} %`;
    return { half, label, seat: seatFor(span, label), i };
  });

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

      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {/* THE UNIT, once, above the plot — the axis prints numbers and the numbers need a noun. */}
      <text x={PAD} y={plotTop - annotBand.descent - 5} {...line(annot)} fill={mutedInk}>
        {set(unit, annot)}
      </text>

      {/* THE VALUE AXIS. It is admissible here for the reason `a-free-baseline-forbids-a-value-axis`
          makes it inadmissible on the streamgraph: this baseline is not free, it is zero. */}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={PAD + gutter}
            x2={ruleEnd(y(t))}
            y1={y(t)}
            y2={y(t)}
            stroke={t === 0 ? baseline : mix(direction.ground, ink, 0.12)}
            strokeWidth={t === 0 ? direction.stroke.rule : direction.stroke.hairline}
          />
          <text
            x={PAD + gutter - 6}
            y={y(t) + axisBand.ascent / 2}
            textAnchor="end"
            {...line(axis)}
            fill={mutedInk}
          >
            {set(String(t), axis)}
          </text>
        </g>
      ))}

      {/* THE SURFACE, cut at the year the total reaches its midpoint. Two states of one quantity,
          one hue, two chromas. */}
      <path d={pathFor(earlier)} fill={tint} />
      <path d={pathFor(later)} fill={full} />

      {/* THE RULE STOPS AT THE DATA'S OWN EXTENT — the one rule this form's single filed reference
          contributes, and the reason the plate does not carry a full-height gridline here. */}
      <line
        x1={x(midpoint)}
        x2={x(midpoint)}
        y1={y(0)}
        y2={y(readings.find((r) => r.year === midpoint)!.mt) - 6}
        stroke={rule}
        strokeWidth={direction.stroke.rule}
      />
      <text
        x={x(midpoint)}
        y={y(readings.find((r) => r.year === midpoint)!.mt) - 10}
        textAnchor="middle"
        {...line(value)}
        fill={adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN)}
      >
        {set(String(midpoint), value)}
      </text>

      {halfSeats.map(({ label, seat, i }) =>
        seat ? (
          <text
            key={`h${i}`}
            x={seat.x}
            y={seat.y}
            textAnchor="middle"
            {...line(annot)}
            fill={i === 0 ? adjustToContrast(ink, tint, TEXT_CONTRAST_MIN) : adjustToContrast(direction.ground, full, TEXT_CONTRAST_MIN)}
          >
            {label}
          </text>
        ) : null,
      )}

      {/* THE LAST READING, AT THE END OF THE CURVE, IN THE SURFACE'S OWN COLOUR — a reader who wants
          today's number should not have to take it off an axis. The seat is measured against the
          CURVE over the label's own width, not against the endpoint: written at the endpoint's
          height the number lay inside the surface, where the series colour is the fill's colour and
          the number vanishes into what it labels. */}
      {endLabel !== null && (
        <g>
          <circle
            cx={x(last.year)}
            cy={y(last.mt)}
            r={2.4}
            fill={endLabel.clears ? accentInk : direction.ground}
          />
          <text
            x={x(last.year)}
            y={endLabel.baseline}
            textAnchor="end"
            {...line(value)}
            fill={
              endLabel.clears
                ? accentInk
                : adjustToContrast(direction.ground, full, TEXT_CONTRAST_MIN)
            }
          >
            {set(endLabel.label, value)}
          </text>
        </g>
      )}

      {keptTicks.map((t) => (
        <text
          key={`x${t}`}
          x={x(t)}
          y={plotBottom + 8 + axisBand.ascent}
          textAnchor={t === readings[0].year ? "start" : t === last.year ? "end" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(t), axis)}
        </text>
      ))}

      {layout.readingLines.map((l, i) => (
        <text
          key={`r${i}`}
          x={PAD}
          y={layout.readingTop + i * annotLead}
          {...line(annot)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {layout.sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={layout.sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
    </svg>
  );
}
