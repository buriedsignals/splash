---
format: scrolly
type: hex-grid
---

# Beat — Five countries generate 59% of Europe's wind power (scrolly, live map)

**Type:** hex-grid. **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop. **Map:** a live MapTiler map, flat Web Mercator, with a frozen card image under it per card.

Subject: Europe's wind power in 2024 — where the continent's wind electricity is actually generated, and how much
of it rides on a handful of countries. Frozen data: `data.csv`, copied unmodified from
`proof/static-heatmap-europe-electricity/data.csv` (per-country generation by source, 2024). Every number in the
prose is derived from the rows and asserted in `render-directions-scrolly.mjs`, never typed.

Germany generates the most wind power in absolute terms (141.6 TWh, a fifth of Europe's total) and, with the UK,
Spain, France and Sweden, the top five countries generate 58.9% of it between them. But recoloured by wind's share
of each country's OWN electricity mix, the order turns over: Denmark leads at 58.2%, and Germany — the absolute
leader — falls to 7th at 28.5%. Ukraine reports 0 TWh across every source for 2024 (a wartime gap in the frozen
file, not a real zero) and is on the grid, outside the measure, in the neutral no-data fill.

## The choreography

| card | what the card says | gesture | camera | what the reader sees move |
| --- | --- | --- | --- | --- |
| 1 | one hexagon per reporting country, all equal, laid out roughly as the map | — | fixed | the grid, uncoloured |
| 2 | by output: Germany darkest (141.6 TWh), then UK, Spain, France, Sweden | **fill** | fixed | cells take the TWh classes; the output key |
| 3 | by share of each country's own mix: Denmark darkest, 58.2% | **re-encode** | fixed | the same cells cross-fade to the share's classes; the key changes |
| 4 | ranked by share: Denmark first, Germany 7th, Malta/Slovakia/Albania/Ukraine last | **reorder** | fixed | the cells leave the map for a honeycomb in share order |
| 5 | Denmark 58.2%, Germany 28.5% despite generating 6.6× more wind | **zoom + ring** | fixed | back on the map, the camera closes on the two cells, both ringed with their shares |
| 6 | the concentration reading: 5 countries generate 58.9% of Europe's wind | **pull back** | fixed | the grid by output, its key and the no-data note on Ukraine |

## Precision

Bin aggregation (both the TWh classes and the share classes) is computed once from the frozen `data.csv` and held
fixed across every card; every reporting country is present beneath the grid, plus Ukraine as the no-data cell.
Every bound paint is DATA-CONSTANT (`validateScrollyPlan` refuses one that is not) — a mark's size or colour
travels through a `{ $state: "…" }` expression bound to a STATES field, never through per-feature data that
changes between cards. Assertions in `render-directions-scrolly.mjs`: the share leader is Denmark, the output
leader is Germany, the two differ (a genuine turnover), Germany falls below 5th by share, Denmark is not among the
top 5 by output, the top-5-by-output set is exactly {Germany, UK, Spain, France, Sweden}, and their combined share
of the continent's total falls in the checked 55–62% range.

## The owner's rules — checked before the render

- [x] Every card changes the picture; the scroll interpolates continuously, never a slideshow of grouped marks.
- [x] Every sentence is asserted against the frozen data, never a hand-typed number.
- [x] ONE art direction, composed from this beat's own PALETTE.md and text (`--only creme`, the composer's own
      top-ranked candidate) — not the three filed demo directions.
- [x] The no-break space written as the ` ` escape in the script, never typed.
- [x] The committed page carries `__MAPTILER_KEY__`; the key is substituted only in the git-ignored `.local.html`
      copy — never committed keyed.
- [x] Driven CONTINUOUSLY (`skills/scrolly/scripts/verify-scrolly.mjs`): 0 failures, 14 notes, at all three
      widths (1600×900, 1280×800, 375×812).

## Direction

One — `creme`, the composer's best candidate for this beat's own PALETTE.md and text
(`render-directions-scrolly.mjs --only creme`): `renders/creme.html` plus its git-ignored `renders/creme.local.html`
copy (the MapTiler key substituted locally for preview).
