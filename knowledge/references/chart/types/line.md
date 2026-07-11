# Line — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" line charts —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (line chart caveats) · credited.
> Inherits: `global/dataviz.md` (L0) and the cartesian-XY chart layer (L1).
> Referenced by: `bar.md` ("a real time series is a line"), `connected-scatter.md`
> ("one variable over time → a line").

A line chart encodes **one (or a few) continuous series over an ordered axis** — almost always time —
as **position**, joined by a stroke that reads as a single continuous trend. It is the canonical form
for "how did this change?".

## When to use / when NOT

- **Use** for: a continuous trend over many time points (more than the ~8 periods a bar/column chart
  can hold before it becomes a comb).
- **Not** for: a handful of periods (≤ ~8) with no in-between trend to read → columns compare
  magnitudes more precisely (`bar.md`).
- **Not** for: two variables' joint trajectory (x AND y both changing) → that is a **connected
  scatter** (`connected-scatter.md`), which reuses this file's draw-on mechanics but plots position,
  not time, on x.
- **Not** for: more than ~4-5 series on one chart — overlapping lines become spaghetti; facet into
  small multiples instead.

## Correctness "de base" (line-specific)

1. **The y-axis does NOT need to start at 0** (unlike bars, which encode length) — position encoding
   lets the range frame the trend. Never truncate so aggressively that it manufactures drama the data
   doesn't support.
2. **One direct label per series, at its end** (`directLabel` + the final value), rather than a legend
   forcing the eye back and forth — the reader follows the line straight to its name. (Global "direct
   labels over a legend" rule.)
3. **A leading draw-head** during the reveal gives the eye something to follow as the line draws on
   (`formats/video.md`).

## data-to-viz caveats (credited)

- Too many series on one line chart is unreadable — facet into small multiples rather than stacking
  five colours. (data-to-viz: "line plot".)
- A double y-axis (two series, two scales) is misleading — the reader assumes a shared scale. Prefer
  indexing both series to a common base, or two small multiples.

## Motion grammar (how a line *builds*)

See `formats/video.md` for the shared video discipline; the line-specific gesture:

- chrome (axes + gridlines) wipes in first;
- the **line draws on** — a cumulative-length reveal (`revealLine`), led by a bright draw-head
  (`revealHead`) that fades out once the line lands;
- x-axis labels pop in as the draw-head sweeps past them.

**Invariant: the end-point label reveals WITH the line and sits AT the line's current tip — never
gated on a progress signal decoupled from the line's own draw, never pinned to the final data point
while the line is still short of it.** Concretely: the end-point dot + name/value label must (a) be
GATED on the line's own reveal fraction (`lineProgress`/`lp`), not the master frame/scroll progress
(`p`), and (b) be POSITIONED at `revealHead(layout, lp)` (the line's current tip), not at the fixed
last data point. The two coincide exactly once `lp` reaches 1 — so the static render and the final
video frame are unaffected; only the mid-reveal frames change.

- **Regression 1 (scrolly):** an embedded/scroll-driven line (`chart-scrolly`, `embedded` + `revealTo`)
  freezes the master `progress` at its default (1) and drives the draw purely through `lineProgress`.
  Gating the end-label on `p` made it visible from the very first scroll frame — the reader saw the
  final value floating in space with no line reaching it yet.
- **Regression 2 (video):** the label faded in once the master `progress` crossed a threshold
  (`p > 0.92`) but was positioned at the fixed last point, while the line's own eased draw-head
  (`lineProgress`, windowed over `[0.30, 0.95]`) had not necessarily arrived there yet — the dot/label
  could sit ahead of where the line visually stopped.
  Both fixed together by anchoring gate + position on the SAME `lineProgress`/`revealHead` pair.
  Guarded by `tests/line-endpoint-label-reveal.test.tsx`.

**Same pattern elsewhere (noted, not yet fixed — check before reusing this gesture):**
`ConnectedScatterChart.tsx`'s start/end direction labels (`endLabelOp`/`startLabelOp`, gated on the
master `draw` and positioned at the fixed `first`/`last` points) share the same shape of risk — the
draw-head marker there already tracks the true reveal position (`revealPath`'s `head`), but the end
label doesn't ride it. It happens to read correctly today only because connected-scatter has no
embedded/scrolly mode (so `draw` is never decoupled from the actual reveal the way `p` is for an
embedded line) and its reveal window is a single un-windowed `easeInOutCubic(p)` (so the label and the
head converge to the same point fast enough not to visibly separate) — but it is not proven correct by
construction the way the fixed line label now is. Re-anchor it to `head` if this component ever grows
a scrolly mode, gets a wider reveal window, or an offset is reported.
