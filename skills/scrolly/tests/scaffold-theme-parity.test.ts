// Parity guard (feedback→système): the scrolly SCAFFOLD — the page/centring backgrounds and the
// prose-card / header chrome — must DERIVE from the newsroom house ground (config.themeBg), never a
// hardcoded white/light literal. The exact bug this locks: ScrollyChart.tsx wrapped the chart in a
// `background: "#ffffff"` centring box, so a dark-themed scrolly rendered a white box behind a navy
// chart (white margins above/below). A full systematic audit (45 agents + adversarial verify) found
// this was the ONLY real theme-breaking literal; the ~40 chart-video Reveal wrappers are dead
// (ChartFrame paints its derived bg full-bleed over them) and the map components' dark/light literals
// are basemap-tied. This test keeps the scaffold honest so a future edit can't silently re-hardcode a
// page/centring background.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");
const read = (f: string) => readFileSync(join(SRC, f), "utf-8");

describe("scrolly scaffold theme parity — page/centring backgrounds derive from config.themeBg", () => {
  it("ScrollyChart's centring box derives its background from the house ground (not hardcoded white)", () => {
    const s = read("ScrollyChart.tsx");
    // the regression: a literal white/light background on the centring box.
    expect(s).not.toMatch(/background:\s*["']#(fff|ffffff|FFF|FFFFFF)["']/);
    // it MUST derive from the ground.
    expect(s).toContain("deriveFurniture");
    expect(s).toMatch(/background:\s*deriveFurniture\(config\.themeBg\)\.bg/);
  });

  it("the Scrolly scaffold (page + cards) derives from the ground, not hardcoded white literals", () => {
    const s = read("Scrolly.tsx");
    // the scaffold surfaces are derived (pageBg/cardBg/cardInk come from deriveFurniture(themeBg)).
    expect(s).toContain("deriveFurniture");
    expect(s).toContain("const pageBg = F.bg");
    // the wrapper + the global body background follow the house ground.
    expect(s).toMatch(/background:\s*pageBg/);
    expect(s).toContain("document.body.style.background = pageBg");
    // the prose card + header no longer hardcode an opaque white panel.
    expect(s).not.toMatch(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.9/);
  });
});
