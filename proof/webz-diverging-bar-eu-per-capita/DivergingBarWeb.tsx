/**
 * The WEB beat of "Croatia is the only EU country emitting more CO₂ per person than in 1990" — one
 * self-contained, fluid, interactive frame. Coordinates and formatting come from
 * `./diverging-geometry.ts`. Read `chart-web/references/web-discipline.md` and
 * `chart-beat/references/types/diverging-bar.md` before changing this file.
 *
 * THE GOVERNING RULE, and every decision below follows from it: **the `<svg>` carries GEOMETRY
 * ONLY — not one `<text>` element.** Every word (title, caveat, source, the 27 country names, the
 * 27 value labels, the value-axis ticks, the zero label, the average rule's own label, the
 * subject's annotation) is plain HTML positioned in `%` over or beside the same grid cell the
 * `<svg>` occupies, at a FIXED pixel font size that never tracks the `viewBox`. Geometry stretches;
 * type does not.
 *
 * FOUR COLUMNS, NOT TWO — this beat's own departure from the seed's grid, and it is the fluid
 * frame's version of the static sibling's two measured gutters. A diverging bar prints its value
 * label just outside its bar's growing END, which is on the LEFT for a fall and on the RIGHT for a
 * rise. Both extremes overflow the plot:
 *
 *   - the longest fall (Luxembourg, −20.48) ends at ~2% of the plot, so its label runs off the
 *     LEFT edge — straight into the country names, which is exactly the collision the video sibling
 *     shipped as "Luxembo—20.48";
 *   - the only rise (+0.03) starts at the zero line, which this domain puts at ~98% of the plot,
 *     so its label runs off the RIGHT edge.
 *
 * So the plot sits between two fixed-pixel gutter tracks measured in node from the widest label
 * that will actually be drawn in each (`--l-gutter`, `--r-gutter`), with the names in a third
 * (`--y-gutter`) OUTSIDE the left one. Same mechanism as the seed's `--y-gutter`, mirrored — a
 * fixed column of reserved room, so a fixed-size label can never reach the names or the frame's own
 * edge at any container width.
 *
 * A FOURTH GRID ROW, for the same reason. The average rule's own label has to sit at the rule's own
 * `%` position and above the first row (inside the plot it would land ON a row), so the plot grid
 * reserves a fixed pixel row for it rather than letting it overflow upward into the source line.
 *
 * THE ROW-HEIGHT FLOOR. Height follows width through `aspect-ratio`, which is right for a line
 * chart and wrong for twenty-seven stacked rows: at 375px the frame's natural plot is ~250px and 27
 * rows inside it are 7px apart. `.chart-plot` carries an inline `min-height` of
 * `rows × MIN_ROW_PX` plus the two fixed rows — this beat's own version of the genre's
 * `PLOT_FLOOR_PX`. It is set as high as the WINDOW FIT allows and no higher: the beat must still
 * fit 100dvh at 375 × 812, which is the rule that wins. See `BRIEF.md` for the measurement.
 *
 * WHAT HOVER HONESTLY ADDS (read before adding more to it). The static sibling prints every row's
 * CHANGE beside its bar, so a tooltip repeating "−20.48" would be `web-discipline.md`'s named
 * anti-pattern — the same number repeated on demand. What the static frame genuinely had to omit is
 * the pair of readings the change is made OF: it has no room for 54 more numbers. So hover, tap and
 * keyboard focus reveal exactly that — this row's 1990 reading and its 2024 reading, unrounded, and
 * its change to four decimals — and nothing more dramatic.
 *
 * INTERACTION SHAPE — deliberately NOT this skill's `assets/interaction.mjs` (a line's
 * nearest-by-x mechanic over one shared hit area). This beat's 27 rows tile the plot's full height
 * exactly, so there is no "nearest" to resolve: the pointer is always inside exactly one row's own
 * rect. `./diverging-interaction.mjs` wires each rect directly.
 *
 * NUMBER LOCALE. This beat's words are English and its `<html lang>` is patched to `en`
 * (`render-web.mjs`'s `patchForThisBeat`), so its figures are English too — a decimal POINT. The
 * one formatter is named `en` and formats with `Intl.NumberFormat("en-US")`; see
 * `diverging-geometry.ts`.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls it.
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
import {
  divergingGeometry,
  en,
  exact,
  exactChange,
  type Row,
} from "./diverging-geometry";

/** How much of its own row's height a bar occupies. */
const BAR_FILL = 0.62;
/** The bar's own maximum thickness, in canonical user units — a 27-row plot stretched tall should
 *  not turn into 27 slabs. */
const BAR_MAX = 16;
/**
 * The row-height floor in CSS pixels — see this file's own doc-comment. Measured against the
 * category font at 375 × 812, where the WINDOW FIT is the binding constraint, not legibility: 27
 * rows at 13px plus the two fixed rows plus the header and the source line is what fits in an
 * 812px window, and one pixel more does not.
 */
const MIN_ROW_PX = 13;
/** The fixed pixel row reserved above the plot for the average rule's own label. */
const NOTE_ROW_PX = 24;
/**
 * A regular gridline landing within this many canonical user units of the average rule is DROPPED,
 * with its tick label. Decided ONCE at the canonical width, never re-derived as the frame stretches
 * — and the drop is right at EVERY width, because the two lines scale together: the −5 gridline
 * sits 2 user units from the rule at −4.93, which is 0.4px apart at 375 and 4px apart at 1600. It
 * would read as one smeared line at both, printing a tick a reader cannot locate. The rule's own
 * label already states −4.93 at that position, so nothing is lost.
 */
const MIN_GRIDLINE_GAP = 24;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebFrame` lives here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file's own doc-comment states: a compile-time-only type
 *  with no vendoring path a story could reach outside this dev repository. The fields are THIS
 *  type's own shape (a category axis of rows, one signed value axis), not the line seed's. */
export type WebFrame = {
  /** The plot rectangle's canonical width/height in SVG user units — proportions and tick-density
   *  decisions only, NEVER a rendered pixel cap: the `<svg>` is stretched
   *  (`preserveAspectRatio="none"`) to fill whatever box the grid gives it. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot, for the value-axis tick labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  caveat: { fontSize: number };
  source: { fontSize: number };
  axis: { fontSize: number };
  /** The country names, in the first grid track. */
  category: { fontSize: number; fontWeight: number };
  /** The subject's own name, set bold — one of this beat's three signals for a 1.3px bar. */
  categorySubject: { fontSize: number; fontWeight: number };
  /** The signed change printed just outside each bar's growing end. */
  value: { fontSize: number; fontWeight: number };
  /** The average rule's label and the subject's annotation. */
  note: { fontSize: number; fontWeight: number };
  /** How many value-axis ticks the geometry asks for. Decided ONCE, at the canonical width. */
  valueTickHint: number;
};

export const FRAME: WebFrame = {
  width: 820,
  height: 620,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  caveat: { fontSize: 14 },
  source: { fontSize: 13 },
  axis: { fontSize: 12 },
  category: { fontSize: 13, fontWeight: 400 },
  categorySubject: { fontSize: 13, fontWeight: 700 },
  value: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 12, fontWeight: 600 },
  valueTickHint: 6,
};

/** `value / total` as a percentage, one decimal — the one arithmetic step that puts an HTML label
 *  on the exact spot the SVG geometry it annotates was drawn at, expressed as a fraction of the
 *  SAME box, so it tracks the `<svg>`'s continuous stretch for free. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/**
 * The subject row's own background: the ground moved `ratio` of the way toward the accent.
 *
 * Composited to ONE opaque colour rather than drawn as a translucent overlay, for the reason the
 * static sibling found by looking at its first render: the labels on that row carry a halo (here, a
 * CSS chip) in the colour behind them, and a GROUND-coloured chip against a TINTED band punches
 * ragged holes through it. One colour, used for both, matches by construction. No hex is named —
 * this is derived from the two colours the beat was handed.
 */
export function blend(ground: string, toward: string, ratio: number): string {
  const channels = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const target = channels(toward);
  return `#${channels(ground)
    .map((v, i) =>
      Math.round(v + (target[i] - v) * ratio)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function DivergingBarWeb({
  rows,
  title,
  caveat,
  source,
  alt,
  ground,
  accent,
  subject,
  subjectNote,
  averageFall,
  averageFallLabel,
  fromYear,
  toYear,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  /** Already sorted by change, descending, by the caller — this component draws the order it is
   *  given rather than re-sorting, so the ranking is a decision made once, at the data layer. */
  rows: Row[];
  title: string;
  caveat: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The country the claim is about, named by the claim rather than picked by size. */
  subject: string;
  subjectNote: string;
  /** The mean of the falls, tonnes per person — where the dashed rule stands. Computed by the
   *  caller from the frozen data, never typed. */
  averageFall: number;
  averageFallLabel: string;
  fromYear: number;
  toYear: number;
  /** Derived from `ground` by whatever node runner calls this component (`renderWeb`) — never
   *  derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (rows.length < 3)
    throw new Error(
      `a diverging bar beat needs at least three rows, got ${rows.length}`,
    );
  // The domain has to genuinely straddle zero or this is a plain bar chart with a decorative
  // complication — the type sheet says exactly that, so this refuses rather than drawing a centred
  // baseline nothing ever crosses.
  const straddles =
    rows.some((r) => r.change > 0) && rows.some((r) => r.change < 0);
  if (!straddles)
    throw new Error(
      "every value has the same sign — a diverging bar drawn on a domain that never crosses zero " +
        "is a plain bar chart with a decorative complication, and the type sheet says so",
    );
  if (!rows.some((r) => r.country === subject))
    throw new Error(
      `subject ${JSON.stringify(subject)} is not one of the rows drawn`,
    );

  // The three fixed tracks, MEASURED from the real strings that will sit in them at their own fixed
  // font size — never a guessed constant. Each label is positioned at its own bar's END, and the
  // worst case is a bar whose end sits at the plot's own edge, so each gutter has to hold a whole
  // label plus its offset with no help from the bar's own length.
  const yGutterPx =
    10 +
    Math.max(
      ...rows.map((r) =>
        Math.max(
          measure(r.country, frame.category),
          measure(r.country, frame.categorySubject),
        ),
      ),
    );
  const falls = rows.filter((r) => r.change < 0);
  const rises = rows.filter((r) => r.change >= 0);
  const lGutterPx =
    12 + Math.max(...falls.map((r) => measure(en(r.change), frame.value)));
  const rGutterPx =
    12 + Math.max(...rises.map((r) => measure(en(r.change), frame.value)));

  const g = divergingGeometry(rows, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    tickHint: frame.valueTickHint,
  });
  const averageX = g.at(averageFall);
  const ticks = g.ticks.filter(
    (t) => Math.abs(t.x - averageX) >= MIN_GRIDLINE_GAP,
  );
  const barHeight = Math.min(BAR_MAX, g.rowHeight * BAR_FILL);
  const subjectBand = blend(ground, accent, 0.12);

  const totalWidth = yGutterPx + lGutterPx + frame.width + rGutterPx;
  const totalHeight = NOTE_ROW_PX + frame.height + frame.xAxisRowPx;

  // ── THE ENTRANCE. The five events of `chart-web/assets/entrance.ts`, with the bar family's own
  // per-mark reveal: every bar grows out of the zero line to ITS OWN value.
  //
  // WHY A CLIP CANNOT DO THIS ONE AT ALL, even more plainly than on a ranking. These bars diverge:
  // twenty-six grow LEFT out of the zero line and one grows RIGHT. A left-to-right wipe would
  // uncover the longest fall's far end FIRST and the zero line LAST — it would build every bar
  // backwards, from the value toward the reference the value is measured from. Growing each mark
  // from its own baseline is the only reveal this type has, which is why the motion exists.
  //
  //   - THE REFERENCE is the zero line, and on this type it is the whole argument: "more or less
  //     than 1990" is a sign. It is laid down, alone, before any bar.
  //   - THE ORDER is the rows' own, which is sorted from the largest rise to the largest fall.
  //   - THE SUBJECT IS CROATIA, and it is taken out of the cascade. It is row 0 — the single rise —
  //     so in row order it would arrive FIRST, before the twenty-six falls it is the exception to.
  //     Its own row stays empty while they arrive, and it lands last, which is the claim.
  //   - THE AVERAGE OF THE FALLS is a summary OF the falls, so it may not precede them. It arrives
  //     at the end of the reveal, with its own label, on the same reasoning as the label rule.
  //   - THE CONCLUSION is Croatia's own printed change, once its bar has landed.
  const subjectRow = g.points.find((p) => p.country === subject)!;
  const cascade = g.points.filter((p) => p.country !== subject);
  const windowFor = (country: string) =>
    country === subject
      ? WEB_ENTRANCE.subject
      : markEvent(
          WEB_ENTRANCE.reveal,
          cascade.findIndex((p) => p.country === country),
          cascade.length,
        );
  const eventFor = (country: string) =>
    country === subject ? ("subject" as const) : ("reveal" as const);
  const barLayer = (country: string) => {
    const own = windowFor(country);
    return entranceLayer(eventFor(country), "grow", {
      delay: own.start,
      duration: own.duration,
      ease: ENTRANCE_EASING.ARRIVE,
      // The baseline is the ZERO LINE for every row, on both sides of it — the one point a
      // diverging bar may not move while it grows.
      grow: { axis: "x", origin: { x: g.zeroX, y: 0 }, key: country },
    });
  };
  const valueLabelLayer = (country: string) =>
    country === subject
      ? entranceLayer("conclusion", "fade", {
          delay: WEB_ENTRANCE.conclusion.start,
          duration: WEB_ENTRANCE.conclusion.duration,
          ease: ENTRANCE_EASING.ARRIVE,
          names: country,
        })
      : entranceLayer("reveal", "fade", {
          delay: atProgress(windowFor(country), 1),
          duration: LABEL_FADE_MS,
          ease: ENTRANCE_EASING.ARRIVE,
          names: country,
        });
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const zeroLineLayer = entranceLayer("reference", "grow", {
    delay: WEB_ENTRANCE.reference.start,
    duration: WEB_ENTRANCE.reference.duration,
    ease: ENTRANCE_EASING.ARRIVE,
    // No key: the zero line is what the bars are MEASURED AGAINST, not one of the readings.
    grow: { axis: "y", origin: { x: g.zeroX, y: g.plot.top } },
  });
  /** The falls' own average, and its label — after the last fall, never before. */
  const averageLayer = () =>
    entranceLayer("reveal", "fade", {
      delay: endOf(WEB_ENTRANCE.reveal),
      duration: LABEL_FADE_MS,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const subjectNoteLayer = entranceLayer("conclusion", "fade", {
    delay: WEB_ENTRANCE.conclusion.start,
    duration: WEB_ENTRANCE.conclusion.duration,
    ease: ENTRANCE_EASING.ARRIVE,
    names: subject,
  });
  const lastCascadeEnd = Math.max(
    ...cascade.map((p) => atProgress(windowFor(p.country), 1) + LABEL_FADE_MS),
    endOf(WEB_ENTRANCE.reveal) + LABEL_FADE_MS,
  );
  if (lastCascadeEnd > endOf(WEB_ENTRANCE.subject))
    throw new Error(
      `the last cascading row's value label ends at ${lastCascadeEnd}ms, after the subject lands at ` +
        `${endOf(WEB_ENTRANCE.subject)}ms — a fall would still be arriving while the one rise the ` +
        `takeaway is about is already there`,
    );

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--subject-band" as string]: subjectBand,
        // Fixed CSS pixel type sizes, threaded as custom properties so the genre's shared stylesheet
        // stays generic while this beat still tunes its own scale. None of these ever changes with
        // the viewBox's width — that is the whole point of the genre's redesign.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.caveat.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.value.fontSize}px`,
        ["--label-weight" as string]: frame.value.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        ["--note-weight" as string]: frame.note.fontWeight,
        ["--cat-size" as string]: `${frame.category.fontSize}px`,
        ["--cat-weight" as string]: frame.category.fontWeight,
        ["--cat-subject-weight" as string]: frame.categorySubject.fontWeight,
      }}
    >
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{caveat}</p>
      </div>

      <div
        className="chart-plot diverging"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--l-gutter" as string]: `${lGutterPx}px`,
          ["--r-gutter" as string]: `${rGutterPx}px`,
          ["--note-row-h" as string]: `${NOTE_ROW_PX}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          minHeight: `${rows.length * MIN_ROW_PX + NOTE_ROW_PX + frame.xAxisRowPx}px`,
        }}
      >
        {/* The average rule's own label, in its own reserved row so it can sit at the rule's `%`
            without landing on a data row or overflowing into the source line above. It is
            argument-bearing furniture: drawn unconditionally, never behind an interaction. */}
        <div className="note-row">
          <span
            {...averageLayer().attrs}
            className="note average-label"
            style={{
              ...averageLayer().vars,
              left: `${pct(averageX, frame.width)}%`,
            }}
          >
            {averageFallLabel}
          </span>
        </div>

        <div
          className="y-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {g.points.map((p) => (
            <span
              key={p.country}
              className={
                p.country === subject
                  ? "axis-label y cat subject"
                  : "axis-label y cat"
              }
              style={{ top: `${pct(p.rowY, frame.height)}%` }}
            >
              {p.country}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`. `preserveAspectRatio="none"` lets this stretch to fill
            exactly whatever box the grid gives it at any container width. Every mark here is a
            rectangle or an axis-parallel line, so the non-uniform stretch says nothing false: a
            bar's LENGTH is read against the axis, which stretches with it, and there is no round
            mark whose shape carries meaning (`web-discipline.md`, "What preserveAspectRatio='none'
            costs"). */}
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

          {/* The subject's own band, behind its row — the first of three motionless signals that
              stand in for a bar 1.3px long. */}
          <rect
            x={0}
            y={g.points.find((p) => p.country === subject)!.bandTop}
            width={frame.width}
            height={g.rowHeight}
            fill={subjectBand}
          />

          {/* Gridlines are FURNITURE and come up on ONE clock with the labels beside them. */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
            {ticks.map((tick) => (
              <line
                key={tick.value}
                x1={tick.x}
                x2={tick.x}
                y1={g.plot.top}
                y2={g.plot.bottom}
                stroke={grid}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>

          {/* The bars. Two fills, one per sign — accent for the rise the headline is about, the
              furniture's own muted for the falls. On this type colour encodes the SIGN, which is
              the one place the type's requirement outranks this corpus's habit of holding the
              accent back for the subject; here it costs nothing, because the subject IS the only
              row on the positive side. */}
          {g.points.map((p) => {
            const layer = barLayer(p.country);
            return (
              <rect
                key={p.country}
                {...layer.attrs}
                style={layer.vars}
                x={Math.min(g.zeroX, p.xValue)}
                y={p.rowY - barHeight / 2}
                width={Math.abs(p.xValue - g.zeroX)}
                height={barHeight}
                fill={p.change >= 0 ? accent : muted}
              />
            );
          })}

          {/* The reference: the zero line, drawn ON TOP of the bars so no fill can cover it — the
              type sheet's own requirement, and the reason it is not painted before them. */}
          <line
            {...zeroLineLayer.attrs}
            style={zeroLineLayer.vars}
            x1={g.zeroX}
            x2={g.zeroX}
            y1={g.plot.top}
            y2={g.plot.bottom}
            stroke={ink}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          {/* Where the 26 falls average out. Dashed, in ink, drawn full height. Its label lives in
              the note row above. */}
          <line
            {...averageLayer().attrs}
            className="average-rule"
            style={averageLayer().vars}
            x1={averageX}
            x2={averageX}
            y1={g.plot.top}
            y2={g.plot.bottom}
            stroke={ink}
            strokeWidth={1.5}
            strokeDasharray="8 5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Interaction layer — one hit rect PER ROW, spanning the full plot width and that row's
              own band height, invisible at rest. Rows tile exactly, so a pointer anywhere in the
              plot is inside exactly one of them. `tabIndex`, `aria-label` and `data-detail` are
              baked in server-side, so the no-JS frame is still keyboard-reachable row by row with
              `./diverging-interaction.mjs` absent entirely. That script only ever touches a
              `.row-hit`'s own class and the shared `#tooltip`. */}
          {g.points.map((p) => (
            <rect
              key={p.country}
              className="row-hit"
              x={0}
              y={p.bandTop}
              width={frame.width}
              height={p.bandHeight}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${p.country}: ${exact(p.from)} tonnes per person in ${fromYear}, ${exact(p.to)} in ${toYear}, change ${exactChange(p.change)}`}
              data-country={p.country}
              data-detail={`${p.country} · ${fromYear}: ${exact(p.from)} · ${toYear}: ${exact(p.to)} · change ${exactChange(p.change)} t per person`}
            />
          ))}
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` position lands on the exact
            bar end it annotates at any width. `aria-hidden`: every value here is already carried,
            at full precision, by its own row's `aria-label` above. Never toggled by the script: the
            printed value is the argument, already stated (`web-discipline.md`, "What must not
            become interactive"). */}
        <div className="overlay" aria-hidden="true">
          {/* The subject's direct annotation, printed into the empty half of its own row: with this
              domain's maximum at +0.03, the whole span from the plot's left edge to the zero line is
              unused on this one row and on no other. */}
          <span
            {...subjectNoteLayer.attrs}
            className="note subject-note on-band"
            style={{
              ...subjectNoteLayer.vars,
              left: `${pct(g.zeroX, frame.width)}%`,
              top: `${pct(subjectRow.rowY, frame.height)}%`,
            }}
          >
            {subjectNote}
          </span>

          {g.points.map((p) => {
            const layer = valueLabelLayer(p.country);
            return (
              <span
                key={p.country}
                {...layer.attrs}
                // `on-band` is what makes the chip behind this label the SUBJECT BAND's colour
                // rather than the ground — see `blend` above for why a ground chip on a tinted band
                // reads as a hole punched through it.
                className={[
                  "value-label",
                  p.change >= 0 ? "positive" : "negative",
                  p.country === subject ? "on-band" : "",
                ]
                  .join(" ")
                  .trim()}
                style={{
                  ...layer.vars,
                  left: `${pct(p.xValue, frame.width)}%`,
                  top: `${pct(p.rowY, frame.height)}%`,
                }}
              >
                {en(p.change)}
              </span>
            );
          })}
        </div>

        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {ticks.map((tick) => (
            <span
              key={tick.value}
              className="axis-label x"
              style={{ left: `${pct(tick.x, frame.width)}%` }}
            >
              {en(tick.value, 0)}
            </span>
          ))}
          <span
            className="axis-label x zero"
            style={{ left: `${pct(g.zeroX, frame.width)}%` }}
          >
            0
          </span>
        </div>
      </div>

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
