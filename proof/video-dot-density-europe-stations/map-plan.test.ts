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
  weightRadiusOf,
} from "./build.mjs";
import {
  BUCKET_PX,
  BUCKET_REL,
  projectorOf,
  REFERENCE,
  slugOf,
} from "./map-plan.mjs";
import measured from "./measured.json";
import { mapFieldsOf, mapStateAt, radiusAt } from "./scene.mjs";
import { SUBJECT } from "./subject.mjs";

/**
 * The live map's plan — every station drawn once, in data-constant layers whose radius grows by area — and the overlay
 * placed on the map as it was measured: read again here on `measured.json`'s own grid, not through the build's
 * placement.
 */

const beat = loadBeat();
const { subject } = beat;

/** A constant MapLibre expression, once its tokens are bound: the operators the plan's radii use. */
function evaluate(e: unknown): number {
  if (typeof e === "number") return e;
  const [op, ...args] = e as [string, ...unknown[]];
  const v = args.map(evaluate);
  if (op === "sqrt") return Math.sqrt(v[0]);
  if (op === "+") return v.reduce((a, b) => a + b, 0);
  if (op === "*") return v.reduce((a, b) => a * b, 1);
  if (op === "-") return v[0] - v[1];
  if (op === "max") return Math.max(...v);
  throw new Error(`operator ${op} is not evaluated here`);
}

describe("the dot density video's camera", () => {
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
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props, dots } = buildDirection(id, beat);
  const plan = props.mapPlan as any;
  const dotLayers = plan.layers.filter((l: any) => l.id.startsWith("dot-"));
  const ringLayers = plan.layers.filter((l: any) => l.id.startsWith("ring-"));
  const ofFuel = (fuel: string) =>
    dotLayers.filter((l: any) => l.id.startsWith(`dot-${slugOf(fuel)}-`));

  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying the camera and every bound field", () => {
      const T = props.timing as any;
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) =>
        mapStateAt(props, i * 15),
      );
      expect([
        ...validateScrollyPlan(plan, states),
        ...validateExpressions(plan),
      ]).toEqual([]);
      for (const s of states)
        for (const f of mapFieldsOf(props.fuels))
          expect([f, typeof (s as any)[f]]).toEqual([f, "number"]);
    });

    it("should draw every station exactly once, at its place, in its fuel's layers, and ring the 72 nuclear", () => {
      const key = ([lon, lat]: number[]) =>
        `${lon.toFixed(5)},${lat.toFixed(5)}`;
      for (const { fuel } of props.fuels) {
        const drawn = ofFuel(fuel)
          .flatMap((l: any) =>
            l.data.features.map((f: any) => key(f.geometry.coordinates)),
          )
          .sort();
        const there = subject.stations
          .filter((s: any) => s.fuel === fuel)
          .map((s: any) => key([s.lon, s.lat]))
          .sort();
        expect([fuel, drawn]).toEqual([fuel, there]);
      }
      expect(
        ringLayers.reduce((a: number, l: any) => a + l.data.features.length, 0),
      ).toBe(subject.nuclear);
    });

    it("should grow every bucket to the area of its members, none of them further from its radius than the bucket's width", () => {
      for (const { fuel } of props.fuels) {
        const ws = subject.stations
          .filter((s: any) => s.fuel === fuel)
          .map((s: any) => weightRadiusOf(s.mw, subject.maxMw))
          .sort((a: number, b: number) => b - a);
        let at = 0;
        for (const l of ofFuel(fuel)) {
          const members = ws.slice(at, at + l.data.features.length);
          at += members.length;
          expect(
            members.reduce((a: number, w: number) => a + w * w, 0),
          ).toBeCloseTo(members.length * l.r1 * l.r1, 6);
          const worst = Math.max(
            ...members.map((w: number) => Math.abs(w - l.r1)),
          );
          expect([
            l.id,
            worst <= Math.max(BUCKET_PX, BUCKET_REL * l.r1),
          ]).toEqual([l.id, true]);
        }
      }
    });

    it("should carry each dot's area from the dot's to its weight's, and close the ring onto it, through the bound weight", () => {
      const at = (layer: any, property: string, weight: number) =>
        evaluate(bindState(layer.bindings[property], { weight }));
      const l = ofFuel(SUBJECT)[0];
      expect(at(l, "circle-radius", 0)).toBeCloseTo(props.dotR, 9);
      expect(at(l, "circle-radius", 1)).toBeCloseTo(l.r1, 9);
      expect(at(l, "circle-radius", 0.3)).toBeCloseTo(
        radiusAt(props.dotR, l.r1, 0.3),
        9,
      );
      const ring = ringLayers.find(
        (r: any) => r.id === l.id.replace("dot-", "ring-"),
      );
      // MapLibre strokes outside the radius: the ring's centre line is the radius and half the stroke.
      const centre = (w: number) =>
        at(ring, "circle-radius", w) + at(ring, "circle-stroke-width", w) / 2;
      expect(centre(0)).toBeCloseTo(props.ringR, 9);
      expect(centre(1)).toBeCloseTo(l.r1, 9);
    });

    it("should stack the fuels in their arrival order, each fuel's largest dots first, the rings over every dot", () => {
      const order = dotLayers.map((l: any) =>
        props.fuels.findIndex(({ fuel }: any) =>
          l.id.startsWith(`dot-${slugOf(fuel)}-`),
        ),
      );
      expect(order).toEqual([...order].sort((a: number, b: number) => a - b));
      for (const { fuel } of props.fuels) {
        const r = ofFuel(fuel).map((l: any) => l.r1);
        expect(r).toEqual([...r].sort((a: number, b: number) => b - a));
      }
      expect(plan.layers.slice(-ringLayers.length)).toEqual(ringLayers);
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

    it("should stand the key over open sea, clear of every station", () => {
      const box = {
        x: props.legend.at.x,
        y: props.legend.at.y,
        width: props.legend.width,
        height: props.legend.height,
      };
      expect(land(box).count).toBe(0);
      expect(dots.length).toBe(subject.total);
    });
  });
}
