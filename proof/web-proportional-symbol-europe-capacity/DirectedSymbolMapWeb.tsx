/**
 * EUROPE'S LOW-CARBON CAPACITY AS PROPORTIONAL SYMBOLS — one circle per country, its AREA the
 * installed capacity — drawn as MapLibre layers over MapTiler's own tiles and delivered as an
 * interactive page.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED, AND IT IS ARCHITECTURAL RATHER THAN COSMETIC.
 *
 * This beat used to draw 41 SVG circles over a baked plate, inside the format's plot CELL. An SVG
 * has a `viewBox`, so it has a ratio, so the width it may take is something somebody has to
 * arbitrate — and the owner refused every answer that arbitration produced, on this beat's own
 * renders: *"la map doit prendre toute la largeur quitte à afficher plus de map. Regarde le pilote
 * qu'on a produit dans scrolly, c'est presque la même sauf qu'avec web on peut avoir des contrôles,
 * zoom, déplacement et hover en plus directement dans MapTiler."* And: *"oui une carte MapLibre
 * plate pas un globe."*
 *
 * So every mark is now a MapLibre layer (`skills/map-web/assets/live-symbols.ts`), the map fills the
 * figure's whole track, the zoom, the drag, the wheel, the keyboard and the pointer are MapTiler's
 * own, and the picture beneath it is a PHOTOGRAPH OF THIS PAGE'S OWN LIVE MAP rather than a plate
 * baked from a second pipeline. `proof/web-choropleth-europe-lowcarbon/` is the validated pattern
 * and this is its second application.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE SURVIVES, AND WHAT IT COST.
 *
 * WHAT A PROPORTIONAL SYMBOL MAP HIDES IS THE EXPONENT OF ITS OWN SIZE SCALE. The ranking is right
 * under every law; the biggest circle is over the biggest country under every law; and the SPREAD
 * between the circles — the only thing the map is for — is a free parameter the author set in
 * silence. A symbol map has no axis; the only instrument on the page is a size legend the same
 * exponent drew.
 *
 * The control is therefore the exponent (`skills/map-web/assets/area-scale.ts`): three laws over the
 * same 41 circles at the same 41 places, the biggest pinned at the same radius in all three, so the
 * only cue that changes is the spread. It used to be PURE CSS — native radios, rules generated at
 * build time, no script at all.
 *
 * No stylesheet reaches a MapLibre circle layer. So the MAP's half of that gesture is now script:
 * one `setPaintProperty("circle-radius", …)` per law, over an expression built at BUILD time from
 * the same radii this component draws from. What a reader with no script keeps is the photograph,
 * the size legend under every law, the two derived sentences, and a table of all 41 readings whose
 * own swatches re-size under each law in pure CSS exactly as before — at 27,5 % of the map's own
 * scale, so 41 rows fit a disclosure, with every ratio between them intact because the anchor is
 * pinned and a common factor cancels. The gesture has not gone; it has moved from the picture to the
 * table, and the reading line says so.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE KEY MUST STAY TRUE AT EVERY ZOOM, AND THIS BEAT HAS ALREADY SHIPPED THE OTHER THING ONCE.
 *
 * A circle whose size encodes a VALUE holds its screen size as the reader zooms (`radius: "camera"`,
 * `shared/map-beat/mount.mjs`): the same capacity must not mean two circles at two zooms. A
 * dot-density dot would do the opposite — its GROUND area is what is constant, so it doubles per
 * zoom level — and MapLibre cannot tell the two apart, which is why the plan says which.
 *
 * The legend is HTML, outside the canvas, so it has to be sized by the same number. It is: the radii
 * travel in CSS pixels at a declared REVIEW CAMERA (a 1464 x 520 box, where the live scale is 1 by
 * definition), and the script multiplies the marks AND the swatches by that one scale, re-derived
 * only when the camera is re-fitted and never during a zoom. With no script at all the swatches fall
 * back to a fraction of the map box's own HEIGHT, which is the axis this fit binds on, so they track
 * the same ratio the frozen photograph is scaled by. The version this replaces drew a swatch radius
 * counted in the DRAWING's own viewBox units at 1:1 CSS pixels, in a cell that renders at no such
 * ratio: the 50 GW swatch came out bigger than the 96 GW circle it was meant to calibrate,
 * over-stating every magnitude by about 2x.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE OTHER THREE TREATMENTS, KEPT.
 *
 * `a-radius-is-not-read-by-eye` — the RESTING law is the area law and the vocabulary refuses any
 * other as a default. The key gives three named magnitudes and never a continuous ramp.
 *
 * `the-basemap-gives-up-its-contrast` — the live style is repainted in two quiet tints, so every
 * symbol reads against it.
 *
 * `an-overlap-accumulates-rather-than-occluding` — the symbols are translucent and MapLibre draws
 * them largest first, so a small one is never buried and an overlap reads as an overlap. That
 * translucency is why the mark that answers a pointer is measured on the COMPOSITE below and not on
 * its own fill: an opacity laid over a calibrated colour has already shipped 1,75:1 twice here.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  areaScaleChromeSpec,
  areaScaleCss,
  areaScaleNotesForMarkup,
  areaScaleOptionsForMarkup,
  keyBoxRadius,
  keyRadiiUnder,
  radiiUnder,
  type AreaScaleDeclaration,
} from "../../skills/map-web/assets/area-scale.ts";
import { liveSymbolsCss } from "../../skills/map-web/assets/live-symbols.ts";

/** One country's row and one country's mark. The RADIUS IS NOT HERE: it is derived from the scale
 *  declaration below, so the size the layers paint and the size the table draws cannot come from two
 *  places. */
export type Symbol_ = {
  key: string;
  name: string;
  /** The country's own capacity, in the beat's own words. */
  figure: string;
  /** Its rank in the field, printed so the table is readable as a table. */
  rank: number;
  detail: string;
};
/** One legend magnitude's words. Its radius, too, comes from the declaration. */
export type KeySize = { key: string; label: string };

const SCOPE = ".chart-figure";
/** `chart-stack-` on purpose — the format's discovery contract, see `area-scale.ts`'s header. */
const STACK_ID_PREFIX = "chart-stack";
/** How long the field takes to re-size. Long enough to read as one field changing law rather than as
 *  a cut, short enough that a reader comparing two laws is not waiting on it. It is also the number
 *  the live layer gives MapLibre's own `circle-radius-transition`, so the map and the table cross
 *  together instead of on two clocks. */
const TRAVEL_MS = 380;
/** THE TABLE'S SWATCHES ARE THE MAP'S OWN CIRCLES, AT 27,5 %. Forty-one rows at the map's own scale
 *  would be a 3 000 px column; at this factor the anchor is 11 px and every row is a line of text
 *  tall. Every RATIO between them is untouched — the anchor is pinned under every law, so a common
 *  factor cancels out of each state's transform — which is why the swatch can be reduced and the
 *  gesture cannot. The caption says the factor out loud. */
const ROW_SCALE = 0.275;

/**
 * EVERY COLOUR A MARK IS PAINTED IN, DERIVED ONCE AND READ BY BOTH HALVES.
 *
 * The component draws the legend's and the table's swatches from it; the runner hands the SAME
 * object to the live layer, which paints the MapLibre circles with it. Two derivations of one
 * palette is how a page ends up with a table calibrated to one colour and a map painted in another,
 * and neither guard can see it because each reads only its own mechanism.
 */
export function symbolPaint({
  ground,
  accent,
  ink,
}: {
  ground: string;
  accent: string;
  ink: string;
}) {
  /** THE GROUND EVERY MARK IS MEASURED AGAINST — the tint the live style paints its land in, and the
   *  tint the photograph beneath it was taken through. One colour, not two. */
  const landFill = mix(ground, ink, 0.1);
  const symbolFill =
    adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  /** How translucent a symbol is. The overlap treatment's whole substance, and the number every
   *  colour measurement on this page has to be taken THROUGH. */
  const opacity = 0.5;

  // THE RING CARRIES THE FLOOR, THE WASH CARRIES THE OVERLAP. A 50 %-translucent accent over the
  // live map's own land measures 2,19:1 against it on creme — under the non-text floor — and that is
  // not a defect to be fixed by making the symbols opaque, because opaque symbols in a dense field
  // draw a stacking order nobody chose. What clears the floor is the 1px ring at full strength, and
  // it is asserted here rather than assumed.
  if (contrast(symbolFill, landFill) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the symbol's ring is ${symbolFill} on a live land of ${landFill}, ` +
        `${contrast(symbolFill, landFill).toFixed(3)}:1 — under the ${NON_TEXT_CONTRAST_MIN}:1 ` +
        "non-text floor. The wash is translucent on purpose (an overlap must read as an overlap), " +
        "so the ring is the only thing that makes a mark's edge visible against the ground.",
    );

  // WHAT THE MARK BECOMES UNDER THE POINTER, MEASURED ON THE COMPOSITE THE PAGE REALLY PAINTS.
  //
  // The owner refused a dot plastered over a mark three times, and refused a FIXED dose that
  // measured 1,104:1 on nocturne. So the circle itself answers, moved off its own fill by the
  // smallest step of the direction's own ink that clears a measured gap — and the gap is measured
  // after the 50 % opacity, because the opacity halves every difference and a dose chosen on the
  // bare fill would arrive at the reader worth half of what it was calibrated to.
  //
  // "Darken" is the wrong verb and nocturne is why: there `--ink` is `#FFFFFF`, so the step that
  // moves a mark away from its neighbours LIGHTENS it. Every dose ends FURTHER from the ground than
  // it started, which is asserted rather than hoped for.
  const restComposite = mix(landFill, symbolFill, opacity);
  const markActive = (() => {
    for (let dose = 0.1; dose <= 0.95; dose += 0.02) {
      const moved = mix(symbolFill, ink, dose);
      const composite = mix(landFill, moved, opacity);
      if (contrast(composite, restComposite) < 1.14) continue;
      if (contrast(composite, landFill) < contrast(restComposite, landFill))
        throw new Error(
          `the mark that answers the pointer would be painted ${composite} over a land of ` +
            `${landFill} — ${contrast(composite, landFill).toFixed(3)}:1, CLOSER to the ground ` +
            `than the mark at rest (${contrast(restComposite, landFill).toFixed(3)}:1). The mark a ` +
            "reader is pointing at would be the least visible thing on the map.",
        );
      return moved;
    }
    throw new Error(
      `no dose of ${ink} moves ${symbolFill} 1,14:1 off itself once the ${opacity} opacity the ` +
        "overlap treatment needs has halved the difference — a reader could not see which circle " +
        "answered the pointer",
    );
  })();

  return { landFill, symbolFill, labelInk, markActive, opacity, ringWidth: 1 };
}

export function DirectedSymbolMapWeb({
  plate,
  symbols,
  keySizes,
  scale,
  reviewBox,
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
  symbols: Symbol_[];
  keySizes: KeySize[];
  /** The scale laws this beat hands the reader (`map-web/assets/area-scale.ts`). */
  scale: AreaScaleDeclaration;
  /** The camera the radii are stated at — the box the frozen photograph is taken in. The legend's
   *  script-free resting size is a fraction of THIS width, so it is exactly right at the window the
   *  beat is reviewed in and scales with the photograph everywhere else. */
  reviewBox: { width: number; height: number };
  /** The live map's plan and its boot script (`map-web/assets/live-symbols.ts`), built by the
   *  runner so the guard that reads the written page back can hold both halves against one index. */
  livePlan: Record<string, unknown>;
  liveScript: string;
  liveHint: string;
  /** MapLibre's own stylesheet and library, inlined rather than linked. A `<script src>` would trade
   *  the payload for a SECOND third-party host; inlining keeps the count at one — api.maptiler.com. */
  maplibreCss: string;
  maplibreJs: string;
  tableCaption: string;
  columns: string[];
  /** THE FROZEN PHOTOGRAPH of this page's own live map, already a data URI. */
  plate: string;
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

  const {
    landFill,
    symbolFill,
    labelInk,
    markActive,
    opacity: SYMBOL_OPACITY,
  } = symbolPaint({ ground, accent, ink });

  // ── THE SIZES, DERIVED ONCE FROM THE DECLARATION ────────────────────────────────────────────
  // The radii the layers paint, the swatches the legend draws and the swatches the table draws come
  // from the same two functions. Nothing on this page holds a second opinion about how big a circle
  // is.
  const defaultLaw = scale.options[0];
  const radii = radiiUnder(scale, defaultLaw);
  const keyRadii = keyRadiiUnder(scale, defaultLaw);
  /** The swatch box every legend row shares: the largest radius any magnitude takes under any law,
   *  plus the ring. Sized for the LARGEST law so a circle re-scaling never moves the word beside it,
   *  and shared across the three so the three words line up. In review pixels. */
  const keyBox =
    Math.max(...keySizes.map((k) => keyBoxRadius(scale, k.key))) + 1;
  /** The table's swatch box: the anchor's own radius at the reduced scale, the same for every row,
   *  so 41 words line up in a column and no row's height depends on its own datum. */
  const rowBox =
    Math.max(...symbols.map((s) => radii.get(s.key) as number)) * ROW_SCALE + 1;

  const scaleOptions = areaScaleOptionsForMarkup(scale, STACK_ID_PREFIX);
  const scaleNotes = areaScaleNotesForMarkup(scale);
  const chrome = areaScaleChromeSpec();

  const css = [
    // THE CONTROL'S DRAWING IS NOT WRITTEN HERE AND NOT COPIED FROM A SIBLING. `control-chrome.ts`
    // is the one place a directed control is drawn — the wash, the ring and the darkened words that
    // replaced the black slab the owner refused three times, plus the two flex measurements he
    // arbitrated. The vocabulary supplies only what was ever its own: a class stem and a note height
    // measured on this page's own longest sentence.
    controlChromeCss({ scope: SCOPE, ...chrome }),
    // THE GESTURE, IN PURE CSS, OVER THE HALF OF THE PAGE A STYLESHEET CAN STILL REACH: the 41 table
    // swatches and the 3 legend swatches. The map's half is script (`liveScript` below), because no
    // stylesheet reaches a MapLibre circle layer — and both halves are built from these same radii.
    areaScaleCss(scale, {
      scope: SCOPE,
      idPrefix: STACK_ID_PREFIX,
      travelMs: TRAVEL_MS,
    }),
    // THE LIVE LAYER'S OWN RULES: both layers take the plot's whole track rather than the cell, the
    // photograph gives way on `load` and only then, and the description of the controls is hidden
    // until there are controls to describe.
    liveSymbolsCss({ scope: SCOPE }),
    // The answer is five readings long and the format's tooltip box is 220px wide.
    `#tooltip { max-width: min(430px, 100vw - 32px); }`,
    // THE SIZE LEGEND'S OWN BOX, over the map's bottom-left corner — ocean under this camera in all
    // three filed directions, which is why it may sit there at all. It is opaque in the GROUND rather
    // than translucent: a legend drawn through the basemap it calibrates is a legend read against a
    // different colour in each of its three rows.
    // `container-type: size` and not `inline-size`: the legend's swatches are sized in `cqh`, for the
    // reason written where they are drawn — this camera is bound by the box's HEIGHT, so height is
    // the axis the live scale is a ratio of.
    `${SCOPE} .key-layer { position: relative; pointer-events: none; container-type: size; }`,
    `${SCOPE} .key { position: absolute; left: 1.4%; bottom: 4%; display: flex; flex-direction: column;` +
      ` align-items: flex-start; gap: 2px; padding: 5px 7px; background: ${ground};` +
      ` border: 1px solid ${grid}; border-radius: 3px; }`,
    `${SCOPE} .key-row { display: flex; align-items: center; gap: 5px; }`,
    `${SCOPE} .key-word { white-space: nowrap; }`,
    // THE TABLE IS THE GESTURE WITHOUT SCRIPT, so it is a real table and not a grid of divs: a
    // screen reader is given rows and columns, and the swatch in each row re-sizes under each law
    // exactly as the map's own circles do.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 1px 10px 1px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader, and still a plain cell to the eye: the
    // browser's own bold on `th` would make forty-one country names the heaviest ink on the page.
    // Named literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    // THE SWATCHES ARE HTML BOXES AND NOT SVG CIRCLES, AND THAT IS NOT A PREFERENCE.
    // Measured on this page with JavaScript disabled: the `:has(#…:checked)` rules `area-scale.ts`
    // emits DID reveal the right sentence and did NOT re-size an SVG `<circle>` — the circle kept
    // `matrix(1,0,0,1,0,0)` under every law while the note beside it changed correctly. It is the
    // same staleness the choropleth recorded at the end of its own live pass: a `:has()`
    // invalidation that reaches an HTML neighbour in one recalculation and leaves the SVG subtree on
    // the style it had. The gesture's whole promise without script is that these swatches follow the
    // law, so they are boxes with a 50 % radius, which is a circle a stylesheet can reach.
    // The wash is composited HERE rather than carried as an opacity: both of these sit on the page's
    // own ground (the legend paints it opaquely, the table inherits it), so the flat mix is the
    // colour a reader sees, and the ring stays at full strength — which is the half that carries the
    // non-text floor.
    `${SCOPE} .swatch { display: block; aspect-ratio: 1; border-radius: 50%; background: ${mix(ground, symbolFill, SYMBOL_OPACITY)}; border: 1px solid ${symbolFill}; box-sizing: border-box; }`,
    `${SCOPE} .key-box, ${SCOPE} .mw-table .rowsw { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }`,
    // THE ROW THE POINTER ANSWERS ON. `--mark-active` is what the format's own stylesheet reads off
    // a MARK to paint its fill; a table row is painted on its background instead, and the wash is
    // the same colour the live map moves the circle to, at the opacity the circle carries.
    `${SCOPE} tr[data-mark].mark-active { background-color: ${mix(ground, markActive, SYMBOL_OPACITY)}; }`,
    `${SCOPE} [data-mark] { --mark-active: ${markActive}; }`,
    `${SCOPE} details.mw-readings { margin: 8px 0 0; flex: 0 0 auto; }`,
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

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the map would otherwise only
          get from it. Each accessible name CONTAINS its visible one — `assertAreaScaleDeclaration`
          refuses the declaration otherwise (WCAG 2.5.3). */}
      <fieldset className={`chart-${chrome.name}`}>
        <legend>{scale.label}</legend>
        <div className="options">
          {scaleOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={STACK_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the distortion as a number, for a reader who is
          not looking at the circles. Its row is reserved and its sentences are stacked in one grid
          cell, so choosing a law never moves the map underneath it. The default law reveals none: it
          is not a counterfactual, it is the claim the title states. */}
      <div className={`${chrome.name}-notes`} role="status">
        {scaleNotes.map((note) => (
          <p
            key={note.slug}
            data-stack-note={note.slug}
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
        {/* LAYER 1: THE PHOTOGRAPH OF THIS PAGE'S OWN LIVE MAP, in this direction's own tints. It is
            what stands there when the key lapses, when the tiles fall over, when there is no network
            — and MapTiler invalidates ALL of an account's keys at 100 % of its spending limit, so the
            failure mode is every published map going blank at the same moment. It is also what the
            COMMITTED artifact always shows, because the key never enters a file in this repository.
            It draws no coastline of its own: it IS the live map, frozen. */}
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
        {/* LAYER 2: AN EMPTY BOX, AND THE SCRIPT IS WHAT PUTS A MAP IN IT. It takes the plot's whole
            track rather than the cell, which IS the ruling: a live map has no viewBox to be bound by,
            so it fills the width the figure has. `visibility: hidden` until MapLibre says it has
            drawn. */}
        <div className="map-layer" id="mw-map" aria-hidden="true" />
        {/* THE SIZE LEGEND, INSIDE THE MAP'S OWN BOX AND AT THE MAP'S OWN SCALE. A symbol map has no
            axis: this is the only instrument on the page for turning an area back into a quantity.
            Each swatch is drawn at the radius a mark of that value really has, in CSS pixels at the
            review camera — and the live script multiplies both by one number, so the two can never
            be calibrated differently.
            ITS SCRIPT-FREE RESTING SIZE IS A FRACTION OF THE MAP BOX'S OWN HEIGHT (`cqh`), AND THE
            AXIS IS THE WHOLE POINT. `fitBounds` binds on one axis; on a stage this wide it is always
            the height (measured: the fit is height-bound for any box wider than 1,16:1, and this one
            is 2,8:1), so the live camera's scale is exactly the box's height over the review box's.
            A swatch sized in `cqh` therefore tracks that scale with no script at all — and the frozen
            photograph, which covers the same box and whose aspect IS the box's aspect, is scaled by
            the same ratio. Sized in `cqw` the two agreed only at one window.
            Three rows rather than three columns: the words do not scale with the map (they are HTML
            at the register's own size, and a legend nobody can read is not a smaller legend), so a
            horizontal key is as wide as its words at every width and swamps a phone. */}
        <div className="key-layer" aria-hidden="true">
          <div className="key">
            {keySizes.map((k) => {
              // ONE BOX WIDTH FOR ALL THREE, and it is the LARGEST law's largest magnitude: the words
              // line up in a column instead of stepping in and out with their own circle, and no word
              // travels when the reader changes law. Its own HEIGHT is its own largest law's — only
              // the width has to be shared for three words to line up.
              const boxH = keyBoxRadius(scale, k.key) + 1;
              return (
                <span key={k.key} className="key-row" style={regs.axis}>
                  <span
                    className="key-box"
                    data-key-box=""
                    data-key-w={(keyBox * 2).toFixed(3)}
                    data-key-h={(boxH * 2).toFixed(3)}
                    style={{
                      width: `${(((keyBox * 2) / reviewBox.height) * 100).toFixed(4)}cqh`,
                      height: `${(((boxH * 2) / reviewBox.height) * 100).toFixed(4)}cqh`,
                    }}
                  >
                    <span
                      className="swatch"
                      data-key-symbol={k.key}
                      style={{
                        width: `${(((keyRadii.get(k.key) as number) * 2) / (keyBox * 2) * 100).toFixed(4)}%`,
                      }}
                    />
                  </span>
                  <span className="key-word">{k.label}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>
        {claimNote}
      </p>
      {/* SHOWN ONLY WHEN THE LIVE MAP IS UP. With no script, no key or no tiles, a sentence about
          dragging a map that cannot be dragged is a dead control, and this arrangement exists
          precisely not to ship one. Every glyph of it is in the markup, so the page's cut faces were
          made for it. */}
      <div className="live-hint" id="mw-hint" role="status" hidden>
        <p style={{ ...regs.annot, margin: "4px 0 0" }}>{liveHint}</p>
      </div>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>

      {/* EVERY READING, AS TEXT, WITH AND WITHOUT SCRIPT — and the editorial gesture with it. Each
          row's swatch carries the vocabulary, so the three laws re-size the field in pure CSS even
          when the map cannot, and each row carries the one copy of what its mark answers: the live
          map reads `data-detail` off this row rather than holding a second copy in its plan.
          A native `<details>`: it opens with the keyboard, it opens with no script, and ruling B5.2
          says a map's value table is collapsed. */}
      <details className="mw-readings">
        <summary style={regs.axis}>{tableCaption}</summary>
        <div className="mw-scroll">
          <table className="mw-table">
            <thead>
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    className={i === 0 ? undefined : "num"}
                    style={regs.axis}
                  >
                    {column}
                  </th>
                ))}
                <th scope="col" style={regs.axis} />
              </tr>
            </thead>
            <tbody>
              {symbols.map((s) => (
                <tr key={s.key} data-mark={s.key} data-detail={s.detail}>
                  <th scope="row" className="rowhead" style={regs.axis}>
                    {s.name}
                  </th>
                  <td className="num" style={regs.axis}>
                    {s.figure}
                  </td>
                  <td className="num" style={regs.axis}>
                    {s.rank}
                  </td>
                  <td>
                    <span
                      className="rowsw"
                      style={{ width: `${(rowBox * 2).toFixed(3)}px`, height: `${(rowBox * 2).toFixed(3)}px` }}
                    >
                      <span
                        className="swatch"
                        data-symbol={s.key}
                        style={{
                          width: `${(((radii.get(s.key) as number) * ROW_SCALE * 2) / (rowBox * 2) * 100).toFixed(4)}%`,
                        }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* THE SECOND LAYER, ADDED LAST — after everything it wires, so it needs no readiness dance of
          its own, and after the photograph, so the page a reader sees is COMPLETE before a line of it
          runs. The plan travels as JSON rather than baked into the script, because the font machine
          reads `application/json` payloads when it decides which characters this page can display (a
          word only a live map ever prints is in no text node and in no attribute). */}
      <script
        type="application/json"
        id="mw-live-plan"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(livePlan).replace(/</g, "\\u003c"),
        }}
      />
      <script dangerouslySetInnerHTML={{ __html: maplibreJs }} />
      <script dangerouslySetInnerHTML={{ __html: liveScript }} />
    </figure>
  );
}
