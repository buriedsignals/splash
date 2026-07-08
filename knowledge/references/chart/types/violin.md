# Violin plot — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "distribution" violin plot, "similar to a box plot but
> more effective with complex distributions (data that cannot be summarised with simple average)" —
> https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md · data-to-viz.com
> (the violin plot — density, sample-size, and few-groups caveats) —
> https://www.data-to-viz.com/graph/violin.html · credited.
> Inherits: `global/dataviz.md` (L0). A cartesian distribution-per-category layout (sibling of `boxplot`).

A violin plot draws each category's distribution as a **mirrored kernel-density estimate (KDE)** — a
smooth silhouette that is wide where values cluster and narrow where they thin out. It answers **"what
is the actual SHAPE of this group's distribution — not just its five-number summary"**: unlike a box
plot, it can show bimodality, skew, and gaps directly in the outline, at the cost of depending on a
bandwidth choice. This engine keeps a violin honest by overlaying the same median + IQR reference a box
plot would draw, so the shape is never read without a grounding statistic underneath it.

## When to use / when NOT — read the caveats first

- **Use** for: comparing distribution SHAPE (not just centre/spread) across several categories at once,
  when each category has enough observations (dozens+) for a density estimate to be meaningful, and the
  data may be multimodal or skewed in a way a box's five numbers would hide.
- **Not** for: very small n per category — a KDE from a handful of points is a smoothing artefact, not a
  real shape; use a **box plot with the raw points overlaid**, a **dot strip**, or a **beeswarm** instead
  (same "show your data" argument the boxplot caveat makes — see `boxplot.md`, `dot-strip.md`). This
  engine's guard hard-rejects any category with fewer than 2 observations (the density is literally
  undefined below that).
- **Not** for: a single number per group — that is a **bar** or **lollipop**, not a distribution.
- **Not** for: precise, exact reporting of quantiles/outlier cutoffs — a **box plot** draws the
  five-number summary and individual outliers more legibly; pair the two, or prefer boxplot alone, when
  the exact IQR/whisker values (not the shape) are the point.
- **Few groups**: data-to-viz notes that with only a couple of categories a **ridgeline chart** (density
  curves stacked, not mirrored) often reads better, since a violin's mirrored half-widths waste area when
  there are few silhouettes to compare. This engine has no ridgeline type yet — for 1–2 categories,
  prefer `boxplot`/`dot-strip`/`beeswarm` instead of a violin.

## Correctness "de base" (violin-specific)

1. **Always overlay a median + middle-half (IQR) reference** on top of the density silhouette — the
   density alone can look like an abstract blob; the reference grounds it the way a box plot would.
   → `checkViolinConformance` requires a median marker (`skills/chart-native/src/core/conformance.ts:674`).
2. **Every category needs at least 2 raw observations** — a KDE is undefined for n<2, so
   `checkViolinConformance` rejects any `categoryCounts` entry below 2 (a harder produce-time floor than
   the boxplot's softer "show your data at small n" caveat, because here the geometry cannot even be
   computed, not merely misleading).
3. **POSITION encoding on the value axis** → it need NOT start at 0 (unlike a bar); always **label the
   axis with its unit** (same rule as `boxplot`/`dot-strip`/`beeswarm`).
4. **Normalise every violin to the same max half-width** so SHAPES compare regardless of how many
   observations each category has — width encodes local density within a category, never a
   cross-category sample-size comparison. If categories have very different n, surface that separately
   (a note in the intro, or the count in the category label) — the built-in tooltip surfaces `n` on
   hover in the interactive format, but static/video renders do not print it by default.
5. **One Okabe-Ito hue for every silhouette** (this engine: blue); the median tick renders in white
   against it and the IQR bar in ink, so colour is never spent encoding a second variable.

## data-to-viz caveats (credited)

- A violin plot gives strictly more information than a box plot (it shows shape, not just five numbers)
  yet remains under-used in practice — data-to-viz frames this as a missed opportunity, not a reason to
  avoid it.
- **Order categories by median** where the comparison is the point — an unordered violin makes the
  eye do the sorting.
- **Make sample-size disparity visible** when categories have very different n — a thin, sparse
  category's silhouette is normalised to the same width as a dense one, so the *shape* alone won't tell
  a reader that one violin rests on 8 points and another on 800.

## Motion grammar (how a violin *builds*)

See `formats/video.md`; the gesture:

- the value axis + gridlines, category labels, and legend fade in first (the chrome, over roughly the
  first fifth of the reveal);
- every violin's half-width **inflates from its band's centreline outward** (0 → full silhouette) **at
  the same time**, all categories together — unlike the box plot's per-category stagger, a violin
  reveals as one simultaneous "breathing out" of shape, since the density itself (not a sequential
  build-up) is the story. The median tick and IQR bar scale with the same inflate factor.
A violin's screen position (band, value domain) is fixed by the layout; only the half-width animates, so
frame N is a pure function of the frame.
