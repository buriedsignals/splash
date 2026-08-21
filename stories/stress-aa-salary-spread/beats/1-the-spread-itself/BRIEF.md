---
size: landscape
type: histogram
---

# Beat 1 — Half this payroll earns less than 31 420 €, and the average is not where the people are

**Type:** histogram. **Medium/format:** chart / static. **Size: landscape (1920 × 1080).**
Slot 1 of `STORYBOARD.md`.

The size in the front matter is the one that counts: `render.mjs` reads it with `readPinnedSize`
and the delivered PNG is measured back from its own bytes.

## Claim

Of the 240 employees in the frozen table, 234 reported an annual salary. Their median is
31 420 € and their mean is 36 516 €: the mean sits 16 % higher than the median because a thin
right tail runs out to 238 530 €. 151 of the 234 — 65 % — earn less than the mean. Every figure in
the title, the standfirst, the two rules, the tail note and the alt text is computed by `render.mjs`
from `source/data.csv` and printed before the render. Nothing is typed.

## The denominator, on the frame

Six of the 240 returns are blank (`source/profile.json`: `annual_salary_eur.missing: 6`). A
distribution drawn over 234 of 240 rows without saying so is a lie about its own denominator, so the
standfirst says it, in the frame, not in this file only: *"234 of the company's 240 employees; six
returned no salary and are not drawn."* The six are dropped from the geometry — a histogram bins a
value, and a blank is not a value — never counted as zero, which would invent six people earning
nothing and drag the whole left tail.

## Framing, measured before the geometry was chosen (`framing-serves-the-point`)

`framingMeasurement` is called on both series and printed at every render.

- On the **234 salaries**: `spreadAgainstExtent` **0.939**, `largestAgainstMedian` **7.59**.
  One value at 7.6× the group's own median is exactly the outlier shape the discipline says to
  reconsider a treatment from.
- On the **bin counts, which are what actually gets drawn**: `spreadAgainstExtent` 1,
  `largestAgainstMedian` **`null`** — the median bin count is 0, and the function returns `null`
  whenever the median is not positive. On a right-skewed distribution most bins are empty by
  construction, so this reading is undefined for every histogram there will ever be. Recorded as a
  toolchain defect in `NOTES-FOR-MAINTAINER.md`, not worked around.

**What was decided, and why.** The discipline's menu for one mark dwarfing the rest is: a log scale,
two panels, or keep the true linear shape and rescue the compressed marks with a printed value.
This beat keeps the linear shape. A histogram's x-axis is the variable itself in its real unit, so
log-scaling it would make equal-width bins unequal slices of salary and destroy the one thing the
chart is for. Two panels would split a shape whose whole argument is that it is *one* shape. The
tail is rescued the third way: the three salaries above 100 000 € are named in their own annotation,
with the top figure printed, so a reader who cannot measure a one-count bar can still read it.

## Bins

**5 000 €, from 10 000 € to 240 000 € — 46 bins.** Width chosen before the summary numbers were
looked at, from `types/histogram.md`'s own working default (the range in about ten roughly-round
bins) widened until the shape stopped being one fat bar: at 12 500 € the mass is two bars and the
skew is invisible. It is a round number in the variable's own unit, and neither the median nor the
mean falls on a bin edge, so the bin choice is not carrying the claimed result — the sheet's own
first refusal.

The sheet also states a floor of about three bins and a ceiling of about fifty. 46 is inside both.
Neither number reaches `references/type-survey.md` (`refuses when` is empty for this type), so this
was read off the sheet by hand; see `NOTES-FOR-MAINTAINER.md`.

## The accent, and the two rules

One accent (`PALETTE.md`: `#D4A853` on `#16191B`, 8.01:1), spent on **the bars** — the payroll is
the subject the journalist named, and it is one series. The median and the mean are annotation, not
a second colour.

**Neither rule can be drawn in one ink.** `inkThatReadsOver(["#16191B", "#D4A853"], 3)` throws:
black reaches 1.19:1 on the ground and white 2.20:1 on the accent, and the refusal's own instruction
is *"move it onto one of them."* Each rule is therefore drawn as two segments — above the bar it
crosses, inked against the ground; inside it, inked against the accent — each segment measured by
`inkThatReadsOver` against the one background it actually has. Both labels sit above every bar, on
bare ground, pushed clear by the same measured pass the carbon histogram uses.

## Anti-patterns of this case

- **Zero is a rule about the COUNT axis here, not the salary axis.** Bar height is a count and is
  anchored at zero. The x-axis is the continuous variable in its real unit and starts at 10 000 €,
  the round number below the lowest salary — that is not a truncated length encoding.
- **Bars touch.** The bins are contiguous slices of one continuum; a gap would claim discrete
  categories.
- **The three high salaries are not accented.** The subject is not the maximum. They are named in a
  sentence, drawn in the same ink as every other bar.
- **No legend.** One series, direct annotation.
- **No `unattributed` printed anywhere.** The credit the journalist recorded is `unattributed`, and
  `creditLine` turns that into `Source: not stated`.
