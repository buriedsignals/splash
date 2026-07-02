import { describe, it, expect } from "bun:test";
import { scrollyPanelLayout } from "../src/components/ScrollyPanel";

describe("scrollyPanelLayout", () => {
  it("puts the panel at the bottom for narrow (square/portrait) canvases", () => {
    expect(
      scrollyPanelLayout({ width: 1080, height: 1080, align: "left", slide: 1 })
        .side,
    ).toBe("bottom");
    expect(
      scrollyPanelLayout({
        width: 1080,
        height: 1350,
        align: "right",
        slide: 1,
      }).side,
    ).toBe("bottom");
  });

  it("honors align as the side on wide (landscape) canvases", () => {
    expect(
      scrollyPanelLayout({ width: 1280, height: 720, align: "left", slide: 1 })
        .side,
    ).toBe("left");
    expect(
      scrollyPanelLayout({ width: 1280, height: 720, align: "right", slide: 1 })
        .side,
    ).toBe("right");
    expect(
      scrollyPanelLayout({
        width: 1280,
        height: 720,
        align: "center",
        slide: 1,
      }).side,
    ).toBe("center");
  });

  it("is invisible at slide 0 and slide 2, full at slide 1", () => {
    const at = (slide: number) =>
      scrollyPanelLayout({ width: 1280, height: 720, slide }).opacity;
    expect(at(0)).toBeCloseTo(0, 5);
    expect(at(2)).toBeCloseTo(0, 5);
    expect(at(1)).toBeCloseTo(1, 5);
  });

  it("keeps the panel inside the viewport horizontally", () => {
    const p = scrollyPanelLayout({
      width: 1280,
      height: 720,
      align: "right",
      slide: 1,
    });
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(1280);
  });

  it("moves the panel upward as slide increases (pinned → exiting)", () => {
    const y1 = scrollyPanelLayout({ width: 1280, height: 720, slide: 1 }).y;
    const y2 = scrollyPanelLayout({ width: 1280, height: 720, slide: 1.8 }).y;
    expect(y2).toBeLessThan(y1);
  });
});
