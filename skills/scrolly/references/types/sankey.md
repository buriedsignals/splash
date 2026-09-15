# Sankey — scrolly

**Argues:** A sankey diagram answers "how does a quantity flow and split as it moves through a sequence of stages" — energy from source to sector, users from signup to churn, a budget from allocation to spend — with each stage laid out as its own column of nodes and ribbons flowing between them whose THICKNESS is proportional to the amount flowing.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — a flow draws itself from source to destination, in order
- **Filter** — the flow the claim is about keeps its ink, the rest steps back
- **Name** — a flow's value is named once traced
- **Pull back** — the whole diagram stands, the named flow still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- flow widths stay proportional to the same asserted values in every card; node totals balance

## Worked example
`proof/scrolly-sankey-electricity-sources/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/sankey.md` (read-only, other worktree) and its `proof/video-sankey-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
