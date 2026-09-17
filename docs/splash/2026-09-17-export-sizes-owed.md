# Export sizes owed — the beats that deliver a raster and pin none

Measured 2026-09-17 over `proof/` (160 beats), by the same walk
`skills/splash/test/delivered-size-matches-the-pin.test.ts` runs.

**80 beats deliver a fixed-size raster. 79 pin a size from the table. 1 owes one.**

| export | delivers a raster | pinned | owed |
| --- | --- | --- | --- |
| static | 40 | 39 | 1 |
| video | 40 | 40 | 0 |
| web | 0 | — | 0 |
| scrolly | 0 | — | 0 |

`web-*` and `scrolly-*` beats deliver three fluid HTML pages each and no raster at all, so they owe
no export size: there are no exported pixels for a pin to describe. They are not in the table above
and they are not debt.

## What is owed

### `proof/co2-suisse`

`BRIEF.md` declares `format: static`, `medium: chart`, `type: line` and carries no `size:` line.
Its four PNGs — `renders/creme.png`, `renders/nocturne.png`, `renders/rapport.png` and
`co2-suisse-still.png` — all measure **1800x1120**, which is no size the toolchain exports: it is a
900x560 element rasterised at `fitTo: width * 2`, the exact defect the W4 audit opened with. This
is the last beat of that audit still unmigrated.

It leaves the ratchet by being re-rendered, not by the number moving:

1. pick a row of `SIZES` (`skills/chart-beat/scripts/sizes.mjs`) — `landscape` 1920x1080 is what
   every other chart static in the corpus pins;
2. re-render the three directions at that size, so the delivered bytes measure it;
3. add `size: landscape` to the beat's `BRIEF.md` front matter;
4. lower `UNPINNED_BEATS` to `0` in the same commit.

Step 4 is the only thing that may change that constant.
