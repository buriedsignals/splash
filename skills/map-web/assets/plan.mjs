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

/** TWO LAYERS CANNOT SHARE AN ID. MapLibre keeps the first and drops the second without a word: on
 *  the locator beat, the label layer was named after the circle layer and six cities stayed
 *  anonymous for a full render cycle. Shared by every renderer, because every renderer mounts the
 *  same layers. */
function duplicateIdComplaints(layers) {
  const out = [];
  const seen = new Set();
  for (const layer of layers) {
    if (seen.has(layer.id))
      out.push(
        `two layers share the id "${layer.id}" — MapLibre keeps the first and drops the second without an error`,
      );
    seen.add(layer.id);
  }
  return out;
}

export function validatePlan(plan) {
  const out = duplicateIdComplaints(plan.layers);

  /** THE DRAWN SIZE IS A LAYOUT OUTPUT, NOT A SETTING. A plate baked at a size it is not drawn at
   *  makes every absolute length wrong by the ratio — 1.74 times too thin on the first three types
   *  the spike converted, and differently wrong per direction on the flow map. */
  if (!plan.camera.drawn?.width || !plan.camera.drawn?.height)
    out.push("the plan carries no drawn size — the layout must publish it before the bake");

  return out;
}

/**
 * THE SAME PLAN, READ BY THE RENDERER THAT RUNS IN A READER'S BROWSER.
 *
 * A web beat's plan is a FILE before it is an object: it is serialised into the page as JSON and
 * read back by a script that never met the code that wrote it. `Object.freeze` does not survive that
 * journey and neither does anything else the writer checked — so the reader checks again, which is
 * this contract's own rule (`references/map-plan.md` §1: "A plan is a FILE; whoever draws from it
 * validates it"). Until this existed the live layer validated NOTHING: a duplicate id, a missing
 * camera fact or a plan truncated by a broken render all reached MapLibre, which reports none of
 * them.
 *
 * The four facts beyond `validatePlan`'s own are the ones a LIVE camera needs and a baked one does
 * not, and each was a real refusal already written by hand in one beat and missing from the next:
 *
 *   `styleUrl`        — what MapLibre loads. Absent, the map boots on nothing and stays blank.
 *   `frame`           — the plate's own drawn size, this plan's answer to `camera.drawn`.
 *   `degreesPerPixel` — the bake's ground scale. Every mark's drawn size is a RATIO against it, so
 *                       a plan without it has no scale to draw a mark at, only a box to guess from.
 *   `studyBounds`     — what the camera fits to at runtime. The plate's own corners are the wrong
 *                       box (they were computed for the plate's aspect, not the reader's), and
 *                       handing them over as a leash cropped six of thirteen points once already.
 *
 * Returns a list of strings, never throws — the same shape `validatePlan` takes, so a caller can
 * decide whether an empty list is required or merely expected.
 */
export function validateLivePlan(plan) {
  if (!plan || typeof plan !== "object") return ["the page carries no live plan at all"];
  const out = duplicateIdComplaints(plan.layers ?? []);

  if (typeof plan.styleUrl !== "string" || plan.styleUrl === "")
    out.push("the plan carries no style URL — the live map would boot on nothing and stay blank");
  if (!plan.frame?.width || !plan.frame?.height)
    out.push("the plan carries no drawn size — the layout must publish it before the bake");
  if (!(plan.degreesPerPixel > 0))
    out.push(
      "the plan carries no `degreesPerPixel` — this plate predates the camera facts, and a mark has " +
        "no ground scale to be drawn at, only a box to be guessed from",
    );

  const b = plan.studyBounds;
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  if (!b || !["west", "east", "south", "north"].every((k) => finite(b[k])))
    out.push("the plan carries no `studyBounds` — the live camera has nothing to fit to at runtime");
  else if (!(b.west < b.east) || !(b.south < b.north))
    out.push(
      `the plan's \`studyBounds\` are inverted (${b.west},${b.south} to ${b.east},${b.north}) — ` +
        `\`fitBounds\` answers an inverted box by framing the rest of the world`,
    );

  /** A GROUND-SCALED LAYER INTERPOLATES ITS RADIUS FROM THE BAKED CAMERA. Without `bakeZoom` the
   *  interpolation's own stops are `NaN`, MapLibre rejects the expression, and the layer draws
   *  nothing — the silent-empty-layer shape again. Only asked of a plan that has such a layer. */
  if ((plan.layers ?? []).some((l) => l.radius === "ground") && !Number.isFinite(plan.bakeZoom))
    out.push(
      "a layer is scaled to the GROUND but the plan carries no `bakeZoom`: the interpolation's own " +
        "stops would be NaN and MapLibre draws an empty layer rather than reporting it",
    );

  return out;
}

