---
id: pictogram
engines:
  chart-native: pictogram
intent: [magnitude, ranking]
shape: single
limits: { maxCategories: 8, minRows: 2 }
formats: [static, interactive, video]
bestFor:
  - "a magnitude a reader should be able to VERIFY by counting — people, beds, deaths, medals, buildings — where the unit is a countable thing and the count is small"
  - "a human-scale quantity a general audience will not feel from a bar's length — one figure = 10,000 residents makes 84,000 something you can count to"
notFor:
  - "precise comparison — the last icon is a fraction of a shape, and no reader reads 8.4 off a clipped figure; use a bar"
  - "a wide range of magnitudes — one unit cannot serve a row of 12 icons and a row that rounds to none; use a bar"
  - "many categories — past ~8 rows the block reads as texture, not as a count"
  - "a share of one whole — that is a waffle (a filling container), not several independent rows"
  - "an abstract or continuous quantity (a rate, an index, a temperature) — there is nothing countable for the icon to be"
---

# Pictogram / isotype chart — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "magnitude" pictogram/isotype —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (pictogram) · Haroz, Kosara & Franconeri, "ISOTYPE Visualization —
> Working Memory, Performance, and Engagement with Pictographs", CHI 2015 · the Neurath /
> Arntz ISOTYPE convention (repeat the symbol, never resize it). credited.
> Inherits: `global/dataviz.md` (L0).

A pictogram shows a magnitude as a **count of identical icons**, one row per category, each
icon standing for a stated unit ("one figure = 10,000 residents"). It answers **"how many —
in a unit you can count"**. Its whole claim over a bar is verifiability: a bar asks the
reader to trust a length against an axis, a pictogram lets them count.

That claim is fragile, and everything below exists to protect it.

## When to use / when NOT — read the caveats first

- **Use** for: a magnitude a reader should be able to VERIFY by counting, where the unit is a
  countable THING (people, beds, medals, buildings) and the count stays small.
- **Use** for: a human-scale quantity a bar's length will not make felt — "one figure =
  10,000 residents" turns 84,000 into something you count to.
- **Not** for: precise comparison. The last icon is a clipped fraction of a shape and nobody
  reads 8.4 off it — use a **bar**.
- **Not** for: a wide range of magnitudes. One unit has to serve every row; if the largest
  needs a countable number of icons the smallest rounds to none, and a real value drawn as
  nothing is a lie. Use a **bar**.
- **Not** for: many categories — past ~8 rows the block stops being a count and becomes
  texture.
- **Not** for: a share of ONE whole — that is a **waffle**. The two share the arithmetic and
  differ in what they claim: a waffle divides a single container into parts that sum to it,
  a pictogram compares SEVERAL independent magnitudes that sum to nothing.
- **Not** for: an abstract or continuous quantity (a rate, an index, a temperature) — there
  is no countable thing for the icon to be, and an icon that stands for nothing is decoration.

## Correctness "de base" (pictogram-specific)

1. **State the unit, on the graphic.** "= 10 000 residents", next to one specimen icon. The
   count is undecodable without it, and a caption elsewhere is not the graphic. →
   `checkPictogramConformance` (`unitStated`); the key is unconditional in the component.
2. **Every icon the same size.** Magnitude is the COUNT, never the size — one stretched icon
   double-encodes (area *and* length) and reads worse than the repeated form (Haroz et al.
   2015: repeated icons beat a single scaled object). The geometry has one shared `iconSize`
   by construction: there is no per-row size to get wrong.
3. **Keep the count countable — ~12 icons on the longest row, never past 20.** Counting is
   exact for a handful and is estimation well before twenty; past that the row is read as a
   LENGTH, which is a bar drawn worse ("as long as the number is low", Haroz et al.). The
   unit is DERIVED to hit that band (`chooseUnitPerIcon`, a round 1-2-5 value because the key
   is read aloud), and the produce guard refuses a row past 20 by name.
4. **No positive value may draw zero icons.** If the range is so wide that a real quantity
   rounds away, the chart states a falsehood about it. The guard fails loud and the honest
   repair is a bar, not a smaller icon.
5. **One Okabe-Ito hue for the icons.** Colour is not the channel here; the house/subject hue
   tints the furniture and the title band and never touches a figure.
6. **A row label and the real value.** The icons carry the felt magnitude; the number at the
   end of the row carries the precision the icons deliberately do not.

## data-to-viz caveats (credited)

- The partial last icon is the type's weak point: it encodes a remainder as a fraction of a
  silhouette, which is read poorly. Print the exact value at the end of the row so the
  precision never depends on reading half a figure.
- No superfluous imagery. Decorative icons behind or around the chart measurably hurt both
  reading and memory (Haroz et al. 2015) — the icon must BE the data mark, not garnish on a
  bar.

## Motion grammar (how a pictogram *builds*)

See `formats/video.md`; the pictogram gesture:

- chrome (row labels + the unit key) fades in first;
- the icons **fill in left→right**, column by column across every row at once, so the rows
  grow together and the longest one finishes last — the accumulation IS the count being made;
- each row's value label lands as that row finishes filling.
An icon never moves or changes size — only its opacity, and the last one's clip — so frame N
stays a pure function of the frame.
