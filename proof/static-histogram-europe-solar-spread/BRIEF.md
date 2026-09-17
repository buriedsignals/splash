---
size: landscape
format: static
medium: chart
type: histogram
grounding: supported
derived: v1
---

# Beat — 8 in 10 European countries generated under 10 TWh of solar power in 2024

**Type:** histogram. **Medium/format:** chart / **static**. **Size:** landscape (`sizeFor`, `scripts/sizes.mjs`).

How unevenly Europe's solar electricity generation was spread across countries in 2024
(`data.csv`, Ember via Our World in Data). 32 of 41 countries generated under 10 TWh of solar power;
the top 5 (Germany 74.1, Spain 58.3, Italy 36.0, Turkey 25.7, France 24.9 TWh) produced 61% of the
continent's total. Every number is derived from the rows and asserted in `render-directions.mjs`,
never typed.

## The choreography

<!-- THE FRAME THIS TYPE SUPPLIES. The choreography itself is yours, written from the subject.
     A static frame is choreographed IN SPACE, not in time, and it is never "none": where the
     eye enters, the sequence the marks and annotations lead it through, what is subordinate
     to what, and at which station the claim lands. The stations: establish → reference → reveal → subject → conclusion.
  gestures this type records (the list is OPEN — add to the sheet):
  Enter at
  Then
  Then
  Subordinate
  The claim lands on
  a choreography of this type must NOT:
  no-accent-thing-claim — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
  no-send-reader-legend — send the reader to a legend for a reading a direct label could carry at the mark itself
  no-give-furniture-colour — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
  no-accent-bar — accent a bar: the bars are the distribution and the accent belongs to the reference line, not to the bars' own fill repeated as a second signal
  no-choose-bin-width — choose a bin width that puts the counted threshold inside a bar — the accent would then claim a bin the claim does not count
  no-pick-bin-width — pick a bin width by eye: it can manufacture or erase a peak that is not a property of the data at all
  worked example: `proof/static-carbon-footprint-spread` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedHistogram.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type histogram --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
-->

**The eye enters at** `bars`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | bars | — |
| reference | threshold line | bars |
| subject | share annotation | threshold line |

This beat's code was scaffolded `--from proof/static-carbon-footprint-spread` and adapted for solar
generation across 41 European countries instead of CO2 per capita across 213.

```json splash:choreography
{
  "kind": "frame",
  "entry": "bars",
  "stations": [
    {
      "station": "establish",
      "carries": "bars",
      "subordinateTo": null
    },
    {
      "station": "reference",
      "carries": "threshold line",
      "subordinateTo": "bars"
    },
    {
      "station": "subject",
      "carries": "share annotation",
      "subordinateTo": "threshold line"
    }
  ],
  "claimLands": "subject"
}
```


## Precision

<!-- WHAT THE CHAIN REQUIRES OF THIS BEAT. Each line is a requirement, not an answer: which
     number satisfies it, at what rounding and in what unit, is read off this beat's own
     frozen data and written below by you.

  every observation falls in exactly one bin and the counts sum to the asserted total  (type-sheet)
  one count scale from zero  (type-sheet)
  the bin width is chosen by a stated rule against the type's floor and ceiling, and the share under the threshold is asserted  (type-sheet)
  asserted-in-the-one-frame  (format)
-->

- **Every observation lands in exactly one bin.** `render-directions.mjs` sums the eight bins'
  counts and throws if the total does not equal the 41 rows read from `data.csv`.
- **The count axis starts at zero.** The y-axis in `DirectedSolarSpreadHistogram.tsx` runs 0-35;
  no bar's height is a lie about how many countries fell there.
- **The bin width is a stated rule, and the share under the threshold is asserted.** 10 TWh bins
  (range 0-74.1 TWh over 8 bins, close to the type sheet's ten-bin default); `THRESHOLD = 10` is
  checked at scaffold time to land on a bin edge (`THRESHOLD % BIN_WIDTH === 0`), and the share
  (32/41 = 78%) is computed from `facts.shareBelowThreshold`, never typed.
- **Asserted in the one frame.** The 32-of-41 figure is both the accented on-plate annotation and
  the title's own number — the same computed value, not two.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "every-observation-lands-in-exactly-one",
    "the-count-axis-starts-at-zero",
    "the-bin-width-is-a-stated",
    "asserted-in-the-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": null,
    "every-observation-falls-in-exactly-one": null,
    "one-count-scale-from-zero": null,
    "the-bin-width-is-chosen-by": null,
    "asserted-in-the-one-frame": null
  }
}
```


## The owner's rules — checked before the render

- [x] Every number the plate shows is reproducible from the beat's own frozen data, or carries a written
      `grounded-by-hand` reason.
- [x] Every colour derives from the direction's own three; no hue is imported from a reference, a brand or a
      habit.
- [x] ONE art direction, composed from this beat's own PALETTE.md and text — never the three filed demo
      directions, except for a catalogue proof (`--filed`).
- [x] The alt text (`role="img" aria-label`) says what the plate shows, not that it is a chart.

## Direction

One — the composer's best candidate for this beat's own PALETTE.md and text (`render-directions.mjs`):
`renders/<id>.png` + `.svg`. `--filed` renders `creme`, `nocturne`, `rapport` instead, for a catalogue proof.
