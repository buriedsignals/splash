# `stacked-area` render-verify notes

Spec: `output-proof/stacked-area/spec-native.json` — 6 rows (2015/2017/2019/2021/2023/2025) ×
coal/gas/renewables (Ember-style German power-mix data), a composition-over-time story
(coal/gas shrinking, renewables growing, continuous numeric year x-axis).

Command (absolute paths, `static` format):
```
bun skills/chart-native/scripts/produce-from-spec.mjs \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/stacked-area/spec-native.json \
  /Users/rmdms/Sites/Professional/splash/skills/chart-native/output-proof/stacked-area static
```

Produce output (relevant lines):
```
[produce stacked-area] conformance: OK (0 violations).
[produce stacked-area] building static + interactive…
...
wrote static.png
tooltip text: coal 15 TWh generated
wrote interactive.png
PRODUCE_RESULT {"static":".../static.png", ...}
```

**`conformance: OK (0 violations)`** — confirmed.

## Visual observations from reading `static.png`

- **★ The a11y fix, confirmed at the render**: the right-edge direct band labels — "renewables 210",
  "gas 55", "coal 15" — all render in solid **dark ink/black text**, clearly legible against the white
  background. Before the fix these were painted in the band's own colour (`AREA_COLORS[i]` — skyblue
  for coal, orange for gas), which fails WCAG 4.5:1 for text (skyblue ~1.9:1, orange ~2.1:1 on white).
  The label carries the value in ink; the band's fill carries the hue — same rule as the vermillion
  precedent. Each band stays identifiable without relying on the (now ink) label colour: coal reads as
  sky-blue at the bottom, gas as orange in the middle, renewables as blue on top, and the label's
  *position* at the band's right edge ties it back to the correct band.
- **Bands stack correctly, composition-over-time reads**: coal (sky-blue, bottom) shrinks from 120→15
  TWh, gas (orange, middle) shrinks from 90→55 TWh, renewables (blue, top) grows from 40→210 TWh — the
  crossover (renewables overtaking the coal+gas combined band) is visually obvious around 2021–2022,
  matching the title's claim.
- **Baseline 0**: y-axis starts at 0 with gridlines every 50 up to 250; the whole stack visibly rises
  from the same zero line (no floating bands).
- **Okabe-Ito palette, in `STACKED_AREA_COLORS` order (skyblue-first)**: rendered colours are
  `#56B4E9` sky-blue (coal, series index 0), `#E69F00` orange (gas, index 1), `#0072B2` blue
  (renewables, index 2) — exactly `STACKED_AREA_COLORS[0..2]`, confirming the guard validated the SAME
  colours the component painted.
- **Title unclipped**: "Renewables have overtaken coal as Germany's largest power source" renders in
  full on one line above the "TWh generated" subtitle, no overlap with the plot or the source line.
- **Source rendered**: "Source: Ember, 2025 global electricity review" at the bottom-left, clear of the
  x-axis year labels.

## Existing component tests (unaffected by the label-colour change)

`bun test tests/stacked-area-geometry.test.ts tests/stacked-area-conformance.test.ts` — both still pass
(the a11y fix only changes a `fill` on a `<text>` element; it touches no geometry, no domain, no reveal
math).
