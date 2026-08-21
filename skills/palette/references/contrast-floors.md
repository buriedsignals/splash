# Contrast floors — why 3:1 here and 4.5:1 there

`NON_TEXT_CONTRAST_MIN` is 3, not 4.5. That is not a relaxed standard; it is the correct one for
what the accent actually is. This file records the reasoning so nobody "fixes" it upward, and the
one case where nothing passes at all.

## The two success criteria, and which one the accent falls under

**WCAG 2.2 SC 1.4.3 Contrast (Minimum), Level AA — 4.5:1.** Governs **text**. Every word in a beat
is drawn in `ink` or `muted`, and both are derived from the ground by `deriveFurniture`, which
escalates until it clears 4.5:1. The words are already handled, on any ground, by a different
mechanism entirely.

**WCAG 2.2 SC 1.4.11 Non-text Contrast, Level AA — 3:1.** Governs the visual information required
to identify a **graphical object**. A chart's accent *is* that object: the line, the bar, the
highlighted circle. Its job is to be separable from the ground, not to be read as type.

Holding the accent to the text threshold would reject perfectly legible house colours for failing a
criterion they are not subject to — and the newsroom whose brand colour got rejected would have no
way to learn that the rule applied was the wrong one.

## Why a failing option is still shown

`proposePalette` scores every option and shows the ones that fail, marked as failing, rather than
dropping them. Two reasons:

- A journalist who does not see their house colour offered will assume the tool never read
  `NEWSROOM.md`. Seeing it offered and marked "2.1:1 — fails" tells them something true about their
  own brand against their own ground, which is worth knowing.
- The remedy is more useful beside the failing colour than instead of it. `adjustToContrast` walks
  the accent toward the pole the ground is not, in 2% steps, and reports the first step that
  passes. That result is offered as a **remedy**, never swapped in — because a colour silently
  substituted for the brand is a hex nobody chose sitting in a published chart, which is the exact
  failure this skill exists to prevent.

## The case where nothing passes — measured, not assumed

`adjustToContrast` returns `null` when no step clears the floor. **At the default 3:1 floor, that
never happens.** Swept over 4352 grounds — all 256 greys plus a 16-step RGB grid — there are zero
nulls at `min` 3, zero at 4.5, and the first at 5 (340 of them).

The hardest ground in that sweep is `#747474`, where the far pole lands at **3.0000809:1**. So the
mid-grey band is real — it is genuinely where the margin runs out — but it clears, and it clears by
construction rather than by luck: `towards` switches poles at relative luminance 0.18 precisely
because both poles clear 3:1 on either side of that crossover, so the walk always terminates in a
pass.

The `null` branch stays because `min` is a **parameter**. A caller raising the floor exhausts the
walk on real grounds, and "this ground leaves no room" is a more useful answer than a near-miss
dressed as a pass.

This paragraph previously asserted that the mid-grey band produced nulls at 3:1. It does not. The
claim was written by hand from the shape of the algorithm instead of measured — the same failure
mode that put a false assertion into twelve of this project's beats, arriving here in documentation
rather than in a chart title.

The same band is why `deriveFurniture`'s `ink` picks its pole by **measuring both**, rather than by
a luminance threshold: on `#808080`, the obvious "luminance > 0.5 means use black" rule chooses
white at 3.95:1 over black at 5.32:1. The band punishes reasoning and rewards measuring.

## What is not checked here

- **Accent against accent.** A single-accent proposal has nothing to separate from a second series;
  a categorical set is a different decision (see `subject-conventions.md`, last section).
- **Colour-vision deficiency.** 3:1 luminance separation helps but does not by itself guarantee two
  hues stay distinguishable under deuteranopia. Nothing in this skill proposes two hues at once, so
  the question does not arise yet — and when it does, it needs its own check rather than a wider
  contrast floor pretending to cover it.
- **The rendered chart.** This measures the two colours that were proposed. Whether the delivered
  PNG actually carries them is the render's business, and the reason `readPalette` throws instead of
  defaulting: a chart drawn in colours nobody chose would pass every check in this file.

## The floor is measured against a GROUND, and the ground is a property of the SURFACE

Every ratio in this file is a ratio *against something*. Until round six, the something was always
the one ground `NEWSROOM.md` records — and a newsroom records the ground of its own **screen**.

**Beat AD, measured.** `stress-ad-polish-hospital-beds` delivered a static frame **to print**: the
article's own last line asked for one (*"Potrzebujemy jednego wykresu statycznego, po polsku, do
druku."*) and gate 2b recorded it. `proposePalette` offered the house colours on `#16191B` and
recommended the primary `#D4A853` at **8.01:1**. On the sheet that beat was going onto:

    #D4A853 on #FFFFFF   2.20:1   BELOW the 3:1 non-text floor
    #5B8A8A on #FFFFFF   3.86:1   clears it
    #B28D46 on #FFFFFF   3.09:1   adjustToContrast("#D4A853", "#FFFFFF", 3)

Nothing anywhere objected. The recommended ground was a full-bleed flood of near-black ink across a
printed page, and the recommended accent was invisible on paper. The journalist re-measured all
three by hand and answered through the escape, which is why that story records `origin: journalist`
for a pair of the newsroom's own colours.

**What changed.** `proposePalette` takes a `surface`. `SURFACES.print.groundIs` returns
`PAPER_GROUND` (`#FFFFFF`) whatever `NEWSROOM.md` records, so every accent is scored where it will
actually be read; run against the real profile with `surface: "print"`, the proposal now produces
exactly the three numbers above on its own and recommends `house-2` — the accent that story had to
find by hand — with `#b28d46` offered beside the failing primary as its remedy.

`#FFFFFF` is unprinted white, which is the **brightest** a sheet gets. That makes it the worst case
for a light accent and the most forgiving one for a dark accent: an accent that misses the floor on
this ground misses it on every stock, and one that clears it here may still be tight on newsprint.
Stated as a limit rather than hidden, because it is the direction a reader would guess wrong.

**An unstated surface is not a screen.** It is a measurement that was never made, and it is named
in `surfaceLimit` and printed by `formatProposal`, the same policy `proposeTypeface`'s `sampleLimit`
follows. The surface is settled at gate 2b — the format question — before a single colour is
recorded, so this is never information the journalist does not already have.
