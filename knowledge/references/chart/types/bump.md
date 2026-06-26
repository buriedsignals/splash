# Bump chart — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "ranking" / change-over-time bump · data-to-viz.com
> (the ranking/bump — and its "order not magnitude" caveat) · credited.
> Inherits: `global/dataviz.md` (L0). A cartesian ranking-over-time layout.

A bump chart shows how the **ranking** of a handful of items changes across ordered periods: each item
is a line through its rank at every period, rank 1 at the top. It answers **"who rose, who fell, who
overtook whom"** — the read is the **crossings**, not the absolute values.

## When to use / when NOT — read the caveats first

- **Use** for: the rank race of a few tracked items over time — overtakes, climbs, collapses.
- **Not** for: magnitude — rank spacing is constant, so #1 may be miles ahead or barely ahead; the
  chart cannot say. If the size of the gap is the story, plot the values (line / slope).
- **Not** for: many items — the lines tangle into spaghetti. Track a few, grey the rest.
- **Not** for: a single period — that is a ranked bar, not a bump.

## Correctness "de base" (bump-specific)

1. **Rank 1 at the TOP**, equal vertical spacing per rank (every rank step is the same distance). →
   `checkBumpConformance` (≥ 2 periods, ≥ 2 ranks).
2. **Label the lines** — at least at the end (the latest period); a rank axis (1…N) on the side helps.
3. **Highlight ≤ ~3 tracked items** in Okabe-Ito hues; grey the rest (the context) so the story reads.
4. **A dot at every period** on each line, so the rank at each step is unambiguous.
5. **Caption the periods** along the axis (the reader must know the time steps).

## data-to-viz caveats (credited)

- A bump chart encodes **order, not magnitude**. Constant rank spacing hides how big each gap really
  is. Say so, and pair with the underlying values when the gap — not the order — is the message.

## Motion grammar (how a bump chart *builds*)

See `formats/video.md`; the gesture:

- the rank axis + period captions wipe in first (chrome);
- each line **draws left → right** across the periods, eased; the dot at a period pops as the line
  reaches it; the end labels fade in last, after the lines land.
A line never appears whole — it is drawn by the frame, so frame N is a pure function of the frame.
