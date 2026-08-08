# arc diagram (links along one ordered axis) — render proofs

Every artifact here comes from ONE spec (`spec.json`, beside them), produced through the real
chain — `NativeSpec → specToNativeConfig → produce.mjs <format>` — with every produce-time guard
armed. The spec is a `source,target,value` link list whose ROW ORDER is the editorial choice: the
baseline runs Les Verts · POP · PS · PLR · Le Centre · UDC because the rows name them in that
order, left to right. Reorder the spreadsheet and the axis reorders; nothing else does.

| artifact | format | what it proves |
|---|---|---|
| `static.png` | static | Six named parties on one baseline in the journalist's order, arcs whose stroke width is the weight (PS–PLR 18 against PLR–UDC 4) and node dots scaled by AREA. Every name is a name — no ellipses — which is the rule the produce guard measures on this very layout. Passed `snap-contrast` (6 labels ≥ 4.5:1, French furniture), `snap-label-fit` (10 nodes, 0.00 px overflow), render-size 1200×676 = article-web. |
| `interactive.png` | interactive | The built self-contained embed. `snap-tooltip-contrast` (12 tooltip nodes over 6 marks), `snap-tooltip-viewport` (12 tooltips inside the plot at 380/1100), `snap-reduced-motion` (6 marks immediate), `snap-label-fit` at 360/1100. |
| `a11y.png` | interactive | Keyboard focus alone opens a node's tooltip (`PS · 44 textes déposés conjointement`); 6 focusable nodes, source a real link. No `(—)` in the accessible name — see below. |
| `landscape.mp4` | video | `snap-video`: animates (9.0 mean diff), no blank frames, frame 140 matches the reviewed still (0.04 %), final frame matches the rendered final still (0.03 %). |
| `video-landscape-midreveal.png` | video | **Extracted from `landscape.mp4` itself** (frame 100): every arc is sweeping open from its LEFT FOOT at once while the node dots are still entering left→right (PLR, Le Centre and UDC have not landed). This is the exact fact `chart-walk.ts` states about this type — the dots enter one by one, the arcs share one clock — shown in the mp4 rather than asserted. |
| `square.mp4` | video | `social-feed` selects `ArcSquare`, 1080×1080. `snap-video` clean (0.02 % / 0.02 %). |
| `portrait.mp4` | video | `social-vertical` selects `ArcPortrait`, 1080×1920. `snap-video` clean (0.01 % / 0.01 %). |

## What the render changed

`ArcConfig.group` is optional and always was, but nothing had ever produced a config WITHOUT
groups: the only arc in the repo was the hand-built sample, whose nodes carry political blocs. A
link list names links, never a node's bloc — so every arc a journalist can reach has no groups,
and that path had three defects nobody had seen because nobody had rendered it:

1. a legend with ONE entry reading `—`, the internal placeholder leaking onto the graphic as if
   it were a category the reader should know (and into each node's accessible name, `PS (—)`);
2. every arc drawn in the muted "within-group" grey at 0.28 opacity — the whole picture faded to
   context, because the emphasis this type is built on is CROSS-group and there were no groups to
   cross;
3. a strip of frame reserved under the baseline for that absent legend (`legendRowCount([])`
   answers 1), which the arcs now get back.
