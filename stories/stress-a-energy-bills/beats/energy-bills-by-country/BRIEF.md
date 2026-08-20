---
size: landscape
type: bar
---

# Beat — Denmark's reported energy price dwarfs every other country in this snapshot

**Type:** bar. **Medium/format:** chart / static. **Size:** landscape (1920 x 1080).

## The takeaway (decision, not a default)

`article.md` states no confirmed takeaway ("We should probably show this somehow.") and hedges
its only comparison — Denmark at "roughly forty times what a Spanish household pays" — as
disputed with an unclear methodology. Checked against the clean data (`render.mjs` computes this,
not asserted from the article's own ballpark): Denmark's reported price is **39.1x Germany's**
and **67.7x Spain's**. Neither is "roughly forty" either way, so the article's own number does not
survive contact with the rows it would be checked against.

Given that, this beat does not print a multiplier in its headline, and it does not assert the
article's disputed comparison as fact. The title states only what the reported data itself shows
— Denmark's figure is far above every other country in the set — which is confirmable directly
from `data.csv` regardless of whether the article's disputed methodology holds up. The subtitle
carries the caveat explicitly ("this chart shows only the reported figures themselves") and names
the two countries with no reported price, rather than folding either fact into a declarative
headline nobody confirmed. **This is the finding the task asked for named explicitly: the article
gives this beat no honest claim stronger than "here is what was reported," and a producer that
manufactured a punchier one would be inventing the takeaway the editorial phase exists to extract
from a journalist who has not given it yet.**

## The outlier (decision, not a default)

Denmark's reported price (48,210.75) is kept on the same zero-based linear scale as every other
bar — not broken, not log-scaled, not dropped.

- **Not dropped**: Denmark is the one country the article explicitly names ("Denmark stands out").
  Dropping it to make a tidier chart of the other four would erase the article's own observation.
- **Not broken**: a broken value axis is the exact truncation `static-discipline.md` forbids for a
  length encoding — it would make two bars whose real ratio is 39-68x LOOK like a small multiple,
  which is a false statement dressed as a stylistic choice.
- **Not log-scaled**: a bar's length is supposed to encode value linearly; a log axis breaks that
  correspondence for every bar except the one at each power-of-ten gridline, and the doctrine's
  own zero-baseline rule is written for a linear length encoding.
- **Kept, zero-based**: the other four bars read as near-flat beside Denmark's. That is not a lie
  — it is the true shape of a dataset where one value is roughly forty to seventy times the rest —
  and it is rescued for legibility, per `bar-and-column.md`'s own rule ("every bar carries its own
  value, printed directly outside the bar"), by printing the exact reported figure above every
  bar regardless of how tall it is. A reader can recover Spain's €712.00 from its label even where
  the bar itself is three pixels tall.

**Measured, not eyeballed.** `render.mjs` now calls `framingMeasurement`
(`chart-beat/references/static-discipline.md`, `framing-serves-the-point`) and prints it before the
geometry is chosen: Denmark's reported price is **43.7x** the group's own median
(`largestAgainstMedian`), and the group's own spread already occupies **98.5%** of the plot's own
extent (`spreadAgainstExtent`) — the opposite shape from `stress-c-vacant-homes`'s invisible fall.
The measurement did not change the decision above; it is the number the decision was already
reasoning from, now printed where an author reads it instead of computed by hand.

## The duplicate Spain row

**Nothing in the toolchain noticed it before this script went looking.** `profile.json` records
`"country": { "distinct": 7, "missing": 0 }` against `"rowCount": 8"` — the one-row gap between 8
rows and 7 distinct country values IS the duplicate, but the profile never says so directly; it
has to be inferred by subtracting two numbers from two different parts of the file. Nothing in
`profile.json` states "row 5 duplicates row 4" or flags a repeated row at all. `render.mjs` finds
it the only way available: parse every row, compare every field (not just the country name, so a
country that legitimately reports the same price twice in two different periods would not be
silently collapsed), and drop the second occurrence — asserting the drop count is exactly 1 so a
future change to the source that adds a second real duplicate would throw instead of silently
absorbing it.

## The main measure typed `text`

`profile.json` types `" price_eur "` as `text` with `min`/`max`/`sum` all `null` — the profiler
gave no numeric summary at all for the story's one measure, and named the column with its leading
and trailing spaces intact, which is itself a second thing `render.mjs` has to correct for before
it can even look the field up (`r["price_eur"]` — the raw header key — not `r[" price_eur "]`,
because the parser trims header names on read; a version that did not would need the padded key).

Nothing in the toolchain warned that "1,234.5" is a thousands-separated number rather than plain
text, or offered to parse it. `render.mjs`'s `parsePrice` strips whitespace, strips comma
thousands-separators, and calls `Number()` on what remains, by hand, with no assertion or helper
anywhere upstream confirming the result is right beyond "the render did not throw." The two blank
rows (Italy, Poland) come through as `null` the same way a blank ever would — the profiler's
`"missing": 2` on this column is the one place the profile *did* correctly describe this column
before it was cleaned.

## The three export sizes

Rendered and opened at landscape only for this beat — `formForSize("bar", "landscape")` answers
`as-is`, and `bar` is a `BAND_SCALE_TYPES` entry, so square and portrait would take the transposed
row form rather than being refused; that transposition was not exercised for this beat, which
ships landscape as its one pinned size per gate 2c's own record in this file's front matter.
