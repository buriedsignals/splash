# Bullet

**Argues:** A bullet chart answers "did this hit its target" for one or more measures, each on its own row: a bar grows from zero to the actual value, a tick marks the target, and a neutral backdrop can carry qualitative zones behind the bar.

## What it is for

A bullet chart answers "did this hit its target" for one or more measures, each on its own row: a
single bar grows from zero to the actual value, a tick mark shows the target it was measured against,
and a neutral backdrop can carry qualitative zones (poor / ok / good) behind the bar. It is the
accountability chart — built specifically for KPI-versus-target reporting, a job a plain bar chart
can't do at all, because a plain bar has no vocabulary for "the point we were aiming for" alongside
"the point we reached."

## When NOT to use it, and what to use instead

If there's no real target for a measure to be judged against, this type has nothing to add over a
plain bar — don't invent a target just to unlock the bullet's shape, and don't reach for it to compare
categories against EACH OTHER rather than each against its own goal. And if the story is about
distribution or ranking across many items rather than pass/fail against individual targets, a bar or
lollipop chart, sorted by value, communicates that more directly — a row of bullets forces every
reader to check each target individually instead of comparing values on one shared scale.

## The one thing that goes wrong

Every row's measure bar, target tick and any qualitative bands sit on that row's OWN scale, running
zero to a ceiling set just above the larger of the value and its target — never a shared scale across
rows, because two KPIs measured in different units (a percentage and a headcount, say) have nothing in
common to be forced onto one axis. The failure this type has actually shipped with is a labelling
timing bug, not a scale one: value labels gated to appear only in the last fraction of a bar's own
staggered growth animation left the last-drawn rows in a video build completely unlabelled through most
of the time they were on screen — exactly the moment a viewer pausing mid-clip would have wanted to
read the number. The fix rides the label on the bar's growing tip from early in its build, rather than
waiting for the bar to finish growing before the label appears at all.

## What the drawing actually needs

The measure bar grows from zero — this is a length encoding like any bar, so the zero baseline is not
optional. The target renders as a distinct tick mark crossing the bar's own track, not as a second bar,
so "value" and "target" stay visually different kinds of mark rather than two competing lengths. When
qualitative bands exist in the real data, they sit behind the bar as neutral, muted zones; when no
bands are given, the honest choice is a single neutral track behind the bar, never an invented
poor/ok/good split the source data doesn't actually support — a bullet chart must not manufacture
judgement the journalist didn't provide. Exactly two accent hues are enough — one for hit, one for
miss, if the story wants that binary read — and every row needs its own target; a row with a value but
no target isn't a bullet, it's a bar pretending to be one.

## The accessibility trap

The value label belongs in the page's neutral ink, not the bar's own hit/miss colour — the same rule
this whole bar family shares, grounded in the same class of shipped WCAG failure where a label painted
in an accent hue measured under the text-contrast floor. The target tick needs enough contrast against
both the bar's fill and the neutral backdrop behind it to register as a distinct mark at a glance —
a white halo behind the tick is the reliable way to guarantee that regardless of which colour zone the
tick happens to cross.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the row the claim names, the only one carrying the accent
- **Then** its bar against its own target marker — the verdict, which is what this type exists to give
- **Then** the reference rule running across every row, so the single failure is legible against the field
- **Subordinate** — the neutral track behind each bar, the qualitative bands in a fixed order, the row names and the ticks
- **The claim lands on** the one row that falls short of the rule while leading on the change

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-invent-target-just` — invent a target just to unlock the bullet's shape — the target's provenance is stated
- `no-let-qualitative-band` — let a qualitative band change order or width between rows: the backdrop is the constant the bar is judged against
- `no-accent-row-claim` — accent more than the row the claim names — every other row is neutral, or the verdict has no subject

## Precision to assert
- the target marker's position is computed from the same data as the bar and asserted equal to it
- the share is computed from the source columns, never read off a column that does not exist in the file
- both halves of the claim — furthest moved, and the only one under the threshold — are asserted before the render

## Devices the worked example implements
- **The share computed from the nine source columns** — never read off a "low-carbon" column that does not exist in the file (`render-directions.mjs`)
- **One accent, one verdict** — the subject row accented and every other row neutral (`DirectedBullet.tsx`)
- **Both halves of the claim asserted** — the beat refuses rather than draw a verdict its numbers do not support (`render-directions.mjs`)

## Worked example

`proof/static-bullet-low-carbon-share` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedBullet.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type bullet --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
