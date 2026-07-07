import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAP_TYPES } from "../src/map-types";

// Anchor: `mount.tsx` IS the reachability source of truth (it is what actually
// dispatches a config to a component at runtime). We read it as TEXT — not
// imported — so this test alarms on drift in BOTH directions without requiring
// any change to `mount.tsx`:
//   - a new `config.type === "..."` discriminator added there but not to MAP_TYPES
//   - a MAP_TYPES entry with no matching discriminator (dead/aspirational type)
// Deliberately does NOT anchor on the Remotion story-comp registries in
// `produce.mjs` — those are orthogonal to conformance/reachability.
function extractDiscriminatedTypes(): string[] {
  const src = readFileSync(join(__dirname, "../src/mount.tsx"), "utf8");
  // mount.tsx reads `config.type` once into a local (`configType`), then
  // discriminates via `configType === "<literal>"`. This regex is coupled to
  // that local's exact name: renaming it would make the pattern match zero
  // discriminators, so `extractDiscriminatedTypes()` would return just
  // `["choropleth"]` and this test would fail loudly (RED) rather than
  // silently pass — the safe direction, but not rename-proof.
  const literals = [...src.matchAll(/\bconfigType\s*===\s*"([^"]+)"/g)].map(
    (m) => m[1],
  );
  // `choropleth` has no discriminator string of its own — it's the `else`
  // default branch in mount.tsx's ternary chain.
  return [...literals, "choropleth"];
}

describe("MAP_TYPES canonical registry", () => {
  it("should deep-equal the set of types mount.tsx actually dispatches to a component", () => {
    const fromMount = extractDiscriminatedTypes().slice().sort();
    const fromRegistry = [...MAP_TYPES].sort();
    expect(fromMount).toEqual(fromRegistry);
  });

  it("should have no duplicate entries", () => {
    expect(new Set(MAP_TYPES).size).toBe(MAP_TYPES.length);
  });

  it("should omit contour (designed, never built — no discriminator in mount.tsx)", () => {
    expect(MAP_TYPES).not.toContain(
      "contour" as unknown as (typeof MAP_TYPES)[number],
    );
  });
});
