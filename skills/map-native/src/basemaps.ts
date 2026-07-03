// The basemap registry — the single list of shipped basemaps and, for each, the
// GeoJSON feature property that a choropleth data-row's regionKey joins against. Adding
// a basemap is: drop its geojson in assets/geo/, add an entry here, and register the
// geojson in the map component's GEOJSON map. This is Node-safe (no Vite `?raw`
// imports), so it can be unit-tested and used by config validation; the actual geojson
// bytes are loaded in the component.
//
// Before this registry only `world` shipped and the join key was hard-coded to
// "iso_a3", so a sub-national choropleth (US states, etc.) was impossible (F10).
export interface BasemapMeta {
  joinKey: string; // the geojson feature property region values match against
  label: string;
}

export const BASEMAPS: Record<string, BasemapMeta> = {
  world: { joinKey: "iso_a3", label: "World countries (ISO-A3 codes)" },
  "us-states": {
    joinKey: "postal",
    label: "US states (2-letter postal codes)",
  },
};

export const BASEMAP_NAMES = Object.keys(BASEMAPS);

// Resolve a basemap's metadata, failing LOUDLY (with the valid list) on an unknown
// name — never a silent fallback to world or a mystery render.
export function resolveBasemapMeta(name: string): BasemapMeta {
  const meta = BASEMAPS[name];
  if (!meta)
    throw new Error(
      `unknown basemap "${name}" — valid basemaps: ${BASEMAP_NAMES.join(", ")}`,
    );
  return meta;
}
