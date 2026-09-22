/**
 * A STILL IS GUARDED ON ITS WIDTH AND WAS NOT GUARDED ON ITS HEIGHT.
 *
 * Measured 2026-09-23, rendering a real story's static beat at landscape and at square for the
 * first time. Both had been drawn once, at portrait, and the component laid its block out from the
 * height it had then; at 1080 the source line's baseline landed at y = 1080 exactly, so the credit
 * was cut through the middle. Nothing refused it, and the render reported success.
 *
 * `assertWithinStage` covers this for PORTRAIT only — its row is the only one reserving a safe band
 * — and only for the beats that call it themselves. Thirty-odd catalogue beats do; a journalist's
 * new beat does not. So the one size a story had exercised was guarded and the two it had not
 * were not, which is the shape of every defect this end-to-end run has turned up.
 *
 * SWEPT BEFORE IT WAS WIRED IN: 118 delivered SVGs under `proof/`, 0 refused. The guard is new and
 * finds nothing already shipped, which is what it should do.
 */
import { describe, expect, it } from "bun:test";
import { assertWithinHeight } from "../scripts/render-still.mjs";

const page = (y: number, size = 40) =>
  `<svg width="1080" height="1080"><text x="40" y="${y}" font-size="${size}" font-weight="400">WHO Global Health Observatory</text></svg>`;

describe("words stay inside the frame", () => {
  it("refuses a baseline at the frame's own foot, which cuts the line through the middle", () => {
    expect(() => assertWithinHeight(page(1080), 1080, { what: "the still" })).toThrow(
      /outside its own 1080px frame/,
    );
  });

  it("names the line and the band it actually occupies", () => {
    expect(() => assertWithinHeight(page(1080), 1080, { what: "the still" })).toThrow(
      /"WHO Global Health Observatory" at 40px runs from 1050 to 1090/,
    );
  });

  it("refuses a line whose cap-height rises above the top edge", () => {
    expect(() => assertWithinHeight(page(20), 1080, { what: "the still" })).toThrow(/runs from -10/);
  });

  it("accepts a line that clears both edges by its own ink", () => {
    expect(() => assertWithinHeight(page(1060), 1080, { what: "the still" })).not.toThrow();
    expect(() => assertWithinHeight(page(40), 1080, { what: "the still" })).not.toThrow();
  });

  it("says out loud when a rotated run went unmeasured, rather than reporting green over it", () => {
    const rotated =
      `<svg width="1080" height="1080">` +
      `<text x="40" y="1080" font-size="40">cut</text>` +
      `<text x="40" y="900" font-size="40" transform="rotate(-90 40 900)">sideways</text></svg>`;
    expect(() => assertWithinHeight(rotated, 1080, { what: "the still" })).toThrow(
      /1 rotated or transformed run\(s\) were not measured/,
    );
  });
});
