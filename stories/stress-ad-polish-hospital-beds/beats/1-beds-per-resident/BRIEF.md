---
size: landscape
type: bar
---

# Beat 1 — Mazowieckie ma najwięcej łóżek, ale nie na mieszkańca

**Type:** bar and column (ranking, horizontal bars). **Medium/format:** chart / static.
**Size: landscape (1920 x 1080).** Slot 1 of `STORYBOARD.md`. Destination: print.

The size in the front matter is the one that counts: `render.mjs` reads it with `readPinnedSize`
and the delivered PNG is measured back from its own bytes.

## Claim

Of the eight voivodeships in the frozen table, Mazowieckie holds the most hospital beds — 21 400 —
and is third per inhabitant, at 38,8 beds per 10 000, behind Śląskie (40,5) and Łódzkie (40,2).
Every figure in the title, the standfirst, the row labels, the annotation and the alt text is
COMPUTED in `render.mjs` from `source/data.csv` and printed before the render. Nothing is typed.

## reading: per ludność

`ludność` (population) sits beside `łóżka_szpitalne` in the frozen table, and **nothing in this
toolchain detected it.** All three copies of the denominator lexicon — `intake/scripts/profile.mjs`,
`storyboard/scripts/ground-claim.mjs` and `chart-beat/scripts/detect-denominator-reading.mjs` —
read column names in English, French, Greek and Arabic. `ludność` is in none of them, so
`source/profile.json` carries no `denominator` note, the grounding check offered no per-capita
prompt, and `denominatorReadingStated` on this beat answers `applies: false`. This line is written
by hand, in the form that guard would have asked for, so the next reader finds the answer where the
convention says it lives.

The reading is `per ludność`, and it is the reading the article's own second paragraph asks for.
The raw ranking is not hidden: it is stated as a number on the subject's own row, and stated in
the standfirst, because a chart that quietly swapped the measure under the headline would be
correcting the journalist behind their back rather than showing them the other reading.

## Evidence hierarchy

1. The length of every row's bar from a shared zero — beds per 10 000 inhabitants, sorted
   descending. Mazowieckie's bar is visibly shorter than two rows above it.
2. Every row's own value, printed at the bar's tip. Eight numbers printed at the mark, so there is
   no value axis and no gridline set to read against.
3. The eight-region average, drawn as one reference rule with its value on it — the anchor that
   says how tight the field is, since first and last are only 5,1 beds apart.
4. The raw count, printed once, on the subject's own row: `21 400 łóżek — najwięcej w kraju`.

## Single accent

`#5B8A8A` on Mazowieckie, the subject `STORYBOARD.md` names, from `PALETTE.md`
(`origin: journalist`). Every other row is furniture `muted`. The accent marks the SUBJECT, and
here the subject is deliberately NOT the maximum — that is the whole argument of the beat, and it
is what the standfirst says in words.

## The ground, and why it is not the newsroom's

The delivery is a printed page. `PALETTE.md` records why the house ground `#16191B` was not used
and why the house PRIMARY accent could not be: `#D4A853` measures 2.20:1 on white, below the 3:1
non-text floor. The beat is drawn on `#FFFFFF` with the newsroom's SECOND accent, 3.86:1.

## Polish diacritics

Every label carries them — `Śląskie`, `Łódzkie`, `Małopolskie`, `Dolnośląskie`, `łóżek`,
`mieszkańców`, `źródło`, `województw`. `TYPEFACE.md` records `Helvetica, Arial, sans-serif`,
`origin: default`. `familyResolves(family, sample)` was run with this beat's own strings, and
`useTypeface`'s own gate calls it WITHOUT a sample, so the diacritics were settled by rendering the
frame and reading the glyphs out of the PNG, not by the check.

## Framing, measured

`framingMeasurement` is printed at every render. Both readings are computed and printed, and the
render REFUSES if the two rankings agree at the top — because then the standfirst this beat writes
would be false.

## Anti-patterns for this case

- Drawing the raw count as the geometry and mentioning the rate in a footnote. That is the
  article's headline redrawn, and the article's own second paragraph already disowns it.
- A zero-suppressed axis. The values run 35,3 to 40,5 and a truncated baseline would turn a 15 %
  spread into a landslide. Bars start at zero.
- A legend. Every mark is labelled at the mark.
- Printing a value inside a bar, where the accent fill would be under the type.
- Colouring the maximum. The accent belongs to the subject.
