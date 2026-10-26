# Slope (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-slope-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. Rails, lines, labels, colours, type, layout and the
CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up over it, and the
reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the left rail alone: every member's first value, named | `cards.rail`, `notes.rail` |
| 2 | the slopes grow to the right rail, its values written as they land | `cards.rise`, `notes.rise` |
| 3 | a ring at every crossing: where two slopes cross, two members swapped places | `cards.cross`, `notes.cross` |
| 4 | the pair (your two `thread` lines) in the accent, its crossing ringed, the rest stepping back | `cards.pair`, `notes.pair` |
| 5 | the two largest gains in the ink, their changes written | `cards.gains`, `notes.gains` |
| 6 | every line but the pair and the heaviest others leaves; those stay, re-seated with their changes | `limits`, `notes.reading` |

Both rails share ONE scale from 0 to 100: the values are shares in percent. There is no value axis,
so every end value drawn is written. With JavaScript off the page shows card 6's picture and every
card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
lines and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `lines`. A line in `r` is
`{ key, label, from, to, delta, weight }` (`delta` = `to − from`).

| Field | What it is |
|---|---|
| `r.count` | how many lines (members) there are |
| `r.rails` | your `rails` |
| `r.lines` | every line |
| `r.lowest`, `r.highest` | the lines with the lowest and highest value on the left rail |
| `r.risers`, `r.fallers` | how many lines went up, and down |
| `r.crossings` | how many pairs of lines cross between the rails (card 3's rings) |
| `r.climber`, `r.held` | the pair: the thread line that started below and ended above, and the one it passed |
| `r.gapBefore`, `r.gapAfter` | how far below `held` the climber started (`held.from − climber.from`), and how far above it ended (`climber.to − held.to`) |
| `r.passedHeld` | every line that started below `held` and ended above it |
| `r.gains` | the two lines with the largest `delta`, largest first (card 5) |
| `r.drawCount`, `r.keptOthers` | how many lines card 6 keeps, and the others it keeps beside the pair (heaviest `weight` first) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lines` | EVERY member as `{ key, label, from, to, weight, thread }` (4 to 20), from `data.json`: `from` the value at the left rail, `to` at the right, both between 0 and 100; `label` the name printed, in the story's language; `weight` what card 6 keeps the largest of (e.g. the member's size); `thread: true` on the TWO lines the title is about, whose order the rails swap. |
| `rails` | `{ left, right }`: what each rail is, e.g. `{ left: "2000", right: "2024" }`. |
| `subject` | The `key` of the thread line the takeaway is about. |
| `drawCount` | Optional: how many lines card 6 keeps, the pair included (default 6). |
| `unit` | The unit line above the rails ("share of low-carbon electricity, %"). |
| `format(v)` | How an end value is printed, in the story's language. |
| `formatDelta(v)` | How a change is printed, with its sign ("+3.2", "−1.0"). |
| `cards` | `{ rail(r), rise(r), cross(r), pair(r), gains(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.lowest.from)` and `format(r.highest.from)`; card 3 `r.crossings`; card 4 `format(r.gapBefore)` and `format(r.gapAfter)`; card 5 `formatDelta(g.delta)` for each of `r.gains`. |
| `notes` | `{ rail(r), rise(r), cross(r), pair(r), gains(r), reading(r) }` — the short accent note in the header while each card is read (a few words: "16 crossings"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the plate (no axis: slope = direction, numbers = level), which lines it keeps, and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the lines (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title — tested against ALL the lines (it receives `r`). |

The render refuses, saying what to change, when: a value lies outside 0–100; there are not exactly
two thread lines, or they do not cross; `subject` is not one of them; one of the two largest gains is
a thread line (card 5 would light nothing new); a card does not state its figure; or a card, a note
or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [PLACE, YEAR, SHARE, SIZE] = [col("place"), col("year"), col("share"), col("size")];
const at = (place, year) => data.rows.find((r) => r[PLACE] === place && Number(r[YEAR]) === year);
const places = [...new Set(data.rows.map((r) => r[PLACE]))].sort();
const lines = places.map((p) => ({
  key: p, label: p, from: Number(at(p, 2000)[SHARE]), to: Number(at(p, 2024)[SHARE]),
  weight: Number(at(p, 2024)[SIZE]), thread: p === "A" || p === "B",
}));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()` / `formatDelta()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — line labels included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong pair in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
