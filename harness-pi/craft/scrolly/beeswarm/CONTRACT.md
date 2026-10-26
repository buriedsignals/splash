# Beeswarm (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-beeswarm-co2-per-person` and the story's PALETTE.md and DIRECTION.md. The packing,
the circles, the cards above the field, the rule, colours, type, layout and the CHOREOGRAPHY are
done. One circle per member, placed along the axis by its `value`, its AREA its `size`. The graphic
stays fixed while six cards of prose travel up over it, and the reader's scroll moves the picture
continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | one dot per member, all of one size: position is the only channel | `cards.position` |
| 2 | the dots swell to their size and the field re-packs around them | `cards.size` |
| 3 | the largest circle is ringed, its card and hairline above the field | `cards.biggest`, `callout` |
| 4 | the size-weighted mean's rule; every member above it steps back to a neutral; a counter climbs to the share of the weight at or under the mean | `cards.mean`, `markerLabel`, `counts.mean` |
| 5 | only the members past `threshold` keep their tint; a counter climbs to their share of the weight; the farthest circle is ringed and named | `cards.tail`, `counts.tail`, `callout` |
| 6 | the whole field again, both circles named | `limits` |

The render chooses the two named circles: the largest (by `size`) and the farthest out (by `value`).
With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
marks, the threshold and the WORDS of this story's cards. `render-beat.mjs` (already in the folder)
computes every figure, checks your words against them, draws the page, checks it in a real browser
and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `marks`. A member is
`{ name, value, size }`.

| Field | What it is |
|---|---|
| `r.count` | how many members (circles) |
| `r.whole` | the sum of every `size` |
| `r.mean` | the size-weighted mean `Σ value×size / Σ size` (the rule on card 4) |
| `r.median` | the median member's value (members sorted by value, the one at `Math.floor(n / 2)`) |
| `r.threshold` | your `threshold` |
| `r.biggest`, `r.farthest` | the largest circle and the farthest one out, each `{ name, value, size, share }` (`share` = its size as a percent of `r.whole`) |
| `r.underMeanShare` | percent of the weight (sizes) whose value is at or under the mean (card 4's counter) |
| `r.tail` | `{ count, share, members }`: the members past `threshold`, and their share of the weight in percent (card 5's counter) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `marks` | One `{ name, value, size }` per member, from `data.json`: `value` places it on the axis (zero or more), `size` is its circle's area (more than zero). Ten or more marks; one per name. |
| `threshold` | The value past which card 5 keeps the tail: the takeaway's own threshold. It must be above `r.mean`, with at least one member past it. |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `axisName` | The measure and its unit, printed at the end of the axis. |
| `markerLabel(r)` | The mean rule's name with its value; must state `format(r.mean)` ("world average 4.6 t"). |
| `callout(m)` | The card above a named circle. `m` is `{ name, value, size, share, role }`, `role` `"biggest"` or `"farthest"`. Return `{ label, lines }`: `label` the member's name as printed, `lines` one or two short facts, one of them stating `format(m.value)`. A size may be written in its own unit (`m.size / 1e9`). |
| `counts` | `{ mean(r), tail(r) }` — the two counters' sentences, each holding `{n}` exactly once: the slot the drive counts the share into ("{n} % of people emit less"). `mean` counts to `r.underMeanShare` in whole percents; `tail` to `r.tail.share` at one decimal. |
| `tailCountDecimals` | Optional, 1 (or 0). The drive writes a counter's decimal with a comma; a language with a decimal point must set 0. |
| `cards` | `{ position(r), size(r), biggest(r), mean(r), tail(r) }` — the prose of cards 1 to 5. Card 3 must state `format(r.biggest.value)` and `format(r.median)`; card 4 `format(r.mean)`; card 5 `r.tail.count` and `format(r.farthest.value)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what a circle is, what its area means, the limits the journalist named. There is no size legend: say it here. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the swarm (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 4. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `tickStep` | Optional: the axis step. Leave it out; it is derived. |
| `check(r)` | Throws if the data no longer supports the title or a card's words (it receives `r`). |

The render refuses, saying what to change, when: a name appears twice; a value is negative or a size
is zero or less; `threshold` is not above the mean or no member is past it; the largest circle is
also the farthest one out (card 3 and card 5 name two different members); a counter has no `{n}`; a
card, a callout or `markerLabel` does not state its figure; or a card, a counter, a callout or the alt
states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, RATE, WEIGHT] = [col("region"), col("rate_per_1000"), col("residents")];
const marks = data.rows.map((r) => ({ name: r[NAME], value: Number(r[RATE]), size: Number(r[WEIGHT]) }));
```

Leave out aggregate rows (a "Total" or "World" row is not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a counter, a callout or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a card over another, a counter cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
