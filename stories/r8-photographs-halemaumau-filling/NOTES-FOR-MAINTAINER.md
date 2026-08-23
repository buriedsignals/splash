# Notes for the maintainer

Round eight, `image-beat`. One real story: three photographs pulled off the USGS Hawaiian Volcano
Observatory's own media pages on 23 August 2026, and the observatory's own *Volcano Watch* article
of 16 July 2026 as the prose. Public domain, credited as the observatory credits them. Nothing in
this file belongs to the journalist and nothing in it is about `export/`.

Every entry names the phase it was found in, what was run, what came back, what was expected, and
what it cost.

---

## 1. PRODUCTION — `checkWeight` names `undefined` on the only path a beat is documented to follow

**Ran.** The three files as USGS serves them, through the shape `image-beat/SKILL.md`'s own
"Quick start" worked example builds (lines 188–205): `files` are `{ path, alt, credit }`, `photos`
are `{ ...f, bytes, dataUri, intrinsicWidth, intrinsicHeight }`, then `checkWeight(photos)`.

**Came back.**

```
this beat would embed 26.0 MB of photographs, over the 20.0 MB limit
(references/image-discipline.md, "Weight"). Largest first: undefined (12.5 MB),
undefined (11.4 MB), undefined (2.0 MB). Re-export the largest one at a smaller size…
```

**Expected.** The file names. `references/image-discipline.md`, "Weight", states the reason this
error exists: *"The error names every photo, largest first, with its own size, so a journalist
knows exactly which file to re-export smaller — a total with no names attached says there is a
problem but not which one to fix."* That is precisely what came back.

**Why.** `render-still.mjs:745` reads `img.label`. `SKILL.md`'s example never sets `label`; it
spreads `{ path, ... }`. `scripts/render-preview.mjs:57` DOES set `label`, so the seed runner is
fine and the documented beat path is not.

**And the test cannot see it.** `test/render-still.test.ts:205–228` constructs
`{ label: "huge.jpg", bytes }` by hand. It asserts the message contains `huge.jpg`. It stays green
for as long as nobody uses the shape the documentation teaches. Reproduced here from a two-element
array in exactly the documented shape: `Largest first: undefined (20…`.

**Cost.** The refusal was correct and useful — 27.3 MB against a 20 MB ceiling, on real
newsroom-resolution files, at first contact. It just did not say which of the three to re-export.
This beat sets `label` itself and says why in a comment.

---

## 2. PRODUCTION — the seed treats a caption's top as a baseline, and never measures the letterbox bar

**Ran.** `imageBeatLayout`'s own arithmetic, on this beat's numbers, printed by `render.mjs`'s
second pass into `beats/1-halemaumau-filling/guards.json` under `captionArithmetic`.

**Came back.**

```json
{ "boxBottom": 720, "namedGapPx": 22,
  "seed":     { "captionBaseline": 742, "inkTop": 717.25, "gapBelowBox": -2.75 },
  "thisBeat": { "captionBaseline": 775, "inkTop": 750.25, "gapBelowBox":  30.25 } }
```

**Why.** `ImageBeatSeed.tsx` computes `captionTop = boxTop + BOX_HEIGHT + CAPTION_TOP_GAP` and then
draws `<text y={block.captionTop + j * CAPTION.lead}>`. An SVG `<text y>` is a BASELINE, so the
named "top gap" is spent below the ink rather than above it, and the caption's own cap height lands
**inside** the letterbox bar it is supposed to sit under. At the seed's own scale (15 px caption,
10 px gap) the overlap is about 1 px and reads as a tight caption; at this beat's `landscape` scale
(33 px, 22 px) it is 2.75 px and would read as a collision.

The credit two lines further down in the same component draws at `creditTop + CREDIT.fontSize` —
i.e. it DOES add the font size. The two rules disagree inside one file.

`assertWithinStage` already knows the conversion (`y - size * 0.75`, the cap-height ratio used
here). Nothing applies it to a caption against its own box.

---

## 3. PRODUCTION — nothing measures a run that overflows its own box, and the seed never wraps a credit

**Ran.** The first render of this beat, with the credit the desk actually wrote for the photograph
the observatory does not attribute: `USGS webcam images — no photographer stated`.

**Came back.** A rendered PNG in which that credit runs 87 px into the next photograph's credit —
`measureText` puts it at 623 px against a 536 px column — and **every guard green**:

```json
{ "photosDeclareAltAndCredit": { "photos": 3, "missingAlt": 0, "missingCredit": 0 },
  "graphicFillsItsFrame": { "fraction": 0.7612, "floor": 0.664, "under": false },
  "duplicatedPayload": [], "typeTokens": [29, 33, 57], "minTypePx": 26,
  "deliveredSize": { "width": 1920, "height": 1080 } }
```

**Expected.** Something to see it. Nothing does:

- `ImageBeatSeed.tsx` wraps the title and the caption on measured width and draws the credit as one
  unwrapped `<text>`. A real credit is often longer than a caption line.
- `photosDeclareAltAndCredit` reads the markup and never the geometry — it can tell you a credit
  EXISTS, never that a reader can read it.
- `assertTypeFloor` reads `font-size` and never `x` or width.
- `decollide` (`render-still.mjs:491`) resolves VERTICAL collisions between label anchors and has
  no caller anywhere in this skill's render path.

**Cost.** Found by looking at the first render, which is what the format's own verification rule
says to do — so the doctrine worked and the mechanism did not. This beat wraps its credits and
asserts the property itself (`runsOutsideTheirColumns` in `render.mjs`, scope stated: the
caption/credit band only, since the title, deck and footer legitimately run the full content
width). Mutation-tested: replace the wrap with `[p.credit.trim()]` and it reddens with
`"USGS webcam images — no photographer stated" ends at 728, allowed to 621`; restore it and it goes
green.

---

## 4. DELIVERY — the hand-over carries ONE alt and ONE credit; an image beat has one of each per photograph

**Ran.** `materialise({ form: "owned-file", format: "static", handover: { language, placement,
alt, credit, caveat } })`.

**Came back.** `HANDOVER.md` with exactly one `## The alt text` block and one `## The credit line`
block. The three per-photograph alts and the three per-photograph credits — which are on the
artefact, in each `<g role="img">`'s `aria-label`, `<desc>` and `data-credit` — have no field in the
record at all.

**Cost.** The only way to carry the fact was to write it inside the `alt` string, which means the
journalist who pastes that field into their CMS pastes the note with it. The handover shape needs
either a list or a per-photograph block for this medium; one string per beat is a chart's shape.

---

## 5. DELIVERY — the hand-over gives an image beat's journalist advice that is false for this format

**Came back**, verbatim, in the delivered `HANDOVER.md` for `owned-file` / `static`:

> - **`still.svg`** — the vector file — this is the one to give the CMS, and it stays sharp at any size

**Measured.** The delivered `still.svg` is **4,455,904 bytes** against `still.png`'s **1,274,684** —
3.5× heavier — and contains **three** `data:image/jpeg;base64` payloads. It is exactly as sharp as
the JPEGs inside it and does not scale. This is a chart-format sentence reaching the one format
where every word of it is wrong, and it is the sentence that tells the journalist which file to
hand their CMS.

---

## 6. STORYBOARD — the image medium holds one treatment, so the candidates movement cannot offer two

**Ran.** `typeSurvey()`, `visualCatalogueEntries({})`, and `formatCandidates({ medium: "image",
candidates: [...] })`.

**Came back.** `typeSurvey()` returns rows for `chart` and `map` only — `image` types: `[]`.
`visualCatalogueEntries({})` holds exactly `image.photograph-sequence.static` and
`image.photograph-sequence.scrolly`. Any other name is refused:

```
"Before and after pair" is a treatment this toolchain holds nowhere — no type sheet and no
catalogue entry names it. Offer a type somebody can read the sheet of and a producer can build,
or write the sheet first.
```

**Cost.** The candidates movement exists so a journalist sees genuinely different ways of seeing
their material. For a photograph beat it can show one. The second option this desk actually weighed
— the webcam pair alone, no later frames — is recorded in `STORYBOARD.md`'s prose because the
mechanism would not take it. `stress-w-quay-photographs` offered the same pair as bare strings and
therefore also went around this helper.

The honest half, worth keeping: `formatCandidates` states its own gap on the one entry it does
accept — *"this toolchain holds no type sheet for the image medium, so nothing here states what
'Photograph sequence' refuses or the counts it refuses at."*

---

## 7. PALETTE — `proposeTypeface` names a remedy this skill is architecturally forbidden to take

**Ran.** `proposeTypeface({ newsroom })`.

**Came back.**

```
proposeTypeface has to measure whether a family resolves on THIS machine and cannot do it
itself: pass resolves — familyResolves, exported by every render-still.mjs
(e.g. skills/map-beat/scripts/render-still.mjs).
```

**"Every"** is not true, and the exception is this format. Measured across the eight producing
skills:

| skill | `familyResolves` | `useTypeface` calls | `readTypeface` calls |
| --- | ---: | ---: | ---: |
| chart-beat, chart-web, chart-video, map-beat | 1 | 5–11 | 1–8 |
| **image-beat**, map-web, scrolly, dw-beat | **0** | **0** | **0** |

`skills/splash/test/no-cross-skill-imports.test.ts` forbids importing another skill's copy, so the
sentence names the one move this skill may not make. The proposal is therefore unanswerable from
inside this format, and the only record it could write is `origin: default` from no measurement —
which is exactly what `stress-w-quay-photographs` wrote.

**What this run did instead**, so the story has a measured record rather than a guessed one: ran the
proposal from outside the skill, as the journalist, against `chart-beat`'s `familyResolves`. It
found Space Grotesk absent from this machine and Courier New present, recommended the fallback
stack, and `writeTypeface` recorded it. `image-beat` still does not read the file.

---

## 8. INTAKE — the profiler drops every period label when the period column is text

**Ran.** `freezeSource` on `source/data.csv`, a photograph manifest whose `date` column holds
`"July 2, 2026"`, `"July 16, 2026"`, `"August 12, 2026"`.

**Came back**, in `source/profile.json`:

```json
"coverage": { "byPeriod": [ { "period": null, "entities": 1 },
                            { "period": null, "entities": 1 },
                            { "period": null, "entities": 2 } ],
              "fullest": { "period": null, "entities": 2 },
              "thinnest": { "period": null, "entities": 1 },
              "says": "…the fullest period here carries 2 entities and the thinnest carries 1" }
```

**Why.** `profile.mjs:818` — `.map(([p, subjects]) => ({ period: Number(p), entities: subjects.size }))`,
unconditionally, then `.sort((a, b) => a.period - b.period)` over the results. `Number("July 2, 2026")`
is `NaN`, and `JSON.stringify(NaN)` is `null`. The coverage sentence therefore names no period, and
the sort ran on NaN.

**And it already knew.** Two keys later the same object reports
`periodNotASequence: { column: "date", type: "text", says: "…this profiler's own typing does not
make it a sequence" }`. The profiler has the fact and coerces anyway.

---

## 9. STORYBOARD — `proposeCredit` cut the article's own source line at an abbreviation and kept a markdown marker

**Ran.** `proposeCredit({ newsroom, article })` against the frozen article, whose second line is:

```
Source article: *Volcano Watch — When will Halemaʻumaʻu fill with lava?*, U.S. Geological Survey
Hawaiian Volcano Observatory, published 16 July 2026,
```

**Came back**, as the **recommended** option, `article-1`:

```
Source: Volcano Watch — When will Halemaʻumaʻu fill with lava?*, U.S
```

Two faults in one string: the closing emphasis `*` survived, and the sentence split cut on the
period inside `U.S.`, losing "Geological Survey Hawaiian Volcano Observatory" and the date.

**Cost.** The escape hatch is offered — *"Something else — name the source and it is recorded
exactly as you write it"* — and was used. The recommendation itself was unusable, on an article
whose source line is unremarkable.

---

## 10. PRODUCTION — the default raster scale contradicts the size assertion, and only the source says so

**Ran.** `renderStill({ element, width: 1920, height: 1080, outDir, name: "still" })` — the shape
`SKILL.md`'s Quick start shows, which passes no `scale`.

**Came back.**

```
the delivered still.png measures 3840x2160, but the pinned size "landscape" is 1920x1080.
```

Both mechanisms are this skill's own: `rasterise`'s `scale = 2` default and `assertDeliveredSize`.
The fact that a size-pinned beat passes `scale: 1` is written only inside `render-still.mjs`'s own
parameter comment. `SKILL.md`'s Quick start does not, and its Tuning-knobs row reads
*"How closely the still survives being looked at | 2 (raster scale)"*, which reads like a quality
dial rather than a contract.

**Cost.** One failed run. `stress-w-quay-photographs` had already found this and written
`scale: 1` with a comment; nothing carried the finding into the skill's own documentation.

---

## 11. DELIVERY — one record, two opposite defaults for `planVersion`

`writeOutputReview({ beatDir, id, findingIds, ... })` with no `planVersion` **derives** it (1 for a
first review) and says so at length in its own comment. `offerForms({ ... })` with no `planVersion`
**throws**:

```
current planVersion must be a positive integer: it is this beat's own review revision…
```

The fix, `currentPlanBinding`, is documented in `deliver/SKILL.md`'s example but is exported from
`scripts/output-review.mjs`, not from `scripts/deliver.mjs` where the example's other imports come
from. **Cost:** two failed calls before the delivery ran.

---

## 12. DELIVERY — the `source-bundle` offer text says "chart" to a photograph beat

`FORMS_BY_FORMAT.static["source-bundle"].gives` (`deliver.mjs:88`): *"a folder with **this chart's**
component and data…"*. That is the sentence a journalist delivering three photographs is shown.

---

## 13. INTAKE — the aggregate proposer read a free-text credit column as an entity code

`source/profile.json` proposes two of the four manifest rows as aggregates
(`byStructure: [{ entity: "episode_1_vs_50.jpg", proposedBy: "code-missing" },
{ entity: "Image_(5)_0.jpg", proposedBy: "code-shape", code: "USGS photo by M. Cappos" }]`),
having derived the shape `"AAAA aaaaa aa A. Aaaaaaa"` from a credit line. A photograph manifest has
no aggregate rows. The field labels itself a proposal and says a proposal is a question, so it is
inside its stated limits — but it is noise a journalist has to dismiss, produced from a column
whose values are prose.

---

## What worked, said plainly, because a stress note that only lists faults is not a measurement

- **`checkWeight` fired correctly at first contact** on real newsroom-resolution photographs —
  27.3 MB against a 20 MB ceiling — and `image-discipline.md`'s named remedy (an explicit re-export
  the journalist runs and approves, never a silent recompression) was the right one and was
  followed. This is the format's most valuable refusal in this run.
- **The alt/credit refusal is real and one field at a time, as documented.** Against the frozen
  manifest verbatim: attempt 1 refused for a missing alt on photo 1, attempt 2 refused for a
  missing credit on photo 1, attempt 3 drew. Two gaps, two round trips. A three-photograph beat
  with one gap each would have cost three. The receipt is `guards.json` →
  `frozenManifestRoundTrips`.
- **The letterbox arithmetic is exact on a 3.08× aspect spread.** One 536 × 447 box:
  0.881 → 394 × 447 (71 px bars each side), 1.500 → 536 × 357 (45 px bars), 2.715 → 536 × 197
  (125 px bars). Nothing cropped, nothing stretched.
- **The format's own headline gotcha did not fire on a real archive.** `readOrientation` returned
  `1` on the USGS camera JPEGs and `null` on the composite; `checkOrientation` passed all five files
  tested. Worth knowing: the failure the SKILL leads with is a phone-camera failure, and a public
  agency's published JPEGs do not carry it.
- **`whereIs` recovered the phase correctly at every step**, including holding the story in
  `storyboard` for a missing `SUBJECTS.md` before it ever looked at the storyboard's own contents —
  the round-six fix working on a first run.
- **`assertDeliveredSize`, `assertTypeFloor` and `readPngSize` all measure the artefact rather than
  the arguments**, and the first of them caught the raster-scale mismatch immediately.
