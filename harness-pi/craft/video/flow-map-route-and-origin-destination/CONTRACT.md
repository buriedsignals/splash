# Flow map (video) — what you write

The video is already designed: it comes from the worked example `proof/video-flow-map-ukraine-protection`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map, 20.3 s at 30 fps. It opens on
a title card (eyebrow + title); then the map, the origin's node and the key's width scale; then the
BANDS DRAW OUT of the origin to every destination, largest first, each as wide as its flow, while the
count of people climbs; every band but the TWO LARGEST steps back while their share counts up; the
others come back and the credit lands. The camera holds the origin and the ten largest destinations,
which are named with their flow. There is no standfirst and no sentence on screen. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
flows and the WORDS of this story's video. `render-beat.mjs` (already in the folder) ranks the
destinations, computes the total and the two largest's share, sizes and routes every band, measures
the live map, places the names, the key and the credit, renders seven stills, prints `look at: <png>`,
then renders the mp4 (about three minutes; a re-render with the same data and words reuses the map's
measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** One origin and its destinations, all European countries keyed by ISO alpha-3 code
(the kit's 64 shapes; Kosovo and Northern Cyprus have no code).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `origin` | The ISO alpha-3 code of the country every flow leaves (`UKR`). |
| `originName` | Its name on the node, in the story's language (short: it sits in a circle). |
| `flows` | One `{ iso, name, value }` per destination: `iso` its ISO alpha-3 code, `name` its name in the story's language, `value` the flow (a count above 0). At least three; not the origin. |
| `count(n)` | The climbing count's words for `n` ("4,504,080 people"). Must print `n`. |
| `share(s, first, second)` | The two largest destinations' share: `s` a whole number while it climbs, the final value to one decimal (print a non-integer with one decimal); `first`, `second` their names ("Germany + Poland: 49.1 %"). |
| `host(name, n)` | A destination's label on the map: its name and its flow, short ("Germany 1.25 M"). |
| `figure(v)` | The width scale's labels ("1 million", "100,000"). |
| `scaleValues` | Optional: the width scale's two values, larger first. Default: the largest round value at most the largest flow, and a tenth of it. |
| `source` | The credit in one to four forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". The render sets the longest form that finds one line of open sea. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 2. |
| `check(map)` | Throws if the data no longer supports the title. `map.total` = the sum of the flows; `map.ranked` = `[{ iso, name, value }]` largest first; `map.topTwoShare` = the percent the two largest take; `map.origin`. |

The render refuses, saying what to change, when a code is not a country of the map, a destination is
the origin or repeats, a value is not above 0, there are fewer than three destinations, a word
function does not print its number, or a name, the key or the credit finds no place (shorten the
words).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [TO, AMOUNT] = [col("destination_iso3"), col("count")];
const flows = data.rows.map((r) => ({ iso: r[TO], name: NAMES[r[TO]] ?? r[TO], value: Number(r[AMOUNT]) })).filter((f) => f.value > 0);
```

Keep ONE row per destination (filter to one month or one series first). Country names without codes:
`import { iso3Of } from "./countries.mjs"`.

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(map.total / 1e5) / 10 === 4.5`), never with strict equality on the raw division.
- When the title names the largest destinations, `check()` holds `map.ranked` to them.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every band, the two largest in the accent, both counts). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render
  and look again.
