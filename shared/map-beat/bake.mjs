// shared/map-beat/bake.mjs
//
// BAKING A PLAN AT THE SIZE THE LAYOUT PUBLISHED. Never at a size chosen here and reduced later:
// see `geometry.mjs` for why, and for the ratio it cost on four of the six converted types.

import { transformStyle } from "./style.mjs";

const RANGE_SIZE = 256;
const rangeOf = (code) => {
  const start = Math.floor(code / RANGE_SIZE) * RANGE_SIZE;
  return `${start}-${start + RANGE_SIZE - 1}`;
};

/** WHICH RANGES THE BEAT'S OWN WORDS NEED. A range that is not served makes its characters vanish
 *  from the word with no error at all: "Mer d’Azov" printed as "Mer dAzov" for a full render cycle,
 *  because the typographic apostrophe is U+2019 and sits outside the Latin block. */
export function rangesNeededBy(texts) {
  const needed = new Set();
  for (const text of texts) for (const ch of text) needed.add(rangeOf(ch.codePointAt(0)));
  return [...needed].sort((a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]));
}

export function assertRangesServed(texts, served) {
  const missing = rangesNeededBy(texts).filter((r) => !served.includes(r));
  if (missing.length)
    throw new Error(
      `the beat writes characters in ${missing.join(", ")} and no glyph file is served for ` +
        `${missing.length > 1 ? "those ranges" : "that range"} — the characters would simply be absent ` +
        `from the words, and nothing would report it`,
    );
}

/** The bake itself: mount the plan in a headless page at the published size and take one frame. The
 *  camera it read back — `frameCorners` after the fit, not the nominal bounds — travels with the PNG,
 *  because `fitBounds` widens what it is given to keep the frame's aspect. */
export async function bakePlan({ page, plan, glyphsUrl, tints, keepLabels, outPath }) {
  const size = plan.camera.drawn;
  const style = transformStyle(plan.style, { tints, glyphs: glyphsUrl, keepLabels });
  await page.setViewport({ ...size, deviceScaleFactor: 2 });
  const camera = await page.evaluate(
    async (style, plan) => {
      const map = new maplibregl.Map({
        container: "map",
        style,
        bounds: plan.camera.bounds,
        fitBoundsOptions: { padding: 0, animate: false },
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
      });
      await new Promise((r) => map.once("style.load", r));
      window.__mountPlan(map, plan);
      await new Promise((r) => (map.loaded() ? r() : map.once("idle", r)));
      const b = map.getBounds();
      return {
        zoom: map.getZoom(),
        frameCorners: { west: b.getWest(), east: b.getEast(), south: b.getSouth(), north: b.getNorth() },
      };
    },
    style,
    plan,
  );
  await page.screenshot({ path: outPath });
  return { png: outPath, camera };
}
