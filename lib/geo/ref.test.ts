import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  BASEMAPS,
  BASEMAP_NAMES,
  resolveBasemapMeta,
  resolveGeographyRef,
  basemapKeyFor,
  fileExtensionFor,
  type GeographyRef,
} from "./ref";

const assetsGeoDir = join(
  import.meta.dir,
  "../../skills/map-native/assets/geo",
);

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

  it("BASEMAP_NAMES lists the three shipped names, ADM1 included", () => {
    expect(BASEMAP_NAMES.sort()).toEqual([
      "natural-earth-admin-1",
      "us-states",
      "world",
    ]);
    expect(Object.keys(BASEMAPS).sort()).toEqual([
      "natural-earth-admin-1",
      "us-states",
      "world",
    ]);
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

  it("falls back to the ref's own `set` for a geography with no shipped basemap key at all, rather than throwing", () => {
    const hypotheticalRef = {
      origin: "shipped" as const,
      set: "some-future-unregistered-set",
      level: "region",
      joinKey: "name",
      joinKeyFamily: "name",
    };
    expect(basemapKeyFor(hypotheticalRef)).toBe("some-future-unregistered-set");
  });
});

// The ADM1 path (C6) — dead until this registry names the real, shipped, committed file.
// Before this fix, basemapKeyFor's own fallback above (returning `ref.set` unchanged) was ALL
// that stood between an ADM1 match and produce: resolve-for-produce.ts then appended a hardcoded
// ".geojson" to that key and hit a raw mapshaper ENOENT, because the committed asset is
// `natural-earth-admin-1.topojson`, not `.geojson`.
describe("the ADM1 geography ref — the shipped asset it must name", () => {
  it("basemapKeyFor recovers a REGISTERED key for a matchAdm1Index-shaped ref, not the fallback", () => {
    // Shaped exactly like matchAdm1Index's own emitted GeoMatch.geography
    // (skills/map-native/src/geo-match.ts) — the real runtime object this bridges.
    const admin1Ref: GeographyRef = {
      origin: "shipped",
      set: "natural-earth-admin-1",
      level: "canton",
      joinKey: "name",
      joinKeyFamily: "name",
    };
    expect(basemapKeyFor(admin1Ref)).toBe("natural-earth-admin-1");
  });

  it("the recovered key + extension name a FILE THAT ACTUALLY EXISTS in assets/geo — the fix for the ENOENT", () => {
    const admin1Ref: GeographyRef = {
      origin: "shipped",
      set: "natural-earth-admin-1",
      level: "canton",
      joinKey: "name",
      joinKeyFamily: "name",
    };
    const key = basemapKeyFor(admin1Ref);
    const ext = fileExtensionFor(admin1Ref);
    expect(ext).toBe("topojson"); // the committed asset, not the guessed ".geojson"
    expect(existsSync(join(assetsGeoDir, `${key}.${ext}`))).toBe(true);
  });

  it("fileExtensionFor still resolves 'geojson' for the two pre-existing entries — nothing else changes", () => {
    expect(fileExtensionFor(resolveGeographyRef("world"))).toBe("geojson");
    expect(fileExtensionFor(resolveGeographyRef("us-states"))).toBe("geojson");
  });

  it("BASEMAPS carries the ADM1 entry with a real join key, not a placeholder", () => {
    expect(BASEMAPS["natural-earth-admin-1"]).toBeDefined();
    expect(BASEMAPS["natural-earth-admin-1"]!.joinKey).toBe("name");
  });

  it("resolveGeographyRef('natural-earth-admin-1') resolves too, mirroring 'world'/'us-states'", () => {
    const ref = resolveGeographyRef("natural-earth-admin-1");
    expect(ref.origin).toBe("shipped");
    expect(ref.set).toBe("natural-earth-admin-1");
    expect(fileExtensionFor(ref)).toBe("topojson");
  });
});
