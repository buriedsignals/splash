# Locator (gestures, scrolly) — what you write

The basemap plate, the camera (boxed on the subject), the ring on the subject, the three typographic
classes of place (countries in tracked capitals, settlements on open dots, waters in italic), the
label placer, the type, the colours and the layout are already done: they come from the worked
example `proof/static-locator-zaporizhzhia` and the story's PALETTE.md and DIRECTION.md. You write
ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder) finds your
places in `data.json` by the names you give, and draws them.

`beat.example.mjs` (in the folder) is the worked example's `beat.mjs`, written for this gesture kit. Read it first, then
write this story's from scratch with `write_file`.

A locator says WHERE, and nothing more: no marker is sized or coloured by a value. A figure about
the subject is words in `subjectLines`, computed from data.json.

## What data.json must hold

The subject's row, with a longitude and a latitude column (decimal degrees). Optionally, rows for the
settlements to name, in the same table, each with a name column and the same coordinate columns
(and anything the takeaway is checked against). Country names come from the kit's own country file,
which covers **Europe and its neighbours only** (ISO alpha-3 codes, from Iceland and Morocco to Iran
and Russia); waters are declared by you at their own centres.

## The fields of the default export

| Field | What it is |
|---|---|
| `gestures` | The staging, in story order: the list described under "The gestures" below. |
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lon` | The NAME of the data.json column holding longitudes. |
| `lat` | The NAME of the column holding latitudes. |
| `subject` | Where the subject is: `{ lon, lat }` as numbers READ from its row of data.json, or `{ column, equals }` naming that one row. The camera is boxed on it. |
| `subjectLines` | The lines printed beside the subject's ring: its name first, then (optionally) its figure, computed. |
| `placeName` | The NAME of the column that names the settlements. |
| `places` | The settlements to name: values of `placeName`, or `{ name, label }` when the story's language prints the name otherwise. Choose them by a rule (the six most populous in frame), not by taste. `[]` names none. |
| `areas` | The countries to name: `{ ISO3: "name in the story's language" }` — the one the story is in and the neighbours a reader needs. Only countries with land in the camera. |
| `waters` | Bodies of water to name: `[{ forms: ["Black Sea", "B. Sea"], lon, lat }]`, each at its own centre, longest form first. `[]` names none. |
| `span` | Optional: `{ lon, lat }` degrees either side of the subject the camera holds (default 9 by 5.2; at most 30 by 20). |
| `atSea` | Optional: `true` only when the subject really is at sea (a rig, a wreck). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what the subject is, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first (what the three typefaces mean). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: where the subject is, which places surround it. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures

You stage the map with `gestures`: an ordered list, in the order the story tells it. The kit checks every mark,
every number in every note (computed from data.json), and that each gesture serves the confirmed takeaway; a gesture
it cannot draw truthfully is refused with the field to change and a value that works.

{{GESTURES}}

Of these, this map draws `highlight`, `name`, `annotate`, `reveal`, `pull-back`, and `zoom`.

A **mark** is the subject (named by the first line of `subjectLines`) or a settlement of `places` (named by
its printed label). A locator draws no value: each mark's value is its **distance to the subject in km** (the subject
0), the one figure a note may state beside the subject's own figures from data.json.

```js
gestures: [
  { do: "highlight", mark: "Zaporijjia" },
  { do: "name", mark: "Zaporijjia", note: "6 000 MW installés" }, // its figure, computed from data.json
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the list above |
| `mark` / `marks` | the mark(s) it acts on, as named above |
| `value` | a reference line's level (contour) |
| `note` | the words drawn with the gesture, in the story's language; every number in it is checked |

- A locator rings only its subject: a highlight on a settlement is refused (the fix rings the subject).
- A `name` or `annotate` on the subject replaces the lines after its name in `subjectLines`; on a settlement, the
  note is printed after the settlement's name.
- Every gesture serves the takeaway: a gesture on a settlement the takeaway does not name is refused.

## In the scrolly

One card per gesture, in story order, then a closing card with the standfirst's first form (folded into the last
card when the last gesture already stands at the whole map). Every card must change the picture.

| Key | What it is |
|---|---|
| `card` | On EVERY gesture: the prose of its card, in the story's language (a string, or several paragraphs). |

- A `zoom` card stands at the close-up camera (its factor printed in its note and checked); the camera travels
  linearly between cards and the words wait until it has landed.
- The basemap is the static kit's baked plate (no live map).

## Reading the data

Read data.json by column name, and compute the subject's coordinates and figure from its row:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, KIND, AMOUNT, LON, LAT] = [col("name"), col("kind"), col("amount"), col("lon"), col("lat")];
const rows = table.rows.map((r) => ({ name: r[NAME], kind: r[KIND], amount: Number(r[AMOUNT]), lon: Number(r[LON]), lat: Number(r[LAT]) }));
const top = rows.reduce((a, b) => (b.amount > a.amount ? b : a));
// subject: { lon: top.lon, lat: top.lat }
```

The render refuses, by name: a column that is not in data.json, a place name that matches no row (or
two), a coordinate that is not a number or is off the globe, a named place outside the camera, a
settlement or the subject sitting in the water on the plate and a water's name sitting on land (a
coordinate typed wrong, or lon and lat swapped), an area code the country file does not hold, and an
area with no land in the camera. A label the placer cannot fit is reported on the console (`NOTE —`).

The accent is measured against the ground the subject's ring sits on: a subject on a river or a
coast is held 40° of hue away from the water's blue, and a palette whose accent is too close is
refused with that reason (`origin` in PALETTE.md is the journalist's to change, not yours).

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the
  title as the journalist wrote it and is not checked.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first
  form, which is the journalist's own sentence, copied as written.
- Coordinates come from data.json. The only coordinates you type are the waters' centres.
- Name no more than the story touches: the country it is in, its neighbours in frame, a few
  settlements chosen by a rule, the waters that place it.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
