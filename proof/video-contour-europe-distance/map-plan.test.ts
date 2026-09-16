import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { mercatorOf, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import {
  buildDirection,
  cellAt,
  countOf,
  loadBeat,
  near,
  PANEL_LAND,
} from "./build.mjs";
import { projectorOf, REFERENCE, SWEEP_BENEATH } from "./map-plan.mjs";
import measured from "./measured.json";
import { mapFieldsOf, mapStateAt, paintSweep } from "./scene.mjs";

/**
 * The live map's plan, and the overlay placed on the map as it was measured: read again here on `measured.json`'s own
 * grid, not through the build's placement.
 */

const beat = loadBeat();

describe("the contour video's camera and sweep", () => {
  it("should hold every corner of the static plate's bounds inside the reference stage", () => {
    const { whole, bounds } = beat.cameras;
    const worldPx = 512 * 2 ** whole.camZoom;
    const [[west, south], [east, north]] = bounds;
    const outside = [
      [west, south],
      [west, north],
      [east, south],
      [east, north],
    ].filter((corner) => {
      const [x, y] = mercatorOf(corner as [number, number]);
      return (
        Math.abs(x - whole.camX) > REFERENCE.width / 2 / worldPx + 1e-9 ||
        Math.abs(y - whole.camY) > REFERENCE.height / 2 / worldPx + 1e-9
      );
    });
    expect(outside).toEqual([]);
  });

  it("should project every measured seat where MapLibre drew it, to a tenth of a pixel", () => {
    const project = projectorOf(beat.cameras.whole, REFERENCE);
    for (const id of ["creme", "nocturne", "rapport"])
      for (const [name, seat] of Object.entries(beat.mapSeats)) {
        const [x, y] = project(seat as [number, number]);
        const [mx, my] = (measured.cameras as any)[id].whole.projected[name];
        expect([
          id,
          name,
          Math.abs(x - mx) < 0.1 && Math.abs(y - my) < 0.1,
        ]).toEqual([id, name, true]);
      }
  });

  it("should carry the farthest point's distance on the sweep's grid at the farthest point", () => {
    const { sweep, subject, mapSeats } = beat;
    const bytes = Buffer.from(sweep.bytes, "base64");
    const [[west, north], , [east, south]] = sweep.coordinates;
    const [x0, y0] = mercatorOf([west, north]);
    const [x1, y1] = mercatorOf([east, south]);
    const [sx, sy] = mercatorOf(mapSeats.summit as [number, number]);
    const i = Math.floor(((sx - x0) / (x1 - x0)) * sweep.cols);
    const j = Math.floor(((sy - y0) / (y1 - y0)) * sweep.rows);
    const max = Math.max(
      ...[-1, 0, 1].flatMap((dj) =>
        [-1, 0, 1].map((di) => bytes[(j + dj) * sweep.cols + i + di]),
      ),
    );
    expect(
      Math.abs((max - 1) * sweep.stepKm - subject.field.deepest),
    ).toBeLessThanOrEqual(sweep.stepKm);
  });

  it("should fill a texel once the level passes its distance, warm at the front and cooling inward, and clear the rest", () => {
    const px = new Uint8ClampedArray(4 * 4);
    const filled = paintSweep(px, Uint8Array.from([0, 1, 11, 41]), {
      level: 33,
      stepKm: 3,
      rimKm: 6,
      front: true,
      tint: "#102030",
      rim: "#ff0000",
    });
    expect(filled).toBe(2);
    // Outside the land, transparent; 33 km deep, the tint; 3 km behind the front, halfway from the rim to the tint.
    expect([...px]).toEqual([
      0, 0, 0, 0, 16, 32, 48, 255, 136, 16, 24, 255, 0, 0, 0, 0,
    ]);
  });

  // THE SWEEP MUST NOT ADVANCE BY WHOLE RINGS. The raster's bytes are quantised to `stepKm`, so a texel that flips
  // from clear to opaque the instant the level crosses its band makes the front jump a ring at a time — measured on
  // the first render, one frame in three changed while the two between it stood still.
  it("should bring a texel in over the width of one band, a fraction of a band at a time", () => {
    const bytes = Uint8Array.from([11]);
    const alphaAt = (level: number) => {
      const px = new Uint8ClampedArray(4);
      paintSweep(px, bytes, {
        level,
        stepKm: 3,
        rimKm: 6,
        front: true,
        tint: "#102030",
        rim: "#ff0000",
      });
      return px[3];
    };
    expect(alphaAt(30)).toBe(0);
    expect(alphaAt(30.5)).toBe(43);
    expect(alphaAt(31.5)).toBe(128);
    expect(alphaAt(33)).toBe(255);
    // No step between two neighbouring levels is worth more than the travel that earned it.
    for (let level = 29; level <= 34; level += 0.1) {
      expect(
        Math.abs(alphaAt(level + 0.1) - alphaAt(level)),
      ).toBeLessThanOrEqual(255 * (0.1 / 3) + 1);
    }
  });
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const plan = props.mapPlan as any;
  const layer = (layerId: string) =>
    plan.layers.find((l: any) => l.id === layerId);

  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying the camera and every bound field", () => {
      const T = props.timing;
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) =>
        mapStateAt(props, i * 15),
      );
      expect([
        ...validateScrollyPlan(plan, states),
        ...validateExpressions(plan),
      ]).toEqual([]);
      for (const s of states)
        for (const f of mapFieldsOf(props.levels))
          expect([f, typeof (s as any)[f]]).toEqual([f, "number"]);
    });

    it("should draw the study land beneath the water and the land outside the measurement over it, in the key's swatch", () => {
      expect([layer("study").beneath, layer(SWEEP_BENEATH).beneath]).toEqual([
        "water",
        "water",
      ]);
      expect(plan.layers.indexOf(layer(SWEEP_BENEATH))).toBeGreaterThan(
        plan.layers.indexOf(layer("study")),
      );
      expect(JSON.stringify(layer("study").filter)).not.toContain('"RU"');
      expect([
        layer("study").paint["fill-color"],
        layer(SWEEP_BENEATH).paint["fill-color"],
        plan.tints.land,
      ]).toEqual([
        props.colours.land,
        props.colours.outside,
        props.colours.outside,
      ]);
    });

    it("should draw every line as its own layer, its opacity bound to its own field, and every number and the farthest point as map layers", () => {
      for (const { level } of props.levels) {
        expect(layer(`line-${level}`).bindings["line-opacity"]).toEqual({
          $state: `line${level}`,
        });
        expect(layer(`number-${level}`).bindings["text-opacity"]).toEqual({
          $state: `label${level}`,
        });
      }
      expect(
        ["summit-dot", "summit-ring", "summit-number"].map(
          (l) => layer(l)?.type,
        ),
      ).toEqual(["circle", "circle", "symbol"]);
    });

    it("should draw every in-map word at 30 px or more", () => {
      for (const l of plan.layers.filter((l: any) => l.type === "symbol"))
        expect([l.id, l.layout["text-size"] >= 30]).toEqual([l.id, true]);
    });

    it("should carry no key and point at MapTiler through the placeholder only", () => {
      const text = JSON.stringify(plan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });

  describe(`${id}'s overlay on the measured map`, () => {
    const { grid, projected } = (measured.cameras as any)[id].whole;
    const sea = cellAt(grid, ...projected.atlantic);
    const land = countOf(grid, (c: string) => !near(c, sea));

    it("should set the credit on one line with the map's attribution, over open sea only", () => {
      const box = {
        x: props.credit.at.x,
        y: props.credit.at.y,
        width: props.credit.width,
        height: props.credit.height,
      };
      expect(props.credit.lines.length).toBe(1);
      expect(props.credit.lines[0].text).toContain(
        "©\u00A0MapTiler ©\u00A0OpenStreetMap",
      );
      expect(land(box).count).toBe(0);
    });

    it("should seat every line's number wholly over land, so its halo never stands on the sea", () => {
      const r = props.registers.axis;
      for (const [level, l] of Object.entries(props.labels) as [
        string,
        any,
      ][]) {
        const box = {
          x: l.x - l.width / 2,
          y: l.y - 0.75 * r.fontSize,
          width: l.width,
          height: r.fontSize,
        };
        expect([level, land(box).count === land(box).total]).toEqual([
          level,
          true,
        ]);
      }
    });

    it(`should stand the key and the curve over at most ${PANEL_LAND * 100} % land each`, () => {
      const key = {
        x: props.legend.at.x,
        y: props.legend.at.y,
        width: props.legend.width,
        height: props.legend.height,
      };
      const chart = {
        x: props.chart.x,
        y: props.chart.y,
        width: props.chart.width,
        height: props.chart.height,
      };
      for (const box of [key, chart])
        expect(land(box).count / land(box).total).toBeLessThanOrEqual(
          PANEL_LAND,
        );
    });
  });
}
