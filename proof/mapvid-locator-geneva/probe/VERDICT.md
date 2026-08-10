# The locator video: R6 fires, recovers a line, and the beat still refuses — 2026-08-11

`mapvid-locator-geneva` is the worst of the three map videos on the ledger's own reading — its words
measured 1191 px against a 910 px band — and it carries the longest headline of the four beats owing
a size pin, 114 characters. It is therefore the beat where the removal ladder's new title rung has
the most to bite on, and the one that settles whether shortening the words is the answer.

Re-run: `bun proof/mapvid-locator-geneva/probe/size-budget.mjs`

## R6 FIRED at every frame in the table, and DECLINED at the beat's own

| | |
|---|---|
| as it ships | *All 11 of these international organisations sit inside 4.4 km of central Geneva — and a 6 km search finds no more.* (114 characters) |
| shortened | *All 11 international organisations sit within 4.4 km of central Geneva — a 6 km search finds no more.* (101) |

Everything the sentence asserts survives, and the rung checked each one: the count (11), what that
count counts (**international organisations** — the check no proper-noun scan can make), both
distances with their unit (4.4 km, 6 km), the place (central Geneva), the universal (*all*) and the
negation the second half turns on (*no more*). What goes is "of these" and the aside's "and": three
words of grammar, no fact.

The em dash is kept, and that was measured rather than assumed. A semicolon is one character shorter
and wraps identically — 2 lines at landscape, 5 at square. A comma-and is three characters longer
and costs the line back, 3 lines at landscape. Where the measurement is a tie, the sentence keeps the
punctuation the journalist wrote, because the dash is what holds its beat before the second half.

**Recovered: 3 lines → 2 at landscape, 6 → 5 at square and portrait.** And at the beat's own shipped
1080 × 1350 frame the rung **declines**: the long form already fits in two lines there, so the
shorter one recovers nothing and the journalist's sentence stays. Nothing this beat delivers changes.

## The readings

| frame | rung | plate room | the map it leaves |
|---|---|---|---|
| landscape 1920×1080 | keep everything | **−106 px** | the words alone overrun the band |
| landscape | **R6** | **−16 px** | still over — the rung's line is worth 90 px and the gap is 106 |
| landscape | R6+R7 (conclusion gone) | 53 px | 53 × 53 — **3% of the frame's width** |
| landscape | R6+R7+R3 | 145 px | 145 × 145 — 8% |
| landscape, **floor tuning** | R6 | 76 px | 76 × 76 — 4% |
| landscape, floor tuning | R6+R7+R3 | 220 px | 220 × 220 — 11% |
| square 1080×1080 | R6 | **−1137 px** | — |
| portrait 1080×1920 (story band) | R6 | **−1094 px** | — |
| *CALIBRATION — 1080×1350 as shipped* | *keep everything* | *762 px* | *762 × 762, 71%* |

The plate is square (660 × 660 baked over 0.17° of longitude), so every pixel of height it loses is
a pixel of width it cannot take. A 53 px map in a 1920 px frame is not a small map; it is a dot.

## The refusal does not rest on the caveat

On a map the caveat is the honesty line — here, that the empty outer ring is the source's **own query
result** rather than a missing layer, and that two markers are nudged apart on screen so no point may
be read as a surveyed position. Drop the whole thing and landscape reaches 272 px (a 272 × 272 map,
14% of the frame's width) while square and portrait are still short by 212 and 169 px. The disclosure
is kept and the beat still refuses.

## What R6 actually settled here

It settled the ledger's own open question. The finding was recorded as "this comes down when those
beats' words are shortened, which is an editorial decision" — and now the editorial decision has been
taken, on the beat with the most to gain, and **measured: it is worth 90 px against a 106 px gap.**
The words were never the whole constraint. What fills this frame is the caveat at five lines, the
conclusion at two and the source at two, all drawn at a 30 px video floor into a 910 px band; the
title is one block among five.

## The instrument, and its stated limit

`size-budget.mjs` REPRODUCES `LocatorVideo.tsx`'s baseline arithmetic; it does not render it. At the
beat's own shipped frame it reports **762 px** of plate room where the component really draws
**660**, so it is 102 px **generous** — it reports more room than exists, which can only make a
refusal more conservative.
