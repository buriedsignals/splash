/**
 * The web beat of "Germany cut per-capita CO₂ emissions further than any other Western European
 * country's since 1990" — the interactive genre, a slopegraph over ten countries and two discrete
 * periods (1990, 2024).
 *
 * Not a second chart: the coordinates come from `./slope-geometry.ts` (`slopeGeometry`, `fmt`), the
 * pure core this file and its own `render-web.mjs` share. What this file adds is the one thing a
 * static frame cannot have — every one of the twenty endpoints (ten countries × two periods)
 * answers hover, tap or keyboard focus with its exact country, period and value, none of it printed
 * twice by default. Read `twin-chart-web/references/web-discipline.md` before changing this file.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour"): each is its
 * own call to this component, SSR'd once at build time by the `twin-chart-web` skill's generic
 * `renderWeb` — the HTML wrapper switches between the two pre-rendered SVGs with a CSS media query.
 *
 * `WebLayout` is declared fresh here, not imported from `EmissionsWeb.tsx` or the skill's own seed —
 * "duplicate, do not link", the same ruling `EmissionsWeb.tsx`'s own copy already documents. This
 * beat's `WebLayout` carries its own extra fields (`label`, `period`, `gap`, `labelGutterMaxWidth`,
 * `pointRadius`, `stroke`) that a continuous-time-series beat never needed — a slope chart's own
 * mechanics (two fixed columns, direct end labels needing de-collision) are not the CO₂ beat's.
 *
 * `deriveFurniture`/`measureText` are not called here — they live in
 * `twin-chart-beat/scripts/render-still.mjs`, and `render-web.mjs`'s generic `renderWeb` derives
 * them once and threads them in as props (`ink`/`muted`/`grid`/`measure`), exactly as
 * `EmissionsWeb.tsx` documents for itself.
 */

import { slopeGeometry, fmt, type Country } from "./slope-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

// `WebLayout` describes this genre's own mechanics, adapted for a slope chart's own shape — see
// this file's own header note on why it is not `EmissionsWeb.tsx`'s copy.
export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  /** The "1990" / "2024" captions above each column — without them the chart states direction with
   *  no stated "from when to when," half the claim (`references/types/slope.md`). */
  period: { fontSize: number; fontWeight: number };
  /** The direct end label — one line at the desktop width, wrapped onto as many lines as its own
   *  widest piece needs at the narrow width (`labelGutterMaxWidth` below is the wrap width, not a
   *  truncation limit: this genre's own doctrine says wrap or shrink, never truncate). */
  label: { fontSize: number; fontWeight: number; lead: number };
  /** Air between the plot's own column and where a label's text starts. */
  gap: number;
  /** The width a label is wrapped against. At the desktop width this is generous enough that no
   *  real label in this beat's own ten countries needs a second line; at the narrow width it is
   *  deliberately tight, which is what forces "United Kingdom" onto two lines and drives the
   *  measured gutter — see this file's own `SlopeWeb` doc-comment on the narrow-width decision. */
  labelGutterMaxWidth: number;
  /** Visible mark radius (drawn in the line's own colour) and invisible interactive overlay radius
   *  (the tap/hover/focus target — larger, because unlike the CO₂ beat's 75 densely-packed points
   *  along one curve, this beat has only twenty, isolated, discrete targets with no shared
   *  nearest-point hit-area to help a touch reader land near one; see `slope-interaction.mjs`). */
  pointRadius: number;
  hitRadius: number;
  stroke: { accent: number; muted: number };
  /** The plot's own floor for usable height, independent of how many lines the header wraps to —
   *  same derivation rule `EmissionsWeb.tsx` keeps: never a fixed guess that could clip. */
  plotMinHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 13, fontWeight: 400, lead: 18 },
  period: { fontSize: 14, fontWeight: 700 },
  label: { fontSize: 13, fontWeight: 600, lead: 17 },
  gap: 12,
  // Generous on purpose: at 900px wide, even "United Kingdom 10.49 t" (the widest label this beat
  // ever draws) measures well under this, so every label renders on one line — the wrap machinery
  // below is exercised for real only at the narrow width, not skipped at this one.
  labelGutterMaxWidth: 220,
  pointRadius: 3.5,
  hitRadius: 8,
  stroke: { accent: 3, muted: 1.5 },
  plotMinHeight: 460,
  bottomPad: 40,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 16,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  subtitle: { fontSize: 11, fontWeight: 400, lead: 15 },
  source: { fontSize: 11, fontWeight: 400, lead: 14 },
  period: { fontSize: 12, fontWeight: 700 },
  label: { fontSize: 11, fontWeight: 600, lead: 14 },
  gap: 6,
  // NARROW-WIDTH DECISION (documented inline per this beat's own brief): 360px minus two outer
  // margins minus two label gutters leaves very little for the plot itself once ten labels are
  // involved. 64px is tight enough that every ordinary single-word name ("Sweden", "Germany") wraps
  // onto its own line above the value, and "United Kingdom" — the widest label this beat draws —
  // wraps onto two lines of its own on top of that, rather than being shrunk further or truncated.
  // "Switzerland" alone (11 letters, no internal space to break on) still measures wider than this
  // cap; the gutter is sized to whatever the real strings measure (see `SlopeWeb`'s own
  // `labelBlockWidth`), not clamped to this number, so that single un-splittable name simply widens
  // its own gutter rather than being cut — the gutter is sized to the label, never the label to the
  // gutter, per `references/types/slope.md`'s own "Interm." warning.
  labelGutterMaxWidth: 64,
  pointRadius: 3,
  hitRadius: 7,
  stroke: { accent: 2.5, muted: 1.25 },
  // Ten categories' worth of two-to-three-line label blocks, de-collided, need real vertical room —
  // this is the beat this genre's own doctrine calls "genuinely tight" at the narrow width, and the
  // number below is set generous, then verified (not guessed and left unchecked) by driving a real
  // browser at ~375px and confirming nothing clips.
  plotMinHeight: 850,
  bottomPad: 28,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  // Splits on the literal ASCII space only, never the general `\s` class — `labelLines` below
  // glues a value to its unit with a U+00A0 NO-BREAK SPACE precisely so this split point does not
  // see it as a break, and a wrapped label can never strand a bare "t" on its own line the way a
  // plain-space join did on the first render of this beat's narrow layout (caught by looking at the
  // actual wrapped output, not by reading the markup — the same discipline this genre's own gotcha
  // note names).
  for (const word of text.split(/ +/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** The one direct end label: country name and value together, e.g. "United Kingdom" / "10.49 t" —
 *  wrapped as ordinary prose against `layout.labelGutterMaxWidth`, so a short label ("Spain 4.60 t")
 *  naturally stays on one line while a long one wraps, with no separate code path for either case.
 *  The value and its unit are joined with a NO-BREAK SPACE (` `), not a plain one, so the wrap
 *  pass above can split a long label between the country name and its value, but never between the
 *  value and "t" — see `wrap`'s own comment for the failure this fixed. */
function labelLines(
  country: Country,
  value: number,
  layout: WebLayout,
  measure: Measure,
): string[] {
  const text = `${country.name} ${fmt(value)} ${UNIT}`;
  return wrap(text, layout.labelGutterMaxWidth, layout.label, measure);
}

const UNIT = "t";

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
  layout,
  measure,
}: {
  data: Country[];
  title: string;
  /** The caveat under the title — unit, scope, and the "every one fell" fact the direct labels
   *  alone cannot state on their own. See `information-architecture.md`'s "Subtitle" zone, the same
   *  zone the co2-suisse beat's own `limits` prop fills. */
  limits: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  /** The one line this beat accents — Germany, per `BRIEF.md`. At most one hue total
   *  (`references/types/slope.md`): the United Kingdom, the claim's own comparison, stays plain
   *  muted like the other eight, per `BRIEF.md`'s own permitted fallback — "let the end labels carry
   *  the comparison" rather than introduce a second visual tier this doctrine does not call for. */
  highlighted: string;
  periodLabels: { p1990: string; p2024: string };
  layout: WebLayout;
  measure: Measure;
}) {
  if (data.length < 2)
    throw new Error(
      "a slope beat needs at least two categories, got " + data.length,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const limitsLines = wrap(limits, width - pad * 2, layout.subtitle, measure);
  const limitsBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);
  const periodBaseline =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);

  // Every label this layout will ever draw, wrapped once, up front — this is what both the shared
  // gutter width AND the shared label-block height (the de-collision `minGap`) are measured from.
  // One shared gutter for both columns (not a separate left/right measurement), the same choice
  // `static-renewables-shift`'s own proven slope beat makes for its single frame.
  const allLabelLines = data.flatMap((d) => [
    labelLines(d, d.v1990, layout, measure),
    labelLines(d, d.v2024, layout, measure),
  ]);
  const gutterWidth = Math.max(
    ...allLabelLines.flatMap((lines) =>
      lines.map((line) => measure(line, layout.label)),
    ),
  );
  const maxLabelLineCount = Math.max(...allLabelLines.map((l) => l.length));
  // The de-collision minimum gap is sized to the TALLEST label block this layout will actually draw
  // (three lines, at the narrow width, because "United Kingdom" wraps to two and the value adds a
  // third) plus a small buffer — every shorter block still gets at least this much room, which is
  // generous rather than exact, and never collides.
  const minLabelGap = maxLabelLineCount * layout.label.lead + 6;
  // The interaction layer's own hit circles are placed at the de-collided label row, not the true
  // point (see the interaction layer's own comment for why) — which only works if two adjacent hit
  // circles in the same column can never touch. `decollide` guarantees `minLabelGap` between
  // neighbours; this fails loud, at build time, if a future layout tuning ever violates that,
  // rather than silently reintroducing the "hover Germany, see Norway" bug this beat's own first
  // render caught.
  if (minLabelGap < layout.hitRadius * 2)
    throw new Error(
      `minLabelGap (${minLabelGap}) must be >= 2x hitRadius (${layout.hitRadius * 2}) or de-collided hit circles can overlap`,
    );

  const padding = {
    left: pad + gutterWidth + layout.gap,
    right: pad + gutterWidth + layout.gap,
  };
  const plotTop = periodBaseline + Math.round(layout.period.fontSize * 1.4);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const plot = {
    left: padding.left,
    right: width - padding.right,
    top: plotTop,
    bottom: plotBottom,
  };

  const { lines } = slopeGeometry(data, {
    x1990: plot.left,
    x2024: plot.right,
    top: plot.top,
    bottom: plot.bottom,
    minGap: minLabelGap,
  });

  // `decollide` pushes label rows apart with no knowledge of the plot's own [top, bottom] — it
  // only enforces relative spacing between neighbours, not absolute bounds. This beat's real data
  // has its two closest values sitting right at the range's own floor (Sweden/Switzerland, both
  // ~3.59 t in 2024), which is exactly the shape that can push a de-collided row (and the
  // interaction layer's hit circle now living at that row — see the interaction layer's own
  // comment) past the SVG's own bottom edge, clipped and unreachable, a defect a static PNG review
  // would never show and only driving a real browser at 375px caught the first time this beat was
  // rendered. `valueDomain`'s own generous padding is the fix; this is the fail-loud tripwire that
  // catches it again if a future data change (a closer tie, one more category) ever outruns that
  // padding, rather than silently shipping a clipped, unreachable point.
  const labelExtent = lines.flatMap((l) => [l.labelY1990, l.labelY2024]);
  const halfBlock = (maxLabelLineCount * layout.label.lead) / 2;
  const minReached = Math.min(...labelExtent) - halfBlock;
  const maxReached = Math.max(...labelExtent) + halfBlock;
  if (minReached < plot.top - 1 || maxReached > plot.bottom + 1)
    throw new Error(
      `[${layout.name}] a label/hit-target lands outside the plot (reached ${minReached.toFixed(1)}..${maxReached.toFixed(1)}, plot is ${plot.top}..${plot.bottom}) — widen valueDomain's padFraction or grow plotMinHeight`,
    );

  // Germany drawn last so its accent line and dots are never visually crossed by a muted neighbour
  // — the one line this chart wants the eye to land on stays on top.
  const ordered = [
    ...lines.filter((l) => l.name !== highlighted),
    ...lines.filter((l) => l.name === highlighted),
  ];

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
      {/* No root role="img" (unlike the static genre): that role would flatten every descendant
          into one opaque image, silencing the twenty individually-focusable, individually-labelled
          endpoints below. `<desc>` still carries the alt text — the same departure
          `EmissionsWeb.tsx` documents (`web-discipline.md`, "One deliberate departure"). */}
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
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={limitsBaseline + i * layout.subtitle.lead}
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

      {/* Each period needs its own caption — a slope chart with unlabelled ends states direction
          with no stated "from when to when," half the claim (`references/types/slope.md`).
          Unconditional, in ink: this is essential furniture, never gated behind interaction. */}
      <text
        x={plot.left}
        y={periodBaseline}
        fill={ink}
        fontSize={layout.period.fontSize}
        fontWeight={layout.period.fontWeight}
        textAnchor="middle"
      >
        {periodLabels.p1990}
      </text>
      <text
        x={plot.right}
        y={periodBaseline}
        fill={ink}
        fontSize={layout.period.fontSize}
        fontWeight={layout.period.fontWeight}
        textAnchor="middle"
      >
        {periodLabels.p2024}
      </text>

      {ordered.map((l) => {
        const isAccent = l.name === highlighted;
        const stroke = isAccent ? accent : muted;
        const strokeWidth = isAccent
          ? layout.stroke.accent
          : layout.stroke.muted;
        const startLines = labelLines(
          { name: l.name, v1990: l.v1990, v2024: l.v2024 },
          l.v1990,
          layout,
          measure,
        );
        const endLines = labelLines(
          { name: l.name, v1990: l.v1990, v2024: l.v2024 },
          l.v2024,
          layout,
          measure,
        );
        const startBaselines = centeredBaselines(
          l.labelY1990,
          startLines.length,
          layout.label.lead,
        );
        const endBaselines = centeredBaselines(
          l.labelY2024,
          endLines.length,
          layout.label.lead,
        );
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
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <circle
              cx={l.x1990}
              cy={l.y1990}
              r={layout.pointRadius}
              fill={stroke}
            />
            <circle
              cx={l.x2024}
              cy={l.y2024}
              r={layout.pointRadius}
              fill={stroke}
            />

            {/* A short dashed leader only where the de-collision pass actually moved a label away
                from its own true point — the same convention `static-renewables-shift`'s own slope
                beat draws, so a nudged label never reads as ambiguous about which point it names. */}
            <line
              x1={l.x1990 - layout.gap / 2}
              y1={l.y1990}
              x2={l.x1990 - layout.gap / 2}
              y2={l.labelY1990}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={startDisplaced ? 1 : 0}
            />
            <line
              x1={l.x2024 + layout.gap / 2}
              y1={l.y2024}
              x2={l.x2024 + layout.gap / 2}
              y2={l.labelY2024}
              stroke={stroke}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={endDisplaced ? 1 : 0}
            />

            {/* Value labels stay in page ink, never the line's own accent, even on Germany's own
                line — the exact WCAG contrast trap `references/types/slope.md` names for this chart
                type ("The accessibility trap"). Weight, not colour, marks the accented line. */}
            {startLines.map((line, i) => (
              <text
                key={line + i}
                x={l.x1990 - layout.gap}
                y={startBaselines[i]}
                fill={ink}
                fontSize={layout.label.fontSize}
                fontWeight={isAccent ? 700 : layout.label.fontWeight}
                textAnchor="end"
              >
                {line}
              </text>
            ))}
            {endLines.map((line, i) => (
              <text
                key={line + i}
                x={l.x2024 + layout.gap}
                y={endBaselines[i]}
                fill={ink}
                fontSize={layout.label.fontSize}
                fontWeight={isAccent ? 700 : layout.label.fontWeight}
                textAnchor="start"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Interaction layer: every one of the twenty endpoints, not just Germany's — invisible at
          rest, `tabIndex={0}` and its own `aria-label`/`data-detail` baked in at build time (so a
          keyboard/screen-reader user reaches every reading with the inline script absent entirely —
          `web-discipline.md`, "Keyboard and touch"). Drawn last so nothing else on the frame can sit
          on top of a target and block it. Wired by this beat's OWN `slope-interaction.mjs`, not the
          skill's shared `assets/interaction.mjs` — see this beat's own `render-web.mjs` for why: a
          nearest-point-by-x hit area cannot discriminate between ten points that all share one
          column's fixed x.

          Positioned at the DE-COLLIDED label row (`labelY*`), not the true data point (`y*`): two
          countries can sit only a few pixels apart at their true position (Sweden/Switzerland's
          2024 values are 3.5916543 vs 3.5946856 — effectively the same point), and this beat's own
          first render caught exactly the failure that leaves unfixed — hovering Germany's own 2024
          dot showed Norway's detail, because their true points sit ~4px apart and the hit circles
          (`hitRadius`) fully overlapped there. The de-collision pass already guarantees every label
          row in one column clears at least `minLabelGap` from its neighbour, and `minLabelGap` is
          always sized well above `hitRadius * 2` (see `SlopeWeb`'s own gutter/gap maths), so hit
          circles placed at that same row can never overlap. The visible dot two lines above stays
          at the TRUE position regardless — only the reader's actual click/hover target moved,
          exactly where the readable label already drew their eye. */}
      {lines.flatMap((l) => [
        <circle
          key={`${l.name}-1990`}
          className="pt"
          cx={l.x1990}
          cy={l.labelY1990}
          r={layout.hitRadius}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          tabIndex={0}
          role="img"
          aria-label={`${l.name}, ${periodLabels.p1990}: ${fmt(l.v1990)} ${UNIT}`}
          data-detail={`${l.name} · ${periodLabels.p1990} · ${fmt(l.v1990)} ${UNIT}`}
        />,
        <circle
          key={`${l.name}-2024`}
          className="pt"
          cx={l.x2024}
          cy={l.labelY2024}
          r={layout.hitRadius}
          fill="transparent"
          stroke="none"
          pointerEvents="all"
          tabIndex={0}
          role="img"
          aria-label={`${l.name}, ${periodLabels.p2024}: ${fmt(l.v2024)} ${UNIT}`}
          data-detail={`${l.name} · ${periodLabels.p2024} · ${fmt(l.v2024)} ${UNIT}`}
        />,
      ])}
    </svg>
  );
}

/** Vertical centring for a text block of `count` stacked lines around `centerY`, first baseline to
 *  last — SVG `y` is a baseline, not a box centre, so the first baseline sits half the block's
 *  height above `centerY`, nudged down by a fixed cap-height fraction of one line, same approach
 *  `EmissionsWeb.tsx`'s own single-line labels use implicitly (there `+ 4`/`+ 5` on one line only;
 *  here generalised to N lines because the narrow layout stacks up to three). */
function centeredBaselines(
  centerY: number,
  count: number,
  lineHeight: number,
): number[] {
  const totalHeight = count * lineHeight;
  const first = centerY - totalHeight / 2 + lineHeight * 0.78;
  return Array.from({ length: count }, (_, i) => first + i * lineHeight);
}
