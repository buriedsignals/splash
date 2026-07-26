// scrolly-types — leaf module, imports nothing. The types each scrolly track actually hosts.
//
// Extracted out of Scrolly.tsx so this data can be read (by tests, or anything else) WITHOUT
// pulling in the full dispatch component tree — which transitively imports ScrollyMap.tsx, whose
// module-scope key guard throws when VITE_MAPTILER_KEY is unset. On a clean checkout (no .env),
// that throw leaves Scrolly.tsx's exports in the temporal dead zone, so anything importing these
// Sets through Scrolly.tsx fails with a TDZ ReferenceError instead of the actual missing-key
// error. Reading this leaf module instead sidesteps the throw entirely.
//
// EXPORTED because they are the source of truth for two readers that must never disagree:
// Scrolly.tsx's dispatch (which re-exports them, so existing importers of "../src/Scrolly" keep
// working), and the KB drift test that checks which sheets may declare the `scrolly` format.
export const CHART_SCROLLY_TYPES = new Set(["line", "bar", "scatter"]);
// `choropleth` is the dispatch's default branch (ScrollyMap + computeChoropleth), so it is
// hosted — but the default must not swallow types that are NOT. `route` has no branch and was
// being drawn as a choropleth: a wrong render, silently.
export const MAP_SCROLLY_TYPES = new Set([
  "symbol",
  "hex-grid",
  "dot-density",
  "locator",
  "cartogram",
  "choropleth",
]);
