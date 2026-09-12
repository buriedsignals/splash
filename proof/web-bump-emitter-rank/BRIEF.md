---
format: web
type: bump
---

# Beat — L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂ (web)

**Type:** bump (ranking-over-time). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 1990 and 2024 India moved from **8th to 3rd** in the world ranking of annual CO₂ emissions,
passing five countries: the United Kingdom (1991), Ukraine (1992), Germany (1999), Japan (2006) and
Russia (2009).

**Every rank is computed over the whole file (215 countries), not over the six lines drawn** — a rank
read off a subset is not a world rank. The crossings are **found**, by walking the subject's own rank
series and asking who left the set above it, never listed by hand; the beat throws if the subject did
not rise or if it passed fewer than three.

The six lines are those in the top five in 1990 or in 2024, plus the subject.

## What the web adds, and what a bump costs

A bump trades the VALUE for the ORDER — that is the whole bargain, and it is why a reader watching a
line cross cannot tell whether the country below fell or the country above merely grew faster.
**This page gives the value back.** Every year answers with the subject's rank, its emissions that
year, and who sat immediately above and below it in the world ranking.

**One mark per YEAR, never one per country per year.** Six lines stack in one column, so a pointer
resolving by x would be ambiguous between them; the format's shared interaction script picks the
nearest mark by x alone, and a design that hands it six candidates at the same x is a design that
answers at random.

## Drawn at rest, because a page has no reveal to lean on

Both ends carry a name **and its rank in words** (`rank-is-printed-on-the-entry`), and that is
collision-free **by construction**: in any one year the drawn countries hold distinct ranks, so no
two labels in one column can share a row — asserted on the real ranks at both ends, and the
component throws otherwise. Each crossing the argument rests on is ringed on the subject's line and
captioned where it happens.

## What the render taught, and it went into the frame

The finishing labels were first placed at `left: 100%` of the plot cell, and they hung outside the
figure: **96 px of horizontal document scroll at every one of the seven verified viewports.** A label
that names a line belongs inside the box the line is drawn in, so the viewBox now carries a stated
right gutter and the lines stop at its edge. Two further passes — letting rank-plus-name labels wrap
rather than inheriting the stylesheet's `white-space: nowrap`, and trimming the left gutter — closed
the last 8 px at 375 px.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Global Carbon Budget 2025, via Our World in Data · 1990–2024. `data.csv` is a byte-for-byte copy of
`proof/static-bump-emitter-rank/data.csv`.
