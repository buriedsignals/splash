/**
 * Ukrainians under temporary protection in Europe, as a LIVE MapTiler map — every band a MapLibre
 * layer over MapTiler's own tiles, with MapTiler's own zoom, pan and keyboard.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED ON 2026-09-15, AND WHY IT IS ARCHITECTURE RATHER THAN STYLE.
 *
 * The owner validated `proof/web-choropleth-europe-lowcarbon` the same day (« là c'est top ») and
 * that page is now the pattern: every mark a MapLibre layer, MapTiler's own controls and hover, the
 * map filling the figure's width, and a frozen image baked from the SAME page beneath it.
 *
 * This beat was a premier jet of 2026-09-12 that declared NO interaction at all and drew thirty-one
 * SVG `<path>` ribbons over a baked plate. Both halves of that are gone. An SVG has a `viewBox`, so
 * it has a ratio, so how much width it may take is something somebody has to arbitrate — and every
 * answer that arbitration produced has been refused. A LIVE map has no viewBox: it fills its
 * container and shows the ground that container gives it, and the question stops existing rather
 * than being settled.
 *
 * THE FROZEN IMAGE IS STILL HERE, and it is what a reader gets when the live map cannot be shown:
 * no script, no key, no network, no tiles. MapTiler invalidates ALL of an account's keys at 100 % of
 * its spending limit, so "the map goes blank" is not a hypothetical. The committed artifact is
 * always in that state, because the key never enters a file here.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND WHY IT BELONGS TO THIS TYPE AND TO NO OTHER.
 *
 * A flow map's mark is a MOVEMENT between two places: it carries an origin, a destination, a volume
 * and a direction at once, and the volume rides on ONE channel — the width. That is Minard's rule
 * and this beat keeps it. Two consequences, and they are what a still cannot hand back:
 *
 *   WHAT THE WIDTH IS DIVIDED BY. Every other mark on every other map type measures the place it
 *   sits on. One place, one denominator, and the map wears it. A band measures what LEFT one place
 *   and ARRIVED in another, so it has a second place to divide by — and three honest widths:
 *   the people, the people per thousand inhabitants of the country receiving them, the people per
 *   thousand square kilometres of its ground. A still picks one and the picture carries no trace of
 *   the pick. The reader sees "wide = a lot" and cannot know a lot of WHAT.
 *
 *   MOST OF THE FLOWS. This is the type's named failure: every band drawn is a line across all the
 *   others, and a fan of thirty is a hairball. The only honest answer is Minard's — a band too thin
 *   to see is COUNTED, not drawn. Which bands those are is a function of the denominator and it is
 *   not a stable set: thirteen of thirty-one destinations fall under the floor when the width is
 *   people, TWO when it is people per thousand inhabitants, SEVEN when it is per thousand km². Not
 *   the same thirteen, the same two and the same seven.
 *
 * One control answers both, because they are one fact. And the LEAD CHANGES HANDS three times:
 * Germany by count, Czechia per inhabitant, Malta per square kilometre — which is the whole subject,
 * invisible on any one plate.
 *
 * THE COST, STATED. No stylesheet can reach a MapLibre line layer, so the MAP's half of the gesture
 * is script: one `setPaintProperty` and one `setFilter` per measure, over expressions built at BUILD
 * time from the same width table the markup carries. What a reader with JavaScript off loses is the
 * fan re-widening. What they keep is the frozen image, the key's three rungs in each measure's own
 * unit, the derived sentence, and the 31-row table whose own width samples and ranks follow the
 * measure in pure CSS. The gesture did not go away without script; it moved from the picture to the
 * table, and the reading line says so.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE TWO THINGS THE LAYERS HAVE TO GET RIGHT, both stated at length in `live-flow.ts`:
 *
 *   A WIDTH IS A VOLUME, SO IT DOES NOT GROW WITH THE ZOOM. Of the three radius behaviours
 *   `live-map.mjs` names, this is `camera` — derived once from the plan, then held constant in
 *   SCREEN PIXELS while the reader zooms, "because the same number must not mean two things at two
 *   zooms". It is obtained by construction: a band is a `line` layer, MapLibre's `line-width` is
 *   natively in screen pixels, and no zoom expression is written. A ribbon drawn as a POLYGON would
 *   be `ground` — doubling in width per zoom level — and the volume would become an area.
 *
 *   THE CURVE IS GEOMETRY WE MANUFACTURE. Each band is a quadratic Bézier computed in the map's own
 *   projected plane (x = longitude, y = Mercator northing), sampled and converted back to latitudes.
 *   Its control point is on the chord's perpendicular bisector at a FIXED fraction of the chord, so
 *   the shape is a pure function of the two endpoints: two flows of opposite volume between the same
 *   two places draw the identical curve. The shape therefore carries no datum, and there is nothing
 *   in it a reader could mistake for a route. What IS exact is the width, the two ends and the
 *   bearing the band leaves the origin on — and the caveat says exactly that.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WEB MERCATOR, AND WHAT IT COSTS THIS SUBJECT — MEASURED, NOT ASSERTED.
 *
 * The owner has chosen the flat map knowing the trade (« oui une carte MapLibre plate pas un
 * globe »), so this is a cost the page carries, and a cost a page carries is a cost it states. On a
 * fan the inflation does not fall on an area: it falls on the LENGTH OF THE ARMS. Measured on this
 * beat's own frozen seats, the band to Iceland is drawn 1,41 times longer per real kilometre than
 * the band to Cyprus (Finland ×1,37, Norway ×1,37, Sweden ×1,34). A reader reads the northern
 * destinations as further away than they are. The runner derives all of it on every render and the
 * caveat carries the sharpest pair in the reader's own words.
 *
 * `camera.ts` stays in the beat as the camera that MEASURES — Lambert azimuthal equal-area, EPSG:3035
 * — and the runner prints both.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE SHAPE IS WHAT ANSWERS A POINTER, NEVER A DOT ON TOP OF IT (the owner's second arbitration),
 * held here by MapLibre rather than by a hit test of ours: the band redraws in a fuller dose of its
 * own ink, ABOVE the twenty it crosses. What the answer says is what the table does not print — the
 * three ranks at once, the population and the land area that divide it — so hovering is never the
 * table read out loud again.
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
 *  `chart-stack-` and `mw-stack-`), not a copy-paste slip — see `classing.ts`, "IT EMITS
 *  `data-stack-note`". */
export const MEASURE_ID_PREFIX = "mw-stack";
/** How long a band takes to travel from one measure's width to the next, in ms. Honoured only under
 *  `no-preference` — the travel IS the reading, so a reader who asked for no motion gets the new fan
 *  instantly rather than not at all. The live map is given the SAME number, so the map and the
 *  table's samples travel together rather than on two clocks. */
export const CHANGE_MS = 300;
/** How much fuller than the resting ribbon a pointed-at band has to stand before it counts as
 *  answering. A DOSE IS SEARCHED, NEVER SET: a fixed dose was refused at 1,104:1 on nocturne one
 *  beat over. */
const MARK_SEPARATION = 1.4;

export type Row = {
  code: string;
  name: string;
  /** What the pointer answers: everything the table does not print. */
  detail: string;
  /** What the table prints at rest, under every measure. */
  cells: string[];
  /** This row's rank under each measure, in declaration order — three spans in one cell, of which
   *  the stylesheet reveals one. The ROW never moves; only the number in it changes. */
  ranks: string[];
};

/**
 * THE RIBBON'S INKS, derived once and read by both halves of the page.
 *
 * Exported because the RENDERER needs the same colours the markup is drawn in: the live plan's
 * line paint is built from them, and a second derivation is exactly the "two derivations of one
 * measure" this beat's guards exist to refuse.
 *
 * AND THE OPACITY IS PART OF THE COLOUR, WHICH IS THIS FORMAT'S OWN RECORDED TRAP. A ribbon is drawn
 * translucent because thirty of them cross: what the reader sees is the composite, never the ink. So
 * the composite is what is measured — against the water AND against the land, because this fan
 * crosses both — and the ink is walked up until the composite clears the non-text floor on the
 * worse of the two. Two beats on this branch shipped 1,75:1 and 2,19:1 by measuring the ink.
 */
export function flowInks({
  ground,
  accent,
  ink,
  water,
  land,
  opacity,
}: {
  ground: string;
  accent: string;
  ink: string;
  water: string;
  land: string;
  opacity: number;
}): { ribbon: string; active: string; counted: string; node: string; nodeEdge: string } {
  const compositeOn = (colour: string, over: string) => mix(over, colour, opacity);
  const worseOf = (colour: string) =>
    Math.min(contrast(compositeOn(colour, water), water), contrast(compositeOn(colour, land), land));

  const ribbon = (() => {
    if (worseOf(accent) >= NON_TEXT_CONTRAST_MIN) return accent;
    for (let step = 1; step <= 100; step += 1) {
      const candidate = mix(accent, ink, step / 100);
      if (worseOf(candidate) >= NON_TEXT_CONTRAST_MIN) return candidate;
    }
    throw new Error(
      `no dose of ink darkens the accent ${accent} enough for a band drawn at ${opacity} opacity to stand ` +
        `${NON_TEXT_CONTRAST_MIN}:1 off BOTH the water ${water} and the land ${land} this plate is baked in. ` +
        `A fan is drawn translucent because thirty of its bands cross, so what a reader sees is the ` +
        `composite and not the ink — and a band a reader cannot see over the sea is a destination that ` +
        `left the map.`,
    );
  })();

  /** What a pointed-at band becomes: its OWN ink at full strength, darkened until it stands clear of
   *  the composite it replaces. Not a filter and not a fixed dose — `brightness()` lightens on a
   *  light ground and on a dark one alike. */
  const active = (() => {
    const resting = compositeOn(ribbon, land);
    for (let dose = 0; dose <= 0.94; dose += 0.02) {
      const candidate = mix(ribbon, ink, dose);
      if (
        contrast(candidate, resting) >= MARK_SEPARATION &&
        contrast(candidate, water) >= NON_TEXT_CONTRAST_MIN &&
        contrast(candidate, land) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `no dose of ink separates a pointed-at band from the ${MARK_SEPARATION}:1 it needs against its own ` +
        `resting composite while staying ${NON_TEXT_CONTRAST_MIN}:1 above both the water and the land. A ` +
        `band that answers by becoming a colour the reader cannot tell from the one beside it has not ` +
        `answered.`,
    );
  })();

  return {
    ribbon,
    active,
    /** The dashed stub a COUNTED band wears in the table, measured against the PAGE rather than the
     *  map: it is furniture in a table, not a mark on a basemap. */
    counted: adjustToContrast(mix(ground, ink, 0.45), ground, 3) ?? mix(ground, ink, 0.45),
    node: active,
    nodeEdge: ground,
  };
}

export function DirectedFlowMapWeb({
  plate,
  rows,
  measures,
  keyRungs,
  countedLabel,
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
  ribbonOpacity,
}: {
  rows: Row[];
  measures: FlowMeasureDeclaration;
  /** Each key rung: its sample thickness in CSS px, and every measure's own words for it. */
  keyRungs: { width: number; variants: { slug: string; text: string }[] }[];
  countedLabel: string;
  /** The frozen fallback for THIS direction, already a data URI. */
  plate: string;
  /** The two tints the plate was baked in — what the page actually paints behind every band, and
   *  the only honest thing to measure a translucent ribbon against. */
  plateWater: string;
  plateLand: string;
  ribbonOpacity: number;
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

  const { ribbon, counted } = flowInks({
    ground,
    accent,
    ink,
    water: plateWater,
    land: plateLand,
    opacity: ribbonOpacity,
  });

  const options = flowMeasureOptionsForMarkup(measures, MEASURE_ID_PREFIX);
  const notes = flowMeasureNotesForMarkup(measures);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "measure",
      notes: { reserve: null, stacked: true },
    }),
    flowMeasureCss(measures, {
      scope: SCOPE,
      idPrefix: MEASURE_ID_PREFIX,
      // THE TABLE'S SAMPLE IS PAINTED IN THE RIBBON'S OWN INK AT FULL STRENGTH, not in the composite
      // the map draws: a 10 px box on the page is not a stroke crossing twenty others, and dimming
      // it to the crossing's opacity would make the key of the gesture the faintest thing in the
      // table.
      ribbon,
      counted,
      changeMs: CHANGE_MS,
    }),
    liveFlowCss({ scope: SCOPE }),
    // The answer is six readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 340px; }`,
    // THE KEY'S RUNGS. Every measure's words for a rung sit in ONE grid cell, so the rung is as wide
    // as the longest of the three and the rail cannot reflow when the reader changes measure.
    `${SCOPE} .flow-key { display: flex; flex-wrap: wrap; align-items: center; gap: 0 14px; margin: 8px 0 4px; flex: 0 0 auto; }`,
    `${SCOPE} .flow-key .rung { display: inline-flex; align-items: center; gap: 6px; }`,
    `${SCOPE} .flow-key .bar { display: block; width: 26px; background: ${ribbon}; }`,
    `${SCOPE} .flow-key .stub { display: block; width: 26px; height: 10px; box-sizing: border-box; background: transparent; border: 1px dashed ${counted}; }`,
    // THE TABLE IS THE GESTURE WITHOUT SCRIPT, so it is a real table and not a grid of divs: a screen
    // reader is given rows and columns, and each row's sample re-widens with the measure exactly as
    // the map's own band does.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader and still a plain cell to the eye: the
    // browser's own bold on `th` would make thirty-one country names the heaviest ink on the page.
    // Named literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
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
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>
          {eyebrow}
        </p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
      </div>

      {/* THE WIDTH SCALE, IN THE UNIT OF THE MEASURE IN FORCE — Minard's second rule. A band width
          nobody can convert is a ribbon, and a rung that kept saying "people" while the fan measured
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
          The plate's own measure gets none: the untouched fan is the claim, not a comparison. */}
      <div className="measure-notes" role="status">
        {notes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug} style={{ ...regs.annot, margin: 0 }}>
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
          // is given and the height the window leaves — exactly what the scrolly's stage does. The
          // two layers then COVER it; neither is stretched.
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
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
        </svg>
        {/* THE LIVE MAP'S BOX — empty and invisible until MapLibre says it has drawn. It takes the
            plot's whole track rather than the cell, which IS the ruling: a live map has no viewBox to
            be bound by, so it fills the width the figure has. */}
        <div className="map-layer" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      {/* THE CLAIM, AND WITH IT MINARD'S FOURTH RULE: the destinations this fan counts without drawing
          them. Printed at rest rather than revealed, because the opening fan IS the claim and the
          bands it leaves out are part of it — and in ONE paragraph, because every line of chrome on
          this page comes straight off the height of the map. */}
      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>
        {claimNote}
      </p>
      {/* SHOWN ONLY WHEN THE LIVE MAP IS UP. With no script, no key or no tiles, a sentence about
          dragging a map that cannot be dragged is a dead control, and this arrangement exists
          precisely not to ship one. */}
      <p className="live-hint" hidden style={{ ...regs.annot, margin: "4px 0 0" }}>
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
                  <th key={column} scope="col" className={i > 0 && i < columns.length - 1 ? "num" : undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} data-mark={row.code} data-detail={row.detail}>
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
                      ranking inverts completely between the three denominators, and NO ROW MOVES to
                      say so. The owner's first arbitration is held by the drawing — a table that
                      re-sorted itself would move thirty-one lines of text for a reason a reader
                      would have to be told rather than see. */}
                  <td className="num">
                    <span className="flow-var">
                      {row.ranks.map((rank, i) => (
                        <span key={i} data-flow-var={flowSlugOf(measures.measures[i].key)}>
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
