# Chord diagram — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "flow" chord · Circos/d3-chord (the form) · data-to-viz.com
> (the chord — and its readability caveats). credited.
> Inherits: `global/dataviz.md` (L0). A circular flow-matrix layout.

A chord diagram lays entities around a circle and draws **ribbons between them whose thickness is the
flow** — a square matrix of who-connects-to-whom. It answers **"what flows between these few entities,
and which links dominate"**: migration between regions, transfers, trade, co-occurrence.

## When to use / when NOT — read the caveats first

- **Use** for: a SMALL set (≤ ~8) of entities with a flow/relationship MATRIX, where the big bilateral
  links are the story. Each entity's arc = its total; each ribbon = a pair's flow.
- **Not** for: a directed source→destination pipeline through stages — that's a Sankey.
- **Not** for: many entities or a dense matrix — the ribbons become an unreadable knot; aggregate.
- **Not** for: precise comparison — ribbon widths are read approximately; label the big ones.

## Correctness "de base" (chord-specific)

1. **Each entity's arc length ∝ its total flow**; each ribbon's end width ∝ that directed flow. →
   `checkChordConformance` (a square matrix, non-negative).
2. **Few entities, ≤ 8**, each an Okabe-Ito hue; colour ribbons by one endpoint (usually the larger /
   the source).
3. **Label every arc** (outside the ring) and quote the headline flow; a note says what a ribbon means.
4. **Order entities deliberately** (size or group) and keep the order fixed.

## data-to-viz caveats (credited)

- A chord is beautiful but **hard to read precisely** and crowds fast — keep the entity count tiny,
  aggregate the long tail, and always label the dominant links; never ask readers to compare thin
  ribbons across the circle.

## Motion grammar (how a chord *builds*)

See `formats/video.md`; the gesture:

- the whole figure **blooms from the centre** (scales up) as the arcs fade in; each ribbon fades in,
  staggered; the arc labels fade in last.
The arcs/ribbons are fixed by the layout; only scale/opacity animate, so frame N is a pure function of
the frame.
