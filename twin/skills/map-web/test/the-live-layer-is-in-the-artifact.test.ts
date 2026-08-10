/**
 * THE GUARD THE AUDIT FOUND MISSING: does the map a reader opens actually contain a live map?
 *
 * Ruling R1 made map × web a LIVE MapTiler map — *"une carte web qu'on ne peut pas parcourir est
 * une image"*. The mechanism was built well (`assets/live-map.mjs`: NavigationControl, the pan/zoom
 * leash derived AFTER the runtime fit, one `setFilter` vocabulary shared with the CSS). And
 * `AUDIT-W5-W6-map.md` §5.6 measured what that was worth to a reader:
 *
 *   - **zero** committed map HTML file contained `maplibregl`, `api.maptiler.com` or
 *     `NavigationControl`; every map the owner could open was the baked plate;
 *   - setting `render-web.mjs`'s `const liveBlock = live ? … ` to `const liveBlock = false ? …` —
 *     which strips maplibre-gl, the plan and the boot script out of every page this genre renders —
 *     left **354 tests passing**. The whole of R1 was deletable in silence.
 *
 * So this file asserts the two facts nothing asserted: the renderer PUTS the live layer in the file
 * it writes, and every map-web page this repository COMMITS carries it. It is deliberately about
 * the bytes on disk rather than about a React tree, because "the mechanism exists" was true the
 * whole time the artifact was a picture.
 *
 * THE MUTATIONS THAT REDDEN IT, run in an rsync copy outside the tree
 * (`<scratch>/mut-live-layer/twin`, its own git repo, never in `twin/`):
 *
 * 1. `render-web.mjs` `const liveBlock = live` → `const liveBlock = false` — the audit's own
 *    mutation, the one that left 354 tests passing. Run over `skills/map-web/`:
 *
 *      Expected to contain: "id=\"mw-live-plan\""
 *      (fail) the renderer puts the live map into the file it writes > should put maplibre-gl, the
 *             plan and the boot script into the file it writes
 *      (fail) … > should point the live style at MapTiler, with the placeholder and never a key
 *      (fail) … > should give the reader MapTiler's own zoom and pan controls
 *      (fail) … > should carry the reader's leash and the filter vocabulary into the page
 *       66 pass, 9 fail          (the other five are the committed beats, item 2 below)
 *
 * 2. `render-web.mjs` `SEED.live: true` → `false` — the same deletion made one line higher up,
 *    where every assertion in item 1 would still pass because `renderMapWeb` takes `live` as an
 *    argument and the fixture passes it:
 *
 *      209 |     // `renderMapWeb` takes `live` as an argument, so every assertion above passes …
 *      Expected: true   Received: false
 *      (fail) … > should ship the seed itself live, not merely be capable of it
 *       4 pass, 1 fail
 *
 * 3. The committed half needs no mutation at all: on the day this file landed it read the tree as
 *    the audit did, and reddened on five of the six pages —
 *
 *      (fail) every committed map-web page is a live map > proof/mapgen-choropleth-web/render/choropleth.html is live
 *      (fail) … proof/mapgen-dot-web/dot-population.html is live
 *      (fail) … proof/mapgen-hexgrid-web/hex-grid.html is live
 *      (fail) … proof/mapgen-locator-web/locator.html is live
 *      (fail) … proof/mapgen-symbol-web/quake-symbol.html is live
 *       7 pass, 5 fail
 *
 *    "this page has no live map: it is missing id=\"mw-live-plan\", api.maptiler.com/maps/,
 *    new win.maplibregl.Map, NavigationControl, __MAPTILER_KEY__. A reader opens the baked plate."
 *    Each one goes green as its beat is retrofitted, and the count is the measurement.
 */
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveFurniture } from "../scripts/render-still.mjs";
import { MapWebSeed, RegionTable } from "../assets/MapWebSeed.tsx";
import { SEED, livePlan, renderMapWeb } from "../scripts/render-web.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/**
 * What a live page must contain, each string chosen so that it can only be there because the live
 * layer is: the plan the boot script reads, the MapTiler style request R1 accepted, the placeholder
 * R1b requires in its place, the library's own constructor call, and the control the owner asked
 * for by name. `maplibregl` alone would not do — it appears inside the inlined library whether or
 * not this genre ever calls it.
 */
const LIVE_MARKERS = [
  'id="mw-live-plan"',
  "api.maptiler.com/maps/",
  "new win.maplibregl.Map",
  "NavigationControl",
  "__MAPTILER" + "_KEY__",
];

function missingMarkers(html: string): string[] {
  return LIVE_MARKERS.filter((marker) => !html.includes(marker));
}

// A plate's worth of camera facts, in the shape `geometry.json` records them since 2026-08-10 —
// enough for `livePlan` to build a real plan without a bake or a network call.
const BAKE_ZOOM = 3.879;
const POINTS = [
  {
    key: "paris",
    name: "Alpha City",
    lon: 2,
    lat: 48,
    value: 11,
    px: 100,
    py: 100,
    group: "West",
  },
  {
    key: "b",
    name: "Beta Town",
    lon: 3,
    lat: 49,
    value: 5.6,
    px: 200,
    py: 150,
    group: "East",
  },
  {
    key: "c",
    name: "Gamma",
    lon: 4,
    lat: 50,
    value: 1.4,
    px: 300,
    py: 200,
    group: "East",
  },
];
const GEOMETRY = {
  frame: { width: 420, height: 420 },
  points: POINTS,
  style: "dataviz",
  zoom: BAKE_ZOOM,
  frameCorners: { west: -11, east: 31, north: 66, south: 35 },
  degreesPerPixel: 360 / (512 * 2 ** BAKE_ZOOM),
  metresPerPixel: 4000,
};
const BASE = {
  geometry: GEOMETRY,
  plate: "data:image/png;base64,AAAA",
  title: "A fixture map",
  source: "Fixture source",
  basemapCredit: "basemap © Fixture",
  legendCaption: "Value, millions",
  caveat: "Fixture caveat text.",
  alt: "Three circles on a fixture map.",
  ground: "#FFFFFF",
  accent: "#0B7A75",
};

async function buildLive(): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), "map-web-live-"));
  try {
    await renderMapWeb({
      component: MapWebSeed,
      table: RegionTable,
      props: BASE as never,
      outDir,
      name: "beat.html",
      live: true,
      plan: livePlan({
        geometry: GEOMETRY,
        subjectKey: "paris",
        accent: BASE.accent,
        muted: deriveFurniture(BASE.ground).muted,
        waterFill: "#aac9e0",
      }),
    });
    return readFileSync(join(outDir, "beat.html"), "utf8");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describe("the renderer puts the live map into the file it writes", () => {
  it("should put maplibre-gl, the plan and the boot script into the file it writes", async () => {
    const html = await buildLive();
    expect(html).toContain('id="mw-live-plan"');
    // The boot script, by a line only this genre's own file carries.
    expect(html).toContain("function initLiveMap(");
    // The library itself, by its own build banner rather than by a word that could be a comment.
    expect(html).toContain("maplibregl");
    expect(html.length).toBeGreaterThan(700_000);
  });

  it("should point the live style at MapTiler, with the placeholder and never a key", async () => {
    const html = await buildLive();
    expect(html).toContain(
      "https://api.maptiler.com/maps/dataviz/style.json?key=",
    );
    expect(html).toContain("__MAPTILER" + "_KEY__");
  });

  it("should give the reader MapTiler's own zoom and pan controls", async () => {
    // B5.3 and B6.14b in one line: the reader zooms with the map's OWN control, and there is no
    // out-of-map zoom button anywhere on the page.
    const html = await buildLive();
    expect(html).toContain("NavigationControl");
    expect(html).not.toContain("mw-zoom-toggle");
    expect(html).not.toContain("Zoom in (");
  });

  it("should carry the reader's leash and the filter vocabulary into the page", async () => {
    const html = await buildLive();
    const plan = JSON.parse(
      /<script type="application\/json" id="mw-live-plan">([\s\S]*?)<\/script>/.exec(
        html,
      )![1]!,
    );
    // Constrained to the SUBJECT's area, which is the study set's own footprint — not the plate's
    // square box, whose corners cropped six of thirteen points the last time they were the leash.
    expect(plan.studyBounds).toEqual({
      west: 2,
      east: 4,
      south: 48,
      north: 50,
    });
    expect(plan.degreesPerPixel).toBeGreaterThan(0);
    // One vocabulary: the slug the radio's id carries, the CSS selector quotes and `setFilter` reads.
    const marks = plan.layers.find((layer: { id: string }) => layer.id === "mw-marks");
    const groups = marks.data.features.map(
      (f: { properties: { group: string } }) => f.properties.group,
    );
    expect(new Set(groups)).toEqual(new Set(["west", "east"]));
    expect(html).toContain('id="mw-filter-west"');
  });

  it("should ship the seed itself live, not merely be capable of it", () => {
    // `renderMapWeb` takes `live` as an argument, so every assertion above passes on a genre whose
    // every beat opted out. This is the line that says the seed opted in.
    expect(SEED.live).toBe(true);
  });
});

/**
 * The other half, and the one the audit's count was about: what is COMMITTED.
 *
 * A page is a map-web beat if it is the rendered HTML of the seed or of a `mapgen-*-web` beat —
 * decided by its PATH, not by a class name inside it. The three older beats
 * (`mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web`) do not carry the seed's
 * `map-web-page` root class at all: they were still on the two-rung `layouts` markup, so a
 * class-based sweep found 2 of 5 and reported green over the three worst pages in the genre. The
 * genre's own root class is kept as a WIDENER below, so a beat living somewhere else is still
 * caught, but the floor is the path list.
 */
function committedMapWebPages(): { rel: string; html: string }[] {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter((rel) => rel.endsWith(".html"));
  const pages = [];
  for (const rel of tracked) {
    const path = join(TWIN, rel);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const html = readFileSync(path, "utf8");
    if (isMapWebPath(rel) || html.includes('class="map-web-page"'))
      pages.push({ rel, html });
  }
  return pages;
}

function isMapWebPath(rel: string): boolean {
  return (
    /^proof\/mapgen-[a-z]+-web\//.test(rel) ||
    rel.startsWith("skills/map-web/output-proof/")
  );
}

describe("every committed map-web page is a live map", () => {
  const pages = committedMapWebPages();

  it("should find the pages it is supposed to be checking", () => {
    // Anti-vacuity, and it is the whole reason this is not just a `for` loop over whatever turned
    // up: a sweep that finds no work to do passes, and that is exactly the state the audit found.
    // Every map-web beat in the tree, named, so a beat that stops committing its own rendered file
    // reddens here rather than disappearing from the check.
    expect(pages.map((page) => page.rel).sort()).toEqual([
      "proof/mapgen-choropleth-web/render/choropleth.html",
      "proof/mapgen-dot-web/dot-population.html",
      "proof/mapgen-hexgrid-web/hex-grid.html",
      "proof/mapgen-locator-web/locator.html",
      "proof/mapgen-symbol-web/quake-symbol.html",
      "skills/map-web/output-proof/population.html",
    ]);
  });

  for (const page of pages)
    it(`${page.rel} is live`, () => {
      const missing = missingMarkers(page.html);
      if (missing.length > 0)
        throw new Error(
          `this page has no live map: it is missing ${missing.join(", ")}. A reader opens the baked plate.`,
        );
      expect(missing).toEqual([]);
    });
});
