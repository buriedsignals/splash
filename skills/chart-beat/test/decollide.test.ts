/**
 * THE DE-COLLISION THE DOCTRINE REQUIRES, tested for the two things a hand-rolled one got wrong.
 *
 * `references/types/slope.md` requires vertical label de-collision for a many-category slope. Until
 * `decollide` landed, no skill offered one, and the first beat to need it wrote its own twice: a
 * version that inverted two regions' rank, and a delivered version that put a label and a value from
 * different rows on the same line. Neither is a layout defect — both are the chart printing things
 * the frozen source does not say. So the assertions here are about ORDER and about INDEXING, not
 * about how pretty the spacing is.
 */
import { describe, expect, it } from "bun:test";
import { decollide } from "../scripts/render-still.mjs";

const ys = (placed: { y: number }[]) => placed.map((one) => one.y);

describe("decollide", () => {
  it("leaves every label on its own mark when the band has room", () => {
    const placed = decollide([100, 200, 300], { minGap: 20, top: 0, bottom: 400 });
    expect(ys(placed)).toEqual([100, 200, 300]);
    expect(placed.map((one) => one.moved)).toEqual([false, false, false]);
  });

  it("returns rows in the caller's own order, never sorted by position", () => {
    const placed = decollide([300, 100, 200], { minGap: 20, top: 0, bottom: 400 });
    expect(ys(placed)).toEqual([300, 100, 200]);
  });

  it("opens the requested gap between two marks that land on top of each other", () => {
    const placed = decollide([200, 201], { minGap: 20, top: 0, bottom: 400 });
    expect(placed[1].y - placed[0].y).toBeCloseTo(20, 6);
    // Pooled onto the pair's own centre, not pushed downhill from the first one.
    expect((placed[0].y + placed[1].y) / 2).toBeCloseTo(200.5, 6);
    expect(placed.map((one) => one.moved)).toEqual([true, true]);
  });

  it("never lets a crowded label pass the one above it — the inversion that shipped 1104 over 1802", () => {
    // Thirteen anchors, eight of them inside 30px, in a band far too short for an honest gap:
    // exactly the shape that made the beat's own backward pull-up pass reorder two regions.
    const anchors = [
      416.6, 577.5, 711.7, 716.3, 719.5, 730.3, 737.0, 740.3, 775.8, 776.4, 784.1, 793.7, 796.3,
    ];
    const placed = decollide(anchors, { minGap: 38, top: 371, bottom: 832 });
    const order = anchors.map((_, at) => at).sort((a, b) => anchors[a] - anchors[b]);
    const down = [...placed.keys()].sort((a, b) => placed[a].y - placed[b].y);
    expect(down).toEqual(order);
    expect(placed[0].y).toBeGreaterThanOrEqual(371);
    expect(placed[12].y).toBeLessThanOrEqual(832);
  });

  it("falls back to the largest equal gap the band allows, rather than overflowing it", () => {
    const placed = decollide([10, 11, 12, 13, 14], { minGap: 50, top: 0, bottom: 100 });
    expect(ys(placed)).toEqual([0, 25, 50, 75, 100]);
  });

  it("keeps the whole stack inside the band by shifting it, not by reordering it", () => {
    const placed = decollide([390, 395, 399], { minGap: 20, top: 0, bottom: 400 });
    expect(placed[2].y).toBeLessThanOrEqual(400);
    expect(placed[0].y).toBeLessThan(placed[1].y);
    expect(placed[1].y).toBeLessThan(placed[2].y);
  });

  it("holds order and the band over a thousand random stacks", () => {
    let seed = 20260821;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let run = 0; run < 1000; run++) {
      const count = 2 + Math.floor(next() * 14);
      const anchors = Array.from({ length: count }, () => 100 + next() * 500);
      const placed = decollide(anchors, { minGap: 5 + next() * 60, top: 100, bottom: 600 });
      const order = anchors.map((_, at) => at).sort((a, b) => anchors[a] - anchors[b]);
      const down = [...placed.keys()].sort((a, b) => placed[a].y - placed[b].y);
      expect([run, down]).toEqual([run, order]);
      for (const one of placed) {
        expect([run, one.y >= 100 - 1e-9]).toEqual([run, true]);
        expect([run, one.y <= 600 + 1e-9]).toEqual([run, true]);
      }
    }
  });
});
