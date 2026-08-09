/**
 * The web beat of "Switzerland's CO₂ per-capita ranking among ten European economies" — the
 * interactive genre.
 *
 * Not a second chart: the coordinates and the number formatting come from `./bar-geometry.ts`. What
 * this file adds is the one thing a static frame cannot have — a reader who can ask a bar for its
 * PRECISE reading and get it back, on top of the rounded value every bar already prints
 * unconditionally (`references/types/bar-and-column.md`: "every bar carries its own value, printed
 * directly outside the bar"). Read `twin-chart-web/references/web-discipline.md` before changing
 * this file.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour"): each is its
 * own call to this component, SSR'd once at build time by `render-web.mjs` — this story's own
 * runner, which hands both to the `twin-chart-web` skill's generic `renderWeb`.
 *
 * `deriveFurniture`/`measureText` are not called here — `render-web.mjs` derives the furniture and
 * measures every gutter in node, the same division `proof/co2-suisse/EmissionsWeb.tsx` keeps, and
 * passes the results in as props (`measure` below).
 *
 * This beat does NOT reuse the skill's `assets/interaction.mjs` — that script resolves a pointer to
 * the NEAREST of many points along one continuous axis, which fits a 75-reading line and does not
 * fit ten already-large, already-labelled bars (there is nothing to interpolate between; every row
 * is its own direct hit target). `render-web.mjs` still calls the skill's generic `renderWeb` (the
 * one way in — a story imports the skill's machinery, never the reverse) and lets it inline
 * `interaction.mjs` as usual: that script finds no `.pt` circles here and is a harmless no-op
 * (`initChart`'s own `if (points.length === 0) return;`). `render-web.mjs` then appends this beat's
 * own small script, `./bar-interaction.mjs`, as a second inline `<script>`, reusing the same shared
 * `#tooltip` element the skill's HTML wrapper already builds.
 */

import { rankingGeometry, fr, type Row } from "./bar-geometry";

const UNIT = "t";

// `RankingLayout` describes this beat's own two rungs — declared here rather than imported from
// the skill's `WebLayout` (`twin-chart-web/assets/ChartWebSeed.tsx`) for the same reason
// `EmissionsWeb.tsx` gives for its own copy: there is no `#shared/*` vendoring path for a
// compile-time-only type, and a relative import reaching across the skill boundary hard-codes this
// dev repository's own layout. Duplicate, do not link. The shape also genuinely differs — no
// gridline/tick knobs, because a ranking bar chart's own value labels ARE the reading, not an axis.
export type RankingLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  category: { fontSize: number };
  value: { fontSize: number };
  /** One row's own band height (bar + its share of the inter-bar gap). The frame's total height is
   *  DERIVED from this times the row count, plus the header block's real height — never a fixed
   *  constant guessed to be tall enough, the same principle `EmissionsWeb.tsx`'s `plotMinHeight`
   *  states for its own frame. */
  rowHeight: number;
  /** Fraction of `rowHeight` left as the gap between bars — bar-and-column.md: "roughly a fifth to
   *  a third of the band's width". */
  gapRatio: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: RankingLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 26, fontWeight: 700, lead: 34 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  category: { fontSize: 15 },
  value: { fontSize: 15 },
  rowHeight: 42,
  gapRatio: 0.3,
  bottomPad: 30,
};

export const NARROW_LAYOUT: RankingLayout = {
  name: "narrow",
  width: 360,
  pad: 20,
  title: { fontSize: 18, fontWeight: 700, lead: 24 },
  subtitle: { fontSize: 12, fontWeight: 400, lead: 17 },
  source: { fontSize: 12, fontWeight: 400, lead: 16 },
  category: { fontSize: 12 },
  value: { fontSize: 12 },
  rowHeight: 34,
  gapRatio: 0.3,
  bottomPad: 20,
};

/** The two rungs, in render order — handed to the skill's generic `renderWeb`, which never imports
 *  `DESKTOP_LAYOUT`/`NARROW_LAYOUT` by name. */
export const LAYOUTS: RankingLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Wrap on the measured width of the real string, never a character count — the same helper
 *  `EmissionsWeb.tsx` keeps for its own title/subtitle/source, duplicated here for the same reason
 *  its own doc-comment gives (no vendoring path, this is the cheapest thing there is to duplicate). */
function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
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

export function RankingWeb({
  data,
  title,
  subtitle,
  source,
  alt,
  subject,
  ground,
  accent,
  ink,
  muted,
  layout,
  measure,
}: {
  /** Already sorted descending by value — `bar-and-column.md`: "for a ranking, sort by value". This
   *  component draws rows in the order it is handed, it does not re-sort. */
  data: Row[];
  title: string;
  /** The nuance the ranking alone cannot carry: how close the subject sits to its neighbour, and
   *  how far from the group's ceiling — `information-architecture.md`'s Subtitle zone, here stating
   *  what stops "second-lowest" being misread as "the lowest". */
  subtitle: string;
  source: string;
  alt: string;
  /** The one row highlighted in accent — an editorial choice (this story's subject), never the
   *  extreme value (`bar-and-column.md`, "The subject is not the maximum"). */
  subject: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  layout: RankingLayout;
  measure: Measure;
}) {
  if (data.length < 1)
    throw new Error(
      `a ranking beat needs at least one row, got ${data.length}`,
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

  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead * 0.7);
  // The frame's total height is derived, not guessed: header block (fixed above) + one band per
  // row + the bottom margin — see `RankingLayout.rowHeight`'s own doc-comment.
  const plotBottom = plotTop + data.length * layout.rowHeight;
  const height = plotBottom + layout.bottomPad;

  // Printed labels are rounded to one decimal — glanceable, the same precision the co2-suisse
  // beat's own end label uses. Hover/focus reveals the PRECISE reading (`bar-interaction.mjs`,
  // `data-detail` below) — the detail the rounded printed label omits, never the same number
  // repeated (`web-discipline.md`, "What hover reveals").
  const printedLabels = data.map((r) => `${fr(r.value, 1)} ${UNIT}`);
  const preciseLabels = data.map((r) => `${fr(r.value, 4)} ${UNIT}`);

  const padding = {
    top: plotTop,
    right:
      pad +
      10 +
      Math.max(...printedLabels.map((l) => measure(l, layout.value))),
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...data.map((r) => measure(r.name, layout.category))),
  };

  const g = rankingGeometry(data, {
    width,
    height,
    padding,
    rowHeight: layout.rowHeight,
    gapRatio: layout.gapRatio,
  });

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
      {/* No root role="img" — this genre's one deliberate departure from the static genre's
          accessibility pattern (`web-discipline.md`): that role would flatten every child into one
          opaque image, silencing the ten per-row hit targets below. `<desc>` still carries the alt
          text. */}
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

      {/* The shared zero baseline — a plain solid rule, not a dashed reference: it is the axis
          itself (bar-and-column.md's non-negotiable zero start), not a level somebody chose. */}
      <line
        x1={g.plot.left}
        x2={g.plot.left}
        y1={g.plot.top}
        y2={g.plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {g.rows.map((row, i) => {
        const isSubject = row.name === subject;
        const fill = isSubject ? accent : muted;
        return (
          <g key={row.name}>
            <text
              x={g.plot.left - 10}
              y={row.centerY + layout.category.fontSize * 0.35}
              textAnchor="end"
              fill={fill}
              fontSize={layout.category.fontSize}
              fontWeight={isSubject ? 700 : 500}
            >
              {row.name}
            </text>
            <rect
              x={row.x0}
              y={row.top}
              width={Math.max(row.barWidth, 0)}
              height={row.height}
              fill={fill}
            />
            <text
              x={row.x1 + 10}
              y={row.centerY + layout.value.fontSize * 0.35}
              fill={fill}
              fontSize={layout.value.fontSize}
              fontWeight={isSubject ? 700 : 500}
            >
              {printedLabels[i]}
            </text>
            {/* Interaction layer: one direct hit target per row, spanning the full row band from
                margin to margin — not the skill's shared nearest-point `.hit-area`, which resolves
                many points along ONE continuous axis and has nothing to interpolate here (see this
                file's own header doc-comment). `tabIndex={0}` and `aria-label` are baked in at
                build time, so the row's PRECISE reading is reachable by plain Tab with no
                dependency on `bar-interaction.mjs` running at all. */}
            <rect
              className="row-hit"
              x={pad}
              y={g.plot.top + i * layout.rowHeight}
              width={width - pad * 2}
              height={layout.rowHeight}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${row.name}: ${preciseLabels[i]}`}
              data-detail={`${row.name} · ${preciseLabels[i]}`}
            />
          </g>
        );
      })}
    </svg>
  );
}
