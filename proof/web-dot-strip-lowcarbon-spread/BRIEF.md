---
format: web
type: dot-strip
---

# Beat — Le plancher de l'électricité bas-carbone européenne a monté de 30 points, le plafond de 2 (web)

**Type:** dot strip. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 2000 and 2024 the **floor** of Europe's low-carbon share rose **29,5 points** (Poland,
1,6 % → 31,1 %) while the **ceiling** rose **2,1** (Sweden, 96,7 % → 98,8 %). The spread between
them closes by **27,4 points**, and the median moves from **27,5 % to 70,6 %**.

The beat refuses to render if the floor did not rise far while the ceiling barely moved, or if the
spread did not close by more than a fifth.

## What a dot strip is for, and what it refuses

It draws a **distribution as positions on one rail**: where the floor is, where the ceiling is, how
tight the middle is. It refuses to draw any one country's trajectory — that is a slope chart's job,
and a dot strip that grows connecting lines has become one. So the two rails are read as two SHAPES,
and the movement of a single country is a reading the **pointer** gives, never a line the page draws.

`each-rail-is-headed-by-what-it-is` — each strip carries its own date, floor, median and ceiling as
printed numbers, so the two shapes are comparable without counting chips.

## What the web adds

Sixteen chips on a rail, several overlapping, leave room for two or three names. **Every chip answers
with four readings**: its country, its share on this rail, its share on the other, and its rank on
both — which is what turns a shape back into countries without drawing a single connecting line.

Chips are stacked into rows only where they would overlap, and the stacking is deterministic: ordered
by value, each takes the lowest free row its neighbours leave it.

## What the render taught

Each rail's date and its floor statistic were both anchored at 0 % and printed one on top of the
other — "2000" read as "20". The date sits above its own rail now.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of `proof/static-dot-strip-lowcarbon-spread/data.csv`.
