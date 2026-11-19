import { describe, expect, it } from "bun:test";
import { nativeLabelOps } from "../craft/scrolly/locator/native-labels.mjs";

// gx-locator scrolly (Qwen3.5-9B mvq144, 2026-11-19): the card images under the live map showed no country, city or
// water name, while card 4 says "countries in capitals, cities on a dot, waters in italics". The bake dropped every
// native label layer (`keepLabels: []`) and only the live drive filtered and faded them. The bake now replays the same
// set-up as data; this test holds that data to the live drive, so the two cannot drift.
function fakeMap() {
  const state = { filters: {} as Record<string, unknown>, paint: {} as Record<string, unknown>, layout: {} as Record<string, unknown>, zoomRange: {} as Record<string, unknown> };
  return {
    state,
    setLayoutProperty: (id: string, p: string, v: unknown) => (state.layout[`${id}.${p}`] = v),
    setLayerZoomRange: (id: string, min: number, max: number) => (state.zoomRange[id] = [min, max]),
    getLayer: () => ({}),
    setFilter: (id: string, f: unknown) => (state.filters[id] = JSON.parse(JSON.stringify(f))),
    getFilter: (id: string) => state.filters[id],
    setPaintProperty: (id: string, p: string, v: unknown) => (state.paint[`${id}.${p}`] = v),
  };
}
const native = { countryCodes: ["UA", "RU"], countryColor: "#5f5f5f", placeNames: ["Kyiv"], lang: "fr", placeColor: "#222", waterNames: ["Black Sea"], waterColor: "#46a", landHalo: "#f4f4f4" };

async function liveDrive(places: number) {
  const map = fakeMap();
  const g = globalThis as Record<string, unknown>;
  g.initScrollyMap = () => ({ ready: true, map });
  g.applyScrollyMap = () => {};
  g.requestAnimationFrame = () => 0;
  g.window = g;
  g.location = { search: "" };
  const root = {
    dataset: { state: "{}" } as Record<string, string>,
    querySelector: (sel: string) =>
      sel === "[data-locator]" ? { getAttribute: () => JSON.stringify({ native }) } : sel === '[data-part="plan"]' ? { textContent: JSON.stringify({ fallback: { wide: { cards: [{}, {}] } } }) } : null,
    querySelectorAll: () => [],
  };
  const { applyLocatorState } = await import(`../craft/scrolly/locator/locator-drive.mjs?${Math.random()}`);
  applyLocatorState(root, { card: 0, tops: 0, country: 1, zoom: 1, places, subject: 0, limit: 0 });
  return map.state;
}

function replayed(places: number) {
  const map = fakeMap();
  const { setup, bindings } = nativeLabelOps(native);
  for (const [kind, id, a, b] of setup) {
    if (kind === "filter") map.setFilter(id, a);
    else if (kind === "paint") map.setPaintProperty(id, a, b);
    else if (kind === "layout") map.setLayoutProperty(id, a, b);
    else if (kind === "zoomRange") map.setLayerZoomRange(id, a, b);
  }
  for (const [id, property, binding] of bindings) map.setPaintProperty(id, property, binding.$state === "places" ? places : NaN);
  return map.state;
}

describe("locator scrolly — MapTiler's own labels in the card images", () => {
  it("should replay exactly the live drive's set-up on a card where the places are named", async () => {
    expect(replayed(1)).toEqual(await liveDrive(1));
  });
  it("should replay exactly the live drive's set-up on a card before the places", async () => {
    expect(replayed(0)).toEqual(await liveDrive(0));
  });
});

// Same replay: the baked card 4 of a French page read "Kyiv", "Bucharest", "ROMANIA", "BLACK SEA" — the style's own
// text field, the English name, live and baked alike.
describe("locator scrolly — the language MapTiler's own labels are set in", () => {
  it("should set every kept label in the page's language first", async () => {
    const live = await liveDrive(1);
    expect(JSON.stringify(live.layout["Country labels.text-field"])).toContain('"name:fr"');
  });
});
