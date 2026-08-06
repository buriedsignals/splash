import { expect, test } from "bun:test";
import { resolveSkillsRoot } from "./skills-root.ts";

// The delivered tree is what a real install runs: pack-skills puts the engines in
// <root>/.dist/skills/ and their dependencies one level ABOVE them, in <root>/.dist/node_modules.
// Probing <root>/skills/ there finds nothing and reports four healthy engines as missing.
test("uses the delivered tree when the install has been packed", () => {
  const root = resolveSkillsRoot(
    "/Users/j/Splash",
    (p) => p === "/Users/j/Splash/.dist/skills",
  );
  expect(root).toBe("/Users/j/Splash/.dist/skills");
});

// A developer checkout has never been packed, and its dependencies live in skills/<engine>/
// node_modules. Same function, same rule: probe where the code that will run actually resolves.
test("falls back to the source tree in a checkout that was never packed", () => {
  expect(resolveSkillsRoot("/repo", () => false)).toBe("/repo/skills");
});
