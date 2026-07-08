import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "index.html"), "utf8");

test("page is key-free: no key form, no runtime radio, no baked-key generator", () => {
  expect(html).not.toContain('name="ai"');
  expect(html).not.toContain('name="maptiler"');
  expect(html).not.toContain("generateCopyPaste");
  expect(html).not.toContain("runtimes.js");
});

test("page wires the static key-free command generators", () => {
  expect(html).toContain("installCommand");
  expect(html).toContain("commands.js");
});

test("page offers both modes, an OS toggle, and mentions the local configurator", () => {
  expect(html).toContain('data-testid="mode-copypaste"');
  expect(html).toContain('data-testid="mode-download"');
  expect(html).toContain('data-testid="os-toggle"');
  expect(html.toLowerCase()).toContain("configurator");
});

test("page documents the unsigned-file workaround for both OSes", () => {
  expect(html.toLowerCase()).toContain("run anyway");
  expect(html.toLowerCase()).toContain("privacy & security");
});
