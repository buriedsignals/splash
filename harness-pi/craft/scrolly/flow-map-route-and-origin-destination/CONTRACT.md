# Flow map (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-flow-map-ukraine-protection`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE, flat MapTiler map with a FAN of bands out
of ONE origin country, one band per destination country, its width the flow's value. The map stays
fixed while six cards of prose travel up over it; the reader's scroll traces the bands largest first
and counts the share they carry. The geometry (each band a bow away from the fan's mean bearing), the
colours, the width key, the camera and the CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the origin's node; the total in the header | `cards.origin`, `totalNote` |
| 2 | the widest band traced to the largest destination; the share counts (`counter`) | `cards.first` |
| 3 | the second band; the share of the two together | `cards.second` |
| 4 | the next bands traced one after another, each named as it arrives | `cards.drawn` |
| 5 | a dot at each smaller destination, too small for a band | `cards.others`, `othersNote` |
| 6 | everything: the two largest in bold, the width key (`keySizes`, `drawnNote`, `othersKey`) | `limits` |

Under the live map lies one frozen picture per card, which is what a reader without a script or a
network sees. With JavaScript off the page shows card 6's picture and every card's words. You do not
change any of that. The bands are not itineraries: only their width is a measure.

You write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder) ranks
the flows, computes the total and every share, checks your words against them, bakes the card
pictures, checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per card
in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**One origin, European countries only.** The origin and every destination are ISO alpha-3 codes of
the kit's shapes (Europe and its neighbours); each band runs from the origin's seat to the
destination's (the mean of its outline inside Europe). Give EVERY destination: card 5 is about the
ones too small for a band.

**The counter is written for French**: it prints its share with a decimal comma whatever the story's
language (the render prints a NOTE when it is not French).

## The reading `r`

| Field | What it is |
|---|---|
| `r.origin` | `{ iso, name }` |
| `r.total`, `r.count` | the sum of every flow; how many destinations |
| `r.first`, `r.second` | the two largest flows, `{ iso, name, value, share, rank }` (`share` = percent of the total) |
| `r.topTwoShare` | the two together, percent of the total |
| `r.drawCount`, `r.drawn` | how many bands are drawn; those flows, largest first |
| `r.third`, `r.last` | the third and the last drawn flow |
| `r.drawnShare` | the drawn bands' share of the total |
| `r.restCount`, `r.restShare` | how many destinations are dots, and their share |
| `r.ranked` | every flow, largest first |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `origin` | `{ iso, name, short }` — the ISO alpha-3 code of the one country every band leaves, its name in the story's language, and a short form shown on a phone (default: the code). |
| `flows` | One `{ iso, name, value }` per destination, from `data.json` (one period, one series): `name` in the story's language, `value` above zero. At least 6. |
| `drawCount` | Optional: how many bands are drawn, from the largest (default 10, between 4 and 12). |
| `unit` | The line above the map ("people under temporary protection, June 2026"). |
| `totalNote(r)` | The header note on card 1 ("4 504 080 people"). |
| `counter(r)` | The header counter from card 2: a phrase holding `{p}` once, the share the traced bands carry. |
| `othersNote(r)` | The header note on card 5 (the destinations too small for a band, their share). |
| `drawnNote(r)`, `othersKey(r)` | The key's words for the bands and for the dots. |
| `keySizes` | 1 to 3 round values the width key draws, each at most the widest flow. |
| `format(v)` | How a flow is printed in the key ("1 000 000 people"). |
| `count(n)` | How a count of people is printed in the cards ("1 250 825"). |
| `percent(p)` | How a share is printed ("27,8 %"). |
| `cards` | `{ origin(r), first(r), second(r), drawn(r), others(r) }` — the prose of cards 1 to 5. Card 1 must state `count(r.total)` and `r.count`; card 2 `r.first.name`, `count(r.first.value)` and `percent(r.first.share)`; card 3 `r.second.name`, `count(r.second.value)` and `percent(r.topTwoShare)`; card 4 `r.drawCount`; card 5 `r.restCount`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: the reading line (bands are not routes) and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the origin or a destination is not a country of
the shapes; the origin is among the flows; a destination appears twice or has no value above zero;
there are not more destinations than bands; the palette cannot draw a band on both land and sea; a
card does not state what its picture shows; or a card, a note, the counter or the alt states a
number no figure of `r` rounds to.

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, NAME, AMOUNT] = [col("iso3"), col("country"), col("amount")];
const flows = table.rows.map((r) => ({ iso: r[CODE], name: r[NAME], value: Number(r[AMOUNT]) }));
```

## Rules

- A band's width is a count (people, tonnes): never a rate.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(r.total / 1e5) === 45`), never with strict equality.
- Every number in a card, a note, the counter or the alt is taken from `r` (through `count()`, `percent()` and `format()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
