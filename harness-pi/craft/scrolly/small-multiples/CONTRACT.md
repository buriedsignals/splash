# Small multiples (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-small-multiples-lowcarbon` and the story's PALETTE.md and DIRECTION.md. Panels, bars,
the scatter, colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while six
cards of prose travel up over it, and the reader's scroll moves the picture continuously from one
card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | one panel per member, alphabetical, the first state's bar alone; one scale for all | `cards.start`, `notes.start` |
| 2 | the second state's bars grow, every change written under its panel | `cards.rise`, `notes.rise` |
| 3 | the panels travel to the order of their first-state level, lowest first | `cards.byFrom`, `notes.byFrom` |
| 4 | every panel condenses into one point — first level across, gain up — the fitted line drawn, the two extremes named | `cards.scatter`, `notes.scatter` |
| 5 | the panels come back in the order of their gain, largest first; the largest and smallest gain in the accent | `cards.byGain`, `notes.byGain` |
| 6 | the grid in gain order stands | `limits`, `notes.reading` |

Every bar shares ONE scale from 0 to 100: the values are shares in percent. Card 4's gain axis starts
at 0, so every member must have risen (or stayed). The two panels in the accent are COMPUTED (the
largest and the smallest gain). With JavaScript off the page shows card 6's picture and every card's
words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
panels and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `panels`. A panel in `r` is
`{ name, from, to, delta }` (`delta` = `to − from`).

| Field | What it is |
|---|---|
| `r.count` | how many panels |
| `r.states` | your `states` |
| `r.panels` | every panel |
| `r.lowest`, `r.highestStart` | the panels with the lowest and highest first-state value |
| `r.risers` | how many panels rose |
| `r.correlation` | the correlation between the first-state level and the gain (−1 to 1; card 4) |
| `r.slope` | the fitted line's slope: points of gain per point of first level |
| `r.biggest`, `r.smallest` | the panels with the largest and the smallest gain (the accent, card 5) |
| `r.meanGain` | the average gain |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `panels` | One `{ name, from, to }` per member (6 to 24), from `data.json`: `from` the value at the first state, `to` at the second, both between 0 and 100, `to` at least `from`. `name` in the story's language, each once. Any order: the cards order them. |
| `states` | The two states' labels, `{ from: "2000", to: "2024" }`. They print in the key. |
| `xName`, `yName` | Card 4's axis names: the first-state level ("low-carbon share in 2000, %") and the gain ("gain 2000–2024, points"). |
| `format(v)` | How a value is printed, in the story's language. |
| `formatDelta(v)` | How the change printed under each panel reads, with its sign ("+74"). |
| `cards` | `{ start(r), rise(r), byFrom(r), scatter(r), byGain(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.lowest.from)` and `format(r.highestStart.from)`; card 4 the correlation `r.correlation` to at least two decimals; card 5 `formatDelta(r.biggest.delta)` and `formatDelta(r.smallest.delta)`. |
| `notes` | `{ start(r), rise(r), byFrom(r), scatter(r), byGain(r), reading(r) }` — the short accent note in the header while each card is read (a few words: "correlation: −0.76"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the grid (one panel per member, one scale, the number under each is the change) and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the panels (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a value lies outside 0–100; a member fell; there
are fewer than 6 or more than 24 panels; a card does not state its figure; or a card, a note or the
alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [PLACE, YEAR, SHARE] = [col("place"), col("year"), col("share")];
const at = (place, year) => Number(data.rows.find((r) => r[PLACE] === place && Number(r[YEAR]) === year)[SHARE]);
const places = [...new Set(data.rows.map((r) => r[PLACE]))];
const panels = places.map((p) => ({ name: p, from: at(p, 2000), to: at(p, 2024) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` / `formatDelta()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — panel names included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a name cut, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
