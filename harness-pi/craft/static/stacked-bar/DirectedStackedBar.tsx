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
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";

/** This beat's own type, as its BRIEF declares it — what decides whether a tall frame asks for the twin form. */
const TYPE = "stacked-bar";
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

  /**
   * THE TWIN FORM — WHICH THIS BEAT WAS ALREADY DRAWING.
   *
   * `type-at-size.mjs` answers `transpose` for a stacked bar at a tall frame: rows running down the
   * frame, every category name horizontal on one line, read top to bottom. That is what this plate
   * has drawn since it was written — the magnitude runs across, the twelve countries run down — so
   * `ROWS` rotates nothing. A component that does not ASK is refused all the same, and the refusal
   * is right: nothing in the file said the form was deliberate rather than a landscape accident.
   *
   * What `ROWS` carries is the part of the row form a 960px frame never had to pay for. Measured at
   * 540 x 960 (1080 x 1920 at scale 2, creme): the plot comes out 229px wide against 660px at
   * landscape, sixteen of the twenty-four segment numbers no longer fit inside their own segment
   * against ten at landscape, and the two lanes past the bar — the spill lane and the total lane —
   * stop being affordable to overlap. Landscape got away with printing the total at `plotRight + 10`,
   * the first pixel of the lane the spills were reserved, because none of its five spillers was the
   * longest bar; at portrait France spills too, `483 + 50` is printed into exactly that place, and
   * it lands on its own `533` — 100% of the smaller run, refused in creme and in nocturne.
   *
   * The size is read off the frame rather than passed in, because the frame is what the component is
   * already given and the three are distinguishable by their own proportions.
   */
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose";

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
    /** `l < 0` IS R7 — the standfirst dropped entirely, not shortened again. See the rungs below. */
    const limitLines = l < 0 ? [] : wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline +
      gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) +
      display.fontSize;
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

  /**
   * THE RUNGS, IN `REMOVAL_LADDER` ORDER — AND R7 WAS MISSING FROM THEM.
   *
   * R3 takes the standfirst's last sentence, repeatedly, down to one; R4 then takes the reading
   * line, which is an annotation in prose. This plate stopped there, and at 1080x1080 that was one
   * rung short: measured 2026-09-23, the most generous rung it could reach left the twelve rows a
   * pitch of 16.8px in creme and 13.3px in nocturne, against the 18.3px and 14.0px a bar that has
   * to hold its own number owes — so both directions REFUSED with the plot 18px and 8px short of a
   * frame that is otherwise 45 % header.
   *
   * R7 is the documented answer and it is the one nothing here implemented: drop the standfirst
   * ENTIRELY rather than shorten it a fourth time. It costs the line that says what the numbers
   * are — except that on this plate it very nearly does not, because the key row above the bars
   * names both segments in their own fill AND carries the unit at its right edge. What is lost is
   * the comparison stated in prose (Spain's addition against France's), which the headline states
   * and the bars show. It recovers 38px in creme and 36px in nocturne, and both then hold with
   * room: 20.0px of pitch against 18.3px owed, 16.3px against 14.0px.
   *
   * It is enumerated LAST for each headline form, after every shorter standfirst and after the
   * reading line has already gone, so a plate only ever reaches it having spent everything cheaper.
   * Landscape fits on the first rung and never sees it.
   */
  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++) {
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++)
        rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
    rungs.push({ title: t, limit: -1, reading: -1 });
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
        `${rowsOwe.toFixed(1)}px, with the standfirst already dropped whole (R7). What is left is ` +
        `R8 — draw fewer rows, and say on the plate that fewer are drawn.`,
    );
  }
  const layout = fits.layout;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ` +
      (fits.rung.limit < 0 ? "dropped" : `${fits.rung.limit + 1}`) +
      `, reading ` +
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
  const trial = scaleLinear()
    .domain(domain)
    .range([plotLeft, width - PAD - totalRoom]);

  const insideFits = (w: number, text: string) =>
    widthOf(set(text, annot), annot) + 8 <= w;
  const spillOf = (d: Row) => `${format(d.level)} + ${format(d.growth)}`;
  const spillsAt = (scale: any) => (d: Row) =>
    !insideFits(scale(d.level) - scale(0), format(d.level)) ||
    !insideFits(scale(d.total) - scale(d.level), format(d.growth));
  const trialSpills = rows.filter(spillsAt(trial));
  /**
   * THE LONGEST BAR IS ITSELF A SPILLER — WHICH IS WHAT MAKES THE TWO LANES COLLIDE, AND IT IS NOT
   * A PROPERTY OF THE FORM.
   *
   * This was first attributed to the row form, because portrait was where it was measured. It is
   * not: landscape prints the total at `plotRight + 10`, the FIRST PIXEL of the lane the spills are
   * reserved, and gets away with it only because none of its five spillers is the longest bar, so
   * nothing is ever already written there. Narrow the frame and that stops being true — at
   * 1080x1080, sixteen of the twenty-four numbers spill and France spills too, so `483 + 50` was
   * printed at `plotRight + 8` and its own `533` at `plotRight + 10`: two runs on one baseline
   * sharing 100 % of the smaller, refused in creme and in nocturne exactly as at portrait.
   *
   * So the question is asked of the DATA rather than of the frame, and landscape answers no by
   * itself — its pixels are unchanged, which is checked by rendering it.
   *
   * It is asked at the NARROWEST plot this layout can produce — the one whose lane is sized for
   * every row — and not at the trial width, because the trial is a third wider than what ships and
   * France's `483 + 50` fits there and does not here: asked at the trial, square answered no and
   * collided anyway. The narrowest is monotone the right way round. A bar that does not spill in
   * it cannot spill in anything wider, so a no here is a no for the plot that actually gets drawn.
   */
  const spillRoomForEveryRow =
    Math.max(...rows.map((d) => widthOf(set(spillOf(d), annot), annot))) + 16;
  const narrowest = scaleLinear()
    .domain(domain)
    .range([plotLeft, width - PAD - totalRoom - spillRoomForEveryRow]);
  const widest = rows.reduce((a, b) => (b.total > a.total ? b : a));
  const ownLane = ROWS || spillsAt(narrowest)(widest);
  /** WHEN THE TOTAL TAKES ITS OWN LANE, THE SPILL LANE IS SIZED FOR EVERY ROW, because the two
   *  passes disagree about who spills and the second pass is the one that ships. The trial plot is
   *  the final one plus the lane — 298px against 231px at portrait, a third wider — so France's
   *  `483 + 50` fits inside its segments at the trial width and does not at the real one, and the
   *  lane it then has to occupy was measured without it: 51px reserved for a 53px run, which clears
   *  the total's lane by six pixels and by luck. A third pass would only move the disagreement
   *  along. Reserving the widest run ANY row could need cannot be wrong, and it costs 2px of plot
   *  here (231px to 229px) — not a reading. */
  const spillRoom = ownLane
    ? spillRoomForEveryRow
    : trialSpills.length
      ? Math.max(
          ...trialSpills.map((d) => widthOf(set(spillOf(d), annot), annot)),
        ) + 16
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
                not use, so the part and the whole never read as one column of numbers.

                WHEN THE LONGEST BAR SPILLS, IT TAKES ITS OWN LANE AT THE FRAME'S EDGE.
                `plotRight + 10` is the first pixel of the lane the SPILLS were reserved, and at
                landscape that is free money: ten numbers spill, none of them on the longest bar.
                At portrait and at square sixteen spill and the longest bar IS a spiller, so
                `483 + 50` was printed at `plotRight + 8` and `533` at `plotRight + 10` — two runs
                on one baseline sharing 100% of the smaller, refused in creme and nocturne at both
                frames. Right-aligned at `width - PAD` the total sits in the `totalRoom` the layout
                already withholds for it, the spills get the lane that is theirs, and the ~70px of
                dead paper past the totals — reserved, never drawn in — comes back to the picture. */}
            {on("the-stack-gives-back-the-total-it-hides") && (
              <text
                x={ownLane ? width - PAD : plotRight + 10}
                textAnchor={ownLane ? "end" : undefined}
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
