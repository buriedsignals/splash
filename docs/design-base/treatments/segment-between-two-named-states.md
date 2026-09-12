# segment-between-two-named-states

- kind: imported
- name: Two observations are joined only where both states are named and no axis runs between
- applies: the beat compares exactly two states, both are named, and no continuous axis runs between them
- draws: axis, value
- priority: 10
- evidence: 100-datavizproject-com-data-type-viz54
- evidence: 100-datavizproject-com-data-type-viz17
- evidence: abc-net-au-news-2018-12-13-how-life-has-changed-for-people-your-age-10
- evidence: reuters-com-graphics-usa-election-swing-states-myvmadqlzvr
- evidence: informationisbeautiful-net-visualizations-spotify-apple-music-tidal-mu
- detect: the delivered artifact carries a path or line joining the two marks of each entity; AND a
  text run naming each state lies inside the plot's own bounding box or in the band directly above
  it; AND no tick text and no gridline path appears along the dimension between the two states

## The rule

Join the two observations. Name both ends where the marks are — a dated rail cap, a chip on the
axis, a two-dot key directly over the plot — and draw no axis between them.

## The treatment this replaced, and why it was wrong

`two-points-are-not-a-line` said the opposite: with exactly two observations, draw no line, because
a line invents a trajectory the data does not contain. It was proposed, then held back for want of a
second publication (`METHOD.md`, correction 4), and it never came — because what arrived instead was
the refutation. Re-checked on the corrected corpus, reference by reference, **four independent
publications draw the segment**:

| publication | what it draws | read on |
| --- | --- | --- |
| Ferdio | a straight segment between two observations (`viz54`, `viz17`) | the record's own `graphic.png` |
| ABC | straight segments between `1981` and `2016`, two series at a time, across a whole article of panels | the graphic, corroborated by 117 rail strokes in the style route's mark inventory |
| Reuters | the pair as a column's sloping roofline, between a `2016 ▾` and a `2023 ▾` chip | `graphic-scrolled.png`, a walked capture — see below |
| Information is Beautiful | nine curved connectors between an "average artist revenue per play" rail and a "total users" rail | the record's own `graphic.png` |

**One of the four is read on a weaker file, and the record says so.** Reuters' pixel route is
`not-applicable`: the piece has no graphic outside the site's own chrome, so there is no
`graphic.png` to read. The roofline is looked at on `graphic-scrolled.png`, a capture the harvest
walked to rather than photographed as an element. That is admissible for GEOMETRY — whether a
segment is drawn, and what the chips say — and it is not admissible for colour, which is why no
colour claim anywhere cites this reference. Four publications either way.

One desk draws four geometries for the same relation — Ferdio joins it straight in `#54` and `#17`,
as a curved ribbon in `#36`, as a curved dotted leader in `#85` — and never as a bare pair of dots.
The weaker rule that could have been salvaged, *straight, never smoothed*, is therefore contradicted
from **inside a single desk**, and is not filed either.

## What the refused rule was right about

The reading it feared is real: two dots joined by a line, with nothing saying what either end is,
does claim a trajectory. What it misidentified was the cause. **The danger is not the segment, it is
an unlabelled axis underneath it.** A time axis running from 2004 to 2022 promises that the years
between are on the plot, and a straight segment across it then asserts the change was linear. Two
labelled rails promise nothing of the kind: there is no axis between them for anything to have
happened on.

So the predicate keeps both halves. Name both states and the segment is honest. Leave either
unnamed, or run a continuous axis between them, and it is the invention the old rule named.

## What limits it

**A desk is not consistent about this, and the corpus says so.** Ferdio's `viz19` FAILS the naming
half from inside the house that supplies five references which pass: its `◆ 2004 ◆ 2022` key sits
below the plot and the two states are named nowhere else. Five agreeing records of one publication
would have let a reader infer universality; the sixth is why the floor counts publications and not
records.

**There is no pixel budget in the detect, deliberately.** A first draft required the state's name
within 40 px above the plot. On Information is Beautiful's *gender pay gap* the key sits at roughly
y 285 against a graphic at y 378 — **93 px** — so the threshold was refuted by its own strongest
reference. The rule is *above, not below*. `METHOD.md` correction 12 is the same mistake in its
first costume: a threshold set by eye kept a door shut that the feature existed to open.

**And the accent goes to the entity or to the date, never to both.** Six Ferdio records give each
country a hue and let both its observations share it, then name the dates on the rails — `#3`, `#6`,
`#17`, `#30`, `#54`, `#85`, where `DK` is red in both years, `NO` navy in both, `SE` blue in both.
Two give the hues to the dates instead and reduce the countries to two-letter codes or flag glyphs:
`#19` and `#36`. Both arrangements work. Doing both makes two accents and neither reads. That is a
real constraint on any beat this treatment applies to, visible on eight records' own pixels — and it
has no `detect` anyone has been able to write, so it is recorded here rather than filed as a lever.
