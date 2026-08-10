/**
 * The web beat of "Norway ran its grid on 99% renewables; Poland leaned on fossil fuel" — the
 * interactive genre.
 *
 * SECOND BUILD, migrated to the genre's FLUID FRAME (`chart-web/assets/ChartWebSeed.tsx`,
 * `references/web-discipline.md` "Responsive behaviour"). Its first build SSR'd two pre-rendered
 * rungs (900px and 360px) swapped by a media query; the owner overturned that in favour of one
 * continuously-adaptive frame, and `renderWeb` no longer accepts a `layouts` array. The split that
 * makes a continuous fill safe: the `<svg>` below draws GEOMETRY ONLY — not one `<text>` element —
 * and every word (title, caveat, legend, source, axis labels, each band's own share) is plain HTML
 * positioned by `%` over the same grid cell at a FIXED pixel `font-size`. Geometry stretches; type
 * does not.
 *
 * Written for a DIFFERENT mark family from the seed's line: one 100%-stacked column per country
 * (`references/types/stacked-bar.md`). Not imported from the static sibling
 * `proof/static-electricity-mix-source/ElectricityMixStack.tsx`, which bakes its words into SVG
 * `<text>` and reaches for `#shared/chart-beat/render-still.mjs` directly.
 *
 * This is the type the brief calls out by name: a stacked bar's non-bottom segments float on a
 * moving floor, so their own thickness is genuinely hard to read off by eye
 * (`references/types/stacked-bar.md`, "The one thing that goes wrong" — only the bottom band shares
 * a real common baseline). Interaction is exactly what recovers a precise reading for the other two
 * bands: hover, tap or keyboard focus on any of the eighteen segments reveals its exact share to
 * two decimals AND the absolute terawatt-hours behind it, neither of which the frame prints.
 *
 * This beat does NOT reuse the skill's `assets/interaction.mjs` (built for a line's continuous
 * axis) — its own `./stacked-bar-interaction.mjs`, one direct hit target per segment, follows
 * `proof/web-co2-ranking/bar-interaction.mjs`'s own reasoning.
 */

import {
  stackedBarGeometry,
  formatNumber,
  STACK_ORDER,
  type Country,
  type Segment,
} from "./stacked-bar-geometry";

const LEGEND_LABELS = {
  renewables: "Renewables (hydro, wind, solar, bio)",
  nuclear: "Nuclear",
  fossil: "Fossil (gas, oil, coal)",
} as const;

/** A band thinner than this FRACTION of the plot's own height carries no printed share. A fraction,
 *  never a pixel constant: the plot's rendered height changes continuously with its width, so a
 *  20px rule written against one fixed rung is wrong at every other width — the exact class of
 *  defect the two-rung design used to hide. Measured at the narrowest width this beat is driven at
 *  (375px, a 175px-tall plot): 10% of it is 17px, and a 13px label's own line box is ~15px, so a
 *  band at this floor still holds its label without touching the band above. It suppresses exactly
 *  the same segments the beat's first build did — the three zero-nuclear bands, Sweden's 1.21%,
 *  Norway's 1.39%, Switzerland's 1.90% and France's 5.10% — because the next band up is 27.18%,
 *  and every threshold between 6% and 27% picks the same set. Every suppressed segment still
 *  answers exactly on hover, tap and keyboard focus. */
const MIN_LABEL_FRACTION = 0.1;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Declared here, not imported from the skill's seed — a compile-time-only type has no `#shared/*`
 *  vendoring path a story could import it from ("duplicate, do not link"). */
export type WebFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units. NOT a rendered pixel size
   *  and NOT a cap: `preserveAspectRatio="none"` stretches the `<svg>` to whatever box the grid
   *  gives it. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the country names — two staggered rows' worth. See the
   *  `.x-axis` block below for why the names alternate rows rather than sitting on one. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  category: { fontSize: number };
  segmentLabel: { fontSize: number; fontWeight: number };
  legend: { fontSize: number; fontWeight: number };
  /** How much of each country's own column the bar occupies; the remainder is the gap between
   *  columns, half of it reserved at each end so the row sits symmetrically in the frame. */
  barWidthRatio: number;
};

export const FRAME: WebFrame = {
  width: 700,
  height: 400,
  xAxisRowPx: 36,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  category: { fontSize: 12 },
  segmentLabel: { fontSize: 13, fontWeight: 700 },
  legend: { fontSize: 13, fontWeight: 600 },
  barWidthRatio: 0.72,
};

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function StackedBarWeb({
  countries,
  title,
  subtitle,
  source,
  alt,
  ground,
  ink,
  muted,
  grid,
  measure,
  frame,
  colours,
  segmentInk,
}: {
  countries: Country[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  /** One fill per stack band, handed in by the runner from the recorded `PALETTE.md` via
   *  `seriesInks`. These were three module-level hexes here until 2026-08-10, which meant a
   *  newsroom could record its own colours and this chart would go on drawing the same three:
   *  three categories that share no baseline need three fills that read apart, and WHICH three is
   *  the newsroom's answer, not this file's. The argument for a three-way categorical split
   *  survives the move; the answer to it no longer lives here. */
  colours: Record<Segment, string>;
  /** Precomputed WCAG ink-on-fill per segment key, by the runner (`deriveFurniture`'s own
   *  escalation logic, run once against each segment's own fill rather than the page ground —
   *  a component never re-derives a colour rule). */
  segmentInk: Record<Segment, string>;
}) {
  if (countries.length < 2)
    throw new Error(
      `a stacked bar beat needs at least two columns, got ${countries.length}`,
    );

  const tickValues = [0, 20, 40, 60, 80, 100];
  const topValue = Math.max(...tickValues);
  const tickLabels = tickValues.map((v) =>
    v === topValue ? `${v} %` : `${v}`,
  );
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const groupWidth = frame.width / countries.length;
  const barWidth = groupWidth * frame.barWidthRatio;
  const barGap = groupWidth - barWidth;

  const { bars } = stackedBarGeometry(countries, {
    width: frame.width,
    height: frame.height,
    // Half a gap reserved at each end, so the row of columns sits symmetrically inside the frame
    // at every container width rather than hugging one edge.
    padding: { top: 0, right: barGap / 2, bottom: 0, left: barGap / 2 },
    barWidth,
    barGap,
  });

  const y = (value: number) => frame.height - (value / 100) * frame.height;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: colours.renewables,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.segmentLabel.fontSize}px`,
        ["--label-weight" as string]: frame.segmentLabel.fontWeight,
        ["--note-size" as string]: `${frame.category.fontSize}px`,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      {/* The legend, in HTML rather than SVG: three items in a flex row that wraps on its own at
          any width. The first build measured each item's x by hand and wrapped it by hand, which is
          how "Fossil (gas, oil, coal)" once ran clean off the right edge of the narrow frame — the
          browser does that arithmetic for free, correctly, at every width. */}
      <div
        className="chart-legend"
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 20px",
          margin: "12px 0 14px",
          fontSize: `${frame.legend.fontSize}px`,
          fontWeight: frame.legend.fontWeight,
          color: ink,
        }}
      >
        {STACK_ORDER.map((key) => (
          <span
            key={key}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "12px",
                height: "12px",
                flex: "0 0 auto",
                background: colours[key],
              }}
            />
            {LEGEND_LABELS[key]}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${yGutterPx + frame.width} / ${frame.height + frame.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {tickValues.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ top: `${pct(y(value), frame.height)}%`, color: muted }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY — no `<text>`. */}
        <svg
          // Named `group`, not `img` — see the note in `SlopeWeb.tsx`: the root used to come back
          // from Chrome's AX tree as `SvgRoot` with `name: ""`, and `group` names it without
          // raising the ARIA children-presentational question `img` raises.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          {/* `role="group"`, not `role="img"` — see `SlopeWeb.tsx`'s note: the reason recorded here
              was measured and is not what Chrome does, and `group` names the graphic without
              raising the question. `<desc>` still carries the alt text. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {tickValues.map((value) => (
            <line
              key={value}
              x1={0}
              x2={frame.width}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? muted : grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {bars.map((b) =>
            b.segments.map((s) => (
              <rect
                key={`${b.name}-${s.key}`}
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                fill={colours[s.key]}
              />
            )),
          )}

          {/* Interaction layer: one direct hit target per segment, `tabIndex={0}` and `aria-label`
              baked in at build time — reachable with the script absent entirely, including the
              sub-2% slivers no printed share can fit inside. */}
          {bars.map((b) =>
            b.segments.map((s) => (
              <rect
                key={`hit-${b.name}-${s.key}`}
                className="segment-hit"
                x={s.x}
                y={s.y}
                width={s.width}
                height={Math.max(s.height, 4)}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${b.name}, ${s.key}: ${formatNumber(s.value, 2)}% of generation, ${formatNumber(s.twh)} TWh`}
                data-detail={`${b.name} · ${LEGEND_LABELS[s.key]} ${formatNumber(s.value, 2)}% (${formatNumber(s.twh)} TWh)`}
              />
            )),
          )}
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` position lands in the exact
            band it names at any width. `pointer-events: none` (the shared stylesheet's own rule) is
            what keeps every one of those bands hoverable straight through its own label. */}
        <div className="overlay" aria-hidden="true">
          {bars.map((b) =>
            b.segments
              .filter((s) => s.height / frame.height >= MIN_LABEL_FRACTION)
              .map((s) => (
                <span
                  key={`label-${b.name}-${s.key}`}
                  style={{
                    position: "absolute",
                    left: `${pct(s.x + s.width / 2, frame.width)}%`,
                    top: `${pct(s.y + s.height / 2, frame.height)}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${frame.segmentLabel.fontSize}px`,
                    fontWeight: frame.segmentLabel.fontWeight,
                    color: segmentInk[s.key],
                    whiteSpace: "nowrap",
                  }}
                >
                  {Math.round(s.value)}%
                </span>
              )),
          )}
        </div>

        {/* The country names, STAGGERED across two rows. Not decoration and not a preference: at
            375px a column is 48px wide and "Switzerland" measures 62px at this fixed 12px size, so
            on one row it printed straight through "Germany" beside it (seen in the render at 375,
            invisible at every wider width). The three ways out were each measured and rejected —
            wrapping cannot help a single unbreakable word; `hyphens: auto` was PROBED in the engine
            this beat is driven in and did nothing (one 62px line in a 48px box), so a beat relying
            on it would ship broken wherever the hyphenation dictionary is absent; and shrinking the
            type until "Switzerland" fits 48px means a 9px axis at 1600px too. Alternating rows
            doubles every label's own room to two columns (96px at 375) at EVERY width, which is the
            point: a fix that holds at one width and fails at another is the two-rung assumption
            smuggled back in. */}
        <div className="x-axis">
          {bars.map((b, i) => (
            <span
              key={b.name}
              className="axis-label x"
              style={{
                left: `${pct(b.center, frame.width)}%`,
                top: `${6 + (i % 2) * Math.round(frame.category.fontSize * 1.3)}px`,
                // No width: the box is exactly its own text, centred on its bar. A box given a
                // column's worth of room to wrap inside is what pushed the first and last labels
                // past the frame's own edges and gave the DOCUMENT 102px of horizontal scroll at
                // 1600px — measured, and the reason this label is sized by its glyphs alone.
                whiteSpace: "nowrap",
                textAlign: "center",
                lineHeight: 1.15,
                fontSize: `${frame.category.fontSize}px`,
                color: muted,
              }}
            >
              {b.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
