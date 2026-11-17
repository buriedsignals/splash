import { describe, expect, it } from "bun:test";

// gx-proportional-symbol scrolly (Qwen3.5-9B, 2026-11-14, q10): on card 4 the key's 6 000 MW circle overflowed its
// box onto its own label. On a frozen card image the circle is drawn at the card's zoom times the image's `cover`
// scale, but its box was sized for the live cameras alone, at scale 1.

const g = globalThis as Record<string, unknown>;
g.applyScrollyMap = () => {};
g.stageViewOf = (_plan: unknown, camera: { zoom: number }) => ({ zoom: camera.zoom });
// @ts-expect-error untyped kit module
const { applySymbolState } = await import("../craft/scrolly/proportional-symbol-symbol-bubble-map/symbol-drive.mjs");

const px = (s: string) => Number.parseFloat(s);
function root() {
  const node = () => ({ style: {} as Record<string, string>, dataset: {} as Record<string, string>, textContent: "" });
  const swatch = { ...node(), dataset: { mw: "6000" }, parentElement: node() };
  const cards = [3, 3, 3, 5, 5, 5].map((zoom) => ({ zoom }));
  const r = {
    __symbols: {
      cumulative: [50, 100],
      maxMw: 6000,
      handle: null,
      plan: { radius: { largestPx: 20, growth: 0.5, anchorZoom: 3 }, cameras: cards, buckets: [], fallback: { wide: { size: { width: 1280, height: 720 }, cards } } },
      stage: { clientWidth: 1600, clientHeight: 900 },
      fallbacks: [{ ...node(), dataset: { fallback: "3", shape: "wide" }, getClientRects: () => [1] }],
      cards: 6,
      format: String,
      percent: String,
      counter: { ...node(), dataset: { template: "{n}" } },
      subjectNote: node(),
      cutNote: node(),
      cut: node(),
      sizeSwatches: [swatch],
    },
  };
  return { r, swatch };
}

describe("the bubble-map scrolly key", () => {
  it("should keep a circle on a frozen card inside its box", () => {
    const { r, swatch } = root();
    applySymbolState(r, { card: 3, level: 0, subject: 0, cut: 0 });
    expect(px(swatch.style.width)).toBeLessThanOrEqual(px(swatch.parentElement.style.width));
  });

  // gx-proportional-symbol scrolly (Qwen3.5-9B, mvq79, 2026-11-17): the bake's draft page carries blank card images
  // whose shapes are 1 × 1, so their cover scale read 1600 and the key's boxes grew wide enough to push the stage
  // 46 px shorter than on the written page; every render, the worked example's too, was refused for a stage
  // mismatch. A blank shape is no image: the key is sized as if it were not there.
  it("should size the key on the bake's draft page as on the written page", () => {
    const written = root();
    applySymbolState(written.r, { card: 0, level: 0, subject: 0, cut: 0 });
    const draft = root();
    const blank = { size: { width: 1, height: 1 }, cards: [0, 0, 0, 0, 0, 0].map((zoom) => ({ zoom })) };
    Object.assign(draft.r.__symbols.plan, { fallback: { wide: blank, tall: blank } });
    draft.r.__symbols.fallbacks[0].dataset.fallback = "0";
    applySymbolState(draft.r, { card: 0, level: 0, subject: 0, cut: 0 });
    expect(px(draft.swatch.parentElement.style.width)).toBeLessThanOrEqual(px(written.swatch.parentElement.style.width));
  });
});
