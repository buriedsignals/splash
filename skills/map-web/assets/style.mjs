// twin/shared/map-beat/style.mjs
//
// THE STYLE IS AN OBJECT, NOT A URL — and that is the only way to change `glyphs`. Handed a URL,
// MapLibre reads MapTiler's endpoint before anyone has the handle, and `glyphs` has no setter: the
// only recourse would be a full `setStyle`, which restarts the style and carries away every layer
// just added to it.

const TEXTURE =
  /landcover|landuse|wood|forest|grass|park|scrub|sand|glacier|snow|ice|hillshade|shadow|highlight|pier|aeroway|building|tunnel|bridge|road|rail|path|ferry|transit/i;

/**
 * THE ONE DECISION, TAKEN ONCE, FOR BOTH WAYS A STYLE CAN BE CHANGED.
 *
 * A static bake is handed a style DOCUMENT and edits it before MapLibre ever sees it. A live map is
 * handed a style URL, so by the time anything can speak to it the style is already loaded and the
 * only handles are `setLayoutProperty` and `setPaintProperty`. Two mechanisms — and until this
 * function existed, two rulebooks: the bake swept every layer by the regexes below while the live
 * layer named `["Water", "Water shadow"]` by hand and painted them a hard-coded blue. The two agree
 * only as long as MapTiler keeps those exact ids and nobody edits one list. When they disagree the
 * fallback plate and the live map under it are different cartography, and the swap is visible.
 *
 * So the rule is stated once and applied twice. Returns what to do with ONE layer:
 *   `hidden`   — this layer does one of the jobs the beat's own marks do, so it goes;
 *   `property` — the paint property carrying this layer's colour, or null when it carries none;
 *   `colour`   — what that property becomes.
 */
export function styleDecisionFor(layer, { keepLabels = [], keepTextures = [] } = {}) {
  const isLabel = layer.type === "symbol";
  const keep = isLabel && keepLabels.some((re) => re.test(layer.id));
  const isTexture =
    layer.type === "hillshade" ||
    layer.type === "raster" ||
    layer.type === "line" ||
    /border|boundary|admin/i.test(layer.id) ||
    (TEXTURE.test(layer.id) && !/water/i.test(layer.id));
  /** …AND THE ONE THING A BEAT MAY ASK TO KEEP, having said why.
   *
   *  The sweep above was written for a CONTINENT, where a road network is noise over a choropleth.
   *  At CITY scale it is the opposite: `proof/mapgen-locator-web` frames 4 km of Geneva, and the
   *  streets are how a reader places eleven markers against a city they may know. Putting that beat
   *  on this sweep took the whole network out of its plate in one step, and nothing said so — the
   *  plate simply came back 3x smaller and emptier.
   *
   *  So a beat may name what it keeps, and naming it is the point: `keepTextures: [/road/i]` is a
   *  sentence in the beat's own file about what its geography needs, which is a different thing from
   *  a sweep that never ran. The default is still to hide everything. */
  /** AND IT NEVER BRINGS A LABEL BACK. `isLabel` is checked first, deliberately: a beat asking to
   *  keep its street network writes `/road/i`, and `dataviz-light` calls one of its SYMBOL layers
   *  `Road labels`. Measured in a real browser the moment this hatch was opened — the live map came
   *  back with the provider's street names printed across it, which breaks the one line §2 of
   *  `references/map-plan.md` draws (the beat writes every word inside the map) and, worse, hands
   *  MapTiler a font stack nobody in this beat chose. That is the exact door guard 2 exists behind:
   *  MapTiler answers 200 for a family it does not have and serves Noto Sans. A texture is a
   *  texture; a word is a word. */
  const kept = isTexture && !isLabel && keepTextures.some((re) => re.test(layer.id));
  return { hidden: ((isLabel && !keep) || isTexture) && !kept, ...paintDecisionFor(layer) };
}

function paintDecisionFor(layer) {
  if (layer.type === "background") return { property: "background-color", tint: "land" };
  if (layer.type === "fill" && /water|ocean|sea|river|lake/i.test(layer.id))
    return { property: "fill-color", tint: "water" };
  if (layer.type === "fill" && /land|earth/i.test(layer.id) && !/water/i.test(layer.id))
    return { property: "fill-color", tint: "land" };
  return { property: null, tint: null };
}

export function transformStyle(styleDoc, { tints, glyphs, keepLabels = [], keepTextures = [] }) {
  const out = JSON.parse(JSON.stringify(styleDoc));
  out.glyphs = glyphs;

  for (const layer of out.layers) {
    layer.layout = layer.layout ?? {};
    layer.paint = layer.paint ?? {};
    const { hidden, property, tint } = styleDecisionFor(layer, { keepLabels, keepTextures });
    if (hidden) layer.layout.visibility = "none";
    if (property && tints[tint]) layer.paint[property] = tints[tint];
  }
  return out;
}

/**
 * THE SAME DECISION, APPLIED TO A MAP THAT HAS ALREADY LOADED ITS STYLE. Call it on `style.load`:
 * before that `getStyle()` has no layers, and after `load` the reader has already seen the frame
 * the beat did not choose.
 *
 * `map.getStyle().layers` is read ONCE into an array, because `setLayoutProperty` mutates the live
 * style and iterating what you are editing is how a sweep comes to skip every second layer.
 *
 * It returns what it did — how many layers it hid and how many it re-tinted — so a caller can
 * REFUSE a style that answered nothing. A sweep that matched no water layer at all leaves MapTiler's
 * own near-grey `dataviz-light` water under a beat whose plate is blue, and nothing reports it: that
 * is the silence this whole trunk exists to end, and the count is what turns it into a number.
 */
export function applyLiveStyle(map, { tints, keepLabels = [], keepTextures = [] }) {
  const layers = [...map.getStyle().layers];
  let hidden = 0;
  let tinted = 0;
  for (const layer of layers) {
    const decision = styleDecisionFor(layer, { keepLabels, keepTextures });
    if (decision.hidden && map.getLayer(layer.id)) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      hidden += 1;
    }
    /** A BEAT PAINTS THE TINTS IT MEASURED, AND ONLY THOSE. `plateTints` answers `water` and `land`
     *  together, but a beat whose plate leaves the provider's land alone names only `water` — and
     *  painting an unnamed tint would be `undefined` reaching `setPaintProperty`, which MapLibre
     *  takes as "reset to the style's default" rather than as an error. Leaving it is a stated
     *  choice; `assertLiveStyleAnswered` below is what catches the case where NOTHING matched. */
    if (decision.property && tints[decision.tint] && map.getLayer(layer.id)) {
      map.setPaintProperty(layer.id, decision.property, tints[decision.tint]);
      tinted += 1;
    }
  }
  return { hidden, tinted };
}

/** A LIVE STYLE THAT ANSWERED NOTHING IS NOT A QUIET STYLE. `dataviz-light` carries a background, a
 *  water fill and dozens of symbol layers, so a sweep that re-tinted nothing did not find the style
 *  it was written against — a renamed layer, a different MapTiler style, a style that never loaded.
 *  The plate would still be blue and the live map under it would not, and the two are meant to be
 *  one cartography. */
export function assertLiveStyleAnswered(result, styleName) {
  /** Returns the result it was handed, so a caller reads `assert…(apply…(map, …), style)` and there
   *  is no second variable for the two to come apart in. */
  if (result.tinted > 0) return result;
  throw new Error(
    `the live style "${styleName}" carries no layer this beat's tints apply to: ${result.hidden} layers ` +
      `were hidden and NONE was re-tinted, so the reader's map keeps the provider's own water while ` +
      `the fallback plate under it is painted in the beat's. Two cartographies, one swap, no error`,
  );
}

/** ONE BASEMAP, NOT TWO. Repainting land or coastline from the beat's own shapefile lays a second
 *  geography over MapTiler's: two datasets that do not draw the same coast, offset by a hair, with a
 *  halo around Iceland and Norway to show for it. A layer that means to say "this belongs to the
 *  study" says it by tint, never by redrawing the ground. */
export function assertNoDoubledBasemap(plan) {
  for (const layer of plan.layers)
    if (layer.role === "basemap-land" || layer.role === "basemap-coast")
      throw new Error(
        `layer "${layer.id}" carries role "${layer.role}": the basemap would be doubled. MapTiler ` +
          `draws the geography — at its own resolution, consistent with its own waters. A beat layer ` +
          `marks what belongs to its study; it does not redraw the ground`,
      );
}
