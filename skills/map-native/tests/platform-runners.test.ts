import { test, expect } from "bun:test";
import { snapCommand, remotionCommand } from "../src/platform-runners.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("snap steps run under tsx (Node runtime + TS resolution) on Windows, Bun elsewhere", () => {
  expect(snapCommand("win32")).toEqual(["npx", "tsx"]);
  expect(snapCommand("darwin")).toEqual(["bun"]);
  expect(snapCommand("linux")).toEqual(["bun"]);
});

test("Remotion runs under npx on Windows, bunx elsewhere", () => {
  expect(remotionCommand("win32")).toEqual(["npx", "remotion"]);
  expect(remotionCommand("darwin")).toEqual(["bunx", "remotion"]);
});

test("produce.mjs routes Chromium snap + Remotion steps through the platform runners", () => {
  const src = readFileSync(
    join(import.meta.dir, "../scripts/produce.mjs"),
    "utf8",
  );
  expect(src).toContain("snapCommand(process.platform)");
  expect(src).toContain("remotionCommand(process.platform)");
  expect(src).not.toContain('run("bun", ["scripts/snap-proof.mjs"]');
  expect(src).not.toContain('run("bunx", ["remotion", "still"');
  expect(src).not.toContain('run("node"');
});
