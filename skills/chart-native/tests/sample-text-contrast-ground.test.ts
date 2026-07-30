import { describe, it, expect } from "bun:test";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { groundOf } from "../scripts/lib/ground-of.mjs";

describe("the render-time sampler measures the page the journalist receives", () => {
  it("should derive the ground from the config, not assume paper", () => {
    // sample-text-contrast.mjs:38 returned "#ffffff" — "the paper" — whatever themeBg said.
    // document.elementsFromPoint returns an EMPTY list outside the viewport, which leads
    // straight to that fallback. On a dark theme, in-cell heatmap labels painted #FFFFFF by
    // labelInkOnFill (HeatmapChart.tsx:290 → core/conformance.ts:47-51) were measured white on
    // a PHANTOM white ≈ 1:1 — a guaranteed hard violation on a correct render.
    const dir = mkdtempSync(join(tmpdir(), "ground-"));
    const p = join(dir, "config.json");
    writeFileSync(p, JSON.stringify({ themeBg: "#18181B" }));
    expect(groundOf(p).toLowerCase()).toBe("#18181b");
  });

  it("should still answer white for the light default", () => {
    const dir = mkdtempSync(join(tmpdir(), "ground-"));
    const p = join(dir, "config.json");
    writeFileSync(p, JSON.stringify({ title: "T" }));
    expect(groundOf(p).toLowerCase()).toBe("#ffffff");
  });

  it("should answer white when no config is threaded (manual runs)", () => {
    expect(groundOf(undefined).toLowerCase()).toBe("#ffffff");
  });

  it("should hand the ground to the sampler, not hardcode it", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "scripts", "lib", "sample-text-contrast.mjs"),
      "utf8",
    );
    expect(src).toContain("export function sampleTextContrast(ground)");
    expect(src).not.toContain('return "#ffffff"; // the paper');
  });
});
