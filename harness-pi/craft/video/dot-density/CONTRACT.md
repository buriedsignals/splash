# Dot density (video) — what you write

The video is already designed: it comes from the worked example `proof/video-dot-density-europe-stations`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map of Europe, 17.4 s at 30 fps. It
opens on a title card (eyebrow + title); then the map and the key; then every site arrives as a dot,
GROUP AFTER GROUP — the most numerous group first, the subject's group last — while the count of sites
climbs; every group but the subject's steps back, the subject's dots are ringed and counted, and a bar
shows their sliver of the sites; then every dot GROWS to an area proportional to its value while the
bar carries the subject's share from the sites to the value and a second count climbs to it; then the
credit. The argument is concentration: few sites, much of the value. There is no standfirst and no
sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
dots and the WORDS of this story's video. `render-beat.mjs` (already in the folder) groups the dots,
orders the arrival, computes both shares and every count, sizes every dot, measures the live map,
seats the key and the credit on open sea, renders eight stills, prints `look at: <png>`, then renders
the mp4 (about four minutes; a re-render with the same data and words reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera fits every site; the sites must stand in Europe (32°W–60°E, 27°N–82°N).

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `dots` | EVERY site, `{ lon, lat, value, group }`, from `data.json`: `value` the positive number a dot's area grows to (e.g. capacity); `group` its category as the data writes it (e.g. the fuel). At most 12 groups. |
| `subject` | The `group` the argument is about, exactly as it appears in `dots`. |
| `count(n)` | The site count's words for `n` sites ("8,900 stations"). Must print `n`. |
| `subjectLine(n, share)` | The subject's line: `n` sites, `share` the percent of all sites they are (unrounded: print it to one decimal) ("72 nuclear · 0.8 %"). Must print `n`. |
| `power(p)` | The share of the summed value the subject's group carries, for `p`: a whole number while it climbs, the final value to one decimal (print a non-integer with one decimal) ("34.4 % of the capacity"). |
| `dotLabel` | The key's word for a dot ("a station"). |
| `ringLabel` | The key's word for the ringed subject ("nuclear"). |
| `figure(v)` | A value printed short, for the key's size reference ("1,000 MW"). |
| `referenceValue` | Optional: the key's size reference. Default: the largest round value under a quarter of the largest site. |
| `source` | The credit in one to four forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". The render sets the longest form that finds one line of open sea. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 2. |
| `check(map)` | Throws if the data no longer supports the title. `map.total` = how many sites; `map.sum` = their total value; `map.subjectCount` = the subject group's sites; `map.shareSites` / `map.shareCapacity` = the percent of the sites / of the value the subject's group holds; `map.groups` = `[{ group, n, sum, perSite }]`, the most value per site first. |

The render refuses, saying what to change, when the subject is not one of the groups, there is only
one group or more than 12, a value is not above 0, a site stands outside Europe, a word function does
not print its number, or the key or the credit finds no place (shorten the words).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [KIND, SIZE, LON, LAT] = [col("kind"), col("size"), col("x"), col("y")];
const dots = data.rows.map((r) => ({ lon: Number(r[LON]), lat: Number(r[LAT]), value: Number(r[SIZE]), group: r[KIND] })).filter((d) => d.value > 0);
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about: `value` is the quantity whose concentration the title states.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title states a count of sites ("72 reactors"), `check()` holds `map.subjectCount` to it.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every dot at its weight, both counts). If the render refuses, read its message and fix
  `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
