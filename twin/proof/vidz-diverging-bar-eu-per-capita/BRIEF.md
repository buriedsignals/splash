# Beat — Croatia is the only EU country emitting more CO₂ per person than in 1990

**Proves:** of the 27 EU member states, exactly one emits more CO₂ per person in 2024 than it did in
1990 — Croatia, by 0.03 tonnes (4.73 → 4.76). The other 26 all emit less, by 4.93 tonnes per person
on average, and Luxembourg by 20.48, the largest fall in the union.

**Medium / genre:** chart / video. **Type:** diverging bar — one row per country, signed values
growing left and right out of a zero line, rows sorted from the largest rise to the largest fall.
**No genre in this corpus had a diverging bar before this beat**: it is a new row in the type × genre
matrix, the deviation family's first appearance, not a video sibling of an existing beat.

**Frame:** 1080 × 1350, portrait. Twenty-seven rows in a 1080 × 1080 square would leave each row
24px to hold a country name and a bar.

## Data

- Source: Global Carbon Budget (2025); population based on various sources (2024) – with major
  processing by Our World in Data, indicator `co-emissions-per-capita`. Citation string taken from
  the indicator's own metadata endpoint.
- Fetched: `https://ourworldindata.org/grapher/co-emissions-per-capita.csv?csvType=filtered` with
  `&country=` set to the 27 EU member states' ISO codes (AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU
  GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE). The filter was verified
  effective — the response holds exactly 27 distinct entities, not the full ~200-country set, which
  is the OWID CSV filter trap this corpus has been caught by before.
- `data.csv`: 4,356 data rows, the full time series for those 27 countries, frozen unedited.
  `render.mjs` reads the two years it needs out of it.
- Unit: tonnes of CO₂ per person, fossil fuels and industry only.

## Exact values — computed from `data.csv` (change in tonnes per person, 1990 → 2024)

| | Country | 1990 | 2024 | Change |
| --- | --- | --- | --- | --- |
| ▲ | **Croatia** | 4.73 | 4.76 | **+0.03** |
| ▼ | Cyprus | 5.90 | 5.37 | −0.52 |
| ▼ | … 24 more … | | | |
| ▼ | Estonia | 23.50 | 6.11 | −17.40 |
| ▼ | Luxembourg | 30.94 | 10.46 | −20.48 |

Rose: 1. Fell: 26. Mean of the falls: −4.9281. Largest fall: Luxembourg, −20.4781.

**"The only" is the fragile kind of claim**, so `render.mjs` asserts every part of it and throws
rather than shipping it stale: that all 27 member states have a reading in both years (a partial
field cannot support "the only EU country"), that exactly one rose, and that the remaining 26 all
fell with none exactly flat. The subject, the caveat's numbers, the average, the largest fall and
the whole alt text are derived from the same computation — nothing in the rendered output is typed.

**And the margin is stated, not buried.** Croatia's rise is 0.03 tonnes on a base of 4.73. A
headline that says "the only country" about a 0.6% change owes the reader the size of it, so the
rendered caveat gives both readings and calls the rise small.

## The motion problem

The finding is a **sign**, not a size — which side of zero each row lands on. So the zero line is
laid down first, as its own event, and left to be read; every bar then grows out of it. A bar that
faded in at final length would show its sign without ever showing it being taken, which is the one
thing motion adds to this type.

The conclusion is the only part that needs arithmetic — the mean of the 26 falls — and it arrives as
a rule descending at that value with its own label, after every bar it averages is on screen.

## Anti-patterns for this case

- **The domain genuinely straddles zero**, and the component throws if it ever stops doing so: a
  diverging bar drawn on a one-signed domain is a plain bar chart with a decorative complication,
  and the type sheet says exactly that.
- **The domain is not made symmetric.** Mirroring a −20.5 fall with a +20.5 half nobody occupies
  would halve the pixels per tonne on both sides to make room for nothing. Equal units per pixel
  either side of zero is what makes two bars comparable, and that is what is preserved. The visible
  asymmetry is the data's.
- **The zero line is drawn on top of the bars**, so no fill can cover it — the sheet's own
  requirement, and the reason it is not painted before them.
- **Value labels ride the growing end from the first third of the bar's growth**, and print the
  length currently drawn rather than the value being headed for. The sheet records the opposite gate
  — a label tied to the last slice of growth — as a shipped defect on this exact type, which "left
  the last-staggered bars in a video build completely unlabelled at the exact moment a viewer paused
  to read one."
- **Every value label is signed explicitly**, with U+2212 rather than a hyphen, and stays in page
  ink. A label in the bar's own fill is this family's named WCAG failure.
- **Rows are sorted by value, descending**, so the one rise sits at the top and the deepest falls
  sit together at the bottom.
- **Two fills, one per sign — and the second one is not an invented hue.** The recorded palette
  carries one accent, so the positive fill is that accent and the negative fill is the furniture's
  own `muted`, derived from the ground. See `PALETTE.md`. The consequence, written down because it
  breaks a habit this corpus otherwise holds: on this type colour encodes the SIGN, so the accent is
  spent when the positive bar arrives and cannot also be held back to mark the subject. The subject
  event is a wash, a ring and a bold label instead of a recolour.

## Verification

Rendered still first (`--still-only`), then the mp4; frames 0, 20, 60, 120, 189, 200, 215, 240, 270
and 299 extracted from `diverging.mp4` with ffmpeg and looked at. Frame 120 shows the cascade
mid-run with France's bar at −2.46 on its way to −2.96 and its label reading −2.46, which is the
label-honesty rule working; frame 215 shows the subject picked out and the average rule descending
with the sentence not yet in.

Four collisions were found by looking at renders and fixed at the layout, never by nudging a
constant:

1. The axis title overprinted the second line of the caveat — the three header blocks now clear each
   other by measured amounts.
2. `Luxembo—20.48`: the longest bar's value label ran into its own country name, because country
   names were drawn 12px off the plot edge instead of inside their own gutter, which sits to the
   left of the value gutter.
3. **The conclusion's dashed rule struck clean through four value labels** — at −4.93 it crossed
   "−3.94", "−4.01" and "−4.09", and turned the minus of "−3.39" into what read as a plus. Fixed by
   drawing the value labels after both rules and giving each a ground-coloured halo
   (`paint-order: stroke`), so a label stays readable wherever it crosses a line. This one is a
   claim defect, not a cosmetic one: a reader would have read Malta as having *risen*.
4. Croatia's ring overlapped its own value label; the label now starts outside the ring.

Frame 0 carries the title, source and caveat at full opacity — see
`vidz-bar-column-top-emitters/BRIEF.md` for the measurement behind that and the corpus-wide
blank-poster-frame finding.

## Source line

`Source: Global Carbon Budget (2025); population based on various sources (2024) – with major processing by Our World in Data · fossil fuels and industry only`

## Alt text

Computed by `render.mjs` and written to `ALT.txt` beside the render.
