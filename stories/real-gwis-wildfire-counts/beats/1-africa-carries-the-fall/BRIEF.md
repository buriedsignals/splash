# Beat 1 — Africa carries the fall

**Medium / format / size:** chart / static / landscape · **Producer:** custom

## What this one visual has to prove

That the world's recorded wildfire count has fallen by nearly half since it peaked in 2015, and
that Africa — about two thirds of the total — carries most of that fall.

## Evidence hierarchy

1. **The top edge of the stack.** It is the world total, and it is the falling line the takeaway's
   second clause is about. 1,148,499 in 2015 → 626,326 in 2025.
2. **The bottom band.** Africa, on the only flat baseline in the chart, 610,110 → 406,220.
3. **The five bands between them.** Context, not argument. Each carries its 2025 value at the right
   edge so a squeezed band is still readable as a number.
4. **The stated end of the series.** The chart says on its own face that it stops at 2025 and why.

## Reveal order (a static frame still has one)

Title → the falling roof of the stack → the accented floor → the band labels at the right edge →
the note about 2026 → the source. Nothing else is on the canvas.

## The single accent

`#D4A853`, from `PALETTE.md`, on Africa only. The other five bands are a graded neutral ramp
derived from the ground, each step further toward the ink pole. Six accents would be no accent
(`doctrine/references/anti-patterns.md`, "Accent colour on every mark").

## Source

Global Wildfire Information System (2026), with minor processing by Our World in Data. As of
21 August 2026 — the dataset's own last update, not today's date.

## `framing-serves-the-point` — asked before the geometry was chosen

Will these values read against the extent they are drawn on?

- **The fall.** 626,326 against a 0–1,148,499 axis is 55% of the frame height, down from 100%.
  Not a sliver: the roof visibly drops by nearly half the plot. The picture argues the sentence.
- **The compressed bands.** Europe is 2.9% of the 2025 total and draws about 12 px in a 900 px
  plot. Kept, with its own number printed outside the band, which is the remedy
  `static-discipline.md` names for a mark too small to read — not a broken axis, not a log scale,
  neither of which a length/area encoding can take.
- **The band order was chosen, not defaulted.** Largest at the bottom is also the subject at the
  bottom here, which is a coincidence worth stating: had the subject been Europe, Europe would
  have gone on the floor and Africa above it, because the area sheet says the bottom band is the
  only one a reader can read directly and this chart's argument is about the subject.

## The anti-patterns this case invites

- **Drawing 2026.** The file carries it and the year is eight months long. Excluded, and the
  exclusion is printed on the chart, not buried in a caption.
- **Treating `World` as a country.** The entity column mixes nine aggregates in with 251 countries.
  `build-data.mjs` asserts that the six bands sum to the file's own `World` row in every year and
  throws otherwise, so the partition claim is tested rather than assumed.
- **Reading a count as harm.** The quoted explainer is about deaths, evacuations and burned area.
  This column is a count of detected fire events, most of Africa's being seasonal savanna burning.
  The limits line says so and the title does not use the word "worst".
- **Band labels in the band's own fill.** Refused: labels are drawn in the page's ink
  (`types/area.md`, and the six times this defect shipped before, in `visual-system.md`).
- **A fixed right gutter.** Refused: the gutter is `measureText` of the widest label-plus-value
  actually about to be drawn. "South America 67,532" is the string that decides it, not "Europe".

## What the render changed, cycle by cycle

**Cycle 1 → 2, the title had drifted.** The first render's title read *"…and Africa carries most of
the fall"*. That is TRUE — Africa is 283,431 of the world's 522,173 fewer fires between the 2015
peak and 2025, 54.3% — and it is not a clause of the confirmed takeaway, which claims the SHARE
(about two thirds) and the FALL (nearly half), not Africa's share of the fall. A title asserting a
third thing is exactly the drift the confirmed takeaway exists to make detectable, so the title now
tracks the takeaway clause for clause and the 54.3% is recorded here, where a supporting
measurement belongs. `slot.proves` in `STORYBOARD.md` was corrected the same way.

**Cycle 1 → 2, the last year was not on the frame.** The x ticks are derived (`tickStep`, a two-year
interval on a fourteen-year span) and land on even years, so the axis stopped at 2024 while the
stack ran to 2025. An irregular extra tick would break the regular grid a reader locates an
un-ticked point against, so the period is stated in the note instead: *"2012 to 2025"*.

## The callout that could not be drawn, and what replaced it

The first composition put a two-line callout — *"Down 45% from the 2015 peak"* — in the empty ground
above the stack's falling roof. The component's own measurement refused it twice: once because the
block was 49 px wider than the room left of the plot's right edge, and once because the roof at 2019
rises to within 29 px of the block's foot. Both refusals are right: the roof only leaves usable
empty ground after 2022, and 2022-2025 is 260 px of a 1,130 px plot.

So the callout was replaced by two DIRECT labels, which is what the doctrine prefers anyway: the
peak's own value beside its own dot (anchored to the left, because the headroom above the roof at
its highest point is 4% of the plot), and the world total as the seventh row of the right gutter,
labelling the top edge where it ends. Both are measured against the marks they could cross and both
throw rather than draw over the stack.

## What the palette mechanism could not answer

`proposePalette` offers a ground and the newsroom's recorded accents. `NEWSROOM.md` records two.
This beat draws six bands. `seriesInks` would have derived four more shades of those two accents,
which is right for a beat whose series are data of equal standing and wrong here: five of these
six bands exist to be compared against the sixth. The comparison ramp is derived in this component
instead, walking from the ground toward the ink pole in two-hundredths and keeping only steps that
clear the 3:1 non-text floor against the real ground AND read apart from the band they touch. It
refuses rather than defaults: on a mid-grey ground it runs out at two of five and says so.
