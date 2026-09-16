# Diverging bar — scrolly

**Argues:** A diverging bar answers "who gained and who lost, and by how much" for a set of categories whose values are SIGNED — net job change by sector, vote swing by district, temperature anomaly by year.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reorder / re-sort** — bars settle into the order that answers the question
- **Compare** — the positive and negative sides are set against the shared zero
- **Name** — the extreme on each side is named
- **Pull back** — the full diverging set stands

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- the shared zero baseline never moves between cards

## Devices the worked example implements
- **Level-to-change re-encode, then re-sort** — bars first hold their LEVEL geometry (the 1990 length kept as an outline); `swap` then morphs each into its CHANGE geometry out of the zero line and the rows re-sort from largest rise to largest fall on the same field — never a hard cut between two chart types. Compare the hex-grid's count→rate and the dot-density's count→weight re-encodes — the same device, on bars.
- **Computed reference line + filter against it** — the mean of the falls is drawn as a rule (`mean`) and stated, then `beyond` filters the rows to those that fell past it, the rest stepping back. A "state a threshold, then act on it" device pair, reusable wherever a computed reference value drives a filter.

## Worked example
`proof/scrolly-diverging-bar-eu-per-capita/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedDivergingScrolly.tsx` (the marks) and `diverging-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type diverging-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/diverging-bar.md` (read-only, other worktree) and its `proof/video-diverging-bar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
