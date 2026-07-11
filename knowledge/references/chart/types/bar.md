# Bar / Column — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — magnitude & ranking columns —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (barplot caveats) · credited.
> Inherits: `global/dataviz.md` (L0) and the cartesian-XY chart layer (L1).

A bar/column chart encodes one value per category as the **length** of a rectangle from a common
baseline. Length is near the top of the perception hierarchy → bars are the safe default for
**magnitude** ("how big") and **ranking** ("what order").

## When to use / when NOT

- **Use** for: comparing magnitudes across categories; ranking items; a single series of values
  keyed by a category or a small number of periods.
- **Not** for: a continuous trend over many time points → that is a **line** (`line.md`). A few
  periods (≤ ~8) can be columns, but a real time series is a line.
- **Not** for: part-to-whole where the components matter → stacked bar or, sparingly, pie.
- **Not** for: more than ~20–25 categories → the chart becomes a comb; filter, group into "Other",
  or switch to a dot plot / small multiples.

## Correctness "de base" (the rules that are specific to bars)

1. **Baseline MUST be 0.** Bars encode value by length, so a truncated y-axis (starting at, say, 80
   when values are 80–100) visually multiplies small differences — a textbook lie. This is the
   single hardest rule for bars and is non-negotiable (it does *not* apply to line charts, which
   encode position, not length). → enforced by the conformance guard (`bar-conformance`).
2. **Order deliberately.** For a *ranking* intent, sort by value (descending for "biggest first").
   For a *categorical* intent with a natural order (age bands, months), keep that order. Never leave
   bars in arbitrary/alphabetical order when the story is about magnitude.
3. **One value per bar, gaps between bars.** Bar width carries no meaning; keep a consistent gap
   (~20–35% of the band) so bars read as discrete, not as a histogram (where bars touch).
4. **Direct value labels over a legend/axis read.** Label **every** bar with its value (abbreviated:
   `10.4k`, not `10,381`) at the end of the bar; this beats forcing the eye back to the axis. The
   axis can then be light or dropped. (Inherits the global "direct labels" rule.) The label sits
   **outside** the bar (above a column, right of a horizontal bar) so a too-short bar never clips it.
   This invariant holds at **every frame of the reveal**, not only the final hold: the label rides the
   bar's *animated* end and fades in **with** the bar, so a mid-build video still (the frame captured
   for the deliverable, ≈60 % through) never ships a label-less bar — the two smallest, last-staggered
   bars included. (Regression: an Olympic-medals ranking video shipped its GER/NGR bars unlabelled
   because the label was gated to the last 35 % of each bar's growth; the still froze before that.
   Guarded by `tests/bar-value-label-reveal.test.tsx`.)
5. **Highlight at most one bar.** A single accent colour on the key bar (the subject of the
   headline) is a strong editorial move; everything else stays the neutral series colour. Stay
   within ≤2 colours (global rule). Default: no highlight, single series colour.

## Orientation — vertical columns vs horizontal bars

- **Vertical (columns)** when: few categories (≤ ~8) AND short labels; or the x is quasi-temporal
  (a few periods). Reads as "taller = more".
- **Horizontal (bars)** when: long category labels (they fit on one line to the left, no rotation);
  OR many categories; OR a ranking (the eye scans a vertical list top-to-bottom naturally).
- **Never rotate x labels 90°** to fit long labels on columns — switch to horizontal bars instead.
- Rule of thumb the producer applies as the default: `horizontal` if any label is long or there are
  > 8 categories, else `vertical` — overridable.
- **The left gutter FITS the longest label — never clip.** A horizontal bar's category labels live in
  the left gutter; `BarChart` sizes that gutter to the widest label (measured from the data), so a long
  name ("Administration générale et finances") renders in full instead of a truncated "Administratio…".
  The gutter is capped at ~45% of the width so it can't starve the plot — only past that cap does a
  pathologically long label fall back to an ellipsis (`core/text.ts` `truncate`). A short-label chart
  keeps the default gutter, so its layout is unchanged. (Verified by `tests/bar-longlabels.test.tsx`.)
- **A vertical column's category label WRAPS — never truncates to a stub.** A column's label is centred
  under its (narrow) bar; on a portrait / 9:16 canvas a long name is wider than its column and a fixed
  single-line `truncate` clipped it to an ellipsis stub ("Apple Mu…", "Amazon M…", "Tencent…",
  "YouTube…" — render-confirmed on a music-streaming ranking). The rule: a long vertical label **wraps
  onto ≤2 lines** to the band STEP (centre-to-centre spacing, the real collision limit — not the bar
  width), stacked downward below the axis; the extra row is reserved in the bottom margin so it clears
  the source line (and, for grouped/stacked, pushes the legend down). This is the vertical twin of the
  horizontal gutter rule and lives ONCE in the shared bar layout (`core/text.ts` `verticalCatLines` /
  `bandStepPx` / `verticalCatMaxLines`), so **every** vertical bar-family type (bar, grouped, stacked)
  and **every** channel (landscape / square / portrait) inherits it. A short label that already fits is
  returned unchanged (one line) → landscape/square layouts are not regressed. Only a pathologically long
  single word (no wrap point) falls back to an ellipsis, as a last resort. (Verified by
  `tests/bar-portrait-labels.test.tsx`; mechanically netted at portrait by the layout audit.)

## data-to-viz caveats (credited)

- A barplot with too many bars becomes unreadable — consider a lollipop (less ink) or ordering +
  filtering. (data-to-viz: "barplot")
- Error/uncertainty is invisible on a plain bar; if it matters, the magnitude story may need a dot
  plot with intervals instead.
- Grouped bars (several series per category) are legible only up to ~3 series and few categories;
  beyond that prefer small multiples — out of scope for the single-series cut.

## Motion grammar (how a bar *builds*, distinct from a line)

A bar does **not** "draw on" like a line — it **grows from the baseline**. See `formats/video.md`
for the shared video discipline; the bar-specific gesture:

- chrome (value axis + gridlines) wipes in first;
- each bar **grows from the baseline to full length** (`scaleY`/width 0→1), eased-out, **staggered**
  in reading order (left→right for columns, top→bottom for bars);
- the value label **rides the bar's growing end** (always outside the bar) and fades in **with** the
  bar — present from the moment the bar is meaningfully drawn, not only once it lands, so no frame
  ever shows a bar without its value (see rule 4).
The growth direction is anchored at the **zero baseline** (consistent with rule 1) — bars never grow
from the middle or the top.
