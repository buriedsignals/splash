# ProPublica — "Louisiana Toxic Air"

- url: https://projects.propublica.org/louisiana-toxic-air/
- archive: url-list
- type: dot-density map, scrollytelling
- export: scrolly
- readAs: the piece's own map element, photographed at rest at the step the harvest reached

## What it is

Every air-polluting facility along the lower Mississippi drawn as a point on a near-white basemap,
with the parishes, the cities and the water named on the plate.

## What it does with information

**The basemap is almost silent.** Roads and built-up areas are the faintest grey; the ground reads
`#FDFDFD`. Everything that carries meaning — the points, the labels, the one annotation — sits well
above it in contrast. `doctrine/references/geo-discipline.md` asks for exactly this and the piece
does it more severely than most.

**Three kinds of place name, three treatments.** Parishes in **grey tracked capitals**
(`EAST BATON ROUGE`, `ST. JAMES`, `ASCENSION`); cities in **darker mixed case** (`Baton Rouge`,
`Gonzales`, `Laplace`, `New Orleans`); water in **italic capitals** (`LAKE PONTCHARTRAIN`,
`LAKE MAUREPAS`, `MISSISSIPPI RIVER`). A reader separates administrative area, settlement and water
without a legend, from typography alone.

**One annotation, with a leader, in its own hue.** "Each point represents a facility." in olive,
curving to the point it names. It is the only coloured text on the plate, and it says the one thing
the encoding cannot say for itself.

**An inset locator, top right.** A small Louisiana silhouette with the frame's extent marked —
placing the reader before the detail is read.

## What it does with style

Ground `#FDFDFD`, palette read as **sequential** by the pixel route. The whole piece is grey on
near-white with one olive accent for annotation; the points themselves are dark grey.

## What is transferable

- **Distinguish classes of place by typographic treatment, not by a key.** Tracked capitals for
  administrative areas, mixed case for settlements, italic for water — a convention old enough that
  readers carry it, which is the only kind worth spending on (`palette/references/subject-conventions.md`).
- **A near-silent basemap** when the marks are dense: the ground gives up its contrast to them.
- **An inset locator** rather than a sentence explaining where the frame is.

## What is this piece's own

The olive annotation hue, and Mapbox's own label typography.

## What was not verified

Everything after the step read — this is scrollytelling and only one resting state was captured.
Whether the map carries a legend elsewhere in the piece.
