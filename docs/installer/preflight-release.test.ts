import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(import.meta.dir, "../../scripts/preflight-release.mjs"),
  "utf8",
);

test("release gate scans BOTH bootstraps for the placeholder marker, not just commands.js", () => {
  // Gating only commands.js let a green release:check ship bootstraps still pointed at the
  // dead placeholder repo — every install then 404s at the archive-download step.
  expect(src).toContain("docs/installer/commands.js");
  expect(src).toContain("install/bootstrap.sh");
  expect(src).toContain("install/bootstrap.ps1");
});

test("release gate fails while REF is the moving 'main' (must be a pinned release tag)", () => {
  expect(src.toLowerCase()).toContain("ref pinned");
  expect(src).toMatch(/SPLASH_REF:-.*main/);
});
