# Beat — One kiln left (mixed scrolly: a chart, two photographs, a map)

**Type:** mixed scrolly (bar chart + photograph pair + locator map). **Model:** ASSEMBLY
(`scrolly/references/scrolly-discipline.md`'s two models — every step SSRs its own complete
picture; none is a persistent element lifted out of the frame stack and scrubbed).
**Medium/format:** recorded as `chart` / `scrolly` in `STORYBOARD.md`, which is a compromise the
contract forces — see "What the storyboard could not say", below. **Channel:** article web, one
self-contained `renders/one-kiln-left.html` (235 KB — two photographs and a baked basemap inlined),
**four steps, three media**.

## What this beat is for

The article asks for the three media in a fixed order — *"Tell it as a scrollytelling piece — the
chart, then the two photographs, then the map — so the reader arrives at the last kiln."* Each leg
carries something the other two cannot:

| Step | Medium | What only this can say |
| --- | --- | --- |
| 1 | **Chart** — one horizontal bar per observation, length = the workforce, each row annotated with its own kiln count | The RATE, and its shape. A photograph has no scale and a map has no time. |
| 2–3 | **Two photographs** of the site, 1980 and 2026 | What the difference LOOKS like. There is no number for a working yard, and the reader does the comparison from the pixel that changed. |
| 4 | **Locator map**, one baked plate, one marker | WHERE this is. Neither the chart nor the photographs place Alcanede anywhere. |

Take any one away and a leg of the argument goes with it. Three distinct `frameKind`s is also what
makes this a scrolly at all rather than one chart stepped by hand
(`skills/scrolly/SKILL.md`, "How it works", item 1, and its "if every step would show the same
chart, do not reach for this skill").

## Every figure, computed

Nothing in the title, the source line or any step's prose is typed. `kiln-data.ts` derives it and
`render.mjs` interpolates it.

| Figure | Where it comes from |
| --- | --- |
| 42 kilns and 1 860 workers in 1980; 1 kiln and 18 workers in 2026 | first and last rows of `source/data.csv` |
| 67% of the kilns standing in 2010 gone by 2020, and 67% of those left in 2020 by 2026 | computed from consecutive rows |
| 1.2 kilns a year between 1990 and 2000 — the steepest interval in the file | `deriveFacts().steepest`, found by comparing every consecutive pair rather than assumed |
| 46 years, 6 observations | span and row count |
| 39.74°N, 8.81°W | the one coordinate pair the file records, asserted to be the only one |

## The claim in the article this beat does NOT repeat

The article states: *"The decline was steady until 2010 and then steepened."* Recomputed from the
frozen rows, kilns lost per YEAR runs 1.1 · 1.2 · 1.0 · 0.6 · 0.33 across the five intervals — the
absolute decline is fastest in the 1990s and slowest after 2010, the opposite of the sentence. Read
proportionally the sentence is true, and that is the reading the beat states, in both numbers.
`groundTakeaway` returned `unverifiable` on the sentence — it recognises no shape for it — so
nothing mechanical would have stopped it reaching the page.

## What the photographs are, and what they are not

The two frames supplied with the story are **flat fields of one colour each** (1800×1200,
`#6E6154` and `#4A544C`; measured mean luminance 0.125 and 0.087). They carry no visible subject.
The beat prints them at their own aspect ratio, letterboxed in the render's own ground, with the
year on the picture itself — and its prose says only that the frames are of the site and that
nothing here measures anything from a photograph. **A reader will see two coloured rectangles.** On
a real story these two files are the one thing a journalist replaces, and the beat is built so that
replacing them changes nothing else: the caption is placed in the picture's OWN coordinates, read
from each file's PNG header, so a different size moves nothing off the picture.

## Composition — what a travelling card forced

The prose card is opaque, centred, and travels the whole frame; at `data-progress = i` it is dead
centre. Every frame here is composed against that:

- **The chart is horizontal** precisely so every word on it lives in a gutter: the year on the
  left, `workers · kilns` on the right. Driven at 1600 and 1280, no label is ever cut in half
  (verifier: *"longest SLICED run none"*). At 375 the card is edge to edge and covers six of the
  chart's labels whole, which is the vehicle's own accepted answer at that width.
- **The map's marker is NOT at the plate's centre.** The skill's own bake centres the camera on the
  subject; on this vehicle that is the one place the only two marks of a locator cannot be. Driven
  with the centred camera, "Alcanede" and its dot were under the card on 52 of 240 frames at
  1600×900 — including every frame at the step's own centre. The bake pans the site to `--marker-y`
  = 170 of the plate's 640, inside `safeBand` and above the card's box at all three widths.
- **The photograph's year chip is drawn inside the picture's own viewBox**, not in the letterbox
  band beside it.

## Colours and typeface

`PALETTE.md` beside the story, read through `readPalette`; no hex in `render.mjs` or
`KilnFrames.tsx`. Ground `#16191B`, accent `#D4A853`, measured 8.01:1. The accent marks one idea
across all three media — the kilns still firing and the workforce that tended them.

**The plate had to be re-baked for this ground.** `skills/scrolly/scripts/bake-plate.mjs`
hard-codes `dataviz-light`; against this story's dark ground that plate measures 0.797 against a
ground of 0.009 and `plateFollowsGround` refuses opposite sides. This beat's own bake takes
`--style` and defaults to `dataviz-dark`, with the water tint moved to the same side.

`TYPEFACE.md` is recorded beside the story (`Helvetica, Arial, sans-serif`, `origin: default` —
`Space Grotesk` does not resolve on this machine and `Courier New` carries its own caution). **This
format does not read it**, which the skill states as a gap rather than a design, and the delivered
page's own source line says so.

## What was driven, and what it found

`drive.mjs` screenshots each step at the scroll position where `data-progress` reaches it;
`skills/scrolly/scripts/verify-scrolly.mjs` drives a continuous scroll at 1600×900, 1280×800 and
375×812 with a `requestAnimationFrame` recorder installed before anything moves.

**0 failures at all three widths.** Redraw per step 91.4% / 25.0% / 63.6% against a 1% floor;
`data-progress` 0.00 → 3.00; worst step/progress drift 0.57 against a 0.65 ceiling; card travel
585–988 px per panel with 0 held; panel contrast 17.66:1.

Four things the driving found that no assertion did, each fixed here:

1. **The photograph was cropped.** A flex box shrink-wrapping an `<img>` with `max-width`/
   `max-height` rendered the 1800×1200 file at 1600×1067 inside an 817 px frame and cut 250 px off
   it — the exact defect the contain rule exists to prevent. Now an SVG with the picture's own
   viewBox and `preserveAspectRatio="xMidYMid meet"`.
2. **The map's own toponym showed as a stray glyph beside the marker**, the basemap's "Alcanede"
   half-covered by the beat's own dot. The halo is wider than a ring now.
3. **The two chart headers met in the middle at 375 px** and read as one run of text.
4. **The marker under the card**, above.

## Files

- `kiln-data.ts` — the reading layer: a quote-aware CSV reader, the derived facts, and the one
  number formatter the page and the storyboard share.
- `KilnFrames.tsx` — `ChartFrame`, `PhotoFrame`, `MapFrame`, plus this beat's own copies of
  `ASPECT_ENVELOPE` and `safeBand`.
- `photographs/ac-kiln-1980.png`, `photographs/ac-kiln-2026.png` — the two frames supplied with the
  story, copied here so the beat's inputs live in the beat's folder.
- `bake-plate.mjs` — the map track's bake. Run once; re-run only if the camera, the style or the
  site changes.
- `site-plate.jpg`, `site-plate.json` — the baked plate and its geometry, including the site's own
  projected pixel.
- `render.mjs` — the runner: reads the frozen file, derives every fact, embeds the three rasters,
  and hands `renderScrolly` four built frames.
- `drive.mjs`, `drive/` — the browser run and the four steps as a real browser painted them, at
  1600×900 and 375×812.
- `renders/one-kiln-left.html` — the delivered file, self-contained, no network request.
