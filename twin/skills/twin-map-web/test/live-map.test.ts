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
  POINTER_TOLERANCE_PX,
  SCALE_TOLERANCE,
  SHAPES,
  expectedRadiusPx,
  parseEnvFile,
} from "../scripts/verify-live-map.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");

function keyFromEnv(): string | null {
  const path = join(TWIN, ".env");
  if (!existsSync(path)) return null;
  return parseEnvFile(readFileSync(path, "utf8")).MAPTILER_KEY ?? null;
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
  const html = "/tmp/mw-live/population.html";
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
            : `live map not driven: ${html} has not been rendered — run scripts/render-web.mjs first.`,
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
