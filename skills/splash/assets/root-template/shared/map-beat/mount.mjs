// twin/shared/map-beat/mount.mjs
//
// MOUNTING A PLAN IN A LIVE MAP, and the one class of mistake MapLibre swallows whole: an expression
// that is almost valid. `text-offset` accepts a literal pair, or ONE expression that returns a pair
// — but an ARRAY of expressions is neither, and the layer renders nothing at all. No warning, no
// error, just an empty layer that looks like a data problem for an hour.

/** Property names whose value is a pair of numbers, and which therefore cannot be assembled from two
 *  expressions. */
const PAIR_PROPERTIES = ["text-offset", "icon-offset", "text-translate", "icon-translate"];

const isExpression = (v) => Array.isArray(v) && typeof v[0] === "string";

export function validateExpressions(plan) {
  const out = [];
  for (const layer of plan.layers) {
    for (const prop of PAIR_PROPERTIES) {
      const value = layer.layout?.[prop] ?? layer.paint?.[prop];
      if (value === undefined) continue;
      if (isExpression(value)) continue;
      if (Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number")) continue;
      out.push(
        `layer "${layer.id}": "${prop}" is an array of expressions — MapLibre rejects it and the layer draws nothing`,
      );
    }
  }
  return out;
}

/** Run inside the page. Sources first, then layers in plan order — a leader drawn over its own word
 *  is a scratch. */
export function mountPlan(map, plan) {
  for (const layer of plan.layers)
    if (!map.getSource(layer.id)) map.addSource(layer.id, { type: "geojson", data: layer.data });
  for (const layer of plan.layers)
    map.addLayer({
      id: layer.id,
      type: layer.type,
      source: layer.id,
      ...(layer.minzoom === undefined ? {} : { minzoom: layer.minzoom }),
      ...(layer.maxzoom === undefined ? {} : { maxzoom: layer.maxzoom }),
      ...(layer.layout ? { layout: layer.layout } : {}),
      ...(layer.paint ? { paint: layer.paint } : {}),
    });
}
