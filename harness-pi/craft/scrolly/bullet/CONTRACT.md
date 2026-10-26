# Bullet (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-bullet-low-carbon-share` and the story's PALETTE.md and DIRECTION.md. The tracks, the
two bars, the verdicts, colours, type, layout and the CHOREOGRAPHY are done. One row per member, each
a SHARE in % on a track from 0 to 100: a thick pale bar for the earlier state (`marker`) and a thin
saturated bar for the later one (`measure`). The graphic stays fixed while six cards of prose travel
up over it, and the reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the thick pale bars (earlier) extend from zero along their tracks, rows in the earlier order | `cards.tracks` |
| 2 | the thin saturated bars (later) extend on from where the earlier ones end | `cards.measure` |
| 3 | the rows re-sort by their gain, the subject rising to the top; every row's gain counted ("+17,3 pts"); the two states named on the subject's row | `cards.gain`, `labels.marker`, `labels.measure` |
| 4 | the half (50 %) is ruled across the tracks; every row past it steps back | `cards.half`, `labels.half` |
| 5 | the axis closes onto `zoomFrom`–100 %; the rows below it step back | `cards.zoom` |
| 6 | back to the full track and the earlier order | `limits` |

Every row prints its gain, counted by the page as "+x,x pts" (one decimal, a decimal COMMA): that
text is the drive's, not yours, so the story must be in a language that writes a decimal comma. With
JavaScript off the page shows the rows sorted by gain, both bars drawn and every gain written. You do
not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows`. A row is
`{ name, label, marker, measure, gain }` (`gain` = measure − marker, in points).

| Field | What it is |
|---|---|
| `r.count` | how many rows |
| `r.rows` | every row, by gain, largest first (the subject first) |
| `r.subject` | the subject's row |
| `r.byMarker`, `r.byMeasure` | the rows by their earlier and their later share, highest first |
| `r.firstBefore`, `r.lastBefore` | the highest and the lowest earlier share |
| `r.nextAbove` | the second-lowest later share (the row just above the last one) |
| `r.underHalf` | the rows whose later share is under 50 % |
| `r.sameOrder` | true if the later order is the earlier order |
| `r.zoomFrom`, `r.zoomMid` | card 5's axis start, and the middle of its axis ((zoomFrom + 100) / 2) |
| `r.inZoom` | the rows whose earlier share is at or above `zoomFrom` |
| `r.saturated` | `{ threshold, count, rows, maxGain }`: the rows already at or above `zoomMid` earlier, and their largest gain |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, label, marker, measure }` per member, from `data.json`, 3 to 10 rows: `name` identifies it, `label` is how it is printed (optional), `marker` the earlier share, `measure` the later, both in % between 0 and 100. Every row must gain (`measure ≥ marker`). |
| `subject` | The `name` of the row the takeaway is about. It must be the row that gained most: card 3 lifts it to the top. |
| `unit` | The unit printed on the last tick ("%"). |
| `format(v, decimals)` | How a share is printed, `decimals` 1 by default; the state labels ask for 0. It must write a decimal comma. |
| `zoomFrom` | Optional: where card 5's narrowed axis starts (default 90), between 50 and 100, with at least one row's earlier share at or above it. |
| `labels` | `{ marker(r), measure(r), half(r) }`: the two state names set on the subject's own bars — `marker` must state `format(r.subject.marker, 0)` ("2015: 14 %"), `measure` `format(r.subject.measure, 0)` — and the half's name on card 4 ("half"). |
| `cards` | `{ tracks(r), measure(r), gain(r), half(r), zoom(r) }` — the prose of cards 1 to 5. Card 1 must state `format(r.lastBefore.marker)`; card 3 `format(r.subject.marker)`, `format(r.subject.measure)` and `format(r.subject.gain)`; card 4 `format(r.subject.measure)` and `format(r.nextAbove.measure)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the share counts, the two states, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title or a card's words (it receives `r`). |

The render refuses, saying what to change, when: a share is outside 0–100; a row loses (the later bar
extends on from the earlier one); `format()` writes a decimal point; the subject is not the row that
gained most; no row is at or above `zoomFrom`; a card or a state label does not state its figure; or a
card, a label or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, PART, WHOLE] = [col("region"), col("year"), col("renewable_gwh"), col("total_gwh")];
const shareOf = (name, year) => {
  const r = data.rows.find((x) => x[NAME] === name && Number(x[YEAR]) === year);
  return (Number(r[PART]) / Number(r[WHOLE])) * 100;
};
const names = [...new Set(data.rows.map((r) => r[NAME]))];
const rows = names.map((n) => ({ name: n, marker: shareOf(n, 2015), measure: shareOf(n, 2024) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a label or the alt is taken from `r` (through `format()` for shares), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a label over another, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
