---
size: landscape
type: column
---

# Beat 1 — Lisboa carries more trips than the other five networks put together

**Type:** bar and column (ranking, vertical columns). **Medium/format:** chart / static.
**Channel:** article web — **size: landscape (1920 x 1080)**. Slot 1 of `STORYBOARD.md`.

The size in the front matter is the one that counts: `render.mjs` reads it with `readPinnedSize`
and the delivered PNG is measured back from its own bytes.

## Claim

Of the six Portuguese city networks in the frozen table, Lisboa's 214 million trips in 2025 is more
than Porto, Braga, Coimbra, Aveiro and Faro added together, and more than twice Porto's 96 million
on its own. Every one of those figures is computed by `render.mjs` from `source/data.csv` and
printed to the console before the render — nothing in the title, the standfirst, the callout or the
alt text is typed.

## Evidence hierarchy

1. The length of Lisboa's column against the other five. Length from a shared zero is the encoding,
   so the axis floor is zero and there is no fitted baseline.
2. The reference rule at the five-city combined total, captioned with that sum. It starts at the
   right edge of Lisboa's own column — inside it the rule would be accent on accent and carry no
   information, because the column's top already IS the level.
3. Every column's own value, printed outside the mark. With six numbers printed there is no value
   axis and no gridline set: a reader can locate every point the chart names, at the mark.

## Single accent

`#D4A853` on Lisboa, the subject `STORYBOARD.md` names. The other five are furniture `muted`. The
accent marks the SUBJECT, not the maximum — here they coincide, which is why the comparison is
drawn as a rule rather than left to the colour to imply.

## Anti-patterns this case invites

- **A fitted y-floor.** It would make 214-against-96 look like any other gap. Zero, always.
- **Letting the accent be the argument.** "Lisboa is gold" is not "Lisboa is more than the rest
  combined". The rule and its caption say the second thing.
- **Per-capita framing smuggled in here.** This beat is raw ridership, which is what the article
  claims. The rate that reverses the ranking is beat 2's job and is stated there, on its own.

## Source

`source/data.csv`, frozen. Six city networks, 2025 only. Credit and effective date from
`STORYBOARD.md`'s hand fields.
