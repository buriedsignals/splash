import { describe, it, expect } from "bun:test";
import {
  BASEMAPS,
  BASEMAP_NAMES,
  resolveBasemapMeta,
  resolveGeographyRef,
  basemapKeyFor,
} from "./ref";

describe("resolveBasemapMeta — unchanged behaviour, moved source of truth", () => {
  it("resolves 'world' to its existing joinKey/label — regression fixture copied from the pre-move file", () => {
    expect(resolveBasemapMeta("world")).toEqual({
      joinKey: "iso_a3",
      label: "World countries (ISO-A3 codes)",
    });
  });

  it("resolves 'us-states' to its existing joinKey/label", () => {
    expect(resolveBasemapMeta("us-states")).toEqual({
      joinKey: "postal",
      label: "US states (2-letter postal codes)",
    });
  });

  it("throws loudly, naming both valid basemaps, on an unknown name", () => {
    expect(() => resolveBasemapMeta("cantons")).toThrow(
      /world.*us-states|us-states.*world/,
    );
  });
});

describe("resolveGeographyRef", () => {
  it("resolves 'world' to a GeographyRef whose joinKeyFamily matches its joinKey today", () => {
    const ref = resolveGeographyRef("world");
    expect(ref.origin).toBe("shipped");
    expect(ref.set).toBe("natural-earth-admin-0");
    expect(ref.joinKey).toBe("iso_a3");
    expect(ref.joinKeyFamily).toBe("iso_a3");
  });

  it("resolves 'us-states' with scope absent (global set, not a subset)", () => {
    const ref = resolveGeographyRef("us-states");
    expect(ref.set).toBe("us-states");
    expect(ref.scope).toBeUndefined();
  });

  it("BASEMAP_NAMES still lists exactly the two shipped names", () => {
    expect(BASEMAP_NAMES.sort()).toEqual(["us-states", "world"]);
    expect(Object.keys(BASEMAPS).sort()).toEqual(["us-states", "world"]);
  });
});

// basemapKeyFor is resolveGeographyRef's inverse — a Task 9 addition needed because GeoMatch
// stopped carrying the raw basemap-registry key once it widened to `geography: GeographyRef`.
// The catch it exists to prevent: naively reading `geography.set` where a config's `basemap`
// field is expected would write "natural-earth-admin-0" into a config that validateBasemap only
// accepts as "world" — a config that parsed before Task 9 would fail to validate after it.
describe("basemapKeyFor — the inverse of resolveGeographyRef", () => {
  it("recovers 'world' from its GeographyRef, whose own `set` is NOT 'world'", () => {
    const ref = resolveGeographyRef("world");
    expect(ref.set).not.toBe("world"); // the very mismatch this function exists to bridge
    expect(basemapKeyFor(ref)).toBe("world");
  });

  it("recovers 'us-states' from its GeographyRef (set happens to equal the key here)", () => {
    expect(basemapKeyFor(resolveGeographyRef("us-states"))).toBe("us-states");
  });

  it("falls back to the ref's own `set` for a geography with no shipped basemap key, rather than throwing", () => {
    const admin1Ref = {
      origin: "shipped" as const,
      set: "natural-earth-admin-1",
      level: "canton",
      joinKey: "name",
      joinKeyFamily: "name",
    };
    expect(basemapKeyFor(admin1Ref)).toBe("natural-earth-admin-1");
  });
});
