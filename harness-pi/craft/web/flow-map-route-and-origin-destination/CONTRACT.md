# Flow map (web) — what you write

The page is already designed: it comes from the worked example `proof/web-flow-map-ukraine-protection`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map — ONE origin, one band per
destination (a fan, Minard reversed), every band a MapLibre line whose WIDTH is the quantity and whose
curve is schematic — over a frozen picture of that same map that stands with JavaScript off. The
INTERACTION is done: ONE control lets the reader pick WHAT A BAND'S WIDTH IS DIVIDED BY — nothing (the
count), the destination's population (per 1,000 inhabitants), or its land area (per 1,000 km², measured
on the kit's own shapes) — because a band joins two places, so it has a second denominator the still
must choose in silence. A band thinner than the floor is COUNTED, not drawn. The key's three rungs, the
sentence under the control, the table's ranks and width samples follow the measure. Hovering a band
redraws it at full strength and answers its own reading. The camera is the fan's own box. You do not
change any of that.

This kit draws ONE origin and MANY destinations. It is not a route map. **The three measures must
crown three different leaders** — that is what the page shows; if they do not, the render refuses and
this is not the kit for the story.

You write ONE file, `beat.mjs`, in the beat folder. It names the columns of `data.json` and exports the
WORDS of this story's page. `render-beat.mjs` (already in the folder) reads the destinations, computes
every width, rank, remainder and what Web Mercator costs this fan, draws the page, checks it in a real
browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What data.json must hold

One row per destination country: an ISO 3166 alpha-3 code column, the quantity (a positive number) and
the destination's population. The origin is not a row. Several rows per destination (months,
categories) must be narrowed to one with `where`. Countries: Europe and its neighbours (Kosovo and
Northern Cyprus carry no code). A code the shapes do not hold is refused by name.

**Colour:** the bands cross the sea as much as the land, so the accent must stand off the basemap's
blue water. A teal or blue accent within 40° of the water's hue is refused — the story's PALETTE.md
needs a hue of its own (the worked example records `#0B7A5E`, `origin: journalist`).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `key` | The NAME of the column holding each destination's ISO alpha-3 code. |
| `value` | The NAME of the column holding the quantity a band's WIDTH draws. |
| `population` | The NAME of the column holding each destination's population (the per-inhabitant denominator). |
| `where` | Optional `{ column: value }` — keep only the rows matching every pair. |
| `origin` | The ISO alpha-3 code every band leaves from (not a row). |
| `names` | `{ CODE: "Name" }` for the origin and EVERY destination, in the story's language. |
| `measures` | `{ count, perCapita, perArea }`, each `{ label, unit, announce, format(v) }`: `label` = the pill's words ("Per 1,000 inhabitants"), `unit` = what the key's rungs end with, `announce` = what a screen reader hears and must CONTAIN `label`, `format(v)` = how a value is printed (count: whole number; per capita: one decimal). |
| `controlLabel` | The control's name ("Band width: what divides it"). |
| `note(r)` | The sentence shown when `perCapita` or `perArea` is chosen (see below). Must state `r.remainder.count`; every number from `r` (`r.format(v)` prints a value in that measure). |
| `rank(n)` | How a rank is printed ("3rd"). |
| `detail(r)` | The tooltip for one band; `r` = `{ code, name, people, sharePc, ranks, inhabitants, areaKm2, values }`: `people` = the quantity, `sharePc` = its percent of the total, `ranks` = its rank under the three measures, `values` = its three measured values. Must name `r.name` and print `r.people`. |
| `countedLabel` | The key's label for a band counted but too thin to draw. |
| `tableCaption({ destinations })` | The table's caption; a number it prints is `destinations`. |
| `columns` | The table's six headings: destination, count, per inhabitants, per area, rank, width. |
| `claimNote(c)` | The sentence under the map; `c` is the claim reading below plus `c.remainder` (the bands not drawn under the count). Every number from `c`. |
| `mercator(m)` | Appended to `limits`: what the flat map costs this fan. `m` = `{ longest, shortest, spread }`: the arm to `longest` is drawn `spread` times longer per real km than the arm to `shortest`. Print `m.spread`. |
| `reading(r)` | The reading line; `r` = `{ destinations }`. |
| `hint` | One sentence shown once the live map is up: zoom, drag, hover a band. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: one band per destination, width = the chosen measure, the curve is not an itinerary, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt(a)` | The alt text; `a` = `{ drawn, destinations, origin, first, second, topTwoShare, leaders }`. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | 3. |
| `check(c)` | Throws if the data no longer supports the title. |

### The readings

The claim reading `c` (in `check(c)`, `claimNote(c)`): `{ total, destinations, ranked, topShare(n),
leaders, measure(key) }` — `ranked` = `[{ code, name, people, value, rank }]` largest first,
`topShare(n)` = percent of the total the `n` largest take, `leaders` = `[{ code, name }]` under count,
per capita, per area, `measure(key)` = that measure's reading.

A measure reading `r` (in `note(r)`, `c.measure(key)`): `{ key, top, podium, countLeader, remainder,
destinations, label, unit, format }` — `top` = the widest value, `podium` = the first three `[{ code,
name, people, value, rank }]` under this measure, `countLeader` = the count's leader seen under this
measure (its `rank` here), `remainder` = `{ count, people, share }` of the bands under the floor.

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(c.total / 1e5) / 10 === 4.5`), never with strict equality on a raw division.
- Every number in a sentence is taken from the reading the render hands you (`c`, `r`, `m`, `a`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render bakes the basemap and photographs the live map (about a minute; later renders reuse both while
  the map and its words are unchanged). If the render refuses, read its message and fix `beat.mjs`. If
  the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
