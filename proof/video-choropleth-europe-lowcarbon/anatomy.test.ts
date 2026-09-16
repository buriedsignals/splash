import { describe, expect, it } from "bun:test";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { endOf } from "#shared/chart-video/timing.ts";
import {
  buildDirection,
  LED_REACH,
  loadBeat,
  PANEL_LAND,
  subjectRadiusPx,
  unmeasuredNeighboursOf,
} from "./build.mjs";
import measured from "./measured.json";
import { mapStateAt } from "./scene.mjs";

/**
 * THE OVERLAY ON THE MEASURED MAP — read again here on `measured.json`'s own grids, not through `build.mjs`'s helpers:
 * every label readable on every cell it inks, over its measured seat or led to it, the panel and the credit on the sea
 * the map was measured to paint, and the measurement itself taken on the frames those words are seen at, on the plan
 * that is drawn.
 */

const beat = loadBeat();
const IDS = ["creme", "nocturne", "rapport"] as const;
type Box = { x: number; y: number; width: number; height: number };
type Picture = "whole" | "wholeFiltered" | "closeUp";

const gridOf = (id: string, picture: Picture) =>
  (measured.cameras as any)[id][picture].grid;
/** Every measured colour a box covers, clamped to the grid. */
const cellsUnder = (id: string, picture: Picture, box: Box) => {
  const m = gridOf(id, picture);
  const out = new Set<string>();
  for (
    let j = Math.max(0, Math.floor(box.y / m.cell));
    j <= Math.min(m.rows - 1, Math.floor((box.y + box.height) / m.cell));
    j++
  )
    for (
      let i = Math.max(0, Math.floor(box.x / m.cell));
      i <= Math.min(m.cols - 1, Math.floor((box.x + box.width) / m.cell));
      i++
    )
      out.add(m.colours[j * m.cols + i]);
  return [...out];
};
const cellAt = (id: string, picture: Picture, x: number, y: number) => {
  const m = gridOf(id, picture);
  return m.colours[Math.floor(y / m.cell) * m.cols + Math.floor(x / m.cell)];
};
const rgb = (c: string) =>
  [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
const sameCell = (a: string, b: string) =>
  rgb(a).every((v, i) => Math.abs(v - rgb(b)[i]) <= 3);
const seatOf = (id: string, picture: Picture, key: string) => {
  const [x, y] = (measured.cameras as any)[id][picture].projected[key];
  return { x, y };
};
const offSeat = (box: Box, p: { x: number; y: number }) =>
  Math.hypot(
    Math.max(box.x - p.x, 0, p.x - box.x - box.width),
    Math.max(box.y - p.y, 0, p.y - box.y - box.height),
  );
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

for (const id of IDS) {
  const { props, layout } = buildDirection(id, beat);
  const { stage } = props;
  const pictureOf = (n: any): Picture =>
    n.camera === "closeUp" ? "closeUp" : "whole";
  const boxOf = (n: any): Box => ({
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
  });
  const atlantic = () =>
    cellAt(
      id,
      "whole",
      ...(Object.values(seatOf(id, "whole", "atlantic")) as [number, number]),
    );
  const ring = props.mapPlan.layers.find((l: any) => l.id === "odd-ring").paint;
  const ringPx = (zoom: number) =>
    ring["circle-radius"][4] * 2 ** zoom + ring["circle-stroke-width"];

  describe(`${id}'s overlay on the measured map`, () => {
    it("should set every label in capitals, Albania's in the feature weight and the rest in the area weight", () => {
      for (const n of props.names) {
        expect([n.key, n.text]).toEqual([n.key, n.text.toUpperCase()]);
        expect([n.key, props.registers[n.register].fontWeight]).toEqual([
          n.key,
          n.role === "odd" ? 700 : props.registers.area.fontWeight,
        ]);
      }
    });

    it("should set every label but Albania's in an ink that reads at 4.5:1 on every cell its text and its gauge cover", () => {
      for (const n of props.names.filter((x: any) => x.role !== "odd")) {
        const rects = [
          {
            x: n.x + n.textX,
            y: n.y + n.textX,
            width: n.textWidth,
            height:
              n.baseline +
              (n.gauge
                ? n.gauge.y - 0.3 * props.registers.axis.lead - n.baseline
                : n.height - n.baseline - n.textX) -
              n.textX,
          },
        ];
        if (n.gauge)
          rects.push({
            x: n.x + n.gauge.x,
            y: n.y + n.gauge.y,
            width: n.gauge.width,
            height: n.gauge.height,
          });
        for (const c of rects.flatMap((r) => cellsUnder(id, pictureOf(n), r)))
          expect([n.key, c, contrast(n.ink, c) >= 4.5]).toEqual([
            n.key,
            c,
            true,
          ]);
      }
    });

    it("should set Albania's names at 7:1 on their halo, struck in the colour measured under the word's centre", () => {
      for (const n of props.names.filter((x: any) => x.role === "odd")) {
        expect([n.key, n.haloColour]).toEqual([
          n.key,
          cellAt(id, pictureOf(n), n.x + n.width / 2, n.y + n.height / 2),
        ]);
        expect([n.key, contrast(n.ink, n.haloColour) >= 7]).toEqual([
          n.key,
          true,
        ]);
      }
    });

    it("should seat every close-up label over its measured seat, or led to it from the seat within three of its heights, off Albania's seat, inside the frame", () => {
      const albania = seatOf(id, "closeUp", "ALB");
      const r = subjectRadiusPx(
        beat.subjectRadius,
        beat.mapSeats.ALB[1],
        props.cameras.closeUp.camZoom,
      );
      const core = {
        x: albania.x - r,
        y: albania.y - r,
        width: 2 * r,
        height: 2 * r,
      };
      for (const n of props.names.filter((x: any) => x.camera === "closeUp")) {
        const box = boxOf(n);
        const seat = seatOf(id, "closeUp", n.key.split(":").slice(1).join(":"));
        expect([
          n.key,
          box.x >= 0,
          box.y >= 0,
          box.x + box.width <= stage.width,
          box.y + box.height <= stage.height,
        ]).toEqual([n.key, true, true, true, true]);
        if (n.role === "odd") {
          expect([
            n.key,
            Math.abs(box.x + box.width / 2 - seat.x) < 1,
            Math.abs(box.y + box.height / 2 - seat.y) < 1,
          ]).toEqual([n.key, true, true]);
          continue;
        }
        expect([n.key, overlaps(box, core)]).toEqual([n.key, false]);
        const off = offSeat(box, seat);
        if (off === 0) expect([n.key, n.leader]).toEqual([n.key, null]);
        else
          expect([n.key, off <= LED_REACH * n.height, n.leader?.from]).toEqual([
            n.key,
            true,
            seat,
          ]);
      }
    });

    it("should set Albania's whole-map name beside its ring, clear of the ring, within one of its heights of it", () => {
      const n = props.names.find((x: any) => x.key === "odd:ALB");
      const seat = seatOf(id, "whole", "ALB");
      const ringR = ringPx(props.cameras.whole.camZoom);
      const off = offSeat(boxOf(n), seat);
      expect([off > ringR, off <= ringR + n.height]).toEqual([true, true]);
    });

    it("should measure the Atlantic seat on the plan's own sea", () => {
      expect(atlantic()).toBe(props.mapPlan.tints.water);
      expect(props.colours.sea).toBe(atlantic());
    });

    it("should set the credit on one line, inside the margins, clear of the panel and of Albania's name, over the sea", () => {
      const src = props.source;
      const box = {
        x: src.at.x,
        y: src.at.y,
        width: src.width,
        height: src.height,
      };
      expect(src.lines.length).toBe(1);
      // MapTiler's attribution, required on every map drawn from its tiles.
      expect(src.lines[0].text).toContain("© MapTiler © OpenStreetMap");
      expect([
        box.x >= layout.inset,
        box.y >= layout.vInset,
        box.x + box.width <= stage.width - layout.inset,
        box.y + box.height <= stage.height - layout.vInset,
      ]).toEqual([true, true, true, true]);
      const panel = {
        ...props.panel.at,
        width: props.panel.width,
        height: props.panel.height,
      };
      expect(overlaps(box, panel)).toBe(false);
      expect(
        overlaps(box, boxOf(props.names.find((x: any) => x.key === "odd:ALB"))),
      ).toBe(false);
      for (const c of cellsUnder(id, "whole", box))
        expect([c, sameCell(c, atlantic())]).toEqual([c, true]);
      expect(
        contrast(props.colours.text.source, atlantic()),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("should seat the panel over at most 3 % land and none of the seven's, at the end of reveal and on the final map", () => {
      const panel = {
        ...props.panel.at,
        width: props.panel.width,
        height: props.panel.height,
      };
      const top = props.colours.classFills.at(-1);
      const distance = (a: string, b: string) =>
        Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
      for (const picture of ["whole", "wholeFiltered"] as const) {
        const m = gridOf(id, picture);
        const cells: string[] = [];
        for (
          let j = Math.floor(panel.y / m.cell);
          j <= Math.floor((panel.y + panel.height) / m.cell);
          j++
        )
          for (
            let i = Math.floor(panel.x / m.cell);
            i <= Math.floor((panel.x + panel.width) / m.cell);
            i++
          )
            cells.push(m.colours[j * m.cols + i]);
        const land =
          cells.filter((c) => !sameCell(c, atlantic())).length / cells.length;
        expect([picture, land <= PANEL_LAND]).toEqual([picture, true]);
        expect([
          picture,
          cells.filter((c) => distance(c, top) < distance(c, atlantic())),
        ]).toEqual([picture, []]);
      }
      for (const ink of [props.colours.text.counter, props.colours.text.key])
        expect(contrast(ink, atlantic())).toBeGreaterThanOrEqual(4.5);
    });

    it("should draw the key in the map's own class fills", () => {
      const fills = props.mapPlan.layers
        .filter((l: any) => /^class-\d+(-kept)?$/.test(l.id))
        .map((l: any) => [Number(l.id.split("-")[1]), l.paint["fill-color"]]);
      for (const [klass, fill] of fills)
        expect([klass, props.colours.classFills[klass]]).toEqual([klass, fill]);
      expect(props.colours.missingFill).toBe(
        props.mapPlan.layers.find((l: any) => l.id === "missing").paint[
          "fill-color"
        ],
      );
    });

    it("should write no sentence on the map — no callout, no standfirst", () => {
      expect((props as any).callout).toBeUndefined();
      expect((props.titleCard as any).standfirst).toBeUndefined();
      for (const n of props.names)
        expect([n.key, n.text.split(/\s+/).length <= 6]).toEqual([n.key, true]);
    });

    it("should refuse a plan that changed since it was measured", () => {
      const stale = {
        ...measured,
        planDigest: { ...measured.planDigest, [id]: "stale" },
      };
      expect(() => buildDirection(id, beat, { measured: stale })).toThrow(
        /the plan changed since it was measured — run measure.mjs again/,
      );
    });
  });
}

describe("the measurement", () => {
  const T = buildDirection("creme", beat).props.timing;
  const { props } = buildDirection("creme", beat);

  it("should have been taken on the frames its words are seen at: the final map, the end of reveal, the settled close-up", () => {
    expect(measured.states).toEqual({
      whole: mapStateAt(props, T.total - 1),
      wholeFiltered: mapStateAt(props, endOf(T.reveal) - 1),
      closeUp: mapStateAt(props, endOf(T.subject) - 1),
    });
  });

  it("should carry every tile loaded, every seat projected, and no key", () => {
    for (const id of IDS)
      for (const picture of ["whole", "wholeFiltered", "closeUp"] as const) {
        const m = (measured.cameras as any)[id][picture];
        expect([id, picture, m.tilesLoaded]).toEqual([id, picture, true]);
        expect(Object.keys(m.projected).sort()).toEqual(
          Object.keys(beat.mapSeats).sort(),
        );
      }
    expect(JSON.stringify(measured)).not.toContain("key=");
  });

  it("should find Kosovo as Albania's one ring-neighbour with no row in the data, and seat it inside Kosovo", () => {
    expect(unmeasuredNeighboursOf(beat.subject, "ALB")).toEqual([
      { key: "-99:Kosovo", name: "Kosovo" },
    ]);
    const kosovo = beat.subject.geo.features.find(
      (f: any) => f.properties.name === "Kosovo",
    );
    const [x, y] = beat.mapSeats["-99:Kosovo"];
    const inside = kosovo.geometry.coordinates.some((poly: number[][][]) => {
      const ring = poly[0];
      let hit = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
        if (
          ring[i][1] > y !== ring[j][1] > y &&
          x <
            ((ring[j][0] - ring[i][0]) * (y - ring[i][1])) /
              (ring[j][1] - ring[i][1]) +
              ring[i][0]
        )
          hit = !hit;
      return hit;
    });
    expect(inside).toBe(true);
  });
});
