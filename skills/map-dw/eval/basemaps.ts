// Small allowlist of DW basemaps the eval treats as "known" without hitting the network.
// A live existence check (GET /v3/basemaps/{id}) is a separate integration test, not this gate.
// Generic small-newsroom coverage: world / europe / country-level.
export const KNOWN_BASEMAPS = new Set<string>([
  "world-2019",
  "europe",
  "europe-sovereign-states",
  "us-states",
  "us-counties-2023",
  // Symbol-map backdrops (verified live to exist + expose join keys).
  "france-metropolitan-departments",
  // Country-subdivision basemaps (verified live 2026-07-12; keys + region counts pinned
  // in src/basemap-keys.ts — the sparse-subset guard's calibration cases).
  "switzerland-2026-cantons",
  "italy-provinces-2025",
]);
