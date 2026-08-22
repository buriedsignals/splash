/**
 * The live map's mark sizing, and the guard that keeps it tied to the camera.
 *
 * The pure arithmetic is unit-tested here. What cannot be unit-tested is whether the map a reader
 * gets is the map the arithmetic describes — the defect that started this was a map drawing a 36px
 * disc on cartography that had grown by 1.57x, and every half of it was internally consistent. That
 * is measured in a real browser by `scripts/verify-live-map.mjs`, which this file runs when a key is
 * present and says plainly that it did not when one is absent — the same gate `keys.test.ts` puts on
 * its own live probe.
 *
 * Read that file's header before changing anything here: its FIRST version compared the drawn radius
 * to where `queryRenderedFeatures` said the mark ended, which is the same number twice, and it passed
 * against a copy with the defect deliberately put back.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cameraScale,
  planIsUnkeyed,
  readLivePlan,
  selectedGroup,
} from "../assets/live-map.mjs";
import {
  MAPTILER_KEY_ALIASES,
  PIXEL_PROBE_GRID,
  POINTER_TOLERANCE_PX,
  SCALE_TOLERANCE,
  SHAPES,
  expectedRadiusPx,
  mapTilerKeyFrom,
  marksWithNoPixel,
  parseEnvFile,
} from "../scripts/verify-live-map.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");

function keyFromEnv(): string | null {
  const path = join(TWIN, ".env");
  if (!existsSync(path)) return null;
  // EVERY NAME THE KEY TRAVELS UNDER, through the ONE resolution `verify-live-map.mjs` owns.
  //
  // THE DEFECT THIS CLOSES, and it is the same one, one file up. Round two found the probe reading
  // `process.env.MAPTILER_KEY` alone while the root's `.env` holds `REMOTION_MAPTILER_KEY` and
  // `VITE_MAPTILER_KEY`, so it verified nothing and exited 0. The SCRIPT was fixed; this GATE, which
  // decides whether the script is run at all, kept the single name — so on a machine holding a
  // perfectly good key under an alias, the format's only live probe printed "live map not driven: no
  // MAPTILER_KEY in twin/.env" and the suite stayed green having never once driven the live layer.
  // A fix to a mechanism that leaves its own gate unfixed is a mechanism that still cannot run.
  return mapTilerKeyFrom(parseEnvFile(readFileSync(path, "utf8")));
}

describe("the marks this camera gives no pixel to", () => {
  // A RULING WAS REFUTED HERE, and this is what the refutation earned. Driven with a real key
  // against the committed 241-region world beat, `queryRenderedFeatures` at each mark's own centre
  // answered own 140, a neighbour 15, NOTHING 86; widened to any pixel anywhere the map attributes
  // to the mark, 63 of 241 have no pixel whatever at 1600x900 and 91 none with a pixel to spare —
  // 82 and 149 at 375x667. At that camera the map draws 896px for 360° of longitude, so one pixel
  // is about 26 km and Monaco is about a thirteenth of one. A mark smaller than a pixel has no
  // pointer path and no target engineering creates one.
  it("names every mark the scan found nothing for, and stays silent about the rest", () => {
    const candidates = [{ key: "FRA" }, { key: "MCO" }, { key: "ITA" }, { key: "SMR" }];
    expect(marksWithNoPixel(candidates, { FRA: [10, 10], ITA: [40, 40] })).toEqual(["MCO", "SMR"]);
    expect(marksWithNoPixel(candidates, { FRA: [1, 1], MCO: [2, 2], ITA: [3, 3], SMR: [4, 4] })).toEqual([]);
    expect(marksWithNoPixel([], {})).toEqual([]);
  });

  it("is asked of EVERY mark, never of the sample the pointer walk uses", () => {
    // THE DEFECT THIS CLOSES: the scan used to be handed `sampled.map(...)` — 40 of 241 on the world
    // beat — and its answer was printed as "N sampled mark(s)", a count nobody could weigh against
    // the beat's own population. The pointer WALK is still sampled, because each of its marks costs
    // a real round trip to the browser; the pixel scan is one `page.evaluate` and now covers all of
    // them. Read from the source because the property is about which list is passed, and driving it
    // proves only that the list that WAS passed came back.
    const source = readFileSync(
      join(TWIN, "skills/map-web/scripts/verify-live-map.mjs"),
      "utf8",
    );
    expect(source).toContain("keys: candidates.map((mark) => mark.key)");
    expect(source).not.toContain("keys: sampled.map((mark) => mark.key)");
    expect(source).toContain("NO POINTER PATH:");
    expect(source).toContain("The keyboard and the accessible table ARE their path");
  });

  it("keeps the probe grid at the resolution it was measured at", () => {
    // 12 (an 11x11 grid inside each mark's own bounding box). Doubling it to 24 costs four times the
    // queries and moved the world beat's count by two marks in 241 — 63/91 against 65/91 — and a
    // coarser grid can only OVER-report a mark as unreachable, never miss one that is.
    expect(PIXEL_PROBE_GRID).toBe(12);
  });
});

describe("the gate that decides whether the live layer is driven at all", () => {
  it("finds the key under every name it is written under", () => {
    for (const alias of ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES])
      expect(`${alias}: ${mapTilerKeyFrom({ [alias]: "k-" + alias })}`).toBe(
        `${alias}: k-${alias}`,
      );
  });

  it("prefers the plain name when several are present, and says null when none is", () => {
    expect(
      mapTilerKeyFrom({ MAPTILER_KEY: "plain", VITE_MAPTILER_KEY: "vite" }),
    ).toBe("plain");
    expect(mapTilerKeyFrom({ DATAWRAPPER_API_TOKEN: "not-a-map-key" })).toBe(
      null,
    );
    // An empty string is not a key. Left as `?? null` it would be returned as one and the probe
    // would boot a map against `?key=`, which fails at the tile server rather than here.
    expect(mapTilerKeyFrom({ MAPTILER_KEY: "", VITE_MAPTILER_KEY: "real" })).toBe(
      "real",
    );
  });

  it("reads the real .env the same way the runner does, on this machine", () => {
    // NOT A TAUTOLOGY, and the reason it is here: this asserts the gate and the runner agree about
    // the file that actually exists, which is precisely what came apart. It says nothing about the
    // key's VALUE and never prints it.
    const path = join(TWIN, ".env");
    if (!existsSync(path)) return;
    const env = parseEnvFile(readFileSync(path, "utf8"));
    const named = Object.keys(env).filter((name) => name.includes("MAPTILER"));
    expect(
      `${named.length} MAPTILER name(s) present, gate resolves a key: ${keyFromEnv() !== null}`,
    ).toBe(
      `${named.length} MAPTILER name(s) present, gate resolves a key: ${named.length > 0}`,
    );
  });
});

/** A plate baked at zoom 3.879, which is the seed's own. */
const PLAN = {
  degreesPerPixel: 360 / (512 * 2 ** 3.879),
  frame: { width: 1000, height: 1000 },
};
const atZoom = (zoom: number) => ({ getZoom: () => zoom }) as never;

describe("cameraScale — the mark covers the ground it covered when baked", () => {
  it("should draw a mark at its baked size when the live camera matches the plate's", () => {
    expect(cameraScale(PLAN, atZoom(3.879))).toBeCloseTo(1, 6);
  });

  it("should double a mark for every zoom level the live camera is closer in", () => {
    // A circle encodes a value, so this is applied ONCE at the fit and then held — it is not a
    // zoom expression. What it says is that a camera drawing the coastlines twice as large draws
    // the symbols on them twice as large too.
    expect(cameraScale(PLAN, atZoom(4.879))).toBeCloseTo(2, 6);
    expect(cameraScale(PLAN, atZoom(2.879))).toBeCloseTo(0.5, 6);
  });

  it("should not read the container at all, which is the defect it replaced", () => {
    // The old rule was `Math.min(w / frameW, h / frameH)`, so a 1566x583 canvas gave 0.583 whatever
    // the camera was doing. This function takes no container: there is nothing for a box's aspect
    // to get into.
    expect(cameraScale.length).toBe(2);
  });

  it("should refuse a plate that predates the camera facts rather than guess a scale", () => {
    expect(() =>
      cameraScale({ ...PLAN, degreesPerPixel: undefined } as never, atZoom(4)),
    ).toThrow(/predates the camera facts/);
  });
});

describe("the live layer refuses to boot on a placeholder", () => {
  it("should treat the committed artifact's placeholder as unkeyed", () => {
    expect(
      planIsUnkeyed({
        styleUrl: "https://api.maptiler.com/x.json?key=__MAPTILER" + "_KEY__",
      }),
    ).toBe(true);
  });

  it("should treat a real key as keyed", () => {
    expect(
      planIsUnkeyed({ styleUrl: "https://api.maptiler.com/x.json?key=abc123" }),
    ).toBe(false);
  });

  it("should treat a page with no plan at all as unkeyed", () => {
    expect(
      planIsUnkeyed(readLivePlan({ getElementById: () => null } as never)),
    ).toBe(true);
  });
});

describe("selectedGroup — the one selection both halves of a mark read", () => {
  const doc = (id: string | null) =>
    ({ querySelector: () => (id === null ? null : { id }) }) as never;

  it("should read the checked chip's own slug, which is what the CSS selector quotes", () => {
    expect(selectedGroup(doc("mw-filter-western-europe"))).toBe(
      "western-europe",
    );
  });

  it("should treat the reserved unfiltered option as no filter at all", () => {
    // `mw-filter-all` is refused as a group slug at build time by `assertDistinctSlugs`, so it can
    // only ever mean "every group".
    expect(selectedGroup(doc("mw-filter-all"))).toBe(null);
  });

  it("should treat a page with no filter as no filter", () => {
    expect(selectedGroup(doc(null))).toBe(null);
  });
});

describe("the drawn circle and the answering circle, measured in a real browser", () => {
  it("should measure at two container aspects, because one proves nothing", () => {
    // The defect is invisible when the container's aspect matches the plate's — then the
    // box-derived scale and the camera-derived one agree. A square-ish container would have passed
    // the whole time it was broken.
    const aspects = SHAPES.map((s) => s.width / s.height);
    expect(SHAPES.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...aspects) > 1 && Math.min(...aspects) < 1).toBe(true);
  });

  it("should compare the drawn radius against a SECOND opinion, not against itself", () => {
    // The first version of this guard walked outward with `queryRenderedFeatures` and compared
    // where the mark ended to the radius it was drawn at. Those are the same number — MapLibre
    // hit-tests against the circle it painted — so it passed against a copy with the defect put
    // back on purpose. `expectedRadiusPx` is the independent derivation that replaced it: it takes
    // the plate's own ground scale and the zoom, and never looks at the page.
    const bakeDegreesPerPixel = 360 / (512 * 2 ** 3.879);
    expect(expectedRadiusPx(62, bakeDegreesPerPixel, 3.879)).toBeCloseTo(62, 6);
    expect(expectedRadiusPx(62, bakeDegreesPerPixel, 4.879)).toBeCloseTo(
      124,
      6,
    );
    // And it does not take a container, so no box's aspect can get into it.
    expect(expectedRadiusPx.length).toBe(3);
  });

  it("should hold its tolerances at the measurements' own noise, not at a fudge factor", () => {
    // 1% of a ratio of two ground scales read at a float zoom; 1px for the pointer walk's step
    // plus ~1px of antialiased circle edge. The scale defect was a factor of 2.7 and the hit-target
    // one would miss by tens of pixels.
    expect(SCALE_TOLERANCE).toBe(0.01);
    expect(POINTER_TOLERANCE_PX).toBe(3);
  });

  const key = keyFromEnv();
  // THE FILE THIS REPOSITORY PRODUCES, and that is the whole of the change.
  //
  // This used to be `/tmp/mw-live/population.html` — a path NO script in this tree writes
  // (`render-web.mjs` defaulted to `/tmp/map-web-twin`, `verify-live-map.mjs` to `/tmp/mw-live`).
  // It existed on one machine because someone had rendered it there by hand, 1.1 MB, untracked,
  // stale with respect to every change made after it. On a fresh clone this printed "live map not
  // driven" and passed, which is how the entire live layer came to be deletable in silence
  // (AUDIT-W5-W6-map.md §5.6b). It also broke the invariant that a beat's outputs live in the
  // beat's own folder.
  //
  // `output-proof/population.html` is committed, carries the placeholder rather than a key (R1b),
  // and is regenerated by `bun scripts/render-web.mjs`. `verifyLiveMap` writes its keyed copy to a
  // temp directory, so the key still never touches the tree.
  const html = join(
    TWIN,
    "skills",
    "map-web",
    "output-proof",
    "population.html",
  );
  const runnable = key !== null && existsSync(html);
  it(
    runnable
      ? "should find every mark sized by its camera, none cropped, and each reachable across its whole disc"
      : "should say plainly that it did not drive the live map",
    async () => {
      if (!runnable) {
        console.log(
          key === null
            ? "live map not driven: no MAPTILER_KEY in twin/.env."
            : `live map not driven: ${html} is missing — run 'bun skills/map-web/scripts/render-web.mjs' to regenerate this skill's own committed proof page.`,
        );
        return;
      }
      const { verifyLiveMap } = await import("../scripts/verify-live-map.mjs");
      const { results, failures } = await verifyLiveMap({
        htmlPath: html,
        key,
      });
      for (const result of results)
        console.log(
          `${result.shape}: canvas ${result.canvas[0]}x${result.canvas[1]}, scale ${result.scale.toFixed(3)}, ` +
            `${result.marks.filter((m: { onScreen: boolean }) => m.onScreen).length}/${result.marks.length} on screen` +
            (result.pointerReach
              ? `, pointer reaches ${result.pointerReach.key} to ${result.pointerReach.reach}px of ` +
                `${result.pointerReach.drawn.toFixed(1)}px drawn`
              : ""),
        );
      expect(failures).toEqual([]);
    },
    180000,
  );
});
