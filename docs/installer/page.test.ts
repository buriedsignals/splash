import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "index.html"), "utf8");

test("page wires the new generators, not the removed baked-script API", () => {
  expect(html).toContain("generateCopyPaste");
  expect(html).toContain("generateLauncher");
  expect(html).not.toContain("generateScript");
});

test("page offers both delivery modes and an OS toggle", () => {
  expect(html).toContain('data-testid="mode-copypaste"');
  expect(html).toContain('data-testid="mode-download"');
  expect(html).toContain('data-testid="os-toggle"');
});

test("page documents the unsigned-file workaround for both OSes", () => {
  expect(html.toLowerCase()).toContain("run anyway"); // Windows SmartScreen
  expect(html.toLowerCase()).toContain("privacy & security"); // macOS Gatekeeper (Sequoia+)
});
