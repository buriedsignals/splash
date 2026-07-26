---
id: connected-scatter
engines:
  chart-native: connected-scatter
intent: [change-over-time, correlation]
shape: paired
formats: [static, interactive, video]
bestFor:
  - "the joint path of two metrics over time — rent vs vacancy, inflation vs unemployment, debt vs deficit — where the shape of the trajectory is the story"
notFor:
  - "a plain correlation snapshot with no time order — that is a scatter; the path is meaningless without ordering"
  - "one variable over time — that is a line"
  - "a tangled path with many crossings — it stops reading; thin the points or facet"
---

# Connected scatter — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "change over time" / "correlation"
> connected scatter — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (connected scatterplot) · credited.
> Inherits: `global/dataviz.md` (L0), the cartesian-XY chart layer (L1), and the
> scatter rules in `scatter.md` (BOTH axes carry a title; position encoding).

A connected scatter plots two continuous variables against each other (x, y) and **joins the points
in TIME order** with a path. The dots are the states; the path is the trajectory. It answers **"how
did these two variables co-evolve over time — did they move together, diverge, loop back?"**

## When to use / when NOT

- **Use** for: the joint path of two metrics over time — rent vs vacancy, inflation vs unemployment,
  debt vs deficit — where the SHAPE of the trajectory (a line, a loop, a reversal) is the story.
- **Not** for: a plain correlation snapshot with no time order → a **scatter** (`scatter.md`); the
  path is meaningless without ordering.
- **Not** for: one variable over time → a **line** (`line.md`).
- **Not** for: a tangled path with many crossings — it stops reading; thin the points or facet.

## Correctness "de base" (connected-scatter-specific)

1. **Position encoding on BOTH axes; neither needs to start at 0** (inherited from `scatter.md`) — a
   zoomed range that shows the trajectory clearly is correct.
2. **BOTH axes carry a title + unit** — the reader must know what x and y mean (the scatter rule). →
   reuses `checkScatterConformance`.
3. **The path is time-ordered and its DIRECTION is shown** — label the start and the end (and the
   key turning point), so the reader reads the trajectory the right way round.
4. **Dots mark each state; the path is the read.** Keep the path one accent colour; dots the same;
   light axes/gridlines behind.
5. **Don't over-label** — start, end, and the pivotal point; the rest read from the path.

## data-to-viz caveats (credited)

- The connected scatterplot is powerful but easily misread if the direction isn't obvious — always
  mark start/end. (data-to-viz: "connected scatterplot".)
- Many points + crossings = spaghetti; this form wants a clear, low-crossing trajectory.

## Motion grammar (how a connected scatter *builds*)

See `formats/video.md`; the trajectory-specific gesture (reuses the line draw-on):

- chrome (both axes + titles + light gridlines) wipes in first;
- the **path draws on in time order** — the trajectory traces out from the start, the draw-head
  moving along it (cumulative-length reveal, exactly like the line chart);
- each **dot pops in as the head passes it**, and the start / end labels fade in at their ends.
The path is a pure function of progress (analytic cumulative length) → the mp4 is reproducible.
