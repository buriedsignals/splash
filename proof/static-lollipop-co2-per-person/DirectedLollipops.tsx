/**
 * The six largest emitters of CO₂, per person, in 2000 and 2023, drawn as paired lollipops THROUGH
 * the design base. The first `lollipop` component in this tree.
 *
 * WHAT A LOLLIPOP PAIR SAYS THAT A DUMBBELL DOES NOT. A dumbbell draws the GAP between two states
 * and says nothing about how far either end is from nothing; a lollipop pair draws each state as its
 * own stem from ZERO, so the LEVELS are the first reading and the gap the second. On this data that
 * is the claim: the two averages are now within a factor of two, which is a sentence about levels.
 *
 * THE THREE RULES TAKEN FROM THE REFERENCE (Ferdio's #3), which are its whole contribution:
 *
 *   **The earlier state is a lighter tint of the later state's own hue** — "not grey, not a second
 *   hue: the same hue, lighter", so a pair reads as one subject in two states rather than as two
 *   subjects. `two-states-of-one-measure-are-one-hue-at-two-chromas`, and this record is the third
 *   desk to say it.
 *
 *   **The direction of change is given a glyph before it is given a number.** A reader who only
 *   skims still gets the sign. The triangle is DRAWN as a path rather than set as `▲`: no face on
 *   this base's family ladders is guaranteed to carry U+25B2, and a glyph the ladder cannot cover
 *   refuses every family and takes the whole plate down with it.
 *
 *   **The change is a third row that belongs to the pair, not to either mark** — on the pair's own
 *   centreline, between the lollipops and the name, so it cannot be read as belonging to one date.
 *
 * `the-subject-is-ringed-not-recoloured` — the chroma axis is spent on the two dates, so the subject
 * cannot also take it. Its later head is ringed. `PALETTE.md` records why the reference's per-country
 * hues are not taken.
 *
 * `every-bar-labelled-lets-the-axis-go` — both values are printed above their own heads, as the
 * reference does, so the plate carries a zero line and its unit rather than a full value axis.
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

export type Pair = {
  code: string;
  name: string;
  before: number;
  after: number;
  change: number;
};

export function DirectedLollipops({
  pairs,
  subject,
  from,
  to,
  unit,
  rule,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
}: {
  pairs: Pair[];
  subject: string;
  from: number;
  to: number;
  unit: string;
  rule: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
}) {
  const { width, height } = FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
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
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any, weight?: number) =>
    measureText(text, { ...sizeOf(r), ...(weight ? { fontWeight: weight } : {}) }) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
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

  /** ONE HUE, TWO CHROMAS. The past is a tint of the present's own colour, taken as far toward the
   *  ground as it can go while still clearing the non-text floor against it — a past nobody can see
   *  is not a state, it is an absent mark. */
  const present = direction.accent;
  let past = mix(direction.accent, direction.ground, 0.6);
  if (contrast(past, direction.ground) < NON_TEXT_CONTRAST_MIN) {
    const lifted = adjustToContrast(past, direction.ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `the tint that stands for ${from} cannot be told from the ground: nothing between the ` +
          `direction's accent and its poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ${direction.ground}.`,
      );
    past = lifted;
  }
  const baseline = mix(direction.ground, ink, 0.75);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  /** THE FURNITURE UNDER THE BASELINE IS THREE ROWS, in the reference's own order: the two dates
   *  under their own stems, then the change on the pair's centreline, then the name. */
  const dateRow = axisBand.ascent + axisBand.descent;
  const changeRow = valueBand.ascent + valueBand.descent;
  const nameRow = annotBand.ascent + annotBand.descent;
  /** AND A FOURTH ROW FOR THE SELECTION RULE. It was drawn from the reading line's own baseline and
   *  landed on the names: a plate that says which six it chose has to reserve the line that says it,
   *  the same way the three rows under each pair are reserved. */
  const ruleRow = axisBand.ascent + axisBand.descent;
  const footRoom = dateRow + changeRow + nameRow + ruleRow + 24;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const plotTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 2.2 + valueBand.ascent;
    const zeroY =
      (readingLines.length
        ? readingTop - annotBand.ascent - gapOf(annot, 0.6429)
        : sourceTop - bodyLead * 1.2) -
      footRoom;
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
      zeroY,
      stems: zeroY - plotTop,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  /** THE STEM'S OWN FLOOR. A lollipop is read as a height from zero, and a height a reader cannot
   *  compare is a dot on a line. The floor is six value-bands: room for the tallest stem, the number
   *  above its head, and enough between the six pairs to rank them by eye. */
  const stemOwes = (valueBand.ascent + valueBand.descent) * 6;
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.stems > best) best = l.stems;
    if (l.stems >= stemOwes) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves the stems ${best.toFixed(0)}px of height and a height a reader compares owes ` +
        `${stemOwes.toFixed(0)}px. A lollipop too short to compare is a dot on a line.`,
    );
  const layout = fits.layout;

  const top = Math.max(...pairs.flatMap((p) => [p.before, p.after]));
  const y = scaleLinear().domain([0, top * 1.06]).range([layout.zeroY, layout.plotTop]);

  /** THE COLUMNS. Each pair owns an equal slice of the plate, its two stems straddling the slice's
   *  own centreline — which is also where the change and the name are centred, so the three rows
   *  belong to the pair and not to either date. */
  const slice = (width - PAD * 2) / pairs.length;
  const seats = pairs.map((p, i) => {
    const centre = PAD + slice * (i + 0.5);
    const half = Math.min(slice * 0.19, 26);
    return { p, centre, xBefore: centre - half, xAfter: centre + half };
  });
  const head = Math.max(3.4, Math.min(slice * 0.055, 7));

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · stems ${layout.stems.toFixed(0)}px, floor ${stemOwes.toFixed(0)}px · ${pairs.length} pairs, ` +
      `slice ${slice.toFixed(0)}px`,
  );

  const number = (v: number) => set(v.toFixed(1).replace(".", ","), value);
  const signed = (v: number) =>
    set(`${v > 0 ? "+" : "−"}${Math.abs(Math.round(v))} %`, value);

  /** THE DIRECTION GLYPH IS DRAWN, NOT SET. `▲` is U+25B2 and no face on this base's family ladders
   *  is guaranteed to carry it; a glyph the ladder cannot cover refuses every family and takes the
   *  whole plate down. A path costs nothing and always renders. */
  const triangle = (cx: number, cy: number, up: boolean, size: number) =>
    up
      ? `M ${cx} ${cy - size} L ${cx + size} ${cy + size * 0.8} L ${cx - size} ${cy + size * 0.8} Z`
      : `M ${cx} ${cy + size} L ${cx + size} ${cy - size * 0.8} L ${cx - size} ${cy - size * 0.8} Z`;

  const dateY = layout.zeroY + 6 + axisBand.ascent;
  const changeY = dateY + axisBand.descent + 8 + valueBand.ascent;
  const nameY = changeY + valueBand.descent + 6 + annotBand.ascent;

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

      {/* The 6px gap is to the TOP of the tallest value below, so the unit's own descenders have to
          come off it as well — the ₂ in "CO₂" is the deepest thing this line draws. Without that
          subtraction the unit ran into « 21,4 » by 3.2px in nocturne, whose axis face is the widest
          of the three; the collision is vertical, and the wide face is only what put a value under
          this line rather than beside it. */}
      <text x={PAD} y={layout.plotTop - valueBand.ascent - 6 - axisBand.descent} {...line(axis)} fontWeight={700} fill={mutedInk}>
        {set(unit, axis)}
      </text>

      {/* THE ZERO LINE, which is what the stems are measured from and the only axis the plate needs:
          every head carries its own number. */}
      <line
        x1={PAD}
        x2={width - PAD}
        y1={layout.zeroY}
        y2={layout.zeroY}
        stroke={baseline}
        strokeWidth={direction.stroke.rule}
      />

      {seats.map(({ p, centre, xBefore, xAfter }) => {
        const isSubject = p.code === subject;
        const up = p.change > 0;
        return (
          <g key={p.code}>
            {/* THE PAST: a tint of the present's own hue, never a second hue and never grey. */}
            <line
              x1={xBefore}
              x2={xBefore}
              y1={layout.zeroY}
              y2={y(p.before)}
              stroke={past}
              strokeWidth={direction.stroke.rule * 1.6}
            />
            <circle cx={xBefore} cy={y(p.before)} r={head} fill={past} />
            <text
              x={xBefore}
              y={y(p.before) - head - 5}
              textAnchor="middle"
              {...line(value)}
              fill={mutedInk}
            >
              {number(p.before)}
            </text>

            {/* THE PRESENT, at full strength. */}
            <line
              x1={xAfter}
              x2={xAfter}
              y1={layout.zeroY}
              y2={y(p.after)}
              stroke={present}
              strokeWidth={direction.stroke.rule * 1.6}
            />
            <circle cx={xAfter} cy={y(p.after)} r={head} fill={present} />
            {on("the-subject-is-ringed-not-recoloured") && isSubject && (
              <circle
                cx={xAfter}
                cy={y(p.after)}
                r={head + 3.2}
                fill="none"
                stroke={accentInk}
                strokeWidth={direction.stroke.rule}
              />
            )}
            <text
              x={xAfter}
              y={y(p.after) - head - 5 - (isSubject ? 3 : 0)}
              textAnchor="middle"
              {...line(value)}
              fill={accentInk}
              fontWeight={isSubject ? 700 : value.fontWeight}
            >
              {number(p.after)}
            </text>

            {/* THE DATES ARE THE AXIS, AND ARE TREATED AS AXIS — under their own stems, small, in
                the furniture's own ink. */}
            <text x={xBefore} y={dateY} textAnchor="middle" {...line(axis)} fill={mutedInk}>
              {set(String(from), axis)}
            </text>
            <text x={xAfter} y={dateY} textAnchor="middle" {...line(axis)} fill={mutedInk}>
              {set(String(to), axis)}
            </text>

            {/* THE CHANGE BELONGS TO THE PAIR: its own row, on the pair's centreline, sign first. */}
            <path
              d={triangle(
                centre - widthOf(signed(p.change), value, isSubject ? 700 : undefined) / 2 - 8,
                changeY - valueBand.ascent * 0.38,
                up,
                valueBand.ascent * 0.34,
              )}
              fill={isSubject ? accentInk : mutedInk}
            />
            <text
              x={centre}
              y={changeY}
              textAnchor="middle"
              {...line(value)}
              fill={isSubject ? accentInk : mutedInk}
              fontWeight={isSubject ? 700 : value.fontWeight}
            >
              {signed(p.change)}
            </text>
            <text
              x={centre}
              y={nameY}
              textAnchor="middle"
              {...line(annot)}
              fill={isSubject ? accentInk : mutedInk}
              fontWeight={isSubject ? 700 : annot.fontWeight}
            >
              {set(p.name, annot)}
            </text>
          </g>
        );
      })}

      <text
        x={PAD}
        y={nameY + annotBand.descent + 9 + axisBand.ascent}
        {...line(axis)}
        fill={mutedInk}
      >
        {set(rule, axis)}
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
