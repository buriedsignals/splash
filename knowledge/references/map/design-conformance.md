# Design conformance — the per-map checklist

> Source: data-to-viz (data-to-viz.com), FT Visual Vocabulary, Datawrapper Academy, WCAG 2.1.

A produced map MUST satisfy all eight rules below across static / interactive / video formats.

1. **Title = the insight**, sentence case ("Malaria incidence is highest in the Sahel", not
   "Malaria 2010-2023", not "MALARIA MAP"). Minimum 12 characters, not a bare year range, not
   ALL CAPS. Source: FT Visual Vocabulary (titling principle). Enforced by `checkGlobalMapConformance`.

2. **Description present** — a sentence stating what is shown, the time period, and the geographic
   scope (what / when / where). Source: Datawrapper Academy (annotation layer). Enforced by
   `checkGlobalMapConformance`.

3. **Source cited** — name + URL, never omitted. Rendered in every format (static, interactive,
   video) by `MapFrame`; source-band presence asserted by `checkMapFraming`. Enforced by
   `checkGlobalMapConformance`.

4. **Contrast** — furniture text must achieve WCAG ≥ 4.5:1 against its background. Source:
   WCAG 2.1 §1.4.3. Enforced by `checkGlobalMapConformance`.

5. **Legend required** — a choropleth or symbol map is undecodable without its colour/size key.
   A choropleth needs ≥ 3 scale steps; a symbol map needs ≥ 2 reference circles. Source:
   data-to-viz (map section). Enforced by `checkChoroplethConformance` / `checkSymbolConformance`.

6. **No-data colour distinct** — regions or points with missing data must use a neutral grey
   that sits outside the data ramp, so absence is never mistaken for a low value. Source:
   Datawrapper Academy (choropleth best practices). Not emitted as a violation flag — must be
   respected in the colour spec passed to `checkChoroplethConformance`.

7. **Framing / safe-area** — the title lives in a reserved top band (never overlaid on map data);
   the source lives in a reserved bottom band; nothing overruns the canvas. Band heights and
   font sizes are format-aware. Source: FT Visual Vocabulary (layout). Guaranteed by
   `MapFrame` / `resolveMapFrame`; asserted at build time by `checkMapFraming` and the
   `snap-responsive` harness.

8. **Direct labels** — proportional-symbol maps carry name + value labels on each symbol (not
   hover-only). Source: data-to-viz (symbol map). Enforced by `checkSymbolConformance` (`labeled`
   field).

---

Enforcing code:
- Guard functions: `skills/map-native/src/conformance.ts`
  (`checkGlobalMapConformance`, `checkChoroplethConformance`, `checkSymbolConformance`, `checkMapFraming`)
- Frame layout: `skills/map-native/src/core/MapFrame.tsx` + `src/core/map-format.ts`
  (`resolveMapFrame`)
- Build-time harness: `skills/map-native/scripts/snap-responsive.mjs` + `snap-a11y.mjs`
