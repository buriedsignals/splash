# Information is Beautiful — "Movies Critics Loved, But Audiences Really Didn't"

- url: https://informationisbeautiful.net/visualizations/star-wars-last-jedi-one-of-the-biggest-rotten-tomatoes-audience-vs-critics-score-splits-ever/
- archive: informationisbeautiful
- type: bubble chart on a dark ground — one quantitative axis, one **time** axis, area and colour
  channels
- export: web
- readAs: the interactive as the page serves it, in the page screenshot, at rest

**At the edge of this family, and it is filed saying so.** The y axis is release year — a time
axis — so by the family's own definition (two quantitative axes, no time axis) this is not a
scatter. It is filed for two things that do not depend on the y axis at all: the **verbal pole
label** on the x axis, and the only **measured dark ground** in this harvest. Nothing below leans on
the y axis being quantitative.


> **Also filed under `paired`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

Films plotted on **x = the percentage gap between the audience and critics' Rotten Tomatoes
scores** (16 % → 40 %) against **y = release year** (2007 → 2017), **area = budget**, **fill = a
categorical set**, on a near-black plate.

## What it does with information

**The x axis ends in words, not a number.** Past its last tick (`40%`) the axis carries
`AUDIENCE REALLY HATES` in small tracked capitals — a label that says what the far end of the scale
*means*. The reader gets the unit at the ticks and the direction at the pole. The same instinct as
*Hollywood Hits & Flops*'s `WORTH WATCHING>>>` chip and *The MicrobeScope*'s deadliness gloss, all
three at this one desk.

**The subject is ringed and given a leader and a sentence.** `The Last Jedi` — the film the piece is
named for — is the only mark drawn as an open ring rather than a filled disc, and a curved dashed
leader carries from it to a four-line annotation at the top right:
*"biggest budget movie with the most dramatic split between critics & audience opinion"*. The
argument is drawn, not left to the title. And the accent that marks it is a **stroke**, so the fill
channel keeps carrying its category.

**A size key with a name and no numbers.** One outlined ring, top right, captioned `BUDGET` in small
tracked capitals. It says the channel exists and what it carries, and claims nothing about how much.

**Every mark is labelled directly beneath itself, in the mark's own colour**, at several dozen
marks, with no legend anywhere.

**The x axis is drawn twice — once with an arrowhead at the top of the plot, once with its ticks at
the bottom.** The top rule is bare and directional; the bottom rule carries `16%`, `28%`, `40%` and
the pole label. Direction at the head of the reading, values at its foot.

**The title splits by ink on one line**: `Movies Critics Loved,` in white, `But Audiences Really
Didn't` in grey, both at one size — the third IIB record in this harvest to do exactly that.

## What it does with style

**Contaminated `measured.json` palette** — same mechanism as the sibling IIB records. Re-measured on
the plate alone (`crop 0,160,1440,740`):

- ground **`#333333` at 91.6 %** — a dark neutral, not black, with `#3B3B3B` at 1.1 % and `#434343`
  at 0.4 % as the plate's own gridline steps.
- palette **categorical, 3 hue clusters**: 50° (16 buckets, 1.5 % of the ink), 105° (1 bucket,
  0.35 %), 187° (6 buckets, 0.29 %). Largest chromatic buckets `#FFD300` 0.68 %, `#F7931E` 0.36 %,
  `#8CF968` 0.35 %, `#0CDBF8` 0.16 %, `#D48CE5` 0.12 %.
- furniture is `#ABABAB` at 0.26 % — mid grey for the axis, white for the title.

**This is the corpus's first measured dark ground.** The spec (§7) records `nocturne`
(`#111044` / `#4FE0C0`) as *not* cleared because it has never been measured. `#333333` at 91.6 %
with saturated yellow, green and cyan marks at very low coverage is a dark direction taken off a
published page rather than invented, and it is offered as such in
`docs/design-base/proposals/scatter.md`.

## What is transferable

- **Name the far end of an axis in words**, past its last tick, when the axis measures something
  whose extreme has a meaning.
- **Ring the subject and give it one sentence on a leader**; keep the fill channel for category.
- **A size key may name its channel without quantifying it**, and should say so by carrying no
  numbers rather than fake ones.
- **Two rules for one axis: direction at the head, values at the foot.**
- **A dark ground works for a bubble chart** when the marks are saturated and cover very little of
  the plate: 91.6 % of this plate is ground and the three hue clusters together are under 2 % of it.

## What is this piece's own

The `#333333` plate with the pure `#FFD300` / `#8CF968` / `#0CDBF8` set is a strong, dated look; the
film titles; the y axis being time.

## What was not verified

- **The y axis is time**, and this record evidences nothing about a scatter's second quantitative
  axis.
- **What the fill categories are.** The plate carries no colour key in the captured region and none
  was found; the categorical reading is from the pixels alone.
- **Contrast.** Nothing on this ground has been run through the contrast gate; the yellow and cyan
  on `#333333` will pass easily, the mid grey furniture at `#ABABAB` was not measured.
- Below the 1440 × 900 fold; the source line and any note on the score data were not read.
- No type measurement: raster plate, style route reached only the site's own type. The register
  sizes offered in the proposal for a `nocturne-mesuré` direction are therefore **read by eye and
  labelled as such**, never quoted as measurements.
