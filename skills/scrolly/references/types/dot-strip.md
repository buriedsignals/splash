# Dot strip — scrolly

**Argues:** A dot strip lays one horizontal lane per category and marks every raw observation in that category as a dot positioned by its own value, with a small deterministic jitter and enough transparency that overlapping points still show through each other — plus one neutral tick per lane marking that category's mean.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Filter** — the group the claim is about keeps its ink, the rest steps back
- **Compare** — two strips are set side by side
- **Zoom / focus** — a crowded strip grows to separate close values
- **Name** — an extreme point is named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- point positions never shift to avoid overlap without the shift being visible as jitter, not a silent move

## Worked example
`proof/scrolly-dot-strip-lowcarbon-spread/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/dot-strip.md` (read-only, other worktree) and its `proof/video-dot-strip-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
