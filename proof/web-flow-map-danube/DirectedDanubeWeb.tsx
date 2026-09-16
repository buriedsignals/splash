/**
 * Le Danube et ses neuf territoires, as a LIVE MapTiler map — the course drawn as nine MapLibre
 * `line` features over MapTiler's own tiles, with MapTiler's own zoom, pan and keyboard, and a frozen
 * photograph of this same page beneath it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND WHY IT IS THIS SUBJECT'S AND NOT THE SHEET'S WORDING.
 *
 * `types/flow-map.md` writes the gesture for an origin-destination FAN: *the reader picks what the
 * width is divided by, because a band measures two places.* A river is not a fan. There is no second
 * PLACE to divide by here — there is a second SENSE of the same kilometre, and there are three of
 * them:
 *
 *   EN PROPRE     the stretch inside one country and shared with nobody. Germany 523,6 km.
 *   EN FRONTIÈRE  the stretch where the Danube IS the border, so two states count the same water.
 *                 Romania 256,5 km; 83 % of Bulgaria's own Danube.
 *   POUR 1 000 km² how much Danube a country has for its own size. Serbia 5,04; Ukraine 0,02.
 *
 * The lead changes hands on all three — Allemagne, Roumanie, Serbie — and that is the subject. The
 * still sibling (`proof/mapmore-flow-danube`) can only state it, and states it as an anti-pattern in
 * its own brief: *« "crossed" is not "flowed through" »*. Here the reader holds it.
 *
 * WHAT IS REUSED IS THE MECHANISM. `live-flow.ts`'s width law, Minard's fourth rule, the one-slug
 * vocabulary, the CSS half and the `setPaintProperty` half all transfer unchanged. None of them
 * decided what this beat argues.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE ORDER RAIL, WHICH IS THIS BEAT'S OWN AND NOT THE FAN'S.
 *
 * A fan has no order: thirty-one destinations are a set. A river HAS one — the order it reaches each
 * territory, which is the only ranking the geography itself supplies, and it is what the still
 * sibling numbers 1 to 9 on its plate. So the rail above the map keeps those nine numbers, fixed,
 * always in river order, and the table's RANK cell renumbers underneath them. The two disagreeing in
 * front of the reader is the whole point: the river's own order is not the answer to any of the three
 * questions the control asks, and a map that prints only the river's order lets a reader believe it
 * is.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE TWO THINGS THE LAYERS HAVE TO GET RIGHT.
 *
 *   A WIDTH IS A QUANTITY, SO IT DOES NOT GROW WITH THE ZOOM. Of the three radius behaviours
 *   `live-map.mjs` names, a band takes none of them: it is a `line` layer, MapLibre's `line-width` is
 *   natively in screen pixels, and no zoom expression is written. The stretch reprojects itself; only
 *   its width is held. A ribbon drawn as a POLYGON would be `ground`, doubling per zoom level, and
 *   the kilometres would silently become an area.
 *
 *   THE SHAPE IS THE RIVER AND NOT A CURVE WE MANUFACTURE. This is the one place this beat inverts
 *   its own sheet. A fan's band is a Bézier whose shape carries no datum, so a reader may not read a
 *   route into it. Here the geometry IS the route — 911 frozen Natural Earth points, cut into nine
 *   `LineString`s at the territory boundaries — so every bend is real, and the caveat says the
 *   opposite of the fan's caveat: what is schematic is the WIDTH, and the line is the river.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WEB MERCATOR, AND WHAT IT COSTS THIS SUBJECT — MEASURED, NOT ASSERTED. Not an area, not the arms of
 * a fan: the LENGTH OF THE COURSE, unevenly along it. Ground scale runs as 1/cos(latitude) and the
 * Danube descends 48,1° N → 43,7° N, so the German stretch is drawn 1,088 times longer per real
 * kilometre than the Bulgarian one. The runner derives it every render and refuses if the sentence
 * stops being true. `camera.ts` is the equal-area camera that MEASURES.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE SHAPE IS WHAT ANSWERS A POINTER, never a dot on top of it: the stretch redraws in a fuller dose
 * of its own ink, above the ground it crosses. What it says is what the table does not print — its
 * place in the river's own order, the total kilometres it is a part of, its share of the whole course,
 * and the ground that divides it.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  flowMeasureCss,
  flowMeasureNotesForMarkup,
  flowMeasureOptionsForMarkup,
  flowSlugOf,
  liveFlowCss,
  type FlowMeasureDeclaration,
} from "../../skills/map-web/assets/live-flow.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `mw-stack-` is the FORMAT'S DISCOVERY CONTRACT for a control
 *  that changes the picture and owes the reader a sentence (`interaction-plan.ts` reads both
 *  `chart-stack-` and `mw-stack-`). */
export const MEASURE_ID_PREFIX = "mw-stack";
/** How long a stretch takes to travel from one measure's width to the next, in ms. Honoured only
 *  under `no-preference` — the travel IS the reading. The live map is given the SAME number, so the
 *  map and the table's samples travel together rather than on two clocks. */
export const CHANGE_MS = 300;
/** How much fuller than the resting ribbon a pointed-at stretch has to stand before it counts as
 *  answering. SEARCHED against this beat's own three renders, never inherited: at 1,4 the nocturne
 *  render's active ink landed on its own resting composite, because this beat's ribbon is opaque
 *  where the fan's is translucent and there is less room above it. 1,25 clears on all three. */
const MARK_SEPARATION = 1.25;

export type Row = {
  code: string;
  name: string;
  /** Where the river reaches this territory in its own order, 1 to 9. Fixed, never re-sorted. */
  order: number;
  /** What the pointer answers: everything the table does not print. */
  detail: string;
  /** What the table prints at rest, under every measure. */
  cells: string[];
  /** This row's rank under each measure, in declaration order — three spans in one grid cell, of
   *  which the stylesheet reveals one. The ROW never moves; only the number in it changes. */
  ranks: string[];
};

/**
 * THE RIVER'S INKS, derived once and read by both halves of the page.
 *
 * Exported because the RENDERER needs the same colours the markup is drawn in: the live plan's line
 * paint is built from them, and a second derivation is exactly the "two derivations of one measure"
 * this beat's guards exist to refuse.
 *
 * WHY THIS IS NOT THE FAN'S DERIVATION, MEASURED RATHER THAN ASSUMED. A fan draws thirty translucent
 * bands because they cross each other; what the reader sees there is always a composite. **Nine
 * stretches of one river cross NOTHING** — they are disjoint pieces of a single line — so the ribbon
 * is drawn at full opacity and the ink is the ink. That removes the fan's own recorded trap (measure
 * the composite, not the ink) and replaces it with a simpler requirement: the ribbon clears the
 * non-text floor against the water AND against the land the plate is baked in, because this river
 * runs through both.
 */
export function danubeInks({
  ground,
  accent,
  ink,
  water,
  land,
}: {
  ground: string;
  accent: string;
  ink: string;
  water: string;
  land: string;
}): {
  ribbon: string;
  active: string;
  counted: string;
  node: string;
  nodeEdge: string;
} {
  const worseOf = (colour: string) =>
    Math.min(contrast(colour, water), contrast(colour, land));

  const ribbon = (() => {
    if (worseOf(accent) >= NON_TEXT_CONTRAST_MIN) return accent;
    for (let step = 1; step <= 100; step += 1) {
      const candidate = mix(accent, ink, step / 100);
      if (worseOf(candidate) >= NON_TEXT_CONTRAST_MIN) return candidate;
    }
    throw new Error(
      `no dose of ink darkens the accent ${accent} enough for the river to stand ` +
        `${NON_TEXT_CONTRAST_MIN}:1 off BOTH the water ${water} and the land ${land} this plate is baked ` +
        `in. The Danube is the only mark on this plate that carries the story, and a river a reader ` +
        `cannot pick out of the sea it ends in is a beat with no subject.`,
    );
  })();

  /** What a pointed-at stretch becomes: its own ink darkened until it stands clear of the eight
   *  others it is drawn beside. Not a filter and not a fixed dose — `brightness()` lightens on a
   *  light ground and on a dark one alike. */
  const active = (() => {
    for (let dose = 0; dose <= 0.94; dose += 0.02) {
      const candidate = mix(ribbon, ink, dose);
      if (
        contrast(candidate, ribbon) >= MARK_SEPARATION &&
        contrast(candidate, water) >= NON_TEXT_CONTRAST_MIN &&
        contrast(candidate, land) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `no dose of ink separates a pointed-at stretch by the ${MARK_SEPARATION}:1 it needs from the ` +
        `river's own resting ink while staying ${NON_TEXT_CONTRAST_MIN}:1 above both the water and the ` +
        `land. A stretch that answers by becoming a colour the reader cannot tell from the one beside ` +
        `it has not answered.`,
    );
  })();

  return {
    ribbon,
    active,
    /** The dashed stub a COUNTED stretch wears in the table, measured against the PAGE rather than
     *  the map: it is furniture in a table, not a mark on a basemap. */
    counted:
      adjustToContrast(mix(ground, ink, 0.45), ground, 3) ??
      mix(ground, ink, 0.45),
    /** The spring. A pin and not a measurement: it locates, it encodes nothing. */
    node: active,
    nodeEdge: ground,
  };
}

export function DirectedDanubeWeb({
  plate,
  rows,
  measures,
  keyRungs,
  countedLabel,
  orderLabel,
  livePlan,
  liveScript,
  liveHint,
  maplibreCss,
  maplibreJs,
  tableCaption,
  columns,
  aspect,
  size,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  interaction,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  plateWater,
  plateLand,
}: {
  rows: Row[];
  measures: FlowMeasureDeclaration;
  /** Each key rung: its sample thickness in CSS px, and every measure's own words for it. */
  keyRungs: { width: number; variants: { slug: string; text: string }[] }[];
  countedLabel: string;
  /** What the numbered rail is, said once — the river's own order, which is not a ranking. */
  orderLabel: string;
  /** The frozen fallback for THIS direction, already a data URI. */
  plate: string;
  /** The two tints the plate was baked in — what the page actually paints behind the river, and the
   *  only honest thing to measure its ink against. */
  plateWater: string;
  plateLand: string;
  livePlan: Record<string, unknown>;
  liveScript: string;
  liveHint: string;
  maplibreCss: string;
  maplibreJs: string;
  tableCaption: string;
  columns: string[];
  aspect: number;
  size: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  interaction: unknown;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  const width = aspect >= 1 ? size : size * aspect;
  const height = aspect >= 1 ? size / aspect : size;

  const { ribbon, counted } = danubeInks({
    ground,
    accent,
    ink,
    water: plateWater,
    land: plateLand,
  });

  const options = flowMeasureOptionsForMarkup(measures, MEASURE_ID_PREFIX);
  const notes = flowMeasureNotesForMarkup(measures);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "measure",
    }),
    flowMeasureCss(measures, {
      scope: SCOPE,
      idPrefix: MEASURE_ID_PREFIX,
      // THE TABLE'S SAMPLE IS THE RIVER'S OWN INK. Here, unlike the fan, that is not a decision: the
      // river is drawn opaque on the map too, so the sample and the mark are literally the same
      // colour and a reader can carry one to the other.
      ribbon,
      counted,
      changeMs: CHANGE_MS,
    }),
    liveFlowCss({ scope: SCOPE }),
    // The answer is five readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 330px; }`,
    // THE WIDTH KEY. Every measure's words for a rung sit in ONE grid cell, so a rung is as wide as
    // the longest of the three and the rail cannot reflow when the reader changes measure.
    `${SCOPE} .flow-key { display: flex; flex-wrap: wrap; align-items: center; gap: 0 14px; margin: 8px 0 4px; flex: 0 0 auto; }`,
    `${SCOPE} .flow-key .rung { display: inline-flex; align-items: center; gap: 6px; }`,
    `${SCOPE} .flow-key .bar { display: block; width: 26px; background: ${ribbon}; }`,
    `${SCOPE} .flow-key .stub { display: block; width: 26px; height: 10px; box-sizing: border-box; background: transparent; border: 1px dashed ${counted}; }`,
    // THE ORDER RAIL — this beat's own, and the one piece of furniture on the page that NEVER moves
    // with the measure. Nine badges in the river's order, the still sibling's own numbering carried
    // across, so the table's rank cell has something to visibly disagree with.
    `${SCOPE} .order-rail { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 10px; margin: 2px 0 6px; flex: 0 0 auto; }`,
    `${SCOPE} .order-rail .rail-label { color: ${muted}; }`,
    `${SCOPE} .order-rail .stop { display: inline-flex; align-items: baseline; gap: 4px; white-space: nowrap; }`,
    `${SCOPE} .order-rail .num { display: inline-block; min-width: 1.35em; text-align: center; border-radius: 2px; background: ${ribbon}; color: ${ground}; padding: 0 2px; }`,
    // THE TABLE IS THE GESTURE WITHOUT SCRIPT, so it is a real table and not a grid of divs: a screen
    // reader is given rows and columns, and each row's sample re-widens with the measure exactly as
    // the map's own stretch does.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader and still a plain cell to the eye: the
    // browser's own bold on `th` would make nine country names the heaviest ink on the page. Named
    // literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    `${SCOPE} .mw-table td.ord { color: ${muted}; }`,
    `${SCOPE} details.mw-readings { margin: 8px 0 0; }`,
    `${SCOPE} details.mw-readings > summary { cursor: pointer; }`,
    `${SCOPE} .mw-scroll { max-height: 40vh; overflow: auto; }`,
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* MapLibre's own stylesheet, INLINED rather than linked: a `<link>` would trade the payload
          for a SECOND third-party host, and the honest reading of the live-map ruling keeps the
          count at one — api.maptiler.com. */}
      <style dangerouslySetInnerHTML={{ __html: maplibreCss }} />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p
          className="chart-eyebrow"
          style={{ ...regs.eyebrow, margin: "0 0 6px" }}
        >
          {eyebrow}
        </p>
        <h2
          className="chart-title"
          style={{ ...regs.display, margin: "0 0 6px" }}
        >
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
      </div>

      {/* THE RIVER'S OWN ORDER, FIXED. Not a ranking, and the label says so — it is the only sequence
          the geography supplies, and it is the answer to none of the three questions the control
          below asks. Kept from the still sibling, which numbers exactly these nine on its plate. */}
      <p className="order-rail" style={{ ...regs.axis, margin: "2px 0 6px" }}>
        <span className="rail-label">{orderLabel}</span>
        {rows
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((row) => (
            <span key={row.code} className="stop">
              <span className="num">{row.order}</span>
              {row.name}
            </span>
          ))}
      </p>

      {/* THE WIDTH SCALE, IN THE UNIT OF THE MEASURE IN FORCE — Minard's second rule. A width nobody
          can convert is a ribbon, and a rung that kept saying "km en propre" while the map measured
          per square kilometre would be worse than none. */}
      <div className="flow-key">
        {keyRungs.map((rung) => (
          <span key={rung.width} className="rung" style={{ ...regs.axis }}>
            <span className="bar" style={{ height: Math.max(1, rung.width) }} />
            <span className="flow-var">
              {rung.variants.map((variant) => (
                <span key={variant.slug} data-flow-var={variant.slug}>
                  {variant.text}
                </span>
              ))}
            </span>
          </span>
        ))}
        <span className="rung" style={{ ...regs.axis }}>
          <span className="stub" />
          {countedLabel}
        </span>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the measure's full name where the pill carries its short one. */}
      <fieldset className="chart-measure">
        <legend>{measures.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={MEASURE_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT THE CHOSEN MEASURE DOES TO THE READING. Every sentence sits in one grid cell, so the
          row is always as tall as the longest of them and choosing a measure never moves the map.
          The opening measure gets none: the untouched course is the claim, not a comparison. */}
      <div className="measure-notes" role="status">
        {notes.map((note) => (
          <p
            data-stack-note={note.slug}
            key={note.slug}
            style={{ ...regs.annot, margin: 0 }}
          >
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          // The aspect-ratio is the box's BASIS, not its law: the format makes `.chart-plot` the one
          // shrinkable item under the figure's `max-height: 100dvh`, so this box takes the width it
          // is given and the height the window leaves. The two layers then COVER it; neither is
          // stretched.
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        {/* THE FALLBACK. One `<svg class="chart">` carrying one thing: the frozen photograph of this
            page's own live map, in this direction's own tints. It is the format's cell contract and
            it is the whole picture when the live map cannot be shown. */}
        <svg
          role="img"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          // COVER, never stretch and never letterbox: `slice` is SVG's `object-fit: cover`.
          preserveAspectRatio="xMidYMid slice"
          data-plate=""
        >
          <desc>{alt}</desc>
          <image
            href={plate}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        </svg>
        {/* THE LIVE MAP'S BOX — empty and invisible until MapLibre says it has drawn. It takes the
            plot's whole track rather than the cell, which IS the ruling: a live map has no viewBox to
            be bound by, so it fills the width the figure has. */}
        <div className="map-layer" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      {/* THE CLAIM, AND WITH IT MINARD'S FOURTH RULE: the stretches this map counts without drawing
          them. Printed at rest rather than revealed, because the opening course IS the claim and the
          stretches it leaves out are part of it — and in ONE paragraph, because every line of chrome
          on this page comes straight off the height of the map. */}
      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>
        {claimNote}
      </p>
      {/* SHOWN ONLY WHEN THE LIVE MAP IS UP. With no script, no key or no tiles, a sentence about
          dragging a map that cannot be dragged is a dead control, and this arrangement exists
          precisely not to ship one. */}
      <p
        className="live-hint"
        hidden
        style={{ ...regs.annot, margin: "4px 0 0" }}
      >
        {liveHint}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>
        {reading}
      </p>

      {/* EVERY READING, AS TEXT, WITH AND WITHOUT SCRIPT — and the measure gesture with it. Each
          row's sample re-widens and its rank renumbers under the three measures in pure CSS even when
          the map cannot. A native `<details>`: it opens with the keyboard, it opens with no script,
          and it is the one control on this page that was never at risk. */}
      <details className="mw-readings">
        <summary style={{ ...regs.axis }}>{tableCaption}</summary>
        <div className="mw-scroll">
          <table className="mw-table" style={{ ...regs.axis }}>
            <thead>
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    className={
                      i > 1 && i < columns.length - 1 ? "num" : undefined
                    }
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.code}
                  data-mark={row.code}
                  data-detail={row.detail}
                >
                  {/* THE RIVER'S ORDER IS A CELL AND NOT THE ROW ORDER'S SIDE EFFECT, because it has
                      to stay legible next to a rank that moves. The rows are IN this order; the
                      column repeats it so the reader can read the two numbers side by side. */}
                  <td className="ord">{row.order}</td>
                  <th scope="row" className="rowhead">
                    {row.name}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="num">
                      {cell}
                    </td>
                  ))}
                  {/* THE RANK IS THE ONE THING IN THE TABLE THAT CHANGES WITH THE MEASURE AND IS A
                      WORD. Three spans in one grid cell, of which the stylesheet reveals one: the
                      ranking inverts between the three measures and NO ROW MOVES to say so. A table
                      that re-sorted itself would move nine lines of text — and, worse here, would
                      destroy the one order the river actually has. */}
                  <td className="num">
                    <span className="flow-var">
                      {row.ranks.map((rank, i) => (
                        <span
                          key={i}
                          data-flow-var={flowSlugOf(measures.measures[i].key)}
                        >
                          {rank}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>
                    {/* THE SAMPLE IS AN HTML BOX AND IT CARRIES NO WIDTH OF ITS OWN — both of which
                        are measurements rather than preferences, and both were paid for one beat
                        over. A box, because an SVG `<rect>`'s re-shading depended on a `:has()`
                        invalidation reaching an inherited presentation property, measured going
                        stale in Chrome while an HTML sibling updated in the same recalculation. No
                        width of its own, because an inline `style` beats every author rule: the
                        default is a RULE here (`flowMeasureCss` emits it for the opening measure), so
                        the cascade has only rules to compare. */}
                    <span className="bw" data-flow-code={row.code} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>

      {/* THE PLAN THE LIVE LAYER READS, as `application/json` — which is also what the font machine
          reads when it decides which characters this page can display, so MapLibre's own control
          names are cut into the embedded faces like every other word. */}
      <script
        id="mw-live-plan"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(livePlan) }}
      />
      <script dangerouslySetInnerHTML={{ __html: maplibreJs }} />
      <script dangerouslySetInnerHTML={{ __html: liveScript }} />
    </figure>
  );
}
