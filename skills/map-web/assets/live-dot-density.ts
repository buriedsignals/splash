// twin/skills/map-web/assets/live-dot-density.ts
//
// THE DOT-DENSITY MAP AS A LIVE MAP — every dot a MapLibre circle over MapTiler's own tiles.
//
// THE RULING (2026-09-15, the owner, on `proof/web-proportional-symbol-europe-capacity/renders/`):
// *"la map doit prendre toute la largeur quitte à afficher plus de map. Regarde le pilote qu'on a
// produit dans scrolly, c'est presque la même sauf qu'avec web on peut avoir des contrôles, zoom,
// déplacement et hover en plus directement dans MapTiler."* And, on the projection: *"oui une carte
// MapLibre plate pas un globe."* `proof/web-choropleth-europe-lowcarbon` is the validated pattern
// and this file copies its arrangement rather than inventing a second one: two layers, the plate
// underneath, MapTiler's own controls, the pointer resolved by `queryRenderedFeatures`, the key
// never in a committed file.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS FILE IS FOR, AND WHY IT IS NOT `live-choropleth.ts`.
//
// A choropleth's marks are the provider's own polygons and its gesture repaints them. A dot-density
// map's marks are the BEAT'S OWN — a seeded field of points that exists nowhere but in this beat —
// and its gesture is not a colour at all. It is the DOT VALUE: what one dot is worth. That number is
// the whole argument of the type. Change it and the same frozen file reads as a crowd or as a
// scatter, with nothing else touched.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE ONE RULE THIS TYPE MAY NOT GET WRONG — `shared/map-beat/mount.mjs`, the trunk's own words:
//
//   "`radius: "ground"` — the circle stands for a fixed piece of GROUND (a dot-density dot). Its
//    ground area must be constant, so its screen radius doubles per zoom level, DURING the gesture
//    and not only after it settles — an interpolation, never a number."
//
// So the radius is `groundRadiusExpression` from that module, IMPORTED and not restated: this
// directory carries the trunk module byte-identical (`carried-copies.test.ts` holds it so), and the
// expression it returns depends only on the bake's own zoom, so it is built here at BUILD time and
// travels in the plan as data. No second copy of the formula exists anywhere in the beat.
//
// AND THE CONSEQUENCE, WHICH IS WORTH STATING BECAUSE IT IS WHY THE RULE EXISTS. A dot's ground area
// is constant and so is the ground it sits on, so the RATIO of ink to land — the density the map
// claims — is the same at every zoom. A ground-scaled dot field is scale-invariant: zooming changes
// what is in frame and never what the map asserts. A dot drawn at a fixed pixel radius would instead
// claim a different density at every zoom level, which is not a style defect but a different map.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE FLOOR, AND WHY IT IS INERT AT THE PUBLISHED FRAMING BY CONSTRUCTION.
//
// Below some radius a browser stops depositing a circle at all. Measured twice, from two ends:
// `proof/mapgen-dot-web` at 375x812 held a field at 0.50px and it deposited **6 % of the ink the
// baked plate deposits over the same ground** (0.0119 against 0.1856) while the page still announced
// its dot count; and `proof/web-dot-density-europe-stations` drew its own field at nine constant
// radii on the delivered page and compared the deposited ink against the r² it claims —
//
//     r px   0.40   0.50   0.60   0.75   0.90   1.00   1.25   1.50   2.00
//     ink/r²  0.31   0.44   0.58   0.77   0.92   0.99   1.09   1.10   1.00
//
// — so a circle is faithful at 1.0px and has lost a quarter of itself by 0.75. The ground rule needs
// a bottom, and `groundRadiusExpression` takes one.
//
// A floor is a LIE about density wherever it is in force, so the beat is asked to derive the dot's
// ground size such that the dot is drawn at exactly the floor AT THE FRAMING THE BEAT PUBLISHES.
// The two then coincide at the fit, the reader can only ever zoom IN from there (`minZoom` is the
// fitted zoom), and the floor is therefore never in force on the delivered page. It exists for a
// narrower container — a phone, a column — where the fit is smaller, and there it buys a visible
// field at the price of an overstated density, which is the better of two bad states and is said
// out loud rather than discovered.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE POINTER'S REACH IS NOT THE DOT'S SIZE, and this is the arithmetic the SVG form got wrong.
//
// The record on the old form of this beat: a ground dot of 1.2px against a 32px pointer reach. As
// SVG those two are the same object — the circle is the hit target — so an honest dot (small,
// ground-scaled) and a reachable target (a fingertip) could not both be had. On a layer they are two
// different things: `queryRenderedFeatures` takes a BOX, so the reach is the box and the dot's size
// governs nothing about the answer. The box is this format's own 28px target, and the NEAREST dot to
// its centre answers — in a field this dense a box catches several, and "the first one MapLibre
// happened to return" is not an answer to "what is under my finger".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT A POINTER ANSWERS, AND WHY IT IS THE WHOLE SITE. What a dot map hides, once a dot is worth a
// quantity rather than a place, is HOW MANY DOTS ONE PLACE GOT. So pointing at one dot lights every
// dot of the same site and names the site: the reader sees a 6 000 MW station wearing its whole
// constellation at once, and the placement rule — the thing the type never shows — becomes a fact
// they can touch. It is the marks themselves that answer, never a ring plastered over them (the
// owner's second arbitration), and no dot changes SIZE under a pointer: on this type a size is a
// value, so a dot that grew to answer would be a dot that lied to answer.

import { groundRadiusExpression } from "./mount.mjs";

/** Assembled, never written whole: this file's OUTPUT travels into a page that `deliver` rewrites
 *  every occurrence of the placeholder in. A literal here would be rewritten to the key itself and
 *  the "is this page still unkeyed" test would then read "does the style URL contain the key",
 *  which is true of every delivered page — so every delivered map would refuse to boot. */
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

const SOURCE_LAYER = "administrative";
const A2 = /^[A-Z]{2}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** One resolution the reader may put the same frozen file at. */
export type DotValueRule = {
  /** The rule's own key; the radio's id and value carry its slug. */
  key: string;
  /** The pill's short word, and the full sentence a screen reader is given. */
  label: string;
  announce: string;
  /** "1 point = une centrale" — the line `types/dot-density.md` calls the single piece of text that
   *  turns a visual impression of density into a number. It is shown under every rule, never
   *  footnoted, and it is the only thing on the page that says what the map is measured in. */
  keyLine: string;
  /** What this rule does to the reading, revealed when it is chosen. `null` for the rule the page
   *  opens on: the untouched map is the claim, not a comparison. */
  note: string | null;
  /** The dots themselves, as three parallel streams rather than GeoJSON features.
   *
   *  A FeatureCollection of 9 062 points is about 95 bytes a point of braces and keys; these three
   *  arrays are about 17, and the script assembles the features on arrival. The saving is roughly
   *  three quarters of a megabyte on a page that already inlines MapLibre, which is the difference
   *  between a page a newsroom will embed and one it will not. */
  xy: number[];
  /** Which treatment each dot wears, 0..n-1 — also its draw order, low first. */
  kind: number[];
  /** Which site each dot belongs to, an index into `answers.parts`. */
  site: number[];
};

export type LiveDotDensityDeclaration = {
  /** The MapTiler style the plate was baked from. The live map loads the same one, so the two
   *  layers cannot be two cartographies. */
  style: string;
  /** The two tints the plate was baked in, and the two the live style is repainted with. */
  tints: { water: string; land: string };
  /** What the camera fits to at runtime — the beat's own declared window, which is the box the plate
   *  was baked by fitting, so the plate and the live map are ONE camera. */
  studyBounds: { west: number; east: number; south: number; north: number };
  /** The plate's own drawn size, ground scale and zoom, recorded by the bake. */
  frame: { width: number; height: number };
  degreesPerPixel: number;
  bakeZoom: number;
  /** ISO A2 of every country the file counts. The outline of the study is drawn from MapTiler's own
   *  Countries tileset, joined on `iso_a2` — the join `types/dot-density.md` names as the one thing
   *  that goes wrong, and a code that matches nothing draws nothing, silently. */
  studyCodes: string[];
  /** One colour per treatment, and what a pointed-at dot of that treatment becomes. Measured by the
   *  beat against the LAND the plate is baked in, never against the paper. */
  tones: string[];
  activeTones: string[];
  /** THE DOT'S SIZE, AND IT IS ONE NUMBER FOR EVERY DOT UNDER EVERY RULE.
   *
   *  `bakePx` is its radius at the bake's own zoom, from which the ground rule derives every other
   *  zoom. `floorPx` is the bottom described in this file's header. `groundMetres` is what `bakePx`
   *  IS on the ground, carried so the page can say it in the reader's own words.
   *
   *  ONE radius, because on this type the radius is the dot VALUE: two sizes in one field is two dot
   *  values in one field, and the map would then be measured in two units at once. */
  radius: { bakePx: number; floorPx: number; groundMetres: number };
  /** The format's own hit target, in CSS px. It is the pointer's reach, and it is also what the zoom
   *  CEILING is derived from — see `fitToStudy` in the script. */
  hitPx: number;
  /** The rules, in the order the control offers them, and the one the page opens on. */
  rules: DotValueRule[];
  defaultKey: string;
  /** The outline a counted country carries, the one every other country carries, and its width. */
  border: { studied: string; other: string; width: number };
  /** WHAT A POINTER ANSWERS, IN PIECES RATHER THAN IN SENTENCES — for the same reason the dots are
   *  three streams. 8 299 whole answers are about 580 KB of one page; the pieces are about 200.
   *
   *  Every piece is CUT AT BUILD TIME and only joined in the browser. That is the line this format
   *  draws: a page script may not FORMAT a word or a number, because the embedded faces are subset
   *  to the characters the page can show and a glyph composed at runtime is a glyph nobody cut. A
   *  join of two strings that are both in this JSON — which the font machine reads — composes no
   *  character that was not already there. */
  answers: {
    /** What goes between two pieces, and the tail every site's answer ends on. */
    sep: string;
    tail: string;
    /** The vocabularies the pieces index into. */
    fuelWords: string[];
    countryWords: string[];
    /** Per site: its fuel, its megawatts as a cut word, its country, its share as a cut word. */
    parts: [number, string, number, string][];
    /** Per rule slug, how many dots each site got. */
    counts: Record<string, number[]>;
    /** The phrase for a count, cut at build time, for every count that actually occurs. */
    countWords: Record<string, string>;
  };
  /** MapLibre's own control names, in the page's language: the library ships English defaults and a
   *  French page that leaves them hands a screen reader an English button. */
  locale: { title: string; zoomIn: string; zoomOut: string };
  /** How long a dot takes to arrive or leave when the rule changes, in ms. */
  changeMs: number;
};

/** The slug a rule's key is written as everywhere — the radio's id and value, the generated CSS, the
 *  plan's own keys. One vocabulary, three readers, which is what keeps the table and the map from
 *  answering two different resolutions. */
export function dotSlugOf(key: string): string {
  const slug = String(key)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug))
    throw new Error(
      `live-dot-density: ${JSON.stringify(key)} does not reduce to a slug, and the slug is the radio's ` +
        `own id — a rule with no slug is a rule with no control`,
    );
  return slug;
}

/** The radio id a slug takes. `chart-stack-` is the FORMAT'S DISCOVERY CONTRACT for a control that
 *  changes the picture and owes the reader a sentence (`interaction-plan.ts`, `stackOptionSlugs`),
 *  not a copy-paste slip. */
export function dotOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

export function assertLiveDotDensityDeclaration(
  d: LiveDotDensityDeclaration,
): LiveDotDensityDeclaration {
  if (!d || typeof d.style !== "string" || !d.style)
    throw new Error(
      "live-dot-density: the declaration names no MapTiler style, so the live map and the baked " +
        "plate would be two cartographies",
    );
  for (const key of ["water", "land"] as const)
    if (!HEX.test(d.tints?.[key] ?? ""))
      throw new Error(
        `live-dot-density: the ${key} tint is ${JSON.stringify(d.tints?.[key])}; the live style is ` +
          `painted with the plate's own two tints, read back from its geometry.json`,
      );
  const b = d.studyBounds;
  if (!b || !(b.west < b.east) || !(b.south < b.north))
    throw new Error(
      `live-dot-density: the study bounds are ${JSON.stringify(b)} — \`fitBounds\` answers an ` +
        `inverted or empty box by framing the rest of the world`,
    );
  if (
    !(d.frame?.width > 0) ||
    !(d.frame?.height > 0) ||
    !(d.degreesPerPixel > 0) ||
    !(d.bakeZoom > 0)
  )
    throw new Error(
      "live-dot-density: this plate predates the camera facts (frame + degreesPerPixel + zoom): " +
        "re-bake it. The ground rule is `r · 2 ** (zoom − bakeZoom)`, so a missing bake zoom is a " +
        "field drawn at an arbitrary density.",
    );
  if (!d.studyCodes?.length)
    throw new Error(
      "live-dot-density: no country is counted, so the outline of the study would match nothing and " +
        "a reader could not tell the ground the count covers from the ground it does not",
    );
  for (const code of d.studyCodes)
    if (!A2.test(code))
      throw new Error(
        `live-dot-density: ${JSON.stringify(code)} is not an ISO A2 code. The Countries tileset keys ` +
          `on \`iso_a2\`, and a key that does not match draws nothing — which renders as a country ` +
          `quietly outside the study rather than as an error. That silent join is the one failure ` +
          `\`types/dot-density.md\` names by hand.`,
      );
  if (!d.tones?.length || d.tones.length !== d.activeTones?.length)
    throw new Error(
      "live-dot-density: every treatment needs a colour AND what it becomes under a pointer — the " +
        "shape itself is what answers (the owner's second arbitration), darkened from ITS OWN fill",
    );
  for (const list of [d.tones, d.activeTones])
    for (const colour of list)
      if (!HEX.test(colour))
        throw new Error(
          `live-dot-density: ${JSON.stringify(colour)} is not a measured hex colour`,
        );
  const r = d.radius;
  if (!(r?.bakePx > 0) || !(r?.floorPx > 0) || !(r?.groundMetres > 0))
    throw new Error(
      "live-dot-density: the dot needs a radius at the bake's zoom, a floor, and what that radius IS " +
        "on the ground. All three are derived by the beat and none may be typed: a dot's size is its " +
        "value on this type.",
    );
  if (!(d.hitPx > 0))
    throw new Error(
      "live-dot-density: the pointer's reach is the format's own hit target and the zoom ceiling is " +
        "derived from it; a declaration that names neither leaves both to be typed",
    );
  if (!d.rules?.length)
    throw new Error(
      "live-dot-density: no dot value reaches the layers, so the reader's control would move the key " +
        "and leave the field at the resolution it opened with",
    );
  if (!d.rules.some((rule) => rule.key === d.defaultKey))
    throw new Error(
      `live-dot-density: the page opens on rule ${JSON.stringify(d.defaultKey)} and no rule carries ` +
        `that key`,
    );
  const slugs = new Set<string>();
  for (const rule of d.rules) {
    const slug = dotSlugOf(rule.key);
    if (slugs.has(slug))
      throw new Error(
        `live-dot-density: two rules reduce to the slug ${JSON.stringify(slug)}; one would silently ` +
          `paint over the other`,
      );
    slugs.add(slug);
    if (!rule.keyLine)
      throw new Error(
        `live-dot-density: the rule ${JSON.stringify(rule.key)} ships no "one dot = …" line. ` +
          `\`types/dot-density.md\`: drop that key and the map stops being quantitative at all, no ` +
          `matter how careful the colours are.`,
      );
    if (!Array.isArray(rule.xy) || rule.xy.length < 2 || rule.xy.length % 2)
      throw new Error(
        `live-dot-density: the rule ${JSON.stringify(rule.key)} carries ${rule.xy?.length ?? 0} ` +
          `coordinate numbers, which is not a stream of lon/lat pairs`,
      );
    const dots = rule.xy.length / 2;
    if (rule.kind.length !== dots || rule.site.length !== dots)
      throw new Error(
        `live-dot-density: the rule ${JSON.stringify(rule.key)} has ${dots} dots, ` +
          `${rule.kind.length} treatments and ${rule.site.length} sites. Three streams of different ` +
          `lengths is a field whose dots wear another dot's colour and answer another dot's site.`,
      );
    for (const k of rule.kind)
      if (!(k >= 0 && k < d.tones.length))
        throw new Error(
          `live-dot-density: a dot of the rule ${JSON.stringify(rule.key)} wears the treatment ${k} ` +
            `and only ${d.tones.length} are declared`,
        );
    const counts = d.answers?.counts?.[dotSlugOf(rule.key)];
    if (!Array.isArray(counts) || counts.length !== d.answers.parts.length)
      throw new Error(
        `live-dot-density: the rule ${JSON.stringify(rule.key)} has no per-site dot count, so a ` +
          `pointer could not answer the one reading this type hides — how many dots this place got`,
      );
    const total = counts.reduce((sum, n) => sum + n, 0);
    if (total !== dots)
      throw new Error(
        `live-dot-density: the rule ${JSON.stringify(rule.key)} draws ${dots} dots and its per-site ` +
          `counts add to ${total}. The count IS the field: a page that draws one number and answers ` +
          `another is the apportionment going wrong where nobody looks.`,
      );
  }
  const a = d.answers;
  if (!a?.parts?.length || !a.fuelWords?.length || !a.countryWords?.length)
    throw new Error(
      "live-dot-density: the pointer answers nothing, so every dot is silent",
    );
  for (const [fuel, mwWord, country, shareWord] of a.parts)
    if (
      !(fuel >= 0 && fuel < a.fuelWords.length) ||
      !(country >= 0 && country < a.countryWords.length) ||
      !mwWord ||
      !shareWord
    )
      throw new Error(
        "live-dot-density: a site's answer indexes a word that is not in the page. Every glyph a " +
          "reader can be shown is cut into the embedded faces at build time, so a piece that is not " +
          "here is a piece no face carries.",
      );
  for (const rule of d.rules)
    for (const n of a.counts[dotSlugOf(rule.key)])
      if (n > 0 && !a.countWords[String(n)])
        throw new Error(
          `live-dot-density: no phrase is cut for a site that got ${n} dot(s); the pointer would ` +
            `answer with an empty tail`,
        );
  for (const key of ["title", "zoomIn", "zoomOut"] as const)
    if (!d.locale?.[key])
      throw new Error(
        `live-dot-density: MapLibre's ${key} control is left with the library's English default on a ` +
          `French page — a screen reader would read it out in the wrong language`,
      );
  if (!(d.changeMs >= 0))
    throw new Error(
      "live-dot-density: the change of resolution needs a duration (the owner's fourth arbitration: " +
        "a state change interpolates rather than jumps)",
    );
  return d;
}

/** THE PLAN THE PAGE CARRIES, as JSON, read back by a script that never met the code that wrote it.
 *  It is a FILE before it is an object, so what is checked here is checked again in the browser. */
export function liveDotDensityPlan(
  d: LiveDotDensityDeclaration,
): Record<string, unknown> {
  assertLiveDotDensityDeclaration(d);
  const source = {
    type: "vector",
    url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY_PLACEHOLDER}`,
  };
  const level0 = ["==", ["get", "level"], 0];
  const defaultSlug = dotSlugOf(d.defaultKey);

  // THE RADIUS, FROM THE TRUNK, ONCE. It depends on nothing but the bake's zoom, so it is data here
  // rather than a computation in the page — and there is exactly one of it, shared by the field and
  // by the layer that answers a pointer, because two expressions for one circle is the defect
  // `mount.mjs` records under "one mark, two halves, two mechanisms".
  const radius = groundRadiusExpression(d.bakeZoom, {
    floorPx: d.radius.floorPx,
    uniformRadius: d.radius.bakePx,
  });
  const colour = [
    "match",
    ["get", "k"],
    ...d.tones.slice(0, -1).flatMap((tone, k) => [k, tone] as unknown[]),
    d.tones[d.tones.length - 1],
  ];
  const activeColour = [
    "match",
    ["get", "k"],
    ...d.activeTones.slice(0, -1).flatMap((tone, k) => [k, tone] as unknown[]),
    d.activeTones[d.activeTones.length - 1],
  ];

  const layers: Record<string, unknown>[] = [
    // THE OUTLINE OF THE STUDY, and it is the only thing on this map the provider draws. It says
    // which ground the count covers: without it a country with no dot is indistinguishable from a
    // country the file never had. Beneath the basemap's water, because Countries carries polygons
    // only, so its outlines trace coast as well as border and its coast is generalised per zoom —
    // measured at 1.5–3.6 CSS px over the basemap's own on the scrolly pilot.
    {
      id: "mw-study",
      type: "line",
      beneath: "water",
      source,
      sourceLayer: SOURCE_LAYER,
      filter: level0,
      paint: {
        "line-color": [
          "case",
          ["match", ["get", "iso_a2"], d.studyCodes, true, false],
          d.border.studied,
          d.border.other,
        ],
        "line-width": d.border.width,
      },
    },
  ];

  // ONE PAIR OF LAYERS PER RULE, all mounted, one pair visible. Mounted rather than added and removed
  // because a source added on a click is a source whose tiles arrive after the click: the reader
  // would watch the field draw itself in, which reads as a page loading rather than as an answer.
  for (const rule of d.rules) {
    const slug = dotSlugOf(rule.key);
    const visible = slug === defaultSlug;
    layers.push(
      {
        id: `mw-dots-${slug}`,
        rule: slug,
        type: "circle",
        beneath: null,
        stream: { xy: rule.xy, kind: rule.kind, site: rule.site },
        visible,
        hover: true,
        // THE RARE KIND IS DRAWN LAST. The claim counts places by kind, and a nuclear dot buried
        // under a solar one is a claim nobody can check. `circle-sort-key` is ascending, so the
        // treatment index IS the draw order and no second ordering exists to fall out of step.
        //
        // IT IS A LAYOUT PROPERTY AND NOT A PAINT ONE, which is not a detail: written into `paint`,
        // `addLayer` THROWS on the first dot layer, `mountLayers` stops there, and the page renders
        // the basemap and the study outline with no dots at all — a dot map with nothing on it, and
        // no error a reader or a still could see. Found by looking at the frozen fallback.
        layout: { "circle-sort-key": ["get", "k"] },
        paint: {
          "circle-radius": radius,
          "circle-color": colour,
          "circle-opacity": 1,
        },
      },
      // WHAT A POINTED-AT SITE BECOMES — the same circles, in the same places, at the same size,
      // repainted and drawn above their own field. Filtered to nothing until a pointer lands.
      {
        id: `mw-hot-${slug}`,
        rule: slug,
        type: "circle",
        beneath: null,
        reads: `mw-dots-${slug}`,
        visible,
        hover: false,
        filter: ["==", ["get", "s"], -1],
        layout: { "circle-sort-key": ["get", "k"] },
        paint: {
          "circle-radius": radius,
          "circle-color": activeColour,
          "circle-opacity": 1,
        },
      },
    );
  }

  return {
    styleUrl: `https://api.maptiler.com/maps/${d.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: d.style,
    projection: "mercator",
    tints: d.tints,
    studyBounds: d.studyBounds,
    frame: d.frame,
    degreesPerPixel: d.degreesPerPixel,
    bakeZoom: d.bakeZoom,
    changeMs: d.changeMs,
    hitPx: d.hitPx,
    radius: d.radius,
    locale: d.locale,
    defaultSlug,
    rules: d.rules.map((rule) => ({
      slug: dotSlugOf(rule.key),
      dots: rule.xy.length / 2,
    })),
    answers: d.answers,
    layers,
  };
}

/**
 * THE RULES. Every one of them is conditional on `.mw-live` except the live box's own resting state,
 * so a page whose script never runs is drawn exactly as it was before this file existed.
 */
export function liveDotDensityCss({ scope }: { scope: string }): string {
  const live = `.mw-live ${scope}`;
  return [
    // BOTH LAYERS ARE ONE BOX, AND THE BOX IS THE STAGE. The format's cell carries the drawing's own
    // viewBox ratio so `preserveAspectRatio="none"` cannot stretch it; neither of these two is
    // stretched — the fallback is `slice` (cover) and a live map has no ratio to protect — so both
    // take the whole track instead of the cell inside it, which is how the scrolly sizes its stage.
    `${scope} .map-layer, ${scope} svg.chart { grid-column: 1 / -1; grid-row: 1; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; }`,
    `${scope} .map-layer { visibility: hidden; }`,
    `${live} .map-layer { visibility: visible; }`,
    // ONE BASEMAP, NOT TWO. Everything the page drew of the ground gives way to MapTiler's own, and
    // only once the live map is actually up: with no script the plate is the whole picture.
    `${live} [data-plate] { display: none; }`,
    // WITH NO SCRIPT THERE IS NO DESCRIPTION EITHER — a sentence about dragging a map that cannot be
    // dragged is exactly the dead control this arrangement exists not to ship. `[hidden]` is a UA
    // rule, so it is restated here as an author rule no author rule can outrank by accident.
    `${scope} .live-hint[hidden] { display: none; }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT-FREE HALF OF THE GESTURE, and it is the half that survives everything.
 *
 * No stylesheet reaches a MapLibre circle layer, so the FIELD is repainted by script. The KEY ("one
 * dot = …") and the per-country dot counts are not: every rule's variant is written into the page,
 * stacked in one grid cell, and one is revealed by `:has()` on a real radio. A reader with no script
 * still operates the whole control and still reads what each resolution costs — the gesture moves
 * from the picture to the table rather than disappearing.
 *
 * NO SELECTOR HERE IS GROUPED (a descendant prefix binds to the first selector of a group only), and
 * the default rule is emitted TWICE — once unscoped, which is the state an engine with no `:has()`
 * never leaves, and once under its own `:has(…:checked)`, so no rule is a special case that drifts.
 */
export function dotValueCss(
  d: LiveDotDensityDeclaration,
  { scope, idPrefix }: { scope: string; idPrefix: string },
): string {
  assertLiveDotDensityDeclaration(d);
  const defaultSlug = dotSlugOf(d.defaultKey);
  const lines: string[] = [
    `/* The dot values this beat declared: ${d.rules.length} resolutions over one frozen file.`,
    `   Radios plus :checked/:has(), generated once at build time — no script, and the reason the`,
    `   key and the table still answer the reader's own choice when the live map cannot. */`,
    // Stacked in one grid cell, so the row is always as tall and as wide as the LONGEST variant and
    // choosing a resolution never moves the map (the owner's first arbitration).
    `${scope} .dot-variants { display: grid; align-items: center; }`,
    `${scope} .dot-variants > [data-dot-variant] { grid-area: 1 / 1; }`,
    `${scope} [data-dot-variant] { opacity: 0; visibility: hidden; }`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    `${scope} [data-dot-variant="${defaultSlug}"] { opacity: 1; visibility: visible; }`,
  ];
  for (const rule of d.rules) {
    const slug = dotSlugOf(rule.key);
    const on = `${scope}:has(#${dotOptionId(idPrefix, slug)}:checked)`;
    lines.push(`${on} [data-dot-variant] { opacity: 0; visibility: hidden; }`);
    lines.push(
      `${on} [data-dot-variant="${slug}"] { opacity: 1; visibility: visible; }`,
    );
    if (rule.note !== null)
      lines.push(`${on} [data-stack-note="${slug}"] { visibility: visible; }`);
  }
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-dot-variant] { transition: opacity ${d.changeMs}ms ease, visibility ${d.changeMs}ms; }`,
    `}`,
  );
  return lines.join("\n");
}

/** The options a component draws, in declaration order. */
export function dotValueOptionsForMarkup(
  d: LiveDotDensityDeclaration,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  const defaultSlug = dotSlugOf(d.defaultKey);
  return d.rules.map((rule) => {
    const slug = dotSlugOf(rule.key);
    return {
      id: dotOptionId(idPrefix, slug),
      slug,
      label: rule.label,
      announce: rule.announce,
      isDefault: slug === defaultSlug,
    };
  });
}

/** Every "one dot = …" line, by the slug that reveals it. */
export function dotValueKeyLinesForMarkup(
  d: LiveDotDensityDeclaration,
): { slug: string; text: string }[] {
  return d.rules.map((rule) => ({
    slug: dotSlugOf(rule.key),
    text: rule.keyLine,
  }));
}

/** Every sentence a rule owes the reader, by the slug that reveals it. The default has none. */
export function dotValueNotesForMarkup(
  d: LiveDotDensityDeclaration,
): { slug: string; text: string }[] {
  return d.rules
    .filter((rule) => rule.note !== null)
    .map((rule) => ({ slug: dotSlugOf(rule.key), text: rule.note as string }));
}

/**
 * THE SCRIPT, authored as a classic `<script>` body — no module, no bundler, so it keeps working in
 * a CMS iframe or a sandboxed embed that refuses module scripts. It derives no geometry and formats
 * no WORD: every glyph a reader can be shown was cut into the page's own embedded faces at build
 * time, which is why the answers travel as pieces in the plan's JSON and are only JOINED here.
 *
 * `styleModule` is `assets/style.mjs`'s own source with its `export` keywords stripped, handed in by
 * the beat: the sweep that decides what a basemap layer becomes is stated ONCE, in that file, and
 * applied twice — to the style document the plate is baked from, and to the live style here.
 */
export function liveDotDensityScript(
  d: LiveDotDensityDeclaration,
  {
    scope,
    styleModule,
    controlName,
  }: { scope: string; styleModule: string; controlName: string },
): string {
  assertLiveDotDensityDeclaration(d);
  if (
    typeof styleModule !== "string" ||
    !/function\s+applyLiveStyle/.test(styleModule)
  )
    throw new Error(
      "live-dot-density: the style sweep is handed in by the beat (the source of " +
        "`skills/map-web/assets/style.mjs`, with its `export` keywords stripped) because a page " +
        "script cannot import. What it was given does not define `applyLiveStyle`.",
    );
  if (/\bexport\s/.test(styleModule))
    throw new Error(
      "live-dot-density: the style sweep still carries `export`, which is a syntax error in a classic " +
        "script. The whole live layer would fail to parse and the fallback would stand with no error " +
        "anyone could see — the one failure mode this arrangement cannot report.",
    );
  liveDotDensityPlan(d);
  const NAME = JSON.stringify(controlName);
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
  // exist yet. Captured at init it is null for the life of the page: every hover then lights the
  // dots and says nothing — the shape of a defect that survives every unit test.
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
  if (!(PLAN.degreesPerPixel > 0) || !(PLAN.bakeZoom > 0))
    throw new Error("this page's live plan predates the camera facts, so its dots have no ground size");
  if (!PLAN.radius || !(PLAN.radius.groundMetres > 0))
    throw new Error("this page's live plan does not say what one dot covers on the ground");

  // NO PADDING, AND THAT IS NOT A SAVING — IT IS THE SAME CAMERA. The plate under this map was baked
  // by fitting the BEAT'S OWN declared window into its frame with padding 0; a live fit that padded
  // the same window would be a second camera, and the swap from plate to live map would be a jump.
  var FIT_PADDING_PX = 0;

  var map = new window.maplibregl.Map({
    container: box,
    style: PLAN.styleUrl,
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
  // MAPTILER'S OWN CONTROLS, by the owner's instruction — not a rail of buttons beside the map. The
  // compass is off: nothing in this beat rotates, and a control that changes nothing is a dead one.
  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

  function waterId() {
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++)
      if (styleDecisionFor(layers[i]).tint === "water") return layers[i].id;
    throw new Error("the style carries no water fill for this beat's study outline to be drawn beneath, so MapTiler Countries' coarser coast would stand over the basemap's own");
  }

  // THE FEATURES ARE ASSEMBLED HERE FROM THREE STREAMS. See DotValueRule in
  // skills/map-web/assets/live-dot-density.ts: a FeatureCollection of this many points costs about
  // three quarters of a megabyte more than the streams do, on a page that already inlines MapLibre.
  function collectionOf(stream) {
    var features = new Array(stream.kind.length);
    for (var i = 0; i < stream.kind.length; i++)
      features[i] = {
        type: "Feature",
        properties: { k: stream.kind[i], s: stream.site[i] },
        geometry: { type: "Point", coordinates: [stream.xy[i * 2], stream.xy[i * 2 + 1]] }
      };
    return { type: "FeatureCollection", features: features };
  }

  function mountLayers() {
    var before = waterId();
    var vectorSource = null;
    for (var i = 0; i < PLAN.layers.length; i++) {
      var layer = PLAN.layers[i];
      var sourceId;
      if (layer.source) {
        if (!layer.sourceLayer)
          throw new Error('layer "' + layer.id + '" reads a vector source and names no source layer - it would draw nothing, silently');
        if (!vectorSource) {
          vectorSource = "mw-src-countries";
          map.addSource(vectorSource, { type: layer.source.type, url: layer.source.url });
        }
        sourceId = vectorSource;
      } else if (layer.stream) {
        sourceId = "mw-src-" + layer.id;
        map.addSource(sourceId, { type: "geojson", data: collectionOf(layer.stream) });
      } else if (layer.reads) {
        // A LAYER THAT READS ANOTHER'S SOURCE. What a pointer lights is the field's own circles,
        // drawn again above themselves: a second copy of the same points would be a second place a
        // dot's position is decided, which is how one mark comes to have two halves.
        sourceId = "mw-src-mw-dots-" + layer.rule;
      } else throw new Error('layer "' + layer.id + '" carries no source at all');
      var spec = { id: layer.id, type: layer.type, source: sourceId, paint: layer.paint };
      if (layer.sourceLayer) spec["source-layer"] = layer.sourceLayer;
      if (layer.filter) spec.filter = layer.filter;
      var layout = {};
      if (layer.layout) for (var key in layer.layout) layout[key] = layer.layout[key];
      if (layer.visible === false) layout.visibility = "none";
      for (var any in layout) { spec.layout = layout; break; }
      map.addLayer(spec, layer.beneath === "water" ? before : undefined);
    }
  }

  function currentSlug() {
    var checked = doc.querySelector("input[name=" + ${NAME} + "]:checked");
    return (checked && checked.value) || PLAN.defaultSlug;
  }
  var CURRENT = PLAN.defaultSlug;
  function showRule(slug) {
    var known = false;
    for (var i = 0; i < PLAN.rules.length; i++) if (PLAN.rules[i].slug === slug) known = true;
    if (!known) return;
    CURRENT = slug;
    for (var j = 0; j < PLAN.layers.length; j++) {
      var layer = PLAN.layers[j];
      if (!layer.rule) continue;
      if (map.getLayer(layer.id))
        map.setLayoutProperty(layer.id, "visibility", layer.rule === slug ? "visible" : "none");
    }
    figure.setAttribute("data-live-rule", slug);
  }

  map.on("style.load", function () {
    // A FLAT WEB MERCATOR MAP (the owner, 2026-09-15: "oui une carte MapLibre plate pas un globe").
    if (map.setProjection) map.setProjection({ type: PLAN.projection || "mercator" });
    // The trunk's own sweep, ASSERTED rather than assumed: a sweep that re-tinted nothing did not
    // find the style it was written against, and the reader would keep the provider's own water
    // under a plate painted in the beat's, with nothing to say so.
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: PLAN.tints }), PLAN.styleName || PLAN.styleUrl);
    mountLayers();
    showRule(currentSlug());
  });

  function fitToStudy() {
    map.setMaxBounds(null);
    map.setMinZoom(-2);
    map.fitBounds(
      [[PLAN.studyBounds.west, PLAN.studyBounds.south], [PLAN.studyBounds.east, PLAN.studyBounds.north]],
      { padding: FIT_PADDING_PX, animate: false }
    );
    var fitted = map.getZoom();
    var visible = map.getBounds();
    var visibleSpan = Math.abs(visible.getEast() - visible.getWest());
    // THE READER'S LEASH. The floor is the published framing — a reader can never pull back past the
    // view the title makes its claim about. The CEILING is derived from the dot itself, which is
    // this type's own constant: a dot stands for a fixed piece of ground, so the reader may come in
    // until that piece of ground is the size of the fingertip this format gives every hit target,
    // and no closer. Past it they are measuring the EDGE of a disc that stands for a quantity and
    // not for a shape, and the seeded spiral a site's dots are laid out on starts reading as a map
    // of addresses — the one thing types/dot-density.md says this form may never invite.
    map.setMinZoom(fitted);
    var dotPx = PLAN.radius.bakePx * Math.pow(2, fitted - PLAN.bakeZoom);
    map.setMaxZoom(fitted + Math.max(Math.log2(PLAN.hitPx / Math.max(dotPx, 0.01)), 0));
    if (visibleSpan < 360) map.setMaxBounds(visible); else map.setMaxBounds(null);
    figure.setAttribute("data-live-view", map.getCenter().lng.toFixed(4) + "," + map.getCenter().lat.toFixed(4) + "@" + fitted.toFixed(3));
    figure.setAttribute("data-live-span", visibleSpan.toFixed(2));
    figure.setAttribute("data-live-dot", dotPx.toFixed(3));
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
  // AND THE STAGE CAN CHANGE SIZE WITHOUT THE WINDOW, which MapLibre never hears about: a MapLibre
  // "resize" fires only when MapLibre resizes ITSELF. The figure is a flex column whose header
  // settles when its faces load and this box is its one shrinkable item — measured on the pattern,
  // a camera fitted for a 1112px box while the box settled at 520 came back showing half the
  // latitude the page claimed, with nothing red.
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
    showRule(event.target.value);
    hide();
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // THE POINTER. Its REACH is the format's own hit target and not the dot's radius: on a layer the
  // query takes a BOX, so an honest dot (small, ground-scaled) and a reachable target are no longer
  // the same object. The NEAREST dot to the box's centre answers — in a field this dense a box
  // catches several, and the first one MapLibre happened to return is not an answer to "what is
  // under my finger". Nothing here reads a coordinate once at initialisation, so the answer survives
  // a zoom and a pan: that is the trap this tree has paid for three times.
  var hovering = null;
  var A = PLAN.answers;
  function answerFor(site) {
    var part = A.parts[site];
    if (!part) return null;
    var count = A.counts[CURRENT] && A.counts[CURRENT][site];
    var word = count ? A.countWords[String(count)] : null;
    var text = A.fuelWords[part[0]] + A.sep + part[1] + A.sep + A.countryWords[part[2]] + A.sep + part[3] + A.tail;
    return word ? text + A.sep + word : text;
  }
  function hide() {
    hovering = null;
    var tooltip = tip();
    if (tooltip) tooltip.hidden = true;
    for (var i = 0; i < PLAN.rules.length; i++) {
      var id = "mw-hot-" + PLAN.rules[i].slug;
      if (map.getLayer(id)) map.setFilter(id, ["==", ["get", "s"], -1]);
    }
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
  function show(site, event) {
    if (site !== hovering) {
      hovering = site;
      // EVERY DOT OF THAT SITE, NOT THE ONE UNDER THE FINGER. What a dot map hides once a dot is
      // worth a quantity is how many dots one place got; lighting the whole constellation is the
      // only answer that says it. No dot changes SIZE: on this type a size is a value.
      var id = "mw-hot-" + CURRENT;
      if (map.getLayer(id)) map.setFilter(id, ["==", ["get", "s"], site]);
      var tooltip = tip();
      var text = answerFor(site);
      if (tooltip && text) { tooltip.textContent = text; tooltip.hidden = false; }
    }
    place(event);
  }
  map.on("mousemove", function (event) {
    var id = "mw-dots-" + CURRENT;
    if (!map.getLayer(id)) return;
    var reach = PLAN.hitPx / 2;
    var p = event.point;
    var hits = map.queryRenderedFeatures(
      [[p.x - reach, p.y - reach], [p.x + reach, p.y + reach]],
      { layers: [id] }
    );
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < hits.length; i++) {
      var at = map.project(hits[i].geometry.coordinates);
      var dx = at.x - p.x;
      var dy = at.y - p.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = hits[i]; }
    }
    if (!best) { map.getCanvas().style.cursor = ""; hide(); return; }
    map.getCanvas().style.cursor = "pointer";
    show(best.properties.s, event);
  });
  map.on("mouseout", hide);
  map.on("movestart", hide);
})();`;
}

/**
 * THE GUARD THAT READS THE WRITTEN PAGE BACK — the half no declaration-level check can make.
 *
 * `dotValueCss` puts the CONTROL's half of the gesture in the markup; this holds the LAYERS' half
 * against the same declaration. The crossing between the two is where this architecture can put one
 * resolution in the key and a different one on the map, and neither half can see the other.
 */
export function assertDotValueReachesTheLayers(
  html: string,
  d: LiveDotDensityDeclaration,
  /** The plate's own recorded style, read from `geometry.json`. The live map must load the style the
   *  plate was baked from, or the swap from one to the other is a swap between two cartographies. */
  plateStyle: string,
  /** The plate's own recorded zoom. The ground rule is `r · 2 ** (zoom − bakeZoom)`, so a plan whose
   *  bake zoom is not the plate's draws a field at a density nothing on the page claims. */
  plateZoom: number,
  { where = "this page" }: { where?: string } = {},
): void {
  assertLiveDotDensityDeclaration(d);
  const node = /<script[^>]+id="mw-live-plan"[^>]*>([\s\S]*?)<\/script>/.exec(
    String(html),
  );
  if (!node)
    throw new Error(
      `${where}: the page carries no live plan, so its map is a picture and its control moves the ` +
        `key only`,
    );
  let plan: any;
  try {
    plan = JSON.parse(node[1]);
  } catch (err) {
    throw new Error(
      `${where}: the live plan in the page is not JSON — MapLibre would never boot and the fallback ` +
        `would stand with nothing to say why`,
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
        `plate under it was baked from ${JSON.stringify(plateStyle)}. The two layers are one ` +
        `cartography or they are a visible swap.`,
    );
  if (plan.bakeZoom !== plateZoom)
    throw new Error(
      `${where}: the live plan scales its dots from zoom ${JSON.stringify(plan.bakeZoom)} and the ` +
        `plate was baked at ${JSON.stringify(plateZoom)}. A dot stands for a fixed piece of ground ` +
        `and that ground is measured from the bake's own camera: off by one level is a field twice ` +
        `or half the density the page says it is.`,
    );

  // THE RADIUS IS AN EXPRESSION, ON EVERY DOT LAYER. This is the rule `live-map.mjs` calls binding on
  // this type, and it is checked on the WRITTEN page because a number typed into a paint object is
  // indistinguishable from the right answer in every other way.
  const dotLayers = (plan.layers ?? []).filter(
    (layer: any) => layer.type === "circle",
  );
  if (!dotLayers.length)
    throw new Error(`${where}: the live plan draws no dots at all`);
  for (const layer of dotLayers) {
    const radius = layer.paint?.["circle-radius"];
    if (!Array.isArray(radius) || radius[0] !== "interpolate")
      throw new Error(
        `${where}: the layer ${JSON.stringify(layer.id)} takes the radius ` +
          `${JSON.stringify(radius)}. A dot-density dot stands for a fixed piece of GROUND, so its ` +
          `screen radius has to double per zoom level — an ["interpolate", ["exponential", 2], ` +
          `["zoom"], …] expression and never a number, or the map claims a different density at ` +
          `every zoom.`,
      );
    if (JSON.stringify(radius[1]) !== JSON.stringify(["exponential", 2]))
      throw new Error(
        `${where}: the layer ${JSON.stringify(layer.id)} interpolates its radius with ` +
          `${JSON.stringify(radius[1])}. Only an exponential base of 2 keeps a dot's GROUND area ` +
          `constant; anything else is a field that thins or thickens as the reader zooms.`,
      );
    if (JSON.stringify(radius[2]) !== JSON.stringify(["zoom"]))
      throw new Error(
        `${where}: the layer ${JSON.stringify(layer.id)} interpolates its radius on ` +
          `${JSON.stringify(radius[2])} rather than on the zoom`,
      );
  }

  // EVERY RULE REACHES A PAIR OF LAYERS, and exactly one pair opens visible. A rule with no layer is
  // a pill that moves the key and leaves the field where it was — the "one control, two pictures"
  // defect wearing this type's costume.
  for (const rule of d.rules) {
    const slug = dotSlugOf(rule.key);
    const field = dotLayers.find(
      (layer: any) => layer.id === `mw-dots-${slug}`,
    );
    const hot = dotLayers.find((layer: any) => layer.id === `mw-hot-${slug}`);
    if (!field || !hot)
      throw new Error(
        `${where}: the rule ${JSON.stringify(slug)} has no field and pointer layer in the live plan. ` +
          `The key would re-write and the map would keep the resolution before it.`,
      );
    const drawn = field.stream?.kind?.length ?? 0;
    if (drawn !== rule.xy.length / 2)
      throw new Error(
        `${where}: the rule ${JSON.stringify(slug)} declares ${rule.xy.length / 2} dots and the plan ` +
          `carries ${drawn}`,
      );
    if (
      !/\sid="chart-stack-/.test(String(html)) ||
      String(html).indexOf(`value="${slug}"`) < 0
    )
      throw new Error(
        `${where}: the rule ${JSON.stringify(slug)} reaches the layers and no radio on the page ` +
          `carries it. A resolution the reader cannot choose is a resolution the page does not have.`,
      );
    if (String(html).indexOf(`data-dot-variant="${slug}"`) < 0)
      throw new Error(
        `${where}: nothing on the page says what one dot is worth under the rule ` +
          `${JSON.stringify(slug)}. types/dot-density.md: without that key the map cannot be read as ` +
          `data at all, only as texture.`,
      );
  }
  const open = dotLayers.filter(
    (layer: any) => layer.id.startsWith("mw-dots-") && layer.visible,
  );
  if (open.length !== 1)
    throw new Error(
      `${where}: ${open.length} dot fields open visible. Two fields at once is two dot values in one ` +
        `picture; none is a map with no data on it.`,
    );
  if (open[0].id !== `mw-dots-${plan.defaultSlug}`)
    throw new Error(
      `${where}: the page opens on the rule ${JSON.stringify(plan.defaultSlug)} and the field ` +
        `${JSON.stringify(open[0].id)} is the one that is drawn`,
    );

  if (!/class="map-layer"/.test(String(html)))
    throw new Error(
      `${where}: the page carries a live plan and no box to draw it in`,
    );
  if (!/<p class="live-hint" hidden/.test(String(html)))
    throw new Error(
      `${where}: the sentence describing the live map's controls is not hidden in the delivered ` +
        `markup. With JavaScript off it is a description of a map that cannot be dragged — the dead ` +
        `control this arrangement exists not to ship.`,
    );
}
