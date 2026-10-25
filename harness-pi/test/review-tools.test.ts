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

describe("review_facts tool", () => {
  it("should find the slot's claim when the beat is given as an absolute path", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { cpSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { reviewTools } = await import("../src/tools/review.ts");
    const root = await mkdtemp(join(tmpdir(), "splash-review-"));
    const storyDir = join(root, "stories", "demo");
    mkdirSync(join(storyDir, "beats", "1", "renders"), { recursive: true });
    cpSync(join(CHECKOUT, "proof/static-bar-top-emitters-2024/renders/creme.svg"), join(storyDir, "beats/1/renders/creme.svg"));
    writeFileSync(join(storyDir, "STORYBOARD.md"), "---\ntakeaway: T\nslots:\n  - id: 1\n    proves: \"China leads\"\n---\n");
    const tool = reviewTools({ root, storyDir });
    const out = await (tool.execute as Function)("t", { beat: join(storyDir, "beats", "1") }, undefined, undefined, undefined);
    expect((out.content[0] as { text: string }).text).toContain("slot 1 proves: China leads");
  });
});
