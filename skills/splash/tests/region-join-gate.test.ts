import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";

// THE PROSE CHAIN'S OWN REFUSAL of a region join it cannot make — the gate half of
// skills/map-native/src/region-join-support.ts (read its header for the two measured facts).
//
// Before this guard, every case below reached the producer and died there: an admin-1
// cartogram/dot-density on lib/geo/resolve-for-produce.ts:351, whose message tells the
// journalist to "re-run the geography match (orient)" — a step the prose chain does not have —
// and a us-states one on nothing at all, shipping a world map with no data (dot-density) or a
// 60 s Playwright timeout (cartogram, which throws inside the browser render).

const base = {
  producer: "map-native" as const,
  channel: "article-web" as const,
  provenance: "table" as const,
  confirmedTakeaway: "Geneva locks up more people per resident than Zurich.",
};

const spec = (over: Record<string, unknown>) => ({
  regionKey: "canton",
  valueField: "rate",
  rows: [
    { canton: "Genève", rate: 157 },
    { canton: "Zurich", rate: 72 },
  ],
  title: "Geneva locks up more people per resident than Zurich",
  description: "People held per 100 000 residents, by canton.",
  source: { name: "Example stats office", url: "https://stats.admin.ch" },
  altInsight: "Geneva has the highest rate of the cantons mapped.",
  ...over,
});

const errorsOf = (p: AcceptedProposal): string[] => {
  const outcome = validateAccepted(p, [p]);
  return outcome.ok ? [] : outcome.errors;
};

const pinnedRefusal = (errors: string[]) =>
  errors.some((e) => e.includes("silently wrong rather than merely fail"));
const adm1Refusal = (errors: string[]) =>
  errors.some((e) => e.includes("has no matched regions to draw"));

describe("validateAccepted — a region join the engine cannot make (FACT A: pinned join key)", () => {
  it("should refuse an INTERACTIVE dot-density on natural-earth-admin-1", () => {
    const errors = errorsOf({
      ...base,
      id: "dd-adm1-interactive",
      format: "interactive",
      spec: spec({ type: "dot-density", basemap: "natural-earth-admin-1" }),
    });
    expect(pinnedRefusal(errors)).toBe(true);
  });

  it("should refuse a STATIC cartogram on natural-earth-admin-1", () => {
    const errors = errorsOf({
      ...base,
      id: "cg-adm1-static",
      format: "static",
      spec: spec({
        type: "cartogram",
        basemap: "natural-earth-admin-1",
        values: [
          { id: "Genève", value: 157 },
          { id: "Zurich", value: 72 },
        ],
      }),
    });
    expect(pinnedRefusal(errors)).toBe(true);
  });

  // The case with no refusal ANYWHERE before this guard: us-states is not admin-1, so the
  // resolver's own tripwire never fires and the run PRODUCED — a world map, zero dots, a
  // legend reading "1 dot = 10" and a title asserting a comparison. Measured 2026-08-07.
  it("should refuse an INTERACTIVE dot-density on us-states — the silently-wrong ship", () => {
    const errors = errorsOf({
      ...base,
      id: "dd-us-interactive",
      format: "interactive",
      spec: spec({
        type: "dot-density",
        basemap: "us-states",
        regionKey: "state",
        rows: [
          { state: "CA", rate: 157 },
          { state: "NY", rate: 72 },
        ],
      }),
    });
    expect(pinnedRefusal(errors)).toBe(true);
  });
});

describe("validateAccepted — a region join this CHAIN cannot make (FACT B: no match for the type)", () => {
  it("should refuse an admin-1 dot-density VIDEO without ever naming orient", () => {
    const errors = errorsOf({
      ...base,
      id: "dd-adm1-video",
      format: "video",
      narrativeKind: "reveal",
      spec: spec({
        type: "dot-density",
        basemap: "natural-earth-admin-1",
        cameraMode: "simple",
      }),
    });
    expect(adm1Refusal(errors)).toBe(true);
    // The defect this whole guard exists to close: the fallback throw sent the journalist to
    // a step their chain does not have.
    expect(errors.join(" ")).not.toContain("orient");
  });

  it("should refuse an admin-1 cartogram map-scrolly the same way", () => {
    const errors = errorsOf({
      ...base,
      id: "cg-adm1-scrolly",
      producer: "scrolly",
      format: "scrolly",
      spec: spec({
        type: "cartogram",
        basemap: "natural-earth-admin-1",
        values: [
          { id: "Genève", value: 157 },
          { id: "Zurich", value: 72 },
        ],
      }),
    });
    expect(adm1Refusal(errors)).toBe(true);
    expect(errors.join(" ")).not.toContain("orient");
  });
});

// The three pairings this guard must NOT touch. Each is a capability that works today, and a
// guard widened by one careless condition would delete it silently.
describe("validateAccepted — what the region-join guard leaves alone", () => {
  it("should NOT refuse a us-states dot-density VIDEO — measured to produce clean", () => {
    const errors = errorsOf({
      ...base,
      id: "dd-us-video",
      format: "video",
      narrativeKind: "reveal",
      spec: spec({
        type: "dot-density",
        basemap: "us-states",
        regionKey: "state",
        cameraMode: "simple",
        rows: [
          { state: "CA", rate: 157 },
          { state: "NY", rate: 72 },
        ],
      }),
    });
    expect(pinnedRefusal(errors)).toBe(false);
    expect(adm1Refusal(errors)).toBe(false);
  });

  it("should NOT refuse an admin-1 CHOROPLETH — the backfill matches its regions", () => {
    const errors = errorsOf({
      ...base,
      id: "cho-adm1-interactive",
      format: "interactive",
      spec: spec({ type: "choropleth", basemap: "natural-earth-admin-1" }),
    });
    expect(pinnedRefusal(errors)).toBe(false);
    expect(adm1Refusal(errors)).toBe(false);
  });

  // The fourth member of resolve-for-produce's JOINING_TYPES, and the one this guard reasons
  // its way past rather than covering: a route has no per-row region join to get wrong, its
  // territory keys already fall back to `name` (route-geo.ts:162,235) and drive only optional
  // labels/colours, and resolve-for-produce excludes it from the featureIdsByValue requirement
  // structurally (:351). Locked so a future widening of the guard cannot sweep it in silently.
  it("should NOT refuse a route on natural-earth-admin-1 — it makes no region join", () => {
    const errors = errorsOf({
      ...base,
      id: "route-adm1-interactive",
      format: "interactive",
      spec: spec({
        type: "route",
        basemap: "natural-earth-admin-1",
        route: [
          [6.14, 46.2],
          [8.54, 47.37],
        ],
      }),
    });
    expect(pinnedRefusal(errors)).toBe(false);
    expect(adm1Refusal(errors)).toBe(false);
  });

  it("should NOT refuse a dot-density on world — the basemap its components pin", () => {
    const errors = errorsOf({
      ...base,
      id: "dd-world-interactive",
      format: "interactive",
      spec: spec({
        type: "dot-density",
        basemap: "world",
        regionKey: "iso",
        rows: [
          { iso: "CHE", rate: 157 },
          { iso: "FRA", rate: 72 },
        ],
      }),
    });
    expect(pinnedRefusal(errors)).toBe(false);
    expect(adm1Refusal(errors)).toBe(false);
  });
});
