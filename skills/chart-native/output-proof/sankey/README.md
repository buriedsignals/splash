# sankey (flow through stages) — render proofs

Every artifact here comes from ONE spec (`spec.json`, kept beside them), produced through the
real chain — `NativeSpec → specToNativeConfig → produce.mjs <format>` — with every produce-time
guard armed. Nothing is a hand-built config or a screenshot of a dev server. The spec is a
`source,target,value` link list, the shape the whole flow family reads; the stages, the node
order and the colours are all DERIVED from it (`flow-links.ts`).

| artifact | format | what it proves |
|---|---|---|
| `static.png` | static | The stage layering on a real render: the five origins in column 0, the grid in 1, the five uses in 2, and every ribbon pointing forward. The books balance — 100 in, 100 out, with `Pertes 5` on the picture as its own node, which is exactly the repair the conservation guard names. Passed `snap-contrast` (11 labels ≥ 4.5:1, French furniture), `snap-label-fit` (15 nodes, 0.00 px overflow), render-size 1200×676 = article-web. |
| `interactive.png` | interactive | The built self-contained embed. `snap-tooltip-contrast` (40 tooltip nodes over 10 marks ≥ 4.5:1), `snap-tooltip-viewport` (20 tooltips inside the plot at 380 and 1100 px), `snap-reduced-motion` (10 marks render immediately, no animation after load), `snap-label-fit` at 360/1100. |
| `a11y.png` | interactive | Keyboard focus alone (no mouse) opens a ribbon's tooltip: `16 · Solaire → Réseau`. 10 focusable links; the source renders as a real link. The accessible name reads **`Solaire vers Réseau`** — the render that caught the English `to` a French deliverable was speaking to screen readers (now `LocaleSpec.flow`, four languages). |
| `landscape.mp4` | video | The motion build, article-web aspect. `snap-video`: animates (23.5 mean diff), no blank frames, frame 140 matches the reviewed still (0.04 %), final frame matches the rendered final still (0.04 %). |
| `video-landscape-midreveal.png` | video | **Extracted from `landscape.mp4` itself** (frame 100), not from the review still: the ribbons are in and the node LABELS are not — the stated gesture ("node/value labels fade last") happening in the mp4. A still of the review render could not show this. |
| `square.mp4` | video | `social-feed` selects `SankeySquare`, 1080×1080. `snap-video` clean (0.02 % / 0.02 %). |
| `portrait.mp4` | video | `social-vertical` selects `SankeyPortrait`, 1080×1920. `snap-video` clean (0.02 % / 0.02 %). |
