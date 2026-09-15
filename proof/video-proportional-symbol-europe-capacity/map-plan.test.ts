import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { bindState, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import {
  buildDirection,
  cellAt,
  contentOf,
  countOf,
  loadBeat,
  near,
  R_MAX,
} from "./build.mjs";
import { ARRIVAL_FROM, projectorOf, REFERENCE } from "./map-plan.mjs";
import measured from "./measured.json";
import { mapFieldsOf, mapStateAt, sceneAt } from "./scene.mjs";
import { TOP } from "./subject.mjs";

/**
 * The live map's plan — the hundred each its own data-constant layer, largest first over the rest's points — and the
 * overlay placed on the map as it was measured: read again here on `measured.json`'s own grid.
 */

const beat = loadBeat();
const { subject } = beat;
const IDS = ["creme", "nocturne", "rapport"];

function evaluate(e: unknown): number {
  if (typeof e === "number") return e;
  const [op, ...args] = e as [string, ...unknown[]];
  const v = args.map(evaluate);
  if (op === "+") return v.reduce((a, b) => a + b, 0);
  if (op === "*") return v.reduce((a, b) => a * b, 1);
  if (op === "-") return v[0] - v[1];
  if (op === "max") return Math.max(...v);
  throw new Error(`operator ${op} is not evaluated here`);
}
const seatKey = ([lon, lat]: number[]) => `${lon.toFixed(5)},${lat.toFixed(5)}`;

describe("the proportional symbol video's camera", () => {
  it("should hold every station inside the stage's content box at the whole-map camera", () => {
    const project = projectorOf(beat.cameras.whole, REFERENCE);
    const c = contentOf();
    const outside = subject.stations.filter((s: any) => {
      const [x, y] = project([s.lon, s.lat]);
      return (
        x < c.x - 1e-6 ||
        x > c.x + c.w + 1e-6 ||
        y < c.y - 1e-6 ||
        y > c.y + c.h + 1e-6
      );
    });
    expect(outside).toEqual([]);
  });

  it("should project every measured seat where MapLibre drew it, to a tenth of a pixel", () => {
    const project = projectorOf(beat.cameras.whole, REFERENCE);
    for (const id of IDS)
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
});

for (const id of IDS) {
  const { props, rest } = buildDirection(id, beat);
  const plan = props.mapPlan as any;
  const circles = plan.layers.filter((l: any) => l.id.startsWith("top-"));
  const restLayer = plan.layers.find((l: any) => l.id === "rest");

  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying the camera and every bound field", () => {
      const T = props.timing as any;
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) =>
        mapStateAt(props as any, i * 15),
      );
      expect([
        ...validateScrollyPlan(plan, states),
        ...validateExpressions(plan),
      ]).toEqual([]);
      for (const s of states)
        for (const f of mapFieldsOf(TOP))
          expect([f, typeof (s as any)[f]]).toEqual([f, "number"]);
    });

    it("should draw the hundred largest once each at their seat, largest first, and every other station once in the rest", () => {
      expect(
        circles.map((l: any) =>
          seatKey(l.data.features[0].geometry.coordinates),
        ),
      ).toEqual(
        subject.ranked.slice(0, TOP).map((s: any) => seatKey([s.lon, s.lat])),
      );
      expect(circles.every((l: any) => l.data.features.length === 1)).toBe(
        true,
      );
      const r = circles.map((l: any) => l.r);
      expect(r).toEqual([...r].sort((a: number, b: number) => b - a));
      expect(r[0]).toBeCloseTo(R_MAX, 0);
      const drawn = restLayer.data.features
        .map((f: any) => seatKey(f.geometry.coordinates))
        .sort();
      expect(drawn).toEqual(
        subject.ranked
          .slice(TOP)
          .map((s: any) => seatKey([s.lon, s.lat]))
          .sort(),
      );
      expect(plan.layers[0]).toBe(restLayer);
    });

    it("should grow each ring from its arrival's start to its radius, the stroke's centre line on the SVG ring's", () => {
      const l = circles[3];
      const centre = (t: number) =>
        evaluate(bindState(l.bindings["circle-radius"], { [`c3`]: t })) +
        l.paint["circle-stroke-width"] / 2;
      expect(centre(0)).toBeCloseTo(ARRIVAL_FROM * l.r, 9);
      expect(centre(1)).toBeCloseTo(l.r, 9);
      expect(centre(0.5)).toBeCloseTo(
        l.r * (ARRIVAL_FROM + (1 - ARRIVAL_FROM) * 0.5),
        9,
      );
      expect(l.bindings["circle-stroke-opacity"]).toEqual({ $state: "c3" });
    });

    it("should bind each circle to its own arrival in the frame, the rest to the rest", () => {
      const mid = Math.round(
        props.timing.reveal.start + props.timing.reveal.duration * 0.4,
      );
      const scene = sceneAt(props as any, mid);
      const state = mapStateAt(props as any, mid) as any;
      expect(circles.map((_: any, k: number) => state[`c${k}`])).toEqual(
        scene.circles,
      );
      expect(state.rest).toBe(scene.rest);
    });

    it("should paint the basemap in the plate's sea and land, and carry no key", () => {
      expect(plan.tints).toEqual({
        water: props.colours.sea,
        land: props.colours.land,
      });
      const text = JSON.stringify(plan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });

  describe(`${id}'s overlay on the measured map`, () => {
    const { grid, projected } = (measured.cameras as any)[id].whole;
    const sea = cellAt(grid, ...projected.atlantic);
    const land = countOf(grid, (c: string) => !near(c, sea));
    const clearOfStations = (b: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) =>
      props.top.every(
        (c: any) =>
          Math.hypot(
            c.x - Math.min(Math.max(c.x, b.x), b.x + b.width),
            c.y - Math.min(Math.max(c.y, b.y), b.y + b.height),
          ) >= c.r,
      ) &&
      rest.every(
        ([x, y]: number[]) =>
          x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height,
      );

    it("should set the credit on one line with the map's attribution, over open sea only, clear of every station", () => {
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
      expect([land(box).count, clearOfStations(box)]).toEqual([0, true]);
    });

    it("should stand the key over open sea, clear of every station", () => {
      const box = {
        x: props.legend.at.x,
        y: props.legend.at.y,
        width: props.legend.width,
        height: props.legend.height,
      };
      expect([land(box).count, clearOfStations(box)]).toEqual([0, true]);
    });
  });
}
