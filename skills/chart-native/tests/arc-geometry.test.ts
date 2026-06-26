import { describe, it, expect } from "bun:test";
import { computeArcLayout, arcPath, type ArcData } from "../src/arc-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 30, right: 30, bottom: 50, left: 30 },
};

const data: ArcData = {
  nodes: [
    { id: "a", label: "Alpha", group: "X" },
    { id: "b", label: "Bravo", group: "X" },
    { id: "c", label: "Charlie", group: "Y" },
    { id: "d", label: "Delta", group: "Y" },
  ],
  links: [
    { source: "a", target: "b", value: 2 },
    { source: "a", target: "d", value: 8 }, // widest span, heaviest
    { source: "b", target: "c", value: 4 },
  ],
};

describe("computeArcLayout", () => {
  it("places one node per input node, left→right in array order", () => {
    const l = computeArcLayout(data, dims);
    expect(l.nodes).toHaveLength(4);
    const xs = l.nodes.map((n) => n.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("sums incident link weight into node degree", () => {
    const l = computeArcLayout(data, dims);
    const a = l.nodes.find((n) => n.id === "a")!;
    expect(a.degree).toBe(10); // 2 + 8
  });

  it("maps a heavier link to a wider stroke", () => {
    const l = computeArcLayout(data, dims);
    const heavy = l.links.find((k) => k.value === 8)!;
    const light = l.links.find((k) => k.value === 2)!;
    expect(heavy.width).toBeGreaterThan(light.width);
  });

  it("orders each link's endpoints left→right (x1 ≤ x2)", () => {
    const l = computeArcLayout(data, dims);
    for (const k of l.links) expect(k.x1).toBeLessThanOrEqual(k.x2);
  });

  it("caps arc height to the band — ry never exceeds maxArcHeight", () => {
    const l = computeArcLayout(data, dims);
    for (const k of l.links) expect(k.ry).toBeLessThanOrEqual(l.maxArcHeight);
  });

  it("a wide span is capped (ry < rx) in a short plot so it stays in bounds", () => {
    // short height → maxArcHeight < the wide span's rx, forcing the cap
    const shortDims = {
      width: 800,
      height: 120,
      padding: { top: 20, right: 30, bottom: 40, left: 30 },
    };
    const l = computeArcLayout(data, shortDims);
    const wide = l.links.find((k) => k.source === "a" && k.target === "d")!;
    expect(wide.ry).toBeLessThan(wide.rx);
    expect(wide.ry).toBe(l.maxArcHeight);
  });

  it("throws on a link referencing an unknown node", () => {
    const bad: ArcData = {
      nodes: [{ id: "a", label: "A" }],
      links: [{ source: "a", target: "z", value: 1 }],
    };
    expect(() => computeArcLayout(bad, dims)).toThrow(/target not a node/);
  });
});

describe("arcPath — the reveal sweeps the arc open", () => {
  it("is a near-degenerate arc at progress 0 (parked at the left foot)", () => {
    const l = computeArcLayout(data, dims);
    const k = l.links[0];
    const path = arcPath(k, l.baseY, 0);
    // endpoint coincides with the start (x1, baseY)
    expect(path).toContain(`M ${k.x1} ${l.baseY}`);
    expect(path.trim().endsWith(`${k.x1} ${l.baseY}`)).toBe(true);
  });

  it("reaches the right foot (x2, baseY) at progress 1", () => {
    const l = computeArcLayout(data, dims);
    const k = l.links[0];
    const path = arcPath(k, l.baseY, 1);
    expect(path.trim().endsWith(`${k.x2} ${l.baseY}`)).toBe(true);
  });

  it("at progress 0.5 the endpoint is the apex (above the baseline)", () => {
    const l = computeArcLayout(data, dims);
    const k = l.links[0];
    const path = arcPath(k, l.baseY, 0.5);
    const m = path.match(/A [\d.]+ [\d.]+ 0 0 1 ([\d.-]+) ([\d.-]+)$/)!;
    const ey = Number(m[2]);
    expect(ey).toBeLessThan(l.baseY); // risen above the line
  });
});
