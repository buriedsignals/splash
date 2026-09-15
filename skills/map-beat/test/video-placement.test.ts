import { describe, expect, it } from "bun:test";
import { mercatorOf } from "#shared/map-beat/scrolly.mjs";
import {
  cellAt,
  cellsUnder,
  fitBoundsMeet,
  nearColour,
  offSeat,
  seatOnSea,
  shareUnder,
  touches,
} from "../scripts/video-placement.mjs";

const SEA = "#cedde1";
const LAND = "#f4f1e3";

/** A measured grid (measureLiveMap's shape): 10 × 6 cells of 10 px, sea except where `land` says. */
function gridOf(land: (i: number, j: number) => boolean) {
  const cols = 10;
  const rows = 6;
  const colours: string[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) colours.push(land(i, j) ? LAND : SEA);
  return { cell: 10, cols, rows, colours };
}

describe("cellAt", () => {
  it("should read the cell a point falls in", () => {
    expect(
      cellAt(
        gridOf((i, j) => i === 3 && j === 2),
        35,
        25,
      ),
    ).toBe(LAND);
  });

  it("should clamp a point outside the grid to its edge cell", () => {
    expect(
      cellAt(
        gridOf((i) => i === 9),
        500,
        -20,
      ),
    ).toBe(LAND);
  });
});

describe("nearColour", () => {
  it("should hold two colours within the tolerance on every channel as one", () => {
    expect(nearColour("#f4f1e3", "#f3f0e2")).toBe(true);
  });

  it("should tell two colours apart past the tolerance on one channel", () => {
    expect(nearColour("#f4f1e3", "#f4f1d0")).toBe(false);
  });
});

describe("touches and offSeat", () => {
  it("should find two boxes touching once the air between them is counted", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 14, y: 0, width: 10, height: 10 };
    expect([touches(a, b, 0), touches(a, b, 5)]).toEqual([false, true]);
  });

  it("should put a point inside a box at no distance, and one beside it at its gap", () => {
    const box = { x: 10, y: 10, width: 20, height: 10 };
    expect([
      offSeat(box, { x: 15, y: 15 }),
      offSeat(box, { x: 40, y: 15 }),
    ]).toEqual([0, 10]);
  });
});

describe("cellsUnder and shareUnder", () => {
  it("should list every cell a box covers", () => {
    expect(
      cellsUnder(
        gridOf(() => false),
        { x: 5, y: 5, width: 20, height: 10 },
      ).length,
    ).toBe(6);
  });

  it("should measure the share of a box's cells a predicate holds for", () => {
    const grid = gridOf((i) => i === 0);
    expect(
      shareUnder(
        grid,
        { x: 0, y: 0, width: 19, height: 9 },
        (c: string) => c === LAND,
      ),
    ).toBe(0.5);
  });
});

describe("seatOnSea", () => {
  const within = { x: 0, y: 0, width: 100, height: 60 };

  it("should seat a box on the lowest row of open sea", () => {
    const grid = gridOf((i, j) => j === 5);
    const seat = seatOnSea({
      grids: [grid],
      sea: SEA,
      sizes: [{ width: 30, height: 8 }],
      within,
      step: { x: 10, y: 1 },
    });
    expect(seat?.index).toBe(0);
    expect(seat!.box.y + seat!.box.height).toBeLessThan(50);
    expect(shareUnder(grid, seat!.box, (c: string) => c !== SEA)).toBe(0);
  });

  it("should fall back to the next size when the first finds no open sea", () => {
    const grid = gridOf((i) => i >= 5);
    const seat = seatOnSea({
      grids: [grid],
      sea: SEA,
      sizes: [
        { width: 70, height: 8 },
        { width: 40, height: 8 },
      ],
      within,
      step: { x: 10, y: 10 },
    });
    expect(seat?.index).toBe(1);
  });

  it("should keep the box clear of every box it must avoid", () => {
    const avoid = [{ x: 0, y: 40, width: 100, height: 20 }];
    const seat = seatOnSea({
      grids: [gridOf(() => false)],
      sea: SEA,
      sizes: [{ width: 30, height: 8 }],
      within,
      step: { x: 10, y: 1 },
      avoid,
      air: 4,
    });
    expect(touches(seat!.box, avoid[0], 4)).toBe(false);
  });

  it("should hold the box to open sea on every grid it is seen over", () => {
    const whole = gridOf(() => false);
    const other = gridOf((i, j) => j >= 3);
    const seat = seatOnSea({
      grids: [whole, other],
      sea: SEA,
      sizes: [{ width: 30, height: 8 }],
      within,
      step: { x: 10, y: 1 },
    });
    expect(seat!.box.y + seat!.box.height).toBeLessThan(30);
  });

  it("should return null when no size finds open sea", () => {
    expect(
      seatOnSea({
        grids: [gridOf(() => true)],
        sea: SEA,
        sizes: [{ width: 30, height: 8 }],
        within,
      }),
    ).toBeNull();
  });
});

describe("fitBoundsMeet", () => {
  const stage = { width: 1920, height: 1080 };
  const screenOf = (camera: any, lonLat: [number, number]) => {
    const [x, y] = mercatorOf(lonLat);
    const px = 512 * 2 ** camera.camZoom;
    return [
      stage.width / 2 + (x - camera.camX) * px,
      stage.height / 2 + (y - camera.camY) * px,
    ];
  };

  it("should fit the bounds inside the stage, filling it on the tighter axis by the share asked", () => {
    const bounds: [[number, number], [number, number]] = [
      [-11, 34.5],
      [34, 70.5],
    ];
    const camera = fitBoundsMeet({ bounds, stage, fit: 0.9 });
    const [x0, y1] = screenOf(camera, bounds[0]);
    const [x1, y0] = screenOf(camera, bounds[1]);
    expect([x0 >= 0, x1 <= stage.width, y0 >= 0, y1 <= stage.height]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(
      Math.max((x1 - x0) / stage.width, (y1 - y0) / stage.height),
    ).toBeCloseTo(0.9, 6);
  });

  it("should centre the bounds on the stage in the map's own plane", () => {
    const bounds: [[number, number], [number, number]] = [
      [5, 45],
      [11, 48],
    ];
    const camera = fitBoundsMeet({ bounds, stage });
    const [x0, y1] = screenOf(camera, bounds[0]);
    const [x1, y0] = screenOf(camera, bounds[1]);
    expect([(x0 + x1) / 2, (y0 + y1) / 2].map((v) => Math.round(v))).toEqual([
      960, 540,
    ]);
  });

  it("should refuse bounds whose west is not west of their east", () => {
    expect(() =>
      fitBoundsMeet({
        bounds: [
          [170, 0],
          [-170, 10],
        ],
        stage,
      }),
    ).toThrow("west");
  });
});
