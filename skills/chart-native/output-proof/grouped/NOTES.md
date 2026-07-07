# Render-verify: grouped-bar end-to-end (Task 11)

`spec.json` is a realistic `NativeSpec` (`producer: "chart-native"`, `nativeType: "grouped"`) with a
4-region × urban/rural wide CSV, run through the full production path —
`produce-from-spec.mjs` → `specToNativeConfig` (mapper) → `produce.mjs` (produce-time conformance
guard, then build) — not a hand-built `GroupedConfig` fed directly to the component (that path was
already exercised by the earlier Task 6 proof still present in this directory: `a11y.png`,
`responsive-*.png`, `reveal-*.png`, `video-still-*.png`, the three `.mp4`s). This is the first
render-verify of the *NativeSpec* contract specifically.

`bun scripts/produce-from-spec.mjs output-proof/grouped/spec.json output-proof/grouped static`
(run with cwd `skills/chart-native` — see footgun note below) printed
`[produce grouped] conformance: OK (0 violations).` before building, confirming the default
Okabe-Ito series palette + ink text + baseline-0 passes the produce-time guard for this real data
shape. It then built static + interactive and wrote `static.png`, `interactive.png`, and the
self-contained `interactive.html` (passed `assert-selfcontained.mjs`).

Verified by eye on `static.png`: title "Urban wages pulled ahead of rural pay in every region" is
fully visible, not clipped, above the unit subtitle "median monthly wage (€)". Y-axis starts at 0
(baseline rule) with gridlines at 500/1k/1.5k/2k/2.5k. Four region groups (North, South, East,
West) each show two clearly distinguishable bars — Okabe-Ito blue (urban) vs orange (rural), values
matching the fixture (North 2400/1900, South 2250/1750, East 2300/1820, West 2500/2010). Legend at
bottom-left labels both series ("urban", "rural") with matching swatches. Source line "Source:
INSEE 2025" renders bottom-left. No clipping or overlap anywhere.

Verified by eye on `interactive.png` (automated hover screenshot from `snap-proof.mjs`): hovering
the North/urban bar shows a tooltip reading "2.4k median monthly wage (€) / North · urban" — region,
series, and formatted value all present, matching the produce log's captured tooltip text. The
hovered bar stays full-saturation while the other seven dim to a lighter tint, giving clear
hover-focus feedback consistent with the rest of the chart-native family.

Widths beyond the default build (360/768/1100/1600) were not re-run for this exact NativeSpec —
the pre-existing `responsive-*.png` in this same directory (Task 6) already exercised the
`GroupedBarChart` component's responsive behavior at those four widths on equivalent data, and the
snap harness (`snap-responsive.mjs`) is what enforces no-overflow/in-viewport titles across widths
for every type at gate time, not this proof directory.

**Footgun found (tooling, not the grouped-bar contract):** running
`bun skills/chart-native/scripts/produce-from-spec.mjs skills/chart-native/output-proof/grouped/spec.json skills/chart-native/output-proof/grouped static`
from the **repo root** (as a literal reading of the command would suggest) silently writes output
into a doubly-nested `skills/chart-native/skills/chart-native/output-proof/grouped/` directory
instead of the intended path, and still exits 0 with a `PRODUCE_RESULT` that *looks* correct. Cause:
`produce-from-spec.mjs` re-execs `produce.mjs` with `cwd: skills/chart-native`, so a relative
`outDir` argument passed from repo root gets re-resolved against that inner cwd. Worked around here
by running with `cwd: skills/chart-native` and repo-root-relative-minus-prefix paths
(`output-proof/grouped/spec.json`, `output-proof/grouped`) — no source change made, per this task's
verification-only scope. Filed as a finding, not fixed.
