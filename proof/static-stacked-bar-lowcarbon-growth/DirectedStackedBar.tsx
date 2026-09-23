/**
 * Low-carbon electricity added since 2000, sixteen European countries, drawn THROUGH the design base.
 * The first `stacked bar` component in this tree.
 *
 * `a-segment-not-starting-at-zero-carries-its-own-number` (Information is Beautiful, Ferdio viz24) —
 * only the first segment of a stack starts at zero, so every other one prints its own value inside
 * itself. IiB names the defect this repairs: *a segment that does not start at zero cannot be
 * measured by eye.* That reason is why a segment too narrow for its number gets a leader rather than
 * silence.
 *
 * `the-stack-gives-back-the-total-it-hides` (Ferdio viz23, IiB) — the 2024 total is printed past the
 * bar's end, in the value register, while the two segments carry theirs in the annot register. A
 * stack that leaves the reader to add has taken a number away and not given it back.
 *
 * And viz23's second sentence, which decided what this beat stacks: `[level, growth]` rather than
 * `[level, later level]`, so no segment's number has to be subtracted from another either. The
 * reader gets the start, the change and the total without any arithmetic.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` (five publications, two families) — the two
 * segments are one measure at two moments, so they are one hue at two chromas. Never two hues.
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

export type Row = {
  key: string;
  label: string;
  level: number;
  growth: number;
  total: number;
  thread: boolean;
};

export function DirectedStackedBar({
  rows,
  segments,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  unit,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  rows: Row[];
  segments: { level: string; growth: string };
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
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

  /** ONE HUE, TWO CHROMAS. The two segments are one measure — low-carbon TWh — at two moments, so
   *  they are the direction's own accent at two strengths: the earlier state pale, the later state
   *  full. A second hue here would say the two segments are two different things. */
  const levelFill = mix(direction.accent, direction.ground, 0.62);
  const growthFill = direction.accent;

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  /** THE FLOOR IS THE ROW ITSELF: a bar has to be thick enough to hold the number printed inside it,
   *  and the rows have to be far enough apart that two names are two names. Both are the annot
   *  register's own band plus breath. */
  const rowsOwe = annotBand.ascent + annotBand.descent + 5;
  const keyRoom = annotBand.ascent + annotBand.descent + 10;

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
      pitch: (bottom - top) / rows.length,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++)
        rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
  } | null = null;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.pitch >= rowsOwe) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits) {
    const best = rungs
      .map((rung) => ({
        rung,
        layout: layoutFor(rung.title, rung.limit, rung.reading),
      }))
      .reduce((a, b) => (b.layout.pitch > a.layout.pitch ? b : a));
    throw new Error(
      `${rows.length} rows do not fit this direction: the widest rung reaches a pitch of ` +
        `${best.layout.pitch.toFixed(1)}px and a bar that must hold its own number owes ` +
        `${rowsOwe.toFixed(1)}px. Draw fewer rows.`,
    );
  }
  const layout = fits.layout;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · pitch ${layout.pitch.toFixed(1)}px, owed ${rowsOwe.toFixed(1)}px`,
  );

  // ── the columns ───────────────────────────────────────────────────────────
  const nameRoom =
    Math.max(...rows.map((d) => widthOf(set(d.label, annot), annot))) + 12;
  const totalRoom =
    Math.max(...rows.map((d) => widthOf(set(format(d.total), value), value))) +
    14;
  const plotLeft = PAD + nameRoom;
  /** THE PLOT IS MEASURED TWICE. Which segments are too narrow to hold their own number depends on
   *  how wide the plot is, and how wide the plot is depends on how much room those segments need
   *  beside the bar. One pass cannot answer both, so the first finds the spills and the second
   *  reserves their room. */
  const domain = [0, Math.max(...rows.map((d) => d.total))] as [number, number];
  const trial = scaleLinear().domain(domain).range([plotLeft, width - PAD - totalRoom]);

  const insideFits = (w: number, text: string) =>
    widthOf(set(text, annot), annot) + 8 <= w;
  const spillOf = (d: Row) => `${format(d.level)} + ${format(d.growth)}`;
  const spillsAt = (scale: any) => (d: Row) =>
    !insideFits(scale(d.level) - scale(0), format(d.level)) ||
    !insideFits(scale(d.total) - scale(d.level), format(d.growth));
  const trialSpills = rows.filter(spillsAt(trial));
  const spillRoom = trialSpills.length
    ? Math.max(...trialSpills.map((d) => widthOf(set(spillOf(d), annot), annot))) + 16
    : 0;

  const plotRight = width - PAD - totalRoom - spillRoom;
  const x = scaleLinear().domain(domain).range([plotLeft, plotRight]);
  const spills = spillsAt(x);

  const pitch = layout.pitch;
  const barH = Math.min(pitch - 4, annotBand.ascent + annotBand.descent + 6);

  /** A SEGMENT PRINTS ITS NUMBER INSIDE ITSELF WHEN IT FITS, AND BESIDE THE BAR WHEN IT DOES NOT —
   *  never in silence. On a stack the number is the only way to read a segment that does not start
   *  at zero, so a segment too narrow to hold it has a placement problem, not a licence to drop it.
   *
   *  Ireland's 2000 level is 1 TWh against a 583 TWh scale: under a pixel. There is no shorter form
   *  of `1`, so such a row prints BOTH its numbers past the bar's end as one run — `1 + 13` — which
   *  keeps each segment's own figure and shows the addition the stack is asking the reader to do. */
  const spilled = rows.filter(spills);
  onLadder?.(
    `segments: ${rows.length * 2} numbered, ${(rows.length - spilled.length) * 2} inside their own ` +
      `segment, ${spilled.length * 2} beside the bar, 0 silent`,
  );

  const inkOn = (fill: string) =>
    adjustToContrast(ink, fill, TEXT_CONTRAST_MIN);

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

      {/* THE KEY IS OVER THE SEGMENTS IT NAMES, each word in its own segment's fill — no swatch
          block, and the reader learns the code from the line they were going to read anyway. */}
      <g>
        {[
          { text: segments.level, fill: levelFill, at: plotLeft },
          {
            text: segments.growth,
            fill: growthFill,
            at: plotLeft + widthOf(set(segments.level, annot), annot) + 26,
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

      {rows.map((d, i) => {
        const mid = layout.top + i * pitch + pitch / 2;
        const y0 = mid - barH / 2;
        const x0 = x(0);
        const xLevel = x(d.level);
        const xTotal = x(d.total);
        return (
          <g key={d.key}>
            <text
              x={plotLeft - 10}
              y={mid + (annotBand.ascent - annotBand.descent) / 2}
              textAnchor="end"
              {...line(annot)}
              fill={d.thread ? accentInk : mutedInk}
              fontWeight={d.thread ? 700 : annot.fontWeight}
            >
              {set(d.label, annot)}
            </text>

            <rect
              x={x0}
              y={y0}
              width={xLevel - x0}
              height={barH}
              fill={levelFill}
            />
            <rect
              x={xLevel}
              y={y0}
              width={xTotal - xLevel}
              height={barH}
              fill={growthFill}
            />

            {/* EVERY SEGMENT'S OWN NUMBER, inside where it fits. The ink is measured against the
                SEGMENT's fill, not against the page — one stack's fills run pale to full. */}
            {!spills(d) && insideFits(xLevel - x0, format(d.level)) && (
              <text
                x={(x0 + xLevel) / 2}
                y={mid + (annotBand.ascent - annotBand.descent) / 2}
                textAnchor="middle"
                {...line(annot)}
                fill={inkOn(levelFill)}
              >
                {set(format(d.level), annot)}
              </text>
            )}
            {!spills(d) && insideFits(xTotal - xLevel, format(d.growth)) && (
              <text
                x={(xLevel + xTotal) / 2}
                y={mid + (annotBand.ascent - annotBand.descent) / 2}
                textAnchor="middle"
                {...line(annot)}
                fill={inkOn(growthFill)}
              >
                {set(format(d.growth), annot)}
              </text>
            )}

            {spills(d) && (
              <text
                x={xTotal + 8}
                y={mid + (annotBand.ascent - annotBand.descent) / 2}
                {...line(annot)}
                fill={d.thread ? accentInk : mutedInk}
              >
                {set(spillOf(d), annot)}
              </text>
            )}

            {/* THE TOTAL, GIVEN BACK — past the stack's end, in the value register the segments do
                not use, so the part and the whole never read as one column of numbers. */}
            {on("the-stack-gives-back-the-total-it-hides") && (
              <text
                x={plotRight + 10}
                y={mid + (valueBand.ascent - valueBand.descent) / 2}
                {...line(value)}
                fill={d.thread ? accentInk : mutedInk}
                fontWeight={d.thread ? 700 : value.fontWeight}
              >
                {set(format(d.total), value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
