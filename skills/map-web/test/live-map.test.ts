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
  planIsUnkeyed,
  readLivePlan,
  selectedGroup,
} from "../assets/live-map.mjs";
// `cameraScale` moved to the trunk with the rest of the plan contract — `assets/mount.mjs` is the
// carried copy of `shared/map-beat/mount.mjs` the page inlines, and `carried-copies.test.ts` holds
// the two byte-identical, so testing it here tests the trunk's own arithmetic.
import { cameraScale, markScaleOf } from "../assets/mount.mjs";
import {
  POINTER_TOLERANCE_PX,
  SCALE_TOLERANCE,
  SHAPES,
  expectedRadiusPx,
  mapTilerKeyIn,
  parseEnvFile,
  radiusStrategyOf,
} from "../scripts/verify-live-map.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");

function keyFromEnv(): string | null {
  const path = join(TWIN, ".env");
  if (!existsSync(path)) return null;
  // The ALIASES too, not the canonical name alone: this checkout's own `.env` carries
  // `REMOTION_MAPTILER_KEY`, so reading `MAPTILER_KEY` here made this guard print "live map not
  // driven" and pass on the one machine it was written on.
  return mapTilerKeyIn(parseEnvFile(readFileSync(path, "utf8"))) || null;
}

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
    const bakePlan = { degreesPerPixel: 360 / (512 * 2 ** 3.879), bakeZoom: 3.879 };
    expect(expectedRadiusPx(62, bakePlan, 3.879)).toBeCloseTo(62, 6);
    expect(expectedRadiusPx(62, bakePlan, 4.879)).toBeCloseTo(124, 6);
    // And it does not take a container, so no box's aspect can get into it. Four arguments now:
    // the frame radius, the plan, the live zoom, and WHICH OF THE THREE THINGS A RADIUS CAN MEAN —
    // none of them a box.
    expect(expectedRadiusPx.length).toBe(3);
  });

  it("should answer a PIN at its baked size, whatever the camera is doing", () => {
    // The fourth argument is not decoration. This guard assumed every mark was camera-scaled, and
    // driven against `proof/mapgen-locator-web` — whose markers are pins — it called a 6px pin a
    // 17.3px circle and then reported the browser's own hit testing as broken. A pin is the same
    // screen size at every zoom, exactly as the plate drew it.
    const bakePlan = { degreesPerPixel: 360 / (512 * 2 ** 11.071), bakeZoom: 11.071 };
    expect(expectedRadiusPx(6, bakePlan, 11.071, "fixed")).toBe(6);
    expect(expectedRadiusPx(6, bakePlan, 12.598, "fixed")).toBe(6);
    // …and it is NOT the same answer a value-encoding circle gets at that camera.
    expect(expectedRadiusPx(6, bakePlan, 12.598, "camera")).toBeCloseTo(6 * 2 ** 1.527, 6);
  });

  it("should read the strategy off the plan's own layer rather than assuming one", () => {
    expect(radiusStrategyOf({ layers: [{ id: "mw-marks", radius: "fixed" }] })).toBe("fixed");
    expect(radiusStrategyOf({ layers: [{ id: "mw-marks", radius: "ground" }] })).toBe("ground");
    // A plan that declares none means what every plan meant before the field existed.
    expect(radiusStrategyOf({ layers: [{ id: "mw-marks" }] })).toBe("camera");
  });

  it("should keep the OVERLAY on the mark's own rule, which is what came apart", () => {
    // `markScaleOf` is the trunk's answer to "one mark, two halves, two mechanisms", third
    // instance: the locator's painted halo was `r · cameraScale · 2 + pad` — 40px of ring around a
    // 12px pin at that beat's own 2.88x — while the pin itself was drawn flat.
    const pin = { layers: [{ id: "mw-marks", radius: "fixed" }] };
    const disc = { layers: [{ id: "mw-marks", radius: "camera" }] };
    expect(markScaleOf(pin, 2.882)).toBe(1);
    expect(markScaleOf(disc, 2.882)).toBe(2.882);
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
            ? "live map not driven: no MapTiler key in twin/.env (MAPTILER_KEY or one of its aliases)."
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
