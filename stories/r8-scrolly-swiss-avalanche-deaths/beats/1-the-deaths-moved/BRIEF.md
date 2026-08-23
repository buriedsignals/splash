# Beat 1 — the deaths moved

**Slot:** 1. **Medium:** map. **Format:** scrolly. **Assembles:** map, image, chart.
**Language:** en. **Ground:** `#16191B`. **Accent:** `#D4A853` (controlled terrain).
**Second accent:** `#5B8A8A` (uncontrolled terrain). **Typeface:** `Helvetica, Arial, sans-serif`,
`origin: default` — see `../../TYPEFACE.md`, and the hand-over note below.

## What this beat has to prove

That Swiss avalanche deaths did not fall — they relocated. 247 of the first twenty winters' 478
deaths were in buildings or on transport routes; 8 of the last twenty winters' 442 were.

## The four steps, and why each one needs its own medium

| Step | Frame | What only this can say |
| --- | --- | --- |
| 1 `where` | Baked Swiss basemap, one dot per fatal avalanche, area by the number it killed | WHERE. The dots' own shape IS the Alpine arc; no chart has geography. |
| 2 `two-terrains` | Drawn schematic: a village and a road at the foot of a slope, two figures on it, one avalanche path crossing both | WHAT THE TWO CATEGORIES ARE. The SLF's split is a definition, and no chart carries a definition. |
| 3 `crossover` | 88 winters, two counts, accent on controlled terrain | WHAT CHANGED, and that the total did not. |
| 4 `forecast` | The forecast danger level on the 323 accidents that carry one | WHAT THE BULLETIN SAID — a different variable and a different population, carrying the publisher's own warning verbatim. |

## Where each figure comes from

`avalanche-data.ts` reads `../../source/data.csv` — byte-identical to the EnviDat download — and
derives everything. No figure on the page is a literal. `test/facts.test.ts` recomputes all of them
a second time and asserts the delivered HTML contains each.

## What the frozen file does that a naive reader gets wrong

1. The header is on line 4, under three publisher banner lines. `intake` profiled the first of
   those as the header and the whole 21-column table as one text column; `source/profile.json`
   still carries that reading and is kept as the measurement.
2. Three spellings of Pontresina (`\tPontresina`, `Pontresina`, `Pontresina/Puntraschigna`) and two
   of Glarus (`GL`, `Gl`). Trimming and upper-casing settle the whitespace pair; the bilingual name
   is left alone and recorded.
3. `LI` is Liechtenstein — 5 accidents, 6 deaths — in a file titled "in Switzerland". Found because
   `cantonName` refuses a code it does not hold rather than printing it.
4. `activity` is multi-valued: 12 of 2,146 deaths sit on accidents spanning both terrains or with
   no activity recorded. Drawn as neither, and the frame says so.
5. The publisher's own companion per-year file disagrees with this one in 5 of the 85 winters both
   cover. The beat counts from the accident register alone and the source line says so.

## Composition decisions this beat had to make, and why

- **The map is FITTED, not COVER-cropped.** The seed crops its map because its map is a locator;
  this one is evidence. Measured: at 375×720 a cover-crop of the 1240×640 plate would show 27% of
  Switzerland's width. Letterboxed on the render's own ground instead.
- **The landform stretches; the houses and the figures do not.** Drawn inside the stretched SVG
  they became rockets at 375px. They are HTML marks at a fixed pixel size, positioned on the same
  geometry.
- **One breakpoint at 600px**, matching the scaffold's own: above it the card is a fixed 409px and
  every descriptive label is capped so it stays out of that stripe; below it the card is edge to
  edge, there is no stripe, and the caps are lifted.

## The hand-over note this format owes

`scrolly` reads no `TYPEFACE.md`. `render-scrolly.mjs` writes `Helvetica, Arial, sans-serif` into
the delivered page's CSS as a constant, so the prose cards a reader reads are set in it whatever
the story recorded. The story's own answer is recorded in `../../TYPEFACE.md` and this render did
not reach it.
