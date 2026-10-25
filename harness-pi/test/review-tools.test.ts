import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { svgFacts } from "../src/tools/review.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const SVG = readFileSync(join(CHECKOUT, "proof/static-bar-top-emitters-2024/renders/creme.svg"), "utf8");

describe("render facts", () => {
  it("should read the headline the render actually draws", () => {
    expect(svgFacts(SVG).texts).toContain("La Chine a émis plus de CO2 en 2024 que les cinq pays");
  });

  it("should take the largest painted rectangle as the ground", () => {
    expect(svgFacts(SVG).ground).toBe("#FFFCEE");
  });

  it("should measure the accent's contrast against the ground", () => {
    const accent = svgFacts(SVG).painted.find((p) => p.hex === "#1757B6");
    expect(accent?.contrastToGround).toBeGreaterThan(3);
  });
});
