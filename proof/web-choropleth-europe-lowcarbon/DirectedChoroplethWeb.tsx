/**
 * Europe's low-carbon electricity share by country, as a LIVE MapTiler map — every mark a MapLibre
 * layer over MapTiler's own tiles, with MapTiler's own zoom, pan and keyboard.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED ON 2026-09-15, AND WHY IT IS ARCHITECTURE RATHER THAN STYLE.
 *
 * The owner, on the proportional-symbol beat: *"la map doit prendre toute la largeur quitte à
 * afficher plus de map. Regarde le pilote qu'on a produit dans scrolly, c'est presque la même sauf
 * qu'avec web on peut avoir des contrôles, zoom, déplacement et hover en plus directement dans
 * MapTiler."* And, asked about the projection: *"oui une carte MapLibre plate pas un globe."*
 *
 * This page used to draw 41 country outlines as SVG `<path>`s over a baked plate. An SVG has a
 * `viewBox`, so it has a ratio, so how much width it may take is something somebody has to
 * arbitrate — and every answer that arbitration produced has now been refused. A LIVE map has no
 * viewBox: it fills its container and shows the ground that container gives it. The question does
 * not get settled, it stops existing. So the fills, the borders, the hollow country and the
 * pointed-at country are all MapLibre layers now, reading MapTiler's own Countries tileset joined
 * by ISO A2 — the same source and the same join as the scrolly pilot the owner validated.
 * `../../skills/map-web/assets/live-choropleth.ts` carries the arrangement and its refusals.
 *
 * THE PLATE IS STILL HERE, and it is what a reader gets when the live map cannot be shown: no
 * script, no key, no network, no tiles. MapTiler invalidates ALL of an account's keys at 100 % of
 * its spending limit, so "the map goes blank" is not a hypothetical failure, it is a Tuesday. The
 * committed artifact is always in that state, because the key never enters a file here.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND WHAT THE ARCHITECTURE COST IT.
 *
 * What a choropleth hides is not a value — it is that the PARTITION was a choice. On this file the
 * darkest band holds SEVEN countries under the stated threshold the headline names, TEN under
 * quantiles, and THIRTEEN under equal intervals and Fisher-Jenks alike. Two of those three are the
 * default of an ordinary mapping tool. The seven belongs to the SENTENCE; the map shows seven only
 * because somebody cut at 94. So the reader picks the RULE.
 *
 * THE COST, STATED. That gesture was pure CSS over SSR'd SVG: four native radios, rules generated
 * at build time, no script at all. No stylesheet can reach a MapLibre fill layer, so the MAP's half
 * of the gesture is now script — one `setPaintProperty` per rule, over an expression built at build
 * time from the same index the markup carries. What a reader with JavaScript off loses is the map
 * re-shading. What they keep is the plate, the legend's bounds and counts under every rule, the
 * derived sentence, and the 41-row table whose own swatches re-shade with the rule in pure CSS
 * exactly as before. The gesture did not go away without script; it moved from the picture to the
 * table.
 *
 * AND THE TWO HALVES DERIVE FROM ONE INDEX — `assertOneClassing` reads the markup's half back off
 * the written page, `assertClassingReachesTheLayers` reads the plan's half back off the same page,
 * and both are held against `buildClassingIndex`'s single answer.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WEB MERCATOR, AND WHAT IT COSTS THIS SUBJECT — MEASURED, NOT ASSERTED.
 *
 * A choropleth is read by AREA, and a flat MapLibre map is Web Mercator, which inflates the north.
 * That is not a defect to fix here: the owner has chosen the flat map knowing the trade. It is a
 * cost the page carries, so the page says it. Measured on this beat's own frozen shapes at this
 * camera, with Russia set aside (it is 81 % of the drawn land and only a slice of it is in frame):
 *
 *   Norway, Sweden and Finland cover 31,8 % of the land this map draws and hold 16,6 % of the land
 *   that is really there. Per square kilometre, against France = 1: Norway ×2,61, Finland ×2,58,
 *   Iceland ×2,64, Sweden ×2,29. The seven countries above 94 % take 42,1 % of the page for 27,5 %
 *   of the ground.
 *
 * The runner prints all of it on every render, and the caveat carries the first pair in the
 * reader's own words: a reader who is not told reads ink as area.
 *
 * The headline is a COUNT of countries above a stated break, and a count survives the inflation
 * untouched. The PICTURE does not: the dark arc across the north is about twice the page it would
 * be on an equal-area camera. The caveat says so in the reader's own words, because a reader who is
 * not told reads the ink as area. `camera.ts` — Lambert azimuthal equal-area, EPSG:3035 — stays in
 * the beat as the camera that MEASURES, and the runner prints both.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * `the-key-names-its-classes-in-their-own-colours` — the key is the classes, in their own swatches,
 * with their own bounds in per cent AND their own population, under whichever rule is in force.
 * `the-ramp-is-monotone-in-lightness` — the classes step in one direction only, so the order
 * survives a monochrome print and a colour-vision deficiency. FOUR classes and not five: the ramp
 * below is walked in contrast against the LAND the plate actually paints and refuses a rung a
 * reader could not tell from its neighbour.
 * `a-missing-cell-is-drawn-as-missing` — a country the file has no reading for is drawn hollow, in
 * the basemap's own land, dashed, and named as missing; never left in the lowest class and never
 * handed to a classing rule as a number it is not.
 *
 * THE SHAPE IS WHAT ANSWERS A POINTER, NEVER A DOT ON TOP OF IT — the owner's second arbitration,
 * now held by MapLibre rather than by a hit test of ours: `queryRenderedFeatures` answers anywhere
 * inside the polygon, and the country is redrawn in a colour searched off ITS OWN fill until a
 * measured separation is cleared. Because the fill travels with the rule, so does the darkening.
 *
 * WHAT THE ANSWER SAYS, AND THE ONE THING IT NEVER SAYS. The exact share, the low-carbon TWh out of
 * the total, the rank among the forty, and whether the country keeps the same class under all four
 * rules. It does not name the class it is in: a baked string naming "palier 70–94 %" would be a lie
 * under three rules out of four. The colour says the class; the pointer says the number the class
 * hides. The two readings do not overlap.
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
  assertClassingDeclaration,
  buildClassingIndex,
  classingAttrs,
  classingBoundsForMarkup,
  classingCss,
  classingKeyCss,
  classingNotesForMarkup,
  classingOptionsForMarkup,
  type ClassingDeclaration,
  type ClassingReading,
} from "../../skills/map-web/assets/classing.ts";
import { liveChoroplethCss } from "../../skills/map-web/assets/live-choropleth.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `chart-stack-` is the FORMAT'S DISCOVERY CONTRACT for a
 *  control that changes the picture and owes the reader a sentence, not a copy-paste slip: see
 *  `classing.ts`, "IT EMITS `data-stack-note`". */
const CLASSING_ID_PREFIX = "chart-stack";
/** How long a country takes to cross from one class's colour to the next, in ms. Honoured only
 *  under `no-preference` — the travel is the reading, so a reader who asked for no motion gets the
 *  new partition instantly rather than not at all. The live map is given the SAME number, so the
 *  map and the table's swatches cross together rather than on two clocks. */
export const CHANGE_MS = 260;
/** How far apart two neighbouring classes have to stand before a reader can tell them apart.
 *  Refused, not hoped for. */
const RAMP_STEP_MIN = 1.2;
/** How much darker than its own fill a pointed-at country has to be before it counts as answering.
 *  A DOSE IS SEARCHED, NEVER SET: a fixed dose was refused at 1,104:1 on nocturne, one beat over. */
const MARK_SEPARATION = 1.4;

export type Reading = {
  /** ISO A3, the key this beat's own data and shapes are frozen on. */
  code: string;
  /** ISO A2, the key MapTiler's Countries tileset is keyed on — the join, declared and checked. */
  iso2: string;
  name: string;
  /** What the pointer answers: everything the table does not print. */
  detail: string;
  /** What the table prints at rest. */
  sharePc: string;
  rank: string;
  /** False for the one country the file has no reading for: drawn hollow, in no rule's partition. */
  classed: boolean;
};

/**
 * THE RAMP AND THE DARKENING, derived once and read by both halves of the page.
 *
 * Exported because the RENDERER needs the same colours the markup is drawn in: the live plan's
 * per-rule fill expressions are built from them, and a second derivation is exactly the
 * "two derivations of one partition" this beat's guards exist to refuse.
 */
export function choroplethRamp({
  ground,
  accent,
  ink,
  plateLand,
  tones,
}: {
  ground: string;
  accent: string;
  ink: string;
  plateLand: string;
  tones: number;
}): { ramp: string[]; activeRamp: string[]; edge: string } {
  /**
   * THE RAMP, ANCHORED ON THE LAND AND NOT ON THE PAGE.
   *
   * A class here is painted over the basemap, not over the paper: what sits behind a country is
   * `plateLand`, a step off the direction's ground toward its ink. Measuring the lightest class
   * against the GROUND — which is what this beat did before — reported 3,02:1 in creme while the
   * colour a reader actually sees it on gave 2,58:1, under the non-text floor. That is the trap the
   * brief names by hand: measure against the colour the page really paints.
   *
   * AND IT CARRIES FOUR RUNGS, NOT FIVE, WHICH IS A MEASUREMENT AND NOT A TASTE. On five rungs the
   * neighbouring steps measured 1,165 / 1,170 / 1,169 / 1,183:1 in creme and 1,187 / 1,191 / 1,195
   * in rapport — under the 1,2:1 this beat asks of two classes a reader has to tell apart on a map
   * where the two shapes may be a thousand kilometres apart.
   */
  const floor = (() => {
    for (let step = 0; step <= 400; step += 1) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN)
        return candidate;
    }
    throw new Error(
      `no tint of the accent ${accent} stands ${NON_TEXT_CONTRAST_MIN}:1 off the land ${plateLand} ` +
        `the plate is baked in — the lightest class would be indistinguishable from a country ` +
        `outside the study, which is the one thing a choropleth may never let happen`,
    );
  })();
  const lo = contrast(floor, ground);
  const hi = contrast(accent, ground);
  const ramp = Array.from({ length: tones }, (_, i) => {
    const target = lo * Math.pow(hi / lo, i / (tones - 1));
    for (let step = 0; step <= 400; step += 1) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, ground) >= target) return candidate;
    }
    return accent;
  });
  for (let i = 1; i < ramp.length; i += 1) {
    const separation = contrast(ramp[i], ramp[i - 1]);
    if (separation < RAMP_STEP_MIN)
      throw new Error(
        `classes ${i} and ${i + 1} are ${ramp[i - 1]} and ${ramp[i]}, which stand ` +
          `${separation.toFixed(3)}:1 apart — under the ${RAMP_STEP_MIN}:1 this beat asks of two ` +
          `classes a reader has to tell apart across a map. One hue between ${hi.toFixed(2)}:1 and a ` +
          `floor of ${lo.toFixed(2)}:1 set by the basemap's own land carries only so many levels; ` +
          `past four, name rather than shade.`,
      );
  }

  /**
   * WHAT A POINTED-AT COUNTRY BECOMES, SEARCHED OFF ITS OWN FILL. Not a fixed dose and not a
   * filter: a `brightness()` lightens on a light ground and on a dark one alike, and a fixed mix
   * measured 1,104:1 on nocturne one beat over. The dose is walked up until the result stands
   * `MARK_SEPARATION` from the fill it replaces AND still clears the non-text floor against the
   * land it sits on — refused rather than approximated.
   */
  const activeFor = (fill: string) => {
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      const candidate = mix(fill, ink, dose);
      if (
        contrast(candidate, fill) >= MARK_SEPARATION &&
        contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `no dose of ink separates a pointed-at country from its own fill ${fill} by ` +
        `${MARK_SEPARATION}:1 while staying ${NON_TEXT_CONTRAST_MIN}:1 above the land ${plateLand}. ` +
        `A country that answers by becoming a colour the reader cannot tell from the one beside it ` +
        `has not answered.`,
    );
  };

  const edge =
    adjustToContrast(mix(ground, ink, 0.35), plateLand, 1.6) ??
    mix(ground, ink, 0.35);
  return { ramp, activeRamp: ramp.map(activeFor), edge };
}

export function DirectedChoroplethWeb({
  plate,
  plateLand,
  readings,
  classingReadings,
  classing,
  missingLabel,
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
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  readings: Reading[];
  classingReadings: ClassingReading[];
  classing: ClassingDeclaration;
  missingLabel: string;
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
  /** The LAND colour that plate was baked in — the colour the page actually paints behind every
   *  country, and therefore the only honest thing to measure the lightest class against. */
  plateLand: string;
  /** The live map's plan, as the object that will be serialised into the page. */
  livePlan: Record<string, unknown>;
  /** The live map's own script, already assembled by `live-choropleth.ts`. */
  liveScript: string;
  /** What the live map's controls do, shown ONLY once the live map is actually up. */
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

  const tones = classing.classes;
  const { ramp, activeRamp, edge } = choroplethRamp({
    ground,
    accent,
    ink,
    plateLand,
    tones,
  });

  assertClassingDeclaration(classing, classingReadings);
  const index = buildClassingIndex(classing, classingReadings);
  const options = classingOptionsForMarkup(classing, CLASSING_ID_PREFIX);
  const notes = classingNotesForMarkup(classing);
  const bounds = classingBoundsForMarkup(classing);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "classing",
      notes: { reserve: null, stacked: true },
      extra: classingKeyCss({ scope: SCOPE }),
    }),
    classingCss(classing, {
      scope: SCOPE,
      idPrefix: CLASSING_ID_PREFIX,
      fillOf: (klass) => ramp[klass],
      activeOf: (klass) => activeRamp[klass],
      changeMs: CHANGE_MS,
      // The table's swatch is a box, so the class it wears is its background — see `classing.ts`.
      property: "background-color",
    }),
    liveChoroplethCss({ scope: SCOPE }),
    // The answer is four readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 320px; }`,
    // THE TABLE IS THE GESTURE WITHOUT SCRIPT, so it is a real table and not a grid of divs: a
    // screen reader is given rows and columns, and the swatch in each row re-shades with the rule
    // exactly as the map's own fill does.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader, and still a plain cell to the eye: the
    // browser's own bold on `th` would make forty-one country names the heaviest ink on the page.
    // Named literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    `${SCOPE} .mw-table .sw { display: block; width: 14px; height: 14px; box-sizing: border-box; border: 1px solid ${edge}; }`,
    // The one country with no reading: hollow and dashed here exactly as it is hollow and dashed on
    // the map, and in no rule's partition, so no generated rule ever gives it a colour.
    `${SCOPE} .mw-table .sw.missing { background: transparent; border-style: dashed; }`,
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

      {/* THE KEY NAMES ITS CLASSES IN THEIR OWN COLOURS, says how many countries each holds under the
          rule in force, and says what a hollow shape means. Every rule's label for a class sits in
          one grid cell, so the chip is as wide as the longest of the four and the rank cannot reflow
          when the reader changes rule. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 12px",
          margin: "8px 0 4px",
          flex: "0 0 auto",
        }}
      >
        {bounds.map((variants, klass) => (
          <span
            key={klass}
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                background: ramp[klass],
                display: "inline-block",
                border: `1px solid ${edge}`,
              }}
            />
            <span className="classing-bounds">
              {variants.map((variant) => (
                <span key={variant.slug} data-classing-bound={variant.slug}>
                  {variant.text}
                </span>
              ))}
            </span>
          </span>
        ))}
        <span
          style={{
            ...regs.axis,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              background: "transparent",
              display: "inline-block",
              border: `1px dashed ${edge}`,
            }}
          />
          {missingLabel}
        </span>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the rule's full name where the pill carries its short one. */}
      <fieldset className="chart-classing">
        <legend>{classing.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={CLASSING_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT THE CHOSEN RULE DOES TO THE READING. Every sentence sits in one grid cell, so the row
          is always as tall as the longest of them and choosing a rule never moves the map. The
          plate's own rule gets none: the untouched map is the claim, not a comparison. */}
      <div className="classing-notes" role="status">
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
          // is given and the height the window leaves — which is exactly what the scrolly's stage
          // does. The two layers then COVER it; neither is stretched.
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        {/* THE FALLBACK. One `<svg class="chart">` carrying one thing: the plate this beat's own
            camera baked, in this direction's own tints. It is the format's cell contract (the cell
            carries this box's ratio, so nothing is ever stretched) and it is the whole picture when
            the live map cannot be shown. It draws no country outline of its own: the plate already
            carries MapTiler's geography, and a second coastline over it is the doubled basemap
            `style.mjs` refuses by name. */}
        <svg
          role="img"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          // COVER, never stretch and never letterbox: `slice` is SVG's `object-fit: cover`, which is
          // what the scrolly's own fallback images use.
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
            plot's whole track rather than the cell, which IS the ruling: a live map has no viewBox
            to be bound by, so it fills the width the figure has. */}
        <div className="map-layer" aria-hidden="true" />
        <div className="x-axis" />
      </div>

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

      {/* EVERY READING, AS TEXT, WITH AND WITHOUT SCRIPT — and the classing gesture with it. Each
          row's swatch carries the vocabulary, so the four rules re-partition the table in pure CSS
          even when the map cannot. A native `<details>`: it opens with the keyboard, it opens with
          no script, and it is the one control on this page that was never at risk. */}
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
                      i > 0 && i < columns.length - 1 ? "num" : undefined
                    }
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.code} data-mark={r.iso2} data-detail={r.detail}>
                  <th scope="row" className="rowhead">
                    {r.name}
                  </th>
                  <td className="num">{r.sharePc}</td>
                  <td className="num">{r.rank}</td>
                  <td>
                    {/* THE SWATCH IS AN HTML BOX, and it carries NO COLOUR OF ITS OWN — both of
                        which are measurements rather than preferences.
                        A box, because as an SVG `<rect>` its re-shading depended on a `:has()`
                        invalidation reaching an inherited SVG presentation property, and that was
                        measured going stale in Chrome while an HTML sibling carrying the same
                        attribute updated in the same recalculation.
                        No colour of its own, because an inline `style` beats every author rule: the
                        `fill="…"` a `<rect>` carried was a PRESENTATION ATTRIBUTE, which any rule
                        outranks, and its HTML equivalent has no such floor. Written as an inline
                        background, the swatch matched all four rules and painted the first one under
                        every single rule — the table looked right and answered one question with the
                        previous question's picture. The default colour is a rule now
                        (`classingCss` emits it for the opening rule), so the cascade has only rules
                        to compare. */}
                    <span
                      className={r.classed ? "sw" : "sw missing"}
                      data-mark={r.iso2}
                      {...classingAttrs(index, r.classed ? classing : null, r.iso2)}
                    />
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
