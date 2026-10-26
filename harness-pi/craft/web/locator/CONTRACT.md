# Locator (web) — what you write

The page is already designed: it comes from the worked example `proof/web-locator-zaporizhzhia` and
the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map the reader can zoom and drag — the
countries drawn as neutral ground, the SUBJECT ringed in the accent, its PEERS (the other places of
the same kind) one shade lighter, SETTLEMENTS as small grey dots, every pin the same size (a locator
says where, never how much) — over one frozen picture per remove that stands with JavaScript off.
The INTERACTION is done: ONE control lets the reader choose HOW FAR BACK to stand. Each remove
re-frames the camera, draws only the peers and settlements that still place the subject from there
(the 12 largest peers, the 6 largest settlements), prints how many it drew out of how many the frame
holds, its scale bar, and a sentence naming the subject's largest neighbour at that distance.
Hovering or tapping a pin answers what it is and how far it is from the subject. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
subject, its peers, the settlements, the removes and the WORDS. `render-beat.mjs` (already in the
folder) computes every distance (on the sphere), window, census, scale bar and Mercator error, draws
the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `subject` | The one place the map is about, from its row of data.json: `{ lon, lat, name, label, kind, priority, … }`. `name` is what the table prints, `label` the word drawn beside its ring (default `name`), `kind` the table's "what it is" ("the subject"), `priority` the number its peers are ranked by (e.g. its capacity). Extra fields ride along to `detail()`. |
| `others` | Its PEERS: every other row of the same kind (not the subject), each `{ lon, lat, name, kind, priority, … }`. `priority` decides which 12 a remove draws (largest first) — it never sizes a pin. |
| `places` | Settlements that help place it, each `{ lon, lat, name, kind, priority, … }` (`priority` = population). `[]` names none. |
| `removes` | 2 to 5 distances to stand at, nearest first: `{ key, label, announce, radius, places }`. `key` a short lowercase word; `label` the button word; `announce` what a screen reader hears — it must CONTAIN `label`; `radius` km around the subject (each at least double the window of the one before), or `null` for the last one to frame EVERY peer; `places: false` to draw no settlement at that distance. |
| `defaultKey` | The `key` of the remove the page opens on (the newsroom's own framing). |
| `vantageLabel` | The control's name ("How far back to stand"). |
| `rule(r)` | The census line under the control for one remove. `r` is `{ key, radius, drawnOthers, heldOthers, drawnPlaces, heldPlaces, places, barKm }`. Must state `drawnOthers`, `heldOthers` and `barKm`. |
| `note(r)` | The sentence shown when a remove other than `defaultKey` is chosen. `r` is `{ key, radius, heldOthers, drawnOthers, heldPlaces, drawnPlaces, spanKm, edgeError, rival, totalOthers, subject }`: `rival` = the largest peer in that frame (its row plus `km`, its distance to the subject); `edgeError` = how many times wrong the scale bar is between the frame's top and bottom; `totalOthers` = how many peers in all. Must state `rival.km`, rounded. |
| `detail(m)` | The tooltip for one pin. `m` is its row plus `{ role, km, share }`: `role` is `"subject"`, `"other"` or `"place"`; `km` its distance to the subject; `share` = for a peer, its priority as a percent of the subject's. Every pin must answer differently. |
| `distance(m)` | The table's distance cell (`m` as in `detail`): for the subject a word ("the subject"), else the km, rounded ("47 km"). |
| `kinds` | The legend's three words: the subject, its peers, the settlements. |
| `callout(c)` | The sentence under the map. `c` is `{ nearest, others, subject }`: `nearest` = the closest peer (row plus `km`), `others` = how many peers. Must state `nearest.km`, rounded. |
| `mercator(m)` | What the flat map costs THIS story — appended to `limits`. `m` is `{ published, widest }`: how many times wrong the scale bar is between the frame's edges at the opening remove and at the widest. Print both to two decimals. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the subject is, the limits the journalist named. |
| `reading` | The reading line: a locator says only where, and the distance is the reader's to choose. |
| `hint` | One sentence shown only once the live map is up: wheel or buttons to zoom, drag to move, hover a pin. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text — a string, or `(a) => string` with `a = { published, removes }` (each a `rule()` reading) for its counts. |
| `tableCaption` | The table's caption — a string, or `(t) => string` with `t = { marks }` (how many pins the page draws in all). |
| `columns` | The table's four headings: mark, what it is, distance, at this remove. |
| `drawnWord` / `outWord` | The table's word for a pin the current remove draws ("drawn") / leaves out ("out of frame"). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(map)` | Throws if the data no longer supports the title. `map.countryOf(lon, lat)` = the ISO alpha-3 code of the country the point falls in (or `null`); `map.km(a, b)` = great-circle km between two `{ lon, lat }`; `map.removes` = each remove's `{ key, radius, heldOthers, drawnOthers, heldPlaces, drawnPlaces, spanKm, edgeError, rival }`. |

## Reading the data

Read data.json by column name; build the subject, its peers and the places from the rows:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, KIND, AMOUNT, LON, LAT] = ["name", "kind", "amount", "lon", "lat"].map(col);
const rows = table.rows.map((r) => ({ name: r[NAME], kind: r[KIND], amount: Number(r[AMOUNT]), lon: Number(r[LON]), lat: Number(r[LAT]) }));
const sites = rows.filter((r) => r.kind === "site");
const top = sites.reduce((a, b) => (b.amount > a.amount ? b : a));
// subject: { lon: top.lon, lat: top.lat, name: top.name, kind: "…", priority: top.amount }
// others:  sites.filter((s) => s !== top).map((s) => ({ …, priority: s.amount }))
```

The render refuses, by name: a missing field, a coordinate that is not a number or is off the globe,
the subject's own row left in `others`, two pins at one point, removes that do not rise (or whose
windows are not each at least twice the one before), a remove other than the default that frames no
peer, place names that overlap on the page at some remove (measured in the browser), and a word
function that does not state the number it must.

## Rules

- A locator says WHERE: no pin is sized or coloured by a value. A figure about the subject is words.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the
  title as the journalist wrote it and is not checked.
- Every number in a sentence is computed from `data.json` or taken from the reading the render hands
  you (`r`, `m`, `c`), never typed — except the title, which is the journalist's own sentence, copied
  as written.
- Coordinates come from data.json, never typed.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render bakes the basemap and photographs the live map at every remove (about a minute). If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
