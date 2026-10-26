# Line (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-line-swiss-co2` and
the story's PALETTE.md and DIRECTION.md. The curve, the reference rule, the scales, colours, type,
layout and the CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up
over it, and the reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the line is drawn from its first year to `referenceYear`; that year's level is set as a dashed rule | `cards.rise`, `notes.rise` |
| 2 | the line is drawn on to the series' highest year, marked and written | `cards.peak`, `notes.peak` |
| 3 | the line is drawn to `plateauTo`; the years from the peak to it are shaded as a band, its floor written; the plateau's highest year after the peak is marked | `cards.plateau`, `notes.plateau` |
| 4 | the fall is drawn to the last year; the first year after `referenceYear` under the rule is ringed | `cards.cross`, `notes.cross` |
| 5 | both scales travel to the close-up (`zoomFrom` to the last year), every year a dot and its value | `cards.zoom`, `notes.zoom` |
| 6 | the whole line stands: the rule, the peak, the last year written | `limits`, `notes.reading` |

The wide view reads from zero; the close-up fits its own window. With JavaScript off the page shows
card 6's picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
series, the three years that place the gestures, and the WORDS of this story's cards.
`render-beat.mjs` (already in the folder) computes every figure, checks your words against them,
draws the page, checks it in a real browser and prints `look at: <png>` (card 1), with one PNG per
card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `data`. Each point is
`{ year, value }`.

| Field | What it is |
|---|---|
| `r.count` | how many years the series has |
| `r.first`, `r.last` | the first and the last year |
| `r.reference` | the `referenceYear` point (the rule's level) |
| `r.ratio` | reference ÷ first (card 1: "it tripled") |
| `r.peak` | the highest year of the series |
| `r.yearsToPeak` | peak year − reference year (card 2: "six more years") |
| `r.plateau` | `{ from, to, floor, runnerUp }`: from = the year after the peak, to = `plateauTo`, floor = the lowest year in it, runnerUp = the highest year in it |
| `r.runnerUp` | the same as `r.plateau.runnerUp`: the plateau year that came closest to the peak |
| `r.peakGap` | peak − runnerUp |
| `r.plateauEnd` | the `plateauTo` point |
| `r.highestAfterPlateau` | the highest year after `plateauTo` |
| `r.cross` | the first year after `referenceYear` under the rule |
| `r.gap` | reference − last (how far the last year is under the rule; negative if above) |
| `r.zoomFrom`, `r.zoom` | the close-up's first year, and its points |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `data` | One `{ year, value }` per year, from `data.json` (one series), every year present, values zero or more. Use `series()` (below). At least 12 years. |
| `unit` | The unit line above the plot ("million tonnes of CO₂ (Mt)"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `referenceYear` | The year whose level the rule is drawn at — the level the takeaway compares to. It must come before the peak, its level above the first year's. |
| `plateauTo` | The last year of the plateau that card 3 shades (after the peak, before the first year under the rule). |
| `zoomFrom` | Optional: the close-up's first year (default: the last ten years). It must be at or before `r.cross.year`. |
| `cards` | `{ rise(r), peak(r), plateau(r), cross(r), zoom(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.first.value)` and `format(r.reference.value)`; card 2 `format(r.peak.value)`; card 3 `format(r.plateau.floor.value)` and `format(r.runnerUp.value)`; card 4 `r.cross.year`; card 5 `format(r.cross.value)`, `format(r.last.value)` and `format(r.gap)`. |
| `notes` | `{ rise(r), peak(r), plateau(r), cross(r), zoom(r), reading(r) }` — the short accent note in the header while each card is read ("1967: 32.5 Mt"). |
| `labels` | `{ reference(r), peak(r), runnerUp(r), plateau(r), cross(r), end(r) }` — the labels on the plot, each stating its point's value through `format()` (plateau: the floor). Keep them short (under ~30 characters). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the curve (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title or a card's words (it receives `r`). |

The render refuses, saying what to change, when: a year is missing (the line must not bridge a gap);
`referenceYear` is not before the peak, or its level is not above the first year's; `plateauTo` is
not between the peak and the last year; no year after `referenceYear` goes under the rule, or the
first one does inside the plateau; `zoomFrom` is after the crossing; a card or a label does not state
its figure; or a card, a note, a label or the alt states a number no figure of `r` rounds to.

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "emissions_mt", where: { region: "All regions" }, from: 1990 });
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a label or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a label over another, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
