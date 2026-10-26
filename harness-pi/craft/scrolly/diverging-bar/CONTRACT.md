# Diverging bar (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-diverging-bar-eu-per-capita`
and the story's PALETTE.md and DIRECTION.md. One row per entity — name, value, bar — bars, colours,
type, layout and the CHOREOGRAPHY are done. A change is two levels subtracted: the scroll shows both
levels before it shows the difference, then gives the subject's small rise a length. The graphic stays
fixed while six cards of prose travel up over it, and the reader's scroll moves the picture
continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | every row's earlier level (`from`) as a bar from zero, sorted from the highest | `cards.levels`, `levelUnit` |
| 2 | each bar moves to its later level (`to`), the earlier length kept as an outline; a counter of the rows that fell climbs | `cards.fall`, `fellCount` |
| 3 | each bar leaves the level axis for the change axis out of a zero line, then the rows re-sort from the rise to the largest fall | `cards.swap`, `changeUnit` |
| 4 | the axis closes onto a narrow band around zero: the subject's rise gets a length, every other bar steps back | `cards.subject`, `subjectNote` |
| 5 | the whole axis again; the mean of the falls drawn down the chart; the rows that fell more than it kept, their values in bold | `cards.mean`, `meanNote` |
| 6 | every row, the subject in the accent, the mean | `limits` |

The changes, the falls, their mean and the close-up are computed. With JavaScript off the page shows
card 6's picture and every card's words. You do not change any of that.

This choreography is about ONE small rise among falls: the subject must be the row with the largest
change, that change must be above zero, and it must be too small to see on the whole change axis
(at most a tenth of it) — card 4 exists to give it a length. The bars and ticks print values with a
decimal comma (one decimal for a level, two for a change), so the story's numbers are written with a
decimal comma too.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every card function, `changeUnit` (when a function), `fellCount`, `subjectNote`, `meanNote` and `alt`
receive `r`, computed by the render from your `rows`. A row's reading is `{ name, label, code, from,
to, change, isSubject }`, `change` = `to − from`.

| Field | What it is |
|---|---|
| `r.count` | how many rows |
| `r.from`, `r.to` | your two years' names |
| `r.rows` | every row, from the largest rise to the largest fall (card 3's order) |
| `r.byLevel` | every row from the highest earlier level (card 1's order) |
| `r.rose`, `r.fell` | the rows whose change is above / below zero |
| `r.byFall` | the falls, the largest first |
| `r.subject` | the subject's reading plus `share` = its change as a percent of its earlier level |
| `r.mean` | the mean change of the falls (negative) |
| `r.beyondMean` | the falls larger than the mean (card 5's rows in bold) |
| `r.zoomDomain` | card 4's close-up, `[low, high]` |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, label, code, from, to }` per row, from `data.json`: `from` its EARLIER level, `to` its LATER level, both zero or more; `code` a short key of 2 to 5 letters or digits ("HRV"); `label` how it is printed (optional). 4 to 40 rows. |
| `subject` | The `name` of the row the takeaway is about: the largest (and small) rise. |
| `from` / `to` | The two years' names ("1990", "2024"). |
| `formatLevel(v)` | How a level is printed in a sentence ("30,9"). |
| `formatChange(v)` | How the SIZE of a change is printed, without its sign ("0,03", "20,48"): write "+" or "lost" yourself. |
| `cards` | `{ levels(r), fall(r), swap(r), subject(r), mean(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `formatLevel(r.byLevel[0].from)`; card 2 `r.fell.length`; card 4 `formatChange(r.subject.change)`; card 5 `formatChange(r.mean)`. |
| `levelUnit(year)` | The unit line over cards 1 and 2, for the year it is given ("tonnes per person, " + year). |
| `changeUnit` | The unit line from card 3 on ("change from 1990 to 2024, in tonnes per person"; a string or a function of `r`). |
| `fellCount(r)` | Card 2's counter, a few words stating `r.fell.length` ("26 of 27 emit less"): it climbs from 0 to that number. |
| `subjectNote(r)` | The note in card 4, stating `formatChange(r.subject.change)`. |
| `meanNote(r)` | The note with card 5's rule, stating `formatChange(r.mean)`. |
| `zoomDomain`, `levelTicks`, `changeTicks`, `zoomTicks` | Optional. Left out, the close-up runs from −5 × to 1 × a round number above three times the subject's change, and the ticks are round steps. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bars (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). A claim like "the only" is checked over ALL the rows (`r.rose.length === 1`). |

The render refuses, saying what to change, when: there are fewer than 4 or more than 40 rows; a row
has no short code; a level is negative; fewer than two rows fell; the subject did not rise, is not
the largest rise, or rose by more than a tenth of the change axis; `formatLevel` / `formatChange`
write a decimal point; a card or a note does not state its figure; or a card, a note or the alt states
a number no figure of `r` rounds to (sign aside).

## Reading the data

Rows are arrays in `columns` order. Read each entity's level in the two years:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, CODE, YEAR, VALUE] = [col("region"), col("region_code"), col("year"), col("amount")];
const levelOf = (name, year) => table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)?.[VALUE];
const names = [...new Set(table.rows.map((r) => r[NAME]))].filter((n) => levelOf(n, 1990) !== undefined && levelOf(n, 2024) !== undefined);
const rows = names.map((name) => ({ name, code: table.rows.find((r) => r[NAME] === name)[CODE], from: Number(levelOf(name, 1990)), to: Number(levelOf(name, 2024)) }));
```

Leave out aggregate rows (a "Total" or "World" row is not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `formatLevel()` / `formatChange()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong row in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
