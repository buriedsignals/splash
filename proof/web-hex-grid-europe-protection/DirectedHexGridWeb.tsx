/**
 * Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per host country — drawn
 * as a hex cartogram ON A LIVE MAPTILER MAP and delivered as an interactive page.
 *
 * ONE UNIT, ONE CELL, ALL CELLS EQUAL. The map gives up area and buys what a choropleth of the same
 * data cannot give: every country equally visible. On a subject whose units are countries rather
 * than land, that is the honest trade, and the caveat states both halves of it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE ARCHITECTURE, CHANGED 2026-09-15 — AND THE GESTURE, KEPT.
 *
 * This beat used to draw its cells as SVG polygons over a baked plate. The owner validated
 * `proof/web-choropleth-europe-lowcarbon/` as THE pattern for every web map: every mark a MapLibre
 * layer over MapTiler's own tiles, the map taking the whole width of the figure, zoom / pan / hover
 * from MapTiler rather than from a collision test of ours, a flat Web Mercator projection, and a
 * frozen second layer underneath because MapTiler invalidates ALL of an account's keys at 100 % of
 * its spending limit. `skills/map-web/assets/live-hex.ts` is this type's half of that pattern.
 *
 * The GESTURE is untouched: the reader holds the GRAIN — over how many cells a cell adds up its own
 * numerator and its own denominator before it divides. `pool.ts` is still the vocabulary.
 *
 *   le pays        LIE 23,9   LTU 17,5   CZE 36,1     5 classes drawn
 *   le voisinage   LIE  1,8   LTU 26,6   CZE 22,0     4 classes drawn, 21 of 31 cells change class
 *   la région      LIE  4,3   LTU 18,3   CZE 18,0     3 classes drawn, 21 of 31 cells change class
 *
 * WHAT THE ARCHITECTURE COST THE GESTURE, stated rather than discovered. No stylesheet reaches a
 * MapLibre layer, so the map's half of the grain is now SCRIPT: one `setPaintProperty` and one
 * `setLayoutProperty` per grain, over expressions built at BUILD time from the same pooled classes
 * the markup carries. What a reader with no script keeps is the frozen picture, the legend — which
 * is IDENTICAL under every grain, this vocabulary's whole distinction from `classing.ts` — the
 * derived sentence, and the value table below, whose own rate and swatch still re-shade under the
 * grain in pure CSS. The gesture moved from the picture to the table; it did not disappear.
 *
 * THE POINTER'S ANSWER DOES NOT CHANGE WITH THE GRAIN, deliberately. Every cell answers with all
 * three of its values at once, plus the people, the population that divides them and its rank in
 * BOTH rankings — a reading that is true in every state. And there is ONE copy of that string: the
 * table's row carries `data-detail`, and the live map reads it off the row rather than shipping a
 * second copy inside the plan.
 *
 * NOTHING MOVES. A cell's seat is a function of the drawn grid and of no grain, so the three states
 * are the same polygons at the same places with different fills, and `fill-color` interpolates over
 * the beat's own 420 ms (the owner's fourth arbitration honoured by construction). The block outline
 * is in the source under every grain and it is its `line-opacity` that moves, so it interpolates too.
 * A reader who drags the map moves everything, and they can see exactly why.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` — the key names its classes in people per 1 000.
 * `a-sequential-grid-is-one-hue-cluster` — one hue, monotone in lightness, in all three states.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  poolAttrsFor,
  poolCss,
  poolFigureCss,
  poolNotesForMarkup,
  poolOptionsForMarkup,
} from "../../skills/map-web/assets/pool.ts";
import { liveHexCss } from "../../skills/map-web/assets/live-hex.ts";

/** The id stem the format's own discovery contract looks for. `interaction-plan.ts` reads a
 *  toggling control off `id="mw-stack-<slug>"` plus `data-stack-note="<slug>"`. */
export const POOL_ID_PREFIX = "mw-stack";
export const SCOPE = ".chart-figure";
/** How long a cell's colour takes to run from one grain's class to the next — given to the map's
 *  paint transition AND to the table's swatches, so the two halves cross together. */
export const POOL_MS = 420;
/** What a pointed-at cell must differ from its own resting fill by. The owner refused a FIXED dose
 *  at 1,104:1, so the dose is searched until a measured separation rather than typed. */
export const ACTIVE_SEPARATION_MIN = 1.25;
/** What the seat outside the count must differ from every class by. 1,1:1 is not a threshold
 *  anybody can defend as "visible"; it is the line under which two fills are the SAME fill with
 *  rounding, which is the state this beat once shipped in. */
export const ORIGIN_SEPARATION_MIN = 1.5;

/**
 * ONE DERIVATION OF THE RAMP, READ BY BOTH HALVES — the component draws the table's swatches from it
 * and the runner builds the live map's per-grain fill expressions from the SAME arrays. A second
 * derivation is precisely the "half the beat re-shades and the other half keeps the grain before it"
 * defect, now able to happen across two mechanisms instead of inside one.
 *
 * AND IT IS FLOORED AGAINST BOTH GROUNDS. The cells used to sit on the page's own `--ground`; they
 * now sit on MapTiler's land and water, repainted in this direction's plate tints. A class legible
 * on the paper and invisible on the sea is a class that disappears for the cells over the Atlantic,
 * so the harder of the two is what the floor is taken against.
 */
export function hexRamp({
  ground,
  accent,
  ink,
  plateLand,
  plateWater,
  tones,
}: {
  ground: string;
  accent: string;
  ink: string;
  plateLand: string;
  plateWater: string;
  tones: number;
}) {
  const grounds = [ground, plateLand, plateWater];
  const worst = (colour: string) => Math.min(...grounds.map((g) => contrast(colour, g)));
  const floorAgainstGround = (colour: string, what: string) => {
    let out = colour;
    for (const g of grounds) {
      if (contrast(out, g) >= NON_TEXT_CONTRAST_MIN) continue;
      const lifted = adjustToContrast(out, g, NON_TEXT_CONTRAST_MIN);
      if (!lifted)
        throw new Error(`${what} cannot be told from the ground it sits on in this direction's colours.`);
      out = lifted;
    }
    if (worst(out) < NON_TEXT_CONTRAST_MIN)
      throw new Error(`${what} measures ${worst(out).toFixed(2)}:1 against the palest ground it is drawn on.`);
    return out;
  };
  const low = floorAgainstGround(mix(accent, ground, 0.88), "the lowest class of the ramp");
  const high = mix(accent, ink, 0.3);
  const ramp = Array.from({ length: tones }, (_, i) => mix(low, high, tones > 1 ? i / (tones - 1) : 0.5));
  /** DARKENED FROM ITS OWN FILL, and the dose is searched. A cell's answer to a pointer is the cell
   *  itself (the owner's second arbitration); a single typed dose measured 1,104:1 on nocturne. */
  const darken = (fill: string, what: string) => {
    for (let t = 4; t <= 60; t += 2) {
      const tried = mix(fill, ink, t / 100);
      if (contrast(tried, fill) >= ACTIVE_SEPARATION_MIN) return tried;
    }
    for (let t = 4; t <= 60; t += 2) {
      const tried = mix(fill, ground, t / 100);
      if (contrast(tried, fill) >= ACTIVE_SEPARATION_MIN) return tried;
    }
    throw new Error(`${what} cannot be darkened from its own fill by a step a reader can see.`);
  };
  const activeRamp = ramp.map((fill, i) => darken(fill, `class ${i}`));
  const inkRamp = ramp.map((fill) =>
    inkOnFill(fill, { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
  );
  /** THE SEAT OUTSIDE THE COUNT IS THE GROUND, NOT A SIXTH TINT. It used to be `mix(ground, ink,
   *  0.16)` put through the same floor as class 0, and two colours floored INDEPENDENTLY on the same
   *  floor against the same ground come out the same colour by construction: measured 1,007:1 on
   *  creme, 1,001:1 on nocturne, 1,011:1 on rapport. The key then offered a swatch for "moins de 5"
   *  and a swatch for "Ukraine · origine" in one colour, teaching a reader that a country nobody
   *  counted is a country with the lowest rate. There is no room inside the ramp — class 0 sits at
   *  the 3,0 floor and class 1 is a visible step above — so the honest place for a unit that was
   *  never measured is OUTSIDE the ramp: the ground itself, an empty seat with a floored outline. */
  const originFill = ground;
  const originEdge = floorAgainstGround(mix(ground, ink, 0.45), "the outline of the seat that stands outside the count");
  const edge = floorAgainstGround(mix(ground, ink, 0.3), "the outline of a legend swatch");
  const origin = {
    fill: originFill,
    active: darken(originFill, "the seat that stands outside the count"),
    ink: inkOnFill(originFill, { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
    edge: originEdge,
  };
  ramp.forEach((fill, i) => {
    const seen = contrast(originFill, fill);
    if (seen < ORIGIN_SEPARATION_MIN)
      throw new Error(
        `the seat that stands outside the count and the class ${i} measure ${seen.toFixed(3)}:1 ` +
          `against each other (floor ${ORIGIN_SEPARATION_MIN}). The key would offer two swatches in ` +
          `one colour and tell the reader that a country nobody counted is a country with the ` +
          `lowest rate.`,
      );
  });
  return { ramp, activeRamp, inkRamp, origin, edge, seamInk: mix(ink, ground, 0.12) };
}

export type Cell = {
  code: string;
  name: string;
  isOrigin: boolean;
  detail: string;
  people: string;
  /** One printed number per grain, in the beat's own format. Stacked at one place in the table. */
  figures: { slug: string; text: string; klass: number; isDefault: boolean }[];
};

export function DirectedHexGridWeb({
  cells,
  pool,
  classes,
  originLabel,
  plate,
  plateLand,
  plateWater,
  aspect,
  size,
  livePlan,
  liveScript,
  liveHint,
  maplibreCss,
  maplibreJs,
  tableCaption,
  columns,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  cells: Cell[];
  pool: any;
  classes: { label: string }[];
  originLabel: string;
  plate: string;
  plateLand: string;
  plateWater: string;
  aspect: number;
  size: number;
  livePlan: Record<string, unknown>;
  liveScript: string;
  liveHint: string;
  maplibreCss: string;
  maplibreJs: string;
  tableCaption: string;
  columns: string[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
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

  const { ramp, origin, edge } = hexRamp({
    ground,
    accent,
    ink,
    plateLand,
    plateWater,
    tones: classes.length,
  });

  const options = poolOptionsForMarkup(pool, POOL_ID_PREFIX);
  const notes = poolNotesForMarkup(pool);

  const css = [
    // THE CHROME IS NOT COPIED. `control-chrome.ts` is the one place a directed control is drawn —
    // the pill rail, the chosen pill's wash and ring, the reserved note row — and a local variant
    // would be the only one left ugly when the shared drawing is next changed.
    controlChromeCss({
      scope: SCOPE,
      name: "pool",
      rail: "wrap",
      notes: {
        reserve: "3.6em",
        stacked: true,
        why:
          "The two sentences wrap to two and three lines at 375px on this beat's own words, and a " +
          "revealed sentence that grows its row pushes the whole map down — the movement the " +
          "owner's first arbitration refuses. Stacked in one cell, the row is always as tall as " +
          "the longest sentence and the map never moves.",
      },
      extra: poolFigureCss({ scope: SCOPE }),
    }),
    // THE GESTURE'S SCRIPT-FREE HALF. The map's cells are MapLibre layers now and no stylesheet
    // reaches one, so what these rules re-shade is the TABLE: each row's swatch and each row's
    // printed rate follow the grain in pure CSS, exactly as the cells do with script.
    poolCss(pool, {
      scope: SCOPE,
      idPrefix: POOL_ID_PREFIX,
      fillOf: (klass) => ramp[klass],
      // THE BLANKET IS THE NEUTRAL, not a class: a swatch whose token no rule sets is painted exactly
      // like the country outside the measure — while its row still prints a number, which is a
      // contradiction a reader can see and a guard can name.
      unsetFill: origin.fill,
      // A SWATCH IS AN HTML BOX, so the class it wears is its BACKGROUND. Measured on the sibling
      // pattern: as an SVG `<rect>` its re-shading depended on a `:has()` invalidation reaching an
      // inherited presentation property, and that went stale in Chrome while an HTML sibling
      // carrying the same attribute updated in the same recalculation.
      property: "background-color",
      ms: POOL_MS,
    }),
    liveHexCss({ scope: SCOPE }),
    // The answer is five readings long and the format's tooltip box is 220px wide.
    `#tooltip { max-width: min(460px, 100vw - 32px); }`,
    // THE TABLE IS THE GESTURE WITHOUT SCRIPT, so it is a real table and not a grid of divs.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader and still a plain cell to the eye: the
    // browser's own bold would make thirty-two country names the heaviest ink on the page. Named
    // literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    `${SCOPE} .mw-table .sw { display: block; width: 14px; height: 14px; box-sizing: border-box; border: 1px solid ${edge}; }`,
    `${SCOPE} .mw-table .sw.origin { border-color: ${origin.edge}; }`,
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
      {/* This beat's own stylesheet, carried inside the figure it styles. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries what a reader who is not looking at the map would otherwise only get
          from it. Each accessible name CONTAINS its visible one — WCAG 2.5.3. */}
      <fieldset className="chart-pool">
        <legend>{pool.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={POOL_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the map underneath it. The default reveals none: it is
          not a counterfactual, it is the claim the title makes. */}
      <div className="pool-notes" role="status">
        {notes.map((note) => (
          <p key={note.slug} data-stack-note={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
        ))}
      </div>

      {/* THE KEY, AND IT IS THE SAME KEY IN ALL THREE STATES. Holding the bounds still and moving the
          values is exactly what lets one key serve every grain — a reader learns it once. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 10px",
          margin: "6px 0 2px",
          flex: "0 0 auto",
        }}
      >
        {classes.map((k, i) => (
          <span key={k.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: ramp[i], display: "inline-block", border: `1px solid ${edge}` }} />
            {k.label}
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 14, background: origin.fill, display: "inline-block", border: `1px solid ${origin.edge}` }} />
          {originLabel}
        </span>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          // The aspect-ratio is the box's BASIS, not its law: the format makes `.chart-plot` the one
          // shrinkable item under the figure's `max-height`, so this box takes the width it is given
          // and the height the window leaves. The two layers then COVER it; neither is stretched.
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        {/* THE FROZEN SECOND LAYER, photographed from THIS page's own live map. It is the whole
            picture when the key has lapsed, when the tiles are down, and when there is no script —
            and it is what the COMMITTED artifact always is, because the key never enters a file in
            this repository. */}
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
            plot's whole track rather than the cell inside it, which IS the ruling: a live map has no
            viewBox to be bound by, so it fills the width the figure has. */}
        <div className="map-layer" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{claimNote}</p>
      {/* SHOWN ONLY WHEN THE LIVE MAP IS UP. With no script, no key or no tiles, a sentence about
          dragging a map that cannot be dragged is a dead control. */}
      <p className="live-hint" hidden style={{ ...regs.annot, margin: "4px 0 0" }}>{liveHint}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>

      {/* EVERY READING, AS TEXT, WITH AND WITHOUT SCRIPT — AND THE GRAIN WITH IT. Each row's rate and
          swatch carry the vocabulary, so the three grains re-measure the table in pure CSS even when
          the map cannot. A native `<details>`: it opens with the keyboard and it opens with no
          script. It is also the one copy of what a pointer answers — the live map reads `data-detail`
          off the row rather than shipping a second copy inside the plan. */}
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
              {cells.map((c) => (
                <tr key={c.code} data-mark={c.code} data-detail={c.detail}>
                  <th scope="row" className="rowhead">{c.name}</th>
                  <td className="num">
                    {/* EVERY GRAIN'S NUMBER AT ONE PLACE, and the stylesheet reveals one. Digits
                        cannot interpolate and this does not pretend they can — what it refuses to do
                        is let a span travel to say so. */}
                    {c.isOrigin
                      ? c.figures[0].text
                      : c.figures.map((figure) => (
                          <span key={figure.slug} data-pool-figure={figure.slug}>{figure.text}</span>
                        ))}
                  </td>
                  <td className="num">{c.people}</td>
                  <td>
                    {/* THE SWATCH CARRIES NO COLOUR OF ITS OWN: an inline `style` beats every author
                        rule, so the default colour is a RULE (`poolCss` emits it for the opening
                        grain) and the cascade has only rules to compare. */}
                    <span
                      className={c.isOrigin ? "sw origin" : "sw"}
                      {...(c.isOrigin ? {} : poolAttrsFor(pool, c.code))}
                      {...(c.isOrigin ? { style: { background: origin.fill } } : {})}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>

      {/* THE PLAN THE LIVE LAYER READS, as `application/json` — which is also what the font machine
          reads when it decides which characters this page can display, so MapLibre's own control
          names and every cell label are cut into the embedded faces like every other word. */}
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
