// twin/shared/map-beat/plan.mjs
//
// THE CONTRACT THAT MAKES A MAP A MAP. A beat does not draw; it declares a PLAN — a MapTiler style
// with this beat's transformations, a camera, and the layers the beat owns. Four renderers consume
// it: the still, the video, the web page, the scrolly.
//
// Every rule enforced here comes from a defect the September 2026 spike hit in silence. MapLibre
// refuses nothing: a duplicated id, a missing glyph range, an invalid expression — all of them go
// unreported. What is not measured here is not measured anywhere.

/** A plan is frozen: a renderer that could mutate it is a renderer that could disagree with the
 *  still beside it. */
export function makePlan({ style, camera, layers }) {
  return Object.freeze({
    style,
    camera: Object.freeze({ ...camera }),
    layers: Object.freeze(layers.map((l) => Object.freeze({ ...l }))),
  });
}

export function validatePlan(plan) {
  const out = [];

  /** TWO LAYERS CANNOT SHARE AN ID. MapLibre keeps the first and drops the second without a word:
   *  on the locator beat, the label layer was named after the circle layer and six cities stayed
   *  anonymous for a full render cycle. */
  const seen = new Set();
  for (const layer of plan.layers) {
    if (seen.has(layer.id))
      out.push(
        `two layers share the id "${layer.id}" — MapLibre keeps the first and drops the second without an error`,
      );
    seen.add(layer.id);
  }

  /** THE DRAWN SIZE IS A LAYOUT OUTPUT, NOT A SETTING. A plate baked at a size it is not drawn at
   *  makes every absolute length wrong by the ratio — 1.74 times too thin on the first three types
   *  the spike converted, and differently wrong per direction on the flow map. */
  if (!plan.camera.drawn?.width || !plan.camera.drawn?.height)
    out.push("the plan carries no drawn size — the layout must publish it before the bake");

  return out;
}
