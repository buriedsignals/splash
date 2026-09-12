# Datawrapper — "Women are much more likely than men to identify as bisexual"

- url: https://www.datawrapper.de/_/d8VDj/
- archive: search (the chart's own published permalink, reached from Datawrapper Academy's
  `examples-of-datawrapper-split-bar-charts` gallery)
- readAs: the published chart page at 1440×900. `style.graphic.tag` is **`iframe`** at
  `documentTop: 219`, `nearTheTop: true`, frame `https://datawrapper.dwcdn.net/d8VDj/1/`;
  `routes.pixel.measuredFrom: "graphic.png"`. **The graphic's type is `style.graphicFrame.type`**
  (`style.typeSource` says so).

## What it is

Six LGBTQ+ self-descriptions from 2023 Gallup polling, drawn back to back about a shared centre —
women's share growing left, men's growing right. Same construction as `mX3uV`, opposite colour
decision.

## What it does with information

**Colour marks the ROW the headline is about, not the side.** Five of the six rows are grey —
`#B2B2B2` at 5.284 % for the `Total LGBTQ+` row, `#D4D4D4` at 2.488 % for the rest — and the
`Bisexual` row is `#8300F3` at 2.964 % **on both sides of the centre**. One accent, one row, two
halves. Nothing about the fill distinguishes women from men anywhere on the plate; that job belongs
entirely to direction and to the two centre headers.

**The de-emphasis reaches the type.** `Bisexual` is the only category label in Roboto 13/**700**;
the other five are 13/400. And the value labels of the greyed rows are painted in a light grey that
matches their bars (`2 %`, `0.3 %`, `0.5 %`, `0.1 %`), while the two on the violet row are white,
inside the fill. A muted row is muted in mark, in label and in category name together.

**The label flips out of the bar when the bar is too short**, exactly as in `xFO0J` — `8.5 %` and
`5.7 %` sit inside their fills; `0.3 %`, `0.1 %`, `0.4 %` sit outside theirs. Applied per cell, so
one row can have an inside label on one side and an outside label on the other.

**Rows are ordered by the total, then by nothing.** `Total LGBTQ+` heads the list as an aggregate,
then Lesbian, Gay, Bisexual, Transgender, Other — a taxonomy, not a ranking. The accented row is
fourth of six, and it is findable anyway because it is the only coloured thing.

**A footnote in italic states what the arithmetic would otherwise imply.** `Respondents could choose
and be counted for multiple identities. Nonbinary respondents are not shown due to insufficient
sample size.` — the rows do not sum, and one row is missing; both are said out loud in
`rgb(101, 101, 101)` beneath the plot.

## What it does with style

Ground `#FFFFFF` at 81.823 %; palette read as **sequential**. The `#B2B2B2` / `#D4D4D4` pair
carries 7.77 % of the plate between them and both sit in the record's **neutral** list — so on the
pixel route this chart is one violet on a grey field, which is what it looks like. Furniture:
`#000000` 1.374 %, `#181818` 0.519 %, `#656565` 0.507 %, `#F3F3F3` 0.492 %, `#ECECEC` 0.351 %.

Type (from `graphicFrame`): Roboto 22/700 title, 15/400 subtitle (`Self-descriptions from 2023
Gallup telephone polls in the U.S.`), 13/400 ×19 for the labels, 13/700 once for `Bisexual`, 13/400
italic once for the footnote, 11/400 ×5 for the chart credit and source in `rgb(136, 136, 136)`.

**The chart is credited to a person.** `Chart: Antonio Sarcevic · Source: Gallup` — the author line
sits in the same 11 px grey as the source.

## What is transferable

- **In a back-to-back chart, an accent can mark the ROW instead of the SIDE.** When the finding is
  about one category rather than about the difference between the two groups, colouring the sides
  spends the accent on something the reader already gets from direction.
- **Mute a row completely or not at all** — fill, value label and category label together. A grey
  bar with a black label is half a decision.
- **Flip the label per cell, not per row.**
- **Say when the rows do not sum**, in the picture, in italic, under the plot.

## What was not verified

The Gallup figures were not checked. Whether `#8300F3` clears the WCAG non-text floor against
`#FFFFFF` was not computed here. Hover, tooltip and the mobile layout were not read. Whether the
greyed value labels are legible at the published embed width was not tested — at 1440 they are
faint. One publication.
