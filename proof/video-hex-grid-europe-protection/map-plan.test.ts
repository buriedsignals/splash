import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { cellAt, nearestOf } from "../video-locator-zaporizhzhia/build.mjs";
import { insideRing } from "../video-cartogram-europe-lowcarbon/build.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { MAP_FIELDS, projectorOf, WINDOW } from "./map-plan.mjs";
import measured from "./measured.json";
import { geographyAt, HANDOVER, mapStateAt, morphOf, sceneAt, WINDOWS } from "./scene.mjs";

/**
 * The live map's plan — the hosts' neutral, the hollow origin and the borders from Countries — its one camera, and the
 * handover to the SVG shapes and their travel into the cells, read again here on `measured.json`'s own grid.
 */

const beat = loadBeat();

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat) as any;
  const plan = props.mapPlan;
  const T = props.timing;
  const { whole } = (measured.cameras as any)[id];
  const project = projectorOf(props.camera, props.stage);
  const kinds = [props.colours.sea, props.colours.land, props.colours.neutral];

  describe(`${id}'s camera`, () => {
    it("should hold the window meet in the grid's box, touching its top and bottom", () => {
      const [west, south, east, north] = WINDOW;
      const box = props.gridBox;
      const [x0, y1] = project([west, south]);
      const [x1, y0] = project([east, north]);
      expect([x0 >= box.x - 1e-6, x1 <= box.x + box.w + 1e-6]).toEqual([true, true]);
      expect(y0).toBeCloseTo(box.y, 6);
      expect(y1).toBeCloseTo(box.y + box.h, 6);
    });

    it("should project every seat where the measured map draws it, within half a pixel", () => {
      for (const [seat, lonLat] of Object.entries(beat.mapSeats)) {
        const [px, py] = project(lonLat as number[]);
        const [mx, my] = whole.projected[seat];
        expect([seat, Math.abs(px - mx) <= 0.5 && Math.abs(py - my) <= 0.5]).toEqual([seat, true]);
      }
    });
  });

  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying the camera and every bound field", () => {
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) => mapStateAt(props, i * 15));
      expect([...validateScrollyPlan(plan, states), ...validateExpressions(plan)]).toEqual([]);
      for (const s of states) for (const f of MAP_FIELDS) expect([f, typeof s[f]]).toEqual([f, "number"]);
    });

    it("should fill every host and the origin from Countries beneath the water, and carry no key", () => {
      const fills = plan.layers.filter((l: any) => l.type === "fill");
      expect(fills.every((l: any) => l.beneath === "water" && l.sourceLayer === "administrative")).toBe(true);
      const codesOf = (layerId: string) => plan.layers.find((l: any) => l.id === layerId).filter[2][2];
      expect(codesOf("hosts").length).toBe(props.cells.filter((c: any) => !c.origin).length);
      expect(codesOf("origin")).toEqual(["UA"]);
      for (const l of plan.layers.filter((l: any) => l.bindings)) expect([l.id, Object.values(l.bindings).map((b) => JSON.stringify(b))]).toEqual([l.id, Object.keys(l.bindings).map(() => '{"$state":"fills"}')]);
      const text = JSON.stringify(plan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });

  describe(`${id}'s key column on the measured map`, () => {
    it("should cover no cell the measured map paints as a host", () => {
      const { legend } = props;
      const covered = [];
      for (let y = legend.at.y; y < legend.at.y + legend.height; y += whole.grid.cell)
        for (let x = legend.at.x; x < legend.at.x + legend.width; x += whole.grid.cell)
          if (nearestOf(cellAt(whole.grid, x, y), kinds) === props.colours.neutral) covered.push([x, y]);
      expect(covered).toEqual([]);
    });
  });

  describe(`${id}'s handover from the map to the cells`, () => {
    it("should draw the SVG shapes where the measured map fills each host", () => {
      const cell = whole.grid.cell;
      let checked = 0;
      for (const c of props.cells) {
        if (c.origin) continue;
        const rings = [...c.shape.matchAll(/M([^Z]+)Z/g)].map((m) => m[1].split("L").map((p) => p.split(" ").map(Number)));
        let inside3 = 0;
        const tally = new Map<string, number>();
        for (let j = 1; j < whole.grid.rows - 1; j++)
          for (let i = 1; i < whole.grid.cols - 1; i++) {
            const cx = (i + 0.5) * cell;
            const cy = (j + 0.5) * cell;
            if (![-1, 0, 1].every((dx) => [-1, 0, 1].every((dy) => rings.some((r) => insideRing(r, cx + dx * cell, cy + dy * cell))))) continue;
            inside3++;
            const got = nearestOf(cellAt(whole.grid, cx, cy), kinds);
            tally.set(got, (tally.get(got) ?? 0) + 1);
          }
        if (!inside3) continue;
        checked++;
        const most = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
        expect([c.code, most]).toEqual([c.code, props.colours.neutral]);
      }
      expect(checked).toBeGreaterThanOrEqual(8);
    });

    it("should raise the shapes only once the key is up, and take the fills away before anything moves", () => {
      const at = (p: number) => Math.ceil(T.reference.start + T.reference.duration * p);
      expect(WINDOWS.reference.furniture[1]).toBeLessThanOrEqual(HANDOVER[0]);
      expect(geographyAt(props, at(HANDOVER[0]) - 1)).toEqual({ shapesIn: 0, fills: 1 });
      const inFull = sceneAt(props, at((HANDOVER[0] + HANDOVER[1]) / 2) + 1);
      expect(inFull.shape).toBe(1);
      expect(inFull.mapFills).toBeLessThan(1);
      for (let f = T.reference.start; f < T.reference.start + T.reference.duration; f++) {
        const s = sceneAt(props, f);
        if (s.morph > 0) expect([f, s.mapFills]).toEqual([f, 0]);
      }
    });

    it("should land every country exactly on its hexagon", () => {
      const pts = (d: string) => d.slice(1, -1).split("L").map((p) => p.split(" ").map(Number));
      for (const c of props.cells) {
        const { sx, sy, x, y } = morphOf(c.box, c.cellBox, 1);
        const landed = pts(c.travelHex).map(([px, py]) => [x + (px - c.box.x) * sx, y + (py - c.box.y) * sy]);
        const cellPts = pts(c.d);
        const off = Math.max(...landed.map(([px, py]) => Math.min(...cellPts.map(([qx, qy]) => Math.hypot(px - qx, py - qy)))));
        expect([c.code, off <= 0.5]).toEqual([c.code, true]);
      }
    });

    it("should leave no basemap under the cells from the end of reference on", () => {
      expect(sceneAt(props, T.reference.start).basemapOut).toBe(0);
      for (const f of [T.reveal.start, T.total - 1]) {
        const s = sceneAt(props, f);
        expect([s.basemapOut, s.mapFills, s.cell]).toEqual([1, 0, 1]);
      }
    });
  });
}
