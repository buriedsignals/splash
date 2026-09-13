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
  direction,
  treatments,
}: {
  rows: Row[];
  subject: string;
  fromName: string;
  toName: string;
  unit: string;
  title: string;
  limits: string | string[];
  reading: string | string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  gainLabel: (row: Row) => string;
  direction: any;
  treatments: string[];
}) {
  const { width, height } = FRAME;
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
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);
  const limitChoices = (Array.isArray(limits) ? limits : [limits]).filter(Boolean);
  const readingChoices = (Array.isArray(reading) ? reading : [reading]).filter(Boolean);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /** THE ROW PITCH IS A FLOOR, AND THE WORDS PAY FOR IT. Ten rows each carry a printed gain, and in
   *  the direction with the largest value register the labels collided — seven overlapping pairs,
   *  found by the ink guard, not by eye. The ladder spends the reading line's short forms, then the
   *  reading line, then the standfirst's, and refuses rather than stack numbers on top of each
   *  other. Same shape as the gantt's ladder next door. */
  const rowsOwe = measureTextBand("Hxpg1,", sizeOf(value)).ascent +
    measureTextBand("Hxpg1,", sizeOf(value)).descent + 3;
  const layout = (() => {
    let last = null;
    for (const limitText of limitChoices)
      for (const readingText of [...readingChoices, ""]) {
        const limitLines = wrap(set(limitText, body), column, body);
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
        const candidate = { limitLines, readingLines, readingTop, top, bottom };
        last = candidate;
        if ((bottom - top) / rows.length >= rowsOwe) return candidate;
      }
    return last!;
  })();
  const limitLines = layout.limitLines;
  const readingLines = layout.readingLines;
  const readingTop = layout.readingTop;
  console.log(
    `  ladder: standfirst ${limitLines.length} line(s), reading ${readingLines.length ? `${readingLines.length} line(s)` : "dropped"} · ` +
      `pitch ${((layout.bottom - layout.top) / rows.length).toFixed(1)}px, owed ${rowsOwe.toFixed(1)}px`,
  );
  if ((layout.bottom - layout.top) / rows.length < rowsOwe)
    throw new Error(
      `${rows.length} rows want ${rowsOwe.toFixed(1)}px of pitch to print their gains and this frame ` +
        `gives ${((layout.bottom - layout.top) / rows.length).toFixed(1)}px with every rung spent`,
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
      ...rows.map((r) =>
        widthOf(set(r.label, annot), atWeight(annot, isSubjectRow(r))),
      ),
    ) +
    nameGap +
    RING_BREATH;
  const gainRoom =
    Math.max(
      ...rows.map((r) =>
        widthOf(set(gainLabel(r), value), atWeight(value, isSubjectRow(r))),
      ),
    ) +
    gainGap +
    RING_BREATH;

  const plotTop = layout.top;
  const plotBottom = layout.bottom;
  const plotLeft = PAD + nameRoom;
  const plotRight = width - PAD - gainRoom;

  const values = rows.flatMap((r) => [r.from, r.to]);
  const pad = (Math.max(...values) - Math.min(...values)) * 0.06;
  const x = scaleLinear()
    .domain([Math.min(...values) - pad, Math.max(...values) + pad])
    .nice()
    .range([plotLeft, plotRight]);

  const pitch = (plotBottom - plotTop) / rows.length;
  const dot = Math.min(pitch * 0.26, 8);

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

      {rows.map((row, i) => {
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
      {x.ticks(6).map((t, i, all) => (
        <text
          key={t}
          x={x(t)}
          y={plotBottom + 6 + axisBand.ascent}
          textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(i === all.length - 1 ? `${format(t)} ${unit}` : format(t), axis)}
        </text>
      ))}
    </svg>
  );
}
