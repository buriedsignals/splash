/**
 * The web beat of "the US is far behind on life expectancy for how rich it is" — a scatter, not a
 * line. Coordinates and number formatting come from `./income-life-geometry.ts`; this file adds the
 * one thing neither a static frame nor a video build has — a reader who can ask any of the ~164
 * dots what it is and get an exact answer back, without anything the static frame already states
 * being gated behind that ask. Read `chart-web/references/web-discipline.md` and
 * `chart-beat/references/types/scatter.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME. This file used to ship two pre-rendered widths (900px and 360px)
 * swapped by a media query. One frame now, filling its container continuously and fitting the
 * visible window, by the separation `chart-web/assets/ChartWebSeed.tsx` teaches: the `<svg>`
 * carries GEOMETRY ONLY (gridlines and the three leader lines — no `<text>` at all), and every word
 * is HTML at a FIXED pixel size, positioned by `%` over the same grid cell. Geometry stretches;
 * type does not.
 *
 * AND SO DO THE DOTS — the one decision this type forced that the line beat did not. A fluid frame
 * stretches its `viewBox` with `preserveAspectRatio="none"`, which turns an SVG `<circle>` into an
 * ELLIPSE at every width where the box's own proportions differ from the geometry's. On a line beat
 * that is invisible (its points are transparent hit targets). Here the cloud of dots IS the
 * argument — `scatter.md`: "the SHAPE of the cloud is the argument, not each member's name" — and a
 * cloud of stretched ellipses is a different picture from a cloud of dots. So every dot is an HTML
 * element positioned by `%` at a FIXED pixel diameter: it lands exactly where the geometry put it,
 * and it stays round at 375px and at 3440px alike. The dot's SIZE is furniture; only its POSITION is
 * geometry, and this genre's whole rule is that those two things scale differently.
 *
 * That also decides the interaction: `scatter-interaction.mjs` resolves a pointer to the nearest dot
 * by real screen distance (see that file), not by x alone the way the skill's own shared script
 * does — which would silently pick the wrong country the moment two points share a similar GDP but
 * differ in life expectancy, exactly the shape of this dataset (Switzerland and the United States
 * sit close in x, far apart in y).
 */

import {
  ENTRANCE_EASING,
  LABEL_FADE_MS,
  WEB_ENTRANCE,
  atProgress,
  endOf,
  entranceLayer,
  markEvent,
} from "../../skills/chart-web/assets/entrance.ts";
import { scaleLinear } from "d3-scale";
// The filter vocabulary. `attrsFor` is the one call this component makes for it: spread on every
// element drawn from a country — the dot, its leader line, its name — so a narrowed region takes
// all three away together rather than leaving a word floating over the cloud.
import { attrsFor } from "../../skills/chart-web/assets/filter.ts";
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
 *  label survives a country name changing case or punctuation in a future data refresh.
 *
 *  Switzerland and the United States sit almost directly above each other on this log x-axis (their
 *  GDP differs by only ~3.5% in log terms) but ~5 life-expectancy years apart, so both labels sit to
 *  the RIGHT of their own dot, staggered up and down. Cuba's GDP is roughly an order of magnitude
 *  lower, so its dot sits well clear of both and its label sits straight above it. The offsets are
 *  in CANONICAL units, not pixels: the leader line is SVG geometry and the label is HTML, and
 *  expressing both in the same units is what keeps a label welded to the end of its own leader at
 *  every width. Tuned by rendering and looking. */
type LabelOffset = {
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
};
type NamedLayout = Record<"CHE" | "USA" | "CUB", LabelOffset>;

/** This genre's single fluid frame, in this beat's own shape — declared here, not imported from the
 *  skill's seed (no `#shared/*` vendoring path exists for a compile-time-only type; duplicate, do
 *  not link). */
export type ScatterFrame = {
  /** The plot rectangle's canonical width/height in SVG user units. NOT a rendered pixel size and
   *  NOT a cap — it fixes the geometry's internal proportions, which become one `aspect-ratio`. */
  width: number;
  height: number;
  /** Fixed CSS pixel rows below the plot: one for the x tick labels, one for the axis title. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  axisTitle: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  /** Dot diameters in CSS PIXELS — fixed, like the type, because a dot is a mark a reader has to be
   *  able to see rather than a length that means something. The unlabelled cloud's dot is small
   *  enough that ~161 of them on a 375px-wide frame still read as a cloud instead of a blob. */
  dotPx: number;
  namedDotPx: number;
  yTickHint: number;
  labelOffsets: NamedLayout;
};

export const FRAME: ScatterFrame = {
  // A taller canonical box than the other beats carry, and deliberately: height follows width in
  // this genre, so a wide window clamps to the viewport anyway (the plot measured 683px at
  // 1600x900 either way) while a narrow one gets exactly what this ratio gives it. At 820x460 a
  // 375px phone drew a 184px plot and 164 dots packed into a blob; this ratio draws ~250px of the
  // same cloud, which is the difference between a shape and a smudge. Measured at three viewports,
  // not reasoned about.
  width: 820,
  height: 640,
  xAxisRowPx: 24,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  axisTitle: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: 600 },
  dotPx: 6,
  namedDotPx: 11,
  yTickHint: 6,
  labelOffsets: {
    CHE: { dx: 14, dy: -14, anchor: "start" },
    USA: { dx: 14, dy: 20, anchor: "start" },
    CUB: { dx: 0, dy: -22, anchor: "middle" },
  },
};

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Wrap on the measured width of the real string, never a character count. Kept and exported the
 *  way every other beat keeps its copy; this component's own header text is flowing HTML the
 *  browser wraps itself, so nothing here calls it. */
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

/** A coordinate as a percentage of the box it was drawn in — what lets an HTML dot or label land
 *  exactly where the geometry put it, and stay there as the browser stretches that box. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

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
  frame,
  measure,
  filterIndex = new Map<string, string[]>(),
  filterOptions = [],
  filterNotes = [],
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
  frame: ScatterFrame;
  measure: Measure;
  /** Derived in the runner from ONE declaration (`regionFilter` in `render-web.mjs`). A beat that
   *  declares none is handed an empty index, no options and no notes, and every expression below
   *  collapses to nothing — no fieldset, no attribute, no sentence. */
  filterIndex?: Map<string, string[]>;
  filterOptions?: { id: string; slug: string; label: string; isAll: boolean }[];
  filterNotes?: { slug: string; text: string }[];
}) {
  if (data.length < 8)
    throw new Error(
      `a scatter needs enough points for a cloud shape to read, got ${data.length}`,
    );

  // Y ticks (life expectancy) from a provisional scale at the canonical range — the same two-pass
  // approach the other beats use: the tick labels have to exist before the gutter they sit in can
  // be measured.
  const yProvisional = scaleLinear()
    .domain(
      (() => {
        const values = data.map((d) => d.lifeExpectancy);
        return [Math.min(...values), Math.max(...values)] as [number, number];
      })(),
    )
    .nice()
    .range([frame.height, 0]);
  const yTicks = yProvisional.ticks(frame.yTickHint);
  const topY = Math.max(...yTicks);
  const yTickLabels = yTicks.map((v) =>
    v === topY ? `${years(v, 0)} yrs` : years(v, 0),
  );

  const yGutterPx =
    10 + Math.max(...yTickLabels.map((l) => measure(l, frame.axis)));

  // The plot rectangle IS the box: gutters are CSS grid tracks around it, never baked into the
  // viewBox.
  const g = scatterGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const xTicks = logTicks(g.xDomain);

  const named = g.points.filter(
    (p): p is (typeof g.points)[number] & { code: "CHE" | "USA" | "CUB" } =>
      p.code === "CHE" || p.code === "USA" || p.code === "CUB",
  );
  if (named.length !== 3)
    throw new Error(
      `expected exactly 3 named points (CHE, USA, CUB), found ${named.length}`,
    );
  const namedCodes = new Set(named.map((p) => p.code));

  const totalWidth = yGutterPx + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  // ── THE ENTRANCE, carried from `proof/vidx-scatter-income-life-expectancy`. I had listed this
  // type as having "no length at all", which is true and is not the obstacle it looked like: the
  // video grows each point's RADIUS from zero on its own overlapping slice of the reveal, cascading
  // in GDP-ASCENDING ORDER — the x axis's own order, so the cloud fills from the left and the
  // reader's eye is walked along the axis the claim is about.
  //
  // THE VIDEO'S OTHER ANSWER, kept exactly: **the subject lands at its natural sorted position, not
  // held back to last for spectacle**. That is the one place this beat does NOT do what the four
  // bar-family beats here do, and it is the video's own sentence. This beat has three named points
  // rather than one subject; their leaders and labels arrive with their own dots, and the
  // conclusion is the three names together, once the cloud is complete.
  //
  // THE MOTION IS `pop`, NOT `grow`, and the reason is measured. These dots are HTML spans (an SVG
  // `<circle>` in a `preserveAspectRatio="none"` viewBox is stretched into an oval — this file's own
  // header says so) and every one already carries `transform: translate(-50%, -50%)` to sit on its
  // coordinate. A keyframe animating `transform` REPLACES that translate, so the whole cloud would
  // fly in from its dots' top-left corners. `pop` animates `scale`, the individual transform
  // property, which composes with the centring instead of clobbering it and whose default origin is
  // the element's own centre — a dot growing from its own middle, which is the radius the video
  // grows.
  const cloud = [...g.points].sort((a, b) => a.gdp - b.gdp);
  const SCATTER_OVERLAP = 1.8;
  const windowFor = (code: string) =>
    markEvent(
      WEB_ENTRANCE.reveal,
      cloud.findIndex((p) => p.code === code),
      cloud.length,
      SCATTER_OVERLAP,
    );
  const dotLayer = (code: string) => {
    const own = windowFor(code);
    return entranceLayer("reveal", "pop", {
      delay: own.start,
      duration: own.duration,
      ease: ENTRANCE_EASING.ARRIVE,
      mark: code,
    });
  };
  const namedLayer = (code: string) =>
    entranceLayer("reveal", "fade", {
      delay: atProgress(windowFor(code), 1),
      duration: LABEL_FADE_MS,
      ease: ENTRANCE_EASING.ARRIVE,
      names: code,
    });
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  // The reference is the y axis's own top gridline — the level "life expectancy" is read against —
  // laid down left to right before the cloud, the same gesture the line beat's dashed rule makes.
  const referenceValue = yTicks[yTicks.length - 1];
  const referenceLayer = entranceLayer("reference", "wipe", {
    delay: WEB_ENTRANCE.reference.start,
    duration: WEB_ENTRANCE.reference.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  // The three named countries are what this beat concludes with — the cloud states the shape, the
  // names state the argument — so their labels are the conclusion and land once every dot is in.
  const conclusionLayer = () =>
    entranceLayer("conclusion", "fade", {
      delay: WEB_ENTRANCE.conclusion.start,
      duration: WEB_ENTRANCE.conclusion.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const lastNamedEnd = Math.max(
    ...named.map((p) => atProgress(windowFor(p.code), 1) + LABEL_FADE_MS),
  );
  if (lastNamedEnd > endOf(WEB_ENTRANCE.reveal) + LABEL_FADE_MS)
    throw new Error(
      `a named point's leader ends at ${lastNamedEnd}ms, after the cloud is complete at ` +
        `${endOf(WEB_ENTRANCE.reveal) + LABEL_FADE_MS}ms`,
    );

  // TWO ELEMENTS PER POINT, and the split is not decoration — it is this genre's rule that **the
  // entrance is an addition to a page that already works**, applied to the one type where the mark
  // and the hit target are the same element. Everywhere else the targets sit outside the animation
  // (a lollipop's `.row-hit`, a line's `.hit-area`); here the `.pt` span carries the reading AND
  // `tabIndex`/`aria-label`/`data-detail`. Scaling it to nothing collapses its border box, so for
  // the ~1.5s of its own arrival a dot answered no pointer, no tap and no key — measured, by
  // `splash/test/interaction-promises-are-kept.test.ts`, which reported **164 marks unreachable**
  // the first time this shipped. So the OUTER span keeps its size, its focus ring and every
  // attribute, and never animates; the inner disc is what pops.
  const dot = (p: (typeof g.points)[number], isNamed: boolean) => (
    <span
      key={p.code}
      className={isNamed ? "pt pt-named" : "pt"}
      style={{
        left: `${pct(p.x, frame.width)}%`,
        top: `${pct(p.y, frame.height)}%`,
        width: isNamed ? frame.namedDotPx : frame.dotPx,
        height: isNamed ? frame.namedDotPx : frame.dotPx,
      }}
      tabIndex={0}
      role="img"
      aria-label={`${p.country}: ${usd(p.gdp)} GDP per capita, ${years(p.lifeExpectancy)} years life expectancy`}
      {...attrsFor(filterIndex, p.code)}
      data-country={p.country}
      data-detail={`${p.country} · ${usd(p.gdp)} · ${years(p.lifeExpectancy)} yrs`}
    >
      <span
        {...dotLayer(p.code).attrs}
        className="pt-disc"
        style={{
          ...dotLayer(p.code).vars,
          background: isNamed ? accent : muted,
        }}
      />
    </span>
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
        ["--axis-title-size" as string]: `${frame.axisTitle.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
      }}
    >
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      {/* The filter, drawn from the declaration the runner handed down — nothing here names a
          region, so this markup disappears entirely for a beat that declares none. */}
      {filterOptions.length > 0 && (
        <fieldset className="chart-filter">
          <legend>Filter by region</legend>
          <div className="options">
            {filterOptions.map((option) => (
              <label key={option.id}>
                <input
                  id={option.id}
                  type="radio"
                  name="chart-filter"
                  value={option.slug}
                  defaultChecked={option.isAll}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* A narrowed view is a partial view and the title states the whole cloud, so every narrowed
          option prints its own count against the total, both numbers off the beat's frozen data. */}
      {filterNotes.map((note) => (
        <p className="filter-note" data-filter-note={note.slug} key={note.slug}>
          {note.text}
        </p>
      ))}

      {/* Both axes stated explicitly — the scatter doctrine's own rule: "a bare number axis on a
          scatter is close to unreadable... unlike a bar chart's shared baseline there is no other
          cue for what a position means." The y title sits ABOVE the plot rectangle and the x title
          BELOW it, in their own rows of the figure's flex column, so neither can occlude a real
          point the way a title in the plot's own corner silently can ("The accessibility trap"). */}
      <p
        className="axis-title y-axis-title"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        Life expectancy at birth (years)
      </p>

      <div
        className="chart-plot scatter-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div
          className="y-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {yTicks.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ top: `${pct(g.y(value), frame.height)}%`, color: muted }}
            >
              {yTickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`, and no dots either: they are HTML, see this file's
            own doc-comment. What is left here is what genuinely must stretch with the frame — the
            gridlines, and the three leader lines that connect a named dot to its own label. */}
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
          {/* Deliberately no root role="img" — the per-point elements need to stay individually
              reachable and individually named. `<desc>` still carries the alt text. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {/* Gridlines are FURNITURE and come up on one clock with the labels beside them — except
              the topmost, which is this beat's REFERENCE (the level life expectancy is read
              against) and is laid down alone, before the cloud. */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
            {yTicks
              .filter((value) => value !== referenceValue)
              .map((value) => (
                <line
                  key={`y-${value}`}
                  x1={0}
                  x2={frame.width}
                  y1={g.y(value)}
                  y2={g.y(value)}
                  stroke={grid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
          </g>
          <line
            {...referenceLayer.attrs}
            style={referenceLayer.vars}
            x1={0}
            x2={frame.width}
            y1={g.y(referenceValue)}
            y2={g.y(referenceValue)}
            stroke={grid}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {/* One vertical gridline per decade — a log axis's own "round number". */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
          {xTicks.map((value) => (
            <line
              key={`x-${value}`}
              x1={g.x(value)}
              x2={g.x(value)}
              y1={0}
              y2={frame.height}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          </g>

          {named.map((p) => {
            const off = frame.labelOffsets[p.code];
            return (
              <line
                key={`leader-${p.code}`}
                {...namedLayer(p.code).attrs}
                style={namedLayer(p.code).vars}
                {...attrsFor(filterIndex, p.code)}
                x1={p.x}
                y1={p.y}
                x2={p.x + off.dx}
                y2={p.y + off.dy}
                stroke={accent}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* The shared hit area: `scatter-interaction.mjs` resolves a pointer or a tap anywhere
              over the plot to the nearest dot by real screen distance, so a phone reader never has
              to land a tap on a 6px dot. */}
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

        {/* The dots and the three named labels — HTML over the same grid cell the geometry is drawn
            in. `pointer-events` stay off (inherited from `.overlay`) so every pointer reaches the
            hit area beneath and the nearest-dot resolution answers; keyboard focus reaches each dot
            directly, because each one is a real focusable element carrying its own `aria-label`. */}
        <div className="overlay">
          {g.points
            .filter((p) => !namedCodes.has(p.code as "CHE" | "USA" | "CUB"))
            .map((p) => dot(p, false))}
          {named.map((p) => dot(p, true))}
          {named.map((p) => {
            const off = frame.labelOffsets[p.code];
            return (
              <span
                key={`label-${p.code}`}
                {...conclusionLayer().attrs}
                {...attrsFor(filterIndex, p.code)}
                className={`point-label anchor-${off.anchor}`}
                style={{
                  ...conclusionLayer().vars,
                  left: `${pct(p.x + off.dx, frame.width)}%`,
                  top: `${pct(p.y + off.dy, frame.height)}%`,
                }}
              >
                {p.country}
              </span>
            );
          })}
        </div>

        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {xTicks.map((value) => (
            <span
              key={value}
              className="axis-label x"
              style={{ left: `${pct(g.x(value), frame.width)}%`, color: muted }}
            >
              {usdTickLabel(value)}
            </span>
          ))}
        </div>
      </div>

      <p
        className="axis-title x-axis-title"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        GDP per capita, log scale ({GDP_UNIT})
      </p>

      <p
        className="chart-source"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        {source}
      </p>
    </figure>
  );
}
