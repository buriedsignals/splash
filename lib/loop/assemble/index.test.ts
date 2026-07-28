import { test, expect } from "bun:test";
import { ASSEMBLERS, assemblerFor } from "./index";
import { isLoopBuildable, LOOP_BUILDABLE_ENGINES } from "../buildable";

test("the buildable list is exactly the table's keys — no hand-written second copy", () => {
  expect([...LOOP_BUILDABLE_ENGINES].sort()).toEqual(
    Object.keys(ASSEMBLERS).sort(),
  );
});

test("an engine with no per-type restriction builds any of its types", () => {
  expect(isLoopBuildable("chart-native", "line")).toBe(true);
  expect(isLoopBuildable("chart-native", "sankey")).toBe(true);
});

test("an unknown engine is not buildable, with or without a type", () => {
  expect(isLoopBuildable("crayon")).toBe(false);
  expect(isLoopBuildable("crayon", "line")).toBe(false);
});

test("no engine at all is the pre-brain default path, which is chart-native", () => {
  expect(isLoopBuildable(undefined)).toBe(true);
});
