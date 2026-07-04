# The world's most valuable brands, 2024

**Deliverable:** Punchy animated social clip — square format (1:1), short-form motion graphic for social feeds.

**Brief:** A ranking of the world's seven most valuable brands in 2024, led by Apple at $574bn. The editor wants a short animated reveal where brands animate in ranked order — suited to TikTok/Reels/social video tab.

**Data source:** Interbrand / Kantar BrandZ 2024.

**Routing decision:** chart-native · ranked bars · horizontal · sort desc · video output (square mp4).

**Intent:** Ranking (order matters) — which brand is worth the most.

**Chart family (Gate 0):** Ranking → sorted bar chart (`d3-bars`, horizontal, `sort: "desc"`).

**Format trigger (Gate 4B):** Distribution is social/vertical (square social clip explicitly requested). Motion is the correct output for a native social video tab. Gate 4B fires.

**Producer:** chart-native (motion / animated reveal mp4 is the explicit ask; dw-chart would produce a static image that is invisible in a native social video tab).

**Produce command:**
```bash
bun skills/chart-native/scripts/produce-from-spec.mjs docs/atelier/workflow-tests/case24/config.json docs/atelier/workflow-tests/case24/out all
```

Outputs: static PNG + interactive HTML + 3 mp4s (landscape, square, portrait). Use the square mp4 for delivery.
