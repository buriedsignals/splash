# Pie and donut — scrolly

**Argues:** A pie (or donut — same chart, a hole in the middle and a total in it) answers exactly one question: of a fixed whole, what share does each part hold, when there are few enough parts that the reader can hold all of them in view at once.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — wedges sweep in, largest first or in the claim's order
- **Compare** — two wedges are set against each other
- **Name** — a wedge's share is named once swept in
- **Pull back** — the whole circle stands, named wedges still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- let more than five or six wedges accumulate without collapsing the small ones into an asserted 'other'

## Precision to assert
- wedge angles sum to the same asserted total (360°) in every card

## Devices the worked example implements
- **Ring area follows the total, past value ghosted** — `grow` scales the ring's own area to the world total as it changes across years, the earlier year's ring left behind as a dashed outline (`donut-drive.mjs`) — the pie's own instance of the "ghost of a prior state" device (compare the dumbbell and grouped-bar worked examples).
- **One ring breaks into several** — `split` breaks the single shared ring into one ring per country, the static plate's own form — the same "one becomes many, continuously" family as the dot-strip's and diverging-stacked-bar's own splits.

## Worked example
`proof/scrolly-donut-world-co2-share/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedDonutScrolly.tsx` (the marks) and `donut-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type pie-and-donut --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/donut.md` (read-only, other worktree) and its `proof/video-donut-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
