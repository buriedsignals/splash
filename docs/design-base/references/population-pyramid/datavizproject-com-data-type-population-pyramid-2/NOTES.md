# Ferdio, Data Viz Project — *Population Pyramid* (the type's catalogue exemplar)

`https://datavizproject.com/data-type/population-pyramid-2/` · harvested 2026-09-08 · archive
`search`.

## What it is

**A catalogue exemplar, not a published data graphic, and it is filed as one.** Ferdio's Data Viz
Project has one page per chart type, and each page's lead image is a drawn specimen of the type over
invented numbers. This is that specimen. It answers "what does the canonical form look like when
somebody who designs charts for a living draws it with nothing to argue", which is a different and
narrower question from what every other record in this family answers.

The record's graphic is an `img` 503 × 503 at `documentTop` 172, `nearTheTop: true`,
`routes.pixel.measuredFrom: "graphic.png"`, `consent: null`, `entry: null`. It is the specimen
itself, not a promotional card of one and not the site's chrome — `METHOD.md` corrections 13 and 17
are both clear here.

**It does not count toward the evidence floor for any treatment about editorial practice.** It is one
desk (correction 4 already counts Ferdio once across a hundred pages), and more importantly it is a
*picture of a chart type*, so nothing in it was decided against a real reader's real question.

## What it does with information

- **Eight bands, `0-10` `10-20` … `70-80`, named by both edges**, running up.
- **No open top band.** The specimen stops at `70-80` with a closed interval, which is the one
  convention every real publication in this family declines: ONS writes `90+` and `110 and over`,
  PopulationPyramid.net and PopulationPyramids.org write `100+`. A specimen has no living tail to
  account for.
- **The band names sit in a gutter to the LEFT of the plate**, not in the centre — the majority
  arrangement in this corpus, and the opposite of what
  `chart-beat/references/types/population-pyramid.md` prescribes.
- **Both halves grow outward from a shared centre line and the axis reads positive on both sides**:
  `20% 10% 0% 10% 20%`.
- **The magnitude axis is a pale bracket rule with five labels and no ticks and no gridlines.** The
  rule is drawn only under the plate's width and stops; it is the lightest axis in the family.
- **The bands are not sorted by value.** They run in age order, and the silhouette is the ordinary
  bottom-heavy one — the specimen draws the one thing the type sheet warns against destroying.
- **Neither half is named.** No `Male` / `Female`, no legend, no key. The specimen shows the geometry
  and declines to say what the two sides are, which is honest for a schematic and would be a defect
  in a published chart.
- Bands touch: the blocks are full height with a hairline of ground between them.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 82.043 % |
| left half | `#FF3F34` at **7.101 %**, hue 3.3 |
| right half | `#263252` at **7.073 %** (filed under `neutral` — it is near-achromatic) |
| the red's edges | `#FFA39E` 0.132 %, `#FF6A61` 0.117 %, `#FF463B` 0.110 %, `#FF8A83` 0.097 % |
| axis rule | `#ECEFF0` 0.183 %, `#D3D6DC` 0.147 %, `#E4EAEB` 0.141 % |
| palette shape | `sequential` |

**The two halves cover 7.101 % and 7.073 % of the picture — 0.028 percentage points apart.** That
near-equality is the mirrored form's own signature and is worth keeping as a sanity check on any
pyramid this design base draws: two sides of one population, on one shared scale, should land within
a fraction of a point of each other.

The pair is **a saturated red against a near-black navy**, not two tints of one hue and not the
blue/pink convention the two dedicated pyramid sites both reach for. It is Ferdio's house pair, seen
on every one of the hundred pages of `100.datavizproject.com`, so it is a habit rather than a
decision about this chart — which is exactly what the evidence floor exists to keep out of a
treatment.

**The plate's type is not measured and none may be reported.** `typeSource` is `"the page only — the
graphic is a raster and carries no type this route can read"`. The record's `stevie-sans` and
`Borgia Pro` tuples are the Data Viz Project *website*: `stevie-sans | 28 | 700` for the page title
`"Population Pyramid"`, `Borgia Pro | 18 | 400` for the type's description, `stevie-sans | 14.4 | 500
| uppercase` for `"Family"`. The band labels and axis numbers visible in `graphic.png` were read by
neither route.

## What is transferable

- **The near-equal coverage of the two halves as an arithmetic check.** 7.101 % against 7.073 %.
- **Both sides positive, counting outward from a shared centre.** A fifth publication for the
  convention.
- **An axis that is a bracket, not a frame.** Five labels, a pale rule the width of the plate, no
  ticks, no gridlines, nothing enclosing the bars.
- **Bands in age order, never sorted by value.** The specimen obeys the type sheet's one hard rule.
- **What the specimen leaves out is the more useful lesson.** It has no open top band and it names
  neither half — the two things every real publication in this family adds. The canonical geometry is
  not sufficient; a published pyramid needs an inequality at the top and words on the sides.

## What was not verified

- **The plate's type.** Raster `img`, no `graphicFrame`; all type tuples in the record are the
  website's.
- **Whether `#FF3F34` and `#263252` are distinguishable as a pair by a colour-vision-deficient
  reader.** Not tested. The lightness gap is very large, which helps, and the mirrored positions
  carry the distinction anyway.
- **The numbers.** The specimen's data is invented; nothing about the values is a fact about any
  population.
- **Whether Ferdio publishes a real population pyramid anywhere.** Not established. The hundred-page
  `100.datavizproject.com` dataset cannot hold one — see the proposal's pool note.
