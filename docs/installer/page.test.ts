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

test("Option B mac workaround tells the user to chmod +x the downloaded .command", () => {
  // A Blob download can't carry an execute bit; without this the double-click dies with
  // 'permission denied' and the on-page advice (Gatekeeper only) doesn't fix it.
  expect(html).toContain("chmod +x");
});

test("copy button has success feedback and an insecure-context fallback", () => {
  expect(html).toContain("Copied!");
  expect(html).toContain("execCommand");
});

test("download appends the anchor to the DOM and defers revokeObjectURL (Safari-safe)", () => {
  expect(html).toContain("appendChild(a)");
  expect(html).toMatch(
    /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?revokeObjectURL[\s\S]*?\},\s*\d+\)/,
  );
});

test("OS toggle uses aria-pressed toggle semantics, not a broken tablist", () => {
  expect(html).toContain("aria-pressed");
  expect(html).not.toContain('role="tablist"');
  expect(html).not.toContain("aria-selected");
});
