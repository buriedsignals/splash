/**
 * Germany's 2015→2024 electricity bridge, drawn THROUGH the design base.
 *
 * This is the second component in the tree to do that, and the first that is not a line. Its
 * sibling `ElectricityBridgeWaterfall.tsx` declares its own typography — `TITLE = { fontSize: 24,
 * fontWeight: 700 }` and six more tokens, a size ladder, a legend geometry — and every one of those
 * constants is a decision somebody took once and copied. This file declares none of them. It asks a
 * DIRECTION what each register looks like and never learns the answer, exactly as
 * `co2-suisse/DirectedLine.tsx` does, which is the whole point: if the chain only holds for a line
 * it is not a chain, it is one chart.
 *
 * WHAT THE HARVEST DECIDED, AND WHAT IT REFUSED TO DECIDE.
 *
 * `total-is-a-role-not-a-series` (four references, two publications) — the bars that state a LEVEL
 * share one fill and no step uses it. Datawrapper spends a neutral `#4A606C` on its four levels,
 * 12.196 % and the largest painted area on the plate; the IEA spends a hue. Here the levels take the
 * furniture's own `muted`, derived from whatever ground the direction brought.
 *
 * `sign-is-direction-and-hue-only-doubles-it` — imported from the diverging-bar harvest with its
 * reasoning, not its geometry. Four publications, two answers: ONS and Our World in Data give one
 * hue to both signs, Statista and Datawrapper split. The rule the corpus states is *direction
 * carries the sign; a second hue is a redundancy you buy when the reader cannot hold the whole plate
 * in one look*. Five bars is one look. So every step is the direction's single accent, and the sign
 * is carried by the bar's own travel and by the written `+` or `−` — which also makes
 * `up-and-down-are-not-red-and-green` vacuous rather than obeyed by luck.
 *
 * `signed-label-outside-the-bar` (four references, two publications) — the delta label sits outside
 * the growing edge, in the step's own colour; the level labels are ink. And the floor holds over the
 * treatment: `adjustToContrast` keeps the accent's hue and darkens it until it clears the text floor
 * on the direction's own ground, because two of the three filed directions carry an accent that does
 * not clear it as drawn.
 *
 * THE LABELS GO THROUGH THE ARBITER. Five value labels and five category names cannot each place
 * themselves: a waterfall's steps float, so a label above a step that fell is inside the step above
 * it. Nothing here chooses a position; `placeLabels` does, and it is told the bars are marks.
 */

import { scaleLinear } from "d3-scale";
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

/**
 * THE FRAME IS THE ONE THE BEAT PINS, not the one its model happened to use.
 *
 * A first version copied `co2-suisse/DirectedLine.tsx`'s 900 × 560 verbatim and rendered at scale 2,
 * delivering 1800 × 1120. This beat's `BRIEF.md` pins `landscape`, which is 1920 × 1080, and
 * `delivered-size-matches-the-pin` caught all three directions at once — a guard reading the bytes
 * of the file rather than the arguments that produced it. 960 × 540 at scale 2 lands on the pin
 * exactly, and keeps the type tuning the directions were measured at.
 */
const FRAME = { width: 960, height: 540 };
const Y_TICK_HINT = 5;

export type Step = {
  label: string;
  value: number;
  kind: "total" | "increase" | "decrease";
};

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

/** One decimal on every bar, never `toLocaleString`'s own idea of how many a value needs — and the
 *  French decimal comma the rest of this plate's copy is written in. It read `639.2` under a
 *  headline reading `L'Allemagne a produit 143 TWh d'électricité de moins`, which is the plate
 *  speaking two languages about the same number. */
const oneDecimal = (v: number) =>
  v.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/**
 * Levels and steps, walked once, so the running total is computed in exactly one place and the
 * geometry cannot disagree with the arithmetic `render.mjs` already checked.
 */
export function bridgeGeometry(
  steps: Step[],
  plot: { left: number; right: number; top: number; bottom: number },
) {
  let running = 0;
  const raw = steps.map((s) => {
    const from = s.kind === "total" ? 0 : running;
    const to = s.kind === "total" ? s.value : running + s.value;
    if (s.kind !== "total") running = to;
    else running = s.value;
    return { ...s, from, to };
  });

  const top = Math.max(...raw.flatMap((b) => [b.from, b.to]));
  const value = scaleLinear()
    .domain([0, top])
    .nice(Y_TICK_HINT)
    .range([plot.bottom, plot.top]);
  const band = (plot.right - plot.left) / raw.length;
  const barWidth = band * 0.62;

  const bars = raw.map((b, i) => {
    const centre = plot.left + band * i + band / 2;
    const yFrom = value(b.from);
    const yTo = value(b.to);
    return {
      ...b,
      centre,
      x: centre - barWidth / 2,
      width: barWidth,
      top: Math.min(yFrom, yTo),
      bottom: Math.max(yFrom, yTo),
      /** Where a label outside the growing edge goes: above a rise, below a fall. */
      edge: b.to >= b.from ? Math.min(yFrom, yTo) : Math.max(yFrom, yTo),
      rises: b.to >= b.from,
    };
  });

  return { bars, value, ticks: value.ticks(Y_TICK_HINT), barWidth };
}

export function DirectedWaterfall({
  steps,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  frame,
}: {
  steps: Step[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  /** The ids `applicableTreatments` returned for this beat's data shape. A treatment absent from
   *  this list is not drawn — the data decides, never the component. */
  treatments: string[];
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

  /**
   * TRACKING IS WIDTH, AND `measureText` DOES NOT KNOW ABOUT IT.
   *
   * Its options are `{ fontSize, fontWeight, fontFamily }` — there is nowhere to put a letter
   * spacing, so a tracked run measures as though it were set solid and every consumer under-counts
   * it by `tracking × (characters − 1)`. Measured on this beat: `nocturne` sets its display at 32 px
   * with 3.4 of tracking and uppercases it, and the first render pushed `D'ÉLECTRICITÉ` off the
   * right edge of the frame because the wrap thought the line still fitted.
   *
   * Every width this component takes goes through here, so the correction is applied once rather
   * than at each call site — which is the same reason the registers exist at all.
   */
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

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

  // ── the header block, measured off its own registers ──────────────────────
  const column = width - PAD * 2;
  /** The gap under the eyebrow is measured against the DISPLAY that follows it: a 9.5 px eyebrow
   *  leading a 32 px title by one and a half of its own sizes puts the title's ascenders through
   *  it, which is what the first render of this beat did. */
  const eyebrowLead = gapOf(eyebrowReg, EYEBROW_TO_DISPLAY);
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = leadOf(display);
  const limitLines = wrap(set(limits, body), column, body);
  const bodyLead = leadOf(body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop = eyebrowBaseline + eyebrowLead + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceLines = wrap(set(source, body), column, body);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  const plot = {
    left: PAD + widthOf("000", axis) + 12,
    right: width - PAD,
    top: limitsTop + limitLines.length * bodyLead + gapOf(body, 0.9655),
    bottom: sourceTop - gapOf(body, 0.8276) - gapOf(annot, 1.7143),
  };

  const { bars, value: scale, ticks } = bridgeGeometry(steps, plot);

  /** The delta hue, held to the text floor on THIS direction's ground. A `#4FE0C0` on `#111044`
   *  clears it comfortably; a `#1757B6` on `#FFFCEE` does not, and the label is darkened rather
   *  than the treatment abandoned. */
  const deltaInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );

  /** The two outer levels, and the span between them — the value
   *  `net-change-between-declared-levels` draws. Taken off the bars rather than recomputed, so the
   *  mark and the number cannot disagree about what they are comparing. */
  const levels = bars.filter((b) => b.kind === "total");
  const span =
    on("net-change-between-declared-levels") && levels.length >= 2
      ? (() => {
          const first = levels[0];
          const last = levels[levels.length - 1];
          const change = last.value - first.value;
          const topOfBoth = Math.max(first.top, last.top);
          return {
            change,
            // The INNER edges, not the centres. A rule drawn centre-to-centre starts inside the
            // level bar it is measuring from, which buries its own end ticks in the fill and makes
            // the mark read as a line crossing two bars rather than as a span between them.
            left: first.x + first.width,
            right: last.x,
            /** Below both level tops, inside the empty middle the bridge leaves. */
            y: topOfBoth + (plot.bottom - topOfBoth) * 0.42,
            text: `${change > 0 ? "+" : "−"}${oneDecimal(Math.abs(change))} TWh`,
          };
        })()
      : null;

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = [
    ...(on("value-on-the-mark")
      ? bars.map((b, i) => ({
          id: `value-${i}`,
          treatment: "value-on-the-mark",
          text: set(
            b.kind === "total"
              ? oneDecimal(b.value)
              : `${b.value > 0 ? "+" : "−"}${oneDecimal(Math.abs(b.value))}`,
            value,
          ),
          at: { x: b.centre, y: b.edge + (b.rises ? -10 : 10) },
          priority: b.kind === "total" ? 6 : 7,
          register: value,
        }))
      : []),
    ...(span
      ? [
          {
            id: "net-change",
            treatment: "net-change-between-declared-levels",
            text: set(span.text, value),
            at: { x: (span.left + span.right) / 2, y: span.y },
            priority: 8,
            register: value,
          },
        ]
      : []),
    ...bars.map((b, i) => ({
      id: `name-${i}`,
      treatment: "accent-marks-the-thread",
      text: set(b.label, annot),
      at: { x: b.centre, y: plot.bottom + annot.fontSize * 0.6 },
      // THE CATEGORY STRIP IS ONE LINE. Left to the four-anchor default, the three floating steps
      // took `above` and the two totals — whose bars run all the way to the baseline, so their
      // `above` box lands on their own mark — fell through to a side anchor, putting five labels on
      // two baselines 14px apart. Measured on the delivered SVG: 449.6 against 464.0.
      anchors: ["below"],
      priority: 3,
      register: annot,
    })),
  ];

  /** THE BARS ARE MARKS. A waterfall's steps float, so a label placed below a fall lands inside the
   *  bar beneath it unless the arbiter is told the bar occupies those pixels. */
  const marks = bars.map((b) => ({
    x: b.x,
    y: b.top,
    width: b.width,
    height: Math.max(b.bottom - b.top, 1),
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
        left: PAD,
        top: plot.top - 22,
        right: width - PAD,
        bottom: plot.bottom + annot.fontSize * 3.2,
      },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const band = measureTextBand(text, sizeOf(request.register));
        return {
          width: widthOf(text, request.register),
          height: band.ascent + band.descent,
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
  const registerById = new Map(requests.map((r) => [r.id, r.register]));

  const textAt = (id: string, fill?: string) => {
    const p = byId.get(id);
    if (!p) return null;
    const r = registerById.get(id)!;
    /** EVERY ARBITRATED LABEL BREAKS THE LINES IT CROSSES. The arbiter keeps a label off other
     *  labels and off the marks; it knows nothing about the rules, connectors and leaders that run
     *  across the plate, and a stroke through a word is not an overlap of two boxes, so no guard
     *  here could see it. The run is drawn twice: once as a halo in the ground it sits on, once as
     *  itself. */
    const glyphs = {
      x: p.box.x,
      y: baselineOf(p, r),
      fontFamily: r.fontFamily,
      fontSize: r.fontSize,
      fontWeight: r.fontWeight,
      fontStyle: r.fontStyle,
      letterSpacing: r.letterSpacing,
    };
    return (
      <g key={id}>
        <text
          {...glyphs}
          fill="none"
          stroke={direction.ground}
          strokeWidth={3.4}
          strokeLinejoin="round"
        >
          {p.text}
        </text>
        <text {...glyphs} fill={fill ?? r.fill}>
          {p.text}
        </text>
      </g>
    );
  };

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

      {/* Gridlines and their ticks in the axis register. The zero line is the one a bar grows from,
          so it takes the furniture's muted rather than the grid's. */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={scale(t)}
            y2={scale(t)}
            stroke={t === 0 ? muted : grid}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={plot.left - 8}
            y={scale(t) + axis.fontSize * 0.35}
            textAnchor="end"
            {...line(axis)}
          >
            {set(String(t), axis)}
          </text>
        </g>
      ))}

      {/* The connectors: each step starts where the last one ended, and the eye is told so. */}
      {bars.slice(0, -1).map((b, i) => {
        const next = bars[i + 1];
        const y = scale(b.kind === "total" ? b.value : b.to);
        return (
          <line
            key={`link-${i}`}
            x1={b.x + b.width}
            x2={next.x}
            y1={y}
            y2={y}
            stroke={grid}
            strokeWidth={direction.stroke.rule}
            strokeDasharray="2 3"
          />
        );
      })}

      {/* Levels share one fill and no step uses it; every step is the direction's accent. */}
      {bars.map((b, i) => (
        <rect
          key={`bar-${i}`}
          x={b.x}
          y={b.top}
          width={b.width}
          height={Math.max(b.bottom - b.top, 1)}
          fill={b.kind === "total" ? muted : direction.accent}
        />
      ))}

      {bars.map((b, i) =>
        textAt(`value-${i}`, b.kind === "total" ? ink : deltaInk),
      )}
      {bars.map((_, i) => textAt(`name-${i}`))}

      {/* THE SPAN THE HEADLINE RESTS ON. Two ticks on the outer levels and a rule between them, with
          the label the arbiter placed: the mark states which two things are being compared, the
          number states by how much. Both come from `net-change-between-declared-levels`, and the
          mark is drawn only where the arbiter found room for its number — a bracket with nothing on
          it is a bracket about nothing. */}
      {span && byId.get("net-change") && (
        <g>
          <line
            x1={span.left}
            x2={span.right}
            y1={span.y}
            y2={span.y}
            stroke={muted}
            strokeWidth={direction.stroke.rule}
          />
          {[span.left, span.right].map((x) => (
            <line
              key={`tick-${x}`}
              x1={x}
              x2={x}
              y1={span.y - 5}
              y2={span.y + 5}
              stroke={muted}
              strokeWidth={direction.stroke.rule}
            />
          ))}
        </g>
      )}
      {textAt("net-change", ink)}
    </svg>
  );
}
