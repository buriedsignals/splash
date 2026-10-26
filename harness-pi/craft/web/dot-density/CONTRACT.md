# Dot density (web) — what you write

The page is already designed: it comes from the worked example `proof/web-dot-density-europe-stations`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map — every dot a MapLibre circle
over MapTiler's tiles, which the reader can zoom and drag — over a frozen picture of that same map that
stands with JavaScript off. The INTERACTION is done: ONE control lets the reader choose WHAT ONE DOT
IS WORTH, because the dot value is the whole sentence of a dot map:

1. one dot per place (the file is a register of places — the map opens here);
2. one dot per a value the render DERIVES from the file itself — the mean quantity per place, rounded
   to 1, 2 or 5 × a power of ten (so this field carries about as much ink as the first, put elsewhere);
3. one dot per ten times that value (the type's trap shown: a real concentration becomes a few dots).

Under a value rule each place gets `floor(quantity / dot value)` dots plus the largest remainders
(the total is exact), laid on a spiral around the place, one dot diameter apart; a place too small
for one dot leaves the map, and the page says how many do. The key line, the legend's counts, the
rule's sentence and the table's dot column follow the rule. Hovering a dot lights every dot of the
same place and answers: category · quantity · country · share of that country's total · how many dots
it got. Three treatments: the SUBJECT (the accent, drawn on top), a SECOND group, and every other
category. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It names the columns of `data.json` and exports the
WORDS of this story's page. `render-beat.mjs` (already in the folder) reads the places with
`points.mjs`, computes every count, the dot values, the dot's ground size and what Web Mercator costs
this map, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**One row is one place**, at its own longitude and latitude, with a positive quantity (megawatts,
beds, tonnes…). A map that scatters a country total is not a dot-density map: if `data.json` has no
coordinate columns, this is the wrong kit. **Europe only**: the camera holds about 24.6°W–46.8°E,
35.1°N–71.2°N; a row outside it refuses — leave such rows out with `exclude` and say so.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lon`, `lat` | The NAMES of the columns holding each place's longitude and latitude. |
| `value` | The NAME of the column holding each place's quantity (what a value rule's dot is worth). |
| `country` | The NAME of the column holding each place's country (a name or an ISO-3 code; names are resolved by `countries.mjs`, with `rename` for a misspelling). |
| `subject` | `{ column: value }` — the category the takeaway is about. Drawn in the accent, on top. |
| `second` | `{ column: [values] }` — the SAME column; the category (or categories) drawn in the second treatment. Every other category is the quiet treatment. |
| `where` | Optional `{ column: value or [values] }`: only those rows are kept. |
| `exclude` | Optional `{ column: [values] }`: those rows are left out (e.g. countries outside Europe). |
| `rename` | Optional `{ "<as written>": "<country or ISO-3>" }` for a misspelt country name — a visible decision. |
| `categoryNames` | `{ value: word }` for EVERY category kept, in the story's language (the answer's first piece). |
| `kinds` | The legend's three labels: quiet, second, subject. |
| `names` | `{ ISO3: name }` for every country with a place, in the story's language. |
| `placeRule` | `{ label, announce, keyLine }` strings for the one-dot-per-place rule ("One station", "One dot per station — the file is a register of places", "1 dot = one station"). |
| `valueRule` | `{ label(v), announce(v), keyLine(v) }` for the two value rules, `v` = the dot value the render derives; each must print `v`, and `keyLine` reads "1 dot = v …". |
| `unitNote(r)` | The sentence shown when the derived value is chosen. Must state `r.dots` and `r.silent`. |
| `coarseNote(r)` | The sentence shown when ten times that value is chosen. Must state `r.dots` and `r.silent`. |
| `kindCount(n)` | A legend count: "8 299 dots". Must print `n`. |
| `count(n)` | How a whole number is printed (the table's places and dots). |
| `unitValue(v)` | A place's quantity in the answer: "1 300 MW". |
| `share(v)` | A place's share of its country's total, in percent, in the answer: "12.3 %". |
| `countWord(n)` | The answer's last piece: "3 dots here". Must print `n`. |
| `sep`, `tail` | What goes between two pieces of the answer (" · "), and what ends the share piece (" of this country's fleet"). |
| `capacity(v)` | A country's total quantity in the table ("12.3 GW" from a total in MW). |
| `countryDetail(c)` | A table row's detail; `c` = `{ name, sites, total, sharePc, perSite, subjectSites }`. Starts with `c.name`. |
| `keyLabel` | The word before the key line ("Key:"). |
| `controlLabel` | The control's name ("What one dot is worth"). |
| `tableCaption({ countries })` | The table's caption; a number it prints is `countries`. |
| `columns` | The table's four headings: country, places, total, dots. |
| `claimNote(c)` | The sentence under the map; `c` is the claim reading below. Every number from `c`. |
| `mercator(m)` | Appended to `limits` in the standfirst: what the dot value does, and what the flat map costs. `m` = `{ names, pageShare, trueShare, dilution, subjectInkPlaces, subjectInk, unit, subjectName }`: `dilution` = how many times LESS dense the same field looks over the `names` countries (print it); `subjectInkPlaces` / `subjectInk` = the subject's percent of the dots under one-per-place / the derived value. |
| `inflated` | Optional: ISO-3 codes the Mercator measure names (e.g. the northernmost). |
| `reading(r)` | The reading line; `r` = `{ groundKm, unit }`. Must print `r.groundKm` (one dot's ground radius, km). |
| `hint` | One sentence shown once the live map is up: zoom, drag, hover a dot. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a dot is, the scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt(a)` | The alt text; `a` = `{ placeDots, unitDots, subjectSites, subjectDotsUnit, unit, subjectName, rules }`. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | 3. |
| `check(c)` | Throws if the data no longer supports the title. |

### The readings

The claim reading `c` (in `check(c)` and `claimNote(c)`): `{ sites, total, categories, subject, densest,
rules }` — `sites` = places drawn, `total` = their summed quantity, `categories` = `[{ key, name,
sites, total, perSite }]` largest total first, `subject` = `{ key, name, sites, total, perSite,
siteShare, valueShare }` (`siteShare` / `valueShare` in percent), `densest` = the category key with the
largest quantity per place, `rules` = `{ places, unit, coarse }`, each a rule reading.

A rule reading `r` (in `unitNote`, `coarseNote`, `c.rules`): `{ key, value, dots, placeDots, sites,
silent, silentPc, subjectDots, subjectInk, subjectInkPlaces, subjectName, perKind }` — `value` = the
dot value (`null` for places), `dots` = dots drawn, `placeDots` = dots under one-per-place, `silent` =
places that get no dot, `subjectDots` / `subjectInk` = the subject's dots and percent of the ink,
`perKind` = dots per treatment `[quiet, second, subject]`. A note may print only numbers from `r`.

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the places the takeaway is about: filter with `where` / `exclude`, and name the takeaway's category in `subject`.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(c.subject.valueShare) === 36`), never with strict equality on a raw division.
- Every number in a sentence is taken from the reading the render hands you (`c`, `r`, `m`, `a`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render bakes the basemap and photographs the live map (about a minute; later renders reuse both while
  the map is unchanged). If the render refuses, read its message and fix `beat.mjs`. If the picture is
  wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
