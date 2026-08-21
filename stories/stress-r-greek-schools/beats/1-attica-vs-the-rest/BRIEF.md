---
size: landscape
type: slope
---

# Beat -- Attica's decline in school count is far smaller than the rest, 2020-2026

**Reading**: raw — `μαθητές_2026` (pupils) sits beside the school counts in the frozen table.
This beat draws the raw school counts for 2020 and 2026: the finding is the SIZE OF THE DECLINE
in schools, and pupils are only recorded for one of the two moments, so a schools-per-pupil
reading could not be drawn for both ends of the slope even if it were the claim.

**Type:** Slope (slopegraph). **Medium/format:** chart / static. **Size:** landscape (1920x1080).

## Evidence hierarchy

1. One line per region, left dot at its 2020 school count, right dot at its 2026 count.
2. Attica carries the one accent; every other region's line is drawn in the neutral context tone
   -- `references/types/slope.md`'s own rule ("at most two hues total... a slope chart where every
   line is accented has no accent at all").
3. Anatoliki Makedonia kai Thraki keeps its left-hand dot and label but draws no line and no
   right-hand dot: its own 2026 figure is corrupted in the frozen source (the cell reads
   `term378`, not a plausible school count) and is declared missing directly on the chart rather
   than guessed at, repaired, or silently dropped from the reader's view.

## Reveal order

Title states the finding first (Attica's decline is smaller than every other region's), then the
field of lines lets the reader confirm it directly against the thirteen other regions -- the same
"named subject keeps its bar, at the same scale as everything it is being compared against" move
`STORYBOARD.md`'s reference names, applied to a line's tilt instead of a bar's length.

## Single accent

`#D4A853` (Buried Signals's house colour, from `PALETTE.md`, `origin: newsroom`) on Attica's line
and its two dots and value labels only. Every other region's line, dot and label is drawn in the
furniture `muted` tone derived from the ground -- never a second accent, per the type sheet.

## Source

Greek Ministry of Education, released in response to a written request (STORYBOARD.md `credit`),
as of 2026-08-21. Figures read from `source/data.csv` (frozen), one column (`sxoleia_2026`) typed
`text` by the intake profiler because one of its thirteen cells is not a number.

## The anti-pattern this beat is written against

`chart-beat/references/types/slope.md`, "The one thing that goes wrong": a fixed label gutter has
previously forced this pipeline to truncate a category name to make it fit ("Interm." for
"professions intermediaires"). This story's longest label, `Anatoliki Makedonia kai Thraki`
(`Ανατολική Μακεδονία και Θράκη`), is 29 characters set in Greek script. The gutter is measured
from the widest label actually being drawn, never assumed -- see `render.mjs`'s own measured-width
log line before anything is drawn, and the rendered PNG is where this is actually checked: by
looking, not by a passing test.
