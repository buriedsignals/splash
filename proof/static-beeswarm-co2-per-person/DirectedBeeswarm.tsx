/**
 * The world's CO₂ per person in 2023, one circle per country, sized by population, drawn THROUGH the
 * design base. The first `beeswarm` component in this tree.
 *
 * WHAT A BEESWARM BUYS OVER THE HISTOGRAM ON THE SAME FILE.
 * `proof/static-carbon-footprint-spread` bins this file, and a bin has no identity: it can say "127
 * countries under 4 tonnes" and can never say which, nor how many people live in them. A beeswarm
 * keeps every unit, so the SHAPE and the NAMED CASE are on one plate. That is the whole trade, and
 * the price is that a swarm is only as honest as its packing: a circle pushed off its own value is a
 * lie about position, so this component pushes marks ONLY perpendicular to the axis, never along it.
 *
 * `the-subject-is-ringed-not-recoloured` (IiB, Reuters) — the two called-out countries keep the
 * field's colour and gain a stroke. `PALETTE.md` records why the field has one colour at all: the
 * reference spends hue on a school sector, and this plate has no category to carry.
 *
 * `the-distribution-is-furniture-and-the-case-is-ink` (Nature, NSIDC) — the swarm is the
 * distribution and it is drawn quietly; the accent is spent on the two cases and on the world
 * average, which is what the headline argues about.
 *
 * TWO RULES TAKEN FROM THE REFERENCE THIS FORM IS FILED AGAINST (ABC's 8 500 schools):
 *
 *   **The axis name and its ticks are one size, separated by weight, both tracked** — measured on
 *   that plate's own elements: `ABCSans 12 / 700 / tracking 2.5` for `INCOME`, `ABCSansRegular 12 /
 *   400 / tracking 2.3` for `$50m`. Here the axis register supplies the size and the tracking, and
 *   the name takes the weight.
 *
 *   **State the encodings in the running prose and spend no plate on a key for them.** There is no
 *   size legend on this plate. The standfirst says what a circle is and what its area means, in the
 *   sentence a reader is already reading — which is the ABC's own move, in its own standfirst.
 *
 * The third — a callout CARD rather than a callout label — is taken in the form a static plate can
 * carry: the name in the mark's own weight, then the two numbers that make the mark worth naming.
 * The photograph the ABC puts in its card is not something this base can produce.
 */

import { scaleLinear, scaleSqrt } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Mark = { code: string; entity: string; tonnes: number; people: number };
export type Callout = { code: string; name: string; lines: string[] };

export function DirectedBeeswarm({
  marks,
  callouts,
  mean,
  markerLabel,
  axisName,
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
  marks: Mark[];
  callouts: Callout[];
  mean: number;
  markerLabel: string;
  axisName: string;
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

  /** THE FIELD IS FURNITURE AND THE CASES ARE INK. The swarm is drawn in a tint of the direction's
   *  accent so 213 circles read as a distribution rather than as 213 arguments; the two called-out
   *  countries keep that colour and gain a stroke at full strength. */
  const swarm = mix(direction.accent, direction.ground, 0.45);
  const ringed = accentInk;
  const rule = mix(direction.ground, ink, 0.45);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const annotLead = annot.fontSize * 1.4;
  const calloutLead = annotBand.ascent + annotBand.descent + 2;

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
    /** THE CARDS GET THEIR OWN ROOM, ABOVE THE FIELD. Placed inside the band they landed on the
     *  densest part of the swarm — the largest circle is by definition where the field is thickest,
     *  so there is no clear seat near it. A card written over the distribution it names is not a
     *  card, it is a stain on the evidence. */
    const cardRoom = valueBand.ascent + valueBand.descent + 2 * calloutLead + 12;
    const swarmTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.4 + cardRoom;
    const swarmBottom =
      (readingLines.length ? readingTop - annotBand.ascent - annot.fontSize * 0.9 : sourceTop - bodyLead * 1.2) -
      axisBand.ascent -
      axisBand.descent -
      10;
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
      swarmTop,
      swarmBottom,
      cardRoom,
      band: swarmBottom - swarmTop,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }

  const top = Math.max(...marks.map((m) => m.tonnes));
  const xTicks = [0, 10, 20, 30, 40].filter((t) => t <= top + 2);
  const x = scaleLinear()
    .domain([0, Math.max(top, xTicks[xTicks.length - 1]) * 1.02])
    .range([PAD + 6, width - PAD - 6]);

  /** THE PACKING. Marks are laid down largest first — a big circle placed late has nowhere to go and
   *  ends up thrown to the edge of the band, which reads as a value it does not have — and each is
   *  pushed ONLY perpendicular to the axis, never along it. A swarm that slides a mark sideways to
   *  make room has lied about the one thing it measures. */
  const packAt = (radiusOf: (m: Mark) => number) => {
    const placed: Array<{ m: Mark; cx: number; cy: number; r: number }> = [];
    const order = [...marks].sort((a, b) => b.people - a.people);
    let extent = 0;
    for (const m of order) {
      const r = radiusOf(m);
      const cx = x(m.tonnes);
      let cy = 0;
      for (let step = 0; step < 4000; step++) {
        const offset = Math.ceil(step / 2) * 1.1 * (step % 2 === 0 ? 1 : -1);
        const hits = placed.some((p) => {
          const dx = p.cx - cx;
          const dy = p.cy - offset;
          const reach = p.r + r + 0.55;
          return dx * dx + dy * dy < reach * reach;
        });
        if (!hits) {
          cy = offset;
          break;
        }
      }
      placed.push({ m, cx, cy, r });
      extent = Math.max(extent, Math.abs(cy) + r);
    }
    return { placed, extent };
  };

  /** THE RADIUS IS A LADDER, NOT A TASTE. The area is the population, so the radius runs on a square
   *  root; how big the largest circle may be is decided by whether the whole swarm still fits its
   *  band. The rungs are walked from generous to mean and the first that fits is taken — and the
   *  smallest countries are floored at a radius a reader can see, which is stated on the plate
   *  rather than left as a silent distortion. */
  const MAX_RADII = [30, 26, 22, 19, 16, 13, 11, 9];
  const MIN_RADIUS = 0.9;
  const biggest = Math.max(...marks.map((m) => m.people));

  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    pack: ReturnType<typeof packAt>;
    maxRadius: number;
  } | null = null;
  outer: for (const rung of rungs) {
    const layout = layoutFor(rung.title, rung.limit, rung.reading);
    if (layout.band <= 0) continue;
    for (const maxRadius of MAX_RADII) {
      const r = scaleSqrt().domain([0, biggest]).range([0, maxRadius]);
      const pack = packAt((m) => Math.max(MIN_RADIUS, r(m.people)));
      if (pack.extent * 2 <= layout.band) {
        fits = { rung, layout, pack, maxRadius };
        break outer;
      }
    }
  }
  if (!fits)
    throw new Error(
      `the swarm does not fit its band at any filed radius, in this direction. Give the beat ` +
        `shorter copy — do not narrow the axis, which is the measurement.`,
    );
  const { layout, pack, maxRadius } = fits;
  const midline = (layout.swarmTop + layout.swarmBottom) / 2;

  /** THE AXIS NAME AND ITS TICKS SHARE ONE ROW, one size, separated by weight — the reference's own
   *  measurement (`ABCSans 12/700` for `INCOME`, `ABCSansRegular 12/400` for `$50m`). Sharing a row
   *  means they can collide, and when they do the TICK gives way: a tick is one reading of a scale
   *  the reader can interpolate, and the name is the only thing that says what the scale is. How
   *  many ticks the name cost is printed on the ladder rather than left silent. */
  const nameWidth = widthOf(set(axisName, axis), axis, 700);
  const nameLeft = width - PAD - nameWidth - 10;
  const shownTicks = xTicks.filter(
    (t) => x(t) + widthOf(set(String(t), axis), axis) / 2 < nameLeft,
  );
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · band ${layout.band.toFixed(0)}px, swarm ${(pack.extent * 2).toFixed(0)}px at a ` +
      `${maxRadius}px largest circle · ${marks.length} countries · ${shownTicks.length}/${xTicks.length} ticks kept`,
  );

  const seatOf = (code: string) => pack.placed.find((p) => p.m.code === code)!;



  /** THE CALLOUT CARD SITS CLEAR OF THE FIELD OR IT IS NOT A CARD. Both cards sit in the room
   *  reserved above the swarm, each centred on its own circle and clamped inside the plate, with a
   *  hairline leader running down to the circle's top edge. Two cards that would overlap are pushed
   *  apart along the axis — a card is allowed to move, a circle is not. */
  const cardTops = callouts.map((c) => {
    const seat = seatOf(c.code);
    const w = Math.max(
      widthOf(set(c.name, value), value),
      ...c.lines.map((l) => widthOf(set(l, annot), annot)),
    );
    return { c, seat, w, cx: seat.cx };
  });
  cardTops.sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < cardTops.length; i++) {
    const left = cardTops[i - 1];
    const here = cardTops[i];
    const overlap = left.cx + left.w / 2 + 12 - (here.cx - here.w / 2);
    if (overlap > 0) here.cx += overlap;
  }
  const cards = cardTops.map(({ c, seat, w, cx }) => {
    let anchor: "start" | "middle" | "end" = "middle";
    let tx = cx;
    if (tx - w / 2 < PAD) {
      anchor = "start";
      tx = PAD;
    } else if (tx + w / 2 > width - PAD) {
      anchor = "end";
      tx = width - PAD;
    }
    const cardH = valueBand.ascent + valueBand.descent + 2 * calloutLead;
    const topY = layout.swarmTop - 10 - cardH;
    return { c, seat, cy: midline + seat.cy, topY, tx, anchor, cardH };
  });

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

      {/* THE WORLD AVERAGE, which is what the headline argues about — drawn as a rule that stops at
          the band rather than spanning the plate. */}
      <line
        x1={x(mean)}
        x2={x(mean)}
        y1={layout.swarmTop}
        y2={layout.swarmBottom}
        stroke={rule}
        strokeWidth={direction.stroke.rule}
      />
      <text
        x={x(mean) + 6}
        y={layout.swarmBottom - axisBand.descent}
        {...line(axis)}
        fill={mutedInk}
      >
        {set(markerLabel, axis)}
      </text>

      {/* THE FIELD. One circle per country, at its own value, pushed only across the axis. */}
      {pack.placed.map((p) => (
        <circle key={p.m.code} cx={p.cx} cy={midline + p.cy} r={p.r} fill={swarm} />
      ))}

      {/* THE CASES, RINGED — not recoloured, because the field's colour is not carrying a category
          and a second hue would be a legend a reader has to learn for nothing. */}
      {on("the-subject-is-ringed-not-recoloured") &&
        cards.map(({ c, seat, cy }) => (
          <circle
            key={`ring-${c.code}`}
            cx={seat.cx}
            cy={cy}
            r={seat.r + 1.6}
            fill="none"
            stroke={ringed}
            strokeWidth={direction.stroke.rule}
          />
        ))}

      {cards.map(({ c, seat, cy, topY, tx, anchor, cardH }) => (
        <g key={`card-${c.code}`}>
          <line
            x1={seat.cx}
            x2={seat.cx}
            y1={topY + cardH + 3}
            y2={cy - seat.r - 2}
            stroke={ringed}
            strokeWidth={direction.stroke.hairline}
          />
          <text x={tx} y={topY + valueBand.ascent} textAnchor={anchor} {...line(value)} fill={ringed}>
            {set(c.name, value)}
          </text>
          {c.lines.map((l, i) => (
            <text
              key={l}
              x={tx}
              y={topY + valueBand.ascent + valueBand.descent + i * calloutLead + annotBand.ascent}
              textAnchor={anchor}
              {...line(annot)}
              fill={mutedInk}
            >
              {set(l, annot)}
            </text>
          ))}
        </g>
      ))}

      {/* THE AXIS. Name and ticks at ONE size, separated by weight, both tracked — the reference's
          own measurement, imported. */}
      {shownTicks.map((t) => (
        <text
          key={`x${t}`}
          x={x(t)}
          y={layout.swarmBottom + 10 + axisBand.ascent}
          textAnchor={t === 0 ? "start" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(t), axis)}
        </text>
      ))}
      <text
        x={width - PAD}
        y={layout.swarmBottom + 10 + axisBand.ascent}
        textAnchor="end"
        {...line(axis)}
        fontWeight={700}
        fill={mutedInk}
      >
        {set(axisName, axis)}
      </text>

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
        <text key={`s${i}`} x={PAD} y={layout.sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
    </svg>
  );
}
