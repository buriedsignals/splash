---
takeaway: "Europe's ten most low-carbon electricity grids in 2024 all generated at least 86 percent of their power from hydro, wind, solar, bioenergy and nuclear combined — Albania and Iceland reached 100 percent. The 30 countries ranked below them average 55 percent, and twelve of those are still under half."
subject: "each European country's 2024 generation mix, ranked by the low-carbon share (hydro, wind, solar, bioenergy, other renewables, nuclear) of total generation"
comparison: "the top ten low-carbon grids against the 30 countries ranked below them"
limits: "Shares are computed from Ember/OWID 2024 generation-by-source figures frozen in source/data.csv; Ukraine carries zero recorded generation across every source in this file (wartime data gap) so its share is undefined and it is excluded from the 40-country ranking, leaving 40 of the 41 frozen rows. 'Low-carbon' groups nuclear with renewables, which is an editorial choice the article states explicitly, not a physical necessity — a reader who only counts renewables would rank France and Slovakia lower."
placement: "a standalone scroll-driven page, linked from the article — it is the piece's one interactive"
credit: "Ember / Our World in Data, electricity generation by source, 2024"
effectiveDate: "2026-09-16"
grounding: "unverifiable"
reference: "none — cold run, no reference loop performed"
language: "en"
slots:
  - id: 1
    proves: "That the ten most low-carbon grids in Europe are far ahead of the rest of the continent: all ten sit at 86 percent or above, while the 30 countries ranked below them average 55 percent and twelve are still under half. The reader meets every country ranked by low-carbon share, then the top ten highlighted and isolated, then the gap to the rest named directly."
    medium: "chart"
    format: "scrolly"
    reachable: "yes"
    candidates: ["Scrollytelling (ranked bar chart of all 40 countries, top ten highlighted, then isolated, then the gap to the rest annotated)", "Bar and column, static, top 10 only", "Dumbbell, static (top 10 vs. rest average)"]
    intent: "rank every country by low-carbon share and isolate how far ahead the top ten are of the rest — a scrollytelling bar chart lets the reader see the full field before the top ten are pulled out, which a static top-10-only bar cannot show"
    chosen: "Scrollytelling (ranked bar chart of all 40 countries, top ten highlighted, then isolated, then the gap to the rest annotated)"
---

## Slot 1 — the ten grids furthest ahead, and how far

### What the article claims, read back (movement ①)

The article states that a small cluster of European countries generated almost all their
electricity from low-carbon sources in 2024, naming Norway, Iceland and Albania above 95 percent,
and that the leaderboard "drops off fast" by the tenth and twentieth country.

### The takeaway and its grounding (movement ②, gate G1)

Recomputed from the frozen file: low-carbon share (hydro + wind + solar + bioenergy + other
renewables + nuclear, over total generation) for 40 European entities. The top ten — Albania,
Iceland, Sweden, Norway, Switzerland, Finland, France, Luxembourg, Denmark, Austria — range from
100.0 percent down to 86.2 percent. The 30 ranked below them average 55.1 percent, and twelve of
those (Greece down to Moldova) sit under 50 percent, with Moldova the lowest at 10.7 percent.

`groundTakeaway` was run against `source/profile.json` and returned **unverifiable** for every
numeral in the takeaway except the "2024" placed against the `year` column's own (trivial) range:
every other figure here is a computed share (a ratio across six of the profile's nine measure
columns, or an average over a 30-country subset), and the profiler holds only per-column ranges and
sums, not derived ratios or group aggregates. `unverifiable` is recorded as the verdict; the numbers
above were recomputed independently from the frozen CSV for this beat, not carried from the article.

### The hand of the journalist (movement ③)

See front matter: `subject`, `comparison`, `limits`, `placement`, `credit`, `effectiveDate`.

### The survey and the choice (movements ④–⑦)

Medium: chart (a ranking of computed shares, one value per country — not a map, not a
photograph). Format: scrolly, chosen so the reader meets the full 40-country field before the
argument narrows to the top ten and the gap behind them — a fixed top-10 bar chart states the
conclusion without showing the reader the rest of the field it was drawn from.

### Reference loop (movement ⑧)

None — cold run, no reference loop performed.

### Palette and proposal (movements ⑨–⑩)

House palette from `NEWSROOM.md`: ground `#16191B`, accent `#D4A853`, second accent `#5B8A8A` —
accent 1 for the top ten, ground-adjacent grey for the rest, per the scrolly skill's own palette
step.
