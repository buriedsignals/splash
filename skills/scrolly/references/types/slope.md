# Slope (slopegraph) — scrolly

**Argues:** A slope chart answers "who moved, in which direction, and by how much, between exactly two moments" — for many categories at once.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — each line draws itself from its start value to its end value
- **Compare** — the whole set of slopes is set against each other
- **Reorder** — lines that cross are shown crossing, not relabelled in place
- **Name** — a line is named once traced

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- both end columns keep the same shared scale across every card

## Worked example
`proof/scrolly-slope-europe-lowcarbon/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/slope.md` (read-only, other worktree) and its `proof/video-slope-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
