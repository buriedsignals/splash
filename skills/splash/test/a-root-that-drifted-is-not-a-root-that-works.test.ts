/**
 * PRESENT IS NOT THE SAME AS CURRENT.
 *
 * A Splash root VENDORS the craft files — `shared/` is a COPY of the root template's, not a link to
 * it — so a root created months ago carries months-old code. `checkDependencies` asked whether each
 * declared file EXISTED and never whether it MATCHED, so such a root reported `pass`.
 *
 * Measured 2026-09-23 on a real install: the Engine creates a stories root once and never refreshes
 * it (`bsig adopt` reported "7 skipped" over an existing one), so after the checkout was brought up
 * to date five vendored files had drifted — two absent, three merely changed. Every check was green
 * and a beat run in that root was producing with the previous week's renderer.
 */
import { describe, expect, it, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error — the repository's own tooling is ESM JavaScript.
import { checkDependencies } from "../scripts/preflight.mjs";

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A template with one declared dependency and one vendored craft file. */
function template(): string {
  const dir = mkdtempSync(join(tmpdir(), "tmpl-"));
  made.push(dir);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
  mkdirSync(join(dir, "shared", "chart-beat"), { recursive: true });
  writeFileSync(join(dir, "shared", "chart-beat", "render-still.mjs"), "export const version = 2;\n");
  return dir;
}

/** A root that installed that template, at whatever version `body` says. */
function root(body: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), "root-"));
  made.push(dir);
  mkdirSync(join(dir, "node_modules", "react"), { recursive: true });
  writeFileSync(join(dir, "node_modules", "react", "package.json"), "{}");
  mkdirSync(join(dir, "shared", "chart-beat"), { recursive: true });
  if (body !== null) writeFileSync(join(dir, "shared", "chart-beat", "render-still.mjs"), body);
  return dir;
}

describe("a root that drifted", () => {
  it("passes when its vendored copies are the template's, byte for byte", async () => {
    const t = template();
    const result = await checkDependencies(root("export const version = 2;\n"), t);
    expect(result.status).toBe("pass");
    expect(result.detail).toContain("current");
  });

  it("fails when a vendored copy has merely CHANGED — the case that used to report pass", async () => {
    const t = template();
    const result = await checkDependencies(root("export const version = 1;\n"), t);
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("stale vendored craft files");
    expect(result.detail).toContain("shared/chart-beat/render-still.mjs");
  });

  it("says it is producing with older code than the one that was verified", async () => {
    const t = template();
    const result = await checkDependencies(root("export const version = 1;\n"), t);
    expect(result.detail).toContain("older code than the one that was verified");
  });

  it("still catches a file that is absent outright, and tells the two apart", async () => {
    const t = template();
    const result = await checkDependencies(root(null), t);
    expect(result.detail).toContain("missing vendored craft files");
    expect(result.detail).not.toContain("stale vendored craft files");
  });

  it("reports a whitespace-only difference, because a vendored copy is bytes and not a gist", async () => {
    const t = template();
    const result = await checkDependencies(root("export const version = 2;\n\n"), t);
    expect(result.status).toBe("fail");
  });
});
