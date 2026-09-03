---
takeaway: "Half of the 234 employees who reported a salary earn less than 31420 euros a year — well under the 36516 euro average that a handful of very high salaries pull upward."
subject: "the typical employee — the middle of this payroll, not the people at the top of it"
comparison: "the mean salary of 36516 euros, the single number the union says is being quoted in negotiations"
limits: "One company, one payroll year, so no trend and no comparison with any other employer. Six of the 240 employees returned no salary and are not drawn; the chart is 234 people, and says so. The table carries no job title, no grade, no hours and no gender, so nothing here explains WHY the tail is where it is. And a mean and a median are the only two summary numbers the frozen table can support — quartiles are computed from the rows, not read off the profile."
placement: "Mid-article, immediately after the paragraph that quotes the union's demand that the spread be published instead of the average."
credit: "unattributed"
effectiveDate: "2026-08-21"
grounding: "unverifiable"
reference: "The New York Times, The Upshot — \"Extensive Data Shows Punishing Reach of Racism for Black Boys\" (19 March 2018), the row \"a group-level rule that individual cases visibly break\"; shown beside ABC News (Australia), \"How Buddy Franklin scaled footy's Everest\" (\"a long, noisy series read against a historical level\"), and both kept — the first for stating the rule on the graphic while the exceptions stay visible, the second for naming the level as a NUMBER in the annotation rather than trusting the eye"
language: "en"
slots:
  - id: 1
    proves: "The payroll's mass sits well to the left of its own average: the median is 31420 euros, the mean 36516, and the gap between the two lines is made by a right tail that runs out to 238530."
    medium: "chart"
    format: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["Histogram", "Box plot", "Beeswarm"]
    intent: unrecorded
    rankingWalk: unrecorded
    chosen: "Histogram"
---

## What was read in the article (restitution)

Four claims could become visual:

1. **The median sits well below the mean.** Stated, and the frozen table supports it: median 31420,
   mean 36516 over the 234 answered returns.
2. **A small number of very high salaries pull the average up.** Stated, and visible: 238530,
   139028 and 119775 are the top three, against a payroll whose third quartile is 42844.
3. **"Three individuals earn more than four times the typical figure for their department."**
   Stated in the article and **only partly true of the frozen data**. Measured against each
   department's own median: 238530 is 4.79x R&D's 49844, but 139028 is 2.79x it and Commercial's
   119775 is 3.14x that department's 38089. One of the three clears 4x, not three. The takeaway
   deliberately does not carry this sentence; the beat draws the tail without putting a multiplier
   on it.
4. **Six returns were blank.** Stated, and the profile agrees (`annual_salary_eur.missing: 6`).
   That is a denominator fact, so it belongs on the graphic rather than in this file only.

## Grounding — G1

`resolveGrounding` over the confirmed takeaway returns **unverifiable**, and the reason is worth
recording rather than hiding: both salary numerals (31420, 36516) are *placed* inside
`annual_salary_eur [14664, 238530]` and neither is *confirmed*, because a value inside a range is
not a claim the data confirms; and `234` — which is exactly `rowCount` minus
`annual_salary_eur.missing`, both of them stated in `source/profile.json` — could not be placed at
all, since the check reads column ranges and column sums and nothing else. Nothing in the takeaway
was refuted. `unverifiable` is a closing value for this gate, and it is recorded as what it is:
this check has no shape for a distribution claim.

## Slot 1 — The spread, and where the average actually falls in it

A histogram of the 234 answered annual salaries, in 2500-euro bins from the floor, with the median
and the mean each drawn as its own vertical rule and labelled with its own number. The accent is
carried by the bins below the median — the "most people" the headline is about — and the long thin
tail to the right is left in the ground's own ink, because the tail is not the subject; it is the
reason the mean is where it is.

### Candidates considered

1. **Histogram** — chosen. *"A histogram bins one continuous variable into contiguous intervals and
   draws a bar per bin whose height is the count that landed there."* The article asks for the
   distribution rather than one number, and this is the only candidate whose whole subject is the
   shape of one continuous variable. 234 observations is far past the sheet's own floor of about
   three bins and short of its ceiling of about fifty.
2. **Box plot** — *"compresses a distribution into a five-number summary."* It answers a different
   question — how five departments compare — and the article's argument is about the company, not
   about R&D. Kept in `SUBJECTS.md` as its own angle rather than drawn here.
3. **Beeswarm** — *"shows every raw observation on one shared value axis."* Rejected on the sheet's
   own words: *"Past roughly a hundred and fifty points the collision-avoidance layout stops
   helping — the swarm turns into a dense blob."* 234 points is past that. Note that nothing in the
   toolchain refused it: the menu offered it without a word, and the ranking put it third of
   thirty-two. That refusal was applied by hand, here.

### Producer

`datawrapperMatch({medium: "chart", format: "static", treatment: "Histogram"})` returns `null` —
Datawrapper has no faithful histogram type in the pinned catalogue — so the producer gate was never
opened and the beat stays custom. That is the canonical custom state for an unmapped treatment, not
an omission.

## Reference

Two rows from the doctrine reference set were shown, and both were kept:

- **"A group-level rule that individual cases visibly break"** (NYT Upshot, 2018) — the finding is
  set directly on the graphic as its own sentence while the individual marks keep the honest texture
  of the exceptions. Here: the annotation states that half the payroll is below 31420, and the tail
  is still drawn, at full length, in the same frame.
- **"A long, noisy series read against a historical level"** (ABC, 2022) — the transferable half is
  that the level is named as a NUMBER beside the chart rather than left to the eye. Here: the mean
  and median rules each carry their own figure.

The set has no row for *the shape of a distribution read against its own summary statistic*, which
is what this beat actually is. The two above are the nearest structures in it.

## Palette and type

`PALETTE.md` and `TYPEFACE.md` beside this file — ground `#16191B`, accent `#D4A853` at 8.01:1, and
`Helvetica, Arial, sans-serif` recorded as `origin: default` because this machine does not have the
newsroom's own `Space Grotesk`.
