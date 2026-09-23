/**
 * Each of the six largest emitters' share of the world's CO₂ in 2000 and 2023, drawn as paired
 * concentric arcs THROUGH the design base. The first `pie and donut` component in this tree.
 *
 * WHAT A DONUT IS FOR, AND THE TRAP IT SETS.
 * An arc encodes a PART OF A WHOLE, and that is the one thing it does that no bar can: the reader
 * sees the slice against the turn. What it hides is the whole. Between these two dates the world's
 * emissions grew by half, so a slice that shrank can be a number that grew — Russia's does exactly
 * that. The plate therefore prints the tonnes under every ring. **A share chart that does not carry
 * its own absolute values is a chart that can be read backwards and stay silent about it.**
 *
 * ONE FULL TURN IS 100 % OF THE WORLD, ON EVERY RING, AT ONE RADIUS. The reference's own record
 * leaves that open — *"whether the arcs are on a common scale across the three rings — if they are
 * not, the between-country comparison the layout invites would be false"* — and this component
 * closes it. It is `panels-share-one-scale-or-they-are-not-multiples` in a radial geometry: six
 * rings side by side ARE a small multiple, and the reader will compare them whether or not the scale
 * lets them.
 *
 * THE RULE TAKEN FROM THE REFERENCE (Ferdio's #57): **draw the earlier value concentric with the
 * later one, so the change is a GAP rather than a second mark.** Two arcs, one ring, one centre.
 *
 * THE RULE REFUSED, with a measurement rather than a preference: this reference greys the past,
 * while `two-states-of-one-measure-are-one-hue-at-two-chromas` — three desks, one of them the
 * sibling record in the same archive — tints it. Evidence says tint. Geometry gets a veto: these two
 * arcs are concentric and a few pixels apart, so the tint has to clear a separation floor against
 * the accent as well as the non-text floor against the ground. Where it cannot, the plate falls back
 * to this reference's neutral and says which it used on its own ladder.
 *
 * `the-subject-is-ringed-not-recoloured` — the chroma axis is spent on the two dates, so the subject
 * takes a ring around its own number instead.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, contrast, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { applyCase, DERIVED_SIZE_RATIO } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, viewedAtCssPx } from "#shared/chart-beat/sizes.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Ring = {
  code: string;
  name: string;
  shareBefore: number;
  shareAfter: number;
  gtBefore: number;
  gtAfter: number;
};

export function DirectedDonuts({
  rings,
  subject,
  from,
  to,
  unit,
  worldNote,
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
  rings: Ring[];
  subject: string;
  from: number;
  to: number;
  unit: string;
  worldNote: string;
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
  /**
   * SIX RINGS IN ONE ROW IS A LANDSCAPE SENTENCE, AND AT ANOTHER FRAME IT IS NOT A SENTENCE AT ALL.
   *
   * The row is what fixed the ring's radius: `slice` is the plate's width divided by the number of
   * rings, and the radius is capped at 42 % of it. At 960 that is a 151px slice and a comfortable
   * ring. At 540 it is 85px, the hole comes to 17px across, and the share the ring exists to state
   * does not fit inside its own centre — which is exactly what the refusal said on 2026-09-23, in
   * all three directions, at square and at portrait both.
   *
   * Six rings ARE a small multiple (`panels-share-one-scale-or-they-are-not-multiples` is already
   * the reason they share one turn), and a small multiple reflows: three across and two down at a
   * square frame, two across and three down at a tall one. Nothing about the comparison changes —
   * one turn is still 100 % of the world on every ring — and the reader gets a ring big enough to
   * read a share off.
   */
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  const COLUMNS =
    SIZE === "landscape" ? rings.length : SIZE === "square" ? 3 : 2;
  const ROWS = Math.ceil(rings.length / COLUMNS);
  const { ink, muted } = deriveFurniture(direction.ground);
  /**
   * THE MARGIN IS A PROPORTION OF THE PLATE, AND THE DIRECTION FILED ITS OWN ON A 960-WIDE ONE.
   *
   * Carried across unchanged it is a landscape decision spent at another frame: `nocturne`'s 56
   * takes 21 % of a 540-wide plate out of the drawing, against 12 % of the plate it was measured
   * on. Measured 2026-09-23 on this beat, that margin alone was the difference between a square
   * that refused and one that draws — 40px of height, and a column wide enough to bring the
   * headline down from three lines to two.
   *
   * It is scaled, not replaced, so the directions still differ from each other; and it never falls
   * below the toolchain's own inset for the size (`frameInsetFor`, two type floors), which is the
   * number this repository already states a frame's margin may not go under.
   */
  const PAD =
    SIZE === "landscape"
      ? direction.pad
      : Math.max(
          frameInsetFor(SIZE) / 2,
          Math.round((direction.pad * width) / FRAME.width),
        );
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
  const axisBand = bandOf(axis);
  const valueBand = bandOf(value);

  /** THE PAST: THE CORPUS VOTES FOR A TINT, THE GEOMETRY HOLDS A VETO.
   *  A tint of the accent is what three desks file; two concentric arcs a few pixels apart are what
   *  this plate draws. So the tint is measured twice — against the ground it sits on, and against
   *  the accent it sits beside — and the neutral this form's own reference asks for is the fallback,
   *  not the default. */
  const present = direction.accent;
  const SEPARATION = 1.5;
  const tint = mix(direction.accent, direction.ground, 0.62);
  const tintWorks =
    contrast(tint, direction.ground) >= NON_TEXT_CONTRAST_MIN &&
    contrast(tint, present) >= SEPARATION;
  const neutral = adjustToContrast(
    mix(direction.ground, ink, 0.35),
    direction.ground,
    NON_TEXT_CONTRAST_MIN,
  );
  if (!neutral)
    throw new Error(
      `neither a tint of the accent nor a neutral can be told from this direction's ground; the ` +
        `earlier arc would be an absent mark rather than a past state.`,
    );
  const past = tintWorks ? tint : neutral;
  const pastIs = tintWorks ? "a tint of the accent" : "the neutral";
  const track = mix(direction.ground, ink, 0.09);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const footLead = axisBand.ascent + axisBand.descent + 2;

  /** UNDER EVERY RING, FOUR RESERVED ROWS: the name, then the two dates with their tonnes, then the
   *  world line under the whole row of rings. A row that is drawn has to be a row that is budgeted —
   *  the lollipop beat learned that one line too late. */
  const footRoom = annotBand.ascent + annotBand.descent + 2 * footLead + 14;
  /** THE SAME FOUR ROWS, MEASURED FROM THE RING'S EDGE TO THE LAST DESCENDER rather than budgeted.
   *  `footRoom` is 4px short of what the block actually draws, which at one row falls into the
   *  plate's bottom margin and is invisible. At two rows it is the next row's ceiling: the first
   *  render of the square grid drew the second row's track straight through « 2023 · 12,2 Gt ».
   *  So a reflowed grid budgets the block it draws, plus air between one ring's foot and the next
   *  ring's top edge; one row keeps the landscape number exactly. */
  const ROW_AIR = 8;
  /** The two gaps inside that block. Tighter at a reflowed frame for the reason the rings are
   *  reflowed at all: the four lines are the same four lines whatever the plate, so at half the
   *  width they take twice the share of it, and the air between a ring and its own name is the
   *  cheapest thing on the plate to spend. Landscape keeps the numbers it was tuned at. */
  const NAME_GAP = SIZE === "landscape" ? 12 : 8;
  const TONNES_GAP = SIZE === "landscape" ? 8 : 5;
  const footBlock =
    NAME_GAP +
    annotBand.ascent +
    annotBand.descent +
    TONNES_GAP +
    axisBand.ascent +
    footLead +
    axisBand.descent;
  const rowFoot = ROWS > 1 ? footBlock + ROW_AIR : footRoom;

  const layoutFor = (t: number, l: number, r: number, dsp: typeof display) => {
    const titleLines = wrap(set(title[t], dsp), column, dsp);
    const dspLead = leadOf(dsp);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + dsp.fontSize;
    const limitsTop =
      titleTop + titleLines.length * dspLead + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const bandTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.2 + axisBand.ascent;
    /** EVERY ROW OF RINGS OWES ITS OWN FOUR LINES. At one row this is the arithmetic it always was;
     *  at two or three it is the only honest reading, and budgeting one row's worth for three was
     *  how the tonnes would have been drawn through the ring beneath them. */
    const bandBottom =
      (readingLines.length
        ? readingTop - annotBand.ascent - gapOf(annot, 0.6429)
        : sourceTop - bodyLead * 1.2) -
      rowFoot * ROWS -
      footLead;
    const band = bandBottom - bandTop;
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      titleLead: dspLead,
      limitsTop,
      readingTop,
      sourceTop,
      bandTop,
      bandBottom,
      band,
      /** The circle room ONE row gets, which is what sets the radius. */
      rowRing: band / ROWS,
    };
  };

  /**
   * HOW SMALL A HEADLINE MAY GET AND STILL BE ONE — the two floors
   * `static-choropleth-europe-lowcarbon` states, spent here for the same reason it spends them.
   *
   * The filed display size is a decision taken on a 960-wide plate. Set the same headline in 540 and
   * it takes twice the lines, and on this beat the lines come straight out of the rings' band: at
   * square the shortest copy in the file still left them 159px, which is a strip. One step of voice
   * (`DERIVED_SIZE_RATIO`) is as far as a display may move before it has become the register below,
   * and WCAG's large-text relaxation is the other floor; the higher of the two binds.
   *
   * LANDSCAPE NEVER WALKS THIS LADDER. It is the frame this beat was accepted at, and its headline
   * is drawn at the size the direction filed.
   */
  const LARGE_TEXT_CSS_PX = 24;
  const LARGE_TEXT_BOLD_CSS_PX = 18.66;
  const displayAt = (fontSize: number) => ({
    ...display,
    fontSize,
    letterSpacing: (display.letterSpacing * fontSize) / display.fontSize,
  });
  const displayRungs: Array<typeof display> =
    SIZE === "landscape"
      ? [display]
      : (() => {
          const unitsPerCssPx = width / viewedAtCssPx(SIZE);
          const floorCssPx =
            Number(display.fontWeight) >= 700
              ? LARGE_TEXT_BOLD_CSS_PX
              : LARGE_TEXT_CSS_PX;
          /** THE HIGHER FLOOR BINDS — but only where it is reachable. At square one user unit is
           *  1.5 CSS px, so large text starts at 36 units while two of the three filed displays are
           *  30 and 32: a headline that is already not large text cannot be held to large text, and
           *  holding it there only froze the ladder at a size that did not fit. Where the filed size
           *  clears the relaxation the ladder stops at it; where it never did, one step of voice is
           *  the floor that is left. */
          const largeText = floorCssPx * unitsPerCssPx;
          const floor =
            display.fontSize >= largeText
              ? Math.max(largeText, display.fontSize * DERIVED_SIZE_RATIO)
              : display.fontSize * DERIVED_SIZE_RATIO;
          /** THE FILED SIZE IS ALWAYS THE FIRST RUNG, even when it is already under the floor.
           *  Measured: at square one unit is 1.5 CSS px, so large text starts at 36 units and two of
           *  the three filed displays sit below it as drawn. A ladder that starts at the floor would
           *  then have had NO rungs at all and the beat refused with `-Infinity` of band — a floor
           *  that decides a direction's filed size is a different conversation from one that decides
           *  how far this layout may shrink it. */
          const out: Array<typeof display> = [display];
          for (let s = display.fontSize - 0.5; s >= floor - 1e-9; s -= 0.5)
            out.push(displayAt(Math.round(s * 100) / 100));
          return out;
        })();

  /** THE CUT ORDER IS THE DESK'S: the reading line first, then the standfirst, then the headline's
   *  SIZE, and a shorter headline last of all. */
  const rungs: Array<{
    title: number;
    limit: number;
    reading: number;
    display: typeof display;
  }> = [];
  for (let t = 0; t < title.length; t++)
    for (const dsp of displayRungs)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ title: t, limit: l, reading: r, display: dsp });
        rungs.push({ title: t, limit: l, reading: -1, display: dsp });
      }

  const slice = (width - PAD * 2) / COLUMNS;
  /** THE TWO TRACKS AND THE AIR BETWEEN THEM. Thinner at a reflowed frame, because the radius there
   *  is set by a row of the band rather than by a sixth of the plate's width, and 17.5px of stroke
   *  eats a 30px radius whole. The 16 landscape tests the hole against is the number that frame was
   *  tuned at and is left exactly where it was. */
  const ringWidth = SIZE === "landscape" ? 7 : 5;
  const gap = SIZE === "landscape" ? 3.5 : 2.5;
  /** THE HOLE IS WHAT THE INNER TRACK'S INNER EDGE LEAVES — `outer` less the outer track's half
   *  stroke, the air, and the inner track's whole stroke measured from its centre line. Landscape
   *  keeps the 16 it was tuned at rather than the 10 the arithmetic gives, because that number
   *  chose the rung this beat is accepted on. */
  const RING_INSET =
    SIZE === "landscape" ? 16 : ringWidth * 1.5 + gap;
  /** THE RING'S OWN FLOOR. An arc is read as a fraction of a turn, and a turn too small stops being
   *  a turn: the shortest arc on the plate has to be at least three pixels of drawn length, and the
   *  number in the ring's centre has to fit inside the hole. Both are measured, not assumed. */
  const smallest = Math.min(...rings.flatMap((r) => [r.shareBefore, r.shareAfter]));
  const widestCentre = Math.max(
    ...rings.map((r) => widthOf(set(`${r.shareAfter.toFixed(1).replace(".", ",")} %`, value), value)),
  );

  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    outer: number;
  } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading, rung.display);
    if (l.band > best) best = l.band;
    const outer = Math.min(l.rowRing / 2, slice * 0.42);
    const hole = outer - RING_INSET;
    if (
      l.band > 0 &&
      ((smallest / 100) * 2 * Math.PI * outer >= 3) &&
      hole * 2 >= widestCentre + 6 &&
      hole >= valueBand.ascent + valueBand.descent
    ) {
      fits = { rung, layout: l, outer };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves the rings ${best.toFixed(0)}px of band, and at that size either the smallest ` +
        `arc (${smallest.toFixed(1)} %) is under three pixels long or the hole cannot hold its own ` +
        `number. An arc a reader cannot see is not a share, it is a gap in the ring.`,
    );
  const { layout, outer } = fits;
  const drawnDisplay = fits.rung.display;
  const titleLead = layout.titleLead;
  /** WHERE ONE RING SITS IN THE GRID. At one row this is the plate's own middle and the four lines
   *  under the band, which is what it always was; at two or three rows every row carries its own
   *  copy of that block, so a ring's tonnes are never the next ring's ceiling. */
  const rowRing = layout.rowRing;
  const cellOf = (i: number) => {
    const row = Math.floor(i / COLUMNS);
    const col = i % COLUMNS;
    const top = layout.bandTop + row * (rowRing + rowFoot);
    const nameY = top + rowRing + NAME_GAP + annotBand.ascent;
    const beforeY = nameY + annotBand.descent + TONNES_GAP + axisBand.ascent;
    return {
      cx: PAD + slice * (col + 0.5),
      cy: top + rowRing / 2,
      nameY,
      beforeY,
      afterY: beforeY + footLead,
    };
  };
  const lastRowAfterY = cellOf(rings.length - 1).afterY;

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${COLUMNS}x${ROWS} · headline ${drawnDisplay.fontSize.toFixed(1)}px` +
      ` · band ${layout.band.toFixed(0)}px, ring r=${outer.toFixed(0)}px · smallest arc ` +
      `${((smallest / 100) * 2 * Math.PI * outer).toFixed(1)}px · the past is ${pastIs}`,
  );

  /** An arc from twelve o'clock, clockwise, as a fraction of the whole turn. Drawn as a path rather
   *  than a dasharray so a share over half still closes the right way. */
  const arc = (cx: number, cy: number, r: number, fraction: number) => {
    const theta = Math.min(0.9999, fraction) * Math.PI * 2;
    const x0 = cx;
    const y0 = cy - r;
    const x1 = cx + Math.sin(theta) * r;
    const y1 = cy - Math.cos(theta) * r;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${theta > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const num = (v: number) => v.toFixed(1).replace(".", ",");

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
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(drawnDisplay)}>
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      <text x={PAD} y={layout.bandTop - axisBand.descent - 4} {...line(axis)} fontWeight={700} fill={mutedInk}>
        {set(unit, axis)}
      </text>

      {rings.map((r, i) => {
        const { cx, cy, nameY, beforeY, afterY } = cellOf(i);
        const isSubject = r.code === subject;
        const centre = `${num(r.shareAfter)} %`;
        return (
          <g key={r.code}>
            {/* THE WHOLE TURN, drawn faintly: the arc is a fraction OF something, and the something
                has to be visible or the fraction is just a stroke. */}
            <circle cx={cx} cy={cy} r={outer} fill="none" stroke={track} strokeWidth={ringWidth} />
            <circle
              cx={cx}
              cy={cy}
              r={outer - ringWidth - gap}
              fill="none"
              stroke={track}
              strokeWidth={ringWidth}
            />
            <path
              d={arc(cx, cy, outer, r.shareBefore / 100)}
              fill="none"
              stroke={past}
              strokeWidth={ringWidth}
              strokeLinecap="butt"
            />
            <path
              d={arc(cx, cy, outer - ringWidth - gap, r.shareAfter / 100)}
              fill="none"
              stroke={present}
              strokeWidth={ringWidth}
              strokeLinecap="butt"
            />

            {/* THE SUBJECT IS RINGED, NOT RECOLOURED — the chroma axis is already spent on the two
                dates, so emphasis takes a shape instead of a colour. */}
            {on("the-subject-is-ringed-not-recoloured") && isSubject && (
              <circle
                cx={cx}
                cy={cy}
                /** It hugs the NUMBER, not the tracks: at a radius near the arcs it read as a
                 *  third ring, which is a channel this plate does not use. */
                r={widestCentre / 2 + 9}
                fill="none"
                stroke={accentInk}
                strokeWidth={direction.stroke.hairline}
              />
            )}

            <text
              x={cx}
              y={cy + (valueBand.ascent - valueBand.descent) / 2}
              textAnchor="middle"
              {...line(value)}
              fill={isSubject ? accentInk : ink}
              fontWeight={isSubject ? 700 : value.fontWeight}
            >
              {set(centre, value)}
            </text>

            <text
              x={cx}
              y={nameY}
              textAnchor="middle"
              {...line(annot)}
              fill={isSubject ? accentInk : mutedInk}
              fontWeight={isSubject ? 700 : annot.fontWeight}
            >
              {set(r.name, annot)}
            </text>

            {/* THE TONNES, BOTH YEARS, UNDER EVERY RING. A share chart that does not carry its own
                absolute values can be read backwards: the world grew by half between these dates. */}
            <text x={cx} y={beforeY} textAnchor="middle" {...line(axis)} fill={mutedInk}>
              {set(`${from} · ${num(r.gtBefore)} Gt`, axis)}
            </text>
            <text x={cx} y={afterY} textAnchor="middle" {...line(axis)} fill={mutedInk}>
              {set(`${to} · ${num(r.gtAfter)} Gt`, axis)}
            </text>
          </g>
        );
      })}

      <text x={PAD} y={lastRowAfterY + footLead + 2} {...line(axis)} fill={mutedInk}>
        {set(worldNote, axis)}
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
