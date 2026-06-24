# Live e2e proof — choropleth

Produced via `produceMap` (which reuses the dw-chart `datawrapper.ts` client) from the generic
`eval/cases/eu-renewables.json` case. **Left published for human review — do not delete.**

- **publicUrl:** https://datawrapper.dwcdn.net/L2Uko/1/
- **chartId:** `L2Uko`
- **PNG:** `eu-renewables.png` (this folder) — exported from the live chart.

## What the exported PNG shows (the real gate — looked at, not just asserted)

- All 6 countries coloured by value: Sweden 66 (darkest), Germany 46, Spain 42, Italy 36,
  France 25 (light), Poland 16 (lightest). **Data is bound** via `axes.keys=code` →
  `map-key-attr=DW_STATE_CODE` (ISO-3).
- A proper **light→`#0072B2` blue sequential gradient** on regions and legend (16→66).
  **NOT black** — the bug the spike resolved.
- Insight title, Eurostat source, and `aria-description` (alt = the insight) all present.

## Colour-scale resolution (the load-bearing detail)

- **Failing:** `visualize.gradient = {colors:[…]}`, and `colorscale` that included `stops: "equidistant"`
  (a string) alongside `colors`, both rendered every region + the legend **black**.
- **Working:** `visualize.colorscale = { mode:"continuous", interpolation:"equidistant",
  colors:[{color,position}…] }` — NO `stops` string. Renders the correct light→blue gradient.
- Verified by creating real charts, patching candidates, publishing, exporting PNG, and LOOKING.
  The fix lives in `src/spec-to-map-metadata.ts` (it never emits a `stops` string).

## Caveat

The eval corpus is self-authored and grounded in best-practice — a relative-improvement instrument,
not absolute truth (same stance as suggest-chart / suggest-article). A passing unit test does not
prove the map looks right; the exported PNG above is the gate.
