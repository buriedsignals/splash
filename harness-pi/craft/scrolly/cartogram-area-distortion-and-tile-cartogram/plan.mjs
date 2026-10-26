// THE CARTOGRAM'S GEOGRAPHIC HALF AS A MAP PLAN — matching the validated video beat's own visual treatment
// (`proof/video-cartogram-europe-lowcarbon` on `quality/video`, addendum 2026-09-15 §5: a live map while the
// form shows geography, no basemap once it leaves it for the tiles).
//
// THE SHAPES ARE PROJECTED WITH THE LIVE MAP'S OWN CAMERA (flat Web Mercator, `fitCamera`), ported from the
// validated video beat's `subject.mjs`: a country's box is where MapLibre fills it at that camera, so the SVG
// group `cartogram-drive.mjs` fades in over the map lies exactly on top of it. THE MAP IS CLIPPED, NOT
// CLAMPED (Sutherland–Hodgman `clipRing`, ported from the validated video beat's `video-choropleth` sibling):
// a clamped vertex drags the edges leading to it and can fold Russia across the frame.
//
// THE LIVE LAYERS, ported from the video's `map-plan.mjs`: one fill per class and per role (the widest
// country, which the focus never dims, and every other), each a constant colour with a data-constant bound
// opacity (`{$state:"subject"}` — this beat's own field, not a fresh one); the unreported country hollow,
// dashed; every national border. No staggered class reveal: card 1 shows every class already, as the SVG
// version always did.

import { cameraFields, lonLatOf, mercatorOf } from "#shared/map-beat/scrolly.mjs";

const KEY = "__MAPTILER" + "_KEY__";
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
/** Malta has no level-0 polygon below tile zoom 4 (the choropleth pilot's measurement): painted from its councils there. */
const SMALL_BELOW_Z4 = ["MT"];
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };

/** ISO 3166-1 alpha-2, the join key MapTiler Countries carries — the same 41 countries as the study window
 *  (ported from the validated contour/video beats). */
const ISO2 = {
  ALB: "AL", AUT: "AT", BLR: "BY", BEL: "BE", BIH: "BA", BGR: "BG", HRV: "HR", CYP: "CY", CZE: "CZ", DNK: "DK",
  EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR", HUN: "HU", ISL: "IS", IRL: "IE", ITA: "IT", LVA: "LV",
  LTU: "LT", LUX: "LU", MLT: "MT", MDA: "MD", MNE: "ME", NLD: "NL", MKD: "MK", NOR: "NO", POL: "PL", PRT: "PT",
  ROU: "RO", RUS: "RU", SRB: "RS", SVK: "SK", SVN: "SI", ESP: "ES", SWE: "SE", CHE: "CH", TUR: "TR", UKR: "UA",
  GBR: "GB",
};
export const iso2Of = (iso) => {
  if (!ISO2[iso]) throw new Error(`no ISO A2 code recorded for ${iso} — the live map joins MapTiler Countries on it`);
  return ISO2[iso];
};

/** The camera fitting a [west, south, east, north] window "meet" into a stage, centred. */
export function fitCamera({ west, south, east, north }, stage) {
  const [x0, y1] = mercatorOf([west, south]);
  const [x1, y0] = mercatorOf([east, north]);
  const worldPx = Math.min(stage.width / (x1 - x0), stage.height / (y1 - y0));
  return cameraFields({ center: lonLatOf([(x0 + x1) / 2, (y0 + y1) / 2]), zoom: Math.log2(worldPx / 512) });
}

/** Where MapLibre draws [lon, lat] at `camera` on a stage of `stage` px, no pitch/bearing/padding. */
export function projectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return (lonLat) => {
    const [x, y] = mercatorOf(lonLat);
    return [stage.width / 2 + (x - camera.camX) * worldPx, stage.height / 2 + (y - camera.camY) * worldPx];
  };
}

/** Sutherland–Hodgman, clipped to a padded box — ported from the validated video beat's `geometry.mjs`. */
export function clipRing(pts, box) {
  const cut = (a, b, axis, v) => {
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const edges = [
    [(p) => p[0] >= box.x0, (a, b) => cut(a, b, 0, box.x0)],
    [(p) => p[0] <= box.x1, (a, b) => cut(a, b, 0, box.x1)],
    [(p) => p[1] >= box.y0, (a, b) => cut(a, b, 1, box.y0)],
    [(p) => p[1] <= box.y1, (a, b) => cut(a, b, 1, box.y1)],
  ];
  let out = pts;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cross(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * THE SHAPES AND THE TILES, in the frame's own pixels — ported from the validated video beat's `subject.mjs`.
 *
 * @param {{geo: object, placed: {iso:string,col:number,row:number}[]}} subject
 * @param {{project: (lonLat:number[])=>number[], stage: {width:number,height:number}, margin: number}} frame
 */
export function cartogramGeometry({ geo, placed }, { project, stage, margin }) {
  const clip = { x0: -margin, x1: stage.width + margin, y0: -margin, y1: stage.height + margin };
  const byIso = new Map();
  for (const f of geo.features) {
    const iso = f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso;
    const held = byIso.get(iso) ?? { iso, rings: [] };
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const cut = clipRing(ring.map(project), clip);
        if (cut.length < 3) continue;
        const kept = [cut[0]];
        for (const p of cut.slice(1)) {
          const q = kept[kept.length - 1];
          if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 1) kept.push(p);
        }
        const xs = kept.map((p) => p[0]);
        const ys = kept.map((p) => p[1]);
        if (kept.length < 3 || (Math.max(...xs) - Math.min(...xs) < 1.5 && Math.max(...ys) - Math.min(...ys) < 1.5)) continue;
        held.rings.push(kept);
      }
    byIso.set(iso, held);
  }
  const pathOf = (rings) => rings.map((ring) => `M${ring.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`).join("");
  const boxOf = (rings) => {
    const all = rings.flat();
    const pts = all.filter(([x, y]) => x >= 0 && x <= stage.width && y >= 0 && y <= stage.height);
    const use = pts.length ? pts : all;
    const xs = use.map((p) => p[0]);
    const ys = use.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x: r1(x0), y: r1(y0), w: r1(Math.max(1, Math.max(...xs) - x0)), h: r1(Math.max(1, Math.max(...ys) - y0)) };
  };

  // THE GRID, centred in the frame — the static plate's own layout, never beyond a 2.5:1 cell.
  const cols = Math.max(...placed.map((p) => p.col)) + 1;
  const rows = Math.max(...placed.map((p) => p.row)) + 1;
  const cellH = stage.height / rows;
  const cellW = Math.min(stage.width / cols, cellH * 2.5);
  const gap = Math.max(Math.min(cellW, cellH) * 0.12, 2);
  const gx = (stage.width - (cols * cellW - gap)) / 2;
  const gy = (stage.height - (rows * cellH - gap)) / 2;

  const tiled = new Set(placed.map((p) => p.iso));
  const countryList = placed.map((p) => {
    const held = byIso.get(p.iso);
    if (!held || held.rings.length === 0) throw new Error(`${p.iso} has a tile and no shape inside the frame`);
    return { iso: p.iso, path: pathOf(held.rings), box: boxOf(held.rings), tile: { x: r1(gx + p.col * cellW), y: r1(gy + p.row * cellH), w: r1(cellW - gap), h: r1(cellH - gap) } };
  });
  const context = [...byIso.values()].filter((c) => !tiled.has(c.iso) && c.rings.length).map((c) => pathOf(c.rings));
  return { countries: countryList, context };
}

const byLevel0 = (codes) => ["all", ["==", ["get", LEVEL], 0], ["match", ["get", ISO], codes, true, false]];
const byLevel1 = (codes) => ["all", ["==", ["get", LEVEL], 1], ["match", ["get", ISO], codes, true, false]];
/** Every country but the widest, dimmed by the focus — the SVG's own rule (`1 − 0.7 × subject`). */
const OTHERS_OPACITY = ["-", 1, ["*", 0.7, { $state: "subject" }]];

/**
 * @param {{ countries: Array<{iso:string, classIndex: number|null}>, widest: string, colours: any,
 *   strokes: { border: number }, cameras: any[], referenceWidth: number, referenceHeight: number }} input
 *   `cameras`: one entry per card (`bakeCards` reads `cameras[k]` and `statesForCards[k]` by the same index) —
 *   the beat's single, unmoving camera, repeated once per card.
 */
export function cartogramMapPlan({ countries: studied, widest, colours, strokes, cameras, statesForCards, referenceWidth, referenceHeight }) {
  const n = colours.classFills.length;
  const layers = [];
  /** One fill layer, and its Malta-below-z4 sibling when the class holds it. `opacity` is `null` for the
   *  widest role (constant, always fully shown) or a bound expression for every other country. */
  const fillLayer = (id, codes, colour, opacity) => {
    if (!codes.length) return;
    const small = codes.filter((c) => SMALL_BELOW_Z4.includes(c));
    const make = (filter, extra) => ({
      type: "fill",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter,
      paint: { "fill-color": colour, "fill-opacity": opacity ? 0 : 1 },
      ...(opacity ? { bindings: { "fill-opacity": opacity } } : {}),
      ...extra,
    });
    layers.push({ id, ...make(byLevel0(codes)) });
    if (small.length) layers.push({ id: `${id}-small`, ...make(byLevel1(small), { maxzoom: 4 }) });
  };
  for (let k = 0; k < n; k++) {
    const others = studied.filter((c) => c.classIndex === k && c.iso !== widest).map((c) => iso2Of(c.iso));
    const mine = studied.filter((c) => c.classIndex === k && c.iso === widest).map((c) => iso2Of(c.iso));
    if (others.length) fillLayer(`class-${k}`, others, colours.classFills[k], OTHERS_OPACITY);
    if (mine.length) fillLayer(`class-${k}-widest`, mine, colours.classFills[k], null);
  }
  const missing = studied.filter((c) => c.classIndex === null).map((c) => iso2Of(c.iso));
  fillLayer("missing", missing, colours.neutral, OTHERS_OPACITY);
  layers.push(
    {
      id: "missing-edge",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: byLevel0(missing),
      layout: { "line-join": "round" },
      paint: { "line-color": colours.missingEdge, "line-width": strokes.border * 1.6, "line-dasharray": [3, 2] },
    },
    {
      id: "borders",
      type: "line",
      beneath: "water",
      source: countries,
      sourceLayer: LAYER,
      filter: ["==", ["get", LEVEL], 0],
      layout: { "line-join": "round" },
      paint: { "line-color": colours.border, "line-width": strokes.border },
    },
  );
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    tints: { water: colours.sea, land: colours.land },
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    // The camera never moves: no sample is needed between two identical views.
    warmSamples: 0,
    degreesPerPixel: 1,
    layers,
  };
}

/** « RUSSIE · 36 % », once it is placed: a symbol layer bound to the same `subject` field. */
export function withWidestName(plan, { at, text, register, face, ink, halo, haloColour }) {
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  return {
    ...plan,
    layers: [
      ...plan.layers,
      {
        id: "widest-name",
        type: "symbol",
        data: { type: "FeatureCollection", features: [{ type: "Feature", properties: { text }, geometry: { type: "Point", coordinates: at.map(r6) } }] },
        layout: { "text-field": ["get", "text"], "text-font": [face], "text-size": register.fontSize, "text-anchor": "center", "text-allow-overlap": true, "text-ignore-placement": true },
        paint: { "text-color": ink, "text-halo-color": haloColour, "text-halo-width": halo / 2, "text-opacity": 0 },
        bindings: { "text-opacity": { $state: "subject" } },
      },
    ],
  };
}
