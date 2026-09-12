# ProPublica — "Nothin' but Debt: Which NCAA Tournament Schools Give Low-Income Students the Best Shot?"

- url: https://projects.propublica.org/graphics/ncaa-bracket-2017
- archive: url-list
- type: seeded elimination bracket, re-run on a composite score
- export: web
- readAs: the page's own bracket, rendered live and read at rest in the 1440×900 screenshot. The
  style route reached the bracket's own type (it is HTML, not an image), so the sizes and colours
  below are measurements off the delivered artifact rather than off a wrapper.

## What it is

The 2017 NCAA tournament bracket, but every game is decided by a five-factor measure of how well
each school serves low-income students rather than by basketball. The real seeds stay; the results
change.

## What it does with information

**The rank an entry entered with travels with the entry.** Every school's seed is printed
immediately before its name, one register down: 63 runs of `graphik | 10 | 400` in
`rgb(119, 119, 119)`, against 132 runs of `graphik | 12 | 400` for the names. Two points smaller and
grey, so it never competes with the name — and always there, so a reader who finds a school anywhere
in the bracket also has the position it started from. The whole argument depends on that: without
the seed, "12 Princeton in the final" is just a name.

**An eliminated entry stays in its slot, struck through and dropped to the quiet register.** Losers
are not removed and not moved. The style route reads it directly: the single tuple
`graphik | 12 | 400` carries **both** `rgb(0, 0, 0)` and `rgb(119, 119, 119)` — one size, one
weight, two inks, survivors black and the eliminated grey. Exits are drawn.

**The composite score names its ingredients, in prose, before the graphic.** The standfirst
(`Tiempos Text | 15 | 400`) lists all five: the share of undergraduates from low-income households,
the average financial support given them, their tuition discount, their post-graduation debt, and
the share unable to repay. A ranking that invents its own ordering says what the ordering is made
of, above the ordering.

**The instruction sits with the graphic, in italic.** `Tiempos Text | 15 | 400 | italic` — "Click
any game in the bracket below to view more information on how both schools fare in each Debt by
Degrees head-to-head matchup." The interaction is stated where the reader is about to need it, in
the body register, italic so it reads as an aside rather than as an argument.

**Exactly one entry takes the accent, and it also takes a size step.** Across 132 names and 63
seeds, precisely two runs are in `rgb(197, 32, 0)`: `graphik | 13 | 700` "Princeton" and
`graphik | 10 | 700` "12". One point larger, bold, and red — the twelve-seed that reaches the final,
which is the piece's whole finding. Its opponent in that final, "UC Davis", takes the same size step
(`graphik | 13 | 400`) but stays grey and regular: the size step marks *the final*, the accent marks
*the surprise*. Two levers, two jobs, and neither is spent on the largest value.

## What it does with style

Ground `#FFFFFF`, measured by both routes and agreeing: the pixel route reads it at **89.18 %**
coverage and the style route reports the body ground as `rgb(255, 255, 255)`.

The accent `#C52000` covers **0.012 %** of the plate. The most saturated colour on the page,
`#007DC1` at 4.25 %, is ProPublica's own masthead bar and belongs to the site, not the graphic.

Serif prose against sans furniture, throughout: Tiempos Text for the title (34/700), the standfirst
(15/400), the instruction (15/400 italic), the region headers (`EAST`, 15/700 uppercase, in
`rgb(68, 68, 68)`) and the source line (12/400); `graphik` for every entry name, seed and score. The
reader never has to ask whether a piece of text is the article or the data.

## What is transferable

- **Print the entry's incoming rank beside its name**, two points down and in the muted ink.
- **Keep an eliminated entry in its slot**, struck and greyed, rather than removing it.
- **Name the components of a composite ranking** above the ranking.
- **State the interaction in one italic line between the standfirst and the graphic.**
- **Separate "this slot matters" (a size step) from "this entry is the subject" (the accent)**, so
  the two can be spent independently.

## What is this piece's own

The bracket form, which is specific to single-elimination tournaments, and the sport. ProPublica's
Tiempos/Graphik pairing and its blue masthead.

## What was not verified

The interaction — the resting state alone was read; whether the click opens a panel or navigates
away is untested. The scores' meaning: each name carries a small number (2, 3, 4, …) whose scale is
not explained on the page as captured. Contrast of `#C52000` on `#FFFFFF` was not computed.
