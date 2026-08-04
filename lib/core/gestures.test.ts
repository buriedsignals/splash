import { test, expect } from "bun:test";
import {
  CAMERA_GESTURES,
  DATA_GESTURES,
  GESTURES,
  NARRATIVE_KINDS,
  isCameraGesture,
  type Gesture,
} from "./gestures";

test("the narrative kinds are exactly the four the spec names", () => {
  // Grew from three to four on 2026-08-03: `scrolly` was renamed `stepped` (map-native's
  // own video-timeline family) and `scrolly` was freed for the browser-reader family it
  // actually names now. A deliberate, visible edit — same rationale as the vocabulary pin
  // below.
  expect([...NARRATIVE_KINDS].sort()).toEqual([
    "reveal",
    "scrolly",
    "stepped",
    "story",
  ]);
});

test("every gesture is readable at runtime, so a test and a proposal read the SAME list", () => {
  // A union that exists only in the type system cannot be validated against at runtime —
  // the proposal brain and the gate both need to enumerate it.
  expect(GESTURES.length).toBeGreaterThan(0);
  const asSet = new Set<string>(GESTURES);
  expect(asSet.size).toBe(GESTURES.length); // no duplicates
});

// Pins the literal vocabulary, not just its shape — `GESTURES.length > 0` plus a duplicate
// check would still pass if a gesture were silently renamed or swapped. Adding, removing, or
// renaming a gesture must be a deliberate, visible edit to THIS test, grounded back in
// docs/splash/gesture-inventory-2026-08-03.md (see gestures.ts's own per-entry citations).
test("the camera and data vocabularies are exactly these names, in this order", () => {
  expect([...CAMERA_GESTURES]).toEqual(["jump", "fly", "hold", "push"]);
  expect([...DATA_GESTURES]).toEqual([
    "grow",
    "draw",
    "highlight",
    "appear",
    "stagger",
    "crossfade",
  ]);
});

test("camera gestures and data gestures are distinguishable without parsing a name", () => {
  // A chart has no camera; a map does. A caller must be able to ask "is this a camera move?"
  // without string-matching, or every consumer invents its own predicate.
  expect(isCameraGesture("fly" as Gesture)).toBe(true);
  expect(isCameraGesture("grow" as Gesture)).toBe(false);
});

test("isCameraGesture classifies every gesture correctly, not just one of each family", () => {
  // The predicate test above exercises 2 of 10 names. A future gesture added to the wrong
  // array (or a copy-paste typo in isCameraGesture's own list) would pass that test silently.
  for (const g of CAMERA_GESTURES) {
    expect(isCameraGesture(g)).toBe(true);
  }
  for (const g of DATA_GESTURES) {
    expect(isCameraGesture(g)).toBe(false);
  }
});
