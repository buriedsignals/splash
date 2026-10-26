# Proportional symbol (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-proportional-symbol-europe-capacity` and the story's PALETTE.md and DIRECTION.md. It is
a LIVE, flat MapTiler map of Europe, one HOLLOW circle per site at its coordinates, its AREA the
site's value. The map stays fixed while six cards of prose travel up over it; the reader's scroll
adds the circles largest first, so the weight piles up long before the count does. A counter in the
header says how many sites stand, their share of the sites and their share of the whole. Under the
live map lies one frozen picture per card, baked from the same map, which is what a reader without a
script or a network sees. The scale, the key, the camera and the CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the largest site alone, named (`largestLabel`) | `cards.largest` |
| 2 | the ten largest | `cards.ten` |
| 3 | the hundred largest | `cards.hundred` |
| 4 | the `subject` group's sites stand whatever their rank, every other site steps back; the camera centres the region holding most of them | `cards.subject`, `subjectNote` |
| 5 | every site: the field closes | `cards.all` |
| 6 | only the sites at or above `cut` stand; the note under the key says what is not drawn | `cards.cut` + `limits`, `cutNote`, `limitNote` |

With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
sites and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) ranks the sites,
computes every share, checks your words against them, bakes the card pictures from the live map,
checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per card in
`renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only, and many sites.** The map holds 24.6° W to 45° E and 34.5° N to 71.2° N (a site
north of that refuses; a few south or east of it are counted but off the frame). Cards 2 and 3 stand
the ten and the hundred largest, so give at least 200 sites — every one, not a sample.

**The counter is written for French.** It prints its two shares with a decimal comma and a space
before `%` whatever the story's language, and turns "centrales" into "centrale" at one site; the
render prints a NOTE when the story is not French.

## The reading `r`

| Field | What it is |
|---|---|
| `r.count`, `r.whole` | how many sites; the sum of their values |
| `r.largest` | `{ name, value, group, region, lon, lat, valueShare }` — the largest site (`name` = your `largestName`), its percent of the whole |
| `r.ten`, `r.hundred` | `{ count, siteShare, valueShare }` — the ten / hundred largest: their percent of the sites and of the whole; `r.hundred.subjectCount` = how many of the hundred are in the subject group |
| `r.subject` | `{ group, count, siteShare, valueShare, value }` — the subject group's sites |
| `r.focus` | `{ region, count }` — the region holding most of the subject group's sites (card 4's camera), and how many |
| `r.cut` | `{ threshold, count, siteShare, valueShare }` — the sites at or above `cut` |
| `r.shareOf(k)` | `{ count, siteShare, valueShare }` for the `k` largest |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `sites` | EVERY site as `{ value, lon, lat, group, region }`, from `data.json`: `value` the quantity a circle's area draws (above zero), `group` its category (e.g. its fuel), `region` the region it is in (e.g. its country). |
| `subject` | The `group` value card 4 isolates ("Nuclear"). |
| `largestName` | The largest site's name in the story's language (a table that carries no names: name it from its place). |
| `largestLabel(r)` | The words beside the largest circle on cards 1–2; must state `r.largest.name` and `format(r.largest.value)`. |
| `cut` | The value at or above which card 6 keeps a site (the static plate's threshold). |
| `keySizes` | 1 to 4 round values the key draws as circles, each at most the largest. |
| `unit` | The line above the map. |
| `dotIs` | The key's line: what one circle is ("one circle = one station, area ∝ capacity"). |
| `counter` | The header counter, holding `{n}` (the sites standing), `{sites}` (their percent of the sites) and `{mw}` (their percent of the whole) once each. |
| `format(v)` | How a value is printed ("6 000 MW"), in the story's language. |
| `count(n)` | How a count is printed ("8 900"). |
| `percent(p)` | How a percent is printed ("1,3 %"). |
| `cards` | `{ largest(r), ten(r), hundred(r), subject(r), all(r), cut(r) }` — the prose of the six cards. Card 1 must state `format(r.largest.value)` and `percent(r.largest.valueShare)`; card 2 `percent(r.ten.siteShare)` and `percent(r.ten.valueShare)`; card 3 the same of `r.hundred`; card 4 `count(r.subject.count)` and `percent(r.subject.valueShare)`; card 5 `count(r.count)`; card 6 `count(r.cut.count)` and `percent(r.cut.valueShare)`. |
| `subjectNote(r)` | The header's accent note on card 4 (a few words with the subject's figures). |
| `cutNote(r)` | The header's accent note on card 6. |
| `limitNote(r)` | The line under the key on card 6: what is NOT drawn; must state `format(r.cut.threshold)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | A string closing card 6: the reading line and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text describing the map (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a site has no usable value or coordinates; fewer
than 200 sites; no site is in the `subject` group, or its region holds fewer than two; the `cut`
keeps fewer than two sites or all of them; a card, a note or the label does not state what its
picture shows; or a card, a note, the counter or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [AMOUNT, KIND, AREA, LON, LAT] = ["amount", "kind", "area", "lon", "lat"].map(col);
const sites = table.rows.map((r) => ({ value: Number(r[AMOUNT]), lon: Number(r[LON]), lat: Number(r[LAT]), group: r[KIND], region: r[AREA] }));
```

## Rules

- A circle's AREA is the value: give the raw quantity (capacity, people), never a rate.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- Every number in a card, a note, the counter or the alt is taken from `r` (through `format()`, `count()` and `percent()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. The first render bakes six pictures of the live map in two
  shapes (a few minutes; later renders reuse them while the map is unchanged). If the render refuses,
  read its message and fix `beat.mjs`. If a picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
