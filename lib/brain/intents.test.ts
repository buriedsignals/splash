import { test, expect } from "bun:test";
import { INTENTS, isIntent } from "./intents";

test("the vocabulary is the nine FT Visual Vocabulary categories", () => {
  expect(INTENTS.length).toBe(9);
  expect(INTENTS).toContain("change-over-time");
  expect(INTENTS).toContain("part-to-whole");
  expect(INTENTS).toContain("spatial");
});
test("anything outside the canon is not an intent", () => {
  expect(isIntent("ranking")).toBe(true);
  expect(isIntent("pretty")).toBe(false);
  expect(isIntent(3)).toBe(false);
});
