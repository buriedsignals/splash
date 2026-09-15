# Lollipop — scrolly

**Argues:** A lollipop chart is a bar chart's thin sibling: same job (rank or compare a magnitude per category), same baseline-at-zero rule, same everything about the encoding — just a thin stem and a dot standing in for the solid rectangle.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reorder / re-sort** — stems settle into rank order
- **Reveal in order** — stems enter from one end of the ranking
- **Name** — a value is named once its stem is reached
- **Pull back** — the whole ranking stands

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- stem length is proportional to the same zero-based value scale in every card

## Worked example
`proof/scrolly-lollipop-co2-per-person/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/lollipop.md` (read-only, other worktree) and its `proof/video-lollipop-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
