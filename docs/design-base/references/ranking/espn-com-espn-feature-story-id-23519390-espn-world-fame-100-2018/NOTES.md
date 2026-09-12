# ESPN — "World Fame 100" (2018)

- url: http://www.espn.com/espn/feature/story/_/id/23519390/espn-world-fame-100-2018
- archive: url-list
- type: ranked card grid, composite score, persistent sort control
- export: web
- readAs: the page's own ranked grid, rendered live and read at rest in the 1440×900 screenshot. The
  cards are HTML, so the style route reached their type. The huge gold rank numerals are **not** in
  the style route's type table and were read from the pixels only.

## What it is

The hundred most famous athletes in the world, ranked, as a grid of portrait cards, three across.
The standfirst — `bentonsans | 13 | 400` in `rgb(177, 177, 177)` — reads "Our Third Annual Ranking
of the Biggest Names in Sports".

## What it does with information

**The rank is printed on the entry, at display scale, in the accent.** Each card carries its number
as a large gold numeral sitting on the lower edge of the portrait — 1 over Ronaldo, 2 over LeBron, 3
over Messi. The number is not in a column, not in a gutter and not implied by reading order: it is
part of the mark. A reader who arrives at any point in a hundred-card scroll knows where they are.

**Every card carries the three components of the score that produced its rank.** Under a hairline
rule at the foot of each card sit three labelled figures — `Search Score` · `Endorsements` ·
`Social Following`. The style route measures the labels as `bentonsansbold | 11 | 400 | uppercase`
and the figures as 18 runs of `Publico Text Web | 14 | 700` in `rgb(217, 217, 217)`: six visible
cards, three figures each. The ranking does not ask to be trusted; it shows its arithmetic per
entry.

**And the components visibly do not agree with the order.** Read off the capture: Ronaldo is first
on `100 / $40m / 121.7m`, LeBron second on `63 / $55m / 40.8m`, Messi third on `134 / $25m / 88.1m`.
No single one of the three columns is monotone down the first three ranks. Printing the parts is what
makes the composite argue rather than assert — it is also what lets a reader disagree with it, which
is the point.

**The sort names itself and never leaves the screen.** A pill floats fixed at the bottom centre of
the viewport reading `OVERALL RANK ▲`. It states the criterion currently in force and the direction,
so a reader who has scrolled past the header still knows what the order means. Two further floating
controls sit in the bottom corners — a filter glyph at the left, a `100` glyph at the right.

**Identity is the photograph, and the qualifying line is quiet.** Names are set in
`Publico Text Web | 16 | 700` with 0.5 px tracking, in white; the discipline and country ride
underneath in `bentonsans | 11 | 400`, `rgb(177, 177, 177)` — 30 runs, sample "Soccer •". The card
has three type registers doing three jobs and no fourth.

## What it does with style

Ground `#1C1C1C`, measured by both routes and agreeing: pixel `#1C1C1C` at **67.02 %** coverage,
style body ground `rgb(28, 28, 28)`. A near-black that is not black; the portraits are colour-graded
to sit on it.

Accent `#F0B74B` — read from the style route's mark fills as `fill rgb(240, 183, 75)` and
corroborated in the pixel palette by `#F7C458` at 0.72 % (hue 41°) and `#CB8331` at 0.79 % (hue 32°),
the numerals and their antialiasing. Gold on near-black, and nothing else on the plate is
chromatic at all.

Serif for the identity (Publico Text Web), sans for the furniture (bentonsans / bentonsansbold),
small caps for the component labels — the same prose/furniture split ProPublica makes, on the
opposite ground.

## What is transferable

- **Put the rank on the entry at display scale**, in the accent, rather than in a column.
- **Carry the composite's components on every card**, labelled, so the reader can check the order.
- **A persistent sort control that names the criterion in force**, not one labelled "sort".
- **Three registers per card and no more** — identity, qualification, value.

## What is this piece's own

The photography, which is the reason the cards are that size, and ESPN's gold. A ranking without a
portrait per entry has no reason to spend a full card on each row.

## What was not verified

The typography of the rank numerals: the style route returned eight type tuples and none of them is
a large numeral, so the numerals are an image, a canvas or a face the enumeration missed. Their size,
weight and family are unmeasured and are described here only from the pixels. The behaviour of the
three floating controls — nothing was clicked. The nine component figures quoted above were read off
this record's own `screenshot.png` at 1440 × 900 and were **not** cross-checked against ESPN's data;
what the Search Score's units are, and which direction is better, is not stated on the page as
captured. Only the first six of the hundred cards were in the
frame; whether the lower ranks keep the same card anatomy is untested. Contrast of `#F0B74B` on
`#1C1C1C` was not computed.

One measurement disagrees with the eye and the eye is left to win, per `METHOD.md`'s correction 3:
the component labels are reported by the style route as `rgb(0, 0, 0)`, which on a `#1C1C1C` ground
would be invisible, and they are plainly legible in the capture. The value is recorded and not used.
