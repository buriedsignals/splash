import { test, expect } from "bun:test";
import { snapCommand } from "../src/platform-runners.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("snap steps run under tsx (Node runtime + TS resolution) on Windows, Bun elsewhere", () => {
  expect(snapCommand("win32")).toEqual(["npx", "tsx"]);
  expect(snapCommand("darwin")).toEqual(["bun"]);
  expect(snapCommand("linux")).toEqual(["bun"]);
});

test("produce.mjs routes Chromium snap steps through snapCommand (no hardcoded bun/node runner)", () => {
  const src = readFileSync(
    join(import.meta.dir, "../scripts/produce.mjs"),
    "utf8",
  );
  expect(src).toContain("snapCommand(process.platform)");
  expect(src).not.toContain('run("bun", ["scripts/snap-proof.mjs"]');
  expect(src).not.toContain('run("bun", ["scripts/snap-contrast.mjs"]');
  expect(src).not.toContain('run("node"');
});
