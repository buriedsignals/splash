// shared/map-beat/style.mjs
//
// THE STYLE IS AN OBJECT, NOT A URL — and that is the only way to change `glyphs`. Handed a URL,
// MapLibre reads MapTiler's endpoint before anyone has the handle, and `glyphs` has no setter: the
// only recourse would be a full `setStyle`, which restarts the style and carries away every layer
// just added to it.

const TEXTURE =
  /landcover|landuse|wood|forest|grass|park|scrub|sand|glacier|snow|ice|hillshade|shadow|highlight|pier|aeroway|building|tunnel|bridge|road|rail|path|ferry|transit/i;

export function transformStyle(styleDoc, { tints, glyphs, keepLabels = [] }) {
  const out = JSON.parse(JSON.stringify(styleDoc));
  out.glyphs = glyphs;

  for (const layer of out.layers) {
    layer.layout = layer.layout ?? {};
    layer.paint = layer.paint ?? {};

    const isLabel = layer.type === "symbol";
    const keep = isLabel && keepLabels.some((re) => re.test(layer.id));
    const isTexture =
      layer.type === "hillshade" ||
      layer.type === "raster" ||
      layer.type === "line" ||
      /border|boundary|admin/i.test(layer.id) ||
      (TEXTURE.test(layer.id) && !/water/i.test(layer.id));

    if ((isLabel && !keep) || isTexture) layer.layout.visibility = "none";

    if (layer.type === "background") layer.paint["background-color"] = tints.land;
    else if (layer.type === "fill" && /water|ocean|sea|river|lake/i.test(layer.id))
      layer.paint["fill-color"] = tints.water;
    else if (layer.type === "fill" && /land|earth/i.test(layer.id) && !/water/i.test(layer.id))
      layer.paint["fill-color"] = tints.land;
  }
  return out;
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
