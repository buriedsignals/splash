import { describe, expect, it } from "bun:test";

// gx-locator scrolly (Qwen3.5-9B, 2026-11-16): every card failed "leaves N sampled points of the canvas undrawn".
// Cause: `scrolly-live` hands the reader a second map once the warm is done (`handle.map = warmMap`); the drive had
// confirmed MapTiler's label filter on the FIRST map and never set it on the second, so the reader got the
// style's 43 default country labels, in English, with white halos (measured on the committed proof page too).
function fakeMap() {
  const filters: Record<string, unknown> = {};
  const paint: Record<string, unknown> = {};
  return {
    filters,
    paint,
    getLayer: () => ({}),
    setFilter: (id: string, f: unknown) => (filters[id] = JSON.parse(JSON.stringify(f))),
    getFilter: (id: string) => filters[id],
    setPaintProperty: (id: string, p: string, v: unknown) => (paint[`${id}.${p}`] = v),
  };
}

async function drive() {
  const first = fakeMap();
  const handle: { ready: boolean; map: ReturnType<typeof fakeMap> } = { ready: true, map: first };
  const g = globalThis as Record<string, unknown>;
  g.initScrollyMap = () => handle;
  g.applyScrollyMap = () => {};
  g.requestAnimationFrame = () => 0;
  g.window = g;
  g.location = { search: "" };
  const native = { countryCodes: ["UA", "RU"], countryColor: "#5f5f5f", placeNames: ["Kyiv"], placeColor: "#222", waterNames: ["Black Sea"], waterColor: "#46a", landHalo: "#f4f4f4" };
  const root = {
    dataset: { state: "{}" } as Record<string, string>,
    querySelector: (sel: string) =>
      sel === "[data-locator]"
        ? { getAttribute: () => JSON.stringify({ native }) }
        : sel === '[data-part="plan"]'
          ? { textContent: JSON.stringify({ fallback: { wide: { cards: [{}, {}] } } }) }
          : null,
    querySelectorAll: () => [],
  };
  const { applyLocatorState } = await import(`../craft/scrolly/locator/locator-drive.mjs?${Math.random()}`);
  const state = { card: 0, tops: 1, country: 0, zoom: 0, places: 0, subject: 0, limit: 0 };
  applyLocatorState(root, state);
  const warm = fakeMap();
  handle.map = warm;
  applyLocatorState(root, state);
  return { first, warm };
}

describe("locator scrolly drive — MapTiler's own labels after the warm map takes over", () => {
  it("should filter the country labels on the first map", async () => {
    const { first } = await drive();
    expect(JSON.stringify(first.filters["Country labels"])).toContain('"UA","RU"');
  });
  it("should filter the country labels on the map the reader is handed after the warm", async () => {
    const { warm } = await drive();
    expect(JSON.stringify(warm.filters["Country labels"] ?? null)).toContain('"UA","RU"');
  });
  it("should give the handed-over map's country labels the land's halo", async () => {
    const { warm } = await drive();
    expect(warm.paint["Country labels.text-halo-color"]).toBe("#f4f4f4");
  });
});
