---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#C68900"
origin: journalist
---

The answer recorded for this beat: a bespoke pair the journalist chose, kept over the house teal.
They are recorded in the order the legend states them and the groups draw them: `accent` is WIND,
`accents` holds SOLAR. `seriesInks(palette, 2)` returns exactly these two, in that order.

Why two recorded accents rather than one plus a derived shade. This chart's own legend comment gives
the argument: colour is the ONLY cue tying a bar in the sixth group back to "wind" or "solar", and
the annotation naming the subject is ink rather than a third hue, so the whole colour budget is the
two series. Two shades walked off one accent differ only in lightness, which on a grouped bar reads
as emphasis rather than as membership. Two hues that hold apart under every colour-vision deficiency
is what the type needs.

`palette`'s subject option was checked and NOT taken. `matchConvention` would fire on
`renewables` for this beat's subject — but it proposes ONE accent, and both series here ARE
renewables (wind and solar), so a single renewables green cannot separate the two things this chart
exists to compare. The recorded pair stands.

**One colour moved, and the move is the finding.** The solar series was drawn in Okabe-Ito orange
`#E69F00`. Measured against this beat's own white ground it is **2.25:1** — under the 3:1 floor
WCAG 2.2 SC 1.4.11 sets for a graphical object a reader identifies the data by. That is not a
threshold this migration invented: `parsePalette` measures every recorded accent against the ground
and refuses one that fails, and it refused this one. Recorded instead is the variant the refusal
itself named — `#c68900`, written here as `#C68900`, at **3.01:1** — which `adjustToContrast`
derives from `#E69F00` by walking it toward the ground's opposite pole in 2% steps and stopping at
the first step that clears. Nobody invented it; it is the beat's own colour, darkened until a reader
can see it. The floor was not lowered and the beat was not exempted.

**This moves the render**, and it is the only beat in the chart-web format where it does. The solar
bars, the solar legend swatch and the `--accent` custom property all go from `#E69F00` to `#C68900`:
the same hue, visibly darker, against an unchanged white ground and unchanged blue wind bars. No
geometry, no text and no layout changes — the before and after HTML differ only in that hex.

Measured against this ground: `#0072B2` 5.19:1 and `#C68900` 3.01:1, both clear of the 3:1 non-text
floor (WCAG 2.2 SC 1.4.11).

`render-web.mjs` beside this file reads all three values with `readPalette` and names no hex of its
own; `GroupedBarWeb.tsx` takes the pair as the `colours` prop.
