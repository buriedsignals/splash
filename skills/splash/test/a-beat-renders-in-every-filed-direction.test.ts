/**
 * THE KNOWLEDGE REACHED THE PIXEL, AND HERE IS THE PROOF ON DISK.
 *
 * The branch this work replaces died with 112 harvested thumbnails, four written notes and no
 * rendered output. These are the assertions that make that outcome impossible to repeat: a filed
 * direction with no committed render is knowledge that never arrived, and a render whose labels sit
 * on top of each other is the composition defect the arbiter exists to refuse — checked here on the
 * DELIVERED artifact rather than on the arithmetic.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard — a defect this tree has already paid for once.
const RENDERS = join(ROOT, "proof", "co2-suisse", "renders");

const filed = () =>
  existsSync(DIRECTIONS)
    ? readdirSync(DIRECTIONS)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""))
    : [];

describe("the line family's beat", () => {
  it("should have a committed render for every filed direction", () => {
    const ids = filed();
    expect(ids.length, "no direction is filed").toBeGreaterThanOrEqual(3);
    for (const id of ids) {
      expect(
        existsSync(join(RENDERS, `${id}.png`)),
        `no PNG for direction ${id}`,
      ).toBe(true);
      expect(
        existsSync(join(RENDERS, `${id}.svg`)),
        `no SVG for direction ${id}`,
      ).toBe(true);
    }
  });

  it("should draw each direction on its own recorded ground", () => {
    // The direction is not decoration applied afterwards: the delivered SVG's own backdrop is the
    // colour the record measured off a published piece.
    for (const id of filed()) {
      const record = readFileSync(join(DIRECTIONS, `${id}.md`), "utf8");
      const ground = record.match(/^- ground:\s*(#[0-9A-Fa-f]{6})$/m)?.[1];
      expect(ground, `${id} records no ground`).toBeTruthy();
      const svg = readFileSync(join(RENDERS, `${id}.svg`), "utf8");
      expect(svg, `${id} is not drawn on ${ground}`).toContain(
        `fill="${ground}"`,
      );
    }
  });

  it("should set the three directions in at least two different families", () => {
    // The whole point of opening the typography axis. If every render came out in one family, the
    // directions differ on paper and not in the picture.
    const families = new Set<string>();
    for (const id of filed()) {
      const svg = readFileSync(join(RENDERS, `${id}.svg`), "utf8");
      for (const [, family] of svg.matchAll(/font-family="([^"]+)"/g))
        families.add(family);
    }
    expect(
      families.size,
      `only ${[...families].join(", ")}`,
    ).toBeGreaterThanOrEqual(2);
  });

  it("should let no label sit on the series in any delivered render", () => {
    // THE DEFECT THIS CLOSES, measured on this beat's first render: the end value landed ON its own
    // line in all three directions. The arbiter avoided other labels and nothing had told it where
    // the data was. Read off the delivered file, because that is where a reader meets it.
    for (const id of filed()) {
      const svg = readFileSync(join(RENDERS, `${id}.svg`), "utf8");
      const seriesPath = [...svg.matchAll(/<path d="([^"]+)"/g)]
        .map((m) => m[1])
        .sort((a, b) => b.length - a.length)[0];
      expect(seriesPath, `${id} draws no path`).toBeTruthy();
      const points = [...seriesPath.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
        x: Number(m[1]),
        y: Number(m[2]),
      }));
      expect(points.length, `${id} path has too few points`).toBeGreaterThan(10);

      for (const [run, x, y, size, text] of svg.matchAll(
        /<text[^>]*\sx="([\d.-]+)"[^>]*\sy="([\d.-]+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]*)<\/text>/g,
      )) {
        if (!text.trim()) continue;
        // A run's box depends on its ANCHOR. The axis ticks are `end`-anchored and sit in their own
        // gutter; treating their x as a left edge accused the tick "10" of sitting on a series that
        // starts twelve pixels to its right — a guard that accuses correct work is one somebody
        // switches off.
        const anchor = run.match(/text-anchor="([^"]+)"/)?.[1] ?? "start";
        const width = text.length * Number(size) * 0.62;
        const left =
          anchor === "end" ? Number(x) - width : anchor === "middle" ? Number(x) - width / 2 : Number(x);
        const right = left + width;
        const top = Number(y) - Number(size);
        const bottom = Number(y) + Number(size) * 0.25;
        const on = points.find((p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom);
        expect(on, `${id}: "${text}" sits on the series at ${on?.x},${on?.y}`).toBeUndefined();
      }
    }
  });

  it("should let no two treatment labels overlap in any delivered render", () => {
    // The measured defect: five treatments once put three labels in the same corner of this exact
    // beat. The arbiter resolves it; this reads the result off the file.
    for (const id of filed()) {
      const svg = readFileSync(join(RENDERS, `${id}.svg`), "utf8");
      const runs = [
        ...svg.matchAll(
          /<text[^>]*\sx="([\d.-]+)"[^>]*\sy="([\d.-]+)"[^>]*font-size="([\d.]+)"[^>]*>([^<]*)<\/text>/g,
        ),
      ].map((m) => ({
        x: Number(m[1]),
        y: Number(m[2]),
        size: Number(m[3]),
        text: m[4],
      }));
      expect(runs.length, `${id} has no text at all`).toBeGreaterThan(4);
      for (let i = 0; i < runs.length; i += 1)
        for (let j = i + 1; j < runs.length; j += 1) {
          const a = runs[i];
          const b = runs[j];
          if (a.text.trim() === "" || b.text.trim() === "") continue;
          // Two runs on the same baseline that start at the same x are one on top of the other.
          const sameLine = Math.abs(a.y - b.y) < Math.min(a.size, b.size) * 0.6;
          if (!sameLine) continue;
          expect(
            Math.abs(a.x - b.x),
            `${id}: "${a.text}" and "${b.text}" share a baseline at x=${a.x}`,
          ).toBeGreaterThan(1);
        }
    }
  });
});
