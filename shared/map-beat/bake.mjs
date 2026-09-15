// twin/shared/map-beat/bake.mjs
//
// BAKING A PLAN AT THE SIZE THE LAYOUT PUBLISHED. Never at a size chosen here and reduced later:
// see `geometry.mjs` for why, and for the ratio it cost on four of the six converted types.

import { join } from "node:path";
import { transformStyle } from "./style.mjs";
import { bindState, viewOf, zoomShiftFor } from "./scrolly.mjs";

/** The shape MapLibre asks a glyph endpoint for, with the two placeholders it substitutes itself.
 *  A fontstack is a name with spaces in it, so it arrives percent-encoded. */
const GLYPH_PATH = /^\/([^/]+)\/(\d+-\d+)\.pbf$/;

/** MapLibre fetches glyphs over HTTP, so the beat's own faces need an origin. Ephemeral port, no
 *  fixed number — two bakes running at once must not fight over one. */
export function serveGlyphs(dir) {
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const match = GLYPH_PATH.exec(new URL(request.url).pathname);
      if (!match) return new Response("not a glyph range", { status: 404 });
      /** A FONTSTACK IS A NAME, NOT A PATH — and the shape of the URL does not say so on its own.
       *  `%2E%2E%2Fsomewhere` is ONE path segment until it is decoded, at which point it is a climb
       *  out of the glyph directory: the request comes from a style document, which is not this
       *  beat's to trust, so what the decoding produced is checked rather than the shape it had. */
      const stack = decodeURIComponent(match[1]);
      const climbs =
        stack.includes("/") || stack.includes("\\") || stack.includes("\0") || stack === "." || stack === "..";
      if (climbs) return new Response("not a fontstack name", { status: 404 });
      const file = Bun.file(join(dir, stack, `${match[2]}.pbf`));
      /** A RANGE THAT WAS NEVER BAKED IS A 404, NEVER AN EMPTY 200. MapLibre reads an empty body as
       *  a range that carries no glyphs and draws the word with those characters simply absent, with
       *  no error — which is the silent failure this whole sub-project exists to end. */
      if (!(await file.exists())) return new Response("no glyphs baked for that range", { status: 404 });
      return new Response(file, { headers: { "content-type": "application/x-protobuf" } });
    },
  });
  return {
    // The braces are LITERAL: MapLibre substitutes them itself, once per stack and range it needs.
    url: `http://localhost:${server.port}/{fontstack}/{range}.pbf`,
    stop: () => server.stop(true),
  };
}

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

/** ONE FALLBACK PER CARD. A scrolly's cameras are authored, so the picture a reader without a live map
 *  gets on each card can be baked: the same plan, the same tints, the card's own camera and the card's
 *  own state applied to every binding. Baked at the size the layout publishes, like `bakePlan`. */
/** `scale` is the device pixel ratio of the bake. `project` is a list of [lon, lat] read back through `map.project` at each card's camera, in CSS
 *  pixels of `size`: what a page needs to seat furniture of its own (a lifted label, a leader) over
 *  the fallback image when there is no live map to ask. Each result carries them as `projected`,
 *  with the `zoom` the card was baked at. */
export async function bakeCards({ page, plan, cameras, size, glyphsUrl, tints, keepLabels, statesForCards, outDir, stem, project = [], scale = 2 }) {
  const style = transformStyle(plan.style, { tints, glyphs: glyphsUrl, keepLabels });
  // The same zoom shift the live runtime applies: cameras are authored for the plan's reference stage.
  const shiftedView = (k) => {
    const view = viewOf(cameras[k]);
    view.zoom += zoomShiftFor(plan, size.width, size.height);
    return view;
  };
  // `scale` is the device pixel ratio the card is baked for (2 by default). A 1x screen must be given a 1x
  // bake: a 2x picture drawn at half size renders the map's words thinner than the live 1x canvas that
  // replaces it, and the reader sees the type change at the reveal.
  await page.setViewport({ ...size, deviceScaleFactor: scale });
  await page.evaluate(
    async (style, plan, first) => {
      const map = new maplibregl.Map({ container: "map", style, ...first, interactive: false, attributionControl: false, fadeDuration: 0 });
      await new Promise((r) => map.once("style.load", r));
      // A flat Web Mercator map unless the plan names another projection (owner's ruling, addendum §7.1).
      map.setProjection({ type: plan.projection || "mercator" });
      window.__mountPlan(map, plan);
      window.__cardsMap = map;
      await new Promise((r) => (map.loaded() ? r() : map.once("idle", r)));
    },
    style,
    plan,
    shiftedView(0),
  );
  const out = [];
  for (let k = 0; k < cameras.length; k++) {
    const paints = [];
    for (const layer of plan.layers)
      for (const property in layer.bindings || {}) paints.push([layer.id, property, bindState(layer.bindings[property], statesForCards[k])]);
    const projected = await page.evaluate(
      async (view, paints, points) => {
        const map = window.__cardsMap;
        map.jumpTo(view);
        for (const [id, property, value] of paints) map.setPaintProperty(id, property, value);
        await new Promise((r) => map.once("idle", r));
        return points.map((p) => {
          const q = map.project(p);
          return [q.x, q.y];
        });
      },
      shiftedView(k),
      paints,
      project,
    );
    const png = join(outDir, `${stem}-${k + 1}.png`);
    await page.screenshot({ path: png });
    out.push({ png, card: k, projected, zoom: shiftedView(k).zoom });
  }
  return out;
}
