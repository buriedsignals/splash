# Locator (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-locator-zaporizhzhia`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE, flat MapTiler map of Europe that stays
fixed while six cards of prose travel up over it; the reader's scroll moves the camera and every
mark continuously from one card's state to the next. Under the live map lies one frozen picture per
card, baked from the same map, which is what a reader without a script or a network sees. The
camera, the marks, the colours and the CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | Europe; the `drawCount` largest sites as dots sized by their value, the others labelled `format(value)` | `cards.tops`, `notes.tops` |
| 2 | the subject's `country` steps forward: filled and outlined in the accent | `cards.country`, `notes.country` |
| 3 | the camera closes on the subject; the country's regions appear as it arrives | `cards.zoom`, `notes.zoom` |
| 4 | the `areas`, `places` and `waters` are named — MapTiler's OWN labels, filtered — each settlement on a dot; the `river` named | `cards.places` |
| 5 | the subject ringed and named in the accent (`subjectLabel`) | `cards.subject`, `notes.subject` |
| 6 | the camera eases back part-way, every label kept | `limits`, `notes.limits` |

With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
sites, the places and the WORDS of this story's cards. `render-beat.mjs` (already in the folder)
ranks the sites, checks your words against the figures, bakes the card pictures from the live map,
checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per card in
`renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The whole-map camera holds 25° W to 45° E and 34° N to 72° N; the subject's country
is one of the 64 European countries of `shapes.geojson`, keyed by ISO 3166 alpha-3.

**The names on card 4 are the map's, not yours.** Countries are named by MapTiler's own country
labels (you give the codes), settlements and waters by MapTiler's own labels filtered by NAME — so
each must be spelled as MapTiler's map spells it (English or the local Latin spelling: "Odesa",
"Rostov-on-Don", "Black Sea"). The render prints a `NOTE` naming every place or water the map does
not carry at the close-up's zoom: those settlements stay dots without a name (MapTiler names cities
only from zoom 5; a smaller `span` zooms closer). The frozen card pictures never carry MapTiler's own
labels, only the marks and the words the beat draws (the values, the subject's label, the river).

## The reading `r`

| Field | What it is |
|---|---|
| `r.count` | how many sites (every row of `sites`) |
| `r.drawCount` | how many are drawn on card 1 |
| `r.top` | the drawn sites, `[{ name, value, lon, lat, rank }]`, largest first |
| `r.largest`, `r.second`, `r.last` | the first, second and last drawn site |
| `r.subject` | the subject's row: `{ name, value, lon, lat, rank }` (`name` = your `subjectName`) |
| `r.country` | your `country`: `{ iso, name }` |
| `r.places`, `r.placeCount` | your `places`; how many |
| `r.countryOf(lon, lat)` | the ISO alpha-3 code of the country a point falls in, or `null` |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `sites` | EVERY site of the kind the story ranks, as `{ value, lon, lat }` (more fields may ride along), from `data.json`: card 1 draws the largest. Values above zero. |
| `drawCount` | Optional: how many of the largest card 1 draws (default 4, between 2 and 6). |
| `subject` | `{ lon, lat }` — the coordinates of the subject's OWN row in `sites`. It must be one of the drawn sites. |
| `subjectName` | The subject's name in the story's language. |
| `subjectLabel(r)` | The words beside the ring on card 5; must state `r.subject.name` and `format(r.subject.value)`. |
| `country` | `{ iso, name }` — the ISO alpha-3 code of the subject's own country (card 2 outlines it; the render checks the subject falls in it) and its name in the story's language. |
| `areas` | ISO alpha-3 codes of the countries card 4 names (the subject's country and the neighbours a reader needs). |
| `places` | The settlements card 4 names, `[{ name, lon, lat }]`, at most 8, inside the close-up; `name` as MapTiler's map spells it. Chosen by a rule (the most populous), never by hand. `[]` names none. |
| `waters` | The seas card 4 names, as MapTiler's map spells them (`["Black Sea"]`). `[]` names none. |
| `river` | Optional `{ text, lon, lat }`: a river name the map carries no label for, drawn by the beat at a point on the river, in the story's language. |
| `span` | Optional `{ lon, lat }`: degrees either side of the subject the close-up holds (default 9 by 5.2). |
| `unit` | The line above the map ("low-carbon stations, installed capacity"). |
| `format(v)` | How a value is printed ("6 000 MW"), in the story's language. |
| `cards` | `{ tops(r), country(r), zoom(r), places(r), subject(r) }` — the prose of cards 1 to 5. Card 1 must state `format(r.subject.value)`; card 2 `r.country.name`; card 5 `r.subject.name` and `format(r.subject.value)`. |
| `notes` | `{ tops(r), country(r), zoom(r), subject(r), limits(r) }` — the short accent note in the header while those cards are read (a few words). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: what the sites' figure is and is not, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text describing the map (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a site's coordinates are not numbers; a drawn site
lies outside the whole-map camera; the subject is not one of the drawn sites, or does not fall in
`country`; a place lies outside the close-up; a card or a label does not state what its picture
shows; or a card, a note, the label or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [KIND, NAME, AMOUNT, POP, LON, LAT] = ["kind", "name", "amount", "pop", "lon", "lat"].map(col);
const rows = table.rows.map((r) => ({ kind: r[KIND], name: r[NAME], amount: Number(r[AMOUNT]), pop: Number(r[POP]), lon: Number(r[LON]), lat: Number(r[LAT]) }));
const sites = rows.filter((r) => r.kind === "site").map((s) => ({ value: s.amount, lon: s.lon, lat: s.lat }));
const top = rows.filter((r) => r.kind === "site").reduce((a, b) => (b.amount > a.amount ? b : a));
const towns = rows.filter((r) => r.kind === "town").sort((a, b) => b.pop - a.pop).slice(0, 6);
// subject: { lon: top.lon, lat: top.lat }, places: towns.map((t) => ({ name: t.name, lon: t.lon, lat: t.lat }))
```

## Rules

- A locator says WHERE: the dots of card 1 are sized by the value only to show which sites are the
  largest; a figure about the subject is words.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- Coordinates come from data.json, never typed — except a river's label point, which no table holds.
- Every number in a card, a note, the label or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` (MapTiler's own labels stay in the map's language). Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. The first render bakes six pictures of the live map in two
  shapes (a few minutes; later renders reuse them while the map is unchanged). If the render refuses,
  read its message and fix `beat.mjs`. If a picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
