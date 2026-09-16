# Bar and column — scrolly

**Argues:** One value per category, encoded as the LENGTH of a rectangle from a shared baseline.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — every category enters, largest first or in its natural order
- **Reorder / regroup** — the cut the claim is about pulls apart from the rest
- **Name** — values and labels arrive as the claim reaches them
- **Pull back** — the full ranking stands, every value written

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together
- `no-rotate-cut-category` — rotate or cut a category label at any width

## Precision to assert
- one value scale from zero across every card
- a regrouped bar's length is a real computed sum, asserted in the runner, not a visual approximation

## Devices the worked example implements
- **Long tail collapsed into one row** — the podium (ten) keep a row each; every OTHER category is laid end to end into a single aggregate row (`bar-drive.mjs`'s `spread`/`rest` fields) instead of drawn or named individually. Compare the flow-map worked example's identical "others" cluster.
- **Stack-against-the-podium slide** — a second group slides end to end into a row against the first (`stack`), the rest stepping back on the same field — a "compare two named groups, drop everything else" device.

## Worked example
`proof/scrolly-bar-top-emitters-2024/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedBarScrolly.tsx` (the marks) and `bar-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type bar-and-column --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/bar-and-column.md` (read-only, other worktree) and its `proof/video-bar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
