/**
 * The 2023 spread of national CO₂ footprints, drawn THROUGH the design base.
 *
 * The fourth component in this tree to do that, after a line, a bridge and a mirrored pyramid. A
 * histogram is the first of the four whose bars are INTERVALS rather than entities, which is what
 * makes it a useful fourth: the register that carries an axis has to name a range, not a point.
 *
 * Its sibling `CarbonFootprintHistogram.tsx` declares its own typography. This file declares none.
 *
 * WHAT THE HARVEST DECIDED.
 *
 * `bin-named-by-both-edges-and-an-open-top` (two publications) — Figure.NZ writes
 * `$10,001-$20,000`, and the `,001` states which side of $10,000 a reader on exactly $10,000 falls;
 * PopulationPyramid.net writes `0-4` … `100+`. The continuous value axis this beat had —
 * `0 4 8 … 40` — is the axis of the VARIABLE, and a tick under a boundary tells a reader where the
 * boundary is without telling them which bar owns it.
 *
 * `share-on-the-declared-side-of-a-threshold` (derived) — the title asserts *six in ten countries
 * emit under 4 tonnes*, `BRIEF.md` states 127 of 213, and the plate drew a median at 3.1 and
 * neither the four-tonne line nor the sixty per cent. The threshold is the beat's editorial
 * judgement and is declared; the share is arithmetic over the same array the bins were counted from.
 *
 * AND THE SEPARATION BETWEEN BINS IS A RATIO, NOT A CONSTANT. Measured across the family: no
 * form-correct record draws its bins edge-to-edge, two publications hold a hairline and one holds a
 * third of the bar. A flat one-pixel shave is 0.6 % of a 155 px bar and leaves the bins
 * uncountable, which is the thing the hairline buys.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080, read from `BRIEF.md`. */
const FRAME = { width: 960, height: 540 };
const Y_TICK_HINT = 5;

/**
 * How much of a bar is given up to separate it from its neighbour, as a FRACTION of the bar.
 * Two publications hold a hairline (2–4 % and 7–13 %), one holds a third of the bar at two sizes,
 * and the proposal's ceiling is about a tenth. Three per cent is inside both hairlines.
 */
const BIN_SEPARATION = 0.03;

export type Bin = { lo: number; hi: number; count: number; open?: boolean };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedHistogram({
  bins,
  unit,
  threshold,
  thresholdCount,
  thresholdTotal,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
}: {
  bins: Bin[];
  unit: string;
  threshold: number;
  thresholdCount: number;
  thresholdTotal: number;
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
  const value = reg("value");

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

  /** A bin's name, from the treatment: both edges, and an inequality where the tail is open. */
  const nameOf = (b: Bin) => (b.open ? `${b.lo}+` : `${b.lo}–${b.hi}`);
  const labelled = on("bin-named-by-both-edges-and-an-open-top");

  const plot = {
    left:
      PAD + Math.max(...bins.map((b) => widthOf(String(b.count), axis))) + 26,
    right: width - PAD,
    top: limitsTop + limitLines.length * bodyLead + annot.fontSize * 2.6,
    // Room for BOTH rows the axis register sets below the plot: the bin names at 1.7 lines and the
    // unit at 3.3. A first version reserved 2.2 and drew at 3.2, so the unit sat on the source line.
    bottom: sourceTop - body.fontSize * 1.6 - axis.fontSize * 4,
  };

  const most = Math.max(...bins.map((b) => b.count));
  const counts = scaleLinear()
    .domain([0, most])
    .nice(Y_TICK_HINT)
    .range([plot.bottom, plot.top]);
  const ticks = counts.ticks(Y_TICK_HINT);
  const band = (plot.right - plot.left) / bins.length;

  const bars = bins.map((b, i) => {
    const x = plot.left + band * i;
    const w = band - Math.max(1, band * BIN_SEPARATION);
    return {
      ...b,
      x,
      w,
      centre: x + w / 2,
      y: counts(b.count),
      h: plot.bottom - counts(b.count),
    };
  });

  /** Where the declared threshold falls on the bin axis: the boundary between the bins it splits. */
  const cut = on("share-on-the-declared-side-of-a-threshold")
    ? (() => {
        const at = bins.findIndex((b) => threshold <= b.hi);
        if (at < 0) return null;
        const b = bins[at];
        const within = (threshold - b.lo) / (b.hi - b.lo);
        return { x: plot.left + band * at + band * within };
      })()
    : null;

  const shareText = `${thresholdCount} pays sur ${thresholdTotal} sous ${threshold} ${unit}`;

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = cut
    ? [
        {
          id: "share",
          treatment: "share-on-the-declared-side-of-a-threshold",
          text: set(shareText, annot),
          at: { x: cut.x + 14, y: plot.top + annot.fontSize * 1.2 },
          priority: 8,
          register: annot,
        },
      ]
    : [];

  const marks = bars.map((b) => ({
    x: b.x,
    y: b.y,
    width: b.w,
    height: Math.max(b.h, 1),
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
        top: plot.top - annot.fontSize,
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

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={counts(t)}
            y2={counts(t)}
            stroke={t === 0 ? muted : grid}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={plot.left - 10}
            y={counts(t) + axis.fontSize * 0.35}
            textAnchor="end"
            {...line(axis)}
          >
            {set(String(t), axis)}
          </text>
        </g>
      ))}

      {bars.map((b) => (
        <rect
          key={b.lo}
          x={b.x}
          y={b.y}
          width={b.w}
          height={Math.max(b.h, 0)}
          fill={muted}
        />
      ))}

      {/* THE BIN NAMES THEMSELVES. Both edges, and the open tail as an inequality — never a
          continuous value axis, which is the axis of the variable rather than of the bars. */}
      {labelled &&
        bars.map((b) => (
          <text
            key={`name-${b.lo}`}
            x={b.centre}
            y={plot.bottom + axis.fontSize * 1.7}
            textAnchor="middle"
            {...line(axis)}
          >
            {set(nameOf(b), axis)}
          </text>
        ))}

      {/* THE DECLARED THRESHOLD, AND THE SHARE ON THE SIDE THE BEAT IS ABOUT. */}
      {cut && byId.get("share") && (
        <>
          <line
            x1={cut.x}
            x2={cut.x}
            y1={plot.top - annot.fontSize * 0.4}
            y2={plot.bottom}
            stroke={adjustToContrast(
              direction.accent,
              direction.ground,
              TEXT_CONTRAST_MIN,
            )}
            strokeWidth={direction.stroke.series}
          />
          <text
            x={byId.get("share")!.box.x}
            y={baselineOf(byId.get("share")!, annot)}
            fill={adjustToContrast(
              direction.accent,
              direction.ground,
              TEXT_CONTRAST_MIN,
            )}
            fontFamily={annot.fontFamily}
            fontSize={annot.fontSize}
            fontWeight={annot.fontWeight}
            fontStyle={annot.fontStyle}
            letterSpacing={annot.letterSpacing}
          >
            {byId.get("share")!.text}
          </text>
        </>
      )}

      <text
        x={plot.left}
        y={plot.bottom + axis.fontSize * 3.3}
        {...line(axis)}
        fill={muted}
      >
        {set(unit, axis)}
      </text>
    </svg>
  );
}
