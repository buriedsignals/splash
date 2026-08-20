# Beat — Clinics across Europe, two measures that cannot share one map (static)

**Type:** choropleth pair. **Medium/format:** map / static. **Channel:** one PNG,
`renders/mixed-unit-clinics-still.png`.

## The trap, and the decision

`source/data.csv` carries eight rows in one `value` column. France, Germany, Spain and Italy
report a **count** of clinics (910–1880). Poland, Sweden, the Netherlands and Belgium report a
**rate per 100,000 people** (17.2–21.9). `source/profile.json` — this tree's own intake profiler —
ranged the whole column as one measure (`"min": 17.2, "max": 1880`), which is exactly what a
choropleth's class scale would inherit if this beat coloured the raw `value` column on one ramp:
Germany's 1880 and the Netherlands' 17.2 would sit at opposite ends of the SAME scale, painting
four countries the darkest class and four the lightest for a reason that has nothing to do with
the world — a count is not a rate, and 1880 is not "more" than 17.2 in any sense a reader could
use.

**Decision: two maps, one unit each.** No single number is derived to paper over the split (a
count-to-rate conversion would need each country's population, which this frozen source does not
carry, and inventing one is not this beat's call to make). The left map shades the four COUNT
countries on their own ramp; the right map shades the four RATE countries on their own ramp. Both
share one baked plate (one camera, drawn twice) so the geography reads as the same continent, but
the two ramps are never merged into one legend and no single "highest of the eight" claim is
made anywhere on the frame.

## What noticed the mixed units, and what did not

- **`unit` column + the article's own second sentence** named it explicitly — the frozen source is
  honest about what it is reporting.
- **`skills/intake/scripts/profile.mjs`'s profiler did NOT notice.** `source/profile.json` ranges
  `value` as `min: 17.2, max: 1880` across both units, exactly as if it were one measure — the
  profiler has no unit-awareness, only a numeric-column summary.
- **`skills/storyboard/scripts/ground-claim.mjs`'s `groundTakeaway` did not catch it either, for a
  different reason: it never got the chance.** Run against the article's closing line, "Germany
  has the most.", against a profile built from this frozen data, it returned `[]` — no claim
  shape at all. The sentence carries no numeral and neither "highest" nor "lowest" (it says
  "most"), so none of `groundTakeaway`'s seven recognised shapes fire. It is not that the checker
  looked at the mixed units and passed them; it never looked at this sentence at all.

## The article's last line, checked by hand

"Germany has the most" is true only if read as "the most among the four countries reporting a
count" (Germany 1880 vs France 1240, Spain 910, Italy 1105 — genuinely the highest of that group).
Read as a claim about all eight rows — which is how an unqualified "the most" reads next to a
table that does not repeat the unit on every line — it is not a comparison the data supports at
all: Sweden's 21.9 is not "less" than Germany's 1880, it is a different kind of number. This
beat's own headline is worded to say only what is checkable: "Germany reports the highest clinic
COUNT; Sweden the highest RATE — the two numbers do not compare."

## Subject and accent

One ramp per panel (COUNT panel: France, Germany, Spain, Italy; RATE panel: Poland, Sweden, the
Netherlands, Belgium), both derived from the recorded `PALETTE.md` accent toward the newsroom's
own ink pole. The accent itself marks the top of each panel's own ramp and outlines that panel's
own highest reader (Germany in the count panel, Sweden in the rate panel) — never a cross-panel
comparison mark, because there is nothing honest to compare between them.
