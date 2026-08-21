---
type: slope
---

# Beat 2 — Per resident, Porto carries the most trips, not Lisboa

**Reading**: per population — the same six networks ranked twice, and the second ranking is the
rate. `tripsPerResident` in `ridership.ts` computes it in exactly one place for the whole story.

**Type:** slope (slopegraph, on a rank axis). **Medium/format:** chart / web.
**Channel:** article web, one self-contained `renders/trips-per-resident.html`.
Slot 2 of `STORYBOARD.md`. **No size front matter, deliberately:** a web beat is asked nothing at
G2c and must carry no `size` — it fills whatever container the CMS gives it, and both Gate-2
readings refuse a `size` on a `web` slot.

## Claim

The same six networks, ranked twice. By total trips the order is Lisboa, Porto, Braga, Coimbra,
Aveiro, Faro. By trips per resident it is Porto, Lisboa, Coimbra, Braga, Faro, Aveiro. Three
crossings, and the one at the top is the article's own opening reversed. Every rank, every total and
every rate is computed by `render-web.mjs` from `source/data.csv`; the rate itself is computed in
exactly one place for the whole story (`ridership.ts`'s `tripsPerResident`).

## What the interaction is for

`web-discipline.md`: hover reveals **detail the static frame had to omit**, never the same numbers
repeated for effect. A rank axis shows the reordering and nothing else — it deliberately does not
show how far apart the values are. So every line carries, on hover, tap and keyboard focus, that
city's own total trips, its population, and its trips per resident. The static reading (who moved,
in which direction) is complete with JavaScript off; the exact figures are the addition.

The same figures are in the accessible table `renderWeb` appends from each line's own `data-detail`,
so a reader with no access to the picture gets the same facts.

## No filter

`chart-web/SKILL.md`'s three-part filter test: the series carries no dimension a reader would want
to narrow (six cities, no region column, no sub-series), and the default view already shows
everything the title claims. So this beat declares no filter and ships no fieldset, no CSS rule and
no attribute.

## The departure this beat makes from its own type sheet

`chart-beat/references/types/slope.md` describes two **moments**. This slope's two columns are two
**readings of the same moment** — the same 2025 figures ranked by a total and then by a rate. The
mechanism is unchanged (two vertical axes, one line per category, the tilt is the finding) and the
type's own refusals still hold: two columns only, six categories is "a handful", the value axis is
position-encoded so it is not padded to zero, and the label gutter is sized to the label rather than
the label truncated to the gutter. It is recorded here because it is a departure, not because it is
a problem.

The positions are RANKS, not values. That is stated in the standfirst rather than left for the
reader to assume, because a slope on a rank axis says who moved and says nothing about by how much —
which is exactly why the hover carries the values.

## Single accent

`#D4A853` on Lisboa, the same subject beat 1 accents, so the two beats agree about who the story is
about. Porto stays furniture: its rise reads because it crosses the accented line. `slope.md` allows
at most two hues total — one neutral, one accent — so the newsroom's second accent is NOT used here.

## Anti-patterns this case invites

- **Accenting both Lisboa and Porto.** Two accents on a slope is no accent.
- **Reading the rank axis as a value axis.** Said in the standfirst, and the values are on hover.
- **Presenting the rate as the truer number.** It is a different number. The limits field in
  `STORYBOARD.md` says trips are not journeys per person; the standfirst says the same thing.

## Source

`source/data.csv`, frozen. Six city networks, 2025 only.
