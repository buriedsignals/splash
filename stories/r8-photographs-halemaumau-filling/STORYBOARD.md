---
takeaway: "Fifty-three episodes of lava fountaining since 23 December 2024 have filled 60% of the void Kīlauea's 2018 collapse left in Halemaʻumaʻu, and the observatory's own photographs show the crater floor rising toward the rim."
subject: "Halemaʻumaʻu, the crater inside Kīlauea's summit caldera, and how much of the hole the 2018 collapse left there has been filled back in"
comparison: "The observatory's own B1cam frame from episode 1, on 23 December 2024, against the same camera's frame from episode 50, on 27 June 2026 — then the 16 July overflight of the resurfaced western floor and the 12 August panorama of episode 53, which show the filling still happening"
limits: "Every figure in the takeaway is the observatory's, quoted from its own 16 July 2026 Volcano Watch article; nothing here is computed by us and the frozen manifest carries no quantity at all, so no number on this frame is checked against data. The three frames are not one viewpoint: one is a fixed webcam pair, one an aerial overflight and one a rim panorama, at three different aspect ratios (0.88, 1.50 and 2.71 to one). The first photograph carries no photographer — the observatory credits it only as webcam imagery — and arrived with no alt text, which is why its caption says so. USGS spells the crater three different ways across the four captions in the frozen manifest, and spells the volcano two ways in the article; the spelling used on the frame is the observatory's own canonical one, Halemaʻumaʻu."
placement: "At the top of the piece, above the opening paragraph, as one sequence of three."
credit: "Photographs: U.S. Geological Survey — Hawaiian Volcano Observatory (public domain). Figures: USGS HVO, Volcano Watch, 16 July 2026"
effectiveDate: "2026-08-23"
grounding: "unverifiable"
reference: "Vox — The conflict in Kashmir, explained (2019), row 4, 'a geography whose present shape was produced by a datable event': geography arrives paired with the specific historical moment that produced it, instead of being shown whole up front and explained afterward. Applied here as the rule that every frame's caption names the episode and the date that produced the state it shows."
language: "en"
slots:
  - id: 1
    proves: "The floor of Halemaʻumaʻu is being rebuilt from below: the same webcam view is far shallower after fifty fountaining episodes than it was at the first, and the two later photographs show the resurfacing still in progress."
    medium: "image"
    format: "static"
    size: "landscape"
    destination: "screen"
    reachable: "yes"
    candidates: ["Photograph sequence"]
    chosen: "Photograph sequence"
---

## What was read in the article (restitution)

The frozen article is the observatory's own *Volcano Watch* of 16 July 2026, quoted. It makes three
claims, and only one of them is a claim photographs can carry.

1. **Carried by photographs.** The floor of Halemaʻumaʻu is rising. The observatory's own
   before-and-after webcam frame, its July overflight and its August panorama show it.
2. **Not carried, quoted instead.** The arithmetic — 60% of the 2018 collapse volume filled,
   the floor 1,608 ft (490 m) higher, the vents still 215 ft (65 m) below the rim. These are the
   observatory's figures. The frozen manifest holds none of them, so they are printed as a quoted
   line, attributed, and nothing on the frame pretends to have checked them.
3. **Not carried at all.** Whether lava will eventually leave the caldera. The article's own answer
   is "it depends"; a photograph cannot argue a forecast.

## What the grounding check could and could not see (G1)

`resolveGrounding` read the takeaway against `source/profile.json` and returned **`unverifiable`**,
and said exactly why: *"profile has no numeric column with a range to check against"*, for each of
the four numerals it found (23, 2024, 60, 2018). That is the honest verdict for a photograph
manifest — there is no quantity in it to decide anything with. It closes G1; it confirms nothing.

Worth writing down, because it is a property of this whole medium and not of this story: the two
figures the takeaway leans on, 60% and 23 December 2024, both appear verbatim in the frozen
`source/article.md`. Grounding reads `profile.json` only, so it never compared them to the frozen
prose they were quoted from. An image beat's takeaway is therefore always `unverifiable` here,
whatever it says.

## The manifest, as it arrived

Pulled off four USGS media pages on 23 August 2026 and not tidied. What the profiler found in it:

- `alt` — **2 of 4 missing.** USGS publishes a caption and a usage line; it publishes no alt text.
  Two were written at the desk before hand-over. The webcam before/after was not, because it is one
  file containing two frames and nobody would agree on one sentence for it.
- `credit` — **1 of 4 missing.** The observatory credits the webcam frame only as
  "USGS webcam images." There is no photographer to name.
- `episode` — typed `text`, with the profiler's own reason: *"looked numeric but \"1 & 50\" is not,
  so the column stays text"*. One row genuinely covers two episodes.
- `byline` — 2 distinct values across 4 rows. Three read `Hawaiian Volcano Observatory`; the fourth
  reads `Kīlauea`, which is the volcano, not a person. That is what the publisher's own page says.

## Slot 1 — the sequence

### Candidates

Exactly one treatment was offerable. `formatCandidates` refuses any name the toolchain does not
hold, and `visualCatalogueEntries` holds exactly one for the `image` medium —
`image.photograph-sequence` — with no type sheet behind it. The pair the desk actually weighed was:

1. **Photograph sequence** — chosen, and the only one the toolchain would formalise. All three
   frames, in the desk's order, each letterboxed into the same box.
2. **Before-and-after pair** — the webcam frame alone. Sharper, and it is the one frame that
   carries the whole argument by itself. Rejected because it drops both photographs that show the
   filling still happening, which is what makes the piece current rather than historical. The
   toolchain has no name for this treatment and refused it as a candidate; it is recorded here
   in prose instead.

## Sub-gates

- **G2a — medium.** `image`. The evidence is a place changing shape, not a quantity on an axis.
  `proposeMediums` reports the image medium reachable with `types: []` — no type sheet exists for
  it — so the survey movement had nothing to survey.
- **G2b — format.** `static`. `proposeFormats({medium: "image"})` offers `static` and `scrolly` and
  refuses `web` and `video` by name. One sequence at the top of an article, not a scroll vehicle.
- **G2c — size.** `landscape` (1920×1080), the article-web row. **Destination: `screen`.** The
  piece runs in the article's own column, not on paper.
