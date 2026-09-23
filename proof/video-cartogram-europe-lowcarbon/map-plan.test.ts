import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import {
  buildDirection,
  cellAt,
  insideRing,
  loadBeat,
  nearestOf,
} from "./build.mjs";
import { MAP_FIELDS, projectorOf } from "./map-plan.mjs";
import measuredAtEverySize from "./measured.json";

// `measured.json` is keyed by export size. This file measures the plan `build.mjs` builds with no `--size`,
// which is landscape, so it reads the landscape entry — naming it rather than taking whatever is first.
const measured = (measuredAtEverySize as any).landscape;
import {
  geographyAt,
  HANDOVER,
  mapStateAt,
  sceneAt,
  WINDOWS,
} from "./scene.mjs";
import { cartogramGeometry, WINDOW } from "./subject.mjs";

/**
 * The live map's plan — the classes, the hollow country and the borders from Countries, the widest named — its one
 * camera, and the handover to the SVG shapes, read again here on `measured.json`'s own grid, not through the build.
 */

const beat = loadBeat();
const { subject } = beat;

for (const id of ["creme", "nocturne", "rapport"]) {
  const built = buildDirection(id, beat) as any;
  const { props } = built;
  const plan = props.mapPlan;
  const T = props.timing;
  const { whole } = (measured.cameras as any)[id];
  const project = projectorOf(props.camera, props.stage);

  describe(`${id}'s camera`, () => {
    it("should hold the window meet in the content box, touching its top and bottom", () => {
      const [west, south, east, north] = WINDOW;
      const { x, y } = props.layoutInset;
      const [x0, y1] = project([west, south]);
      const [x1, y0] = project([east, north]);
      expect([x0 >= x - 1e-6, x1 <= props.frame.width - x + 1e-6]).toEqual([
        true,
        true,
      ]);
      expect(y0).toBeCloseTo(y, 6);
      expect(y1).toBeCloseTo(props.frame.height - y, 6);
    });

    it("should project every seat where the measured map draws it, within half a pixel", () => {
      for (const [seat, lonLat] of Object.entries(beat.mapSeats)) {
        const [px, py] = project(lonLat as number[]);
        const [mx, my] = whole.projected[seat];
        expect([
          seat,
          Math.abs(px - mx) <= 0.5 && Math.abs(py - my) <= 0.5,
        ]).toEqual([seat, true]);
      }
    });
  });

  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying the camera and every bound field", () => {
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) =>
        mapStateAt(props, i * 15),
      );
      expect([
        ...validateScrollyPlan(plan, states),
        ...validateExpressions(plan),
      ]).toEqual([]);
      for (const s of states)
        for (const f of MAP_FIELDS)
          expect([f, typeof s[f]]).toEqual([f, "number"]);
    });

    it("should fill every class from Countries beneath the water, the widest in a layer of its own the focus does not step back", () => {
      const fills = plan.layers.filter((l: any) => l.type === "fill");
      expect(
        fills.every(
          (l: any) =>
            l.beneath === "water" && l.sourceLayer === "administrative",
        ),
      ).toBe(true);
      const widest = plan.layers.filter((l: any) => l.id.endsWith("-widest"));
      expect(widest.length).toBe(2);
      for (const l of widest)
        expect(JSON.stringify(l.bindings["fill-opacity"])).not.toContain(
          '"$state":"others"',
        );
      for (const l of fills.filter((l: any) => /^class-\d$/.test(l.id)))
        expect(JSON.stringify(l.bindings["fill-opacity"])).toContain(
          '"$state":"others"',
        );
    });

    it("should name the widest country as a map word at 30 px or more, and carry no key", () => {
      const symbols = plan.layers.filter((l: any) => l.type === "symbol");
      expect(
        symbols.map((l: any) => [l.id, l.layout["text-size"] >= 30]),
      ).toEqual([["widest-name", true]]);
      const text = JSON.stringify(plan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });

    it("should seat the widest country's name on its own fill on the measured map", () => {
      const b = built.nameBox;
      const colours = [
        props.colours.sea,
        props.colours.land,
        props.colours.neutral,
        ...props.colours.classFills,
      ];
      const widest = props.countries.find((c: any) => c.iso === props.widest);
      for (const t of [0.25, 0.5, 0.75])
        expect(
          nearestOf(
            cellAt(whole.grid, b.x + b.width * t, b.y + b.height / 2),
            colours,
          ),
        ).toBe(props.colours.classFills[widest.classIndex]);
    });
  });

  describe(`${id}'s key on the measured map`, () => {
    it("should cover no cell the measured map paints as a studied country", () => {
      const { legend, colours: c } = props;
      const kinds = [c.sea, c.land, c.neutral, ...c.classFills];
      const covered = [];
      for (
        let y = legend.at.y;
        y < legend.at.y + legend.height;
        y += whole.grid.cell
      )
        for (
          let x = legend.at.x;
          x < legend.at.x + legend.width;
          x += whole.grid.cell
        ) {
          const kind = nearestOf(cellAt(whole.grid, x, y), kinds);
          if (kind !== c.sea && kind !== c.land) covered.push([x, y]);
        }
      expect(covered).toEqual([]);
    });
  });

  describe(`${id}'s handover from the map to the shapes`, () => {
    it("should draw the SVG shapes where the measured map fills each country, in its class", () => {
      const { countries } = cartogramGeometry(subject, {
        project,
        tileBox: { x: 0, y: 0, w: 100, h: 100 },
        stage: props.stage,
        margin: 200,
      });
      const cell = whole.grid.cell;
      const colours = [
        props.colours.sea,
        props.colours.land,
        props.colours.neutral,
        props.colours.ground,
        ...props.colours.classFills,
      ];
      let checked = 0;
      for (const c of countries) {
        const drawn = props.countries.find((d: any) => d.iso === c.iso);
        if (drawn.classIndex === null) continue;
        const inside = (x: number, y: number) =>
          c.rings.some((r: number[][]) => insideRing(r, x, y));
        // Every cell whose 3 × 3 neighbourhood of cells lies inside the projected shape. The basemap's lakes are drawn over
        // the fills (Ladoga, the Finnish lakes), so the class must be the colour most of them are nearest, not every one's.
        let inside3 = 0;
        const tally = new Map<string, number>();
        for (let j = 1; j < whole.grid.rows - 1; j++)
          for (let i = 1; i < whole.grid.cols - 1; i++) {
            const cx = (i + 0.5) * cell;
            const cy = (j + 0.5) * cell;
            if (
              ![-1, 0, 1].every((dx) =>
                [-1, 0, 1].every((dy) =>
                  inside(cx + dx * cell, cy + dy * cell),
                ),
              )
            )
              continue;
            inside3++;
            const got = nearestOf(cellAt(whole.grid, cx, cy), colours);
            tally.set(got, (tally.get(got) ?? 0) + 1);
          }
        if (!inside3) continue;
        checked++;
        const most = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
        expect([c.iso, most]).toEqual([
          c.iso,
          props.colours.classFills[drawn.classIndex],
        ]);
      }
      expect(checked).toBeGreaterThanOrEqual(12);
    });

    it("should raise the shapes only once the others are back and the name gone, and take the fills away before anything moves", () => {
      const at = (p: number) =>
        Math.ceil(T.subject.start + T.subject.duration * p);
      const rising = geographyAt(props, at(HANDOVER[0]) + 1);
      expect([rising.others, rising.widest]).toEqual([1, 0]);
      const inFull = sceneAt(props, at((HANDOVER[0] + HANDOVER[1]) / 2) + 1);
      expect(inFull.shapesIn).toBe(1);
      expect(inFull.fills).toBeLessThan(1);
      // Nothing moves while a fill is still on the map.
      for (
        let f = T.subject.start;
        f < T.subject.start + T.subject.duration;
        f++
      ) {
        const s = sceneAt(props, f);
        if (s.morph > 0) expect([f, s.fills]).toEqual([f, 0]);
      }
      expect(WINDOWS.subject.morph[0]).toBeGreaterThanOrEqual(HANDOVER[1]);
    });

    it("should leave no basemap under the tiles the video ends on", () => {
      const last = sceneAt(props, T.total - 1);
      expect([last.basemapOut, last.fills, last.shapesIn]).toEqual([1, 0, 1]);
      expect(sceneAt(props, T.subject.start).basemapOut).toBe(0);
    });
  });
}
