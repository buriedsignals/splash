# Histogram — scrolly

**Argues:** A histogram bins one continuous variable into contiguous intervals and draws a bar per bin whose height is the count that landed there.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — bins fill from one end of the value axis
- **Filter** — the bin or range the claim is about keeps its ink
- **Count up** — a running total climbs as bins fill
- **Name** — the mode or an extreme bin is named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- bin edges are fixed across every card so a value's bin never changes mid-scroll

## Devices the worked example implements
- **Dots morph into the bars they sum to** — every observation is first a dot falling into its bin's column (`stack`); `bars` then gives way from the column of dots to the single bar they add up to, its height exactly the dots' own count — the histogram's own argument (a bar IS an aggregation of raw points) made visible as a continuous transformation, not asserted by a caption.

## Worked example
`proof/scrolly-carbon-footprint-spread/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedSpreadScrolly.tsx` (the marks) and `spread-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type histogram --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/histogram.md` (read-only, other worktree) and its `proof/video-histogram-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
