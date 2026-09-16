# Data shape matching — why the scaffold must not hand over a mismatched worked example

A cold run scaffolded a dot-density map beat from `proof/scrolly-dot-density-europe-stations`, the
type's only worked example — built on per-station rows with real lon/lat. The subject was per-country
totals with no facility coordinates. None of the ~750 scaffolded lines applied; the run stopped
before a render existed (`.superpowers/sdd/2026-09-16-scrolly-any-subject/final-cold-friction.md`).

## The shape a worked example assumes

Each type's sheet (`references/types/<type>.md`) records, for every worked example it lists, the DATA
SHAPE that example's data-loading and mark-drawing code assumes:

- `points` — per-facility/per-station rows with real coordinates (lon/lat already in the CSV).
- `per-area` — one value per named region (country, state, …), no coordinates; a mark needs a
  centroid or a polygon lookup, not a raw point.
- other named shapes as a type needs them (e.g. `origin-destination` for flow maps).

## What the scaffold does with it

`scaffold-scrolly-map-beat.mjs` (and `scaffold-scrolly-beat.mjs` for chart types with more than one
worked example) reads the type's sheet, and determines the subject's own shape from `--shape <name>`
when given, else by inspecting the beat's own `data.json` columns (coordinate columns present →
`points`; a region-name column with no coordinates → `per-area`).

- **A matching worked example exists** → scaffold from it. No banner needed.
- **Several worked examples exist and one matches** → scaffold from the matching one, never the first
  in the list.
- **No worked example matches (including when there is only one and it doesn't match)** → still
  scaffold, from the closest available example, but stamp a `SHAPE MISMATCH` banner as a comment block
  at the top of every region it copied that depends on shape: the data-loading region (what a
  `points` loader assumes vs. what `per-area` data actually looks like) and the mark-drawing region
  (a circle/dot generator keyed by coordinate vs. one keyed by a centroid/polygon lookup). The banner
  names the assumed shape, the subject's actual shape, and the concrete change needed (e.g. "this
  file assumes per-station lon/lat; your data is per-country — replace the point source with a
  centroid lookup keyed by country ISO code").

A beat whose shape differs from every worked example is still scaffolded — with an honest banner at
the exact regions that must change, never a silent mismatch that produces 750 inapplicable lines.
