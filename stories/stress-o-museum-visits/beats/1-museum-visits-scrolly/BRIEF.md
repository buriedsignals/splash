# Beat — Museum visits rose every year, then a partial reading arrived

**Type:** column chart, stepped. **Medium/format:** scrolly (`splash:scrolly`). **Channel:**
article web, one self-contained `render/museum-visits-scrolly.html`, **5 steps**.

## The trap this beat was built to name

The frozen article states plainly that the last of its five periods, "2026 (Jan-Mar)," is a
partial reading (`complete = no` in `source/data.csv`) while the four before it are full years.
Unlike `stress-j-partial-year-permits`, this article does not misframe the partial figure — it
says so in its own second sentence. The trap here is structural, not editorial: **a scrolly ends
on its last panel**, so whatever the fifth step shows is the last thing the reader sees before
they stop scrolling. A naive step-through that drew a fifth, much shorter column (118,000 against
four columns running 412,000-501,000) would manufacture a visual "collapse" the article's own
prose explicitly denies, purely as an artefact of the vehicle's own mechanism — the reader would
leave with the picture, not the caption.

## The decision about the last step

**The fifth step never draws a fifth bar.** Steps 1-4 build the honest trend — one column per
complete year, added one at a time, the y-axis fixed at a ceiling derived from the four complete
years so nothing rescales as the reader scrolls. The fifth category slot (2026) is reserved in
the layout from the very first step (so the axis never shifts when it is finally used) but stays
empty of any mark through steps 1-4. On step 5, that slot gets a **text-only disclosure** — value,
period, and "not a full year, not plotted" — with no bar, no height comparison, nothing a reader
could read as a fifth data point comparable to the other four. The reader's own prose for step 5
says this directly: "it is not shown as a bar beside the four above, because it is not one." This
is the same decision `stress-j-partial-year-permits` makes (disclose, do not plot on the
comparable scale), carried into a vehicle where the stakes of getting the LAST thing shown wrong
are higher, because there is no step 6 to correct it.

## Friction with `scrolly/SKILL.md`'s own doctrine — recorded, not resolved

The skill's own "When to use" section says: **"if every step would show the same chart, do not
reach for this skill — animate the beat instead. A vehicle earns its existence only by carrying
different media."** `proof/scrolly-chart-eu-carbon` states the rule even more sharply in its own
`BRIEF.md`: *"if this beat's four steps had been one line chart revealing a decade at a time, it
would belong in `chart-web` or `chart-beat`, animated."*

This beat's five steps are exactly that shape — one column chart, five reveal-states, no second
medium. The frozen source for this story is a five-row time series with nothing else to assemble
behind it: no photograph, no map, no second dataset. By the skill's own test, this story does not
earn the scroll vehicle.

It was built as a scrolly anyway, because that is what was assigned. The mismatch is reported
here rather than silently resolved by reaching for `chart-web` or `chart-video` instead, or by
inventing a second medium (a map of the museum, a photograph) the frozen source does not supply —
either of those would have been a quiet workaround of the doctrine's own refusal, not an honest
build of what was asked for.

`proof/scrolly-one-chart-swiss-life-expectancy` is the sibling that earns "one chart, several
readings" as a scrolly legitimately: its steps do not swap discrete pictures, they interrogate the
SAME picture continuously, with a `data-progress`-driven `stateAt` interpolating every frame's
geometry between authored states (`chart-drive.mjs`). This beat does not implement that — it
swaps five discrete static frames at step boundaries, the simpler shape the base `renderScrolly`
scaffold and the skill's own worked SEED both support directly. A fully doctrine-compliant version
of this beat, if the shape were kept as a scrolly at all, would need that continuous-drive
machinery; that is named here as the gap, not built.

## Verification

`bun skills/scrolly/scripts/verify-scrolly.mjs <file> --width=<1600|1280|375>`: **0 failures** at
all three widths. Notes (not failures) report the card crossing an x-axis label on 85/305 sampled
frames at 1600px and similar at the other widths — an accepted cost of this vehicle
(`scrolly-discipline.md`: "no band can be reserved... the card crosses every row equally often"),
not something this beat's own layout could avoid.

Screenshots taken at the scrollY closest to each step's `data-progress` integer, both directions,
1600x900 — `render/shots/step-1.png` … `step-5.png`. Step 5 is the one that matters: four intact
columns (412,000 → 501,000) and a text-only note in the fifth slot, no fifth bar.

## `framing-serves-the-point`

`render.mjs` calls `framingMeasurement` on the four complete years and prints it before drawing.
Read on the plotted values only — the partial reading is never part of this reading, the same
scope decision as `stress-j-partial-year-permits`.

## Source

National Museum, official visit counts, frozen `source/data.csv`. `complete` column recorded by
the beat's own data layer; the 2026 reading's effective date is the ministry's own early release
as of the CSV freeze.
