# Connected scatter (video) — what you write

The video is already designed: it comes from the worked example `proof/video-connected-scatter-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (24 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the axes
(both shares, 0–100 on y) and the key (ring = earlier state, disc = later); each entity's earlier x
grows as a bar from zero at the height of its y, then collapses into its earlier RING; the entities
travel one after another along their arcs to their later DISCS, the largest rise first, a counter
climbing as each lands ("16 of 16 cleaner"); the x axis closes onto the crowd near the origin
(`closeUp`), the largest leave the frame and every entity in view is named; the whole axis again,
the entities whose x FELL picked out one after another (largest loss first) with their count ("5
lighter"), the rest stepping back, the subject's arc split into its two moves with their values
("−11,8 pts" across, "+4,2 pts" up); every entity back, and the credit. There is no standfirst and no
sentence on screen. You do not change any of that.

The video argues ONE thing: every entity rose on y, and a few — the subject first among them — fell
on x. The render computes the counts, the order and the subject's moves; you give the data and the
words.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `entities` | One `{ name, label, code, from: { x, y }, to: { x, y } }` per entity, from `data.json`, 5 to 24: `name` identifies it, `label` is how it is printed (optional), `code` a short form (3 letters) printed when the label finds no room (optional; default the label's first three letters), `from`/`to` its two states, every value a share between 0 and 100. |
| `subject` | The `name` of the entity the takeaway is about; its two moves are split out and printed. |
| `from` | The earlier state's name ("2000"). |
| `to` | The later state's name ("2024"). |
| `closeUp` | Optional: the x value the close-up runs to (default 12). It must leave the largest out and keep at least 3. |
| `xName` | The x measure and its unit, printed at the end of the x axis. |
| `yName` | The y measure and its unit, over the y axis — or up to three forms, longest first. |
| `cleaner` | A function `(k, n) => words` for the counter of entities that rose (`(k, n) => \`${k} of ${n} cleaner\``). |
| `cleanerLines` | Optional: the same on two lines for narrow frames (`(k, n) => [\`${k} of ${n}\`, "cleaner"]`). |
| `lighter` | A function `(k) => words` for the counter of entities whose x fell (`(k) => \`${k} lighter\``). |
| `named` | Optional: a function `(k, n) => words` written only when a narrow frame cannot name every entity ("12 of the 16 named"). |
| `moveUnit` | The word after the subject's two moves ("pts"); `""` for none. |
| `source` | The credit line in one to three forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a value is outside 0–100, or two entities share a name or a code;
- an entity's y did not rise (the counter counts every landing disc as one that rose) — this data
  then needs another format;
- no entity's x fell (nothing to pick out);
- `subject` is no entity's name; `closeUp` leaves no one out or keeps fewer than 3 (it names a value that works);
- the title names a year that is neither `from` nor `to`;
- a word function does not return words; a label, an axis name, a counter or the credit does not fit.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, X, Y] = [col("region"), col("year"), col("share_of_total"), col("rate")];
const at = (name, year) => data.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year);
const names = [...new Set(data.rows.map((r) => r[NAME]))];
const entities = names.map((name) => ({
  name,
  from: { x: Number(at(name, 2000)[X]), y: Number(at(name, 2000)[Y]) },
  to: { x: Number(at(name, 2024)[X]), y: Number(at(name, 2024)[Y]) },
}));
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about: a share is computed from its part and its whole, in percent.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision, never with strict equality on the raw division.
- When the title says "all rose, N fell", `check()` counts the entities whose y rose and whose x fell and throws unless they are all and N.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every arc, the lighter ones picked out, the subject's two moves). If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
