---
size: portrait
type: diverging-bar
---

# Beat — Four regions emptied in 2025, and one of them did most of it

**Type:** diverging bar (one row per region, signed values growing out of a single zero line).
**Medium/format:** chart / video. **Pinned size:** portrait, 1080 × 1920.
**Second form:** square, 1080 × 1080 — the same composition, the same timing, the same props.

**Reading**: raw — `population` sits beside `net_migration_2025` in the frozen table, and this beat
draws the RAW balance on purpose: the article's claim is about how many people a region lost, and
21 800 people leaving Centre is that number, not a rate. The per-capita reading is not discarded,
it is printed in the subtitle where it changes the ranking — *"Per 1000 residents Sud, not Ouest,
gained most"* (Sud 5.11 per 1000, Ouest 4.57) — so a reader who wants the rate has it and a reader
who wants the count has the bars. Both are true; only one can be a bar length.

## What this beat proves

Four of the seven regions had a negative net migration balance in 2025 and three positive, and
Centre's loss is in a different order of magnitude from every other region's. The diverging layout
gives the four/three split away for free — it is which side of the line a bar sits on — so the one
accent is free to do the only other job the takeaway needs, which is Centre.

## The framing, measured

`framingMeasurement` was run on the seven values and its numbers are printed by `render.mjs` on
every run. They are recorded here because the reading is the point:

| reading | on the signed values | on the magnitudes |
| --- | --- | --- |
| `max` | 15 600 | 21 800 |
| `min` | −21 800 | 780 |
| `median` | −780 | 8 900 |
| `spreadAgainstExtent` | 2.397 | 0.964 |
| `largestAgainstMedian` | **null** | 2.45× |

**The signed row is the finding.** `largestAgainstMedian` is `null` because the median of a series
that crosses zero is negative (−780 here) and the function only divides when the median is
positive; and `spreadAgainstExtent` divides the spread by `max`, which assumes a zero-based extent,
so on a diverging domain it returns 2.397 — a number above 1 that cannot mean "the fraction of its
own column's height the change occupies". Neither reading is wrong arithmetic; both are readings
for a chart that starts at zero, and this chart does not. So the outlier question was asked of the
magnitudes instead, by hand, and the number that actually decides this beat's treatment is neither
of them:

> **Montagne's 780 is 3.6% of Centre's 21 800.**

That is the ratio `static-discipline` and `framing-serves-the-point` exist to make somebody look at,
and it is the one the shipped function does not compute for a signed series.

## What the ratio decided, and what it did not

It did **not** decide to break the axis, to plot magnitudes on a log scale, or to draw the small
regions in their own panel. All three would hide the finding: Montagne's balance really is a
rounding error beside Centre's, and a reader who cannot see that has been told something the frozen
data does not say. The reference the storyboard records — Republik's supply-chain chart, where the
named subject's own bar is too short to hold its number — is the lesson applied here: **the bar
keeps its true length and the number moves outside it.** Every one of the seven bars is labelled
directly with its own value, so the sliver is legible as 780 even though it is thirteen pixels long.

## Portrait, and the two things it changed

1. **No tick axis.** At portrait's 36px type floor a tick label reading "−20 000" is about 150px
   wide, and four of them across a 614px plot band collide with each other and with the bars. The
   ticks and gridlines are removed and every bar carries its own number instead. This is a removal
   decided here, not a token quietly left out — and the value dimension keeps its two honest pieces
   of furniture, the zero line and the axis title naming the unit.
2. **Region names sit across the zero line from their own bar**, not in a left gutter. A gutter wide
   enough for "Montagne" at 36px plus a value gutter on each side would have left about 430px of a
   1080px frame for the plot itself. Across the line, the plot band is 614px.

Everything is laid out inside the platform's safe band (269–1248), not inside the frame, because a
portrait video is watched under a profile row at the top and a caption, buttons and progress bar at
the bottom. A credit covered by a progress bar is an attribution failure, not a cosmetic one.

## The denominator: asked, and answered

`intake`'s profiler named `population` as a candidate denominator for `net_migration_2025`, and
`groundTakeaway` repeated the warning against every superlative in the takeaway. It was examined.

**The beat draws the raw balance.** A net migration figure is a FLOW of people, and the reasons the
article gives for caring — schools, housing, services — scale with the count of people who arrived
or left, not with the share of the region they came from. A per-capita chart would answer a
different, also-legitimate question ("which region is changing fastest relative to itself"), and it
is not the question the article asks.

**What the raw view hides is printed on the artefact.** Per 1000 residents the order of the three
gainers reverses — Sud 5.1, Littoral 4.7, Ouest 4.6 — so the region with the largest gain is not the
region gaining fastest. And Montagne's −780, which the chart draws as a sliver, is −2.5 per 1000:
the same proportional loss as Est's −3100, which is four times larger in people. The caveat under
the title says the first of those in the journalist's own frame; the hand-over carries both.

## The edit

Six events, `timing-contract.ts`, 330 frames at 30fps — **11 seconds**, under the journalist's
"fifteen seconds at most", with the difference spent on the hold rather than on a faster reveal.

- `establish` — title, caveat and axis title. On screen from frame 0; the poster frame is never blank. Each region NAME arrives with its own bar, not here, because a name with no bar beside it is a promise the frame has not kept yet.
- `reference` — the zero line draws top to bottom. On a signed domain this is not furniture: it is
  the level every bar is read against, and the motion grammar puts the level down first.
- a gap — 18 frames, unnamed because nothing arrives in it, so the reader sees there is a line
  before anything grows out of it.
- `reveal` — the seven bars grow out of the line in the data's own order, largest gain to largest
  loss, staggered so each lands on its own.
- `subject` — Centre takes the accent, a ring and a bold label.
- `conclusion` — the national balance, −9 380, the one number no bar on screen shows.
- `hold` — 84 frames, 2.8 seconds of finished still picture.

## Data and colour

`data.csv` is a copy of the story's frozen `source/data.csv`, unmodified. Colours come from
`../../PALETTE.md` (`readPalette`, never a hex literal), the face from `../../TYPEFACE.md`
(`readTypeface`), and the credit line from `STORYBOARD.md`'s own `credit:` scalar through
`creditLine` — recorded as `unattributed`, so the artefact prints **"Source: not stated"** rather
than a plausible attribution nobody can check.

## Where this beat's files live, and why

`renders/` holds ONLY what the newsroom should receive — two mp4 files and the poster frame of
each. Everything else sits beside it: build input in `props/`, the alt text in `alt/`, and the
frames extracted from the mp4 to verify it in `frames/`. That split is not tidiness. The delivery
form this beat ships through copies the rendered-draft directory whole, with no filter, so anything
left in `renders/` reaches the newsroom — the first delivery of this beat handed them two JSON
build files and eight verification frames. The approval digest hashes exactly that directory, so
the split also means the bound review covers precisely the files that were delivered.
