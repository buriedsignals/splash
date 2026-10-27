/**
 * The Cell-grid family's STATIC plate (craft/gestures/GRAMMAR.md F7): one component, two variants —
 * `heatmap-matrix` (rows × columns, forked from static/heatmap-matrix/DirectedHeatmap.tsx) and
 * `calendar-heatmap` (twelve months × 31 days, forked from static/calendar-heatmap/DirectedCalendarHeatmap.tsx).
 * Each keeps its per-type doctrine — one hue stepped between the direction's own poles, fixed breaks printed in
 * the data's units, furniture derived from the ground — and replaces its fixed staging (the region bracket, the
 * streak) with the plate `composeCellStatic` returns: outlines in the accent (highlight), rings in the ink
 * (name), the run a trace finds outlined in the ink over a ground halo (the hue is the scale, so emphasis is
 * never a recolour), cells that step back, a cutoff marked on the key and on its cells, two compared cells
 * joined by a rule, and every note on a caption line above the grid.
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
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { outlineOf } from "./gesture-family-cell.mjs";

/** 960 x 540 at scale 2 is the `landscape` these plates pin — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Plate = {
  order: number[];
  outlines: Array<{ index: number; kind: "accent" | "ring" | "run"; cells: number[] }>;
  back: number[];
  cutoffs: Array<{ index: number; value: number; cells: number[] }>;
  compares: Array<{ index: number; a: number; b: number }>;
  notes: Array<{ index: number; do: string; text: string; accent: boolean }>;
  plan: Array<{ index: number; do: string; run?: { rows: number[] } }>;
};
export type GridCell = { id: number; r: number; c: number; value: number; date?: string; day?: number };

/** What every plate draws over its cells, from one geometry: `box(cell)` gives a cell's rect. */
function Overlay({ plate, cells, box, gap, ink, ground, accentInk, stroke, rowRuns }: any) {
  const byId = new Map(cells.map((c: GridCell) => [c.id, c]));
  const rects = (ids: number[]) =>
    outlineOf(ids.map((i) => byId.get(i)).filter(Boolean), plate.order).map((o: any) => {
      const a = box({ slot: o.r0, c: o.c0 });
      const b = box({ slot: o.r1, c: o.c1 });
      return { x: a.x - gap, y: a.y - gap, width: b.x + b.w - a.x + gap * 2, height: b.y + b.h - a.y + gap * 2 };
    });
  // Runs first, the accent last: the subject's outline is never drawn over.
  const rank = (k: string) => (k === "run" ? 0 : k === "ring" ? 1 : 2);
  // Larger outlines first, so a ring on one cell stays visible inside a highlighted month.
  const order = plate.outlines.slice().sort((x: any, y: any) => y.cells.length - x.cells.length || rank(x.kind) - rank(y.kind));
  return (
    <g>
      {plate.cutoffs.map((cut: any) =>
        cut.cells.map((id: number) => {
          const c = byId.get(id) as GridCell | undefined;
          if (!c) return null;
          const b = box({ slot: plate.order.indexOf(c.r), c: c.c });
          const r = Math.max(0.8, Math.min(b.w, b.h) * 0.14);
          return <circle key={`cut${cut.index}-${id}`} cx={b.x + b.w / 2} cy={b.y + b.h / 2} r={r} fill={ink} stroke={ground} strokeWidth={stroke.hairline} />;
        }),
      )}
      {order.map((o: any) =>
        (rowRuns.has(o.index) ? [] : rects(o.cells)).map((r: any, j: number) => (
          <g key={`o${o.index}-${j}`}>
            <rect {...r} fill="none" stroke={ground} strokeWidth={stroke.rule * 5} />
            <rect {...r} fill="none" stroke={o.kind === "accent" ? accentInk : ink} strokeWidth={stroke.rule * (o.kind === "ring" ? 1.5 : 2)} strokeDasharray={o.kind === "ring" ? `${stroke.rule * 4} ${stroke.rule * 2}` : undefined} />
          </g>
        )),
      )}
      {plate.compares.map((cmp: any) => {
        const a = byId.get(cmp.a) as GridCell;
        const b = byId.get(cmp.b) as GridCell;
        const ba = box({ slot: plate.order.indexOf(a.r), c: a.c });
        const bb = box({ slot: plate.order.indexOf(b.r), c: b.c });
        const ca = { x: ba.x + ba.w / 2, y: ba.y + ba.h / 2 };
        const cb = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
        return (
          <g key={`cmp${cmp.index}`}>
            {[ba, bb].map((r, j) => (
              <g key={j}>
                <rect x={r.x - gap} y={r.y - gap} width={r.w + gap * 2} height={r.h + gap * 2} fill="none" stroke={ground} strokeWidth={stroke.rule * 5} />
                <rect x={r.x - gap} y={r.y - gap} width={r.w + gap * 2} height={r.h + gap * 2} fill="none" stroke={j === 0 ? accentInk : ink} strokeWidth={stroke.rule * 2} />
              </g>
            ))}
            <line x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke={ground} strokeWidth={stroke.rule * 4} />
            <line x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke={ink} strokeWidth={stroke.rule} />
          </g>
        );
      })}
    </g>
  );
}

/** The plate for a variant: `variant` picks the drawing, every other prop is the plate's. */
export function GestureCellStatic(props: any) {
  return props.variant === "calendar-heatmap" ? <CalendarPlate {...props} /> : <MatrixPlate {...props} />;
}

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */




export type Source = { key: string; label: string; short?: string; family: string };
export type Row = {
  key: string;
  label: string;
  lowCarbon: number;
  shares: number[];
};
export type Region = { from: number; to: number; label: string };

function MatrixPlate({
  rows: baseRows,
  plate,
  cells: gridCells,
  sources,
  families,
  breaks,
  shareHead = "",
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  rows: Row[];
  sources: Source[];
  families: Array<{ name: string; short?: string; from: number; to: number }>;
  breaks: number[];
  shareHead?: string;
  plate: Plate;
  cells: GridCell[];
  unit: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  /** THE ROWS IN THE ORDER THE PLATE DRAWS THEM: a reorder's end state (`plate.order`, indices into the beat's rows). */
  const rows = plate.order.map((r) => baseRows[r]);
  const idAt = new Map(gridCells.map((c) => [`${c.r}-${c.c}`, c.id]));
  const back = new Set(plate.back);
  /** A row measure is optional: without one the right-hand column is not drawn. */
  const hasMeasure = rows.every((r) => Number.isFinite(r.lowCarbon));
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
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

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

  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);

  // ── the ramp ──────────────────────────────────────────────────────────────
  /** ONE HUE, SIX CLASSES, LIGHTNESS FALLING THE WHOLE WAY. The poles are the direction's own: a
   *  pale step off the ground at the empty end, the accent deepened toward the ink at the full end.
   *  Built between two poles of one palette, a ramp cannot turn back on itself — which is the
   *  failure `the-ramp-is-monotone-in-lightness` exists for, and the one Ferdio's viz49 commits. */
  const low = mix(direction.accent, direction.ground, 0.9);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classOf = (share: number) => breaks.filter((b) => share >= b).length;
  const classFill = (index: number) =>
    mix(low, high, classCount > 1 ? index / (classCount - 1) : 0.5);

  // ── the column that carries the header and the footer ─────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  // ── the grid's own columns, measured before the ladder ────────────────────
  //
  // None of these depends on the vertical layout, and the ladder depends on THEM: whether a column
  // head has to stagger onto a second line is a width question, and the answer changes how much
  // vertical room the heads need. Measuring width first means the stagger row is reserved only when
  // some head actually needs it.
  const nameRoom = Math.max(...rows.map((r) => widthOf(set(r.label, axis), axis))) + 10;
  /** THE COLUMN THE ROW ORDER IS BY NEEDS A NAME. Without one a reader sees `100,0 %` beside
   *  Iceland and cannot tell what it is a hundred per cent OF — and the ladder had already spent the
   *  reading line, which is where that sentence would otherwise live. The head is measured into the
   *  column's own width, so naming it can never push it off the plate. */
  const shareRoom = !hasMeasure ? 0 :
    Math.max(
      ...rows.map((r) => widthOf(set(format(r.lowCarbon), value), value)),
      widthOf(set(shareHead, axis), axis),
    ) + 12;
  /** THE FRAME IS NARROWER THAN THE ONE THIS PLATE WAS TUNED AT. Everything below that reads this
   *  leaves landscape exactly as it was accepted; 960px is the width every number here was measured
   *  against. */
  const NARROW = width < FRAME.width;

  /** THE SHORT FORM OF A NAME, SPENT ONLY WHERE THE PLATE IS NARROW. The copy writes both; the
   *  renderer picks, and never invents one by cutting a string. */
  const shortly = <T extends { label?: string; name?: string; short?: string }>(
    x: T,
  ) => (NARROW && x.short ? x.short : ((x.label ?? x.name) as string));

  /** THE BRACKET'S COLUMN IS CAPPED WHERE THE PLATE IS NARROW, because the label WRAPS inside it and
   *  the bracket is seven rows tall. Reserving the label's full one-line width spent 110px of a
   *  540px plate on a caption that then used four lines of a column it never needed — measured at
   *  1080x1080, it left the nine sources 23px of cell each, where « Hydraulique » is 55px, and the
   *  column heads printed through each other. The floor is the widest WORD, so capping it can never
   *  clip one. */
  /** A TRACE OVER ROWS IS THE BLOCK OF ROWS THE TAKEAWAY IS ABOUT, bracketed at the right (the per-type kit's
   *  region, now staged by the beat's own trace); its words are the trace's note, on a caption line. A run the
   *  final order scattered is outlined on its cells instead. */
  const rowRuns = new Map<number, [number, number]>();
  for (const p of plate.plan)
    if (p.do === "trace" && p.run?.rows?.length) {
      const slots = p.run.rows.map((r) => plate.order.indexOf(r)).sort((x, y) => x - y);
      if (slots[slots.length - 1] - slots[0] === slots.length - 1) rowRuns.set(p.index, [slots[0], slots[slots.length - 1]]);
    }
  const inRun = (slot: number) => [...rowRuns.values()].some(([a, b]) => slot >= a && slot <= b);
  const regionRoom = rowRuns.size ? 14 : 0;
  const regionUnderGrid = false;

  const gridLeft = PAD + nameRoom;
  const gridRight = width - PAD - shareRoom - regionRoom;
  const cellW = (gridRight - gridLeft) / sources.length;

  /** COLUMN HEADS STAGGER, THEY NEVER ROTATE OR DROP — Reuters' rule, filed as
   *  `a-narrow-cell-degrades-its-label-rather-than-dropping-it`. A head wider than its column drops
   *  to a second line rather than turning ninety degrees.
   *
   *  AND ONE EXTRA LINE IS NOT A LADDER. At 960px every wide head moved to the same second line and
   *  that was enough, because two columns of width was more than any name needed. At 540px it is
   *  not: measured at 1080x1080 and 1080x1920, all five renewable heads went to line two and printed
   *  straight through each other — « Hydraulique » and « Éolien » shared 100% of the smaller run.
   *  So where the plate is narrow the stagger is a DEPTH: heads step round `1, 2, … d, 1, 2, …`, so
   *  two heads on one line are `d` columns apart, and `d` is the smallest depth at which every such
   *  pair measures clear. Landscape keeps the rule it was accepted under, untouched. */
  const headWidthOf = (i: number) => widthOf(set(shortly(sources[i]), axis), axis);
  const clearsAtDepth = (d: number) =>
    sources.every(
      (_, i) =>
        i + d >= sources.length ||
        (headWidthOf(i) + headWidthOf(i + d)) / 2 + 4 <= d * cellW,
    );
  const HEAD_DEPTH_MAX = 3;
  let headDepth = 1;
  while (headDepth < HEAD_DEPTH_MAX && !clearsAtDepth(headDepth)) headDepth++;
  const headRow = (i: number) =>
    NARROW ? i % headDepth : headWidthOf(i) > cellW - 2 ? 1 : 0;
  const headRows = NARROW
    ? headDepth
    : sources.some((_, i) => headWidthOf(i) > cellW - 2)
      ? 2
      : 1;

  /** THE ROW PITCH IS A MEASURED FLOOR, NOT A HOPE. Eighteen rows each carry a name in the axis
   *  register, and a name is only a name if it does not sit on its neighbour. The ladder spends the
   *  short standfirst and reading forms the beat supplies, in order, until the pitch the layout
   *  actually gives clears the band the axis register owes — and refuses loudly if nothing does,
   *  because a heatmap whose rows cannot be named is not a heatmap. */
  const rowsOwe = axisBand.ascent + axisBand.descent + 2.5;
  /** THE ROOM ABOVE THE GRID, DERIVED FROM THE OFFSETS THE MARKS ARE ACTUALLY DRAWN AT — not
   *  guessed at and then hoped to be enough. The first version reserved one head row and then drew
   *  a second one 11px higher, straight through the family rule: `Hydraulique` and `Bioénergie` sat
   *  on top of `renouvelables`. Every number below is used twice, once here and once at the mark. */
  const HEAD_DROP = 4;
  const HEAD_STEP = axisBand.ascent + 2;
  const headTopmost = HEAD_DROP + (headRows - 1) * HEAD_STEP + axisBand.ascent;
  const familyRuleUp = headTopmost + 5;
  const familyBaselineUp = familyRuleUp + 4;
  const columnHeadRoom = familyBaselineUp + annotBand.ascent + 4;
  /** THE KEY TAKES THE WHOLE COLUMN WHERE THE PLATE IS NARROW, AND THE UNIT TAKES ITS OWN LINE.
   *  At 960px the six swatches sat under the grid with « part de la production du pays » beside
   *  them. At 540px the grid is 252px wide, so a swatch is 42px and « 10,0 % » is 35px centred on
   *  each edge: measured at 1080x1080 the break labels printed « 2,0 %5,0 %10,0 % » through each
   *  other and the unit ran to the frame edge. Given the full column the swatches are 71px, which
   *  is wider than any break label, and the unit drops below them. */
  const keyFullWidth = NARROW;
  const axisLead = leadOf(axis);
  const keyRoom =
    axisBand.ascent * 2 +
    axisBand.descent +
    14 +
    (keyFullWidth ? axisLead : 0) +
    (regionUnderGrid ? annotLead : 0);

  /** THE CREDIT IS A PARAGRAPH, NOT A LINE — and at 960px wide nothing ever noticed. Measured at
   *  1080x1920 and 1080x1080: « Source : Ember, Energy Institute – Statistical Review of World
   *  Energy (2025), via Our World in Data » is 587px of ink laid at x=PAD into a 540px plate, so it
   *  ran 93px off the right edge in all three directions and `assertTextWithinFrame` refused every
   *  one of them. It wraps into the same column as the standfirst, and its baselines are stepped UP
   *  from the foot so the last line still sits on PAD — which is why landscape, where it is one
   *  line, is untouched. */
  const sourceLines = wrap(set(source, body), column, body);

  /** EVERY NOTE ON A CAPTION LINE ABOVE THE GRID: one plate draws every gesture at once, and a caption names the
   *  row, column or month it speaks of, so no leader crosses the cells. */
  const noteLines = plate.notes.map((n) => ({ ...n, lines: wrap(set(n.text, annot), column, annot) }));
  const notesRoom = noteLines.length ? noteLines.reduce((s, n) => s + n.lines.length, 0) * annotLead + annotBand.descent + 4 : 0;
  const layoutFor = (titleIndex: number, limitIndex: number, readingIndex: number) => {
    const titleLines = wrap(set(title[titleIndex], display), column, display);
    const limitLines =
      limitIndex < 0 ? [] : wrap(set(limits[limitIndex], body), column, body);
    const readingLines =
      readingIndex < 0
        ? []
        : wrap(set(reading[readingIndex], annot), column, annot);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4828);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top =
      (limitLines.length
        ? limitsTop + limitLines.length * bodyLead
        : titleTop + titleLines.length * titleLead) + notesRoom + columnHeadRoom;
    const bottom = readingTop - gapOf(annot, 0.8571) - keyRoom;
    return {
      titleLines,
      limitLines,
      readingLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      sourceTop,
      readingTop,
      top,
      bottom,
      notesTop: top - columnHeadRoom - notesRoom + annotBand.ascent,
      pitch: (bottom - top) / rows.length,
    };
  };

  /** THE LADDER SPENDS THE HEADLINE TOO, AND IT SPENDS IT LAST. The rung order is the order a desk
   *  would cut in: the reading line first, then the standfirst, and only when neither is left does
   *  the headline take its short form. `nocturne` sets the display register in Futura at 32px and
   *  its headline runs to three lines — on a 540px plate those three lines are four rows of the
   *  grid. A short headline is a form a desk writes; what would be a defect is a headline that
   *  silently overflows, or twelve rows quietly becoming nine. */
  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  /** AND THE LAST RUNG DROPS THE STANDFIRST ALTOGETHER — the ladder's R7, which this component had
   *  no rung for. Measured at 1080x1080: with every other rung spent, the best pitch `creme` could
   *  reach was 12.3px against the 13.0px its axis register owes, and `nocturne` reached 9.0px
   *  against 11.5px. Four lines of standfirst on a 540px plate ARE four rows of the grid. It is
   *  spent after every headline form because it is the only line that says what the numbers are;
   *  what it costs is stated on the ladder note, so nobody has to guess that it went. */
  for (let t = 0; t < title.length; t++) rungs.push({ title: t, limit: -1, reading: -1 });

  const chosen = rungs.map((rung) => ({
    rung,
    layout: layoutFor(rung.title, rung.limit, rung.reading),
  }));
  /** AND ON A TALL PLATE, CLEARING THE FLOOR IS NOT THE SAME AS BEING A CHART. The ladder stops at
   *  the first rung that fits, which is right on a 960px plate and wrong on a 1080x1920 one:
   *  measured there, rung 1 cleared the 11.5px floor at 13.5px and the grid came out a 121px band
   *  across the middle of a 960px frame, with eight lines of headline above it and a six-line
   *  reading note below. Nothing was clipped and nothing collided — the plate simply was not a
   *  heatmap any more.
   *
   *  So where the plate is narrow the grid is OWED a third of the frame, which is the share
   *  `proof/static-choropleth-europe-lowcarbon` gives its map at the same size and for the same
   *  reason. The ladder keeps its order: it takes the first rung that pays both the floor and the
   *  third, and only if no rung can pay the third does it take the rung that leaves the grid the
   *  most — which is what a 540px square, where a third is out of reach, gets. */
  const gridOwed = NARROW ? height / 3 : 0;
  const clears = chosen.filter(({ layout }) => layout.pitch >= rowsOwe);
  const fits =
    clears.find(({ layout }) => layout.pitch * rows.length >= gridOwed) ??
    (NARROW
      ? clears.reduce(
          (a, b) => (b.layout.pitch > (a?.layout.pitch ?? -1) ? b : a),
          undefined as (typeof clears)[number] | undefined,
        )
      : clears[0]);
  if (!fits) {
    const best = chosen.reduce((a, b) =>
      b.layout.pitch > a.layout.pitch ? b : a,
    );
    throw new Error(
      `${rows.length} rows do not fit this direction: the widest rung reaches a pitch of ` +
        `${best.layout.pitch.toFixed(1)}px and the axis register owes ${rowsOwe.toFixed(1)}px. ` +
        `Draw fewer rows, or file a direction whose axis register is smaller.`,
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

  const cellH = layout.pitch;
  const gap = Math.max(Math.min(cellW, cellH) * 0.07, 0.6);
  const xOf = (i: number) => gridLeft + i * cellW;
  const yOf = (i: number) => layout.top + i * cellH;

  /** THE FORK, DECIDED BY MEASUREMENT. Ferdio prints a number in each of six cells because six fit.
   *  Here the value register's own band is measured against the cell the layout gives: if it fits,
   *  every cell prints; if it does not, the plate names its region and SAYS SO. What is not
   *  admissible is a grid that does neither. */
  const printsValues =
    valueBand.ascent + valueBand.descent <= cellH - gap &&
    Math.max(
      ...rows.flatMap((r) => r.shares.filter(Number.isFinite).map((s) => widthOf(format(s), value))),
    ) <=
      cellW - gap;
  const namesRegion =
    on("the-cell-value-is-printed-or-the-region-is-named") && !printsValues;
  onLadder?.(
    `cells: ${rows.length * sources.length} · value band ${(valueBand.ascent + valueBand.descent).toFixed(1)}px ` +
      `against a ${cellH.toFixed(1)}px row -> ${printsValues ? "printed in every cell" : "region named instead"}`,
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
      {sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {/* THE FAMILY BOUNDARY, DRAWN — never a second hue. On a heatmap the hue is the scale, so a
          column group is carried by its position and by a rule above it. */}
      {families.map((f) => {
        const left = xOf(f.from);
        const right = xOf(f.to + 1) - gap;
        return (
          <g key={f.name}>
            <line
              x1={left}
              x2={right}
              y1={layout.top - familyRuleUp}
              y2={layout.top - familyRuleUp}
              stroke={mutedInk}
              strokeWidth={direction.stroke.rule}
            />
            <text
              x={(left + right) / 2}
              y={layout.top - familyBaselineUp}
              textAnchor="middle"
              {...line(annot)}
              fill={mutedInk}
            >
              {set(shortly(f), annot)}
            </text>
          </g>
        );
      })}

      {/* THE SHARE COLUMN'S OWN HEAD JOINS THE STAGGER. Measured at 1080x1080: with the source
          heads stepping round two lines, « Pétrole » landed on the bottom line and « bas-carbone »
          starts 8px past the grid's right edge on that same line — the two ran together. It takes
          the line the LAST source head is not on, so the two can never share one. Landscape keeps
          the single line it was accepted with. */}
      <text
        x={gridRight + 8}
        y={
          layout.top -
          HEAD_DROP -
          (NARROW
            ? ((headRow(sources.length - 1) + 1) % headRows) * HEAD_STEP
            : 0)
        }
        {...line(axis)}
        fill={mutedInk}
      >
        {set(shareHead, axis)}
      </text>

      {sources.map((s, i) => (
        <text
          key={s.key}
          x={xOf(i) + (cellW - gap) / 2}
          y={layout.top - HEAD_DROP - headRow(i) * HEAD_STEP}
          textAnchor="middle"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(shortly(s), axis)}
        </text>
      ))}

      {rows.map((row, r) => (
        <g key={row.key}>
          <text
            x={gridLeft - 6}
            y={yOf(r) + cellH / 2 + (axisBand.ascent - axisBand.descent) / 2}
            textAnchor="end"
            {...line(axis)}
            fill={mutedInk}
          >
            {set(row.label, axis)}
          </text>
          {row.shares.map((share, c) => (
            <rect
              key={`${row.key}-${sources[c].key}`}
              x={xOf(c)}
              y={yOf(r)}
              width={cellW - gap}
              height={cellH - gap}
              fill={!Number.isFinite(share) ? mix(direction.ground, ink, 0.06) : back.has(idAt.get(`${plate.order[r]}-${c}`) as number) ? mix(classFill(classOf(share)), direction.ground, 0.75) : classFill(classOf(share))}
              stroke={grid}
              strokeWidth={direction.stroke.hairline}
            />
          ))}
          {printsValues &&
            row.shares.map((share, c) => !Number.isFinite(share) ? null : (
              <text
                key={`v-${row.key}-${sources[c].key}`}
                x={xOf(c) + (cellW - gap) / 2}
                y={
                  yOf(r) +
                  cellH / 2 +
                  (valueBand.ascent - valueBand.descent) / 2
                }
                textAnchor="middle"
                {...line(value)}
                fill={adjustToContrast(
                  ink,
                  classFill(classOf(share)),
                  TEXT_CONTRAST_MIN,
                )}
              >
                {format(share)}
              </text>
            ))}
          {/* THE NUMBER THE ROW ORDER IS BY, WRITTEN. An order is a claim, and a reader who cannot
              see the quantity the rows are sorted on cannot check it. */}
          {hasMeasure && (
          <text
            x={gridRight + 8}
            y={yOf(r) + cellH / 2 + (valueBand.ascent - valueBand.descent) / 2}
            {...line(value)}
            fill={inRun(r) ? accentInk : mutedInk}
            fontWeight={inRun(r) ? 700 : value.fontWeight}
          >
            {set(format(row.lowCarbon), value)}
          </text>
          )}
        </g>
      ))}

      {/* THE REGION, NAMED — the pin-code poster's answer for a grid too dense to print. The finding
          in a heatmap is a SHAPE, and a callout on one cell cannot say it. The bracket is drawn in
          the ink, outside the ramp entirely, so it can never be read as a value. */}
      {[...rowRuns].map(([index, [from, to]]) => {
        const top = yOf(from) - gap;
        const bottom = yOf(to + 1) - gap;
        const x = gridRight + shareRoom + 6;
        return (
          <path
            key={`run-${index}`}
            d={`M ${x - 5} ${top} L ${x} ${top} L ${x} ${bottom} L ${x - 5} ${bottom}`}
            fill="none"
            stroke={ink}
            strokeWidth={direction.stroke.rule * 1.5}
          />
        );
      })}

      <Overlay
        plate={plate}
        cells={gridCells}
        box={({ slot, c }: { slot: number; c: number }) => ({ x: xOf(c), y: yOf(slot), w: cellW - gap, h: cellH - gap })}
        gap={gap}
        ink={ink}
        ground={direction.ground}
        accentInk={accentInk}
        stroke={direction.stroke}
        rowRuns={rowRuns}
      />

      {noteLines.flatMap((n, k) => {
        const before = noteLines.slice(0, k).reduce((s, x) => s + x.lines.length, 0);
        return n.lines.map((l, i) => (
          <text key={`note-${n.index}-${i}`} x={PAD} y={layout.notesTop + (before + i) * annotLead} {...line(annot)} fill={n.accent ? accentInk : ink} fontWeight={n.accent ? 700 : annot.fontWeight}>
            {l}
          </text>
        ));
      })}

      {/* THE KEY: six classes with edges, each break printed in the data's unit, and each break set
          in the fill of the class it opens — walked to the text floor so a pale class stays legible
          without becoming a different colour. The caption IS the swatch. */}
      {on("the-scale-is-stepped-not-continuous") &&
        (() => {
          const left = keyFullWidth ? PAD : gridLeft;
          const swatchW = keyFullWidth
            ? (width - PAD * 2) / classCount
            : Math.max(cellW * 0.8, 30);
          const top =
            layout.bottom + 10 + (regionUnderGrid ? annotLead : 0);
          return (
            <g>
              {Array.from({ length: classCount }, (_, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={left + i * swatchW}
                    y={top}
                    width={swatchW - gap}
                    height={axisBand.ascent}
                    fill={classFill(i)}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {i > 0 && (
                    <text
                      x={left + i * swatchW}
                      y={top + axisBand.ascent * 2 + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={adjustToContrast(
                        classFill(i),
                        direction.ground,
                        TEXT_CONTRAST_MIN,
                      )}
                    >
                      {set(format(breaks[i - 1]), axis)}
                    </text>
                  )}
                </g>
              ))}
              {plate.cutoffs.map((cut) => {
                const i = classOf(cut.value);
                const lo = i > 0 ? breaks[i - 1] : null;
                const hi = i < breaks.length ? breaks[i] : null;
                const within = lo !== null && hi !== null ? (cut.value - lo) / (hi - lo) : 0;
                const x = left + (i + within) * swatchW;
                return <path key={`cut-${cut.index}`} d={`M ${x - 4} ${top - 5} L ${x + 4} ${top - 5} L ${x} ${top + 1} Z`} fill={ink} />;
              })}
              <text
                x={keyFullWidth ? left : left + classCount * swatchW + 8}
                y={
                  keyFullWidth
                    ? top + axisBand.ascent * 2 + 2 + axisLead
                    : top + axisBand.ascent
                }
                {...line(axis)}
                fill={mutedInk}
              >
                {set(unit, axis)}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */

// The worked example fixed its year and its two key captions; the harness copy takes them as props,
// with the old values as defaults.
const DEFAULT_YEAR = 2024;
const DEFAULT_MISSING_LABEL = "date qui n’existe pas";



export type Day = { date: string; month: number; day: number; value: number };
export type Streak = { from: Day; to: Day; length: number; threshold: number };

function CalendarPlate({
  days,
  months,
  monthsShort,
  breaks,
  plate,
  cells: gridCells,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  frame,
  year = DEFAULT_YEAR,
  keyLabel,
  missingLabel = DEFAULT_MISSING_LABEL,
}: {
  days: Day[];
  months: string[];
  /** The same twelve names, abbreviated, for a frame whose row gutter cannot hold the full ones. */
  monthsShort?: string[];
  breaks: number[];
  plate: Plate;
  cells: GridCell[];
  unit: string;
  /** The headline, the standfirst and the reading line in FORMS, longest first — R3's rung and
   *  R4's. Landscape takes the first of each and has never needed another. */
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
  /** The calendar year the grid is laid out for (month lengths, leap day). */
  year?: number;
  /** The key's caption; defaults to the worked example's French sentence around `unit`. */
  keyLabel?: string;
  /** The caption of the swatch for a date that does not exist. */
  missingLabel?: string;
}) {
  const { width, height } = frame ?? FRAME;
  /** THE FORM THE FRAME ASKS FOR, read off the frame rather than passed in, so one component serves
   *  the three export sizes without the runner having to tell it which it is drawing. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: { fontSize: number; fontWeight: number; fontFamily: string }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

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

  // ── header and footer ─────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  // ── the grid ──────────────────────────────────────────────────────────────
  const keyed = on("the-key-prints-its-breaks-in-the-data-s-units");
  const marksMissing = on("a-missing-cell-is-drawn-as-missing");
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  const keyHeight = keyed ? axisBand.ascent + axisBand.descent + 16 : 0;

  /** THE ROW GUTTER TAKES THE NAMES IT CAN AFFORD. « Septembre » is 100px of the 424 this plate has
   *  at 1080 wide — a quarter of the frame spent naming the rows, and the 31 columns left holding
   *  10px each. The full names are kept while they cost less than a sixth of the column; past that
   *  the abbreviations are taken, and the grid gets the width back. Landscape is 960 wide and the
   *  full names cost a tenth of it, so nothing changes there. */
  const roomFor = (names: string[]) =>
    Math.max(...names.map((m) => widthOf(set(m, axis), axis))) + 12;
  const monthNames =
    monthsShort && roomFor(months) > column / 6 && roomFor(monthsShort) < roomFor(months)
      ? monthsShort
      : months;
  const monthRoom = roomFor(monthNames);
  const gridLeft = PAD + monthRoom;
  const gridRight = width - PAD;

  /** WHAT THE TWELVE ROWS OWE. Every row is named on its own midline, so the rows cannot be closer
   *  together than the run that names them — which is what failed at square, where 100px of plot
   *  divided by twelve gave 8px rows under an 11px name. */
  const rowOwes = axisBand.ascent + axisBand.descent + 2;
  const gridOwes = SIZE === "landscape" ? 0 : 12 * rowOwes;

  /** EVERY NOTE ON A CAPTION LINE ABOVE THE GRID (one plate draws every gesture at once). */
  const noteLines = plate.notes.map((n) => ({ ...n, lines: wrap(set(n.text, annot), column, annot) }));
  const notesRoom = noteLines.length ? noteLines.reduce((s, n) => s + n.lines.length, 0) * leadOf(annot) + 4 : 0;
  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
    const readingTop =
      sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);
    const notesTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.2;
    const plotTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.6 + notesRoom;
    const plotBottom =
      (readingLines.length ? readingTop : sourceTop - bodyLead * 1.2) -
      gapOf(annot, 0.7857) -
      keyHeight -
      8;
    return {
      titleLines,
      limitLines,
      readingLines,
      limitsTop,
      readingTop,
      plotTop,
      plotBottom,
      notesTop,
      plot: plotBottom - plotTop,
    };
  };
  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  let taken = rungs[0];
  let layout = layoutFor(taken.title, taken.limit, taken.reading);
  let best = layout.plot;
  for (const rung of rungs) {
    const candidate = layoutFor(rung.title, rung.limit, rung.reading);
    best = Math.max(best, candidate.plot);
    taken = rung;
    layout = candidate;
    if (candidate.plot >= gridOwes) break;
  }
  if (layout.plot < gridOwes)
    throw new Error(
      `the copy leaves the twelve month rows ${best.toFixed(0)}px at its most generous rung and ` +
        `they owe ${gridOwes.toFixed(0)}px at ${width}x${height} — ${rowOwes.toFixed(0)}px each, ` +
        `which is what a month's name needs not to print into the month below it.`,
    );
  const { titleLines, limitLines, readingLines, limitsTop, readingTop, plotTop, plotBottom, notesTop } = layout;
  if (SIZE !== "landscape")
    console.log(
      `  ladder: headline ${taken.title + 1}, standfirst ${taken.limit + 1}, reading ` +
        (taken.reading < 0 ? "dropped" : `form ${taken.reading + 1}`) +
        ` · rows ${layout.plot.toFixed(0)}px, floor ${gridOwes.toFixed(0)}px · months ` +
        (monthNames === months ? "in full" : "abbreviated"),
    );

  /** CELLS NEED NOT BE SQUARE. Forced square, a 31 x 12 grid is bound by the frame's height and
   *  leaves half the plate empty — measured on the first render, where the year stopped at the
   *  middle of the page. The cell takes the width it has and the height it has, capped at 2:1 so it
   *  still reads as a grid rather than as twelve bar charts. */
  const cellW = (gridRight - gridLeft) / 31;
  const cellH = Math.min((plotBottom - plotTop) / 12, cellW * 2);
  const gap = Math.max(Math.min(cellW, cellH) * 0.08, 0.6);

  /** THE CAP LEAVES SLACK, AND THE SLACK IS SPLIT RATHER THAN DUMPED AT THE FOOT.
   *
   *  `cellH` is capped at twice `cellW` so twelve rows do not become twelve bar charts, and at
   *  1080x1920 that cap bites hard: the rungs hand the grid 447px and the twelve rows only want
   *  312, so 135px fell between the last row and the key — a hole a reader reads as something
   *  missing. The grid keeps its own height and the leftover is split above and below it, and the
   *  key follows the ROWS rather than the room they were offered. Landscape's cells are nowhere
   *  near the cap, so its slack is zero and nothing there moves. */
  const gridHeight = cellH * 12;
  const slack = Math.max(0, plotBottom - plotTop - gridHeight);
  const gridTop = plotTop + slack / 2;
  const gridBottom = gridTop + gridHeight;

  const xOf = (day: number) => gridLeft + (day - 1) * cellW;
  const yOf = (month: number) => gridTop + month * cellH;

  /** ONE HUE, SIX BINS. The poles are the direction's own: a pale step off the ground at the cold
   *  end, the accent deepened toward the ink at the warm end. A ramp built this way reads
   *  `sequential` with one cluster without anyone having to test it. */
  const cold = mix(direction.accent, direction.ground, 0.88);
  const warm = mix(direction.accent, ink, 0.25);
  const bin = (value: number) => breaks.filter((b) => value >= b).length;
  /** SIX BINS, FIVE BREAKS: the ratio runs over the number of BINS minus one, not over the breaks.
   *  Divided by `breaks.length - 1` the last bin lands at 1.25 and `mix` walks past its own end —
   *  the warm end came out black, which is not a step of the accent's ramp at all. */
  const bins = breaks.length + 1;
  const rampFill = (index: number) => mix(cold, warm, bins > 1 ? index / (bins - 1) : 0.5);
  /** OUTSIDE THE RAMP, and separated from its low end by LIGHTNESS as well as hue — Datawrapper's
   *  own counter-lesson, because hue alone does not survive greyscale. */
  const missingFill = mix(direction.ground, ink, 0.06);

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

  const byDate = new Map(days.map((d) => [`${d.month}-${d.day}`, d]));
  const daysInMonth = (month: number) => new Date(year, month + 1, 0).getDate();

  const idAt = new Map(gridCells.map((g) => [`${g.r}-${g.c}`, g.id]));
  const back = new Set(plate.back);

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
        <text key={l + i} x={PAD} y={titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={readingTop + i * bodyLead} {...line(annot)} fill={mutedInk}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {monthNames.map((name, month) => (
        <text
          key={name}
          x={gridLeft - 8}
          y={yOf(month) + cellH / 2 + (axisBand.ascent - axisBand.descent) / 2}
          textAnchor="end"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(name, axis)}
        </text>
      ))}
      {[1, 5, 10, 15, 20, 25, 31].map((day) => (
        <text
          key={`day-${day}`}
          x={xOf(day) + cellW / 2}
          y={gridTop - axisBand.descent - 4}
          textAnchor="middle"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(day), axis)}
        </text>
      ))}

      {months.map((_, month) =>
        Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const reading = byDate.get(`${month}-${day}`);
          const exists = day <= daysInMonth(month);
          if (!exists && !marksMissing) return null;
          return (
            <rect
              key={`${month}-${day}`}
              x={xOf(day)}
              y={yOf(month)}
              width={cellW - gap}
              height={cellH - gap}
              fill={reading ? (back.has(idAt.get(`${month}-${day - 1}`) as number) ? mix(rampFill(bin(reading.value)), direction.ground, 0.75) : rampFill(bin(reading.value))) : missingFill}
              stroke={grid}
              strokeWidth={direction.stroke.hairline}
            />
          );
        }),
      )}

      {/* THE EXTREME, MARKED SO IT CANNOT BE MISTAKEN FOR THE GRID ITSELF.
          Two versions were drawn and both failed for the same reason: the mark looked like part of
          the grid. In the accent it vanished into the two warmest bins — the very cells a run above
          the threshold is made of. In the PAPER's colour it became indistinguishable from the gaps
          between cells, which are also the paper. What survives is a line in the INK, laid in the
          gutter around the block rather than on the cells, with a paper-coloured halo under it so it
          holds over a dark cell and over a pale one alike. Ink is the one value a ramp between the
          ground and the accent never takes. */}
      <Overlay
        plate={plate}
        cells={gridCells}
        box={({ slot, c }: { slot: number; c: number }) => ({ x: xOf(c + 1), y: yOf(slot), w: cellW - gap, h: cellH - gap })}
        gap={gap}
        ink={ink}
        ground={direction.ground}
        accentInk={accentInk}
        stroke={direction.stroke}
        rowRuns={new Map()}
      />

      {noteLines.flatMap((n, k) => {
        const before = noteLines.slice(0, k).reduce((s, x) => s + x.lines.length, 0);
        return n.lines.map((l, i) => (
          <text key={`note-${n.index}-${i}`} x={PAD} y={notesTop + (before + i) * leadOf(annot)} {...line(annot)} fill={n.accent ? accentInk : ink} fontWeight={n.accent ? 700 : annot.fontWeight}>
            {l}
          </text>
        ));
      })}

      {/* THE KEY: binned, each step printing its own break in the data's unit, so the colour can be
          inverted. A gradient bar would give the direction and nothing else. */}
      {keyed &&
        (() => {
          const swatch = Math.max(cellW * 1.6, 26);
          const top = gridBottom + 12;
          const left = gridLeft;
          return (
            <g>
              {[...breaks, null].map((value, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={left + i * swatch}
                    y={top}
                    width={swatch - gap}
                    height={axisBand.ascent}
                    fill={rampFill(i)}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {value !== null && (
                    <text
                      x={left + i * swatch + swatch - gap}
                      y={top + axisBand.ascent + axisBand.ascent + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={mutedInk}
                    >
                      {set(format(value), axis)}
                    </text>
                  )}
                </g>
              ))}
              {plate.cutoffs.map((cut) => {
                const i = bin(cut.value);
                const lo = i > 0 ? breaks[i - 1] : null;
                const hi = i < breaks.length ? breaks[i] : null;
                const within = lo !== null && hi !== null ? (cut.value - lo) / (hi - lo) : 0;
                const x = left + (i + within) * swatch - (i > 0 && within === 0 ? gap : 0);
                return <path key={`cut-${cut.index}`} d={`M ${x - 4} ${top - 5} L ${x + 4} ${top - 5} L ${x} ${top + 1} Z`} fill={ink} />;
              })}
              <text
                x={left + (breaks.length + 1) * swatch + 8}
                y={top + axisBand.ascent}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(keyLabel ?? `moyenne du jour, en ${unit}`, axis)}
              </text>
              {marksMissing && (
                <g>
                  <rect
                    x={left + (breaks.length + 1) * swatch + 8}
                    y={top + axisBand.ascent + 6}
                    width={swatch - gap}
                    height={axisBand.ascent}
                    fill={missingFill}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  <text
                    x={left + (breaks.length + 1) * swatch + 8 + swatch + 4}
                    y={top + axisBand.ascent * 2 + 4}
                    {...line(axis)}
                    fill={mutedInk}
                  >
                    {set(missingLabel, axis)}
                  </text>
                </g>
              )}
            </g>
          );
        })()}
    </svg>
  );
}
