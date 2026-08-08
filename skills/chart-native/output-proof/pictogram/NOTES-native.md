# Render-verify — pictogram (the type a real newsroom asked for by name)

Every file here was rendered by `scripts/produce.mjs` from the committed sample
(`assets/sample-data/pictogram.json`, `district,residents` — 84 000 / 56 000 / 38 000 / 22 000 /
9 000), one produce per format, after the type was un-deferred. The earlier files under this
directory were rendered while the type was still `deferred` and are superseded: the sample, the
partial-icon clip and the icon hue all changed.

## Produce

```
SPLASH_CHANNEL=article-web    bun scripts/produce.mjs pictogram assets/sample-data/pictogram.json output-proof/pictogram static
SPLASH_CHANNEL=article-web    bun scripts/produce.mjs pictogram assets/sample-data/pictogram.json output-proof/pictogram interactive
SPLASH_CHANNEL=article-web    bun scripts/produce.mjs pictogram assets/sample-data/pictogram.json output-proof/pictogram video   # landscape
SPLASH_CHANNEL=social-feed    …  video   # square
SPLASH_CHANNEL=social-vertical …  video   # portrait
CHART=pictogram INTERACTIVE=1 bunx vite build && CHART=pictogram bun scripts/snap-responsive.mjs output-proof/pictogram
CHART=pictogram bun scripts/snap-a11y.mjs output-proof/pictogram/a11y.png
```

## What each artifact proves

| File | What it proves |
|---|---|
| `static.png` | the count is countable and the unit is stated: 9 / 6 / 4 / 3 / 1 icons, `= 10k residents` key on the graphic. The derived unit (`chooseUnitPerIcon` → 10 000) put the longest row at 8.4 icons, inside the target band. |
| `interactive.png` | hover isolates one row (others dim) and the tooltip reads `Downtown 84k residents`. Produce also ran `snap-tooltip-contrast` (10 nodes ≥ 4.5:1 across 5 marks), `snap-tooltip-viewport` (in-box at 380 and 1100), `snap-reduced-motion` (5 marks render immediately). |
| `responsive-360/768/1100/1600.png` | the icon size is derived from the longest row, so the row still fits and still reads at 360 px. `snap-label-fit` measured 30 text nodes across 360/1100, worst overflow 0.00 px. |
| `a11y.png` | 5 keyboard-focusable rows; focus alone (no mouse) opens the tooltip; `aria-label` reads `Old Town: 38k residents`; the source is a real link. |
| `landscape.mp4` + `video-landscape-still.png` | the icons fill left→right and the row value labels land as their rows finish — the accumulation IS the count being made. `snap-video`: animates (5.9 mean diff), no blank frames, frame 140 matches the reviewed still (0.31 %), final frame matches (0.32 %). |
| `square.mp4`, `portrait.mp4` + their stills | the same build survives the 1:1 and 9:16 boxes at `scale: 1.7`. `snap-video` OK on both (0.19 % / 0.10 % against their reviewed stills). |

## Two defects the renders caught, and where they were fixed

1. **A remainder under a quarter of an icon drew NOTHING.** Hillcrest's 22 000 is 2.2 icons; the
   first `static.png` showed two figures and empty space. The clip window was the icon's CELL, and
   the glyph's ink does not start until 25 % across it — so every remainder below 0.25 was silently
   rounded to zero on screen while the geometry said otherwise. Fixed by clipping the INK box
   (`PICTOGRAM_INK`, `PictogramChart.tsx`); locked by `tests/pictogram-partial-icon.test.tsx`, which
   measures the rendered SVG (clip rect ∩ body rect > 0) rather than the intent.
2. **The icons ignored the newsroom's house colour.** They were pinned to the engine blue, which is
   the defect the map house-colour work closed in July. A pictogram is a single-hue type like a bar,
   so the hue reaches its marks; the key's specimen icon takes it too, or the key explains another
   chart. Locked by `tests/pictogram-house-colour.test.tsx`.

Neither was visible from the config — only from the render.
