import { describe, expect, it } from "bun:test";
import { rowDim } from "../craft/scrolly/bullet/bullet-drive.mjs";

// gx-bullet scrolly (Qwen3.5-9B mvq153, 2026-11-19): card 5 speaks of « les trois pays déjà au-dessus de 95 % en
// 2015 », but its close-up stepped back only the rows that start under the zoom's floor (90 %), so France
// (92,2 → 94,9) stayed in full ink beside the three.
const c = { zoomFrom: 90, zoomMid: 95 };
const zoomed = { zoom: 1, half: 0 };

describe("the bullet scrolly's close-up", () => {
  it("should step back a row inside the zoom that is not one of the rows the card names", () => {
    expect(rowDim({ marker: 92.2, measure: 94.9 }, zoomed, c)).toBeLessThan(1);
  });

  it("should keep a row the card names in full ink", () => {
    expect(rowDim({ marker: 98.1, measure: 98.8 }, zoomed, c)).toBe(1);
  });
});
