# Area — in video

Worked example: `proof/video-area-swiss-co2` (validated 2026-09-15), from `proof/static-area-swiss-co2`.

- **The fill** comes first: the surface advances through time, linear in years, closed on zero — its surface is the
  stock — while the running total counts up; every total's text is measured in Bun.
- **The argument looks for the half**: the surface steps back to its tint and a rule sweeps back from the last year,
  linear in years, repainting the recent surface in the accent. The stock's gauge — a bar under the total, its half
  marked — fills from its right with the share the rule has passed, slice by slice, and the rule lands on the midpoint.
- **Then it flattens**: each half's top levels to its mean height, the curve turning into two blocks of the same surface
  (a polygon's surface is linear in its heights, so every frame of the move is honest), each named inside with its years
  and its length. The means are computed from the drawn outline and asserted to hold its surface.
- **The last shot is the whole curve**: the blocks sink back, the names ride to their seats inside the curve, the rule
  and the gauge stay.
- The years are asserted consecutive before anything is drawn: an area closes silently over a gap. The stock and its
  gauge stand in the empty upper left, under the top gridline; the credit sits on one line under the years.
