/**
 * The FOUR chart frames this beat steps through — a line, a ranked bar, a slope and a dot strip.
 *
 * They exist as four separate components on purpose. This beat's whole argument is that the answer
 * changes with the encoding, so a single parameterised "chart" component with a `kind` prop would
 * be the beat arguing against itself: four states of one chart is exactly the shape
 * `scrolly/SKILL.md` tells you NOT to reach for this vehicle for.
 *
 * Three rules every frame below keeps, inherited from the vehicle's own discipline
 * (`scrolly/references/scrolly-discipline.md`, "Two kinds of frame: scenery is cropped,
 * evidence is fitted"):
 *
 *   1. **Fitted, never cropped.** A chart is EVIDENCE. Each frame is an HTML box laid out in
 *      percentages of whatever box the sticky graphic gives it; the SVG inside carries GEOMETRY
 *      ONLY and stretches (`preserveAspectRatio="none"`). Cropping an axis label is not a cosmetic
 *      loss the way cropping scenery is.
 *   2. **Geometry stretches; type does not.** Every word is HTML at a fixed pixel size positioned
 *      in percentages over the same box. A 15px tick label is 15px at 375px and at 1600px.
 *      **And so is every DOT**: the dot strip's marks are HTML too, not SVG circles — a circle in a
 *      `preserveAspectRatio="none"` SVG is an ellipse at every viewport but one.
 *   3. **Everything sits inside the frame, and the axis furniture stays in the GUTTERS.** Plot,
 *      axis labels and annotations used to be squeezed above `CONTENT_TOP` so a prose panel parked
 *      in the bottom 28% could never cover them. The vehicle's ninth correction puts the card back
 *      over the visual and lets it travel the whole height, so nothing can be reserved from it and
 *      that band was 28% of every frame spent on bare ground. What the card asks of a frame instead
 *      is a COMPOSITION rule: its own vertical edges cut a centred stripe out of the middle, so a
 *      FITTED frame keeps its axis furniture in the left and right gutters, which are outside that
 *      stripe at every width. See `scrolly/references/scrolly-discipline.md`, "What the card
 *      covers."
 *
 * No component here imports a rasteriser: `ink`, `muted`, `grid`, `accent` and `ground` are props,
 * derived once in node by `render.mjs`, the same invariant every seed in this project keeps.
 */

import type { CSSProperties, ReactNode } from "react";
import type { CarbonFacts, Series } from "./carbon-data.ts";
import { t } from "./carbon-data.ts";

// ===== The placement constants every frame is built against =====

/** The plot box, in fractions of the frame. Its floor leaves 9% of the frame for the strip of
 *  x-axis labels that sits below it — and nothing else, since the ninth correction of the vehicle
 *  reclaimed the 28% that used to be held for a parked prose panel. `bottom` was 0.63 and is 0.91:
 *  230px of an 821px frame given back to the chart at 1600x900. */
export const PLOT = {
  left: 0.13,
  right: 0.96,
  top: 0.15,
  bottom: 0.91,
} as const;

/** The geometry-only viewBox every plot's own SVG stretches across. */
export const VIEWBOX = { width: 1000, height: 500 } as const;

const FONT = "Helvetica, Arial, sans-serif";

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/**
 * The y-axis gutter is a `max()`, not a percentage — a fixed-size label in a shrinking box. 13% of
 * a 375px phone is 49px, and the widest tick label this beat draws needs more than that. The floor
 * is what keeps the widest label on screen at exactly the width where legibility matters most.
 */
const gutter = (floorPx: number, fraction: number) =>
  `max(${floorPx}px, ${pct(fraction)})`;

type Furniture = {
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
};

/** A word on a frame: absolutely positioned HTML at a fixed pixel size. Never an SVG `<text>`. */
function Label({
  style,
  children,
  chip,
  ground,
}: {
  style: CSSProperties;
  children: ReactNode;
  /** Paint the label's own ground behind it — for a label that sits over the plot, where a rule or
   *  a line would otherwise strike straight through the words. */
  chip?: boolean;
  ground?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        fontFamily: FONT,
        whiteSpace: "nowrap",
        ...(chip
          ? { background: ground, padding: "1px 5px", borderRadius: "2px" }
          : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The shell every frame shares: the frame's own ground, the plot box positioned inside it, and the
 * unit line. The plot's own SVG is handed in already built, so each frame owns its geometry and
 * none of them owns the box.
 */
function Frame({
  ground,
  muted,
  unit,
  left,
  top,
  bottom,
  geometry,
  children,
}: {
  ground: string;
  muted: string;
  unit: string;
  left: string;
  top: number;
  bottom: number;
  geometry: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left,
          top: pct(top),
          width: `calc(${pct(PLOT.right)} - ${left})`,
          height: pct(bottom - top),
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            overflow: "visible",
          }}
        >
          {geometry}
        </svg>
      </div>
      {/* The unit sits at a fixed inset from the frame's own left edge, never at `left: 0` — a
          previous scrolly chart lost the first letter of its unit to the frame's own edge. */}
      <Label
        style={{
          left: "10px",
          top: pct(top - 0.075),
          fontSize: "15px",
          color: muted,
        }}
      >
        {unit}
      </Label>
      {children}
    </div>
  );
}

const UNIT = "tonnes of CO₂ per person";

/** Positions across the plot box, as CSS that resolves against the same `max()` gutter the box uses. */
function axisX(left: string) {
  const right = pct(PLOT.right);
  return (f: number) =>
    `calc(${left} + ${f.toFixed(5)} * (${right} - ${left}))`;
}

/** A fraction of the PLOT's own height, expressed as a fraction of the FRAME. */
const axisY = (top: number, bottom: number) => (f: number) =>
  top + f * (bottom - top);

// ===== 1. The LINE — direction. What every country did, over 35 years. =====

/**
 * All 27 member states as one grey fan, with the MEDIAN of the 27 drawn over them in the accent.
 *
 * The accent is spent on exactly one line, and on the one line the step's prose is about. Twenty-
 * seven accented lines would be twenty-seven claims; a fan in the derived muted grey is one claim
 * ("they nearly all come down") with a measured line through the middle of it.
 *
 * A LINEAR y axis over the full domain, including the one country that starts three times above the
 * rest: the fan's shape IS the step's argument, and clipping the domain to make the middle
 * comfortable would flatten exactly what the reader is being shown.
 */
export function LineFrame({
  series,
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: Furniture & { series: Series; facts: CarbonFacts }) {
  const left = gutter(56, PLOT.left);
  const atX = axisX(left);
  const inY = axisY(PLOT.top, PLOT.bottom);

  const yMax =
    Math.ceil(Math.max(...facts.changes.map((c) => c.first)) / 5) * 5;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += 5) yTicks.push(v);

  const years = facts.years;
  const fx = (year: number) =>
    (year - years[0]) / (years[years.length - 1] - years[0]);
  const x = (year: number) => fx(year) * VIEWBOX.width;
  const y = (v: number) => VIEWBOX.height - (v / yMax) * VIEWBOX.height;
  const path = (points: { year: number; value: number }[]) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)} ${y(p.value).toFixed(1)}`,
      )
      .join("");

  const lines = facts.countries.map((country) => ({
    country,
    d: path(
      years.map((year) => ({ year, value: series.get(country)!.get(year)! })),
    ),
  }));
  const medianPath = path(
    facts.medianByYear.map((m) => ({ year: m.year, value: m.value })),
  );

  // The highest reading anywhere in the window, so the label that explains the domain names the
  // country and the year the data actually puts there rather than the one anybody remembers.
  const peak = facts.changes.reduce((a, b) => (b.first > a.first ? b : a));

  const decadeTicks = years.filter(
    (yr) => yr % 10 === 0 || yr === years[years.length - 1],
  );

  return (
    <Frame
      ground={ground}
      muted={muted}
      unit={UNIT}
      left={left}
      top={PLOT.top}
      bottom={PLOT.bottom}
      geometry={
        <>
          {yTicks.map((v) => (
            <line
              key={v}
              x1={0}
              x2={VIEWBOX.width}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? ink : grid}
              strokeWidth={v === 0 ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {lines.map((l) => (
            <path
              key={l.country}
              d={l.d}
              fill="none"
              stroke={muted}
              strokeWidth={1.4}
              opacity={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={medianPath}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
            vectorEffect="non-scaling-stroke"
          />
        </>
      }
    >
      {yTicks.map((v) => (
        <Label
          key={v}
          style={{
            left: 0,
            top: `calc(${pct(inY(1 - v / yMax))} - 9px)`,
            width: `calc(${left} - 10px)`,
            textAlign: "right",
            fontSize: "15px",
            color: muted,
          }}
        >
          {v}
        </Label>
      ))}
      {/* The LAST tick is right-aligned to the plot's own right edge, not centred on it. Centred, it
          hangs half its own width past the frame — measured at 375px, where "2024" ran 1.5px off
          the screen. A tick label is the one piece of type whose position is decided by geometry
          that does not know how wide the label is. */}
      {decadeTicks.map((yr, i) => (
        <Label
          key={yr}
          style={{
            left: atX(fx(yr)),
            top: `calc(${pct(PLOT.bottom)} + 8px)`,
            transform:
              i === decadeTicks.length - 1
                ? "translateX(-100%)"
                : "translateX(-50%)",
            fontSize: "15px",
            color: muted,
          }}
        >
          {yr}
        </Label>
      ))}
      <Label
        chip
        ground={ground}
        style={{
          left: `calc(${atX(0)} + 8px)`,
          top: `calc(${pct(inY(1 - peak.first / yMax))} - 24px)`,
          fontSize: "15px",
          color: ink,
        }}
      >
        {`${peak.country} ${t(peak.first)} in ${facts.years[0]}`}
      </Label>
      <Label
        chip
        ground={ground}
        style={{
          left: `calc(${atX(0)} + 8px)`,
          top: `calc(${pct(inY(1 - facts.medianFirst / yMax))} - 26px)`,
          fontSize: "16px",
          fontWeight: 600,
          color: accent,
        }}
      >
        {`median of the ${facts.countries.length}: ${t(facts.medianFirst)}`}
      </Label>
      <Label
        chip
        ground={ground}
        style={{
          left: `calc(${atX(1)} - 8px)`,
          top: `calc(${pct(inY(1 - facts.medianLast / yMax))} - 26px)`,
          transform: "translateX(-100%)",
          fontSize: "16px",
          fontWeight: 600,
          color: accent,
        }}
      >
        {t(facts.medianLast)}
      </Label>
    </Frame>
  );
}

// ===== 2. The RANKED BAR — level. Where each country stands in the final year. =====

/**
 * All 27, sorted, in the final year. The accent marks the two ends the step's prose names — the
 * highest and the lowest — because the claim it carries is a RATIO between exactly those two; every
 * other bar is the derived muted grey, which is what makes the two read as marked rather than as
 * two of twenty-seven colours.
 *
 * The plot starts higher up the frame than the other three (`top` here, not `PLOT.top`): 27 rows
 * need the height, and this frame has no annotation above the plot to make room for.
 */
export function RankedBarFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: Furniture & { facts: CarbonFacts }) {
  const left = gutter(88, 0.2);
  const atX = axisX(left);
  const top = 0.1;
  const inY = axisY(top, PLOT.bottom);

  const rows = facts.ranked;
  const xMax = Math.ceil(facts.highestLast.value / 2) * 2;
  const xTicks: number[] = [];
  for (let v = 0; v <= xMax; v += 4) xTicks.push(v);

  const pitch = VIEWBOX.height / rows.length;
  const barH = pitch * 0.68;
  const marked = new Set([facts.highestLast.country, facts.lowestLast.country]);

  return (
    <Frame
      ground={ground}
      muted={muted}
      unit={`${UNIT}, ${facts.years[facts.years.length - 1]}`}
      left={left}
      top={top}
      bottom={PLOT.bottom}
      geometry={
        <>
          {xTicks.map((v) => (
            <line
              key={v}
              x1={(v / xMax) * VIEWBOX.width}
              x2={(v / xMax) * VIEWBOX.width}
              y1={0}
              y2={VIEWBOX.height}
              stroke={v === 0 ? ink : grid}
              strokeWidth={v === 0 ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {rows.map((r, i) => (
            <rect
              key={r.country}
              x={0}
              y={i * pitch + (pitch - barH) / 2}
              width={(r.value / xMax) * VIEWBOX.width}
              height={barH}
              fill={marked.has(r.country) ? accent : muted}
              opacity={marked.has(r.country) ? 1 : 0.55}
            />
          ))}
        </>
      }
    >
      {rows.map((r, i) => (
        <Label
          key={r.country}
          style={{
            left: 0,
            top: `calc(${pct(inY((i + 0.5) / rows.length))} - 7px)`,
            width: `calc(${left} - 8px)`,
            textAlign: "right",
            fontSize: "12px",
            fontWeight: marked.has(r.country) ? 700 : 400,
            color: marked.has(r.country) ? ink : muted,
          }}
        >
          {r.country}
        </Label>
      ))}
      {[facts.highestLast, facts.lowestLast].map((r) => {
        const i = rows.findIndex((row) => row.country === r.country);
        return (
          <Label
            key={r.country}
            style={{
              left: `calc(${atX(r.value / xMax)} + 8px)`,
              top: `calc(${pct(inY((i + 0.5) / rows.length))} - 9px)`,
              fontSize: "15px",
              fontWeight: 700,
              color: ink,
            }}
          >
            {t(r.value)}
          </Label>
        );
      })}
      {xTicks.map((v) => (
        <Label
          key={v}
          style={{
            left: atX(v / xMax),
            top: `calc(${pct(PLOT.bottom)} + 8px)`,
            transform: "translateX(-50%)",
            fontSize: "15px",
            color: muted,
          }}
        >
          {v}
        </Label>
      ))}
    </Frame>
  );
}

// ===== 3. The SLOPE — change. The two ends of the window, joined. =====

/**
 * Two vertical axes, one per end of the window, and 27 lines between them.
 *
 * **The two axes are drawn**, with their own ticks and labels. A slope chart without them is a
 * bundle of lines floating in space: the reader can see that a line falls but not from what to
 * what, and this project has had exactly that reported on a sibling slope beat. They are geometry,
 * so they live in the SVG; their labels are HTML, like every other word here.
 *
 * Two lines are picked out and neither is picked out in a second hue: the largest fall takes the
 * accent, and the single country that ROSE is drawn in `ink` — furniture, not a second colour —
 * because it is the exception the step's prose names, not a second category.
 */
export function SlopeFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: Furniture & { facts: CarbonFacts }) {
  const left = gutter(56, PLOT.left);
  const atX = axisX(left);
  const inY = axisY(PLOT.top, PLOT.bottom);

  const yMax =
    Math.ceil(Math.max(...facts.changes.map((c) => c.first)) / 5) * 5;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += 5) yTicks.push(v);
  const y = (v: number) => VIEWBOX.height - (v / yMax) * VIEWBOX.height;

  // The axes sit inside the plot box rather than on its edges, so the country labels beside them
  // have somewhere to go without leaving the frame.
  const xa = 0.13;
  const xb = 0.87;
  const highlight = new Map<string, string>([
    [facts.biggestFall.country, accent],
    [facts.riser.country, ink],
  ]);

  return (
    <Frame
      ground={ground}
      muted={muted}
      unit={UNIT}
      left={left}
      top={PLOT.top}
      bottom={PLOT.bottom}
      geometry={
        <>
          {yTicks.map((v) => (
            <line
              key={v}
              x1={0}
              x2={VIEWBOX.width}
              y1={y(v)}
              y2={y(v)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {[xa, xb].map((f) => (
            <line
              key={f}
              x1={f * VIEWBOX.width}
              x2={f * VIEWBOX.width}
              y1={0}
              y2={VIEWBOX.height}
              stroke={ink}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {facts.changes.map((c) => (
            <line
              key={c.country}
              x1={xa * VIEWBOX.width}
              x2={xb * VIEWBOX.width}
              y1={y(c.first)}
              y2={y(c.last)}
              stroke={highlight.get(c.country) ?? muted}
              strokeWidth={highlight.has(c.country) ? 3 : 1.4}
              opacity={highlight.has(c.country) ? 1 : 0.45}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      }
    >
      {yTicks.map((v) => (
        <Label
          key={v}
          style={{
            left: 0,
            top: `calc(${pct(inY(1 - v / yMax))} - 9px)`,
            width: `calc(${left} - 10px)`,
            textAlign: "right",
            fontSize: "15px",
            color: muted,
          }}
        >
          {v}
        </Label>
      ))}
      {[
        { f: xa, year: facts.years[0] },
        { f: xb, year: facts.years[facts.years.length - 1] },
      ].map((a) => (
        <Label
          key={a.year}
          style={{
            left: atX(a.f),
            top: `calc(${pct(PLOT.bottom)} + 8px)`,
            transform: "translateX(-50%)",
            fontSize: "16px",
            fontWeight: 600,
            color: ink,
          }}
        >
          {a.year}
        </Label>
      ))}
      <Label
        chip
        ground={ground}
        style={{
          left: `calc(${atX(xa)} + 10px)`,
          top: `calc(${pct(inY(1 - facts.biggestFall.first / yMax))} - 10px)`,
          fontSize: "16px",
          fontWeight: 600,
          color: accent,
        }}
      >
        {`${facts.biggestFall.country} ${t(facts.biggestFall.first)}`}
      </Label>
      <Label
        chip
        ground={ground}
        style={{
          left: `calc(${atX(xb)} - 10px)`,
          top: `calc(${pct(inY(1 - facts.biggestFall.last / yMax))} - 26px)`,
          transform: "translateX(-100%)",
          fontSize: "16px",
          fontWeight: 600,
          color: accent,
        }}
      >
        {t(facts.biggestFall.last)}
      </Label>
      {/* The riser's label hangs INSIDE the right-hand axis, not outside it. Outside, it ran off
          the frame at 375px — the axis sits at 87% of a plot box whose own right edge is 96% of the
          frame, which leaves 9% of a phone, about 34px, for an 87px label. */}
      <Label
        chip
        ground={ground}
        style={{
          left: `calc(${atX(xb)} - 10px)`,
          top: `calc(${pct(inY(1 - facts.riser.last / yMax))} - 10px)`,
          transform: "translateX(-100%)",
          fontSize: "15px",
          fontWeight: 600,
          color: ink,
        }}
      >
        {`${facts.riser.country} ${t(facts.riser.last)}`}
      </Label>
    </Frame>
  );
}

// ===== 4. The DOT PLOT — spread. The 27 with their names taken away. =====

/**
 * The 27 final-year readings as a stacked dot plot — a Wilkinson dot plot: the axis is divided into
 * equal bins and every reading in a bin is stacked above the ones before it, so the SHAPE of the
 * pile is the distribution.
 *
 * **The first version of this frame was a scattered dot strip and it was wrong**, in a way only
 * looking at the render showed: dots were assigned to whichever row had space, which spread 27
 * readings over five rows in a lattice that read as a scatter plot of two variables — and the
 * second variable did not exist. A distribution has to pile up where the readings are, or the
 * reader is being shown a pattern nothing in the data put there.
 *
 * **The dots are HTML, not SVG.** Everything else on this frame is geometry in a
 * `preserveAspectRatio="none"` SVG, which stretches — and a stretched circle is an ellipse at every
 * viewport width but one. A mark whose ROUNDNESS carries meaning belongs with the type, at a fixed
 * pixel size, not with the geometry.
 */
export function DotStripFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: Furniture & { facts: CarbonFacts }) {
  const left = gutter(56, PLOT.left);
  const atX = axisX(left);
  const top = 0.2;
  const bottom = PLOT.bottom;

  const xMax = Math.ceil(facts.highestLast.value / 2) * 2;
  const xTicks: number[] = [];
  for (let v = 0; v <= xMax; v += 2) xTicks.push(v);

  // 24 bins across the axis — half a tonne each on this domain. Derived from the domain rather
  // than typed, so a wider domain widens the bins instead of crowding the pile.
  const BINS = 24;
  const binW = xMax / BINS;
  const piles = new Map<number, { country: string; value: number }[]>();
  for (const r of [...facts.ranked].sort((a, b) => a.value - b.value)) {
    const bin = Math.min(BINS - 1, Math.floor(r.value / binW));
    const pile = piles.get(bin);
    if (pile) pile.push(r);
    else piles.set(bin, [r]);
  }
  const placed = [...piles.entries()].flatMap(([bin, pile]) =>
    pile.map((r, k) => ({ ...r, bin, k })),
  );
  const tallest = Math.max(...[...piles.values()].map((p) => p.length));

  // The pile grows UP from the axis, and its pitch shrinks if it would ever outgrow the band, so
  // no dot can be pushed above the plot however tall the tallest bin turns out to be.
  const DOT = 13;
  const band = bottom - top;
  const pitch = Math.min(0.042, band / (tallest + 1));

  const medianBand = { lo: facts.medianLast - 2, hi: facts.medianLast + 2 };
  const dotY = (k: number) => bottom - (k + 0.5) * pitch;
  const dotX = (bin: number) => (bin + 0.5) * binW;

  // A name goes above the TOP of the pile its country sits in, never above the country's own dot:
  // the first render put "Malta" one pitch above Malta's dot, which is exactly where the next dot
  // in the same pile already was, and the chip covered it.
  const extremes = [facts.lowestLast, facts.highestLast].map((r) => {
    const d = placed.find((p) => p.country === r.country)!;
    return { ...d, pileTop: piles.get(d.bin)!.length - 1 };
  });

  return (
    <Frame
      ground={ground}
      muted={muted}
      unit={`${UNIT}, ${facts.years[facts.years.length - 1]}`}
      left={left}
      top={top}
      bottom={bottom}
      geometry={
        <>
          <rect
            x={(medianBand.lo / xMax) * VIEWBOX.width}
            y={0}
            width={((medianBand.hi - medianBand.lo) / xMax) * VIEWBOX.width}
            height={VIEWBOX.height}
            fill={muted}
            opacity={0.1}
          />
          {xTicks.map((v) => (
            <line
              key={v}
              x1={(v / xMax) * VIEWBOX.width}
              x2={(v / xMax) * VIEWBOX.width}
              y1={0}
              y2={VIEWBOX.height}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={0}
            x2={VIEWBOX.width}
            y1={VIEWBOX.height}
            y2={VIEWBOX.height}
            stroke={ink}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={(facts.medianLast / xMax) * VIEWBOX.width}
            x2={(facts.medianLast / xMax) * VIEWBOX.width}
            y1={0}
            y2={VIEWBOX.height}
            stroke={ink}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        </>
      }
    >
      {placed.map((d) => (
        <div
          key={d.country}
          style={{
            position: "absolute",
            left: atX(dotX(d.bin) / xMax),
            top: `calc(${pct(dotY(d.k))} - ${DOT / 2}px)`,
            marginLeft: `-${DOT / 2}px`,
            width: `${DOT}px`,
            height: `${DOT}px`,
            borderRadius: "50%",
            background: accent,
            border: `1.5px solid ${ground}`,
            boxSizing: "border-box",
          }}
        />
      ))}
      {xTicks.map((v) => (
        <Label
          key={v}
          style={{
            left: atX(v / xMax),
            top: `calc(${pct(bottom)} + 8px)`,
            transform: "translateX(-50%)",
            fontSize: "15px",
            color: muted,
          }}
        >
          {v}
        </Label>
      ))}
      {/* The band the step's prose counts, named on the graphic so the reader can see what "within
          two tonnes of the median" refers to rather than take it on trust. */}
      <Label
        chip
        ground={ground}
        style={{
          left: atX(facts.medianLast / xMax),
          top: `calc(${pct(top)} - 4px)`,
          transform: "translateX(-50%)",
          fontSize: "16px",
          fontWeight: 600,
          color: ink,
        }}
      >
        {`median ${t(facts.medianLast)} · shaded band ±2`}
      </Label>
      {/* Each extreme is named ON its own dot, not on the axis below it: an earlier version put both
          names at the axis and they read as tick labels for values nothing was standing at. */}
      {extremes.map((d) => (
        <Label
          key={d.country}
          chip
          ground={ground}
          style={{
            left: atX(dotX(d.bin) / xMax),
            top: `calc(${pct(dotY(d.pileTop))} - 30px)`,
            transform: "translateX(-50%)",
            fontSize: "14px",
            color: muted,
          }}
        >
          {d.country}
        </Label>
      ))}
    </Frame>
  );
}
