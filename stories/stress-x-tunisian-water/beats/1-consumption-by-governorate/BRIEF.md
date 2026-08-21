---
size: landscape
type: bar
---

# Beat 1 — تونس تستهلك أكثر من كل محافظة أخرى في الجدول

**Type:** bar and column (ranking, horizontal bars, mirrored right-to-left).
**Medium/format:** chart / static. **Size: landscape (1920 x 1080).** Slot 1 of `STORYBOARD.md`.

The size in the front matter is the one that counts: `render.mjs` reads it with `readPinnedSize`
and the delivered PNG is measured back from its own bytes.

## Claim

Of the seven governorates in the frozen table, Tunis consumes 142 million cubic metres a year —
more than any other, and 1.6 times Sfax's 89 million. Every figure in the title, the standfirst, the
bar labels and the alt text is computed by `render.mjs` from `source/data.csv` and printed before
the render. Nothing is typed.

## Reading: raw, and the rate agrees

`السكان` (population) sits beside the consumption column. Nothing upstream detects it — the
grounding check's denominator list reads column names against English and French tokens only — so
the per-resident ranking was computed by hand in `render.mjs` and printed at every run. It agrees at
the top: Tunis leads on both readings (134.5 m³ per resident against Sfax's 93.2). The beat draws the
RAW figures, which is what the article claims, and the standfirst does not claim the rate.

## The one value the table did not hand over

`source/profile.json` types the consumption column as `text`, and records why: Sfax's cell is written
in Arabic-Indic digits (`٨٩٠٠٠٠٠٠`). `water.ts` transliterates U+0660–U+0669 one for one — a
transliteration, never an estimate — and this beat draws the bar it gets **as an outline rather than
a fill**, with the source's own characters printed beside it, on the row they belong to. A reader can
see which figure the table handed over as a number and which one did not.

This is a decision, not a default. The alternative — drawing Sfax as an ordinary filled bar —
would have been true and would have hidden the fact that the table's own column is unusable as a
number; the other alternative, dropping the row, would have removed the article's second-largest
consumer from a ranking chart.

## Right to left, and what took the decision

The desk rejected a previous attempt for reversing the letters. **Nothing in the strings is
reversed or reordered here.** The rasteriser applies the Unicode bidi algorithm and Arabic joining
inside each run on its own, so a string frozen in `source/` is drawn as written. What this beat
decides by hand is the LAYOUT: names flush to the right frame edge, zero on the right, bars growing
leftward, value labels at each bar's left-hand tip, header and credit on the same right margin.

There is nothing in the toolchain to inherit that from — no `direction`, no `dir`, no axis-side
switch anywhere in `skills/` or `shared/` — and the rasteriser ignores SVG's own `direction`
attribute, which was measured rather than assumed.

## Evidence hierarchy

1. The length of Tunis's bar against the other six, from a shared zero on the right.
2. Every bar's own value, printed outside the mark at its tip. With seven numbers printed there is
   no value axis and no gridline set: a reader can put a number on every row, at the row.
3. The outlined Sfax bar and its note — the second largest consumer, and the one figure that had to
   be transliterated before it was a number.

## Single accent

`#1F6FB2` on تونس, the subject `STORYBOARD.md` names, from `PALETTE.md` (`origin: subject`: blue for
water is the convention the reader already holds). The other six bars are furniture `muted`. The
accent marks the SUBJECT, not the maximum — here they coincide, which is what the standfirst says
in words.

## Framing, measured

`framingMeasurement` is printed at every render. The spread against the extent is 0.80 and the
largest value is 2.6x the median, so the plain zero-based linear shape reads: no bar collapses to a
sliver and none reaches the frame. The question was asked and the plain shape was kept.

## Anti-patterns for this case

- Reversing, mirroring or re-ordering any Arabic string by hand. The desk has already rejected that
  once; the strings ship exactly as `source/` froze them.
- A legend. Every mark is labelled at the mark.
- Printing the value inside the bar, where the accent fill would be under the type.
- Silently drawing Sfax like every other bar, or silently dropping it.
