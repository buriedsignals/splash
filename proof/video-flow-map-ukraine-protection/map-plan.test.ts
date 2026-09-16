import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import {
  bandsIn,
  buildDirection,
  cellAt,
  countOf,
  loadBeat,
  near,
  WIDEST,
} from "./build.mjs";
import { projectorOf, REFERENCE } from "./map-plan.mjs";
import measured from "./measured.json";
import { arcAt, mapFieldsOf, mapStateAt } from "./scene.mjs";
import { FOCUS_HOSTS, ORIGIN } from "./subject.mjs";

/**
 * The live map's plan — every drawn band one data-constant line layer at its width, traced by cutting its arc, the node
 * and the ten names on the map — and the overlay placed on the map as it was measured: read again here on
 * `measured.json`'s own grid, not through the build's placement.
 */

const beat = loadBeat();
const { subject, seats } = beat;
const ids = ["creme", "nocturne", "rapport"];
const pxLength = (line: number[][]) =>
  line
    .slice(1)
    .reduce(
      (a, p, i) => a + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]),
      0,
    );

for (const id of ids) {
  const { props, bands, names, dots } = buildDirection(id, beat) as any;
  const plan = props.mapPlan;
  const camera = props.cameras.whole;
  const project = projectorOf(camera, REFERENCE);
  const bandLayers = plan.layers.filter((l: any) => l.id.startsWith("band-"));
  const nameLayers = plan.layers.filter((l: any) => l.id.startsWith("name-"));
  const { grid, projected } = (measured.cameras as any)[id].whole;
  const sea = cellAt(grid, ...(projected.biscay as [number, number]));
  const land = countOf(grid, (c: string) => !near(c, sea));

  describe(`${id}'s camera`, () => {
    it("should hold the origin and the ten largest hosts right of the key column, inside the frame's margins", () => {
      const { x: inset, y: vInset } = props.layoutInset;
      const left = inset + props.legend.width;
      const outside = [
        ORIGIN,
        ...subject.ranked.slice(0, FOCUS_HOSTS).map((f: any) => f.code),
      ].filter((code) => {
        const [x, y] = project(seats[code]);
        return (
          x < left ||
          x > REFERENCE.width - inset ||
          y < vInset ||
          y > REFERENCE.height - vInset
        );
      });
      expect(outside).toEqual([]);
    });

    it("should project every measured seat where MapLibre drew it, to a tenth of a pixel", () => {
      for (const [name, seat] of Object.entries(beat.mapSeats)) {
        const [x, y] = project(seat as [number, number]);
        const [mx, my] = projected[name];
        expect([
          name,
          Math.abs(x - mx) < 0.1 && Math.abs(y - my) < 0.1,
        ]).toEqual([name, true]);
      }
    });
  });

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
      const fields = mapFieldsOf(
        props.bands,
        names.map((n: any) => n.code),
      );
      for (const s of states)
        for (const f of fields)
          expect([f, typeof (s as any)[f]]).toEqual([f, "number"]);
    });

    it("should draw every drawn band once, the largest on top, at its own width and in the top two's ink or the others'", () => {
      const drawn = props.bands.filter((b: any) => b.drawn);
      expect(bandLayers.map((l: any) => l.id)).toEqual(
        drawn.map((b: any) => `band-${b.code}`).reverse(),
      );
      for (const b of drawn) {
        const l = bandLayers.find((x: any) => x.id === `band-${b.code}`);
        expect([b.code, l.paint["line-width"], l.paint["line-color"]]).toEqual([
          b.code,
          b.width,
          b.top ? props.colours.subjectBand : props.colours.band,
        ]);
      }
      expect(bandLayers[bandLayers.length - 1].paint["line-width"]).toBe(
        WIDEST,
      );
    });

    it("should run every band from the node's edge to its host's seat", () => {
      const node = plan.layers.find((l: any) => l.id === "node");
      const r =
        node.paint["circle-radius"] + node.paint["circle-stroke-width"] / 2;
      const [ox, oy] = project(seats[ORIGIN]);
      for (const l of bandLayers) {
        const line = l.data.features[0].geometry.coordinates.map(project);
        const [sx, sy] = project(seats[l.id.slice(5)]);
        const [ex, ey] = line[line.length - 1];
        expect([
          l.id,
          Math.abs(Math.hypot(line[0][0] - ox, line[0][1] - oy) - r) < 0.5,
          Math.hypot(ex - sx, ey - sy) < 0.5,
        ]).toEqual([l.id, true, true]);
      }
    });

    it("should cut a band's arc at its drawn share of its length: nothing before it starts, half at a half, all once in", () => {
      const l = bandLayers[bandLayers.length - 1];
      const coordinates = l.data.features[0].geometry.coordinates;
      const full = pxLength(coordinates.map(project));
      expect(arcAt(coordinates, l.cumulative, 0)).toEqual([]);
      expect(arcAt(coordinates, l.cumulative, 1)).toEqual(coordinates);
      expect(
        pxLength(arcAt(coordinates, l.cumulative, 0.5).map(project)) / full,
      ).toBeCloseTo(0.5, 2);
    });

    it("should set the ten names on the map at 30 px or more, each within three of its heights of its own seat", () => {
      expect(nameLayers.map((l: any) => l.id)).toEqual(
        names.map((n: any) => `name-${n.code}`),
      );
      expect(names.length).toBe(FOCUS_HOSTS);
      for (const l of [
        ...nameLayers,
        plan.layers.find((x: any) => x.id === "node-name"),
      ])
        expect([l.id, l.layout["text-size"] >= 30]).toEqual([l.id, true]);
      for (const n of names) {
        const [sx, sy] = project(n.seat);
        const reach = Math.hypot(
          Math.max(n.box.x - sx, 0, sx - n.box.x - n.box.width),
          Math.max(n.box.y - sy, 0, sy - n.box.y - n.box.height),
        );
        expect([n.code, reach <= 3 * n.box.height]).toEqual([n.code, true]);
      }
    });

    it("should keep every name off every seat dot and off every band a quarter of the widest or wider", () => {
      const hit = (a: any, b: any) =>
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height;
      for (const n of names)
        expect([
          n.code,
          dots.some((d: any) => hit(n.box, d)),
          bandsIn(bands, n.box, 0, WIDEST / 4),
        ]).toEqual([n.code, false, false]);
    });

    it("should paint the basemap's sea the bare ground and its land one step off it, and carry no key", () => {
      expect(plan.tints).toEqual({
        water: props.colours.ground,
        land: props.colours.land,
      });
      const text = JSON.stringify(plan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });

  describe(`${id}'s overlay on the measured map`, () => {
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

    it("should stand the key over open sea, clear of every band", () => {
      const box = {
        x: props.legend.at.x,
        y: props.legend.at.y,
        width: props.legend.width,
        height: props.legend.height,
      };
      expect([land(box).count, bandsIn(bands, box)]).toEqual([0, false]);
    });
  });
}
