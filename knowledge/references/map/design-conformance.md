# Design conformance — the per-map checklist

> Source: data-to-viz (data-to-viz.com), FT Visual Vocabulary, Datawrapper Academy, WCAG 2.1.

A produced map MUST satisfy all ten rules below across static / interactive / video formats.

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

6. **Default basemap; only data is painted** — the basemap keeps its DEFAULT MapTiler rendering
   across all formats (no custom water colour). **Only data-bearing regions carry a choropleth
   fill; no-data regions are NOT painted — they show the default basemap, exactly like the ocean
   and like the symbol map's basemap.** In the motion/video formats only the data regions change
   colour (no-data and ocean stay constant). This keeps the map clean and never lets a no-data
   overlay be mistaken for a low value. (The interactive/static web format MAY still key a "no
   data" swatch in its legend — `NO_DATA_COLOR` in `src/theme/colors.ts` — where a legend explains
   it; the video formats carry no legend, so no-data is simply unpainted.) Source: Datawrapper
   Academy (choropleth best practices — absence must never read as a value); cartographic
   convention (let the basemap be the basemap).

7. **Framing / safe-area** — the title lives in a reserved top band (never overlaid on map data);
   the legend occupies a RESERVED band sized to its rendered height — no data feature renders
   under the title or the legend; furniture keeps a safe gutter from the frame edges; nothing
   overruns the canvas. Band heights and font sizes are format-aware. `resolveMapFrame` accepts
   a `legendHeight` param and sets `pad.bottom = max(sourceBand, legendHeight + margin)` so the
   data extent is always clear of the legend. Source: FT Visual Vocabulary (layout),
   Datawrapper Academy. Guaranteed by `MapFrame` / `resolveMapFrame`; asserted at build time
   by `checkMapFraming` (including `legendHeight` overrun check) and the `snap-responsive`
   harness (title gutter assertion).

8. **Direct labels** — proportional-symbol maps carry name + value labels on each symbol (not
   hover-only). A directly-labelled value states its unit — "296$bn" not "296". Source:
   data-to-viz (symbol map). Enforced by `checkSymbolConformance` (`labeled` and `labelHasUnit`
   fields).

9. **Furniture and controls follow the basemap theme** — the title pill, source line, and
   interactive controls (zoom +/−, reset) MUST match the basemap theme: dark furniture and
   controls on a dark basemap (`mapStyle: dataviz-dark`), light on a light basemap. A white pill
   on a dark basemap is a conformance failure. Furniture text meets WCAG ≥ 4.5:1 against its
   themed pill in both modes (`FRAME_COLORS` light: ink 17.40:1, muted 6.39:1; `FRAME_COLORS_DARK`
   dark: ink 16.12:1, muted 10.19:1). Sources: WCAG 2.1 §1.4.3; the toolkit's `mapStyle`
   capability (`resolveMapStyle` in `src/route-geo.ts`). Implemented via `MapFrame` `dark` prop
   + dark-control CSS injection in `RouteMap`.

10. **Colour ramp must be CVD-safe** — every sequential/diverging ramp a map paints (choropleth,
    hex-grid, cartogram) is validated against the vetted, colour-blind-safe registry
    (`isCvdSafeRamp` in `src/theme/scale.ts`); a custom-array palette that isn't drawn from the
    vetted colour set is rejected, even when the type only computes it at produce time (not just
    at config-validate time). Source: ColorBrewer / CVD-safe design convention. Enforced by
    `checkPaletteConformance`, called from `checkChoroplethConformance`, `checkHexGridConformance`,
    and `checkCartogramConformance` (`skills/map-native/src/conformance.ts`).

---

Enforcing code:
- Guard functions: `skills/map-native/src/conformance.ts`
  (`checkGlobalMapConformance`, `checkChoroplethConformance`, `checkSymbolConformance`,
  `checkHexGridConformance`, `checkCartogramConformance`, `checkMapFraming`, `checkPaletteConformance`)
- Frame layout: `skills/map-native/src/core/MapFrame.tsx` + `src/core/map-format.ts`
  (`resolveMapFrame`)
- Build-time harness: `skills/map-native/scripts/snap-responsive.mjs` + `snap-a11y.mjs`
