import { describe, it, expect } from "bun:test";
import {
  computeSankeyLayout,
  sankeyLinkPath,
  type SankeyData,
} from "../src/sankey-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
};

const data: SankeyData = {
  nodes: [
    { id: "A", label: "A", column: 0 },
    { id: "B", label: "B", column: 0 },
    { id: "Hub", label: "Hub", column: 1 },
    { id: "X", label: "X", column: 2 },
    { id: "Y", label: "Y", column: 2 },
  ],
  links: [
    { source: "A", target: "Hub", value: 30 },
    { source: "B", target: "Hub", value: 20 },
    { source: "Hub", target: "X", value: 30 },
    { source: "Hub", target: "Y", value: 20 },
  ],
};

describe("computeSankeyLayout", () => {
  it("sizes a node by the quantity flowing through it (max of in/out)", () => {
    const l = computeSankeyLayout(data, dims);
    const node = (id: string) => l.nodes.find((n) => n.id === id)!;
    expect(node("A").value).toBe(30);
    expect(node("Hub").value).toBe(50); // 30+20 in = 30+20 out
    expect(node("X").value).toBe(30);
  });

  it("places columns left → right", () => {
    const l = computeSankeyLayout(data, dims);
    const x = (id: string) => l.nodes.find((n) => n.id === id)!.x;
    expect(x("A")).toBeLessThan(x("Hub"));
    expect(x("Hub")).toBeLessThan(x("X"));
  });

  it("makes link thickness proportional to value", () => {
    const l = computeSankeyLayout(data, dims);
    const aHub = l.links.find((k) => k.source === "A")!;
    const bHub = l.links.find((k) => k.source === "B")!;
    expect(aHub.width / bHub.width).toBeCloseTo(30 / 20, 5);
  });

  it("conserves flow: a node's incoming ribbons sum to its height", () => {
    const l = computeSankeyLayout(data, dims);
    const hub = l.nodes.find((n) => n.id === "Hub")!;
    const inWidth = l.links
      .filter((k) => k.target === "Hub")
      .reduce((s, k) => s + k.width, 0);
    expect(inWidth).toBeCloseTo(hub.h, 4);
  });

  it("keeps every node inside the plot band", () => {
    const l = computeSankeyLayout(data, dims);
    for (const n of l.nodes) {
      expect(n.y).toBeGreaterThanOrEqual(-0.5);
      expect(n.y + n.h).toBeLessThanOrEqual(l.innerHeight + 0.5);
    }
  });

  it("emits a horizontal cubic path between the two ribbon centres", () => {
    const l = computeSankeyLayout(data, dims);
    const k = l.links[0];
    expect(sankeyLinkPath(k)).toContain(`M${k.x0},${k.y0}`);
    expect(sankeyLinkPath(k)).toContain("C");
  });

  it("throws on a link referencing an unknown node", () => {
    expect(() =>
      computeSankeyLayout(
        {
          nodes: [
            { id: "A", label: "A", column: 0 },
            { id: "B", label: "B", column: 1 },
          ],
          links: [{ source: "A", target: "ZZZ", value: 5 }],
        },
        dims,
      ),
    ).toThrow(/unknown link target/);
  });

  it("throws with fewer than 2 columns", () => {
    expect(() =>
      computeSankeyLayout(
        {
          nodes: [{ id: "A", label: "A", column: 0 }],
          links: [],
        },
        dims,
      ),
    ).toThrow(/≥ 2 columns/);
  });
});
