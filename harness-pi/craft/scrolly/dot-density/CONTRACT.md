# Dot density (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-dot-density-europe-stations`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE, flat MapTiler map of Europe, ONE dot per
site at its own coordinates. A dot map gives two readings a bar chart cannot — the count of places and
the weight of each — and the scroll gives them one after the other, on the same dots. The map stays
fixed while six cards of prose travel up over it. The dots, the colours, the keys, the camera and the
CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the land, empty | `cards.empty` |
| 2 | one dot per site, group by group, most numerous first; the header counts them (`counter`) | `cards.dots` |
| 3 | the `subject` group's sites arrive ringed; every other site steps back | `cards.subject`, `subjectNote`, `subjectIs` |
| 4 | every dot takes the AREA of its value; a size key appears (`keySizes`) | `cards.weight`, `weightNote`, `weightIs` |
| 5 | the camera closes on the region holding most of the subject's sites | `cards.focus`, `zoomNote` |
| 6 | one dot per site again, the subject ringed | `limits`, `limitNote` |

Under the live map lies one frozen picture per card, which is what a reader without a script or a
network sees. With JavaScript off the page shows card 6's picture and every card's words. You do not
change any of that. The page carries every site: a render takes a few minutes — render once, look,
then change only what is wrong.

You write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder) counts
the sites, computes every share and mean, checks your words against them, bakes the card pictures,
checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per card in
`renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only, many sites.** The camera holds the box the sites fill, inside 25° W–45° E, 34° N–72° N.
Give every site (at least 50), not a sample; at most 9 groups.

## The reading `r`

| Field | What it is |
|---|---|
| `r.count`, `r.othersCount` | how many sites; how many are not in the subject group (card 2's dots) |
| `r.groups` | the other groups, most numerous first: `[{ group, count, value, mean }]` |
| `r.subject` | `{ group, count, siteShare, valueShare, value, mean }` — the subject group: its percent of the sites and of the total value |
| `r.mostConcentrated` | the group with the largest value per site |
| `r.focus` | `{ region, count, subjectMean, compareGroup, compareMean, ratio }` — the region holding most subject sites, how many, the mean value of a subject site and of a `compareGroup` site there, and their ratio |
| `r.whole` | the total value of every site |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `sites` | EVERY site as `{ value, lon, lat, group, region }`, from `data.json`: `value` above zero (card 4's area), `group` its category, `region` the region it is in. |
| `subject` | The `group` value card 3 rings. |
| `compareGroup` | The other group card 5 sets the subject against, in the focus region (it must have sites there). |
| `keySizes` | 1 to 4 round values for card 4's size key, each at most the largest site. |
| `unit` | The line above the map. |
| `counter` | The header counter, holding `{n}` once ("{n} stations"). |
| `dotIs` | The key's line for an ordinary dot ("one dot = one station"). |
| `subjectIs(r)` | The key's line for a ringed dot ("72 nuclear sites"). |
| `weightIs` | The key's line on card 4 ("area proportional to capacity"). |
| `subjectNote(r)`, `weightNote(r)`, `zoomNote(r)` | The header's accent note on cards 3, 4 and 5. |
| `limitNote` | The line under the key: what the data leaves out. |
| `format(v)` | How a site's value is printed ("3 323 MW", "6,0 MW"), in the story's language. |
| `count(n)` | How a count is printed ("8 828"). |
| `percent(p)` | How a percent is printed ("0,8 %"). |
| `cards` | `{ empty(r), dots(r), subject(r), weight(r), focus(r) }` — the prose of cards 1 to 5. Card 1 must state `count(r.count)`; card 2 `count(r.othersCount)`; card 3 `count(r.subject.count)` and `percent(r.subject.siteShare)`; card 4 `percent(r.subject.valueShare)`; card 5 `count(r.focus.count)`, `format(r.focus.subjectMean)` and `format(r.focus.compareMean)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: the reading line and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a site has no usable value or coordinates; fewer
than 50 sites or more than 9 groups; no site is in the subject group, or its region holds fewer than
two; `compareGroup` has no site in the focus region; the palette cannot separate the subject's disc
from the ordinary dot; a card does not state what its picture shows; or a card, a note, the counter
or the alt states a number no figure of `r` rounds to.

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [AMOUNT, KIND, AREA, LON, LAT] = ["amount", "kind", "area", "lon", "lat"].map(col);
const sites = table.rows.map((r) => ({ value: Number(r[AMOUNT]), lon: Number(r[LON]), lat: Number(r[LAT]), group: r[KIND], region: r[AREA] }));
```

## Rules

- One dot is one place, at its own coordinates: never one dot per N units spread at random.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision, never with strict equality on a raw division.
- Every number in a card, a note, the counter or the alt is taken from `r` (through `format()`, `count()` and `percent()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
