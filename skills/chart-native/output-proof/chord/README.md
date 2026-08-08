# chord (exchange within one set) — render proofs

Every artifact here comes from ONE spec (`spec.json`, beside them), produced through the real
chain — `NativeSpec → specToNativeConfig → produce.mjs <format>` — with every produce-time guard
armed. The spec is a `source,target,value` link list with FRENCH headers (`source,cible,valeur`),
which is the point: a newsroom exports its own headers, and the contract accepts them by name in
four languages. The ring's N×N matrix is derived here, never asked of the journalist.

| artifact | format | what it proves |
|---|---|---|
| `static.png` | static | Both directions of each pair as their own ribbon (Pâquis→Eaux-Vives 32 against Eaux-Vives→Pâquis 18 — the asymmetry the title claims), the ring ordered by total, one Okabe-Ito hue per entity. Passed `snap-contrast` (4 labels ≥ 4.5:1, French furniture), `snap-label-fit` (8 nodes, 0.00 px overflow), render-size 1200×676 = article-web. **This is also the render that showed the radius defect**: the first produce drew the ring at a third of its band, because one fixed 64 px label gutter was applied to both axes — see the note below. |
| `interactive.png` | interactive | The built self-contained embed. `snap-tooltip-contrast` (12 tooltip nodes over 4 marks), `snap-tooltip-viewport` (8 tooltips inside the plot at 380/1100), `snap-reduced-motion` (4 marks immediate), `snap-label-fit` at 360/1100. |
| `a11y.png` | interactive | Keyboard focus alone opens an entity's tooltip, and it reads **`39 sortants · surtout avec Pâquis (50), Servette (40)`** — the render that caught `39 out` / `most with` being spoken in English inside a French chart (now `LocaleSpec.flow`). The focused entity keeps full opacity while the others dim; the source renders as a real link. |
| `landscape.mp4` | video | `snap-video`: animates (15.9 mean diff), no blank frames, frame 140 matches the reviewed still (0.26 %), final frame matches the rendered final still (0.26 %). |
| `video-landscape-midreveal.png` | video | **Extracted from `landscape.mp4` itself** (frame 100): the figure has bloomed and the ribbons are in while the arc labels are not — the stated gesture ("the arc labels fade in last") happening in the mp4. |
| `square.mp4` | video | `social-feed` selects `ChordSquare`, 1080×1080. `snap-video` clean (0.25 % / 0.25 %). A circle is the one form whose aspect behaviour is not obvious; this is the render that shows the ring stays a ring. |
| `portrait.mp4` | video | `social-vertical` selects `ChordPortrait`, 1080×1920. `snap-video` clean (0.14 % / 0.14 %). |

## What the render changed

The ring used `min(innerWidth, innerHeight) / 2 - 64`: ONE fixed gutter, applied to both axes.
An arc label sits BESIDE the ring, so horizontally it needs its full width and vertically only a
line — taking the larger of the two spends the label's WIDTH out of the frame's HEIGHT, and the
article frame (1200×676) is short. The circle came out at radius 94 in a band that could hold
150, floating in a third of its own plot. The gutters are now measured per axis from the labels
this chart actually carries (`ChordOptions.labelGutterX/Y`), so a ring of short names gets a
bigger circle instead of both getting the smaller answer.
