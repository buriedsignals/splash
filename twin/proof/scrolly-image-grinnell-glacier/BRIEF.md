# Beat — Grinnell Glacier from Mount Gould: four photographs, 71 years, one viewpoint

**Type:** photograph sequence (repeat photography), carried by the scroll vehicle.
**Medium/genre:** image / **scrolly**. **Channel:** article web, one self-contained
`render/grinnell-glacier.html` (1,562 KB, four photographs inlined), **four steps**, one viewpoint.

## Read this first: what is finished here, and what is not

**The photographs are not a newsroom's own.** They are the U.S. Geological Survey's repeat-
photography record of Grinnell Glacier in Glacier National Park, Montana, all four in the public
domain, credited frame by frame from `photographs.csv`. Nothing here is generated, staged, or
presented as reportage by anybody who did not take it: each frame carries the name of the person who
made it, and every original's own URL and sha256 is frozen beside this beat.

**Why real photographs at all, rather than a placeholder.** The vehicle's seed uses an illustrated
scene authored from flat shapes, which proves the mechanism and proves nothing about a photograph:
a drawn scene has no grain, no exposure, no aspect ratio it was actually shot at, and no credit. The
questions that only appear with real images — four cameras across 71 years that do not share a
frame, a credit line per photographer, a colour transparency next to a black-and-white negative,
a megabyte of JPEG in a self-contained file — are exactly the ones this beat exists to answer. So it
answers them on images that are genuinely usable and genuinely someone's work.

### What a journalist's own photographs would replace

Exactly two things, and nothing else in this folder changes:

1. **`frames/*.jpg`** — the four delivered images.
2. **`photographs.csv`** — one row per image: the year, the photographer, the collection, the
   licence, the source page, the original's URL, its dimensions and its sha256, and the delivered
   file's own dimensions and sha256.

Everything else survives untouched: `ImageFrame.tsx` (the contained frame, the year, the credit on
the photograph's own bottom margin), `photograph-data.ts` (the reader, the sequence facts, and the
three assertions below), `prepare-photographs.mjs` (the normalisation), `render.mjs` (the four steps
and their prose), and `PALETTE.md`. A journalist supplying eight photographs instead of four changes
one CSV and one `SEEN` map; the mechanism is not sized to four.

**What this beat does NOT prove**, said plainly: it does not prove that a journalist's own images
will arrive normalised, exposed alike, or shot from one place. `prepare-photographs.mjs` centre-crops
to a common aspect and resamples — it does not register, straighten, colour-match or align two
photographs of the same scene, and none of those is attempted anywhere in this folder. The four
frames here line up because the USGS shot them from one summit on purpose. A newsroom's own set may
not, and that is a real gap between this beat and a finished image engine.

## Claim

The same basin, photographed from the summit of Mount Gould four times between 1938 and 2009. In
1938 ice fills the basin floor and there is no lake. In 2009 the basin is a lake with ice floating
on it, and what is left of the glacier sits on the shelf above.

**No measurement is claimed.** Four photographs are not a survey: this beat states no area, no
volume and no percentage, because none of that is reproducible from its own frozen data. Every number
it does state — four frames, 71 years, gaps of 43, 17 and 11 years — is a fact about the SEQUENCE,
computed from `photographs.csv`.

## Why this earns the scroll

- **The frames are genuinely different states of one view** — which is the test the vehicle sets. A
  reader who has just looked at 1938 and then meets 1981 in the same rectangle is doing the
  comparison the beat is about, in the only way it can be done: by memory of the pixel that changed.
- **What the scroll adds that a still could not.** One still is one year. A four-up grid is four
  photographs at a quarter of the size, and the eye compares them by travelling, which is the thing
  repeat photography is trying to avoid. Here every frame lands in the SAME rectangle at the SAME
  size — the sequence was normalised to one 820 × 1215 box for exactly that reason, and
  `deriveSequenceFacts` throws if any frame is delivered at a different size.
- **What it adds that a video could not.** A crossfade decides how long the reader looks and takes
  the comparison away from them; here they can hold a frame, scroll back, and hold it again. And a
  video carries no text: with JavaScript off this file still delivers all four paragraphs, all four
  credits and the first photograph.
- **The honest cost.** 1,562 KB, almost all of it photographs. A photo scrolly is heavier than a chart
  scrolly by an order of magnitude, and the only lever is the delivered resolution
  (820 px wide at quality 72 here — down from 1080 px, which cost 2.5 MB).

## Data

- Source: repeat photography of Grinnell Glacier, Glacier National Park, Montana, from the summit of
  Mount Gould — the USGS Northern Rocky Mountain Science Center's own series, plus the 1938 frame
  from the Glacier National Park Archives.
- `photographs.csv`: **4 rows**, one per photograph, frozen beside this beat. It is the beat's only
  data file and every figure the beat states comes out of it.
- `frames/grinnell-1938.jpg`, `-1981`, `-1998`, `-2009`: the delivered frames, committed, so a warm
  render fetches nothing.

| Year | Photographer | Collection | Licence | Original | Delivered |
| --- | --- | --- | --- | --- | --- |
| 1938 | T. J. Hileman | Glacier National Park Archives | public domain | 1200 × 1769 | 820 × 1215 |
| 1981 | Carl Key | U.S. Geological Survey | public domain | 1258 × 1756 | 820 × 1215 |
| 1998 | Dan Fagre | U.S. Geological Survey | public domain | 1180 × 1748 | 820 × 1215 |
| 2009 | Lindsey Bengtson | U.S. Geological Survey | public domain | 1300 × 1748 | 820 × 1215 |

Source pages, file URLs and the sha256 of every original are in `photographs.csv`.

### What was done to the photographs, in full

Only this, and `prepare-photographs.mjs` is the code that does it:

1. **Centre-crop to a common aspect ratio of 0.675** — the narrowest of the four, so every crop
   takes pixels off the WIDTH and none off the height. Crop widths: 1194 (1938), 1185 (1981), 1179
   (1998), 1179 (2009), each recorded in the CSV and re-derived and re-checked by the script.
2. **Resample to 820 × 1215 and re-encode as JPEG at quality 72.**

No rotation, no straightening, no colour or tone adjustment, no retouching, no composite. The script
verifies each original against its frozen sha256 before touching it and throws if the upstream file
has changed — because a caption crediting T. J. Hileman sitting over a photograph nobody here has
seen is the failure that matters most in this medium.

## Exact values — computed from `photographs.csv`

| Figure the beat states | Computed |
| --- | --- |
| frames | 4 |
| span | 1938 → 2009 = 71 years |
| gaps between consecutive frames | 43, 17, 11 years |
| longest gap | 43 years, 1938 → 1981 |
| the one box every frame was normalised to | 820 × 1215 |

Three assertions guard the sequence rather than trusting it: the years must be strictly increasing
(the scroll reads them in file order and the prose calls it time passing), every frame must be
delivered at the same box (or the reader is comparing two different crops while being told the
viewpoint is fixed), and every year in the CSV must have a paragraph written about it (a picture with
no words is a picture the reader is left to interpret alone).

## The frame, and the three craft decisions in it

- **CONTAINED, never cover-cropped.** `scrolly-discipline.md` files a photograph under scenery and
  crops it, on the argument that no part of the image is a claim. Here the image IS the claim. COVER
  at 1600 × 900 would show the middle 27% of a portrait photograph's height — four horizontal slices
  nobody chose. Every frame is fitted whole into the content band above the prose lane.
- **The furniture is sized to the PHOTOGRAPH, not to the frame.** The first build anchored the year
  to the frame's top-left and the credit to its bottom-left; at 1600 × 900 the contained photograph
  is 437 px wide in the middle of the screen and both labels sat stranded 600 px away across an empty
  field. Only looking at the render showed it. The column is now exactly as wide as the photograph
  renders — `min(100vw − 32px, (0.72 × 100vh − 84px) × aspect)` — with the aspect passed in as a
  prop derived from the CSV.
- **A credit per photograph, on its own bottom margin.** Four photographs by four people cannot be
  credited by one line in a page header. The header carries the collection and the licence for the
  sequence; each frame carries the person. Both the year and the credit sit on an opaque chip of the
  render's own ground, never over the image — a caption laid on a photograph has no contrast that can
  be measured once, because its background is different pixels on every frame.

## What driving a real browser found and fixed

Rendered, then opened in Chrome and sampled at **25 scroll positions across the full track at
1600×900, 1280×800 and 375×812**.

1. **The credit ran off the bottom of a phone.** "T. J. Hileman, Glacier National Park Archives,
   1938 · public domain" measured 359 px at 13 px — 96% of a 375 px viewport — and wrapped to two
   lines. The licence, identical for all four and already in the header, was dropped from the
   per-frame credit; the line is now 310 px and one line high.
2. **The composition was wrong at desktop widths** — the year and the credit stranded at the frame's
   edges, far from the photograph. Fixed by sizing the column to the image (above).

## Measured, after those fixes

- **Collisions between the frame's own words and the pinned prose panel, while the graphic is
  pinned: 0**, at all three widths, every sample. **Off screen: 0.** Exactly one panel painted at a
  time. Full viewport width and height while pinned; no horizontal overflow.
- **The pre-pin band**, stated rather than hidden: before the sticky graphic reaches `top: 0` it is
  still climbing from its document position below the header — normal `position: sticky` catch-up —
  and in that band the credit line, which is anchored in FRAME percentages, sits over the panel
  (1 sample at 1280 × 800, 1 at 375 × 812, first sample only). It never recurs. Same property as the
  chart scrolly's; the fix belongs in `twin-scrolly`'s scaffold, which this beat does not edit.
- **Reduced motion**: 12 positions, 0 intermediate opacities, computed `transition-duration: 0s`,
  active frame advancing 1938 → 1981 → 1998 → 2009.
- **JavaScript disabled**: one server-rendered active frame and all four steps' prose in full
  (155 / 133 / 128 / 149 characters).
- **Prose panel**: computed `rgb(255,255,255)` on `rgb(0,0,0)` read live off the DOM — **21.00:1**.

## Anti-patterns for this case

- **Never describe a photograph the frame does not show.** Each paragraph says what is visible in
  its own frame and nothing else; the descriptions are keyed BY YEAR, not by position, so a row
  moving in the CSV cannot slide a sentence onto the wrong picture.
- **Never state a measurement a photograph cannot support.** "The lake has grown" is what the frames
  show. "The glacier has lost N per cent of its area" is a survey, and this beat has no survey.
- **Never let one credit stand for four photographers.**
- **Never present a stand-in as the newsroom's own.** This brief's opening section exists because a
  reader who opens the rendered file has no way to know whose photographs those are unless the beat
  tells them — which it does, in the header, in every frame's credit, and here.

## Source line

`Repeat photography of Grinnell Glacier, Glacier National Park, Montana. T. J. Hileman, Carl Key, Dan Fagre, Lindsey Bengtson — Glacier National Park Archives and the U.S. Geological Survey; all 4 in the public domain. Each frame centre-cropped to one common aspect and resampled to 820×1215; nothing else was changed. Every original's own URL and sha256 is in photographs.csv beside this beat. Colours recorded in PALETTE.md by the newsroom.`
