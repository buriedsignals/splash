/**
 * Sixteen European electricity mixes as polylines across seven axes, THROUGH the design base. The
 * first `parallel coordinates` component in this tree.
 *
 * WHAT THIS FORM SHOWS AND WHAT IT DOES NOT. Only **adjacent** axes let a reader see a relationship:
 * a crossing between two neighbours is a real inverse, a line that rises three axes later is
 * nothing. So the axis order is the argument, and this plate's order is stated in its reading line —
 * nuclear beside wind, because the crossing between those two IS the claim.
 *
 * THE RULES TAKEN FROM THE REFERENCE (the EU guide's own example figure):
 *
 *   **Every axis carries its own scale and says so on itself** — name at the top, values on the
 *   rule. Nothing is normalised to a shared 0–100: a polyline is a set of positions, not a profile
 *   whose slope means anything.
 *
 *   **The tick values sit ON the axis, in a halo of the ground.** Seven gutters would eat the plate;
 *   a haloed number reads over the lines that cross it. This tree already draws that halo everywhere
 *   a label can land on more than one colour — here it is what makes seven scales affordable.
 *
 *   **Colour is the category, never the value.** `PALETTE.md` records which category, and why two
 *   groups rather than the reference's three.
 *
 * AND ONE RULE OF THIS BEAT'S OWN, because sixteen lines can be named and four hundred cannot:
 * **every line is named once, at the axis where its own value is highest.** A polyline crossing seven
 * axes has seven places it could be labelled; its own maximum is the one place it is furthest from
 * its neighbours, so that is where its name goes. Where the seat is taken the line tries its next
 * highest axis, and the ladder prints how many could not be named at all.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
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

export type Axis = { name: string; ceiling: number; index: number };
export type Line = { code: string; name: string; values: number[]; thread: boolean };
type Box = { x0: number; y0: number; x1: number; y1: number };

export function DirectedParallelCoordinates({
  axes,
  lines,
  unit,
  threadNote,
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
  axes: Axis[];
  lines: Line[];
  unit: string;
  threadNote: string;
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
  /** THE FORM THIS FRAME ASKS FOR, read off the frame rather than passed in. A square plate is half
   *  the width landscape was tuned at, and everything below that is size-conditional keeps landscape
   *  exactly as it was accepted. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axisReg = reg("axis");
  const annot = reg("annot");

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
  const axisBand = bandOf(axisReg);

  const rail = mix(direction.ground, ink, 0.35);
  /** THE FIELD IS A TINT AND THE THREAD IS THE ACCENT. The tint has to clear the non-text floor
   *  against the ground — fourteen lines nobody can see is not context, it is a blank plate. */
  let field = mix(direction.accent, direction.ground, 0.55);
  if (contrast(field, direction.ground) < NON_TEXT_CONTRAST_MIN) {
    const lifted = adjustToContrast(field, direction.ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(`the field's lines cannot be told from the ground in this direction`);
    field = lifted;
  }

  /** THE RAILS ARE INSET FROM THE PLATE'S EDGES BY WHAT THEIR OWN NAMES NEED, so the first and last
   *  axis names do not hang off the frame — the outer two are the ones with nothing beside them.
   *  This sits ABOVE the ladder because the ladder now has to know whether the names fit on one row:
   *  at 540 wide they do not, and the row's height is part of what the rails are left with. */
  const halfFirst = widthOf(set(axes[0].name, axisReg), axisReg) / 2;
  const halfLast = widthOf(set(axes[axes.length - 1].name, axisReg), axisReg) / 2;
  const left = PAD + Math.max(0, halfFirst - 6);
  const right = width - PAD - Math.max(0, halfLast - 6);
  const railX = (i: number) => left + ((right - left) * i) / (axes.length - 1);

  /** THE NAMES ROW IS STAGGERED WHEN ITS OWN NAMES DO NOT FIT SIDE BY SIDE, and whether they fit is
   *  MEASURED rather than assumed. At 960 the seven names clear each other and this is a no-op — the
   *  landscape plate is drawn exactly as it was accepted. At 540 the rails sit 73px apart and
   *  « Hydraulique » ran into « Bioénergie »: the square and portrait renders printed
   *  « HydrauliquBioénergie », one word made of two axis names, which is the worst thing this row can
   *  do because a reader cannot even tell which rail carries which source. Dropping a name is not an
   *  option here — the axis ORDER is this beat's argument, so every name has to stay — and shrinking
   *  the type is the rule that fails at the moment it is needed. Two rows is the move that costs one
   *  band of height and keeps all seven names horizontal and whole. */
  const nameHalf = axes.map((a) => widthOf(set(a.name, axisReg), axisReg) / 2);
  const clears = (gap: number) =>
    axes.every((_, i) => i + gap >= axes.length ||
      railX(i) + nameHalf[i] + 6 <= railX(i + gap) - nameHalf[i + gap]);
  const nameRows = clears(1) ? 1 : 2;
  if (nameRows === 2 && !clears(2))
    throw new Error(
      `the axis names do not clear each other even two rows apart at ${width}px wide — ` +
        `${axes.map((a) => a.name).join(", ")}. A third row would put a name further from its own rail ` +
        `than from its neighbour's; give the beat shorter axis names instead.`,
    );
  const nameLead = axisBand.ascent + axisBand.descent + 2;

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  const layoutFor = (t: number, l: number, r: number, u: boolean) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const noteTop = readingTop - annotBand.ascent - gapOf(annot, 0.5714);
    /** The axis NAMES are a row of their own above the rails, and the unit a row above that.
     *  `u` is R1 — the axis title, whose unit the ceiling labels already carry in full (`70 %`). It
     *  is the cheapest thing on this plate to remove and the first rung a tall or square frame
     *  spends. */
    const unitTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.3;
    const namesTop = (u ? unitTop + axisBand.descent + 8 : unitTop) + axisBand.ascent;
    const top =
      namesTop +
      (nameRows - 1) * nameLead +
      axisBand.descent +
      8 +
      axisBand.ascent +
      axisBand.descent;
    const bottom = noteTop - axisBand.ascent - axisBand.descent - 12;
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      unit: u,
      unitTop,
      namesTop,
      noteTop,
      readingTop,
      sourceTop,
      top,
      bottom,
      rail: bottom - top,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number; unit: boolean }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r, unit: true });
      rungs.push({ title: t, limit: l, reading: -1, unit: true });
    }
  /** R1 LAST, NOT FIRST. The removal ladder puts the axis title at the top because it is cheap, but
   *  on this plate the unit row is the only line that says the seven scales are SHARES of the
   *  country's own production — without it a reader can take `70 %` for a share of Europe. So it is
   *  spent only once every copy rung has been, which is the order a square frame actually needs. */
  for (const rung of [...rungs]) rungs.push({ ...rung, unit: false });
  /** THE RAIL'S OWN FLOOR, AND WHY A SQUARE FRAME OWES MORE THAN SIX BANDS.
   *  A parallel-coordinates plate is read by where a line SITS on each rail; a rail too short to
   *  separate sixteen positions is a row of dots. Six axis-bands is what landscape was accepted at
   *  and it stays landscape's floor. At 540 x 540 six bands is 54px, and the ladder stopped at the
   *  FIRST rung that cleared it: the square render put three lines of display type over a 63px rail
   *  and left the bottom tenth of the frame empty — sixteen polylines flattened into a strip, with
   *  every assertion green. So a frame that is not landscape owes its rails a SIXTH of its own
   *  height, and the copy above pays for it — the same lever
   *  `static-choropleth-europe-lowcarbon` gives its map, at the fraction this plate's copy can
   *  actually afford. A sixth is not a round number chosen for its looks: a third and a quarter were
   *  both tried and both REFUSED the nocturne direction, whose tracked capitals cannot give the
   *  rails more than 94px at 540 square however deep the ladder goes. A floor no direction can
   *  clear is a refusal dressed as a standard. */
  const railOwes =
    SIZE === "landscape"
      ? (axisBand.ascent + axisBand.descent) * 6
      : Math.max((axisBand.ascent + axisBand.descent) * 6, height / 6);
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading, rung.unit);
    if (l.rail > best) best = l.rail;
    if (l.rail >= railOwes) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves the rails ${best.toFixed(0)}px and a rail that has to separate ${lines.length} ` +
        `positions owes ${railOwes.toFixed(0)}px at ${width} x ${height}.`,
    );
  const layout = fits.layout;

  const scales = axes.map((a) =>
    scaleLinear().domain([0, a.ceiling]).range([layout.bottom, layout.top]),
  );

  const pathOf = (l: Line) =>
    `M ${l.values
      .map((v, i) => `${railX(i).toFixed(1)} ${scales[i](v).toFixed(1)}`)
      .join(" L ")}`;

  /** EVERY LINE IS NAMED ONCE, AT THE AXIS WHERE ITS OWN VALUE IS HIGHEST — the place it is furthest
   *  from its neighbours. Where that seat is taken the line tries its next highest axis; the ladder
   *  prints how many could not be seated at all. */
  const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const placed: Box[] = [];
  const labels: Array<{ l: Line; x: number; y: number; anchor: "start" | "end"; text: string }> = [];
  let unnamed = 0;
  for (const l of [...lines].sort((a, b) => Number(b.thread) - Number(a.thread))) {
    const order = l.values
      .map((v, i) => ({ i, share: v / axes[i].ceiling }))
      .sort((a, b) => b.share - a.share);
    let seat: (typeof labels)[number] | null = null;
    for (const { i } of order) {
      const w = widthOf(set(l.name, axisReg), axisReg);
      const y = scales[i](l.values[i]);
      for (const anchor of ["start", "end"] as const) {
        const x = anchor === "start" ? railX(i) + 6 : railX(i) - 6;
        const box = {
          x0: anchor === "start" ? x - 2 : x - w - 2,
          y0: y - axisBand.ascent / 2 - 1,
          x1: anchor === "start" ? x + w + 2 : x + 2,
          y1: y + axisBand.descent + 1,
        };
        if (box.x0 < PAD || box.x1 > width - PAD) continue;
        if (placed.some((p) => overlaps(p, box))) continue;
        /** A NAME MAY NOT CROSS A RAIL THAT IS NOT ITS OWN. Bounded only by the plate's edges and
         *  the other names, `Danemark` ran from the wind axis across the solar one and `Tchéquie`
         *  sat on the coal rail — a label lying over an axis reads as belonging to that axis. */
        if (axes.some((_, j) => j !== i && railX(j) > box.x0 - 3 && railX(j) < box.x1 + 3)) continue;
        placed.push(box);
        seat = { l, x, y: y + axisBand.ascent / 2 - 1, anchor, text: l.name };
        break;
      }
      if (seat) break;
    }
    if (seat) labels.push(seat);
    else unnamed++;
  }

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      (fits.rung.unit ? "" : ", unit row dropped") +
      ` · rails ${layout.rail.toFixed(0)}px, floor ${railOwes.toFixed(0)}px · ${axes.length} axes` +
      (nameRows === 2 ? " on 2 name rows" : "") +
      `, ${lines.length} lines, ${unnamed} unnamed`,
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
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {layout.unit ? (
        <text x={PAD} y={layout.unitTop} {...line(axisReg)} fontWeight={700} fill={mutedInk}>
          {set(unit, axisReg)}
        </text>
      ) : null}

      {/* THE RAILS, each with its own scale and its own name at the top. */}
      {axes.map((a, i) => (
        <g key={a.name}>
          <line
            x1={railX(i)}
            x2={railX(i)}
            y1={layout.top}
            y2={layout.bottom}
            stroke={rail}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={railX(i)}
            y={layout.namesTop + (i % nameRows) * nameLead}
            textAnchor="middle"
            {...line(axisReg)}
            fontWeight={700}
            fill={mutedInk}
          >
            {set(a.name, axisReg)}
          </text>
        </g>
      ))}

      {/* THE LINES: the field first, the thread over it, so the two the headline names are never
          buried under the fourteen it does not. */}
      {lines
        .filter((l) => !l.thread)
        .map((l) => (
          <path
            key={l.code}
            d={pathOf(l)}
            fill="none"
            stroke={field}
            strokeWidth={direction.stroke.rule}
            strokeLinejoin="round"
          />
        ))}
      {lines
        .filter((l) => l.thread)
        .map((l) => (
          <path
            key={l.code}
            d={pathOf(l)}
            fill="none"
            stroke={direction.accent}
            strokeWidth={direction.stroke.rule * 2.2}
            strokeLinejoin="round"
          />
        ))}

      {/* ONE NUMBER PER AXIS — ITS OWN CEILING — AND ONE ZERO FOR ALL SEVEN.
          The reference prints a full ladder of values on each of its eight rails, and at four
          hundred polylines that is what a reader needs to place a line. At sixteen it is twenty-five
          numbers doing the work of eight: Rémy's read was *beaucoup de labels dont on ne sait pas à
          quoi ils servent*. The fact the ladder existed to carry is that **each axis has its own
          scale**, and that fact is carried better by seven different ceilings than by four repeated
          gradations. The zero is drawn once, at the left, because it is the one value every rail
          shares. */}
      {axes.map((a, i) => (
        <text
          key={`ceiling-${a.name}`}
          x={railX(i)}
          y={layout.top - 4}
          textAnchor="middle"
          {...line(axisReg)}
          fill={mutedInk}
        >
          {set(`${a.ceiling} %`, axisReg)}
        </text>
      ))}
      <text
        x={railX(0) - 7}
        y={layout.bottom + axisBand.ascent / 2}
        textAnchor="end"
        {...line(axisReg)}
        fill={mutedInk}
      >
        {set("0", axisReg)}
      </text>

      {labels.map(({ l, x, y, anchor, text }) => (
        <g key={`label-${l.code}`}>
          <text
            x={x}
            y={y}
            textAnchor={anchor}
            {...line(axisReg)}
            fill="none"
            stroke={direction.ground}
            strokeWidth={3.4}
            strokeLinejoin="round"
            fontWeight={l.thread ? 700 : axisReg.fontWeight}
          >
            {set(text, axisReg)}
          </text>
          <text
            x={x}
            y={y}
            textAnchor={anchor}
            {...line(axisReg)}
            fill={l.thread ? accentInk : mutedInk}
            fontWeight={l.thread ? 700 : axisReg.fontWeight}
          >
            {set(text, axisReg)}
          </text>
        </g>
      ))}

      <text x={PAD} y={layout.noteTop} {...line(axisReg)} fill={mutedInk}>
        {set(threadNote, axisReg)}
      </text>
      {layout.readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={layout.readingTop + i * annotLead} {...line(annot)} fill={mutedInk}>
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
