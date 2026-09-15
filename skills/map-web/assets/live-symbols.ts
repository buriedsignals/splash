// twin/skills/map-web/assets/live-symbols.ts
//
// THE PROPORTIONAL SYMBOL MAP AS A LIVE MAP — every mark a MapLibre layer over MapTiler's own tiles.
//
// THE PATTERN (`MAP-WEB-BRIEF.md`, "LE PATRON VALIDÉ", approved 2026-09-15 on
// `proof/web-choropleth-europe-lowcarbon/`): a web map beat no longer draws SVG marks over a baked
// plate. The plate had a `viewBox`, so it had a ratio, so the width it was allowed to take was
// something somebody had to arbitrate — and the owner refused every answer that arbitration produced
// on THIS beat's own renders: *"la map doit prendre toute la largeur quitte à afficher plus de map.
// […] avec web on peut avoir des contrôles, zoom, déplacement et hover en plus directement dans
// MapTiler."* A live map has no viewBox: it fills the figure's width, and the question stops
// existing rather than being settled.
//
// This file is to the proportional symbol what `live-choropleth.ts` is to the choropleth. They are
// two files and not one because the two types put a DIFFERENT thing in a layer, and the difference
// is the whole of each type:
//
//   · a choropleth's mark is GROUND — a polygon out of MapTiler's own Countries tileset, joined by
//     ISO code, repainted per rule. Its size is the country's size and nothing decides it.
//   · a symbol map's mark is a CIRCLE WHOSE SIZE IS THE DATUM. Nothing in the tiles carries it; the
//     beat carries it, and the exponent that turns a value into a radius is the free parameter this
//     type sets in silence (`map-beat/references/types/proportional-symbol.md`).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE RADIUS RULE, AND IT IS NOT A SETTING. `shared/map-beat/mount.mjs` names the three things a
// radius can mean, and this file only ever implements one of them:
//
//     `radius: "camera"` — a circle that encodes a VALUE. Its size is derived from the camera once,
//     at the fit, and then HELD IN SCREEN PIXELS while the reader zooms. A circle that grew with the
//     zoom would make the same number mean two things at two zooms, and the size legend beside it —
//     the ONLY instrument a symbol map has, because it has no axis — would be calibrated to a scale
//     nothing on the page is drawn in.
//
// A dot-density dot is the opposite (`radius: "ground"`, its screen size doubles per zoom level,
// because what is constant is the piece of GROUND it stands for). Same geometry, opposite rule, and
// MapLibre cannot tell them apart. So the plan says which, and this file says only "camera".
//
// THE RADII ARE STATED IN CSS PIXELS AT A DECLARED REVIEW CAMERA, not in the plate's frame units.
// That is the one deliberate departure from `mount.mjs`'s own `["*", ["get","r"], scale]`, and the
// reason is the size legend: the legend is HTML, outside the canvas, and it has to be the same size
// as the marks it calibrates in EVERY state — including the state where no script has run and the
// frozen photograph is the whole map. Stating the radii at the review camera makes the live scale
// exactly 1 at the window the photograph was taken in, so the legend's script-free resting size is
// a fact rather than an approximation. This beat has already shipped the other mistake once: a
// swatch whose radius was a count of the drawing's own viewBox units, drawn at 1:1 CSS pixels in a
// cell that renders at no such ratio, over-stated every magnitude by about 2x — the 50 GW swatch was
// bigger than the 96 GW circle it was meant to calibrate.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THE ARCHITECTURE COSTS THE EDITORIAL GESTURE, STATED RATHER THAN DISCOVERED.
//
// The gesture is `area-scale.ts`: the reader holds the EXPONENT, three named laws over the same
// marks at the same places, the anchor pinned so the only cue that changes is the spread. It was
// pure CSS — native radios, rules generated at build time, no script at all — because every mark was
// an SVG circle a stylesheet could reach.
//
// No stylesheet reaches a MapLibre circle layer. So the MAP's half of the gesture is now script: one
// `setPaintProperty("circle-radius", …)` per law, over a `["match", ["get","key"], …]` expression
// built at BUILD time from the same radii the markup is drawn from. What a reader with no script
// keeps is the frozen photograph, the size legend under every law, the derived sentences, and a
// table of every reading whose own swatch re-sizes under each law in pure CSS exactly as before. The
// gesture has not gone; it has moved from the picture to the table, and the page says so.
//
// AND THE TWO HALVES DERIVE FROM ONE SET OF RADII. A law that re-sized the table one way and the map
// another is one control answering two scales — `assertSymbolLawsReachTheLayers` below is the guard
// for that crossing, and it re-derives what each mark SHOULD wear the way the markup derives it
// rather than reading back the object the plan was built from. Two readings of one variable is not a
// check; the choropleth's own guard passed a mutation, green, for exactly that reason.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHERE THE MARKS COME FROM: the beat's own frozen file, as GeoJSON points. NOT a tileset. A
// choropleth can join to MapTiler's Countries because a country's shape is public geography; a
// capacity-weighted centre of gravity is a DERIVED PLACE that exists nowhere but in this beat's own
// arithmetic, so there is nothing to join to and nothing that can silently fail to match.
//
// THE MARKS ARE DRAWN BENEATH THE BASEMAP'S OWN LABELS AND ABOVE ITS GROUND — in practice above
// everything, because `style.mjs`'s sweep takes MapTiler's label layers out. They are NOT drawn
// beneath the water the way a choropleth's fills are: a choropleth's fills are ground and must give
// way to a finer coastline, while a symbol is an annotation ON the ground and a symbol hidden by the
// sea is a country's fleet erased by an estuary.

/** Assembled, never written whole: this file's OUTPUT travels into a page that `deliver` rewrites
 *  every occurrence of the placeholder in. A literal here would be rewritten to the key itself and
 *  the "is this page still unkeyed" test would then read "does the style URL contain the key",
 *  which is true of every delivered page — so every delivered map would refuse to boot. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** One law the reader may choose, and every mark's radius under it — in CSS pixels at the declared
 *  review camera. The KEY is the same slug the radio's own id and value carry, so the radio, the
 *  stylesheet and this plan are one vocabulary with three readers. */
export type LiveSymbolLaw = {
  slug: string;
  radiusByKey: Record<string, number>;
};

/** One drawn datum. `label` is the two-line word the map prints ON the mark, or null for a mark the
 *  beat does not label — the BEAT decides which, from its own claim, and the same set in every
 *  state, so no word ever appears or disappears when the reader changes law. */
export type LiveSymbolMark = {
  key: string;
  name: string;
  lon: number;
  lat: number;
  detail: string;
  label: string | null;
};

/** THE PROVIDER'S OWN GEOGRAPHY, KEPT AND RE-INKED — what `shared/map-beat/tints.mjs`'s
 *  `basemapGeography` derives from one direction. Optional, and absent it nothing changes: a beat
 *  whose own marks carry the countries (a choropleth fills all forty) wants the bare sweep. A beat
 *  whose marks do NOT carry them — a fan of bands, a scatter of circles — leaves the ground with no
 *  coast, no frontier and no name on it, which is what this brings back. Every regular expression
 *  travels as `{ source, flags }`: a plan is a file, and `JSON.stringify` flattens a RegExp to `{}`. */
export type LiveBasemapGeography = {
  keepLabels: { source: string; flags: string }[];
  keepTextures: { source: string; flags: string }[];
  ink: {
    match: { source: string; flags: string };
    layout?: Record<string, unknown>;
    paint?: Record<string, unknown>;
  }[];
};

export type LiveSymbolsDeclaration = {
  /** The MapTiler style the plate was baked from. The live map loads the same one. */
  style: string;
  /** The two tints the live style is repainted with — the sea, and the ground every mark is measured
   *  against. */
  tints: { water: string; land: string };
  /** See `LiveBasemapGeography`. Absent, the basemap is swept bare. */
  basemap?: LiveBasemapGeography;
  /** What the camera fits to at runtime: the beat's own declared window, the same one the bake
   *  fitted, so the frozen photograph and the live map are ONE camera and not two that agree today. */
  studyBounds: { west: number; east: number; south: number; north: number };
  /** THE CAMERA THE RADII ARE STATED AT. The box the frozen fallback is photographed in, and the box
   *  the owner reviews at. At this box the live scale is exactly 1. */
  reviewBox: { width: number; height: number };
  /** Every drawn datum. */
  marks: LiveSymbolMark[];
  /** The laws, in the order the control offers them, and the one the page opens on. */
  laws: LiveSymbolLaw[];
  defaultSlug: string;
  /** Below this radius, in the same review pixels, a circle is not a circle a reader can read. The
   *  default law is refused upstream if it puts anything under it; a law offered as a counterexample
   *  may, and then it owes the reader the count. Carried here so the page can state the floor it was
   *  measured at. */
  floorPx: number;
  /** What a mark is painted in: the translucent wash, the ring that carries the contrast floor (the
   *  wash is translucent on purpose, so an overlap reads as an overlap), and what a mark becomes
   *  under the pointer — searched off its OWN fill through its own opacity by the beat, never a
   *  fixed dose (the owner refused a fixed dose at 1,104:1). */
  paint: {
    fill: string;
    fillOpacity: number;
    ring: string;
    ringWidth: number;
    active: string;
    labelInk: string;
    labelSize: number;
    /** The MapTiler font stack the label layer is drawn with. MapTiler answers 200 with Noto Sans
     *  for a family it does not serve, so a NAKED family name is how a map ends up set in a typeface
     *  nobody chose with nothing to say so — `shared/map-beat/glyphs.mjs`. Every entry carries its
     *  face suffix, and the beat probes the first one against the fallback's own bytes. */
    labelFont: string[];
  };
  /** MapLibre's own control names, in the page's language: the library ships English defaults and a
   *  French page that leaves them hands a screen reader an English button. */
  locale: { title: string; zoomIn: string; zoomOut: string };
  /** How long a mark takes to travel from one law's radius to the next, in ms — the same number the
   *  stylesheet gives the table's swatches, so the two halves of one gesture cross together. */
  changeMs: number;
  /** THE SUBJECT THE HEADLINE NAMES, and its own width in degrees of longitude. The zoom CEILING is
   *  derived from it and may not be typed: a reader who comes in to see where inside its own country
   *  a centre of gravity falls can always still see the whole of that country around it, and past
   *  that the map is showing terrain this beat holds no datum for. */
  subject: { name: string; spanDeg: number };
  /** The sentence the live map's controls are described by — shipped `hidden` and revealed by the
   *  script, because a description of dragging a map that cannot be dragged is a dead control. */
  hint: string;
};

/**
 * THE CORNERS THE REVIEW CAMERA ACTUALLY DRAWS, which are not the declared window.
 *
 * `fitBounds` binds on ONE axis and gives the other whatever the box has left. On a wide, short
 * stage — which the full-width ruling makes every one of these — the binding axis is latitude and
 * the surplus width is paid out in longitude: the declared 67° of this beat's window are drawn
 * inside 162° of frame. A mark east of the declared window is therefore still on the page, and a
 * guard that refused it would be refusing a mark the reader can see.
 *
 * So the LATITUDE band is the declared one (the fit guarantees it) and the LONGITUDE band is the
 * frame's, derived from the box. Both halves are the same arithmetic the page's own script runs, and
 * that is deliberate: two derivations of one camera is how a beat comes to be checked against a
 * frame nobody renders.
 */
export function reviewFrameOf(d: LiveSymbolsDeclaration): {
  west: number;
  east: number;
  south: number;
  north: number;
} {
  const rad = Math.PI / 180;
  const yUnit = (lat: number) =>
    (1 - Math.log(Math.tan(lat * rad) + 1 / Math.cos(lat * rad)) / Math.PI) / 2;
  const b = d.studyBounds;
  const world = Math.min(
    d.reviewBox.width / ((b.east - b.west) / 360),
    d.reviewBox.height / (yUnit(b.south) - yUnit(b.north)),
  );
  const shownLon = (d.reviewBox.width / world) * 360;
  const centre = (b.west + b.east) / 2;
  return {
    west: centre - shownLon / 2,
    east: centre + shownLon / 2,
    south: b.south,
    north: b.north,
  };
}

export function assertLiveSymbolsDeclaration(
  d: LiveSymbolsDeclaration,
  where = "live-symbols",
): LiveSymbolsDeclaration {
  if (!d || typeof d.style !== "string" || !d.style)
    throw new Error(
      `${where}: the declaration names no MapTiler style, so the live map and the photograph beneath ` +
        `it would be two cartographies`,
    );
  for (const key of ["water", "land"] as const)
    if (!/^#[0-9a-fA-F]{6}$/.test(d.tints?.[key] ?? ""))
      throw new Error(
        `${where}: the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is painted ` +
          `with the beat's own two tints, and the land tint is the ground every mark's contrast was ` +
          `measured against`,
      );
  const b = d.studyBounds;
  if (!b || !(b.west < b.east) || !(b.south < b.north))
    throw new Error(
      `${where}: the study bounds are ${JSON.stringify(b)} — \`fitBounds\` answers an inverted or ` +
        `empty box by framing the rest of the world`,
    );
  if (!(d.reviewBox?.width > 0) || !(d.reviewBox?.height > 0))
    throw new Error(
      `${where}: the radii are stated in CSS pixels at a REVIEW camera and the declaration names no ` +
        `box to fit it in. Without one the live scale has no 1, and the size legend — the only ` +
        `instrument a symbol map has — would be the right size in no state at all.`,
    );
  if (!d.marks?.length)
    throw new Error(
      `${where}: no mark is drawn, so every layer would render nothing at all`,
    );
  const frame = reviewFrameOf(d);
  const seen = new Set<string>();
  for (const mark of d.marks) {
    if (!mark.key || seen.has(mark.key))
      throw new Error(
        `${where}: ${JSON.stringify(mark.key)} is empty or drawn twice. The layers key on it, the ` +
          `table rows key on it and the pointer answers off it — two marks under one key answer as ` +
          `whichever MapLibre drew second.`,
      );
    seen.add(mark.key);
    if (!Number.isFinite(mark.lon) || !Number.isFinite(mark.lat))
      throw new Error(
        `${where}: ${mark.key} is placed at ${mark.lon},${mark.lat}. A mark's position is a DATUM, ` +
          `not a layout decision, and MapLibre drops a point with a non-finite coordinate silently.`,
      );
    if (
      mark.lon < frame.west ||
      mark.lon > frame.east ||
      mark.lat < frame.south ||
      mark.lat > frame.north
    )
      throw new Error(
        `${where}: ${mark.name} sits at ${mark.lon.toFixed(2)},${mark.lat.toFixed(2)}, outside the ` +
          `frame the review camera draws (${frame.west.toFixed(1)}..${frame.east.toFixed(1)}E ` +
          `${frame.south}..${frame.north}N). It opens off-screen — drawn, counted in every total, ` +
          `and invisible.`,
      );
    if (!mark.detail)
      throw new Error(
        `${where}: ${mark.name} is drawn and answers nothing. A mark a reader can point at and get ` +
          `silence from is a mark they read as having no data.`,
      );
  }
  if (!d.laws?.length)
    throw new Error(
      `${where}: no law reaches the layers, so the reader's control would re-size the table and ` +
        `leave the map on the law it opened with — one control, two scales`,
    );
  if (!d.laws.some((law) => law.slug === d.defaultSlug))
    throw new Error(
      `${where}: the page opens on the law ${JSON.stringify(d.defaultSlug)} and no law carries that ` +
        `slug`,
    );
  for (const law of d.laws)
    for (const mark of d.marks) {
      const r = law.radiusByKey[mark.key];
      if (!(r > 0))
        throw new Error(
          `${where}: the law ${JSON.stringify(law.slug)} gives ${mark.name} the radius ` +
            `${JSON.stringify(r)}. A drawn datum with no radius under a law is drawn at MapLibre's ` +
            `own default 5 px, which is a number this beat never computed and a reader cannot ` +
            `distinguish from one it did.`,
        );
    }
  if (!(d.floorPx > 0))
    throw new Error(
      `${where}: no legibility floor. A circle under some radius is, on the page, indistinguishable ` +
        `from a place with no data, and the count of them is the one thing a law offered as a ` +
        `counterexample owes the reader.`,
    );
  if (!/^#[0-9a-fA-F]{6}$/.test(d.paint?.fill ?? ""))
    throw new Error(
      `${where}: the mark's fill is ${JSON.stringify(d.paint?.fill)}`,
    );
  if (!(d.paint.fillOpacity > 0 && d.paint.fillOpacity <= 1))
    throw new Error(
      `${where}: the mark's opacity is ${d.paint.fillOpacity}. The wash is translucent so an overlap ` +
        `reads as an overlap, and every colour on this page is measured THROUGH it.`,
    );
  if (!/^#[0-9a-fA-F]{6}$/.test(d.paint.active ?? ""))
    throw new Error(
      `${where}: no colour for the mark under the pointer. What answers a pointer is the mark ` +
        `itself, moved off its own fill (the owner's second standing arbitration) — never a dot ` +
        `plastered over it.`,
    );
  if (!Array.isArray(d.paint.labelFont) || !d.paint.labelFont.length)
    throw new Error(
      `${where}: the label layer names no font stack. MapLibre does not draw with a system font: it ` +
        `reads signed distance fields served by the style, and MapTiler answers 200 with Noto Sans ` +
        `for any family it does not serve.`,
    );
  for (const face of d.paint.labelFont)
    if (!/\s/.test(face))
      throw new Error(
        `${where}: ${JSON.stringify(face)} is a BARE family name. MapTiler serves a bare name as ` +
          `Noto Sans with no error at all (KNOWN-STATE.md) — every face must carry its suffix.`,
      );
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      throw new Error(
        `${where}: MapLibre's ${key} control is left with the library's English default on a French ` +
          `page — a screen reader would read it out in the wrong language`,
      );
  if (!(d.changeMs >= 0))
    throw new Error(
      `${where}: the law change needs a duration (the owner's fourth standing arbitration: a state ` +
        `change interpolates rather than jumps)`,
    );
  if (!(d.subject?.spanDeg > 0) || !d.subject?.name)
    throw new Error(
      `${where}: the zoom ceiling is derived from the subject the headline names and the ` +
        `declaration names none. A ceiling typed instead of derived is a number nobody can defend.`,
    );
  if (typeof d.hint !== "string" || d.hint.trim().split(/\s+/).length < 8)
    throw new Error(
      `${where}: the live map's own description is ${JSON.stringify(d.hint)}. It is the only ` +
        `account a reader who cannot see the canvas gets of what the map will do under their hands.`,
    );
  return d;
}

/** THE MARKS, AS THE ONE GeoJSON BOTH CIRCLE LAYERS READ. Sorted LARGEST FIRST so MapLibre draws a
 *  small circle over a large one and a small country's fleet is never buried under its neighbour's —
 *  which is the overlap treatment this beat carries, and the reason the wash is translucent. */
function markCollection(
  d: LiveSymbolsDeclaration,
  radii: Record<string, number>,
) {
  return {
    type: "FeatureCollection",
    features: [...d.marks]
      .sort((a, b) => (radii[b.key] ?? 0) - (radii[a.key] ?? 0))
      .map((mark) => ({
        type: "Feature",
        properties: { key: mark.key, name: mark.name },
        geometry: { type: "Point", coordinates: [mark.lon, mark.lat] },
      })),
  };
}

/** One law's radii as a MapLibre expression, in REVIEW pixels. The runtime multiplies it by the
 *  camera's own scale; the default of 0 is deliberate — a key the expression does not name draws
 *  nothing rather than MapLibre's own 5 px, so a mark the plan forgot is invisible instead of
 *  wearing a number nobody computed. */
export function radiusExpressionFor(
  d: LiveSymbolsDeclaration,
  law: LiveSymbolLaw,
): unknown[] {
  return [
    "match",
    ["get", "key"],
    ...d.marks.flatMap(
      (mark) => [[mark.key], law.radiusByKey[mark.key]] as unknown[],
    ),
    0,
  ];
}

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it.
 *  It is a FILE before it is an object, so what is checked here is checked again in the browser. */
export function liveSymbolsPlan(
  d: LiveSymbolsDeclaration,
): Record<string, unknown> {
  assertLiveSymbolsDeclaration(d);
  const opening = d.laws.find(
    (law) => law.slug === d.defaultSlug,
  ) as LiveSymbolLaw;
  const data = markCollection(d, opening.radiusByKey);
  const labelled = {
    type: "FeatureCollection",
    features: data.features
      .filter(
        (f: any) => d.marks.find((m) => m.key === f.properties.key)?.label,
      )
      .map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          label: d.marks.find((m) => m.key === f.properties.key)?.label,
        },
      })),
  };

  const layers: Record<string, unknown>[] = [
    // THE FIELD. One circle layer for all of it, repainted per law — not one layer per law, because
    // the reader changes law with a click and one layer is one place a radius is decided.
    {
      id: "mw-symbols",
      type: "circle",
      radius: "camera",
      data,
      paint: {
        "circle-color": d.paint.fill,
        "circle-opacity": d.paint.fillOpacity,
        "circle-stroke-color": d.paint.ring,
        "circle-stroke-width": d.paint.ringWidth,
      },
      hover: true,
    },
    // WHAT A POINTED-AT MARK BECOMES. A layer of its own rather than a paint on the field, because
    // the answer has to be drawn ABOVE its neighbours: in a field this dense a mark moved off its
    // own fill UNDER the circle beside it answers where the reader is not looking. Filtered to
    // nothing until a pointer lands, and painted through the SAME opacity, because the dose was
    // searched through that opacity and a dose calibrated on a bare fill arrives at the reader worth
    // half of what it was measured to be.
    {
      id: "mw-active",
      type: "circle",
      radius: "camera",
      data,
      filter: ["==", ["get", "key"], "--"],
      paint: {
        "circle-color": d.paint.active,
        "circle-opacity": d.paint.fillOpacity,
        "circle-stroke-color": d.paint.active,
        "circle-stroke-width": d.paint.ringWidth,
      },
      hover: false,
    },
    // THE LABELS, AND MAPLIBRE'S OWN COLLISION DECIDES THEM. This is the one thing the move to
    // layers genuinely takes out of the beat's hands: the SVG build placed five labels at five
    // centres and measured 0 overlapping pairs across 12 states by hand. A symbol layer with
    // `text-allow-overlap: false` — the default — drops a label that would collide rather than
    // moving it, which is exactly the owner's first standing arbitration read the other way round:
    // a label is anchored on its own mark (`text-anchor: center`, no variable anchor), so it is
    // drawn there or not at all, and nothing ever travels. WHAT IT DROPS IS A MEASUREMENT, taken on
    // the rendered page with `queryRenderedFeatures`, which for a symbol layer answers only the
    // symbols actually PLACED.
    //
    // THE TEXT DOES NOT FOLLOW THE CAMERA. A label is a FORM, like every other word on this page: it
    // keeps the size its register set at every zoom. The circle under it is held in screen pixels
    // too, so the two keep their relation through a zoom and part company only at a re-fit.
    {
      id: "mw-labels",
      type: "symbol",
      data: labelled,
      layout: {
        "text-field": ["get", "label"],
        "text-font": d.paint.labelFont,
        "text-size": d.paint.labelSize,
        "text-anchor": "center",
        "text-line-height": 1.15,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
        "text-padding": 2,
      },
      paint: { "text-color": d.paint.labelInk },
      hover: false,
    },
  ];

  return {
    styleUrl: `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: d.style,
    projection: "mercator",
    tints: d.tints,
    basemap: d.basemap ?? null,
    studyBounds: d.studyBounds,
    reviewBox: d.reviewBox,
    changeMs: d.changeMs,
    subject: d.subject,
    locale: d.locale,
    floorPx: d.floorPx,
    defaultSlug: d.defaultSlug,
    /** Every drawn key. What each one ANSWERS is not here: it is the `data-detail` its own table row
     *  carries, so the page holds one copy of one string and the format's own census, which walks
     *  `[data-detail]`, sees the live map's answers as well as the table's. */
    keys: d.marks.map((mark) => mark.key),
    radii: Object.fromEntries(
      d.laws.map((law) => [law.slug, radiusExpressionFor(d, law)]),
    ),
    layers,
  };
}

/**
 * THE RULES. Every one is conditional on `.mw-live` except the live box's own resting state, so a
 * page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveSymbolsCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE — the ruling itself. The format's cell
    // carries the drawing's own viewBox ratio so `preserveAspectRatio` cannot stretch it; neither of
    // these two is stretched (the photograph is `slice`, which is `object-fit: cover`, and a live map
    // has no ratio to protect), so both take the plot's whole track instead of the cell inside it.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE MAP, NOT TWO. The frozen photograph gives way to the live map, and only once the live map
    // is actually up: with no script, no key or no tiles it is the whole picture.
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER. `[hidden]` is a UA rule, restated here as an
    // author rule no author rule can outrank by accident.
    `${scope} .live-hint[hidden] { display: none; }`,
    // THE SIZE LEGEND SITS OVER THE MAP, so it must take the whole track too — a legend centred in
    // the cell while the map fills the track would drift off the corner it was placed in.
    `${scope} .key-layer { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    // THE ROW THE POINTER ANSWERS ON, in the table that carries the gesture without script.
    `${scope} tr[data-mark] { transition: background-color 120ms linear; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in a
 * CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry and formats no
 * WORD: every glyph a reader can be shown was cut into the page's own embedded faces at build time.
 *
 * `styleModule` is `assets/style.mjs`'s own source with its `export` keywords stripped, handed in by
 * the beat: the sweep that decides what a basemap layer becomes is stated ONCE, in that file, and
 * applied twice — to the style document the plate was baked from, and to the live style here.
 */
export function liveSymbolsScript(
  d: LiveSymbolsDeclaration,
  {
    scope,
    styleModule,
    lawName,
  }: { scope: string; styleModule: string; lawName: string },
): string {
  assertLiveSymbolsDeclaration(d);
  if (
    typeof styleModule !== "string" ||
    !/function\s+applyLiveStyle/.test(styleModule)
  )
    throw new Error(
      "live-symbols: the style sweep is handed in by the beat (the source of " +
        "`skills/map-web/assets/style.mjs`, with its `export` keywords stripped) because a page " +
        "script cannot import. What it was given does not define `applyLiveStyle`.",
    );
  if (d.basemap && !/function\s+applyBasemapInk/.test(styleModule))
    throw new Error(
      "this beat keeps part of the provider's geography and re-inks it, which `applyBasemapInk` does. " +
        "The style module it was handed does not define it — the page would keep the countries in " +
        "MapTiler's own colours and nothing would report it.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-symbols: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the photograph would stand with no " +
        "error anyone could see — the one failure mode this arrangement cannot report.",
    );
  liveSymbolsPlan(d);
  const NAME = JSON.stringify(lawName);
  const SCOPE = JSON.stringify(scope);
  return `${styleModule}
(function () {
  var doc = document;
  var planNode = doc.getElementById("mw-live-plan");
  if (!planNode) return;
  var PLAN;
  try { PLAN = JSON.parse(planNode.textContent); } catch (err) { return; }
  // THE SENTINEL IS ASSEMBLED IN TWO HALVES, never written whole: delivery substitutes every
  // occurrence of the placeholder in the delivered file, and THIS SCRIPT IS IN THAT FILE.
  var SENTINEL = "__MAPTILER" + "_KEY__";
  if (!PLAN || !PLAN.styleUrl || PLAN.styleUrl.indexOf(SENTINEL) >= 0) return;
  if (!window.maplibregl) return;
  var figure = doc.querySelector(${SCOPE});
  var box = figure && figure.querySelector(".map-layer");
  if (!box) return;
  // THE TOOLTIP IS LOOKED UP LATE, ON PURPOSE. This script is inlined INSIDE the figure and the
  // format writes its "#tooltip" AFTER the figure, so at the moment this runs the element does not
  // exist. Captured at init it is null for the life of the page: every hover then lights a mark and
  // answers nothing, which is the shape of a defect no unit test sees.
  function tip() { return doc.getElementById("tooltip"); }

  // THE PLAN IS VALIDATED BY WHOEVER DRAWS FROM IT. It reached here as JSON, from a render that ran
  // on another machine on another day: nothing the writer checked survived the journey.
  var seen = {};
  for (var i = 0; i < PLAN.layers.length; i++) {
    if (seen[PLAN.layers[i].id])
      throw new Error('two layers share the id "' + PLAN.layers[i].id + '" - MapLibre keeps the first and drops the second without an error');
    seen[PLAN.layers[i].id] = true;
  }
  if (!PLAN.studyBounds || !(PLAN.studyBounds.west < PLAN.studyBounds.east))
    throw new Error("this page's live plan carries no usable studyBounds - the camera has nothing to fit to");
  if (!(PLAN.reviewBox && PLAN.reviewBox.width > 0 && PLAN.reviewBox.height > 0))
    throw new Error("this page's live plan carries no review box, so the marks' radii are stated at no camera at all");
  if (!PLAN.radii || !PLAN.radii[PLAN.defaultSlug])
    throw new Error("this page's live plan carries no radius expression for the law it opens on");

  // NO PADDING, AND THAT IS NOT A SAVING - IT IS THE SAME CAMERA. The radii are stated at a review
  // camera that fits this window into the review box with padding 0; a live fit that padded it would
  // be a second camera, and every circle on the page would be the wrong size by that padding.
  var FIT_PADDING_PX = 0;

  // THE MERCATOR SCALE OF A FITTED BOX, done here rather than read off the map, because it is what
  // the review camera's own scale is computed from and the two have to be one arithmetic.
  function worldWidthFor(width, height) {
    var yOf = function (lat) {
      var r = (lat * Math.PI) / 180;
      return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
    };
    var b = PLAN.studyBounds;
    var fx = (b.east - b.west) / 360;
    var fy = yOf(b.south) - yOf(b.north);
    return Math.min(width / fx, height / fy);
  }
  var REVIEW_WORLD = worldWidthFor(PLAN.reviewBox.width, PLAN.reviewBox.height);

  var map = new window.maplibregl.Map({
    container: box,
    style: PLAN.styleUrl,
    // THE CAMERA IS FITTED AT RUNTIME, TO THE BEAT'S OWN WINDOW - never restored from the bake's own
    // zoom. Web is a RANGE of shapes, so the container's aspect is not known when the plate is baked.
    bounds: [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
    fitBoundsOptions: { padding: FIT_PADDING_PX, animate: false },
    maxZoom: 22,
    attributionControl: false,
    locale: {
      "NavigationControl.ZoomIn": PLAN.locale.zoomIn,
      "NavigationControl.ZoomOut": PLAN.locale.zoomOut,
      "Map.Title": PLAN.locale.title
    }
  });
  window.__mwMap = map;
  // MAPTILER'S OWN CONTROLS, by the owner's instruction - not a rail of buttons beside the map. The
  // compass is off: nothing in this beat rotates, and a control that changes nothing is a dead one.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && checked.value) || PLAN.defaultSlug;
  }

  // THE ONE NUMBER EVERY SIZE ON THIS PAGE IS MULTIPLIED BY. It is 1 at the review camera - which is
  // the window the frozen photograph was taken in and the window the page is reviewed at - so the
  // radii the plan carries are CSS pixels there, and the size legend's script-free resting size is a
  // fact rather than an approximation.
  var scale = 1;
  function cameraScale() {
    var canvas = map.getCanvas();
    var w = canvas.clientWidth || PLAN.reviewBox.width;
    var h = canvas.clientHeight || PLAN.reviewBox.height;
    return worldWidthFor(w, h) / REVIEW_WORLD;
  }

  // THE SIZE LEGEND IS SIZED FROM THE SAME NUMBER AS THE MARKS. A proportional symbol map has no
  // axis: the legend is the only instrument for reading an area back as a quantity, and one
  // calibrated to a scale nothing on the page is drawn in is worse than none at all. This beat has
  // already shipped that defect once - a swatch drawn at 1:1 CSS pixels from a radius counted in the
  // drawing's own viewBox units, over-stating every magnitude by about 2x.
  function sizeTheKey() {
    var boxes = figure.querySelectorAll("[data-key-box]");
    for (var i = 0; i < boxes.length; i++) {
      var w = Number(boxes[i].getAttribute("data-key-w"));
      var h = Number(boxes[i].getAttribute("data-key-h"));
      if (!(w > 0) || !(h > 0)) continue;
      boxes[i].style.width = (w * scale).toFixed(3) + "px";
      boxes[i].style.height = (h * scale).toFixed(3) + "px";
    }
  }

  function paintLaw(slug) {
    var expression = PLAN.radii[slug];
    if (!expression) return;
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      if (layer.radius !== "camera" || !map.getLayer(layer.id)) continue;
      // A VALUE-ENCODING CIRCLE HOLDS ITS SCREEN SIZE AS THE READER ZOOMS (mount.mjs, radius
      // "camera"): the multiplier is a NUMBER fixed at the fit, never a ["zoom"] interpolation. The
      // same capacity must not mean two circles at two zooms, and the legend beside it never moves.
      map.setPaintProperty(layer.id, "circle-radius", ["*", expression, scale]);
    }
    figure.setAttribute("data-live-law", slug);
  }

  function mountLayers() {
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      if (!map.getSource(layer.id)) map.addSource(layer.id, { type: "geojson", data: layer.data });
      var spec = { id: layer.id, type: layer.type, source: layer.id };
      if (layer.layout) spec.layout = layer.layout;
      if (layer.paint) spec.paint = JSON.parse(JSON.stringify(layer.paint));
      if (layer.filter) spec.filter = layer.filter;
      // A circle layer added with NO radius draws MapLibre's own default 5px for one frame, which is
      // a visible flash of a number this beat never computed. The law is applied at mount.
      if (layer.radius === "camera") {
        if (!spec.paint) spec.paint = {};
        spec.paint["circle-radius"] = ["*", PLAN.radii[currentSlug()] || PLAN.radii[PLAN.defaultSlug], scale];
      }
      map.addLayer(spec);
      // ONE CLOCK FOR THE LAW CHANGE, AND IT IS THE BEAT'S. MapLibre eases every paint change over
      // its own default 300 ms; the table's swatches are eased by the stylesheet over the beat's own
      // number, and two clocks on one gesture is two halves of one reading coming apart mid-travel.
      if (layer.radius === "camera")
        map.setPaintProperty(layer.id, "circle-radius-transition", { duration: PLAN.changeMs, delay: 0 }, { validate: false });
    }
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against, and the reader would keep the provider's own water with
    // nothing to say so.
    // WHAT THE SWEEP KEEPS, AND WHAT IT IS RE-INKED IN. A beat carrying no countries in its own
    // marks names the provider geography it keeps, and the ink it keeps it in; a beat that names
    // nothing gets the bare sweep exactly as before this field existed.
    var GEO = PLAN.basemap || { keepLabels: [], keepTextures: [], ink: [] };
    function reOf(r) { return new RegExp(r.source, r.flags); }
    assertLiveStyleAnswered(
      applyLiveStyle(map, {
        tints: PLAN.tints,
        keepLabels: (GEO.keepLabels || []).map(reOf),
        keepTextures: (GEO.keepTextures || []).map(reOf)
      }),
      PLAN.styleName || PLAN.styleUrl
    );
    // AND IT IS ASSERTED THE SAME WAY: a rule that reached no layer would leave the frontier in
    // MapTiler's own pink under a map painted in the direction's, with nothing red anywhere.
    assertBasemapInkAnswered(applyBasemapInk(map, GEO.ink || []), PLAN.styleName || PLAN.styleUrl);
    scale = cameraScale();
    mountLayers();
    paintLaw(currentSlug());
    sizeTheKey();
  });

  function fitToStudy() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds(
      [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
      { padding: FIT_PADDING_PX, animate: false }
    );
    // THE READER'S LEASH, set once the camera has actually fitted. The floor is the published
    // framing - a reader can never pull back past the view the title makes its claim about - and the
    // CEILING IS THE SUBJECT THE HEADLINE NAMES. The reason to come closer on this beat is the
    // caveat's own claim, that a circle sits at the capacity-weighted centre of its country's OWN
    // stations rather than at its centroid, and that claim is unreadable at the published width. So
    // the window is never allowed to be narrower than that country: a reader who has come in to see
    // where inside it the centre of gravity falls can always still see the whole of it around them.
    var fitted = map.getZoom();
    var visible = map.getBounds();
    var visibleSpan = Math.abs(visible.getEast() - visible.getWest());
    map.setMinZoom(fitted);
    map.setMaxZoom(fitted + Math.max(Math.log2(visibleSpan / PLAN.subject.spanDeg), 0));
    if (visibleSpan < 360) map.setMaxBounds(visible); else map.setMaxBounds(null);
    // AND THE MARKS ARE RE-DERIVED FROM THE CAMERA THE FIT PRODUCED, never from the box. They are
    // held at that size through every zoom that follows; only another FIT moves them.
    scale = cameraScale();
    paintLaw(currentSlug());
    sizeTheKey();
    figure.setAttribute("data-live-view", map.getCenter().lng.toFixed(4) + "," + map.getCenter().lat.toFixed(4) + "@" + fitted.toFixed(3));
    figure.setAttribute("data-live-span", visibleSpan.toFixed(2));
    figure.setAttribute("data-live-scale", scale.toFixed(4));
  }

  map.on("load", function () {
    var plates = figure.querySelectorAll("[data-plate]");
    for (var i = 0; i < plates.length; i++) plates[i].setAttribute("aria-hidden", "true");
    doc.documentElement.classList.add("mw-live");
    var hint = figure.querySelector(".live-hint");
    if (hint) hint.hidden = false;
    map.resize();
    fitToStudy();
  });
  map.on("resize", function () {
    if (!doc.documentElement.classList.contains("mw-live")) return;
    fitToStudy();
  });
  // AND THE STAGE CAN CHANGE SIZE WITHOUT THE WINDOW, which MapLibre never hears about. The figure is
  // a flex column with a header whose height settles when its faces load, and this box is the one
  // shrinkable item in it: a camera fitted for the box before it settled shows a different slice of
  // the world from the one the page claims, with nothing red. A MapLibre "resize" event fires only
  // when MapLibre resizes ITSELF, so the observer is what turns a settling layout into a re-fit.
  if (window.ResizeObserver)
    new window.ResizeObserver(function () {
      if (!doc.documentElement.classList.contains("mw-live")) return;
      map.resize();
      fitToStudy();
    }).observe(box);

  // THE CONTROL. One listener on the document rather than one per radio: the pills are real radios in
  // a real fieldset, so "change" bubbles and nothing here counts them.
  doc.addEventListener("change", function (event) {
    if (!event.target || event.target.name !== ${NAME}) return;
    paintLaw(event.target.value);
    sizeTheKey();
    hide();
  });

  // THE POINTER IS RESOLVED ON THE LAYER'S OWN FEATURES, never on a collision test of ours: the
  // circle layer answers anywhere inside the drawn circle, and it keeps answering after a zoom and
  // after a pan because there is no coordinate read once at initialisation to go stale. That is the
  // trap this tree has paid for three times.
  var hovering = null;
  // THE ANSWER IS READ OFF THE ROW THE READING ALREADY HAS. One string, one place: the table's row
  // for a mark carries data-detail, the format's own contract for "what this mark answers", and the
  // live map reads it rather than carrying a second copy in the plan.
  function rowFor(key) { return figure.querySelector('tr[data-mark="' + key + '"]'); }
  function detailFor(key) { var row = rowFor(key); return row && row.getAttribute("data-detail"); }
  function hide() {
    hovering = null;
    var tooltip = tip();
    if (tooltip) tooltip.hidden = true;
    if (map.getLayer("mw-active")) map.setFilter("mw-active", ["==", ["get", "key"], "--"]);
    var lit = figure.querySelectorAll("tr[data-mark].mark-active");
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove("mark-active");
  }
  function place(event) {
    var tooltip = tip();
    if (!tooltip || tooltip.hidden) return;
    var e = event && event.originalEvent;
    if (!e) return;
    var pad = 14;
    var x = Math.min(e.clientX + pad, window.innerWidth - tooltip.offsetWidth - 8);
    var y = Math.min(e.clientY + pad, window.innerHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = Math.max(8, x) + "px";
    tooltip.style.top = Math.max(8, y) + "px";
  }
  function show(key, event) {
    if (key !== hovering) {
      hovering = key;
      if (map.getLayer("mw-active")) map.setFilter("mw-active", ["==", ["get", "key"], key]);
      var rows = figure.querySelectorAll("tr[data-mark]");
      for (var i = 0; i < rows.length; i++)
        rows[i].classList.toggle("mark-active", rows[i].getAttribute("data-mark") === key);
      var tooltip = tip();
      if (tooltip) { tooltip.textContent = detailFor(key); tooltip.hidden = false; }
    }
    place(event);
  }
  var hoverLayers = [];
  for (var h = 0; h < PLAN.layers.length; h++) if (PLAN.layers[h].hover) hoverLayers.push(PLAN.layers[h].id);
  // THE SMALLEST CIRCLE UNDER THE POINTER WINS, and on this type that is not a detail. The field
  // overlaps on purpose - the wash is translucent so an overlap reads as one - so a pointer inside
  // Luxembourg is also inside France, and the answer a reader wants is the mark they can see the
  // edge of. Resolved off the LAW IN FORCE, so the same pixel can answer differently under a
  // different exponent, which is true: under a different exponent it IS a different circle.
  function radiusOf(key) {
    var expression = PLAN.radii[currentSlug()] || PLAN.radii[PLAN.defaultSlug];
    for (var i = 2; i + 1 < expression.length; i += 2)
      if (expression[i].indexOf(key) >= 0) return expression[i + 1];
    return Infinity;
  }
  map.on("mousemove", function (event) {
    var live = [];
    for (var i = 0; i < hoverLayers.length; i++) if (map.getLayer(hoverLayers[i])) live.push(hoverLayers[i]);
    var hits = map.queryRenderedFeatures(event.point, { layers: live });
    var best = null;
    for (var j = 0; j < hits.length; j++) {
      var key = hits[j].properties && hits[j].properties.key;
      if (!key || !detailFor(key)) continue;
      if (best === null || radiusOf(key) < radiusOf(best)) best = key;
    }
    if (!best) { map.getCanvas().style.cursor = ""; hide(); return; }
    map.getCanvas().style.cursor = "pointer";
    show(best, event);
  });
  map.on("mouseout", hide);
  map.on("movestart", hide);
})();`;
}

/**
 * THE GUARD THAT READS THE WRITTEN PAGE BACK — the half no declaration-level check can make.
 *
 * `assertOneAreaScale` (in `area-scale.ts`) holds the MARKUP's half of the gesture: the table's 41
 * swatches and the legend's own, re-sized in pure CSS. This one holds the LAYERS' half, and that
 * crossing is what this architecture created — the table re-sizing under a law the map does not
 * paint, or the reverse, is a page where half the beat answers one exponent and half answers the one
 * before it, and neither guard alone can see it because each reads only its own mechanism.
 *
 * `radiusFor` is how the MARKUP derives a radius — the beat's own values and the law's own exponent —
 * and it is an argument for the reason the choropleth's own guard had to grow one: the first version
 * of that guard compared the plan's expressions against the object the plan was BUILT from, and a
 * mutation that gave one country the wrong class passed it, green, because both sides were wrong
 * together. Two readings of one variable is not a check.
 */
export function assertSymbolLawsReachTheLayers(
  html: string,
  d: LiveSymbolsDeclaration,
  radiusFor: (markKey: string, lawSlug: string) => number,
  plateStyle: string,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveSymbolsDeclaration(d, where);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(
    String(html),
  );
  if (!node)
    throw new Error(
      `${where}: the page carries no live plan, so its map is a picture and its control re-sizes the ` +
        `table only`,
    );
  let plan: any;
  try {
    plan = JSON.parse(node[1]);
  } catch (err) {
    throw new Error(
      `${where}: the live plan in the page is not JSON — MapLibre would never boot and the frozen ` +
        `photograph would stand with nothing to say why`,
    );
  }
  if (
    String(html).indexOf(
      `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    ) < 0
  )
    throw new Error(
      `${where}: the committed page does not carry the delivery placeholder in its style URL — a ` +
        `real key has reached a file in the repository`,
    );
  if (d.style !== plateStyle || plan.styleName !== plateStyle)
    throw new Error(
      `${where}: the live map loads the MapTiler style ${JSON.stringify(plan.styleName)} and the ` +
        `plate whose camera facts this beat reads was baked from ${JSON.stringify(plateStyle)}`,
    );
  for (const law of d.laws) {
    const expression = plan.radii?.[law.slug];
    if (!Array.isArray(expression))
      throw new Error(
        `${where}: the live plan carries no radius expression for the law ${JSON.stringify(law.slug)}. ` +
          `The table's swatches would re-size under it and the map would keep the law before it — one ` +
          `control, two scales.`,
      );
    const drawn = new Map<string, number>();
    for (let i = 2; i + 1 < expression.length; i += 2)
      for (const key of expression[i] as string[])
        drawn.set(key, expression[i + 1] as number);
    for (const mark of d.marks) {
      const want = radiusFor(mark.key, law.slug);
      const got = drawn.get(mark.key);
      if (got === undefined || Math.abs(got - want) > 1e-6)
        throw new Error(
          `${where}: under the law ${JSON.stringify(law.slug)} the live map draws ${mark.name} at ` +
            `${JSON.stringify(got ?? null)} where the same law over the beat's own values says ` +
            `${want.toFixed(6)}. Two derivations of one exponent is how half a beat re-sizes and the ` +
            `other half keeps the law before it.`,
        );
    }
    if (drawn.size !== d.marks.length)
      throw new Error(
        `${where}: under the law ${JSON.stringify(law.slug)} the live map sizes ${drawn.size} marks ` +
          `and the beat draws ${d.marks.length}. A mark the expression does not name is drawn at 0 ` +
          `and reads as a place with no data.`,
      );
  }
  const camera = (plan.layers ?? []).filter(
    (layer: any) => layer.type === "circle",
  );
  if (!camera.length)
    throw new Error(
      `${where}: the live plan carries no circle layer, so the map draws no symbol`,
    );
  for (const layer of camera)
    if (layer.radius !== "camera")
      throw new Error(
        `${where}: the circle layer ${JSON.stringify(layer.id)} declares the radius strategy ` +
          `${JSON.stringify(layer.radius ?? null)}. A circle whose size encodes a VALUE is held in ` +
          `screen pixels as the reader zooms ("camera"); a circle that grew with the zoom would make ` +
          `the same capacity two circles at two zooms, and the size legend — the only instrument this ` +
          `type has — would be calibrated to a scale nothing is drawn in.`,
      );
  const labels = (plan.layers ?? []).find(
    (layer: any) => layer.id === "mw-labels",
  );
  if (labels && labels.layout?.["text-allow-overlap"] !== false)
    throw new Error(
      `${where}: the label layer allows overlap. On this beat the labels are anchored on their own ` +
        `marks and MapLibre's collision decides which are drawn — allowing overlap ships a pile of ` +
        `words nobody can read and calls it five labels.`,
    );
  // THE SIZE LEGEND FOLLOWS THE CAMERA, AND THIS REFUSAL WAS WRITTEN BY A MUTATION THAT STAYED
  // GREEN. Taking the three `sizeTheKey()` calls out of the script left every declaration-level
  // check passing, every layer correct and every radius correct — and a legend frozen at whatever
  // the stylesheet's resting rule gave it while the marks moved with the camera. On a type whose
  // only instrument IS that legend, that is the beat's central claim quietly ceasing to be true.
  //
  // It is a check on the page's TEXT, and that is stated rather than hidden: what a written-page
  // guard can see is whether the page carries the boxes and whether its script names them at the
  // three moments the camera can move — the mount, every re-fit, and the change of law. The other
  // half, that the number it writes is the number the layers are painted with, is measured in a real
  // browser and recorded in the beat's own brief.
  const boxes = [...String(html).matchAll(/data-key-w="([\d.]+)" data-key-h="([\d.]+)"/g)];
  if (!boxes.length)
    throw new Error(
      `${where}: the page draws no legend swatch box (\`data-key-w\`/\`data-key-h\`), so the size ` +
        `legend cannot be sized from the camera. A proportional symbol map has no axis: a legend ` +
        `that does not travel with the marks is its only instrument, calibrated to a scale nothing ` +
        `on the page is drawn in.`,
    );
  for (const [, w, h] of boxes)
    if (!(Number(w) > 0) || !(Number(h) > 0))
      throw new Error(`${where}: a legend swatch box is declared ${w} x ${h} review pixels`);
  const sized = (String(html).match(/sizeTheKey\(\)/g) ?? []).length;
  if (sized < 3)
    throw new Error(
      `${where}: the page's script sizes the legend ${sized} time(s). It has to happen at the mount, ` +
        `at every re-fit of the camera and at every change of law — the marks move at all three, and ` +
        `a legend that misses one states a scale the map is not drawn at.`,
    );
  if (!/class="map-layer"/.test(String(html)))
    throw new Error(
      `${where}: the page carries a live plan and no box to draw it in`,
    );
  if (!/<div class="live-hint"[^>]*\shidden/.test(String(html)))
    throw new Error(
      `${where}: the sentence describing the live map's controls is not hidden in the delivered ` +
        `markup. With JavaScript off it is a description of a map that cannot be dragged — the dead ` +
        `control this arrangement exists not to ship.`,
    );
}
