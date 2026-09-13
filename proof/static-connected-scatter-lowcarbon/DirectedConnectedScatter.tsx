/**
 * Sixteen European countries, 2000 → 2024, each drawn twice and joined, THROUGH the design base. The
 * first `connected scatter` component in this tree.
 *
 * WHAT THIS FORM IS FOR: two quantities that can move independently, and an entity that has a
 * BEFORE and an AFTER on both. The whole reading is the direction of the arc — up-left and up-right
 * are different stories, and no single-axis chart of this data tells either.
 *
 * `render-directions.mjs` records why the axis pair the reference recommends is not the one used:
 * a level and its share of the same group are one number up to a constant, so all the points of one
 * date land on a ray through the origin. Two shares that can move independently keep the reading and
 * lose the degeneracy.
 *
 * THE RULES TAKEN FROM THE REFERENCE (Ferdio's #70), which are its whole contribution:
 *
 *   **Hollow ring for before, filled disc for after, one hue, joined by a curved dotted link — and
 *   no key for it.** The record's own argument is that the convention is old enough that a reader
 *   carries it: an outline is what a thing WAS, a solid is what it IS. What the plate does not spend
 *   a key on, the standfirst says in prose.
 *
 *   **Label the later state only.** The label belongs to the entity, and the entity's current
 *   position is where a reader will look for it. The ring carries nothing.
 *
 *   **The link is curved and plainly not the shortest path.** A straight segment reads as
 *   interpolation — as if there were intermediate states on the line. There are none: the source has
 *   two dates.
 *
 * `context-in-neutral-at-the-subject-scale` and `accent-marks-the-thread` — the subject at full
 * accent, the other fifteen in a tint. `PALETTE.md` records why identity is NOT carried by hue here:
 * sixteen entities cannot be given sixteen hues without inventing a palette this base does not own.
 *
 * `a-narrow-cell-degrades-its-label-rather-than-dropping-it` is the marimekko family's rule and it is
 * borrowed knowingly rather than claimed: a name that cannot be seated degrades to the country's
 * three-letter code before it is given up, and how many degraded is printed on the ladder.
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
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type State = { weight: number; ownMix: number; twh: number };
export type Entity = { code: string; name: string; from: State; to: State };
type Box = { x0: number; y0: number; x1: number; y1: number };

export function DirectedConnectedScatter({
  entities,
  subject,
  from,
  to,
  xName,
  yName,
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
  entities: Entity[];
  subject: string;
  from: string;
  to: string;
  xName: string;
  yName: string;
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

  const contextInk = mix(direction.accent, direction.ground, 0.42);
  const grid = mix(direction.ground, ink, 0.1);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const plotTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 2.6;
    const plotBottom =
      (readingLines.length
        ? readingTop - annotBand.ascent - gapOf(annot, 0.6429)
        : sourceTop - bodyLead * 1.2) -
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
      plotTop,
      plotBottom,
      plot: plotBottom - plotTop,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  /** THE PLOT'S OWN FLOOR. A connected scatter is read by the DIRECTION of its arcs, and a direction
   *  needs an angle: flattened, every arc points the same way. The floor is eight axis-bands, which
   *  is room for five labelled ticks and the marks between them. */
  const plotOwes = (axisBand.ascent + axisBand.descent) * 8;
  const R = 4.2;

  /** THE LADDER BUYS ROOM FOR THE NAMES, not just for the plot. Placing the labels after choosing
   *  the rung meant a rung that fitted the plot's own floor could still leave five of sixteen
   *  entities unnamed — and the beat then refused a plate whose copy could simply have been shorter.
   *  So every rung is tried WHOLE: laid out, scaled, packed, and named. The first rung on which all
   *  sixteen are named is the one that renders. */
  const attempt = (layout_: ReturnType<typeof layoutFor>) => {
    if (layout_.plot < plotOwes) return null;
    // ── the scales, both zero-based because both axes are shares ───────────────
    const topWeight = Math.max(...entities.flatMap((e) => [e.from.weight, e.to.weight]));
    const xTicks = [0, 10, 20, 30, 40].filter((t) => t <= topWeight + 8);
    const yTicks = [0, 25, 50, 75, 100];
    const gutter = Math.max(...yTicks.map((t) => widthOf(set(String(t), axis), axis))) + 9;
    const x = scaleLinear()
      .domain([0, Math.max(topWeight * 1.08, xTicks[xTicks.length - 1])])
      .range([PAD + gutter, width - PAD - 4]);
    const y = scaleLinear().domain([0, 100]).range([layout_.plotBottom, layout_.plotTop]);

    const seats = entities.map((e) => ({
      e,
      isSubject: e.code === subject,
      x0: x(e.from.weight),
      y0: y(e.from.ownMix),
      x1: x(e.to.weight),
      y1: y(e.to.ownMix),
    }));

    /** THE LINK IS CURVED AND PLAINLY NOT THE SHORTEST PATH — the reference's own reading of its own
     *  drawing. A straight segment between two dates reads as interpolation, as if the source held the
     *  states in between. It holds two dates. The bow is a fixed fraction of the chord, so a long move
     *  bows more than a short one and no arc ever collapses into the straight line it must not be. */
    const arcOf = (s: (typeof seats)[number]) => {
      const dx = s.x1 - s.x0;
      const dy = s.y1 - s.y0;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.min(len * 0.18, 26);
      const mx = (s.x0 + s.x1) / 2 - (dy / len) * bow;
      const my = (s.y0 + s.y1) / 2 + (dx / len) * bow;
      return `M ${s.x0.toFixed(1)} ${s.y0.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${s.x1.toFixed(1)} ${s.y1.toFixed(1)}`;
    };

    /** THE LABEL BELONGS TO THE LATER STATE, and it is seated at the first of eight offsets that
     *  clears every label already placed, every mark on the plate, and the plot's own edges. A name
     *  that clears nothing degrades to the country's code before it is given up — a mark with no name
     *  on a scatter of sixteen entities is a mark a reader cannot use. */
    const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const marks: Box[] = seats.flatMap((s) => [
      { x0: s.x0 - R - 1, y0: s.y0 - R - 1, x1: s.x0 + R + 1, y1: s.y0 + R + 1 },
      { x0: s.x1 - R - 1, y0: s.y1 - R - 1, x1: s.x1 + R + 1, y1: s.y1 + R + 1 },
    ]);
    const placed: Box[] = [];
    let degraded = 0;
    const labels = [...seats]
      .sort((a, b) => Number(b.isSubject) - Number(a.isSubject) || b.e.to.weight - a.e.to.weight)
      .map((s) => {
        const reg_ = s.isSubject ? value : annot;
        const band = s.isSubject ? valueBand : annotBand;
        const h = band.ascent + band.descent;
        for (const [text, isCode] of [
          [s.e.name, false],
          [s.e.code, true],
        ] as Array<[string, boolean]>) {
          const w = widthOf(set(text, reg_), reg_);
          /** EIGHT DIRECTIONS AT THREE DISTANCES, near first. A label that has to sit far from its
           *  mark gets a hairline leader — without one, at sixteen entities, a name a centimetre away
           *  from its disc is a name the reader will attach to the wrong disc. */
          const OFFSETS: Array<[number, number, "start" | "middle" | "end", number]> = [];
          for (const reach of [R + 5, R + 14, R + 24, R + 36, R + 50]) {
            OFFSETS.push(
              [reach, h / 2 - band.descent, "start", reach],
              [-reach, h / 2 - band.descent, "end", reach],
              [0, -reach - band.descent, "middle", reach],
              [0, reach + band.ascent, "middle", reach],
              [reach * 0.72, -reach * 0.72, "start", reach],
              [-reach * 0.72, -reach * 0.72, "end", reach],
              [reach * 0.72, reach * 0.72 + band.ascent * 0.6, "start", reach],
              [-reach * 0.72, reach * 0.72 + band.ascent * 0.6, "end", reach],
            );
          }
          for (const [dx, dy, anchor, reach] of OFFSETS) {
            const tx = s.x1 + dx;
            const ty = s.y1 + dy;
            const left = anchor === "start" ? tx : anchor === "end" ? tx - w : tx - w / 2;
            const box = { x0: left - 1.5, y0: ty - band.ascent, x1: left + w + 1.5, y1: ty + band.descent };
            /** THE GUTTER IS THE AXIS'S, NOT THE LABELS'. Bounded at the plate's padding instead,
             *  three names sat on top of the y-axis's own numbers — and no guard sees it, because
             *  the guards measure the plate's frame and both runs are well inside it. */
            if (box.x0 < PAD + gutter + 3 || box.x1 > width - PAD) continue;
            if (box.y0 < layout_.plotTop || box.y1 > layout_.plotBottom) continue;
            if (placed.some((p) => overlaps(p, box))) continue;
            if (marks.some((m) => overlaps(m, box))) continue;
            placed.push(box);
            if (isCode) degraded++;
            return { s, text, tx, ty, anchor, reg: reg_, box, leader: reach > R + 6 };
          }
        }
        return null;
      })
      .filter(Boolean) as Array<{
      s: (typeof seats)[number];
      text: string;
      tx: number;
      ty: number;
      anchor: "start" | "middle" | "end";
      reg: any;
      box: Box;
      leader: boolean;
    }>;
    if (labels.length !== seats.length) return null;
    return { x, y, seats, labels, degraded, gutter, xTicks, yTicks, arcOf };
  };

  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    got: NonNullable<ReturnType<typeof attempt>>;
  } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.plot > best) best = l.plot;
    const got = attempt(l);
    if (got) {
      fits = { rung, layout: l, got };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `no rung of this beat's copy leaves a plot that both clears ${plotOwes.toFixed(0)}px and names ` +
        `all ${entities.length} entities; the tallest plot any rung offers is ${best.toFixed(0)}px. A ` +
        `mark with no name on a scatter of ${entities.length} is a mark a reader cannot use.`,
    );
  const layout = fits.layout;
  const { x, y, seats, labels, degraded, gutter, xTicks, yTicks, arcOf } = fits.got;

  const nameWidth = widthOf(set(xName, axis), axis, 700);
  const nameLeft = width - PAD - nameWidth - 10;
  const shownX = xTicks.filter((t) => x(t) + widthOf(set(String(t), axis), axis) / 2 < nameLeft);

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · plot ${layout.plot.toFixed(0)}px, floor ${plotOwes.toFixed(0)}px · ${seats.length} arcs, ` +
      `${degraded} names degraded to a code, ${labels.filter((l) => l.leader).length} on a leader · ` +
      `${shownX.length}/${xTicks.length} x-ticks kept`,
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

      <text x={PAD} y={layout.plotTop - annotBand.descent - 4} {...line(axis)} fontWeight={700} fill={mutedInk}>
        {set(yName, axis)}
      </text>

      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={PAD + gutter}
            x2={width - PAD - 4}
            y1={y(t)}
            y2={y(t)}
            stroke={grid}
            strokeWidth={direction.stroke.hairline}
          />
          <text
            x={PAD + gutter - 6}
            y={y(t) + axisBand.ascent / 2}
            textAnchor="end"
            {...line(axis)}
            fill={mutedInk}
          >
            {set(String(t), axis)}
          </text>
        </g>
      ))}

      {/* THE ARCS, then the marks on top of them, so a link never crosses the state it joins. */}
      {seats.map((s) => (
        <path
          key={`arc-${s.e.code}`}
          d={arcOf(s)}
          fill="none"
          stroke={s.isSubject ? accentInk : contextInk}
          strokeWidth={s.isSubject ? direction.stroke.rule : direction.stroke.hairline}
          strokeDasharray={s.isSubject ? "4 3" : "3 3"}
          strokeLinecap="round"
        />
      ))}
      {seats.map((s) => (
        <g key={`mark-${s.e.code}`}>
          {/* THE EARLIER STATE IS HOLLOW — an outline is what a thing was. */}
          <circle
            cx={s.x0}
            cy={s.y0}
            r={R}
            fill="none"
            stroke={s.isSubject ? accentInk : contextInk}
            strokeWidth={direction.stroke.rule}
          />
          {/* THE LATER STATE IS SOLID — a fill is what it is. */}
          <circle cx={s.x1} cy={s.y1} r={R} fill={s.isSubject ? accentInk : contextInk} />
        </g>
      ))}

      {labels
        .filter((l) => l.leader)
        .map(({ s, box }) => (
          <line
            key={`lead-${s.e.code}`}
            x1={s.x1}
            y1={s.y1}
            x2={Math.max(box.x0, Math.min(s.x1, box.x1))}
            y2={Math.max(box.y0, Math.min(s.y1, box.y1))}
            stroke={s.isSubject ? accentInk : contextInk}
            strokeWidth={direction.stroke.hairline}
          />
        ))}
      {/* EVERY NAME BREAKS THE LINES IT CROSSES. A gridline, an arc or a leader running through a
          word is the plate's own furniture cutting the plate's own evidence — and no guard sees it,
          because a stroke crossing a glyph is not an overlap of two text boxes. Each label is drawn
          twice: once as a halo in the ground it sits on, once as itself. */}
      {labels.map(({ s, text, tx, ty, anchor, reg: r }) => (
        <g key={`label-${s.e.code}`}>
          <text
            x={tx}
            y={ty}
            textAnchor={anchor}
            {...line(r)}
            fill="none"
            stroke={direction.ground}
            strokeWidth={3.4}
            strokeLinejoin="round"
          >
            {set(text, r)}
          </text>
          <text
            x={tx}
            y={ty}
            textAnchor={anchor}
            {...line(r)}
            fill={s.isSubject ? accentInk : mutedInk}
          >
            {set(text, r)}
          </text>
        </g>
      ))}

      {shownX.map((t) => (
        <text
          key={`x${t}`}
          x={x(t)}
          y={layout.plotBottom + 10 + axisBand.ascent}
          textAnchor={t === 0 ? "start" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(t), axis)}
        </text>
      ))}
      <text
        x={width - PAD}
        y={layout.plotBottom + 10 + axisBand.ascent}
        textAnchor="end"
        {...line(axis)}
        fontWeight={700}
        fill={mutedInk}
      >
        {set(xName, axis)}
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
