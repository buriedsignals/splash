import { test, expect } from "bun:test";
import { snapRunner, remotionRunner } from "../src/platform-runners.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("snap steps run under Node on Windows (Bun+Playwright hang), Bun elsewhere", () => {
  expect(snapRunner("win32")).toBe("node");
  expect(snapRunner("darwin")).toBe("bun");
  expect(snapRunner("linux")).toBe("bun");
});

test("Remotion runs under npx on Windows, bunx elsewhere", () => {
  expect(remotionRunner("win32")).toBe("npx");
  expect(remotionRunner("darwin")).toBe("bunx");
});

test("produce.mjs uses the platform runner for Chromium snap steps (no hardcoded bun)", () => {
  const src = readFileSync(
    join(import.meta.dir, "../scripts/produce.mjs"),
    "utf8",
  );
  expect(src).toContain("snapRunner(process.platform)");
  expect(src).not.toContain('run("bun", ["scripts/snap-proof.mjs"]');
  expect(src).not.toContain('run("bun", ["scripts/snap-contrast.mjs"]');
});
