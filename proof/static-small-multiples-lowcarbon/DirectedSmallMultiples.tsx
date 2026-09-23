/**
 * Sixteen European countries, 2000 against 2024, one panel each, drawn THROUGH the design base. The
 * first `small multiples` component in this tree.
 *
 * WHY THIS FORM CARRIES WHAT THE SLOPE COULD NOT. `proof/static-slope-europe-lowcarbon` draws the
 * same two dates on the same countries and can carry six of them: a slope has no value axis, so it
 * owes every end value it prints, and sixteen labels on one rail push each other off their own lines.
 * Split into panels, each pair gets its own space and its own numbers, and all sixteen fit. The cut
 * bought the count — which is what this family is for.
 *
 * `panels-share-one-scale-or-they-are-not-multiples` (Ferdio viz99, ONS, ABC — three publications) —
 * one vertical scale, 0 to 100 %, governs all sixteen. Ferdio's own words: that is what separates
 * this from sixteen unrelated charts in a grid.
 *
 * `the-cut-replaces-the-boundary` (Datawrapper, Ferdio viz99) — no rules between panels, no
 * alternating tint, no grid. The gap IS the boundary. Each panel draws its own short baseline,
 * exactly as wide as its own pair, because a gap that means "new axis" has to look like one.
 *
 * `what-is-shared-is-stated-once-and-what-varies-is-repeated` (ProPublica, ONS) — the two dates and
 * the unit are common to every panel, so they are stated once, in the key. The country's name and
 * its three numbers belong to the panel and are drawn in it. The test: a reader looking at one panel
 * can read it.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the two columns are one measure at two
 * moments, so one hue at two strengths.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
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

export type Panel = {
  key: string;
  label: string;
  from: number;
  to: number;
  delta: number;
  thread: boolean;
};

export function DirectedSmallMultiples({
  panels,
  states,
  ceiling,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  formatDelta,
  unit,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  panels: Panel[];
  states: { from: string; to: string };
  ceiling: number;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  formatDelta: (v: number) => string;
  unit: string;
  direction: any;
  treatments: string[];
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
  const value = reg("value");

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthCache = new Map<string, number>();
  const widthOf = (text: string, r: any) => {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w =
        measureText(text, sizeOf(r)) +
        Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
      widthCache.set(key, w);
    }
    return w;
  };
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

  const wrapCache = new Map<string, string[]>();
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${maxWidth}|${text}`;
    const hit = wrapCache.get(key);
    if (hit) return hit;
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
    wrapCache.set(key, out);
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
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);
  const axisBand = bandOf(axis);

  /** ONE HUE, TWO CHROMAS — the two columns are one measure at two moments. */
  const fromFill = mix(direction.accent, direction.ground, 0.62);
  const toFill = direction.accent;

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const keyRoom = annotBand.ascent + annotBand.descent + 10;

  /** WHAT ONE PANEL OWES. Its name in the annot register, its two columns, its own baseline, and its
   *  delta in the value register beneath — every panel readable on its own, which is the test
   *  `what-is-shared-is-stated-once-and-what-varies-is-repeated` sets. Below this height a panel is a
   *  thumbnail of a chart rather than a chart. */
  const NAME_TO_BARS = 4;
  const BARS_H = 34;
  const BARS_TO_DELTA = 5;
  const blockH =
    annotBand.ascent +
    annotBand.descent +
    NAME_TO_BARS +
    BARS_H +
    BARS_TO_DELTA +
    valueBand.ascent +
    valueBand.descent;
  /** THE GAP BETWEEN PANELS IS PART OF WHAT A PANEL OWES, and it is the thing this component was
   *  getting wrong.
   *
   *  THE DEFECT THIS EXISTS FOR. The first version reserved the block and let the grid divide what
   *  was left, which put each panel's name 7px under its own bars and 12px under the PREVIOUS
   *  panel's delta. Nothing collided, every guard was green, and `Grèce` read as if it belonged to
   *  Denmark's block. On a grid of panels, proximity IS the grouping — it is the only thing saying
   *  which name goes with which pair — so a gap that is merely larger is not enough. The gap between
   *  panels has to be CLEARLY larger than the gaps inside one, and `clearly` is a number the plate
   *  checks rather than a judgement it hopes for. */
  const PANEL_GAP = Math.max(16, blockH * 0.24);
  const panelOwes = blockH + PANEL_GAP;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4828);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top = limitsTop + limitLines.length * bodyLead + keyRoom;
    const bottom = readingTop - gapOf(annot, 0.8571);
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
      top,
      bottom,
    };
  };

  /** THE GRID IS A RUNG TOO. Sixteen panels can be 4 x 4, 6 x 3 or 8 x 2, and which one fits is a
   *  measurement rather than a preference: a wide grid buys panel height and costs panel width, and
   *  the panel owes a fixed height before it owes anything else. Widest-first, so the plate prefers
   *  the shape that gives each panel the most room. */
  const columnChoices = [4, 6, 8].filter((c) => c <= panels.length);
  const rungs: Array<{
    cols: number;
    title: number;
    limit: number;
    reading: number;
  }> = [];
  for (const cols of columnChoices)
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ cols, title: t, limit: l, reading: r });
        rungs.push({ cols, title: t, limit: l, reading: -1 });
      }

  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    cellH: number;
  } | null = null;
  let best: { cellH: number; owed: number } = {
    cellH: -Infinity,
    owed: panelOwes,
  };
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    const rowsOf = Math.ceil(panels.length / rung.cols);
    const cellH = (l.bottom - l.top) / rowsOf;
    if (cellH > best.cellH) best = { cellH, owed: panelOwes };
    if (cellH >= panelOwes) {
      fits = { rung, layout: l, cellH };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `${panels.length} panels do not fit this direction: the best grid gives each ` +
        `${best.cellH.toFixed(1)}px of height and a panel that carries its own name, its columns and ` +
        `its delta owes ${panelOwes.toFixed(1)}px. Draw fewer panels, or publish taller.`,
    );
  const { layout, cellH } = fits;
  const cols = fits.rung.cols;
  const rowsOf = Math.ceil(panels.length / cols);
  const cellW = (width - PAD * 2) / cols;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · grid ${cols} x ${rowsOf}, panel ${cellW.toFixed(0)} x ${cellH.toFixed(0)}px, owed ${panelOwes.toFixed(0)}px`,
  );

  /** Inside a panel: the name on top, the two columns on a shared scale, the panel's own baseline,
   *  the delta beneath. The bars are sized from the SHARED ceiling, never from the panel's own
   *  maximum — that is the whole rule. */
  const barsTop = annotBand.ascent + annotBand.descent + NAME_TO_BARS;
  const barsH = BARS_H;
  /** The block sits at the top of its cell, so every pixel of slack the grid gave falls BETWEEN
   *  panels rather than inside them — and the grouping is then checked, not assumed. */
  const insideGap = Math.max(annotBand.descent + NAME_TO_BARS, BARS_TO_DELTA);
  const betweenGap = cellH - blockH + annotBand.ascent;
  if (betweenGap < insideGap * 2)
    throw new Error(
      `panels are ${betweenGap.toFixed(1)}px apart and the gaps inside one are ${insideGap.toFixed(1)}px. ` +
        `A name that close to the panel above it reads as belonging to it. Draw fewer panels, or ` +
        `publish taller.`,
    );
  onLadder?.(
    `grouping: ${betweenGap.toFixed(1)}px between panels against ${insideGap.toFixed(1)}px inside one`,
  );
  const y = scaleLinear().domain([0, ceiling]).range([barsH, 0]);
  const barW = Math.min(cellW * 0.2, 22);
  const gap = Math.min(cellW * 0.1, 12);

  const nameFits = panels.every(
    (p) => widthOf(set(p.label, annot), annot) <= cellW - 10,
  );
  if (!nameFits)
    throw new Error(
      `a panel name does not fit its panel at ${cellW.toFixed(0)}px wide. Every panel carries its ` +
        `own name — that is what makes it readable alone — so the grid must be narrower.`,
    );

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
        <text
          key={l + i}
          x={PAD}
          y={layout.titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
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
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {/* WHAT IS SHARED, STATED ONCE: the two dates, in their own columns' fills, and the ceiling
          the sixteen panels are drawn against. Nothing here is repeated in a panel. */}
      <g>
        {[
          { text: states.from, fill: fromFill, at: PAD },
          {
            text: states.to,
            fill: toFill,
            at: PAD + widthOf(set(states.from, annot), annot) + 30,
          },
        ].map((s) => (
          <g key={s.text}>
            <rect
              x={s.at}
              y={layout.top - keyRoom + 2}
              width={annotBand.ascent * 0.8}
              height={annotBand.ascent * 0.8}
              fill={s.fill}
            />
            <text
              x={s.at + annotBand.ascent * 0.8 + 6}
              y={layout.top - keyRoom + 2 + annotBand.ascent * 0.8}
              {...line(annot)}
              fill={adjustToContrast(
                s.fill,
                direction.ground,
                TEXT_CONTRAST_MIN,
              )}
              fontWeight={700}
            >
              {set(s.text, annot)}
            </text>
          </g>
        ))}
        <text
          x={width - PAD}
          y={layout.top - keyRoom + 2 + annotBand.ascent * 0.8}
          textAnchor="end"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(unit, axis)}
        </text>
      </g>

      {panels.map((p, i) => {
        const cx = PAD + (i % cols) * cellW;
        const cy = layout.top + Math.floor(i / cols) * cellH;
        const base = cy + barsTop + barsH;
        const x0 = cx + cellW / 2 - barW - gap / 2;
        const x1 = cx + cellW / 2 + gap / 2;
        const ink0 = p.thread ? accentInk : mutedInk;
        return (
          <g key={p.key}>
            <text
              x={cx + cellW / 2}
              y={cy + annotBand.ascent}
              textAnchor="middle"
              {...line(annot)}
              fill={ink0}
              fontWeight={p.thread ? 700 : annot.fontWeight}
            >
              {set(p.label, annot)}
            </text>

            <rect
              x={x0}
              y={base - (barsH - y(p.from))}
              width={barW}
              height={barsH - y(p.from)}
              fill={fromFill}
            />
            <rect
              x={x1}
              y={base - (barsH - y(p.to))}
              width={barW}
              height={barsH - y(p.to)}
              fill={toFill}
            />

            {/* THE PANEL'S OWN BASELINE — exactly as wide as its own pair, so the gap between panels
                reads as the end of one axis rather than as empty space. */}
            <line
              x1={x0 - 2}
              x2={x1 + barW + 2}
              y1={base + 0.5}
              y2={base + 0.5}
              stroke={grid}
              strokeWidth={direction.stroke.rule}
            />

            {/* THE DELTA, in the value register, under the panel it belongs to. */}
            <text
              x={cx + cellW / 2}
              y={base + valueBand.ascent + BARS_TO_DELTA}
              textAnchor="middle"
              {...line(value)}
              fill={ink0}
              fontWeight={p.thread ? 700 : value.fontWeight}
            >
              {set(formatDelta(p.delta), value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
