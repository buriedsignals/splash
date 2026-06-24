// Small allowlist of DW basemaps the eval treats as "known" without hitting the network.
// A live existence check (GET /v3/basemaps/{id}) is a separate integration test, not this gate.
// Generic small-newsroom coverage: world / europe / country-level.
export const KNOWN_BASEMAPS = new Set<string>([
  "world-2019",
  "europe",
  "europe-sovereign-states",
  "us-states",
  "us-counties-2023",
]);
