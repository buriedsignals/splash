// Tests for `assets/embed-exit.mjs` — the emitter that asks the article page's own companion
// script (`skills/deliver/assets/splash-iframe-scroller.js`) to carry the reader out at the end of
// a scrolly's inner `.scrolly-steps` scrollport, which a cross-origin iframe cannot scroll on its
// own and which Chrome does not chain scroll out of (measured — removing `overscroll-behavior:
// contain` does not free the reader).
//
// `decideRelease` is pure and DOM-free, so it is unit-tested directly, the same discipline
// `assets/interaction.mjs` keeps for `pickActiveStep`/`measureProgress`. `initEmbedExit` is DOM
// wiring and is NOT unit-tested here — see `interaction.mjs`'s own doc-comment for why (doctrine's
// own verification rule: an interactive format is verified by driving a real browser).
import { describe, it, expect } from "bun:test";
import { decideRelease } from "../assets/embed-exit.mjs";

describe("decideRelease — pure gesture-release decision", () => {
  it("should NOT release on mere arrival at the top edge (gesture began mid-track)", () => {
    // The tick that first reaches the top edge began somewhere before it — startEdge is null (or
    // "bottom") for THAT tick, so arrival itself never releases.
    expect(decideRelease(null, "up")).toBeNull();
    expect(decideRelease("bottom", "up")).toBeNull();
  });

  it("should NOT release on mere arrival at the bottom edge", () => {
    expect(decideRelease(null, "down")).toBeNull();
    expect(decideRelease("top", "down")).toBeNull();
  });

  it("should release UP when a gesture that BEGAN at the top edge keeps pushing up", () => {
    expect(decideRelease("top", "up")).toBe("up");
  });

  it("should release DOWN when a gesture that BEGAN at the bottom edge keeps pushing down", () => {
    expect(decideRelease("bottom", "down")).toBe("down");
  });

  it("should NOT release a gesture that began at an edge but is pushing the OTHER way", () => {
    // Sitting at the top and scrolling back down (into the track) is ordinary reading, not an
    // escape attempt.
    expect(decideRelease("top", "down")).toBeNull();
    expect(decideRelease("bottom", "up")).toBeNull();
  });

  it("should NOT release a gesture that started mid-track and reaches an end within that same unbroken gesture", () => {
    // TRADE-OFF, stated rather than hidden (see embed-exit.mjs's own doc-comment on decideRelease):
    // startEdge is recorded once, at gesture start, and never updated mid-gesture — so a touch that
    // starts in the middle of the track and drags all the way to an end does not release on that
    // same gesture, even on the tick that overshoots. Only the NEXT gesture, which begins already
    // sitting at that edge, can release.
    expect(decideRelease(null, "up")).toBeNull();
    expect(decideRelease(null, "down")).toBeNull();
  });
});
