import { test, expect } from "bun:test";
import { GESTURES, NARRATIVE_KINDS, type Gesture } from "./gestures";

test("the narrative kinds are exactly the three the spec names", () => {
  expect([...NARRATIVE_KINDS].sort()).toEqual(["reveal", "scrolly", "story"]);
});

test("every gesture is readable at runtime, so a test and a proposal read the SAME list", () => {
  // A union that exists only in the type system cannot be validated against at runtime —
  // the proposal brain and the gate both need to enumerate it.
  expect(GESTURES.length).toBeGreaterThan(0);
  const asSet = new Set<string>(GESTURES);
  expect(asSet.size).toBe(GESTURES.length); // no duplicates
});

test("camera gestures and data gestures are distinguishable without parsing a name", () => {
  // A chart has no camera; a map does. A caller must be able to ask "is this a camera move?"
  // without string-matching, or every consumer invents its own predicate.
  const { isCameraGesture } = require("./gestures");
  expect(isCameraGesture("fly" as Gesture)).toBe(true);
  expect(isCameraGesture("grow" as Gesture)).toBe(false);
});
