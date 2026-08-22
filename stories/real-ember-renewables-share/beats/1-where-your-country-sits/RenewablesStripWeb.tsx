/**
 * THIS BEAT'S OWN COMPOSITION — a dot strip in the WEB format.
 *
 * The split `chart-web` teaches, applied here: the `<svg>` carries GEOMETRY ONLY (the ground, the
 * value gridlines, the world's rule, the median's rule, the shared hit area) and not one `<text>`;
 * every word is plain HTML positioned by `%` over the same grid cell, at a FIXED pixel size that
 * never tracks the `viewBox`.
 *
 * THE DOTS ARE HTML, NOT `<circle>`, and that is not a preference. The frame stretches with
 * `preserveAspectRatio="none"`, so an SVG circle inside it is an ellipse at every width but the
 * canonical one, and the flex clamp that keeps the beat inside the window changes that aspect
 * again on a short screen. An absolutely-positioned `<span>` with a fixed pixel size and
 * `border-radius: 50%` is round at every width, which for 211 marks of one shape is the whole
 * legibility of the picture. The same reasoning the income-and-life-expectancy scatter records.
 *
 * `WebFrame` is declared here rather than imported: it is a compile-time-only type in the skill,
 * with no vendoring path a story could reach, so a story carries its own matching copy — the
 * "duplicate, do not link" ruling this project applies wherever there is nothing to import from.
 *
 * This component never imports the rasteriser. `ink` / `muted` / `grid` / `measure` / `fontFamily`
 * are props, derived once in node by the runner beside this file. No hex is named here, and no
 * typeface either.
 */
import { stripGeometry, xTickValues, pct, type Reading } from "./strip-geometry.ts";

export type WebFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units. Not a pixel cap. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the value-axis labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  filter: { fontSize: number };
  /** The dot's own diameter, in FIXED CSS pixels — see this file's own header for why it is not an
   *  SVG radius. */
  dotPx: number;
  /** How tall the jitter band is, as a fraction of the plot. */
  bandFraction: number;
};

export const FRAME: WebFrame = {
  width: 820,
  height: 300,
  xAxisRowPx: 28,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 14, fontWeight: 600 },
  note: { fontSize: 12 },
  filter: { fontSize: 13 },
  dotPx: 9,
  bandFraction: 0.58,
};

type Measure = (text: string, font: { fontSize: number; fontWeight?: number }) => number;

/** A percentage of the canonical box, for positioning an HTML element over the stretched `<svg>`. */
function over(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

export function RenewablesStripWeb({
  data,
  title,
  caveats,
  source,
  alt,
  worldShare,
  worldLabel,
  medianShare,
  medianLabel,
  floorLabel,
  ceilingLabel,
  searchLabel,
  searchPlaceholder,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  frame,
  fontFamily,
}: {
  data: Reading[];
  title: string;
  /** One or more caveat paragraphs, all drawn unconditionally above the plot. */
  caveats: string[];
  source: string;
  alt: string;
  worldShare: number;
  worldLabel: string;
  medianShare: number;
  medianLabel: string;
  floorLabel: string;
  ceilingLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  fontFamily?: string;
}) {
  if (data.length < 30)
    throw new Error(
      `a dot strip's whole claim is the shape of a population; ${data.length} readings is a ranking, not a distribution`,
    );

  const { dots, x } = stripGeometry(data, {
    width: frame.width,
    height: frame.height,
    bandFraction: frame.bandFraction,
  });
  const ticks = xTickValues();
  const tickLabels = ticks.map((t) => `${t}%`);

  // The value axis runs edge to edge, so the outermost labels are anchored at the frame's own edges
  // rather than centred on their tick — a centred "0%" would hang half of itself outside the plot.
  // Nothing is reserved for them: the y-gutter is zero, because a dot strip has no y scale to
  // label, and the plot uses the whole width it is given.
  const Y_GUTTER_PX = 0;
  const totalWidth = Y_GUTTER_PX + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  const bandTop = (frame.height * (1 - frame.bandFraction)) / 2;
  const bandBottom = frame.height - bandTop;

  // The two rules sit within four percentage points of each other, so their labels are stacked
  // rather than placed side by side: the world's above the band, the median's below it. Measured
  // here rather than eyeballed, so a re-pointed beat cannot silently overlap them.
  //
  // The two labels are measured at the axis font's own fixed size and compared against the gap the
  // geometry actually leaves between the rules, converted into the same canonical units. Stacking
  // absorbs a horizontal overlap; what it cannot absorb is the two rules landing on each other, so
  // that is what is refused, with both numbers in the message.
  const gapPx = Math.abs(x(worldShare) - x(medianShare));
  const widest = Math.max(measure(worldLabel, frame.note), measure(medianLabel, frame.note));
  if (gapPx < 1)
    throw new Error(
      `the world's rule (${pct(worldShare)}) and the median country's (${pct(medianShare)}) are ` +
        `${gapPx.toFixed(2)} canonical units apart, so one would be drawn under the other. The two ` +
        `labels need ${widest.toFixed(0)}px between them at the note size and they are stacked to ` +
        "get it; two rules in one place cannot be stacked apart.",
    );

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
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        ["--filter-size" as string]: `${frame.filter.fontSize}px`,
        ["--dot-size" as string]: `${frame.dotPx}px`,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        {caveats.map((line) => (
          <p className="chart-caveat" key={line.slice(0, 40)}>
            {line}
          </p>
        ))}
      </div>

      {/* THE SEARCH. Not a filter: it hides nothing, narrows nothing, and the frame above states
          everything the title claims with it untouched. It moves focus to one country and holds it
          lit, which is the reading a strip of 211 unlabelled marks cannot give any other way.
          `hidden` at build time and revealed by the interaction script, so a reader with scripting
          off is never shown a control that would do nothing. */}
      <div className="chart-find" hidden>
        <label htmlFor="find-country">{searchLabel}</label>
        <input
          id="find-country"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={searchPlaceholder}
          list="country-names"
        />
        <datalist id="country-names">
          {data.map((d) => (
            <option key={d.code} value={d.country} />
          ))}
        </datalist>
        <p className="find-answer" role="status" aria-live="polite" />
      </div>

      <div
        className="chart-plot strip-plot"
        style={{
          ["--y-gutter" as string]: `${Y_GUTTER_PX}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div className="y-axis" />

        {/* GEOMETRY ONLY. No `<text>`, no circles — see this file's own header. */}
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily={fontFamily}
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={frame.width} height={frame.height} fill={ground} />

          {ticks.map((value) => (
            <line
              key={value}
              x1={x(value)}
              y1={0}
              x2={x(value)}
              y2={frame.height}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The median country's rule — furniture, drawn thin, because it is the comparison the
              world figure is read AGAINST, not the claim itself. */}
          <line
            x1={x(medianShare)}
            y1={bandTop}
            x2={x(medianShare)}
            y2={bandBottom}
            stroke={muted}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* The world's own rule — the one number the article gives, drawn full height so a reader
              can drop a plumb line from it through the whole population. */}
          <line
            x1={x(worldShare)}
            y1={0}
            x2={x(worldShare)}
            y2={frame.height}
            stroke={ink}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          {/* The shared hit area: the interaction script resolves a pointer or a tap anywhere over
              the plot to the nearest dot by real screen distance, so a phone reader is never asked
              to land a tap on a 9px mark. */}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* The dots and the words that annotate them, HTML over the same grid cell. `.overlay`
            carries `pointer-events: none`, inherited by every dot, so a pointer always reaches the
            hit area beneath and the nearest-dot resolution answers; keyboard focus reaches each dot
            directly, because each one is a real focusable element with its own accessible name. */}
        <div className="overlay">
          {dots.map((d) => (
            <span
              key={d.code}
              className="pt"
              style={{ left: over(d.x, frame.width), top: over(d.y, frame.height) }}
              tabIndex={0}
              role="img"
              aria-label={`${d.country}: ${pct(d.share)} of electricity from renewables`}
              data-country={d.country}
              data-detail={`${d.country} · ${pct(d.share)}`}
            />
          ))}

          {/* The two rules' labels and the two extreme counts all sit in the CLEAR MARGINS the
              jitter band leaves inside the plot — above it and below it — never outside the plot
              box. Measured on a 375px-wide phone, where the whole plot is 131px tall: a label
              placed outside the band's own margin lands in the axis row beneath the plot, where the
              pointer never reaches it and the reader reads it as belonging to the axis. */}
          <span
            className="note rule-label world"
            style={{ left: over(x(worldShare), frame.width), top: over(bandTop, frame.height) }}
          >
            {worldLabel}
          </span>
          <span
            className="note rule-label median"
            style={{ left: over(x(medianShare), frame.width), top: over(bandBottom, frame.height) }}
          >
            {medianLabel}
          </span>
          {/* The two counts name the marks at the very ends of the axis, so they are pinned to the
              plot's own edges in the TOP margin — never over the band. Drawn under the band once,
              their ground-coloured chips covered the exact dots they were counting. */}
          <span className="end-label at-floor" style={{ top: over(bandTop, frame.height) }}>
            {floorLabel}
          </span>
          <span className="end-label at-ceiling" style={{ top: over(bandTop, frame.height) }}>
            {ceilingLabel}
          </span>
        </div>

        <div className="x-axis">
          {ticks.map((value, i) => (
            <span
              key={value}
              className={`axis-label x${i === 0 ? " first" : ""}${i === ticks.length - 1 ? " last" : ""}`}
              style={{ left: over(x(value), frame.width), color: muted }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
