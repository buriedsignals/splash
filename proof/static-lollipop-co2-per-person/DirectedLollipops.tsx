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

import { scaleLinear, scaleBand } from "d3-scale";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
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

/** This beat's own type, as its BRIEF declares it — what decides whether a tall frame asks for the
 *  twin form. `type-at-size.mjs` answers `transpose` at portrait and, for this type, `as-is` at
 *  square: the square render was drawn, opened and accepted, and a form that already holds needs no
 *  twin to reach for. */
const TYPE = "lollipop";

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
  frame,
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
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
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

  /**
   * THE TWIN FORM. A band scale has one, and at a tall frame it is not a refinement: six pairs are
   * TWELVE stems, and a 540px-wide frame leaves each pair about 70px — under 36px a stem — to carry
   * two heads, two numbers, a date under each and a name as long as « ÉTATS-UNIS ». Rows running
   * down the frame, each name horizontal on one line, is the drawing a tall frame asks for, and
   * `type-at-size.mjs` has been saying so all along; nothing was carrying it out.
   *
   * The size is read off the frame rather than passed in, because the frame is what the component is
   * already given and the three are distinguishable by their own proportions. SQUARE is NOT rows for
   * this type: its own square render was drawn, opened and accepted, so `formForSize` answers `as-is`
   * there and this flag stays false — the verdict is asked for, not assumed from the proportions.
   */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const ROWS = formForSize(TYPE, SIZE).verdict === "transpose";

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
  /** IN ROWS three of those four rows are not under the plate at all: the dates, the change and the
   *  name have each moved into a lane beside the mark they belong to, which is what the twin form
   *  IS. Only the selection rule is still furniture under the plot. */
  const footRoom = ROWS ? ruleRow + 20 : dateRow + changeRow + nameRow + ruleRow + 24;

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
   *  above its head, and enough between the six pairs to rank them by eye.
   *
   *  IN ROWS the same quantity is the plot's HEIGHT, and it is owed to the PAIRS rather than to the
   *  stems: each pair needs two rows of its own, each deep enough for the number set beside its head,
   *  and the band's inner padding takes a third of what is left. Two and a bit value-bands a pair is
   *  what 540 x 960 measured out at, with the full headline and the full standfirst still standing;
   *  below that the two heads of a pair touch and the pair stops reading as two states. */
  const stemOwes = ROWS
    ? pairs.length * (valueBand.ascent + valueBand.descent) * 2.4
    : (valueBand.ascent + valueBand.descent) * 6;
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
      ROWS
        ? `the copy leaves the ${pairs.length} rows ${best.toFixed(0)}px of plot and they owe ` +
          `${stemOwes.toFixed(0)}px. Each pair is two rows, and a pair whose two heads touch is one ` +
          `mark rather than two states.`
        : `the copy leaves the stems ${best.toFixed(0)}px of height and a height a reader compares owes ` +
          `${stemOwes.toFixed(0)}px. A lollipop too short to compare is a dot on a line.`,
    );
  const layout = fits.layout;

  const top = Math.max(...pairs.flatMap((p) => [p.before, p.after]));
  const y = scaleLinear().domain([0, top * 1.06]).range([layout.zeroY, layout.plotTop]);

  /** THE THREE ROWS UNDER THE LANDSCAPE BASELINE, in the reference's own order. In rows they are not
   *  under anything: each has moved into a lane beside its own mark. */
  const dateY = layout.zeroY + 6 + axisBand.ascent;
  const changeY = dateY + axisBand.descent + 8 + valueBand.ascent;
  const nameY = changeY + valueBand.descent + 6 + annotBand.ascent;

  const number = (v: number) => set(v.toFixed(1).replace(".", ","), value);
  const signed = (v: number) =>
    set(`${v > 0 ? "+" : "−"}${Math.abs(Math.round(v))} %`, value);

  /** THE COLUMNS. Each pair owns an equal slice of the plate, its two stems straddling the slice's
   *  own centreline — which is also where the change and the name are centred, so the three rows
   *  belong to the pair and not to either date.
   *
   *  IN ROWS the two scales swap axes: the band runs DOWN the plate, one row per PAIR, and the
   *  magnitude runs across it from a rule on the left. The pair keeps everything it had — two stems
   *  from zero, two heads, two numbers, a date on each stem's foot, one change and one name — and
   *  only the direction each of them is read in changes. */
  const rowBand = ROWS
    ? scaleBand<string>()
        .domain(pairs.map((p) => p.code))
        .range([layout.plotTop, layout.zeroY])
        .paddingInner(0.34)
        .paddingOuter(0.05)
    : null;
  const slice = (width - PAD * 2) / pairs.length;
  /** The head is sized from whichever way the pairs are stacked: a dot cut for a sixth of the WIDTH
   *  would swallow the row it sits in when the pairs run down instead of across. */
  const head = ROWS
    ? Math.max(3.4, Math.min(rowBand!.bandwidth() * 0.15, 7))
    : Math.max(3.4, Math.min(slice * 0.055, 7));

  /** THE FOUR LANES A ROW NEEDS, each measured from the runs that will be set in it rather than
   *  guessed. Left of the zero rule: the country name, then the two dates hard against the rule —
   *  each one beside the FOOT of its own stem, which is exactly where the landscape plate puts it,
   *  turned a quarter. Right of the longest stem: that stem's own number, then the pair's change in
   *  a lane of its own, taken out of the magnitude scale so no stem can reach into it. */
  const dateGutter = ROWS
    ? Math.max(widthOf(set(String(from), axis), axis), widthOf(set(String(to), axis), axis))
    : 0;
  const nameGutter = ROWS
    ? Math.max(...pairs.map((p) => widthOf(set(p.name, annot), annot, 700))) +
      gapOf(annot, 0.9) +
      dateGutter +
      gapOf(axis, 0.5)
    : 0;
  /** The number is set past the head and, on the ringed subject, past the ring as well — so the lane
   *  owes the widest number plus the head plus the 3px the ring pushes it out by. */
  const valueGutter = ROWS
    ? Math.max(
        ...pairs.flatMap((p) => [
          widthOf(number(p.before), value),
          widthOf(number(p.after), value, 700) + 3,
        ]),
      ) +
      head +
      6
    : 0;
  const changeLane = ROWS
    ? Math.max(...pairs.map((p) => widthOf(signed(p.change), value, 700))) +
      8 +
      valueBand.ascent * 0.34 * 2 +
      gapOf(value, 0.6)
    : 0;
  const zeroX = PAD + nameGutter;
  const rowValue = ROWS
    ? scaleLinear()
        .domain([0, top * 1.06])
        .range([zeroX, width - PAD - valueGutter - changeLane])
    : null;

  /** A run CENTRED on a row sits on its own register's measured band, not on the row's middle — the
   *  same rule the baselines above follow, read sideways. */
  const midline = (b: { ascent: number; descent: number }) => (b.ascent - b.descent) / 2;

  /** ONE GEOMETRY, TWO READINGS. Every stem, head, number, date, change and name is a field on this
   *  seat, so the drawing below reads one shape whichever way the frame runs — and the landscape
   *  arithmetic is the same arithmetic it always was, moved and not rewritten. */
  const seats = pairs.map((p, i) => {
    const isSubject = p.code === subject;
    if (ROWS) {
      const bandTop = rowBand!(p.code)!;
      const bw = rowBand!.bandwidth();
      const centre = bandTop + bw / 2;
      const dateRight = zeroX - gapOf(axis, 0.5);
      const state = (v: number, rowY: number, ringed: boolean) => ({
        x1: zeroX,
        y1: rowY,
        x2: rowValue!(v),
        y2: rowY,
        cx: rowValue!(v),
        cy: rowY,
        label: {
          x: rowValue!(v) + head + 5 + (ringed ? 3 : 0),
          y: rowY + midline(valueBand),
          anchor: "start" as const,
        },
        date: { x: dateRight, y: rowY + midline(axisBand), anchor: "end" as const },
      });
      return {
        p,
        isSubject,
        // The earlier state is the upper row: down the frame is forward in time, as across it was.
        before: state(p.before, bandTop + bw * 0.27, false),
        after: state(p.after, bandTop + bw * 0.73, isSubject),
        change: { x: width - PAD, y: centre + midline(valueBand), anchor: "end" as const },
        name: {
          x: dateRight - dateGutter - gapOf(annot, 0.9),
          y: centre + midline(annotBand),
          anchor: "end" as const,
        },
      };
    }
    const centre = PAD + slice * (i + 0.5);
    const half = Math.min(slice * 0.19, 26);
    const xBefore = centre - half;
    const xAfter = centre + half;
    return {
      p,
      isSubject,
      before: {
        x1: xBefore,
        y1: layout.zeroY,
        x2: xBefore,
        y2: y(p.before),
        cx: xBefore,
        cy: y(p.before),
        label: { x: xBefore, y: y(p.before) - head - 5, anchor: "middle" as const },
        date: { x: xBefore, y: dateY, anchor: "middle" as const },
      },
      after: {
        x1: xAfter,
        y1: layout.zeroY,
        x2: xAfter,
        y2: y(p.after),
        cx: xAfter,
        cy: y(p.after),
        label: {
          x: xAfter,
          y: y(p.after) - head - 5 - (isSubject ? 3 : 0),
          anchor: "middle" as const,
        },
        date: { x: xAfter, y: dateY, anchor: "middle" as const },
      },
      change: { x: centre, y: changeY, anchor: "middle" as const },
      name: { x: centre, y: nameY, anchor: "middle" as const },
    };
  });

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${ROWS ? "rows" : "stems"} ${layout.stems.toFixed(0)}px, floor ${stemOwes.toFixed(0)}px · ` +
      `${pairs.length} pairs, ` +
      (ROWS ? `band ${rowBand!.bandwidth().toFixed(0)}px` : `slice ${slice.toFixed(0)}px`),
  );

  /** THE DIRECTION GLYPH IS DRAWN, NOT SET. `▲` is U+25B2 and no face on this base's family ladders
   *  is guaranteed to carry it; a glyph the ladder cannot cover refuses every family and takes the
   *  whole plate down. A path costs nothing and always renders. */
  const triangle = (cx: number, cy: number, up: boolean, size: number) =>
    up
      ? `M ${cx} ${cy - size} L ${cx + size} ${cy + size * 0.8} L ${cx - size} ${cy + size * 0.8} Z`
      : `M ${cx} ${cy + size} L ${cx + size} ${cy - size * 0.8} L ${cx - size} ${cy - size * 0.8} Z`;

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
          every head carries its own number. In rows it stands UP at the foot of every stem instead of
          lying under them, and the names and dates are set against its left side. */}
      {ROWS ? (
        <line
          x1={zeroX}
          x2={zeroX}
          y1={layout.plotTop}
          y2={layout.zeroY}
          stroke={baseline}
          strokeWidth={direction.stroke.rule}
        />
      ) : (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={layout.zeroY}
          y2={layout.zeroY}
          stroke={baseline}
          strokeWidth={direction.stroke.rule}
        />
      )}

      {seats.map(({ p, isSubject, before, after, change, name }) => {
        const up = p.change > 0;
        const changeWidth = widthOf(signed(p.change), value, isSubject ? 700 : undefined);
        return (
          <g key={p.code}>
            {/* THE PAST: a tint of the present's own hue, never a second hue and never grey. */}
            <line
              x1={before.x1}
              x2={before.x2}
              y1={before.y1}
              y2={before.y2}
              stroke={past}
              strokeWidth={direction.stroke.rule * 1.6}
            />
            <circle cx={before.cx} cy={before.cy} r={head} fill={past} />
            <text
              x={before.label.x}
              y={before.label.y}
              textAnchor={before.label.anchor}
              {...line(value)}
              fill={mutedInk}
            >
              {number(p.before)}
            </text>

            {/* THE PRESENT, at full strength. */}
            <line
              x1={after.x1}
              x2={after.x2}
              y1={after.y1}
              y2={after.y2}
              stroke={present}
              strokeWidth={direction.stroke.rule * 1.6}
            />
            <circle cx={after.cx} cy={after.cy} r={head} fill={present} />
            {on("the-subject-is-ringed-not-recoloured") && isSubject && (
              <circle
                cx={after.cx}
                cy={after.cy}
                r={head + 3.2}
                fill="none"
                stroke={accentInk}
                strokeWidth={direction.stroke.rule}
              />
            )}
            <text
              x={after.label.x}
              y={after.label.y}
              textAnchor={after.label.anchor}
              {...line(value)}
              fill={accentInk}
              fontWeight={isSubject ? 700 : value.fontWeight}
            >
              {number(p.after)}
            </text>

            {/* THE DATES ARE THE AXIS, AND ARE TREATED AS AXIS — under their own stems, small, in
                the furniture's own ink. In rows "under" becomes "against": each date is set on the
                far side of the zero rule from its own stem, level with it. */}
            <text
              x={before.date.x}
              y={before.date.y}
              textAnchor={before.date.anchor}
              {...line(axis)}
              fill={mutedInk}
            >
              {set(String(from), axis)}
            </text>
            <text
              x={after.date.x}
              y={after.date.y}
              textAnchor={after.date.anchor}
              {...line(axis)}
              fill={mutedInk}
            >
              {set(String(to), axis)}
            </text>

            {/* THE CHANGE BELONGS TO THE PAIR: its own row, on the pair's centreline, sign first. In
                rows that centreline is the line BETWEEN the pair's two heads, and the change is set
                on it, right against the frame, in the lane the magnitude scale gave up for it. */}
            <path
              d={triangle(
                change.x - (ROWS ? changeWidth : changeWidth / 2) - 8,
                change.y - valueBand.ascent * 0.38,
                up,
                valueBand.ascent * 0.34,
              )}
              fill={isSubject ? accentInk : mutedInk}
            />
            <text
              x={change.x}
              y={change.y}
              textAnchor={change.anchor}
              {...line(value)}
              fill={isSubject ? accentInk : mutedInk}
              fontWeight={isSubject ? 700 : value.fontWeight}
            >
              {signed(p.change)}
            </text>
            <text
              x={name.x}
              y={name.y}
              textAnchor={name.anchor}
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
        y={
          ROWS
            ? layout.zeroY + 12 + axisBand.ascent
            : nameY + annotBand.descent + 9 + axisBand.ascent
        }
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
