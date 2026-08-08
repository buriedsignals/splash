# gantt (timeline / time spans) — render proofs

All artifacts come from ONE spec, produced through the real chain
(`NativeSpec → specToNativeConfig → produce.mjs <format>`), with every produce-time guard
armed. Nothing here is a hand-built config or a screenshot of a dev server. The deliverable is
in **French**, deliberately: this type is made entirely of dates, and a date is where an
English-only engine leaks.

| artifact | format | what it proves |
|---|---|---|
| `static.png` | static | Every row label shown IN FULL, and the time axis in French. Passed `snap-contrast` (16 labels ≥ 4.5:1, i18n furniture OK for `lang "fr"`), `snap-label-fit` (20 nodes, 0.00px overflow), render-size 1200×676 = article-web. |
| `interactive-a11y.png` | interactive | **Keyboard focus alone** (no mouse) opens the tooltip on the third bar: `sept. 2023 → mars 2024 · ≈ 7 mois`, and its accessible name reads `Enquête publique : de sept. 2023 à mars 2024`. 8 focusable bars, real source link. The `≈ 7 mois` is also the inclusive-end fix in one number — September *through* March is seven months, and the old arithmetic said six. |
| `landscape.mp4` | video | The motion build, article-web aspect. `snap-video`: animates (11.0 mean diff), no blank frames, frame 140 matches the reviewed still (0.55 %), final frame matches the rendered final still (0.55 %). |
| `video-landscape-midreveal.png` | video | **Extracted from `landscape.mp4` itself** (frame 100), not from the review still: mid-build, five bars have landed, the sixth is still growing from its start and the last two have not entered. A still of the review render could not prove the mp4 does this. |
| `square.mp4` | video | The `social-feed` channel selects `GanttSquare`, registered dims 1080×1080 asserted against the channel. |
| `portrait.mp4` | video | The `social-vertical` channel selects `GanttPortrait`, 1080×1920. |

## What the renders changed

**The row labels were being truncated, and no guard could see it.** The first real static produce
came back with five of the eight French row names cut — `Étude de faisabi…`, `Aménagement et
r…` — because the label gutter was a fixed 150px. `snap-label-fit` passed, and had to: a
truncated label fits its bounds by construction. A gantt's row label IS the subject of its bar,
so cutting it is cutting the DATA, not shortening a caption (the same defect the slope fix was
written for). The gutter is now MEASURED to the widest label via the shared `leftLabelGutterPx`,
with the same floor and ~42 % cap as slope / dumbbell / diverging-bar, so the whole family
shares one rule.
