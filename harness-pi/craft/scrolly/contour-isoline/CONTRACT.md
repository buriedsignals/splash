# Contour / isoline (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-contour-europe-distance`
and the story's PALETTE.md and DIRECTION.md. It measures ONE field everywhere: **the distance from the
sea**, as the crow flies, on a 6 km grid over the land of the study countries (computed by the kit from
its Natural Earth shapes, in an equal-area projection). It is a LIVE, flat MapTiler map that stays
fixed while six cards of prose travel up over it; the reader's scroll sweeps a fill inland from every
coast at once, leaving each isoline behind as it passes. The field, the lines, their numbers, the
camera and the CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the land, bare; the sea is the page's ground | `cards.land` |
| 2 | the fill sweeps to `firstStop`, its line left behind; the header counts the share of the land covered | `cards.first`, `counter` |
| 3 | to the median (half the land), its line in the accent | `cards.median` |
| 4 | to `farStop`; the islands of land beyond it remain | `cards.far` |
| 5 | the camera closes onto the last point the sweep reaches; its distance marked | `cards.last` |
| 6 | the fill withdraws: every line with its number | `limits` |

Under the live map lies one frozen picture per card (the lines and numbers, without the fill), which
is what a reader without a script or a network sees. With JavaScript off the page shows card 6's
picture and every card's words. You do not change any of that.

**This kit draws one field only — the distance from the sea in Europe.** You choose which countries'
land is measured (`study`), which lines are drawn and where the sweep stops. If the story's quantity
is anything else (a temperature, an elevation, a travel time), this kit cannot draw it — say so.
Russia cannot be in the study (the frame cuts it).

You write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder)
measures the field, computes every figure, checks your words against them, bakes the card pictures,
checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per card in
`renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

| Field | What it is |
|---|---|
| `r.studyCount`, `r.cellKm` | how many countries are measured; the grid's cell (6 km) |
| `r.median`, `r.medianLevel` | the distance half the land is within (km), and the same rounded (its line) |
| `r.deepest`, `r.deepestIso`, `r.deepestName` | the farthest point's distance (km), the country it falls in, its name from your `names` |
| `r.firstStop`, `r.firstShare` | your first stop (km) and the percent of the land within it |
| `r.farStop`, `r.farShare` | your far stop and the percent within it |
| `r.islands` | how many islands of land remain beyond the far stop |
| `r.levels`, `r.within(km)` | the drawn lines (yours and the median), and the percent of the land within one of them |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `study` | The ISO alpha-3 codes of the countries whose land is measured, from `data.json` (not RUS). |
| `levels` | 2 to 6 rising whole distances in km, the lines drawn (the median's line is added in the accent). |
| `firstStop` | One of `levels`, below the median: where card 2's sweep stops. |
| `farStop` | One of `levels`, above the median: where card 4's sweep stops. |
| `names` | `{ ISO3: name }` in the story's language for the country the farthest point may fall in (the render says which it needs). |
| `format(km)` | How a distance is printed ("132 km"), in the story's language. |
| `percent(p)` | How a share of the land is printed ("42 %"). |
| `counter` | The header counter, holding `{p}` (the percent) and `{km}` (the distance) once each ("{p} % of the land within {km} km"). |
| `unit` | The line above the map ("distance from the sea, in km"). |
| `outsideLabel` | The key's words for the land outside the measure. |
| `cards` | `{ land(r), first(r), median(r), far(r), last(r) }` — the prose of cards 1 to 5. Card 1 must state `r.studyCount`; card 2 `format(r.firstStop)` and `percent(r.firstShare)`; card 3 `format(r.medianLevel)`; card 4 `format(r.farStop)` and `percent(r.farShare)`; card 5 `format(r.deepest)` and `r.deepestName`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: the reading line and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the field no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a study code is not a country of the shapes, or is
RUS; the levels do not rise, include the median, or reach past the farthest point; a stop is not one
of the levels or sits on the wrong side of the median; a line has no room for its number; `names`
lacks the farthest point's country; a card does not state what its picture shows; or a card, the
counter or the alt states a number no figure of `r` rounds to.

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const CODE = table.columns.findIndex((c) => c.name === "iso3");
const study = table.rows.map((r) => r[CODE]).filter((c) => c && c !== "RUS");
```

## Rules

- `check()` tests only what the measured field can decide. A figure the field cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(r.median) === 132`), never with strict equality.
- Every number in a card, the counter or the alt is taken from `r` (through `format()` and `percent()`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. The first render bakes six pictures of the live map (a few
  minutes). If the render refuses, read its message and fix `beat.mjs`. If a picture is wrong, fix
  `beat.mjs` with a small `edit_file`, render and look again.
