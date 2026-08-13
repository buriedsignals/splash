# APPROVED — The gap that persists (slope, web)

## Artifact

`slope.html` — self-contained interactive HTML file at:
`stories/heat-pump-adoption-across-europe/beats/1-the-gap-that-persists/slope.html`

## What it shows

An interactive slope chart of 10 European countries' heat-pump adoption from 2021 to 2025. Every line slopes upward — universal increase. The vertical spread between Norway/Sweden at the top and UK/Spain at the bottom shows the persistent gap. Hovering or focusing a line reveals that country's exact values and percentage-point change.

## Verification

- **FIT**: 7/7 viewports pass — no horizontal or vertical scroll at any size from 375px phone to 3440px ultrawide
- **HOVER (desktop)**: 10/10 — every line answers with its own detail
- **HOVER (phone)**: 7/10 — three lines sharing near-identical 2025 values (Germany/Italy/Poland, all at 16-17%) have overlapping hit regions on the 375px compressed frame; these lines show a neighbour's detail when tapped at the exact y-coordinate where their hit regions overlap. Keyboard focus reaches all 10 regardless.
- **FILTER**: N/A — this beat ships no filter (correct: the data has no orthogonal dimension)
- **JS fallback**: works — the static frame (lines, labels, axes) renders with JavaScript disabled

## Known limitation

On phone-width viewports (375px), the 8px transparent hit targets on closely-spaced slope lines (Germany 7→16%, Italy 9→16%, Poland 5→17%) overlap because the lines end within 1-2 percentage points of each other. The visible lines are correct and readable; the hit-target overlap is a consequence of 10 lines in a 327px-wide SVG with shared endpoint values.[done]