/**
 * Life expectancy 2000 against 2023, ten countries, drawn THROUGH the design base.
 *
 * The nineteenth component in this tree, and the first from the base's LARGEST family: `paired`
 * carries 19 references across nine publications — The Marshall Project, The Pudding, ProPublica,
 * Reuters, Information is Beautiful, ABC, and `100.datavizproject.com`.
 *
 * `the-connector-is-either-furniture-or-the-mark` (IiB, Ferdio — two publications, two answers, and
 * the IiB record names the fork itself: "both are coherent"). This beat's headline is the GAIN, so
 * the connector carries it: it is the loudest thing on the row and the delta is set inside it. The
 * other answer — connector as furniture, thinner and lighter than either endpoint — is what lets a
 * hundred pairs sit on one plate, and this plate has ten.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` (five publications across TWO families now:
 * Datawrapper and Statista on the bullet, ABC, Reuters and Ferdio here) — 2000 and 2023 are two
 * chromas of the direction's own accent. The undirected version of this beat used two CVD-safe hues
 * from `PALETTE.md`; the corpus's own answer, arrived at independently five times, is one hue.
 *
 * `a-pair-too-close-to-draw-is-written` (Pudding, Reuters) — a gap under a twelfth of the plate's
 * range draws one dot with a smudge, which reads as a MISSING reading rather than a small change.
 * Every row here carries its own printed gain, so the smallest is a number rather than a hope.
 *
 * `the-subject-is-ringed-not-recoloured` (IiB, Reuters) — the row the headline names keeps its own
 * fills and takes a ring: "emphasis costs no encoding channel".
 */

import { scaleLinear } from "d3-scale";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
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

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

/** This beat's own type, as its BRIEF declares it — what decides whether a tall frame asks for the
 *  twin form, and what `directed-size.mjs` greps this file for before it will hand it one. */
const TYPE = "dumbbell";

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Row = { key: string; label: string; from: number; to: number; gain: number };

export function DirectedDumbbell({
  rows,
  subject,
  fromName,
  toName,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  gainLabel,
  scope,
  keep,
  direction,
  treatments,
  frame,
}: {
  rows: Row[];
  subject: string;
  fromName: string;
  toName: string;
  unit: string;
  /** The headline in FORMS, longest first. It was ONE string, and a headline with one form is a
   *  ladder with no rung: at 1080x1080 `nocturne` — the largest display of the three — wrapped it
   *  to four lines and handed the ten rows 73px of what was left. The shorter forms still name
   *  BOTH ends the sentence is about, because the ends are the claim. */
  title: string | string[];
  limits: string | string[];
  reading: string | string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  gainLabel: (row: Row) => string;
  /** R8's OWN SENTENCE, written by the caller in this plate's voice and called with the count the
   *  ladder ACTUALLY took — never a number typed anywhere. Absent means this beat has no R8 and
   *  the ladder stops at the copy rungs. */
  scope?: (drawn: number, all: number) => string;
  /** The rows R8 may not drop, by key: the ones the HEADLINE names. A reduction that silently
   *  removed a country from the sentence above it would be the plate contradicting itself. */
  keep?: string[];
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  /**
   * THE TWIN FORM, ASKED OF THIS BEAT'S OWN TYPE — and on a dumbbell the answer is the drawing that
   * was already here.
   *
   * `type-at-size.mjs` answers `transpose` for every band-scale type at a tall frame: rows running
   * down the plate, every category name horizontal on one line. A dumbbell's category axis is
   * nominal and already vertical, so this plate has drawn that form since its landscape was
   * accepted — the transposition a column chart owes at 1080x1920 costs nothing here.
   *
   * Asking anyway is not ceremony. `directed-size.mjs` REFUSES a tall frame to any component whose
   * own `Directed*.tsx` never calls `formForSize`, because one that never asks would draw a
   * landscape's columns into a 540-wide frame at a finger's width with the names printed through
   * each other. The ask is what opens the gate, and the verdict is recorded with the render rather
   * than assumed.
   *
   * What the tall frame DOES change is everything derived from WIDTH: the value axis crosses 540px
   * instead of 960 while the name gutter and the gain gutter take the same absolute pixels out of
   * it. The tick ladder below is that re-derivation, and it is measured rather than gated on this
   * verdict — square answers `as-is` (a read render holds it, MEASURED_HOLDS) and is exactly as
   * narrow.
   *
   * The size is read off the frame rather than passed in, because the frame is what the component is
   * already given and the three are distinguishable by their own proportions.
   */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose";

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

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
  const titleChoices = (Array.isArray(title) ? title : [title]).filter(Boolean);
  const limitChoices = (Array.isArray(limits) ? limits : [limits]).filter(Boolean);
  const readingChoices = (Array.isArray(reading) ? reading : [reading]).filter(Boolean);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /** THE ROW PITCH IS A FLOOR, AND THE WORDS PAY FOR IT. Ten rows each carry a printed gain, and in
   *  the direction with the largest value register the labels collided — seven overlapping pairs,
   *  found by the ink guard, not by eye. The ladder spends the reading line's short forms, then the
   *  reading line, then the standfirst's, and refuses rather than stack numbers on top of each
   *  other. Same shape as the gantt's ladder next door. */
  const rowsOwe = measureTextBand("Hxpg1,", sizeOf(value)).ascent +
    measureTextBand("Hxpg1,", sizeOf(value)).descent + 3;
  /**
   * R8 — DRAW FEWER ROWS AND SAY SO ON THE PLATE, and it is the LAST rung, under every word rung.
   *
   * The square refusal of 2026-09-23 read « 10 rows want 17.3px of pitch and this frame gives
   * 15.3px with every rung spent » in `creme` and 7.3px in `nocturne`, and stopped there. It was
   * one rung short: `REMOVAL_LADDER` ends by reducing WHAT IS DRAWN and stating the reduction in
   * the plate's own words. Measured 2026-09-24 at 540x540, `nocturne` leaves 73px of plot for ten
   * rows that owe 15.6px each — half a plate of header against a quarter of a plate of drawing —
   * so no arrangement of the same ten rows was ever going to hold, and the honest move is to draw
   * fewer and say how many.
   *
   * WHAT IS KEPT IS NOT A SAMPLE. The two countries the headline NAMES — the largest gain and the
   * smallest — are forced in whatever their rank, and the rest are taken from the top of the
   * ranking down. A ranking read from its top is still a ranking; a ranking missing the country
   * its own headline is about is a plate contradicting itself.
   *
   * THE FLOOR IS A THIRD OF THE FIELD (and never fewer than the rows the headline names). Below it
   * the plate stops being a picture of the ten and becomes a picture of three, which is not the
   * sentence this beat makes, and it refuses there rather than ship it.
   */
  const mustKeep = new Set(keep ?? []);
  const ROW_FLOOR = Math.max(Math.ceil(rows.length / 3), mustKeep.size, 2);
  /** The rows R8 draws at a given count: the headline's own ends first, then down the ranking. The
   *  beat's own order is preserved, so the plate is still read top to bottom. */
  const rowsAt = (n: number) => {
    if (n >= rows.length) return rows;
    const kept = new Set(rows.filter((r) => mustKeep.has(r.key)));
    for (const r of rows) {
      if (kept.size >= n) break;
      kept.add(r);
    }
    return rows.filter((r) => kept.has(r));
  };

  const layout = (() => {
    let last = null;
    // The row count is the OUTER loop, so every word rung is spent at the full field before one
    // row is given up — and once a row has been given up the words come back, longest first.
    for (let drawn = rows.length; drawn >= ROW_FLOOR; drawn -= 1) {
      const plate = rowsAt(drawn);
      /** R8's condition: the reader is told, in the standfirst's own first sentence, how many of
       *  how many are drawn and by what rule. Written from `plate.length`, which is the count the
       *  ladder took — never a literal. */
      const scopeLine =
        plate.length < rows.length && scope ? scope(plate.length, rows.length) : "";
      for (const [titleForm, titleText] of titleChoices.entries())
        for (const limitText of limitChoices)
          for (const readingText of [...readingChoices, ""]) {
            const titleLines = wrap(set(titleText, display), column, display);
            const limitsTop =
              titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
            const limitLines = wrap(
              set(scopeLine ? `${scopeLine} ${limitText}` : limitText, body),
              column,
              body,
            );
            const readingLines = readingText ? wrap(set(readingText, annot), column, annot) : [];
            const readingTop =
              sourceTop -
              readingLines.length * bodyLead -
              (readingLines.length ? gapOf(annot, READING_TO_SOURCE) : 0);
            const top =
              limitsTop + limitLines.length * bodyLead + measureTextBand("Hxpg1,", sizeOf(annot)).ascent * 2.8;
            const bottom =
              readingTop -
              gapOf(annot, 0.7857) -
              measureTextBand("Hxpg1,", sizeOf(axis)).ascent -
              measureTextBand("Hxpg1,", sizeOf(axis)).descent -
              8;
            const candidate = {
              plate,
              scopeLine,
              titleForm,
              titleLines,
              limitsTop,
              limitLines,
              readingLines,
              readingTop,
              top,
              bottom,
            };
            last = candidate;
            if ((bottom - top) / plate.length >= rowsOwe) return candidate;
          }
    }
    return last!;
  })();
  const plate = layout.plate;
  const titleLines = layout.titleLines;
  const limitsTop = layout.limitsTop;
  const limitLines = layout.limitLines;
  const readingLines = layout.readingLines;
  const readingTop = layout.readingTop;
  console.log(
    `  ladder: headline form ${layout.titleForm + 1}, standfirst ${limitLines.length} line(s), ` +
      `reading ${readingLines.length ? `${readingLines.length} line(s)` : "dropped"}` +
      `${plate.length < rows.length ? `, R8: ${plate.length} of ${rows.length} rows drawn` : ""} · ` +
      `pitch ${((layout.bottom - layout.top) / plate.length).toFixed(1)}px, owed ${rowsOwe.toFixed(1)}px`,
  );
  if ((layout.bottom - layout.top) / plate.length < rowsOwe)
    throw new Error(
      `${plate.length} rows want ${rowsOwe.toFixed(1)}px of pitch to print their gains and this frame ` +
        `gives ${((layout.bottom - layout.top) / plate.length).toFixed(1)}px with every rung spent, ` +
        `down to R8's floor of ${ROW_FLOOR} of ${rows.length} rows`,
    );

  // ── the rows ──────────────────────────────────────────────────────────────
  /** The gain is printed on every row under `value-on-the-mark`; `a-pair-too-close-to-draw-is-written`
   *  is what would make it MANDATORY, and on this beat it does not fire — the smallest gap is 22.6 %
   *  of the plate's range, comfortably drawable. Both are honoured by the same mark, and the beat
   *  logs which one asked for it. */
  const written = on("value-on-the-mark") || on("a-pair-too-close-to-draw-is-written");
  const ringed = on("the-subject-is-ringed-not-recoloured");
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);
  const axisBand = bandOf(axis);

  /** THE RING IS THE PLATE'S TEXT COLUMN, AND THE COLUMNS ARE SIZED SO THE ROW FITS INSIDE IT.
   *
   *  The frame that names the subject runs edge to edge of the column the eyebrow, the title, the
   *  standfirst and the source all start at — that is the one vertical this plate already has, and a
   *  frame that lands anywhere else reads as a second, wrong one. Its first version was that column
   *  and nothing else, which left the widest name 2px inside the left edge and the widest gain 6px
   *  inside the right: hugged on one side, floating on the other, and in `rapport` the `+5,0` sat on
   *  the stroke. So the breath is RESERVED rather than hoped for — the name column and the gain
   *  column each carry it, and no label on any row can come closer to the frame than this. */
  const RING_BREATH = 10;
  const nameGap = 12;
  const gainGap = 12;
  /** MEASURE THE WEIGHT THE ROW WILL ACTUALLY BE DRAWN AT. The subject's name and gain are set in
   *  700 while the register itself is 600, and a column measured at the register's weight is 2.1px
   *  short of the one row that matters — which is exactly the row the frame is drawn around. */
  const atWeight = (r: any, isSubject: boolean) =>
    isSubject ? { ...r, fontWeight: 700 } : r;
  const isSubjectRow = (r: Row) => r.key === subject;
  const nameRoom =
    Math.max(
      ...plate.map((r) =>
        widthOf(set(r.label, annot), atWeight(annot, isSubjectRow(r))),
      ),
    ) +
    nameGap +
    RING_BREATH;
  const gainRoom =
    Math.max(
      ...plate.map((r) =>
        widthOf(set(gainLabel(r), value), atWeight(value, isSubjectRow(r))),
      ),
    ) +
    gainGap +
    RING_BREATH;

  const plotTop = layout.top;
  const plotBottom = layout.bottom;
  const plotLeft = PAD + nameRoom;
  const plotRight = width - PAD - gainRoom;

  const values = plate.flatMap((r) => [r.from, r.to]);
  const pad = (Math.max(...values) - Math.min(...values)) * 0.06;
  const x = scaleLinear()
    .domain([Math.min(...values) - pad, Math.max(...values) + pad])
    .nice()
    .range([plotLeft, plotRight]);

  const pitch = (plotBottom - plotTop) / plate.length;
  const dot = Math.min(pitch * 0.26, 8);

  /**
   * THE TICKS ARE COUNTED AGAINST THE PLATE THEY HAVE TO FIT ON, not fixed at six.
   *
   * `x.ticks(6)` returns EIGHT labels on this domain — 72 to 86, step 2 — which is comfortable
   * across the 681-711px the landscape plot leaves them and impossible across the 261-291px a
   * 540-wide frame leaves after the two gutters, neither of which shrinks with the frame. Measured at
   * 1080x1920 and again at 1080x1080: « 84 » and « 86 ans » printed through each other —
   * « 8486 ans » — in all three directions, and nothing fired. `assertNoOverlappingText` refuses a
   * plate where MOST of the ink overlaps, and one collision among eight labels is not most; the
   * square render carrying it was read and accepted into `MEASURED_HOLDS` with the defect in it.
   *
   * The collision is one-sided because the unit rides on the LAST label — R1's "its unit folds into
   * the last tick label", already spent — so the widest run is the one hard against the plot's
   * right edge. So the count descends from the six landscape was accepted at until every run
   * MEASURES clear of its neighbour, and stops at three: R2's floor, "floor, middle, top". No rung
   * makes anything smaller. Landscape measures clear at six and is unchanged.
   */
  const TICK_BREATH = 6;
  const tickRuns = (n: number) => {
    const all = x.ticks(n);
    return all.map((t, i) => {
      const text = set(i === all.length - 1 ? `${format(t)} ${unit}` : format(t), axis);
      const w = widthOf(text, axis);
      const anchor = i === 0 ? "start" : i === all.length - 1 ? "end" : "middle";
      const left = anchor === "start" ? x(t) : anchor === "end" ? x(t) - w : x(t) - w / 2;
      return { t, text, anchor, left, right: left + w };
    });
  };
  const axisTicks = (() => {
    for (let n = 6; n >= 3; n -= 1) {
      const runs = tickRuns(n);
      if (runs.every((r, i) => i === 0 || r.left - runs[i - 1].right >= TICK_BREATH)) return runs;
    }
    throw new Error(
      `the value axis cannot print even three labels across ${(plotRight - plotLeft).toFixed(0)}px ` +
        `without one running into the next. The gutters are the thing to spend: the names and the ` +
        `gains are both sized in absolute pixels and neither shrinks with the frame.`,
    );
  })();
  console.log(
    `  form: ${SIZE} -> ${ROWS ? "transpose" : "as-is"}` +
      `${ROWS ? " (rows — which this plate has drawn since landscape)" : ""} · ` +
      `axis ${axisTicks.length} tick(s) across ${(plotRight - plotLeft).toFixed(0)}px`,
  );

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
  /** ONE HUE, TWO CHROMAS — five publications across two families. The earlier state is the pale
   *  one and "falls into the furniture"; the later state is the accent at full strength. */
  const fromFill = mix(direction.accent, direction.ground, 0.62);
  const toFill = direction.accent;
  /** THE CONNECTOR CARRIES THE CHANGE HERE, so it is the loudest thing on the row: the gain is the
   *  headline, and Ferdio's answer is the one that fits — the delta set inside the span it draws. */
  const connector = mix(direction.accent, direction.ground, 0.3);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        layout.scopeLine ? `${alt} À cette taille, le graphique n’en dessine que ${layout.scopeLine}` : alt
      }
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

      {/* The two states, named once above the plot in their own inks — the key is the sentence, not
          a block of swatches. */}
      <g>
        <circle cx={plotLeft + dot} cy={plotTop - annotBand.ascent * 1.1} r={dot} fill={fromFill} />
        <text
          x={plotLeft + dot * 2.6}
          y={plotTop - annotBand.ascent * 1.1 + (annotBand.ascent - annotBand.descent) / 2}
          {...line(annot)}
          fill={mutedInk}
        >
          {set(fromName, annot)}
        </text>
        {(() => {
          const at = plotLeft + dot * 2.6 + widthOf(set(fromName, annot), annot) + 18;
          return (
            <g>
              <circle cx={at + dot} cy={plotTop - annotBand.ascent * 1.1} r={dot} fill={toFill} />
              <text
                x={at + dot * 2.6}
                y={plotTop - annotBand.ascent * 1.1 + (annotBand.ascent - annotBand.descent) / 2}
                {...line(annot)}
                fill={accentInk}
                fontWeight={700}
              >
                {set(toName, annot)}
              </text>
            </g>
          );
        })()}
      </g>

      {plate.map((row, i) => {
        const mid = plotTop + i * pitch + pitch / 2;
        const isSubject = row.key === subject;
        const x0 = x(row.from);
        const x1 = x(row.to);
        return (
          <g key={row.key}>
            {ringed && isSubject && (
              // A RING, NOT A RECOLOUR: the row keeps both its fills and gains a mark.
              <rect
                x={PAD}
                y={mid - pitch / 2 + 1}
                width={width - PAD * 2}
                height={pitch - 2}
                rx={pitch / 6}
                fill="none"
                stroke={accentInk}
                strokeWidth={direction.stroke.hairline * 2}
              />
            )}
            <line
              x1={x0}
              x2={x1}
              y1={mid}
              y2={mid}
              stroke={connector}
              strokeWidth={dot * 1.5}
              strokeLinecap="round"
            />
            <circle cx={x0} cy={mid} r={dot} fill={fromFill} />
            <circle cx={x1} cy={mid} r={dot} fill={toFill} />
            <text
              // THE NAMES START ON ONE VERTICAL, they do not end on one. Right-anchored, they hug
              // the plot and every row's name begins somewhere different — so the frame that names
              // the subject had 59px of air before `Pologne` and 10px after `+5,0`, and read as
              // off-centre because it WAS: the breath was reserved against the widest name in the
              // column, which is not the name on the framed row. Left-anchored, the inset is the
              // same ten pixels on both sides of every row, and a ranked list gets the clean left
              // edge it should have had anyway.
              x={PAD + RING_BREATH}
              y={mid + (annotBand.ascent - annotBand.descent) / 2}
              {...line(annot)}
              fill={isSubject ? accentInk : annot.fill}
              fontWeight={isSubject ? 700 : annot.fontWeight}
            >
              {set(row.label, annot)}
            </text>
            {written && (
              <text
                x={plotRight + gainGap}
                y={mid + (valueBand.ascent - valueBand.descent) / 2}
                {...line(value)}
                fill={isSubject ? accentInk : mutedInk}
                fontWeight={isSubject ? 700 : value.fontWeight}
              >
                {set(gainLabel(row), value)}
              </text>
            )}
          </g>
        );
      })}

      <line
        x1={plotLeft}
        x2={plotRight}
        y1={plotBottom + 4}
        y2={plotBottom + 4}
        stroke={grid}
        strokeWidth={direction.stroke.hairline}
      />
      {axisTicks.map((tick) => (
        <text
          key={tick.t}
          x={x(tick.t)}
          y={plotBottom + 6 + axisBand.ascent}
          textAnchor={tick.anchor}
          {...line(axis)}
          fill={mutedInk}
        >
          {tick.text}
        </text>
      ))}
    </svg>
  );
}
