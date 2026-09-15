import { describe, expect, it } from "bun:test";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import {
  bindState,
  mercatorOf,
  validateScrollyPlan,
  viewOf,
} from "#shared/map-beat/scrolly.mjs";
import {
  buildDirection,
  cellAt,
  countOf,
  loadBeat,
  near,
  RING_FAR,
  RING_NEAR,
} from "./build.mjs";
import { FOCUS_ISO2, projectorOf, REFERENCE } from "./map-plan.mjs";
import measured from "./measured.json";
import { MAP_FIELDS, mapStateAt } from "./scene.mjs";
import { EUROPE_WINDOW } from "./subject.mjs";

/**
 * The live map's plan — Ukraine's tint and regions from Countries, the station's ring closing with the travel, every name
 * on the map bound to its moment — its two cameras, and the overlay placed on the map as it was measured: read again here
 * on `measured.json`'s own grid, not through the build's placement.
 */

const beat = loadBeat();
const { subject } = beat;
/** The arithmetic MapLibre evaluates in a bound paint, for the operators this plan writes. */
const evaluate = (v: any): number => {
  if (typeof v === "number") return v;
  const [op, ...args] = v;
  const xs = args.map(evaluate);
  if (op === "+") return xs.reduce((a: number, b: number) => a + b, 0);
  if (op === "*") return xs.reduce((a: number, b: number) => a * b, 1);
  if (op === "-") return xs.length === 1 ? -xs[0] : xs[0] - xs[1];
  if (op === "min") return Math.min(...xs);
  throw new Error(`no evaluator for ${op}`);
};
const cornersOf = (w: {
  west: number;
  east: number;
  south: number;
  north: number;
}) => [
  [w.west, w.south],
  [w.west, w.north],
  [w.east, w.south],
  [w.east, w.north],
];
const holds = (camera: any, corners: number[][]) => {
  const project = projectorOf(camera, REFERENCE);
  return corners.filter((c) => {
    const [x, y] = project(c);
    return (
      x < -1e-6 ||
      x > REFERENCE.width + 1e-6 ||
      y < -1e-6 ||
      y > REFERENCE.height + 1e-6
    );
  });
};
const hit = (a: any, b: any) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

for (const id of ["creme", "nocturne", "rapport"]) {
  const built = buildDirection(id, beat) as any;
  const { props, names, waters, boxes } = built;
  const plan = props.mapPlan;
  const layer = (lid: string) => plan.layers.find((l: any) => l.id === lid);
  const { whole, closeUp } = (measured.cameras as any)[id];

  describe(`${id}'s cameras`, () => {
    it("should fit Europe's window meet in the stage at the whole-map camera, touching two of its edges", () => {
      expect(holds(props.cameras.whole, cornersOf(EUROPE_WINDOW))).toEqual([]);
      const [x0, y1] = projectorOf(
        props.cameras.whole,
        REFERENCE,
      )([EUROPE_WINDOW.west, EUROPE_WINDOW.south]);
      const [x1, y0] = projectorOf(
        props.cameras.whole,
        REFERENCE,
      )([EUROPE_WINDOW.east, EUROPE_WINDOW.north]);
      expect(
        Math.max((x1 - x0) / REFERENCE.width, (y1 - y0) / REFERENCE.height),
      ).toBeCloseTo(1, 9);
    });

    it("should centre the close-up on the station on both axes, the still's window inside the stage", () => {
      const [lon, lat] = viewOf(props.cameras.closeUp).center;
      expect([
        Math.abs(lon - subject.biggest.lon) < 1e-9,
        Math.abs(lat - subject.biggest.lat) < 1e-9,
      ]).toEqual([true, true]);
      expect(
        holds(props.cameras.closeUp, cornersOf(subject.closeWindow)),
      ).toEqual([]);
    });

    it("should travel in Web Mercator numbers, the centre and the zoom linear in the eased travel", () => {
      const f =
        props.timing.reveal.start +
        Math.round(props.timing.reveal.duration * 0.3);
      const s = mapStateAt(props, f);
      const t = s.zoom;
      expect(t > 0.1 && t < 0.9).toBe(true);
      for (const k of ["camX", "camY", "camZoom"])
        expect(s[k]).toBeCloseTo(
          props.cameras.whole[k] +
            (props.cameras.closeUp[k] - props.cameras.whole[k]) * t,
          12,
        );
    });

    it("should project every measured seat where MapLibre drew it, at both cameras, to a tenth of a pixel", () => {
      for (const [name, cam] of [
        ["whole", whole],
        ["closeUp", closeUp],
      ] as const)
        for (const [seat, lonLat] of Object.entries(beat.mapSeats)) {
          const [x, y] = projectorOf(
            props.cameras[name],
            REFERENCE,
          )(lonLat as number[]);
          const [mx, my] = cam.projected[seat];
          expect([name, seat, Math.hypot(x - mx, y - my) < 0.1]).toEqual([
            name,
            seat,
            true,
          ]);
        }
    });
  });

  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying the camera and every bound field", () => {
      const states = Array.from(
        { length: Math.ceil(props.timing.total / 15) },
        (_, i) => mapStateAt(props, i * 15),
      );
      expect([
        ...validateScrollyPlan(plan, states),
        ...validateExpressions(plan),
      ]).toEqual([]);
      for (const s of states)
        for (const f of MAP_FIELDS)
          expect([f, typeof (s as any)[f]]).toEqual([f, "number"]);
    });

    it("should tint Ukraine from Countries beneath the water, arriving with the reference", () => {
      const story = layer("story");
      expect([
        story.beneath,
        story.sourceLayer,
        story.filter,
        story.paint["fill-color"],
        story.bindings["fill-opacity"],
      ]).toEqual([
        "water",
        "administrative",
        [
          "all",
          ["==", ["get", "level"], 0],
          ["==", ["get", "iso_a2"], FOCUS_ISO2],
        ],
        props.colours.story,
        { $state: "country" },
      ]);
    });

    it("should draw Ukraine's regions (level 1) thinner and paler than a national border, bound to the close-up's arrival", () => {
      const regions = layer("regions");
      const borders = layer("borders");
      expect(regions.filter).toEqual([
        "all",
        ["==", ["get", "level"], 1],
        ["==", ["get", "iso_a2"], FOCUS_ISO2],
      ]);
      expect(regions.bindings["line-opacity"]).toEqual({ $state: "regions" });
      expect(regions.paint["line-width"]).toBeLessThan(
        borders.paint["line-width"],
      );
      expect(
        contrast(regions.paint["line-color"], props.colours.story),
      ).toBeGreaterThanOrEqual(1.6 - 0.01);
      expect(plan.layers.indexOf(regions)).toBeLessThan(
        plan.layers.indexOf(borders),
      );
    });

    it("should close the station's ring from its continental radius onto the station as the camera travels", () => {
      const ring = layer("station-ring");
      const radiusAt = (zoom: number) =>
        evaluate(bindState(ring.bindings["circle-radius"], { zoom }));
      const half = ring.paint["circle-stroke-width"] / 2;
      expect([radiusAt(0) + half, radiusAt(1) + half]).toEqual([
        RING_FAR,
        RING_NEAR,
      ]);
      expect(ring.bindings["circle-stroke-opacity"]).toEqual({
        $state: "country",
      });
    });

    it("should show « UKRAINE » on the continent only, gone before the camera is a third of the way", () => {
      const name = layer("overview-name");
      const at = (country: number, zoom: number) =>
        evaluate(bindState(name.bindings["text-opacity"], { country, zoom }));
      expect([at(1, 0), at(1, 0.34), at(0, 0)]).toEqual([1, 0, 0]);
      expect(name.data.features[0].properties.text).toBe(
        built.overviewName.text,
      );
    });

    it("should set every word on the map at 30 px or more, the close-up's places bound to their moment", () => {
      const words = plan.layers.filter((l: any) => l.type === "symbol");
      expect(words.length).toBe(1 + names.length + waters.length);
      for (const l of words)
        expect([l.id, l.layout["text-size"] >= 30]).toEqual([l.id, true]);
      for (const n of [...names, ...waters])
        expect([
          n.key,
          layer(`name-${n.key}`).bindings["text-opacity"],
        ]).toEqual([n.key, { $state: "names" }]);
      expect(layer("place-dots").data.features.length).toBe(
        subject.places.length,
      );
    });

    it("should hug every settlement's name to its dot, and keep every name off every dot, the ring, the station's block and each other", () => {
      const project = projectorOf(props.cameras.closeUp, REFERENCE);
      for (const n of names.filter((x: any) => x.kind === "settlement")) {
        const place = subject.places.find(
          (p: any) => `place:${p.name}` === n.key,
        );
        const [sx, sy] = project([place.lon, place.lat]);
        const reach = Math.hypot(
          Math.max(n.box.x - sx, 0, sx - n.box.x - n.box.width),
          Math.max(n.box.y - sy, 0, sy - n.box.y - n.box.height),
        );
        expect([n.key, reach <= n.box.height]).toEqual([n.key, true]);
      }
      const all = [...names, ...waters];
      for (const n of all)
        expect([
          n.key,
          [...boxes.dots, boxes.ring, boxes.station].some((b: any) =>
            hit(n.box, b),
          ),
          all.some((o: any) => o !== n && hit(n.box, o.box)),
        ]).toEqual([n.key, false, false]);
    });

    it("should paint the basemap in the direction's water and land tints, and carry no key", () => {
      expect(plan.tints).toEqual({
        water: props.colours.sea,
        land: props.colours.land,
      });
      const text = JSON.stringify(plan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });

  describe(`${id}'s overlay on the measured close-up`, () => {
    const { grid, projected } = closeUp;
    const sea = cellAt(grid, ...(projected.sea as [number, number]));

    it("should have measured the sea in the direction's water tint and Ukraine in its own", () => {
      const [sx, sy] = projectorOf(
        props.cameras.closeUp,
        REFERENCE,
      )([subject.biggest.lon + 1.5, subject.biggest.lat + 1.5]);
      expect([
        near(sea, props.colours.sea),
        near(cellAt(grid, sx, sy), props.colours.story),
      ]).toEqual([true, true]);
    });

    it("should set the credit on one line with the map's attribution, over open sea only, clear of every word", () => {
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
      expect(countOf(grid, (c: string) => !near(c, sea))(box).count).toBe(0);
      expect(
        [...names, ...waters]
          .filter((n: any) => hit(box, n.box))
          .map((n: any) => n.key),
      ).toEqual([]);
    });

    it("should stand Ukraine's name on the measured Ukraine, and no neighbour's name over it but by its ends", () => {
      const isStory = (c: string) => nearest(c) === props.colours.story;
      const storyIn = countOf(grid, isStory);
      for (const n of names.filter((x: any) => x.kind === "area"))
        if (n.key === "area:UKR")
          expect(
            isStory(
              cellAt(
                grid,
                n.box.x + n.box.width / 2,
                n.box.y + n.box.height / 2,
              ),
            ),
          ).toBe(true);
        // A neighbour narrower than its name (Moldova) may overhang by the ends: its middle half covers none of Ukraine.
        else
          expect([
            n.key,
            storyIn({
              ...n.box,
              x: n.box.x + n.box.width / 4,
              width: n.box.width / 2,
            }).count,
          ]).toEqual([n.key, 0]);
    });

    const nearest = (cell: string) => {
      const d = (c: string) =>
        [1, 3, 5].reduce(
          (s, k) =>
            s +
            (Number.parseInt(c.slice(k, k + 2), 16) -
              Number.parseInt(cell.slice(k, k + 2), 16)) **
              2,
          0,
        );
      return [
        props.colours.sea,
        props.colours.land,
        props.colours.story,
      ].reduce((a, b) => (d(b) < d(a) ? b : a));
    };

    it("should halo every name in the colour measured under it", () => {
      const tints = [
        props.colours.sea,
        props.colours.land,
        props.colours.story,
      ];
      for (const n of [...names, ...waters]) {
        const cell = cellAt(
          grid,
          n.box.x + n.box.width / 2,
          n.box.y + n.box.height / 2,
        );
        const d = (c: string) =>
          [1, 3, 5].reduce(
            (s, k) =>
              s +
              (Number.parseInt(c.slice(k, k + 2), 16) -
                Number.parseInt(cell.slice(k, k + 2), 16)) **
                2,
            0,
          );
        expect([n.key, n.haloColour]).toEqual([
          n.key,
          tints.reduce((a, b) => (d(b) < d(a) ? b : a)),
        ]);
      }
    });
  });
}

describe("the camera's Mercator plane", () => {
  it("should put the station inside Europe's window", () => {
    const [x, y] = mercatorOf([subject.biggest.lon, subject.biggest.lat]);
    const [x0, y1] = mercatorOf([EUROPE_WINDOW.west, EUROPE_WINDOW.south]);
    const [x1, y0] = mercatorOf([EUROPE_WINDOW.east, EUROPE_WINDOW.north]);
    expect([x > x0 && x < x1, y > y0 && y < y1]).toEqual([true, true]);
  });
});
