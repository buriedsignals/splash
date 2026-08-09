/**
 * The web beat of "Of these ten European countries, Germany cut per-capita CO₂ emissions the
 * furthest since 1990" — the interactive genre, a slopegraph over ten countries and two discrete
 * periods (1990, 2024).
 *
 * Not a second chart: the coordinates come from `./slope-geometry.ts` (`slopeGeometry`, `fmt`), the
 * pure core this file and its own `render-web.mjs` share. What this file adds is the one thing a
 * static frame cannot have — every one of the twenty endpoints (ten countries × two periods)
 * answers hover, tap or keyboard focus with its exact country, period and value. Read
 * `twin-chart-web/references/web-discipline.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME. This file used to ship two pre-rendered widths (900px and 360px)
 * swapped by a media query. The owner overturned that: one frame, filling its container
 * continuously, fitting the visible window. The separation that makes it safe is the one
 * `twin-chart-web/assets/ChartWebSeed.tsx` teaches — the `<svg>` carries GEOMETRY ONLY (no `<text>`
 * at all), and every word is HTML at a FIXED pixel size, positioned by `%` over the same CSS grid
 * the geometry is drawn in. Geometry stretches; type does not.
 *
 * THE ONE THING THIS TYPE NEEDS THAT THE SEED DID NOT, and the reason this file adds two CSS rules
 * of its own (appended by `render-web.mjs`, never edited into the skill): a slopegraph carries a
 * label column on BOTH sides. The seed's grid is `[y-gutter] [plot]`; this beat's is
 * `[left labels] [plot] [right labels]`, both label tracks a FIXED pixel width measured from the
 * real strings, so the plot — and only the plot — absorbs every pixel of a wider or narrower
 * container.
 *
 * AND THE ONE THING THAT CANNOT BE SOLVED BY STRETCHING: ten label blocks stacked down each side
 * need a real number of CSS pixels, and that number does not shrink when the container does. The
 * de-collision pass runs in canonical units, so the gap it guarantees is only worth its pixel value
 * at a given rendered height — which is why `.chart-plot` gets a measured `min-height` here
 * (`minPlotHeightPx` below), derived from the label block this beat actually draws rather than
 * guessed. Below that height the labels would collide however wide the frame is.
 *
 * `deriveFurniture`/`measureText` are not called here — `renderWeb` derives them once in node and
 * threads them in as props (`ink`/`muted`/`grid`/`measure`).
 */

import { slopeGeometry, fmt, type Country } from "./slope-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** This genre's own single fluid frame, in this beat's own shape. Declared here rather than
 *  imported from the skill's seed: a compile-time-only type has no `#shared/*` vendoring path, and
 *  a relative import across the skill boundary hard-codes this dev repository's own layout.
 *  Duplicate, do not link — the ruling this file's first build already documented for `WebLayout`. */
export type SlopeFrame = {
  /** The plot rectangle's canonical width/height in SVG user units — NOT a rendered pixel size and
   *  NOT a cap. It fixes the geometry's own internal proportions (which become one `aspect-ratio`)
   *  and the de-collision arithmetic below; the browser stretches it from there. */
  width: number;
  height: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  /** The "1990" / "2024" captions over each column — without them the chart states direction with
   *  no stated "from when to when," half the claim (`references/types/slope.md`). */
  period: { fontSize: number; fontWeight: number };
  /** The direct end label: country name, then its value on its own line. */
  label: { fontSize: number; fontWeight: number; lead: number };
  /** Air between a label track and the plot's own column. */
  gap: number;
  /** Air between two neighbouring label blocks, in CSS pixels, at the shortest height this beat
   *  will render at. It is what `minPlotHeightPx` buys: raise it and the rows breathe but the beat
   *  needs a taller window before it fits; drop it to zero and ten blocks stack edge to edge. */
  labelAirPx: number;
  /** The width a NAME is wrapped against. Not a truncation limit: the gutter is sized to whatever
   *  the real strings measure (see `gutterPx`), never the strings to the gutter — the "Interm."
   *  warning `references/types/slope.md` gives for this exact chart type. */
  labelWrapPx: number;
  /** The share of the frame's own height the ten de-collided label rows may claim between them.
   *  It is the whole trade this chart type makes in a fluid frame, in one number: push it towards 1
   *  and the labels are guaranteed to clear each other in a shorter window, but the de-collision
   *  pass spaces them so evenly that the row stops carrying its value; push it down and the rows
   *  stay closer to their true positions but the plot needs to be taller before they separate.
   *  `minPlotHeightPx` below is derived from it, not guessed. */
  labelPacking: number;
  /** Visible mark radius. */
  pointRadius: number;
  stroke: { accent: number; muted: number };
};

export const FRAME: SlopeFrame = {
  width: 620,
  height: 480,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  period: { fontSize: 14, fontWeight: 700 },
  // 17px of lead for a 13px face: two lines per label (name, then value) is the block this beat's
  // vertical budget is built around — see `minPlotHeightPx`.
  label: { fontSize: 13, fontWeight: 600, lead: 17 },
  gap: 10,
  labelAirPx: 8,
  // Wide enough that "United Kingdom", the longest name this beat draws, stays on ONE line at 13px
  // — measured, not assumed (`measure` is asserted against it below). A name that does not fit
  // still wraps rather than being cut, and widens its own gutter.
  labelWrapPx: 112,
  labelPacking: 0.85,
  pointRadius: 3.5,
  stroke: { accent: 3, muted: 1.5 },
};

/** Wrap on the measured width of the real string, never a character count. Splits on the literal
 *  ASCII space only, never the general `\s` class — `labelLines` below joins a value to its unit
 *  with a U+00A0 NO-BREAK SPACE precisely so this split point cannot strand a bare "t" on a line of
 *  its own, which is what a plain-space join did on this beat's first narrow render. */
export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/ +/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

const UNIT = "t";

/** How much of the plot's own width each endpoint's interactive band claims, inward from its own
 *  column. Anchored INSIDE the frame rather than centred on the column, because an SVG clips to its
 *  `viewBox`: a band centred on the 2024 column had half its width — including the pixel a reader
 *  aims at — outside the frame, and every one of that column's ten readings answered nothing when
 *  a real pointer was driven at it. Caught by driving a browser; a bounding box alone still
 *  reported the band as present and the right size. */
const BAND_SHARE = 0.18;

/** The one direct end label, as lines: the country's name (wrapped if it must be), then its value
 *  on its own last line. Two lines rather than one run-on string, because the fluid frame's label
 *  tracks are fixed-width columns and a one-line "United Kingdom 10.49 t" would need a 170px
 *  gutter on both sides — at 375px that leaves the plot itself under 50px. */
function labelLines(
  name: string,
  value: number,
  frame: SlopeFrame,
  measure: Measure,
): string[] {
  return [
    ...wrap(name, frame.labelWrapPx, frame.label, measure),
    `${fmt(value)} ${UNIT}`,
  ];
}

/**
 * Slide one column's de-collided label rows back inside the frame, as a block.
 *
 * `decollide` enforces spacing between NEIGHBOURS and knows nothing of the plot's own [0, height]:
 * this beat's real data puts six of its ten 2024 values inside 1.5 t of each other, right at the
 * range's floor, so pushing them apart sends the lowest rows past the bottom edge — clipped, and
 * (since the interactive band lives at the row, not at the mark) unreachable. Shifting the whole
 * column by one offset preserves every gap and every ordering the de-collision just established;
 * only the block's position moves, and the dashed leader from each mark to its own row makes the
 * displacement visible rather than silent. It throws instead of clipping if the block is genuinely
 * taller than the frame, because a label a reader cannot see is worse than a build that stops.
 */
function fitColumn(
  rows: number[],
  half: number,
  height: number,
  columnName: string,
): number[] {
  const lo = Math.min(...rows) - half;
  const hi = Math.max(...rows) + half;
  if (hi - lo > height + 1)
    throw new Error(
      `the ${columnName} column's label block is ${(hi - lo).toFixed(1)} canonical units tall, more than the frame's own ${height} — lower FRAME.labelPacking or raise FRAME.height`,
    );
  const shift = lo < 0 ? -lo : hi > height ? height - hi : 0;
  return rows.map((r) => r + shift);
}

/** A coordinate as a percentage of the box it was drawn in — the step that lets an HTML label sit
 *  on the exact row the SVG geometry put its mark on, and keep sitting there as the browser
 *  stretches that box. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function SlopeWeb({
  data,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  highlighted,
  periodLabels,
  frame,
  measure,
}: {
  data: Country[];
  title: string;
  /** The caveat under the title — unit, scope, and the "every one fell" fact the direct labels
   *  alone cannot state. `information-architecture.md`'s "Subtitle" zone. */
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  /** The one line this beat accents — Germany, per `BRIEF.md`. At most one hue total
   *  (`references/types/slope.md`): the United Kingdom, the claim's own comparison, stays plain
   *  muted like the other eight, and the end labels carry the comparison instead. */
  highlighted: string;
  periodLabels: { p1990: string; p2024: string };
  frame: SlopeFrame;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(
      "a slope beat needs at least two categories, got " + data.length,
    );

  // Every label this frame will draw, wrapped once, up front: both the gutter WIDTH and the label
  // BLOCK HEIGHT that drives the de-collision are measured from these, never guessed.
  const allLabels = data.flatMap((d) => [
    labelLines(d.name, d.v1990, frame, measure),
    labelLines(d.name, d.v2024, frame, measure),
  ]);
  const gutterPx =
    Math.ceil(
      Math.max(
        ...allLabels.flatMap((lines) =>
          lines.map((line) => measure(line, frame.label)),
        ),
      ),
    ) + 2;
  const maxLabelLines = Math.max(...allLabels.map((l) => l.length));
  const labelBlockPx = maxLabelLines * frame.label.lead;

  // THE VERTICAL BUDGET, derived rather than picked. Label rows are de-collided in CANONICAL units
  // (`minGapCanonical`), but what a reader sees is that gap times the plot's RENDERED height over
  // the canonical height. So the smallest rendered height at which neighbouring labels still clear
  // each other is fixed by the ratio between the two, and that is the number `.chart-plot`'s own
  // `min-height` gets. Below it a narrow window would stack ten labels into a space that cannot
  // hold them, whatever the frame's width.
  const minGapCanonical = Math.floor(
    (frame.height * frame.labelPacking) / data.length,
  );
  if (minGapCanonical < 1)
    throw new Error(
      `${data.length} label rows cannot be de-collided inside ${frame.height} canonical units at ${frame.labelPacking} packing — raise FRAME.height`,
    );
  const minPlotHeightPx = Math.ceil(
    ((labelBlockPx + frame.labelAirPx) * frame.height) / minGapCanonical,
  );

  const { lines: raw } = slopeGeometry(data, {
    x1990: 0,
    x2024: frame.width,
    top: 0,
    bottom: frame.height,
    minGap: minGapCanonical,
  });

  const halfRow = minGapCanonical / 2;
  const left = fitColumn(
    raw.map((l) => l.labelY1990),
    halfRow,
    frame.height,
    periodLabels.p1990,
  );
  const right = fitColumn(
    raw.map((l) => l.labelY2024),
    halfRow,
    frame.height,
    periodLabels.p2024,
  );
  const lines = raw.map((l, i) => ({
    ...l,
    labelY1990: left[i],
    labelY2024: right[i],
  }));

  // Germany drawn last so its accent line and dots are never crossed by a muted neighbour.
  const ordered = [
    ...lines.filter((l) => l.name !== highlighted),
    ...lines.filter((l) => l.name === highlighted),
  ];

  const totalWidth = gutterPx + frame.gap + frame.width + frame.gap + gutterPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--label-lead" as string]: `${frame.label.lead}px`,
        ["--period-size" as string]: `${frame.period.fontSize}px`,
        ["--period-weight" as string]: frame.period.fontWeight,
      }}
    >
      {/* The header block, with a fixed row of air beneath it: the period captions sit ABOVE the
          plot's own top edge (they caption its two columns, so they must line up with them), and
          without this gap they print straight through the caveat at a narrow width. Fixed pixels,
          because a caption is furniture and furniture in this genre does not stretch. */}
      <div className="chart-header" style={{ marginBottom: 26 }}>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{limits}</p>
      </div>

      <div
        className="chart-plot slope-plot"
        style={{
          ["--y-gutter" as string]: `${gutterPx + frame.gap}px`,
          ["--r-gutter" as string]: `${gutterPx + frame.gap}px`,
          ["--x-axis-h" as string]: "0px",
          ["--min-plot-h" as string]: `${minPlotHeightPx}px`,
          aspectRatio: `${totalWidth} / ${frame.height}`,
        }}
      >
        {/* Left label track — grid column 1. Right-aligned against the plot's own 1990 column. */}
        <div className="y-axis">
          {lines.map((l) => (
            <span
              key={`left-${l.name}`}
              className="slope-label left"
              style={{ top: `${pct(l.labelY1990, frame.height)}%` }}
            >
              {labelLines(l.name, l.v1990, frame, measure).map((line, i) => (
                <span
                  key={line + i}
                  className="line"
                  style={{
                    fontWeight:
                      l.name === highlighted ? 700 : frame.label.fontWeight,
                  }}
                >
                  {line}
                </span>
              ))}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`. */}
        <svg
          // NAMED, and named `group` rather than `img`. Before this the root carried a `<desc>` and
          // nothing else: measured in Chrome through `Accessibility.getFullAXTree`, the node came
          // back as `SvgRoot` with `name: ""` — a description with no name to hang it on, which is
          // why a bare `<desc>` is not reliably announced. `role="group"` gives it a name while
          // leaving every focusable mark below it in the tree, which is what this genre's whole
          // keyboard contract depends on. (`role="img"` was measured too, on this same file: Chrome
          // did NOT prune the marks under it — all ten stayed unignored — so the "it would flatten
          // every descendant" reason two of these components state is not what Chrome does. It is
          // still the ARIA spec's rule for non-focusable children, and `group` avoids the question
          // entirely, which is why it is what the two map beats that already got this right use.)
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          {/* `role="group"`, not `role="img"` — MEASURED, not reasoned. The claim this comment used
              to make ("that role would flatten every descendant into one opaque image, silencing the
              twenty individually-focusable endpoints below") was checked in Chrome through
              `Accessibility.getFullAXTree` against a copy of a delivered artifact with `role="img"`
              added: every mark stayed in the tree, unignored, with its own name. It is still the
              ARIA rule for NON-focusable children, and `group` — the role the two map beats that
              already carried an accessible name use — sidesteps it entirely while doing the one
              thing that was actually missing: giving the graphic a NAME. Without one the root came
              back as `SvgRoot` with `name: ""`, carrying a `<desc>` description with nothing to
              announce it against. `<desc>` still carries the alt text, and now has a name to sit
              under. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {ordered.map((l) => {
            const isAccent = l.name === highlighted;
            const stroke = isAccent ? accent : muted;
            const startDisplaced = Math.abs(l.y1990 - l.labelY1990) > 1;
            const endDisplaced = Math.abs(l.y2024 - l.labelY2024) > 1;
            return (
              <g key={l.name}>
                <line
                  x1={l.x1990}
                  y1={l.y1990}
                  x2={l.x2024}
                  y2={l.y2024}
                  stroke={stroke}
                  strokeWidth={
                    isAccent ? frame.stroke.accent : frame.stroke.muted
                  }
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {/* A short leader only where the de-collision pass actually moved a label away from
                    its own true point, so a nudged label never reads as ambiguous about which point
                    it names. Drawn as a two-segment polyline out to the frame edge, because the
                    label itself now lives outside the `viewBox` entirely. */}
                <polyline
                  points={`${l.x1990},${l.y1990} ${l.x1990},${l.labelY1990} ${l.x1990 - 8},${l.labelY1990}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={startDisplaced ? 1 : 0}
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={`${l.x2024},${l.y2024} ${l.x2024},${l.labelY2024} ${l.x2024 + 8},${l.labelY2024}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={endDisplaced ? 1 : 0}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={l.x1990}
                  cy={l.y1990}
                  r={frame.pointRadius}
                  fill={stroke}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={l.x2024}
                  cy={l.y2024}
                  r={frame.pointRadius}
                  fill={stroke}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          {/* Interaction layer: every one of the twenty endpoints, drawn LAST so nothing sits on top
              of a target. Each is a BAND, not a circle — under `preserveAspectRatio="none"` a
              circle becomes an ellipse whose horizontal radius collapses with the frame, which at
              375px left a 4px-wide target; a band keeps a real target at every width.
              `tabIndex={0}` and `aria-label` are baked in at build time, so every reading is
              reachable with the inline script absent entirely.

              Positioned at the DE-COLLIDED row, not the true point: two countries can sit a couple
              of units apart at their true position (Sweden and Switzerland's 2024 values are
              3.5916543 and 3.5946856 — effectively one point), and this beat's first render caught
              exactly that failure, hovering Germany and being told about Norway. The de-collision
              pass guarantees `minGapCanonical` between neighbouring rows, so bands of half that
              height can never overlap. The visible dot stays at the TRUE position; only the
              reader's target moved, to where the readable label already drew their eye. */}
          {lines.flatMap((l) => [
            <rect
              key={`${l.name}-1990-hit`}
              className="pt"
              x={l.x1990}
              y={l.labelY1990 - halfRow}
              width={frame.width * BAND_SHARE}
              height={minGapCanonical}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${l.name}, ${periodLabels.p1990}: ${fmt(l.v1990)} ${UNIT}`}
              data-detail={`${l.name} · ${periodLabels.p1990} · ${fmt(l.v1990)} ${UNIT}`}
            />,
            <rect
              key={`${l.name}-2024-hit`}
              className="pt"
              x={l.x2024 - frame.width * BAND_SHARE}
              y={l.labelY2024 - halfRow}
              width={frame.width * BAND_SHARE}
              height={minGapCanonical}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${l.name}, ${periodLabels.p2024}: ${fmt(l.v2024)} ${UNIT}`}
              data-detail={`${l.name} · ${periodLabels.p2024} · ${fmt(l.v2024)} ${UNIT}`}
            />,
          ])}
        </svg>

        {/* The period captions, over the two columns they name — plain HTML in the overlay, which
            shares the `<svg>`'s own grid cell, so "1990" stays over the 1990 column at any width.
            Unconditional furniture, never gated behind interaction. */}
        <div className="overlay">
          <span className="period-label" style={{ left: "0%" }}>
            {periodLabels.p1990}
          </span>
          <span className="period-label" style={{ left: "100%" }}>
            {periodLabels.p2024}
          </span>
        </div>

        {/* Right label track — grid column 3. */}
        <div className="r-axis">
          {lines.map((l) => (
            <span
              key={`right-${l.name}`}
              className="slope-label right"
              style={{ top: `${pct(l.labelY2024, frame.height)}%` }}
            >
              {labelLines(l.name, l.v2024, frame, measure).map((line, i) => (
                <span
                  key={line + i}
                  className="line"
                  style={{
                    fontWeight:
                      l.name === highlighted ? 700 : frame.label.fontWeight,
                  }}
                >
                  {line}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
