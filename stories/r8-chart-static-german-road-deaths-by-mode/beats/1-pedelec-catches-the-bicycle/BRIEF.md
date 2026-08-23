---
size: landscape
type: line
---

# Beat 1 — The pedelec catches the bicycle

**Type:** line. **Medium / format:** chart / static. **Size: landscape (1920 × 1080).**
**Destination:** screen. **Producer:** custom.

## What this one visual has to prove

That the rise in German cyclist deaths is entirely a pedelec rise: 39 pedelec riders killed in
2014, 36 in 2015, 214 in 2025 — while deaths of riders of bicycles WITHOUT a motor fell from 357 to
248 over the same years, so the two series have almost converged.

## Evidence hierarchy

1. **The accented line.** Pedelec deaths, 39 → 214, the subject the journalist named. Its shape is
   the argument: it starts at the bottom of the frame and ends level with its own comparison.
2. **The muted line.** Riders of bicycles without a motor, 357 → 248. It is the comparison field,
   not a second subject — it is what the accent is measured against.
3. **The gap between the two end labels.** 34 deaths in 2025, from 318 in 2014.
4. **The stated start of both series.** The chart says on its own face that neither series exists
   before 2014, and why.

## Reveal order (a static frame still has one)

Title → the accented line climbing from the floor → the muted line coming down to meet it → the two
end labels → the note about 2014 → the source. Nothing else is on the canvas.

## The single accent

`#D4A853`, from `PALETTE.md`, on the pedelec line only, at 8.01:1 against `#16191B`. The bicycle
line is drawn in `muted`, derived from the ground, because it is the comparison field. Two accents
would say the two series are of equal standing, and the whole argument is that one of them is
closing on the other (`doctrine/references/anti-patterns.md`, "Accent colour on every mark").

## The series break, and why the chart starts in 2014

The frozen table carries THREE bicycle columns, and the split is in the column names:
`Getoetete_Fahrraeder_bis_2013` runs to 2013 and is a hyphen after that;
`Getoetete_Fahrraeder_ohne_Elektroantrieb_ab_2014` and `Getoetete_Pedelecs_ab_2014` run from 2014
and are hyphens before it. Drawing a single "bicycle" series across 2013/2014 would show a fall
from 354 to 357... which is not a fall at all, because the 2014 number no longer contains the
pedelecs the 2013 number did.

So the beat draws 2014–2025 and says so, rather than reaching back into a period where the question
it asks cannot be answered. `build-data.mjs` asserts the hyphens are where the column names say
they are and throws if the file ever changes under it.

## `framing-serves-the-point` — asked before the geometry was chosen

Will these values read against the extent they are drawn on?

- Combined extent 36 → 357, fitted and nicened to 0–400. The pedelec line therefore climbs from
  10% of the plot height to 54% of it, and the bicycle line falls from 89% to 62%. The two lines
  visibly converge inside the frame; the picture argues the sentence.
- `largestAgainstMedian` on the combined series is well under the 10× the discipline names as the
  outlier shape. No mark dwarfs the rest, so no panel split, no log axis and no disclosed break.
- The plain linear shape was kept, deliberately, and this paragraph is the record of the question
  having been asked.

## Source

Statistisches Bundesamt (Destatis), *Statistischer Bericht — Verkehrsunfälle Zeitreihen*, table
46241-11, *Getötete — nach Art der Verkehrsbeteiligung und Ortslage*. Table status 7 July 2026;
the workbook was downloaded 23 August 2026. The rows used are the ones the file labels
`Innerhalb und außerhalb von Ortschaften` — inside and outside built-up areas together.

## The anti-patterns of this case

- **A legend.** Two series, direct end labels, no legend. The reader never carries a colour across
  the frame.
- **Bridging the 2013/2014 break.** The chart does not start in 1979 and taper; it starts where the
  columns start, and the note says why.
- **Indexing.** An index to 2014 = 100 would make the pedelec line rise to 549 and flatten the
  bicycle line to a near-horizontal, which answers a different question from the one the takeaway
  asks — how many people, not how many times more.
- **Printing the 16.4%.** The takeaway carries Destatis's own April 2026 preliminary figure. The
  final July table gives 462 of 2 832, which is 16.3%. The chart prints neither: it prints the two
  series it draws, and the discrepancy is recorded in `STORYBOARD.md`'s `limits`.
- **Reading the rise as a rise in danger.** The statistic records no distance ridden, so nothing on
  this chart is a rate. The note does not claim one and the alt text does not either.
