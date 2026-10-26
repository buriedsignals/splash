# Parallel coordinates (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-parallel-coordinates-electricity-mix` and the story's PALETTE.md and DIRECTION.md.
Rails, lines, colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while six
cards of prose travel up over it, and the reader's scroll moves the picture continuously from one
card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | one axis (the takeaway's first measure) alone: every point, its floor drawn, the lines at or above it named | `cards.first`, `notes.first` |
| 2 | the second axis stands beside it, a line grows from each point; the lines at or above ITS floor named | `cards.second`, `notes.second` |
| 3 | the lines at or above both floors take the accent, every other line steps back | `cards.crossing`, `notes.crossing` |
| 4 | the other axes arrive one by one, each on its own scale | `cards.unfold`, `notes.unfold` |
| 5 | the accented lines' values written on every axis | `cards.follow`, `notes.follow` |
| 6 | the plate, every line named once at its own highest axis | `limits`, `notes.reading` |

Each entity is ONE line crossing every axis; each axis has its own scale from 0 to a rounded
ceiling. Only NEIGHBOURING axes show a relationship, so the axis order is the argument: the two
measures the takeaway relates come FIRST, side by side. Every axis is a percentage (the ceilings are
printed with `%`): draw shares. With JavaScript off the page shows card 6's picture and every card's
words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `lines`, `axes` and `floors`:

| Field | What it is |
|---|---|
| `r.count` | how many lines (entities) are drawn |
| `r.axisCount` | how many axes |
| `r.axes` | `[{ key, name, ceiling }]`, left to right |
| `r.first` | the first axis: `{ key, name, floor, count, lines }` — `lines` are the ones at or above its floor, highest first, each `{ key, name, values }` |
| `r.second` | the same for the second axis |
| `r.bothCount`, `r.both` | how many lines clear both floors, and those lines `[{ key, name, values }]` (the accent) |
| `r.corr` | the correlation between the first two axes across every line (negative when they lean against each other) |

`values` is keyed by axis key, as you gave it.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `axes` | The axes left to right, 3 to 9: `[{ key, name }]`. The FIRST two are the takeaway's two measures. `name` is printed at the top of the rail. |
| `lines` | One `{ key, name, values }` per entity (3 to 30): `values` gives EVERY axis's value by axis key, a share in %, zero or more, from `data.json`. One line per entity — filter to one year first. |
| `claimAxes` | The two axis keys the takeaway relates — `axes[0].key` and `axes[1].key`, in that order. |
| `floors` | The takeaway's two thresholds, `[floorOnFirstAxis, floorOnSecondAxis]` ("more than 25 % nuclear and more than 20 % wind" → `[25, 20]`). A line at or above a floor counts. |
| `thread` | The `key`s of the lines that clear BOTH floors (1 to 3). The render computes them and refuses another list. |
| `bounds` | Optional: what a card says about the accented lines on other axes, checked on each of them: `[{ axes: [keys], below: 2 }]` ("gas and coal each under 2 %"), `{ axes, atLeast }`, and `sum: true` to bound their total. A bound's number may then be written in the cards. |
| `ceilingStep` | Optional: the step the ceilings are rounded up to (default 10). |
| `unit` | The line above the rails saying what every value is ("share of the country's electricity, in %, 2024"). |
| `format(v)` | How an accented line's value is written on an axis in card 5 (`${Math.round(v)} %`). |
| `cards` | `{ first(r), second(r), crossing(r), unfold(r), follow(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.first.floor`; card 2 `r.second.floor`; card 3 `r.corr` (one decimal is enough) and name every line of `r.both`; card 5 name every line of `r.both`. |
| `notes` | `{ first(r), second(r), crossing(r), unfold(r), follow(r), reading(r) }` — the short accent note in the header while each card is read ("5 countries at 25 % nuclear or more"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how the plate reads and what the figures leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the plate (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the takeaway's two axes are not the first two; no
line, or more than twelve, reaches a floor; fewer than one or more than three lines clear both;
`thread` is not those lines; a bound does not hold for an accented line; a card does not state its
figure or name its lines; or a card, a note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const axes = [{ key: "part_a", name: "A" }, { key: "part_b", name: "B" }, { key: "part_c", name: "C" }];
const ALL = ["part_a", "part_b", "part_c", "part_other"]; // every part, drawn or not
const lines = data.rows
  .filter((r) => Number(r[col("year")]) === 2024)
  .map((r) => {
    const total = ALL.reduce((s, k) => s + Number(r[col(k)]), 0);
    return { key: r[col("code")], name: r[col("place")], values: Object.fromEntries(axes.map((a) => [a.key, (Number(r[col(a.key)]) / total) * 100])) };
  });
```

If the takeaway speaks of shares, compute each share from the row's total (every part, including
the ones not drawn as axes) and draw the share, not the raw value.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (or a `bounds` entry), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine; a count may be spelled out.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong lines in the accent, a card cut, a wrong number), fix `beat.mjs` with
  a small `edit_file`, render and look again.
