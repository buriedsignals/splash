import { describe, expect, it } from "bun:test";
import { closeView, wholeView } from "../craft/_shared/gesture-geo-area-shapes.mjs";

// gx-hex-grid scrolly (Gemma 12B, mvg125, 2026-11-19): the card naming Germany's 14,8 per 1 000 sat over DEU's own
// cell, because the close-up centred the compared pair on the stage, and the prose card rests at 42–63 % of it.
// Same defect class as the contour scrolly's card 5 (mvg115).

const W = 900;
const H = 600;
const focus = { x: 400, y: 250, width: 160, height: 120 };

function seat() {
  const v = closeView({ box: focus, W, H });
  return { top: (focus.y - v.vy) / v.vh, bottom: (focus.y + focus.height - v.vy) / v.vh, zoom: W / v.vw };
}

describe("an area map scrolly's close-up", () => {
  it("should seat the focus below the prose card", () => {
    expect(seat().top).toBeGreaterThanOrEqual(0.64);
  });

  it("should keep the focus inside the frame", () => {
    expect(seat().bottom).toBeLessThanOrEqual(1);
  });

  it("should still close in on the focus", () => {
    expect(seat().zoom).toBeGreaterThan(1);
  });
});

// mvg125 again, at the whole-map camera: card 2 names DEU while the map stands whole, and DEU's cell rests at
// half height, under the card.
describe("an area map scrolly's whole view", () => {
  const deu = { x: 380, y: 250, width: 90, height: 90 };
  const clear = (v: { vx: number; vy: number; vw: number; vh: number }) =>
    (deu.y + deu.height - v.vy) / v.vh <= 0.4 || (deu.y - v.vy) / v.vh >= 0.65;

  it("should move a named place out from under the prose card", () => {
    expect(clear(wholeView({ box: deu, W, H }))).toBe(true);
  });

  it("should leave the map whole when the named place is clear of the card", () => {
    expect(wholeView({ box: { x: 40, y: 40, width: 90, height: 90 }, W, H })).toEqual({ vx: 0, vy: 0, vw: W, vh: H });
  });
});
