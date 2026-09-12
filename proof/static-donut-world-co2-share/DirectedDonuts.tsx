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
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

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
}) {
  const { width, height } = FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<string, string>;
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
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
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const annotLead = annot.fontSize * 1.4;
  const footLead = axisBand.ascent + axisBand.descent + 2;

  /** UNDER EVERY RING, FOUR RESERVED ROWS: the name, then the two dates with their tonnes, then the
   *  world line under the whole row of rings. A row that is drawn has to be a row that is budgeted —
   *  the lollipop beat learned that one line too late. */
  const footRoom = annotBand.ascent + annotBand.descent + 2 * footLead + 14;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.8;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const bandTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.2 + axisBand.ascent;
    const bandBottom =
      (readingLines.length ? readingTop - annotBand.ascent - annot.fontSize * 0.9 : sourceTop - bodyLead * 1.2) -
      footRoom -
      footLead;
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
      bandTop,
      bandBottom,
      band: bandBottom - bandTop,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }

  const slice = (width - PAD * 2) / rings.length;
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
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.band > best) best = l.band;
    const outer = Math.min(l.band / 2, slice * 0.42);
    const hole = outer - 16;
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
  const cy = (layout.bandTop + layout.bandBottom) / 2;
  const ringWidth = 7;
  const gap = 3.5;

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · band ${layout.band.toFixed(0)}px, ring r=${outer.toFixed(0)}px · smallest arc ` +
      `${((smallest / 100) * 2 * Math.PI * outer).toFixed(1)}px · the past is ${pastIs}`,
  );

  /** An arc from twelve o'clock, clockwise, as a fraction of the whole turn. Drawn as a path rather
   *  than a dasharray so a share over half still closes the right way. */
  const arc = (cx: number, r: number, fraction: number) => {
    const theta = Math.min(0.9999, fraction) * Math.PI * 2;
    const x0 = cx;
    const y0 = cy - r;
    const x1 = cx + Math.sin(theta) * r;
    const y1 = cy - Math.cos(theta) * r;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${theta > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const num = (v: number) => v.toFixed(1).replace(".", ",");

  const nameY = layout.bandBottom + 12 + annotBand.ascent;
  const beforeY = nameY + annotBand.descent + 8 + axisBand.ascent;
  const afterY = beforeY + footLead;

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

      <text x={PAD} y={layout.bandTop - axisBand.descent - 4} {...line(axis)} fontWeight={700} fill={mutedInk}>
        {set(unit, axis)}
      </text>

      {rings.map((r, i) => {
        const cx = PAD + slice * (i + 0.5);
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
              d={arc(cx, outer, r.shareBefore / 100)}
              fill="none"
              stroke={past}
              strokeWidth={ringWidth}
              strokeLinecap="butt"
            />
            <path
              d={arc(cx, outer - ringWidth - gap, r.shareAfter / 100)}
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

      <text x={PAD} y={afterY + footLead + 2} {...line(axis)} fill={mutedInk}>
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
