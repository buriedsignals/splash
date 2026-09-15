# Bullet — scrolly

**Argues:** A bullet chart answers "did this hit its target" for one or more measures, each on its own row: a single bar grows from zero to the actual value, a tick mark shows the target it was measured against, and a neutral backdrop can carry qualitative zones (poor / ok / good) behind the bar.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — the measure bar and its target/qualitative bands are set against each other
- **Count up** — the measure's value climbs to its bar's length
- **Name** — the target and the measure are named once reached
- **Pull back** — every bullet in the set stands together

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the target marker's position is computed from the same data as the bar, asserted equal
- qualitative bands keep a fixed, asserted order across every card

## Worked example
`proof/scrolly-bullet-low-carbon-share/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/bullet.md` (read-only, other worktree) and its `proof/video-bullet-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
