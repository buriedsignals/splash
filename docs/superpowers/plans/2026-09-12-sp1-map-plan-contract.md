# SP1 — Le contrat de plan de carte, et le choroplèthe comme pilote

> **Pour les exécutants agentiques :** SOUS-SKILL REQUIS — `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans`, tâche par tâche. Les étapes utilisent des cases
> `- [ ]` pour le suivi.

**But :** poser dans le tronc partagé le contrat qui fait d'une carte un *style MapLibre* plutôt
qu'une image, et le prouver sur un type — le choroplèthe — avec les gardes qui rougissent.

**Architecture :** un beat produit un **plan** (style MapTiler transformé + sources GeoJSON +
couches). Le layout **publie** la taille à laquelle la carte sera dessinée ; la carte est cuite à
cette taille exacte. Le placement des mots reste au beat et sort en coordonnées. Tout le câblage —
teintes mesurées, glyphes, liseré, cuisson — vit dans `shared/map-beat/`, jamais recopié par beat.

**Tech :** Bun, TypeScript, `bun:test`, MapLibre GL JS 4.7.1, MapTiler `dataviz-light`, puppeteer,
`@maplibre/font-maker` pour les glyphes.

**Spec :** `docs/splash/2026-09-12-maps-through-maptiler-spec.md`

## Contraintes globales

- **Le câblage vit dans `shared/map-beat/`, jamais recopié dans un beat.** C'est le défaut que le
  spike a démontré six fois (spec §1.5).
- **Rien de codé en dur qui vienne du sujet** — bornes, listes de noms, seuils, sièges, classes sont
  dérivés des données du beat (spec §7.1).
- **Ce qui est mesuré reste mesuré** : le plan appelle la mesure, il ne transporte pas son résultat
  d'hier (spec §7.2).
- **Un beat qui ne peut pas satisfaire une règle REFUSE** et nomme ce qui manque (spec §7.3).
- Runtime **Bun**, jamais npm ni node. Code, commentaires, noms et messages de commit en **anglais**.
- Aucune clé dans le dépôt : `MAPTILER_KEY` (ou ses alias) est lue depuis `.env`.
- Un test qui a besoin d'un navigateur, d'un rendu ou d'un sous-processus porte `// LANE: heavy`
  dans ses cinq premières lignes ; un test qui a besoin d'une clé est nommé `*.live.test.ts`.
- Aucune mention de Claude ou d'Anthropic dans un artefact publié.

---

## Structure de fichiers

| fichier | responsabilité |
| --- | --- |
| `shared/map-beat/plan.mjs` | le contrat : construire, valider, sérialiser un plan |
| `shared/map-beat/tints.mjs` | les teintes de fond, **mesurées** contre la direction |
| `shared/map-beat/style.mjs` | charger le style MapTiler et le transformer (éteindre, teinter, réécrire `glyphs`) |
| `shared/map-beat/mount.mjs` | monter un plan dans une carte MapLibre (dans le navigateur) |
| `shared/map-beat/bake.mjs` | cuire un plan à une taille donnée → PNG + faits de caméra |
| `shared/map-beat/glyphs.mjs` | cuire les faces d'une direction en PBF via `font-maker`, les servir |
| `shared/map-beat/geometry.mjs` | le contrat de publication de géométrie par le layout |
| `skills/map-beat/test/plan-*.test.ts` | les huit gardes de la spec §8 |

---

## Task 1 : Le contrat de plan, et sa garde d'identifiants

**Files:**
- Create: `shared/map-beat/plan.mjs`
- Test: `skills/map-beat/test/plan-contract.test.ts`

**Interfaces:**
- Produces: `makePlan({ style, camera, layers })` → objet plan gelé ;
  `validatePlan(plan)` → `string[]` (liste de violations, vide si conforme).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";

const camera = { bounds: [[-25, 34], [42, 68]], drawn: { width: 574, height: 436 } };
const layer = (id) => ({ id, type: "fill", data: { type: "FeatureCollection", features: [] } });

describe("the map plan contract", () => {
  it("should accept a plan whose layer ids are all distinct", () => {
    const plan = makePlan({ style: {}, camera, layers: [layer("a"), layer("b")] });
    expect(validatePlan(plan)).toEqual([]);
  });

  it("should report a duplicated layer id, which MapLibre refuses in silence", () => {
    const plan = makePlan({ style: {}, camera, layers: [layer("cities"), layer("cities")] });
    expect(validatePlan(plan)).toEqual([
      'two layers share the id "cities" — MapLibre keeps the first and drops the second without an error',
    ]);
  });

  it("should refuse a plan with no drawn size, because the bake would pick one", () => {
    const plan = makePlan({ style: {}, camera: { bounds: camera.bounds }, layers: [layer("a")] });
    expect(validatePlan(plan)).toContain(
      "the plan carries no drawn size — the layout must publish it before the bake",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-contract.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/plan.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/plan.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/plan-contract.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/plan.mjs skills/map-beat/test/plan-contract.test.ts
git commit -m "feat(map-beat): a map plan contract that refuses duplicate ids and a missing drawn size"
```

---

## Task 2 : Les teintes de fond, mesurées

**Files:**
- Create: `shared/map-beat/tints.mjs`
- Test: `skills/map-beat/test/plan-tints.test.ts`

**Interfaces:**
- Consumes: `mix`, `contrast` de `#shared/chart-beat/colour.mjs` ; `deriveFurniture` de
  `#shared/chart-beat/render-still.mjs` ; `matchConvention` de `../../skills/palette/scripts/palette.mjs`.
- Produces: `plateTints(direction)` → `{ water, land, seaLandContrast }` ; jette si aucune dose
  n'atteint l'écart.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { plateTints, SEA_LAND_MIN } from "#shared/map-beat/tints.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";

const DIRECTIONS = "docs/design-base/directions";
const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"));

describe("the plate tints", () => {
  it("should separate sea from land on every filed direction", () => {
    for (const file of filed) {
      const d = readDirection(join(DIRECTIONS, file));
      const { water, land } = plateTints(d);
      expect(contrast(water, land)).toBeGreaterThanOrEqual(SEA_LAND_MIN);
    }
  });

  it("should keep the basemap quieter than the marks on every filed direction", () => {
    for (const file of filed) {
      const d = readDirection(join(DIRECTIONS, file));
      const { water, land } = plateTints(d);
      expect(contrast(water, d.ground)).toBeLessThan(1.6);
      expect(contrast(land, d.ground)).toBeLessThan(1.6);
    }
  });

  it("should refuse rather than return a sea nobody can tell from the land", () => {
    const flat = { ground: "#111044", accent: "#111044" };
    expect(() => plateTints(flat)).toThrow(/no dose/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-tints.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/tints.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/tints.mjs
//
// THE TWO COLOURS A BASEMAP IS ALLOWED, AND WHY THEY ARE MEASURED RATHER THAN CHOSEN.
//
// A fixed dose cannot work across three grounds. At 0.14 of the filed water hue, `nocturne` rendered
// sea and land at 1.014:1 — the same colour. A dark blue mixed into a navy ground produces no
// separation at all. The original escaped this by accident: its sea took the ACCENT, and nocturne's
// accent is a pale mint, which lightens.
//
// So the rule targets a MEASURED gap and takes the smallest dose that reaches it: the basemap stays
// as quiet as it can while a coastline still reads.

import { mix, contrast } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";

/** Below this, a coastline stops reading as a coastline. Measured on the six converted types. */
export const SEA_LAND_MIN = 1.22;
/** Above this, the basemap has more weight against the page than the marks it carries — which is
 *  what `the-basemap-gives-up-its-contrast` forbids. */
export const BASEMAP_MAX = 1.6;

export function plateTints(direction) {
  const { ink } = deriveFurniture(direction.ground);
  const land = mix(direction.ground, ink, 0.045);
  const hue = matchConvention("water").accent;

  for (let dose = 0.06; dose <= 0.7; dose += 0.02) {
    const water = mix(direction.ground, hue, dose);
    if (contrast(water, land) < SEA_LAND_MIN) continue;
    if (contrast(water, direction.ground) >= BASEMAP_MAX) break;
    return { water, land, seaLandContrast: contrast(water, land) };
  }

  throw new Error(
    `no dose of the filed water hue separates sea from land by ${SEA_LAND_MIN}:1 on ground ` +
      `${direction.ground} while staying under ${BASEMAP_MAX}:1 against it — this direction and ` +
      `this hue are too close for a basemap, and the beat must be told rather than shown a flat map`,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/plan-tints.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/tints.mjs skills/map-beat/test/plan-tints.test.ts
git commit -m "feat(map-beat): plate tints that target a measured sea-land gap instead of a fixed dose"
```

---

## Task 3 : La géométrie publiée par le layout

**Files:**
- Create: `shared/map-beat/geometry.mjs`
- Test: `skills/map-beat/test/plan-geometry.test.ts`

**Interfaces:**
- Produces: `drawnSizeOf(geometry)` → `{ width, height }` arrondi ;
  `assertPlateMatchesMarks(geometry)` → jette si la plaque n'est pas placée aux coordonnées des marques.
- Consumes (par les composants) : le rappel `onGeometry({ mapX, mapY, mapW, mapH, scale })`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { assertPlateMatchesMarks, drawnSizeOf } from "#shared/map-beat/geometry.mjs";

describe("the geometry a layout publishes", () => {
  it("should round the drawn size to whole pixels, because a bake takes integers", () => {
    expect(drawnSizeOf({ mapW: 573.7, mapH: 436.2 })).toEqual({ width: 574, height: 436 });
  });

  it("should accept a plate placed at the same origin and scale as the marks", () => {
    expect(() =>
      assertPlateMatchesMarks({ mapX: 10, mapY: 20, mapW: 574, mapH: 436, plate: { x: 10, y: 20, width: 574, height: 436 } }),
    ).not.toThrow();
  });

  it("should refuse a plate placed on the box instead of the marks", () => {
    expect(() =>
      assertPlateMatchesMarks({ mapX: 10, mapY: 20, mapW: 574, mapH: 436, plate: { x: 10, y: 20, width: 428, height: 436 } }),
    ).toThrow(/compressed/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-geometry.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/geometry.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/geometry.mjs
//
// THE SIZE A MAP IS BAKED AT IS AN OUTPUT OF THE LAYOUT, NOT A SETTING.
//
// The original bake said so in its own header — "this bake is only ever called at the exact size the
// still draws at" — and the plate-as-background arrangement got away with breaking it, because a
// blurry background is still a background. The moment the MARKS move into the image it stops being
// survivable: every absolute length comes out wrong by the ratio, and on a beat that frames on its
// subject the ratio is different per direction (0.698 to 0.781 on the flow map).
//
// So the component publishes where and how large its map will be, and the bake reads it.

export function drawnSizeOf(geometry) {
  return { width: Math.round(geometry.mapW), height: Math.round(geometry.mapH) };
}

/** THE PLATE GOES WHERE THE MARKS GO. Three of the six converted components placed it on the layout
 *  BOX instead — with `preserveAspectRatio="none"`, which compressed the geography by a third while
 *  the marks were drawn at the map's own scale. It stayed invisible as long as a second, coarser
 *  basemap was painted over it. */
export function assertPlateMatchesMarks(geometry) {
  const { mapX, mapY, mapW, mapH, plate } = geometry;
  const off = (a, b) => Math.abs(a - b) > 0.5;
  if (off(plate.x, mapX) || off(plate.y, mapY) || off(plate.width, mapW) || off(plate.height, mapH))
    throw new Error(
      `the plate is placed at ${plate.width}x${plate.height} at (${plate.x}, ${plate.y}) while the ` +
        `marks are drawn at ${mapW}x${mapH} at (${mapX}, ${mapY}) — the map is compressed, and every ` +
        `mark sits somewhere the geography under it does not`,
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/plan-geometry.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/geometry.mjs skills/map-beat/test/plan-geometry.test.ts
git commit -m "feat(map-beat): the layout publishes its drawn size, and the plate must match the marks"
```

---

## Task 4 : Les glyphes par `font-maker`, et la garde du repli silencieux

**Files:**
- Create: `shared/map-beat/glyphs.mjs`
- Test: `skills/map-beat/test/plan-glyphs.live.test.ts`
- Modify: `package.json` — ajouter `@maplibre/font-maker`

**Interfaces:**
- Produces: `bakeGlyphs({ faces, outDir, ranges })` → `Promise<string[]>` (chemins écrits) ;
  `serveGlyphs(dir)` → `{ url, stop() }` ; `assertNotFallback(pbfPath, referencePbfPath)`.

- [ ] **Step 1: Write the failing test**

```ts
// LANE: heavy
import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { servedFaces, assertNotFallback } from "#shared/map-beat/glyphs.mjs";

/** MEASURED, NOT ASSUMED: MapTiler answers 200 to ANY font name and serves Noto Sans. */
describe("the glyph guard", () => {
  it("should list the families MapTiler actually serves", async () => {
    const real = await servedFaces();
    expect(real).toContain("Metropolis");
    expect(real).not.toContain("Futura");
  });

  it("should refuse a face whose glyphs are byte-identical to the fallback", async () => {
    const noto = await readFile("skills/map-beat/test/fixtures/noto-sans-regular-0-255.pbf");
    const same = await readFile("skills/map-beat/test/fixtures/futura-from-maptiler-0-255.pbf");
    expect(createHash("sha256").update(noto).digest("hex")).toBe(
      createHash("sha256").update(same).digest("hex"),
    );
    expect(() => assertNotFallback(same, noto, "Futura Medium")).toThrow(/substituted/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-glyphs.live.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/glyphs.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/glyphs.mjs
//
// MAPLIBRE DOES NOT DRAW WITH A SYSTEM FONT. It reads signed distance fields served by the style,
// 256 characters at a time. MapTiler Cloud serves eighteen families and answers 200 with Noto Sans
// for every other name — `Futura Medium`, `Avenir Next`, `Georgia`, and `Zzz Fictive Regular` all
// return the same 83 352-byte file. A map that asks for Futura gets Noto Sans and nothing says so.
//
// So a beat that needs a filed family serves its own glyphs, and this module REFUSES a face whose
// bytes are the fallback's. `useTypeface` in the trunk already states the rule: a silent stack has
// not chosen.

import { createHash } from "node:crypto";
import { join } from "node:path";

/** The ranges a European beat needs: the Latin block, and the block that carries the typographic
 *  apostrophe (U+2019). A range that is not served makes the character vanish from the word with no
 *  error — "Mer d'Azov" printed as "Mer dAzov" for a full render cycle. */
export const DEFAULT_RANGES = ["0-255", "8192-8447"];

export async function bakeGlyphs({ faces, outDir, ranges = DEFAULT_RANGES }) {
  const { generateGlyphs } = await import("@maplibre/font-maker");
  const written = [];
  for (const face of faces) {
    for (const range of ranges) {
      const [start, end] = range.split("-").map(Number);
      const pbf = await generateGlyphs(face.file, { start, end });
      const path = join(outDir, face.stack, `${range}.pbf`);
      await Bun.write(path, pbf);
      written.push(path);
    }
  }
  return written;
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function assertNotFallback(candidate, fallback, name) {
  if (digest(candidate) === digest(fallback))
    throw new Error(
      `"${name}" was substituted: its glyphs are byte-identical to the fallback face. The map would ` +
        `render in a typeface nobody chose, and neither MapTiler nor MapLibre would report it`,
    );
}

/** Probe which families the style host really serves, by comparing each face's bytes to the
 *  fallback's. Used by the live test; never in a render path. */
export async function servedFaces(candidates = CANDIDATE_FAMILIES) {
  const { maptilerGlyphs } = await import("./style.mjs");
  const fallback = await maptilerGlyphs("Noto Sans Regular", "0-255");
  const real = [];
  for (const family of candidates) {
    const bytes = await maptilerGlyphs(`${family} Regular`, "0-255");
    if (digest(bytes) !== digest(fallback)) real.push(family);
  }
  return real;
}

const CANDIDATE_FAMILIES = [
  "Metropolis", "Open Sans", "Roboto", "Inter", "Lato", "Montserrat", "Nunito", "Rubik",
  "Source Sans Pro", "PT Sans", "Ubuntu", "Merriweather", "PT Serif", "Libre Baskerville",
  "Noto Serif", "Roboto Slab", "Roboto Mono", "Source Code Pro",
  "Futura", "Avenir Next", "Superclarendon", "Georgia", "Playfair Display", "Lora",
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun add @maplibre/font-maker && bun test skills/map-beat/test/plan-glyphs.live.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/glyphs.mjs skills/map-beat/test/plan-glyphs.live.test.ts skills/map-beat/test/fixtures package.json bun.lock
git commit -m "feat(map-beat): bake glyphs with font-maker and refuse a silently substituted face"
```

---

## Task 5 : Le style transformé, et la garde du fond redoublé

**Files:**
- Create: `shared/map-beat/style.mjs`
- Test: `skills/map-beat/test/plan-style.test.ts`

**Interfaces:**
- Consumes: `plateTints` (Task 2).
- Produces: `transformStyle(styleDoc, { tints, glyphs, keepLabels })` → style transformé ;
  `assertNoDoubledBasemap(plan)` → jette si une couche du beat redouble la géographie du fond ;
  `maptilerGlyphs(stack, range)` → `Promise<Uint8Array>` (utilisé par Task 4).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { transformStyle, assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";

const styleDoc = () => ({
  glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=REDACTED",
  layers: [
    { id: "Background", type: "background", paint: {} },
    { id: "Water", type: "fill", paint: {} },
    { id: "Landcover forest", type: "fill", paint: {} },
    { id: "Road network", type: "line", paint: {} },
    { id: "Country labels", type: "symbol", layout: {}, paint: {} },
  ],
});

describe("the transformed style", () => {
  it("should rewrite the glyph endpoint so our own faces are served", () => {
    const out = transformStyle(styleDoc(), { tints: { water: "#aaa", land: "#eee" }, glyphs: "http://x/{fontstack}/{range}.pbf" });
    expect(out.glyphs).toBe("http://x/{fontstack}/{range}.pbf");
  });

  it("should hide texture and roads but keep water", () => {
    const out = transformStyle(styleDoc(), { tints: { water: "#aaa", land: "#eee" }, glyphs: "http://x" });
    const vis = (id) => out.layers.find((l) => l.id === id)?.layout?.visibility;
    expect(vis("Landcover forest")).toBe("none");
    expect(vis("Road network")).toBe("none");
    expect(vis("Water")).not.toBe("none");
  });

  it("should hide every native label unless the beat asks to keep one", () => {
    const kept = transformStyle(styleDoc(), { tints: { water: "#aaa", land: "#eee" }, glyphs: "http://x", keepLabels: [/country label/i] });
    expect(kept.layers.find((l) => l.id === "Country labels").layout.visibility).not.toBe("none");
    const none = transformStyle(styleDoc(), { tints: { water: "#aaa", land: "#eee" }, glyphs: "http://x" });
    expect(none.layers.find((l) => l.id === "Country labels").layout.visibility).toBe("none");
  });

  it("should refuse a beat layer that repaints the land the basemap already draws", () => {
    const plan = {
      layers: [
        { id: "beat-land", type: "fill", role: "basemap-land", data: { type: "FeatureCollection", features: [] } },
      ],
    };
    expect(() => assertNoDoubledBasemap(plan)).toThrow(/doubled/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-style.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/style.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/style.mjs
//
// THE STYLE IS AN OBJECT, NOT A URL — and that is the only way to change `glyphs`. Handed a URL,
// MapLibre reads MapTiler's endpoint before anyone has the handle, and `glyphs` has no setter: the
// only recourse would be a full `setStyle`, which restarts the style and carries away every layer
// just added to it.

import { readFile } from "node:fs/promises";

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

/** Used by the live glyph probe only. The key never reaches a shell command. */
export async function maptilerGlyphs(stack, range) {
  const env = Object.fromEntries(
    (await readFile(".env", "utf8"))
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
  const key = env.MAPTILER_KEY ?? env.MAPTILER_API_KEY ?? env.REMOTION_MAPTILER_KEY;
  if (!key) throw new Error("no MAPTILER_KEY in .env");
  const url = new URL(`https://api.maptiler.com/fonts/${encodeURIComponent(stack)}/${range}.pbf`);
  url.searchParams.set("key", key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`glyph probe got HTTP ${res.status} for ${stack}`);
  return new Uint8Array(await res.arrayBuffer());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/plan-style.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/style.mjs skills/map-beat/test/plan-style.test.ts
git commit -m "feat(map-beat): transform the MapTiler style and refuse a doubled basemap"
```

---

## Task 6 : Le monteur, et la garde des expressions

**Files:**
- Create: `shared/map-beat/mount.mjs`
- Test: `skills/map-beat/test/plan-expressions.test.ts`

**Interfaces:**
- Consumes: le plan (Task 1).
- Produces: `mountPlan(map, plan)` (dans le navigateur) ; `validateExpressions(plan)` → `string[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";

const symbolLayer = (layout) => ({
  id: "labels", type: "symbol", data: { type: "FeatureCollection", features: [] }, layout,
});

describe("the expression guard", () => {
  it("should accept an offset that is a literal pair", () => {
    expect(validateExpressions({ layers: [symbolLayer({ "text-offset": [0, 0.85] })] })).toEqual([]);
  });

  it("should accept an offset that is one expression returning a pair", () => {
    expect(validateExpressions({ layers: [symbolLayer({ "text-offset": ["get", "offset"] })] })).toEqual([]);
  });

  it("should report an offset built as an array OF expressions, which draws nothing", () => {
    const bad = symbolLayer({ "text-offset": [["get", "ox"], ["get", "oy"]] });
    expect(validateExpressions({ layers: [bad] })).toEqual([
      'layer "labels": "text-offset" is an array of expressions — MapLibre rejects it and the layer draws nothing',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-expressions.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/mount.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/mount.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/plan-expressions.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/mount.mjs skills/map-beat/test/plan-expressions.test.ts
git commit -m "feat(map-beat): mount a plan, and catch the pair expressions MapLibre draws nothing for"
```

---

## Task 7 : La cuisson à la taille publiée, et la garde des tranches de glyphes

**Files:**
- Create: `shared/map-beat/bake.mjs`
- Test: `skills/map-beat/test/plan-ranges.test.ts`

**Interfaces:**
- Consumes: `transformStyle` (T5), `mountPlan` (T6), `drawnSizeOf` (T3), `DEFAULT_RANGES` (T4).
- Produces: `bakePlan({ plan, size, outPath, glyphsUrl })` → `Promise<{ png, camera }>` ;
  `rangesNeededBy(texts)` → `string[]` ; `assertRangesServed(texts, servedRanges)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { rangesNeededBy, assertRangesServed } from "#shared/map-beat/bake.mjs";

describe("the glyph range guard", () => {
  it("should need only the Latin block for plain ASCII", () => {
    expect(rangesNeededBy(["Mer du Nord", "ISLANDE"])).toEqual(["0-255"]);
  });

  it("should need the punctuation block for a typographic apostrophe", () => {
    expect(rangesNeededBy(["Mer d’Azov"])).toEqual(["0-255", "8192-8447"]);
  });

  it("should refuse a beat whose words need a range nobody serves", () => {
    expect(() => assertRangesServed(["Mer d’Azov"], ["0-255"])).toThrow(/8192-8447/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/plan-ranges.test.ts`
Expected: FAIL — `Cannot find module '#shared/map-beat/bake.mjs'`

- [ ] **Step 3: Write minimal implementation**

```js
// shared/map-beat/bake.mjs
//
// BAKING A PLAN AT THE SIZE THE LAYOUT PUBLISHED. Never at a size chosen here and reduced later:
// see `geometry.mjs` for why, and for the ratio it cost on four of the six converted types.

import { drawnSizeOf } from "./geometry.mjs";
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
  const size = drawnSizeOf(plan.camera.published);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/plan-ranges.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add shared/map-beat/bake.mjs skills/map-beat/test/plan-ranges.test.ts
git commit -m "feat(map-beat): bake at the published size, and refuse a word whose glyph range is unserved"
```

---

## Task 8 : Le choroplèthe pilote, sur le plan

**Files:**
- Modify: `proof/static-choropleth-europe-lowcarbon/render-directions.mjs`
- Modify: `proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx`
- Test: `skills/map-beat/test/pilot-choropleth.live.test.ts`

**Interfaces:**
- Consumes: tout le tronc des tâches 1-7.
- Produces: le beat pilote, dont le composant publie `onGeometry` et ne dessine plus la carte.

- [ ] **Step 1: Write the failing test**

```ts
// LANE: heavy
import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

/** The claim this beat exists for must survive the move, to the digit. */
describe("the pilot choropleth on the plan", () => {
  it("should still name the same countries above the floor", async () => {
    const { report } = await import("../../../proof/static-choropleth-europe-lowcarbon/render-directions.mjs");
    expect(report.above.map((r) => r.iso).sort()).toEqual(["ALB", "CHE", "FIN", "FRA", "ISL", "NOR", "SWE"]);
  });

  it("should carry no beat layer that redraws the basemap", async () => {
    const { plans } = await import("../../../proof/static-choropleth-europe-lowcarbon/render-directions.mjs");
    for (const plan of Object.values(plans))
      for (const layer of plan.layers) expect(layer.role ?? "").not.toMatch(/^basemap-/);
  });

  it("should place the plate exactly where the marks are drawn", async () => {
    const { geometry } = await import("../../../proof/static-choropleth-europe-lowcarbon/render-directions.mjs");
    for (const g of Object.values(geometry)) {
      expect(g.plate.width).toBeCloseTo(g.mapW, 1);
      expect(g.plate.height).toBeCloseTo(g.mapH, 1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test skills/map-beat/test/pilot-choropleth.live.test.ts`
Expected: FAIL — le runner n'exporte ni `report`, ni `plans`, ni `geometry`

- [ ] **Step 3: Write minimal implementation**

Le runner construit un plan par direction au lieu d'appeler `renderStill` avec des marques SVG :

```js
// proof/static-choropleth-europe-lowcarbon/render-directions.mjs (extrait)
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { assertRangesServed, rangesNeededBy } from "#shared/map-beat/bake.mjs";

export const plans = {};
export const geometry = {};

for (const file of filedDirections) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const tints = plateTints(direction);

  /** ONE LAYER PER THING THE BEAT OWNS. The classes, the borders, the ringed subject, the words the
   *  beat placed itself. The geography is MapTiler's and is never redrawn. */
  const plan = makePlan({
    style: styleDoc,
    camera: { bounds: BOUNDS, published: geometry[id] },
    layers: [
      { id: "classes", type: "fill", data: countries, paint: { "fill-color": rampExpression(direction) } },
      { id: "borders", type: "line", data: countries, paint: { "line-color": tints.land, "line-width": strokes.border } },
      { id: "subject-ring", type: "circle", data: subject, paint: ringPaint(direction) },
      { id: "country-labels", type: "symbol", data: placedLabels, layout: labelLayout(direction), paint: labelPaint(direction) },
    ],
  });

  const violations = [...validatePlan(plan), ...validateExpressions(plan)];
  if (violations.length) throw new Error(`the plan for ${id} is not renderable:\n  ${violations.join("\n  ")}`);
  assertNoDoubledBasemap(plan);
  assertRangesServed(everyWordOf(plan), servedRanges);

  plans[id] = plan;
}
```

Le composant perd sa zone carte et publie sa géométrie :

```tsx
// DirectedChoroplethMap.tsx (extrait)
onGeometry?.({ mapX, mapY, mapW, mapH, plate: { x: mapX, y: mapY, width: mapW, height: mapH } });
// …
<image href={plate} x={mapX} y={mapY} width={mapW} height={mapH} preserveAspectRatio="none" />
{/* The classes, the borders, the ring and the words are LAYERS, baked into the image above. */}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test skills/map-beat/test/pilot-choropleth.live.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add proof/static-choropleth-europe-lowcarbon skills/map-beat/test/pilot-choropleth.live.test.ts
git commit -m "feat(choropleth): the pilot beat declares a plan instead of drawing its own map"
```

---

## Task 9 : Le skill dit la règle, et les lanes restent propres

**Files:**
- Modify: `skills/map-beat/SKILL.md`
- Create: `skills/map-beat/references/map-plan.md`
- Test: `bun scripts/test-lanes.mjs --check`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: la documentation qu'un beat suivant lit avant d'écrire une ligne.

- [ ] **Step 1: Run the lane check to see the current state**

Run: `bun scripts/test-lanes.mjs --check`
Expected: PASS — chaque fichier de test est dans exactement une lane

- [ ] **Step 2: Write the reference**

`skills/map-beat/references/map-plan.md` porte, dans cet ordre : le contrat (§3 de la spec), la
frontière entre ce qui est dans la carte et ce qui reste dehors (§2), les trois règles de généricité
(§7), les huit gardes (§8) avec le défaut que chacune attrape, et la liste des 18 familles réellement
servies par MapTiler.

- [ ] **Step 3: Point SKILL.md at it**

Ajouter à `skills/map-beat/SKILL.md`, dans la section des références : une ligne renvoyant à
`references/map-plan.md`, avec la phrase qui résume la règle cardinale — *le câblage vit dans
`shared/map-beat/`, un beat déclare un plan et n'écrit pas de carte.*

- [ ] **Step 4: Run the full fast lane**

Run: `bun test`
Expected: PASS — aucune régression

- [ ] **Step 5: Commit**

```bash
git add skills/map-beat/SKILL.md skills/map-beat/references/map-plan.md
git commit -m "docs(map-beat): the map plan contract, its guards, and the families MapTiler really serves"
```

---

## Auto-revue

**Couverture de la spec.** §1.1 → T3, T7 · §1.2 → T8 (le placement reste au beat) · §1.3 → T5 ·
§1.4 → T1, T4, T6, T7 · §1.5 → T2, T8 · §2 → T9 · §3 → T1, T6 · §4 → T3 · §5 → T8 · §6 → T4, T7 ·
§7 → T9 (documenté), T2 et T7 (refus mesurés) · §8 → les huit gardes sont T1 (ids), T4 (repli),
T7 (tranches), T3 (plaque), T3 (taille), T5 (fond redoublé), T2 (écart eau/terre), T6 (expressions) ·
§9 → hors SP1, déclaré dans §10 de la spec · §10 → ce plan est SP1.

**Pas de placeholder** : chaque étape porte son code ou sa commande.

**Cohérence des noms** : `makePlan`/`validatePlan` (T1), `plateTints`/`SEA_LAND_MIN` (T2),
`drawnSizeOf`/`assertPlateMatchesMarks` (T3), `bakeGlyphs`/`assertNotFallback`/`servedFaces` (T4),
`transformStyle`/`assertNoDoubledBasemap`/`maptilerGlyphs` (T5), `mountPlan`/`validateExpressions`
(T6), `bakePlan`/`rangesNeededBy`/`assertRangesServed` (T7) — chacun défini une fois et consommé
sous le même nom.

**Trou assumé** : §1.6 — corps contre hauteur perçue — n'a pas de tâche ici. C'est une décision du
design base, posée en §8 de la spec comme question ouverte, et elle ne bloque pas SP1.
