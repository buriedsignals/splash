# Brief — CO₂ ranking scrolly

**Editorial intent:** Long-form explainer. The editor wants a scroll-paced walk through the ranking of national CO₂ shares, revealing one country at a time from the biggest emitter down to the smallest. The story is the ranked magnitudes, not geographic position.

**Story frame:** A handful of countries drive most of the world's CO₂ — and the gap between the top and the rest is staggering.

**Data:** Share of global CO₂ emissions (%), Global Carbon Project 2023.
China 31 · United States 14 · India 7 · Russia 5 · Japan 3 · Germany 2 · Brazil 1.

**Format decision:** Chart scrolly (Gate 3 — irreducibly sequential author-paced ranking reveal, 7 discrete highlight states on a single bar chart, long-form feature, resources assumed). Map path rejected at Gate 5 — ranking framing, not spatial pattern.

**Producer:** `scrolly` + `nativeType: "bar"`.

**Produce command (from skills/scrolly/):**
```
bun scripts/produce.mjs ../../docs/splash/workflow-tests/case22/config.json ../../docs/splash/workflow-tests/case22/out
```
