# Tuning knobs — every configurable value and where it lives

| Want | Knob | Where |
| --- | --- | --- |
| The band a BEAT's frames keep clear at their own bottom. The seed keeps none (the card travels the whole frame and rests nowhere); a beat that derives a camera or a plot box from its own copy still passes one, and the scaffold records it without placing anything against it | `0` (seed) | `proseLane`, `renderScrolly` (emitted as `--prose-lane` / `data-prose-lane`) |
| How much of the FITTED chart frame's own height the plot uses, now that nothing is reserved below it | `0.90` | `CHART_LAYOUT.plot.bottom`, `ScrollySeed.tsx` |
| The frame width below which the card goes edge to edge instead of taking the reading measure — 410px stops being 70% of the frame at 586 | `600px` | the `min-width` media query, `buildCss`, `render-scrolly.mjs` |
| The box-aspect range a COVER-cropped frame's annotations are guaranteed to survive | `{ min: 0.42, max: 2.4 }` | `ASPECT_ENVELOPE`, `ScrollySeed.tsx` |
| How many narrative steps the seed carries | `4` | `STEPS_META`, `ScrollySeed.tsx` — any count ≥ 2 works, with at least three distinct `frameKind`s including a map and a chart (canon-enforced) |
| The drawn frame's own design canvas | `640 × 900` | `FRAME`, `ScrollySeed.tsx` |
| The chart's plot box and its geometry-only viewBox | `plot` / `viewBox` | `CHART_LAYOUT`, `ScrollySeed.tsx` |
| The map plate's size and camera | `--width 1000 --height 640`, zoom `9` | `CAMERA`, `bake-plate.mjs` |
| The frame the graphic fills — the component's own height, minus the fixed header's row | `100%` of `.scrolly`, `grid-template-rows: auto minmax(0, 1fr)` | `.scrolly`, `buildCss`, `render-scrolly.mjs` |
| How long a reader scrolls through one step — the same for every step, including the last, as a fraction of the TRACK (not the viewport). Raising it buys clear air between two cards and costs step/progress lock-step | `140%` | `.step` min-height, `buildCss`, `render-scrolly.mjs` |
| The card's own max width, above the regime change | `min(46ch, 100%)` — 409px rendered | `.step-panel` inside `@media (min-width: 600px)`, `buildCss`, `render-scrolly.mjs` |
| The card's own max width, below it | `100%` of the frame, edge to edge | `.step-panel`, `buildCss`, `render-scrolly.mjs` |
| The header's own reading measure (the graphic does NOT share it) | `640px` | `.scrolly-header` max-width, `buildCss`, `render-scrolly.mjs` |
| The header's own side gutter | `clamp(16px, 6vw, 56px)` | `.scrolly-header`, `buildCss`, `render-scrolly.mjs` |
| The card's own side gutter, on the viewports that have one | `clamp(16px, 6vw, 56px)` | `--prose-gutter`, `buildCss`, `render-scrolly.mjs` |
| The share of the frame's width above which a card must go edge to edge instead — frames keep their axis furniture in the outer ~15%, so a card's own vertical edge must land inside the middle 70% or nowhere | `0.70` | assertion F4, `verify-scrolly.mjs` |
| The step-boundary swap's transition — the ONLY animated property, and only at a boundary | `0.3s` | `buildCss`, `render-scrolly.mjs` |
| The band the interaction layer measures every panel against | the card layer's own scrollport rect, which covers the graphic edge to edge — nothing to configure, and nothing read off the markup | `initScrolly`, `interaction.mjs` |
| The continuous signal a consumer scrubs on, and where the reference line sits | the fractional index of the panel on the LANE's centre line, published as `data-progress` on the root | `measureProgress`, `interaction.mjs` |
| How far the active step may drift from the progress before the guard calls it a desync | `0.65` of a step (the crossover itself measures 0.50-0.54) | assertion H, `verify-scrolly.mjs` |
| How long a reader dwells on one step while the guard drives, in animation frames — derived from each beat's own step height so a phone and a desktop get the same dwell, never the same pixel rate | `60` | `FRAMES_PER_STEP`, `verify-scrolly.mjs` |
| The WCAG floor `renderScrolly`'s own panel-contrast tripwire enforces | `4.5` | `renderScrolly`, `render-scrolly.mjs` |
| The drawn step's own illustrated water level and day label (never a plotted value) | `{ waterLevelT, dayLabel }` | `DRAWN_VARIANT`, `render-scrolly.mjs` |
