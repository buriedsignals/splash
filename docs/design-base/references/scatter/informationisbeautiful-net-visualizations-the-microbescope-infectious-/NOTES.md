# Information is Beautiful — "The MicrobeScope"

- url: https://informationisbeautiful.net/visualizations/the-microbescope-infectious-diseases-in-context/
- archive: informationisbeautiful
- type: scatter — two quantitative axes, shape and colour channels, a verbal second scale
- export: web
- readAs: the piece's own graphic element (`graphic.png`), **behind a welcome overlay that dims the
  whole plate**

**THIS RECORD'S COLOUR IS NOT USABLE, AND THIS IS THE FIRST THING TO SAY ABOUT IT.**
The piece opens on a modal — *"Welcome to the MicrobeScope. Hover over diseases to find out more
about them, or click on the stories below to watch them unfold."* with a `Get started!` button — and
the modal dims everything behind it. Both routes reported `ok`. The pixel route's `ground`
`#FCFCFC` at 92.0 % and its largest chromatic bucket `#37BC9B` at 0.44 % are the **dimmed** plate
and the **modal's own green button**; they are not this piece's palette. It was re-harvested once
and the modal appeared again, so it is the piece's own first-run state rather than an intermittent
marketing banner. Filed with the limitation stated, following `METHOD.md` correction 5's precedent,
and **no colour claim is made from it**. The structure below is read from the pixels, which the
dimming leaves legible.

## What it is

Infectious diseases plotted on **y = deadliness** (fatality rate, 0 % → 100 %, on a scale that
compresses below 1 %) against an **x axis of infectiousness** running along the bottom, with **mark
shape = microbe type** and **mark colour = primary transmission method**.

## What it does with information

**A second, verbal scale runs down the opposite edge of the plot.** At the right-hand margin, at the
heights they apply to, sit glosses in two tiers: `extremely deadly` / `death likely` near 100 %;
`deadly` / `high chance of death` near 40 %; `quite deadly` / `unlucky or unhealthy` near 10 %;
`less deadly` / `high-risk groups (infants, the aged)` near 0.1 %. The left edge measures; the right
edge interprets. On a scale where the numbers are unintuitive — is 40 % fatality a lot? — the second
scale is doing the work the first cannot.

**The axis's variable is a control, and its plain-English name sits beside it.** Top-left:
`DEADLINESS` in a dropdown pill in tracked capitals, with `Fatality rate` in mixed case immediately
to its right. The thing you can change, and the thing it actually measures.

**Every point label carries a qualifier line beneath it, smaller and lighter.**
`Pneumonic Plague / untreated`, `Leishmaniasis / visceral, untreated`, `Tuberculosis / untreated`
against a second `Tuberculosis / treated` twenty percentage points lower, `SARS-CoV-2 /
alt. hi-end estimate`, `Dengue fever / untreated` against a second `Dengue fever` at the foot. The
qualifier is what makes two marks with the same name legitimately different points rather than a
contradiction — and it is exactly the field a chart usually loses.

**Shape and colour carry different variables and are keyed differently.** The shape key is
glyph-then-word inline (`• virus`, `♦ bacterium`, `▲ parasite`) under the tracked-capital heading
`MICROBE TYPE`; the colour key under `PRIMARY TRANSMISSION METHOD` is a row of **words each set in
its own colour with no swatch** (`airborne`, `bites`, `body fluids`, `faecal-oral`, `food`,
`sexual`). The same swatchless coloured-word key *Best in Show* uses for its kennel groups — twice
at this desk, so it is a house habit rather than a one-off, and still one publication.

## What it does with style

**Not measurable from this record.** See the note at the head. What can be said from the structure
alone: the plate is light, the furniture is dotted gridlines with no spines, and the two label
systems (the point's name and the axis's gloss) are separated by size and weight rather than by
colour.

## What is transferable

- **A second, verbal scale on the opposite margin**, glossing what the numbers mean, on any axis
  whose values a reader cannot calibrate from experience.
- **A qualifier line under the point label**, smaller and lighter, so the same entity can appear
  more than once honestly.
- **Name the measured variable in plain words beside the control that selects it.**
- **Key shape with glyph-then-word; key colour with coloured words and no swatch.**

## What is this piece's own

The disease set, and the specific gloss wording.

## What was not verified

- **All colour.** Stated above and worth repeating: the palette in `measured.json` is a dimmed plate
  plus a modal button.
- **The x axis's own name and ticks.** Numbers are visible along the bottom edge (`2 … 18`) but the
  axis title was not legible in the capture; "infectiousness" is the piece's known subject, not a
  measured reading, and nothing above depends on it.
- **Whether the y scale is logarithmic.** The tick sequence
  (`100, 90, 80 … 20, 10, 1, 0.1, 0`) is linear at the top and compressed at the bottom, which is
  neither plainly linear nor plainly log; it was not resolved.
- Hover states, which is where most of this piece's information lives.
