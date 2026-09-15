# Sankey — in video

Worked example: `proof/video-sankey-electricity-sources` (2026-09-16), from `proof/static-sankey-electricity-sources`.

- **Start from the whole as one bar**: it grows down the source rail, its height the running total on the one px-per-unit
  scale both rails keep, the total counting beside it.
- **Split it, then pour it**: gaps open and cut the bar into the sources, every height kept; source after source, the
  ribbons run along their own curve (the cubic cut at t, both edges at the same x), each target node filling by the
  ribbons landed in it — conservation drawn as it happens, a node's words arriving when it is full.
- **Filter and trace the flow the claim names**: every other source's ribbons step back; the tracked ribbon fills with the
  accent left to right, its two nodes turning with it.
- **Compare by carrying the source to the target**: a copy of the whole source bar slides beside the target node, its
  height kept, its tracked part level with the ribbon's landing band, the rest overhanging; the share in the ribbon.
- **End on the whole sankey**: the copy slides home, every ribbon returns, the share travels inside the ribbon to its
  source end; the credit on one line. 20,5 s.
