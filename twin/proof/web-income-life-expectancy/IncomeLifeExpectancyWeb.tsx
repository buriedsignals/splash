/**
 * The web beat of "the US is far behind on life expectancy for how rich it is" — a scatter, not a
 * line. Coordinates and number formatting come from `./income-life-geometry.ts`; this file adds the
 * one thing neither a static frame nor a video build has — a reader who can ask any of the ~164
 * dots what it is and get an exact answer back, without anything the static frame already states
 * being gated behind that ask. Read `twin-chart-web/references/web-discipline.md` and
 * `twin-chart-beat/references/types/scatter.md` before changing this file.
 *
 * The biggest structural difference from `proof/co2-suisse/EmissionsWeb.tsx` (a line beat): there,
 * every `.pt` circle is invisible until hovered (`fill="transparent"`) because the LINE is the
 * default-visible argument and the dots only exist for the interaction layer. Here there is no
 * line — the cloud of dots IS the default-visible argument (`scatter.md`: "the SHAPE of the cloud
 * is the argument, not each member's name") — so every `.pt` circle is drawn with a real fill from
 * the start, and hover/focus adds a stroke ring rather than swapping a transparent fill for a muted
 * one. See `render-web.mjs`'s own doc-comment for why that also means this beat overrides the
 * inlined interaction script and part of the CSS the skill's generic `renderWeb` ships.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour"), the same
 * pattern the CO₂ beat and the seed both keep — each is its own call to this component, SSR'd once
 * at build time.
 */

import { scaleLinear } from "d3-scale";
import {
  logTicks,
  scatterGeometry,
  usd,
  usdTickLabel,
  years,
  type CountryRow,
} from "./income-life-geometry";

const GDP_UNIT = "US$";

/** The three points this beat names, and where their label sits relative to their own dot — a
 *  hand-tuned editorial call, not something a script can derive (the scatter doctrine: "pick label
 *  anchors that sit outside the point and outside every other label's box"). Keyed by ISO code so a
 *  label survives a country name changing case/punctuation in a future data refresh.
 *
 *  Switzerland and the United States sit almost directly above/below each other on this log x-axis
 *  (their GDP differs by only ~3.5% in log terms) but ~5 life-expectancy years apart — comfortably
 *  separated vertically in pixel space — so both labels sit to the RIGHT of their own dot, staggered
 *  up/down. Cuba's GDP is roughly an order of magnitude lower, so its dot sits well clear of both,
 *  and its label sits straight above it. Tuned by rendering and looking — see `render-web.mjs`'s own
 *  verification notes for what was actually checked. */
type LabelOffset = {
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
};
type NamedLayout = Record<"CHE" | "USA" | "CUB", LabelOffset>;

export type ScatterLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  axisTitle: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  /** The unlabelled cloud's own dot radius. Smaller at narrow width than desktop — with ~161
   *  unlabelled dots on a 360px-wide frame, the full desktop radius overlaps neighbours into
   *  unreadable blobs; the narrow layout trades a slightly harder-to-see individual dot for a cloud
   *  shape that still reads, which is the one thing this chart type is FOR (`scatter.md`: "the SHAPE
   *  of the cloud is the argument"). The shared `.hit-area` nearest-point resolution (see
   *  `render-web.mjs`) means the smaller radius costs nothing for interaction — every dot is still
   *  reachable at its exact position, only its default *visibility* shrinks. */
  pointRadius: number;
  namedPointRadius: number;
  yTickHint: number;
  plotMinHeight: number;
  bottomPad: number;
  labelOffsets: NamedLayout;
};

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: (
    text: string,
    font: { fontSize: number; fontWeight?: number },
  ) => number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export const DESKTOP_LAYOUT: ScatterLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 25, fontWeight: 700, lead: 32 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  axis: { fontSize: 13 },
  axisTitle: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: 600 },
  pointRadius: 3,
  namedPointRadius: 5.5,
  yTickHint: 6,
  plotMinHeight: 380,
  bottomPad: 70,
  labelOffsets: {
    CHE: { dx: 12, dy: -9, anchor: "start" },
    USA: { dx: 12, dy: 18, anchor: "start" },
    CUB: { dx: 0, dy: -14, anchor: "middle" },
  },
};

export const NARROW_LAYOUT: ScatterLayout = {
  name: "narrow",
  width: 360,
  pad: 18,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  subtitle: { fontSize: 12, fontWeight: 400, lead: 16 },
  source: { fontSize: 11, fontWeight: 400, lead: 15 },
  axis: { fontSize: 10 },
  axisTitle: { fontSize: 10 },
  label: { fontSize: 12, fontWeight: 600 },
  // Lighter/smaller at narrow width — see the type's own doc-comment on `pointRadius`.
  pointRadius: 2,
  namedPointRadius: 4,
  yTickHint: 4,
  plotMinHeight: 300,
  bottomPad: 54,
  labelOffsets: {
    CHE: { dx: 8, dy: -7, anchor: "start" },
    USA: { dx: 8, dy: 14, anchor: "start" },
    CUB: { dx: 0, dy: -11, anchor: "middle" },
  },
};

export const LAYOUTS: ScatterLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export function IncomeLifeExpectancyWeb({
  data,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  grid,
  layout,
  measure,
}: {
  /** Every valid row EXCEPT Central African Republic's 2022 reading — excluded upstream, in
   *  `render-web.mjs`'s CSV reader, per `BRIEF.md`'s data-quality flag. This component draws
   *  whatever it is handed and does not know the exclusion happened. */
  data: CountryRow[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  layout: ScatterLayout;
  measure: Measure;
}) {
  if (data.length < 8)
    throw new Error(
      `a scatter needs enough points for a cloud shape to read, got ${data.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const subtitleLines = wrap(
    subtitle,
    width - pad * 2,
    layout.subtitle,
    measure,
  );
  const subtitleBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    subtitleBaseline +
    (subtitleLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);

  // The y-axis title gets its own row, entirely inside the header block — i.e. entirely ABOVE
  // `plotTop` — so it can never occlude a real point the way a label sitting inside the plot's own
  // corner could (`scatter.md`, "The accessibility trap": "an axis label or title sitting in the
  // plot's own corner can silently occlude a real point").
  const yAxisTitleBaseline =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.subtitle.lead * 0.9);
  const plotTop =
    yAxisTitleBaseline + Math.round(layout.axisTitle.fontSize * 1.5);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  // Y ticks (life expectancy): a provisional scale at the final plot range, exactly the two-pass
  // approach `EmissionsWeb.tsx`/`ChartWebSeed.tsx` both use for their own reference lines — here
  // there is no single reference to protect, just the ordinary need to know tick positions before
  // the left gutter (measured from those same tick labels) can be sized.
  const yProvisional = scaleLinear()
    .domain(
      (() => {
        const values = data.map((d) => d.lifeExpectancy);
        return [Math.min(...values), Math.max(...values)] as [number, number];
      })(),
    )
    .nice()
    .range([plotBottom, plotTop]);
  const yTicks = yProvisional.ticks(layout.yTickHint);
  const topY = Math.max(...yTicks);
  const yTickLabels = yTicks.map((v) =>
    v === topY ? `${years(v, 0)} yrs` : years(v, 0),
  );

  const xDomainProvisional = (() => {
    const gdps = data.map((d) => d.gdp);
    const lo = 10 ** Math.floor(Math.log10(Math.min(...gdps)));
    const hi = 10 ** Math.ceil(Math.log10(Math.max(...gdps)));
    return [lo, hi] as [number, number];
  })();
  const xTicks = logTicks(xDomainProvisional);
  const xTickLabels = xTicks.map(usdTickLabel);

  const padding = {
    top: plotTop,
    right: pad,
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...yTickLabels.map((l) => measure(l, layout.axis))),
  };

  const g = scatterGeometry(data, { width, height, padding });

  const named = g.points.filter(
    (p): p is (typeof g.points)[number] & { code: "CHE" | "USA" | "CUB" } =>
      p.code === "CHE" || p.code === "USA" || p.code === "CUB",
  );
  if (named.length !== 3)
    throw new Error(
      `expected exactly 3 named points (CHE, USA, CUB), found ${named.length}`,
    );
  const namedCodes = new Set(named.map((p) => p.code));

  const xAxisTitleBaseline =
    g.plot.bottom + 24 + Math.round(layout.axisTitle.fontSize * 1.7);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* Deliberately no root role="img" — same departure `web-discipline.md` documents for the
          line beat: the per-point circles below need to stay individually reachable and named. */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={subtitleBaseline + i * layout.subtitle.lead}
          fill={muted}
          fontSize={layout.subtitle.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      {/* Both axes stated explicitly — the scatter doctrine's own rule: "a bare number axis on a
          scatter is close to unreadable... unlike a bar chart's shared baseline there is no other
          cue for what a position means." Both titles sit OUTSIDE the plot rectangle (this one above
          it, the x one below it) so neither can occlude a point — see the comment on `plotTop`. */}
      <text
        x={pad}
        y={yAxisTitleBaseline}
        fill={muted}
        fontSize={layout.axisTitle.fontSize}
      >
        Life expectancy at birth (years)
      </text>
      <text
        x={(g.plot.left + g.plot.right) / 2}
        y={xAxisTitleBaseline}
        fill={muted}
        fontSize={layout.axisTitle.fontSize}
        textAnchor="middle"
      >
        GDP per capita, log scale ({GDP_UNIT})
      </text>

      {/* Horizontal gridlines, one per y tick. */}
      {yTicks.map((value, i) => (
        <g key={`y-${value}`}>
          <line
            x1={g.plot.left}
            x2={g.plot.right}
            y1={g.y(value)}
            y2={g.y(value)}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={g.plot.left - 10}
            y={g.y(value) + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {yTickLabels[i]}
          </text>
        </g>
      ))}
      {/* Vertical gridlines, one per decade — a log axis's own "round number", stated on every
          tick (not just the topmost, unlike the y axis) because the doctrine's own worked example
          names all three: "$1k" / "$10k" / "$100k". */}
      {xTicks.map((value, i) => (
        <g key={`x-${value}`}>
          <line
            x1={g.x(value)}
            x2={g.x(value)}
            y1={g.plot.top}
            y2={g.plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={g.x(value)}
            y={g.plot.bottom + 22}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="middle"
          >
            {xTickLabels[i]}
          </text>
        </g>
      ))}

      {/* The cloud: every unlabelled point first, so the three named/accented points draw on top
          of it and are never hidden under an unlabelled neighbour that happens to share a pixel. */}
      {g.points
        .filter((p) => !namedCodes.has(p.code as "CHE" | "USA" | "CUB"))
        .map((p) => (
          <circle
            key={p.code}
            className="pt"
            cx={p.x}
            cy={p.y}
            r={layout.pointRadius}
            fill={muted}
            tabIndex={0}
            role="img"
            aria-label={`${p.country}: ${usd(p.gdp)} GDP per capita, ${years(p.lifeExpectancy)} years life expectancy`}
            data-country={p.country}
            data-detail={`${p.country} · ${usd(p.gdp)} · ${years(p.lifeExpectancy)} yrs`}
            data-x={p.x}
            data-y={p.y}
          />
        ))}

      {/* The three named points: labelled, in the accent colour, with a short leader line to a
          label that sits outside the dot and in page ink — never tinted to match the dot, the
          scatter doctrine's own WCAG contrast trap ("Point labels are text sitting on or near a
          coloured dot... don't [colour it to match]. Keep every label in the page's ink colour and
          let the dot... carry the hue"). */}
      {named.map((p) => {
        const off = layout.labelOffsets[p.code];
        const labelX =
          p.x +
          off.dx +
          (off.anchor === "start" ? 4 : off.anchor === "end" ? -4 : 0);
        const labelY = p.y + off.dy;
        return (
          <g key={p.code}>
            <line
              x1={p.x}
              y1={p.y}
              x2={p.x + off.dx}
              y2={p.y + off.dy}
              stroke={accent}
              strokeWidth={1}
            />
            <circle
              className="pt pt-named"
              cx={p.x}
              cy={p.y}
              r={layout.namedPointRadius}
              fill={accent}
              stroke={ground}
              strokeWidth={1.5}
              tabIndex={0}
              role="img"
              aria-label={`${p.country}: ${usd(p.gdp)} GDP per capita, ${years(p.lifeExpectancy)} years life expectancy`}
              data-country={p.country}
              data-detail={`${p.country} · ${usd(p.gdp)} · ${years(p.lifeExpectancy)} yrs`}
              data-x={p.x}
              data-y={p.y}
            />
            <text
              x={labelX}
              y={labelY}
              fill={ink}
              fontSize={layout.label.fontSize}
              fontWeight={layout.label.fontWeight}
              textAnchor={off.anchor}
            >
              {p.country}
            </text>
          </g>
        );
      })}

      {/* Shared hit area: `scatter-interaction.mjs` resolves a pointer or a tap anywhere over the
          plot to the nearest of the ~164 points by actual 2D distance (not by x alone — see that
          script's own doc-comment for why the line-beat genre's `nearestIndex` does not generalise
          to a cloud). */}
      <rect
        className="hit-area"
        x={g.plot.left}
        y={g.plot.top}
        width={g.plot.right - g.plot.left}
        height={g.plot.bottom - g.plot.top}
        fill="transparent"
        pointerEvents="all"
      />
    </svg>
  );
}
