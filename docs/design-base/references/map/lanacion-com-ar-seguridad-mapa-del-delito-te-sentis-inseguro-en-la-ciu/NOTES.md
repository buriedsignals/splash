# La Nación — "Mapa del delito"

- url: https://www.lanacion.com.ar/seguridad/mapa-del-delito-te-sentis-inseguro-en-la-ciudad-comparti-tu-ubicacion-y-te-decimos-cuantos-delitos-nid23102024/
- archive: url-list
- type: dot-density map, reader-located
- export: web
- readAs: the piece's own map element, photographed at rest **after a consent dialog was
  dismissed** — the harvester clicked a button labelled "Aceptar", and the record says so. Without
  that, both routes would have measured the dialog and reported `ok`.

## What it is

Every reported crime in Buenos Aires as a point on a near-white street basemap, with the reader
invited to share their location and be told how many happened around them.

## What it does with information

**The street grid IS the encoding's resolution.** The dots sit on the streets rather than in
polygons, so the pattern reads as "along this avenue" rather than "in this neighbourhood" — a
choice about what the data can honestly support, since a crime has a street address and not an
area.

**Hue separates crime types at very low saturation**, teal through to indigo, so the field reads as
one texture at a glance and separates only when looked into. The pixel route reads it as
**diverging**, two poles.

**The basemap gives up almost all its contrast.** Streets are the palest grey; the ground measures
`#FEFEFE`. Against a dense point field that is the only way the points stay countable.

## What it does with style

Ground `#FEFEFE`. Zoom controls top right, a crosshair at centre for the location prompt.

**And here is what it does NOT evidence, which is why it was harvested.** Its place names —
"Buenos Aires" in large pale grey, "Buenos Aires – Montevideo" across the river — are the basemap
PROVIDER'S defaults, left as delivered. ProPublica's *louisiana-toxic-air* treats its geography as
an editorial system: tracked capitals for parishes, mixed case for settlements, italic for water,
placed and styled deliberately. The two are not the same act, and at this resolution a provider's
default cannot be honestly told from a designed one.

## What is transferable

- **Put the points on the street grid** when the data has street addresses: aggregating to areas
  invents a resolution the source does not have.
- **A basemap that surrenders its contrast entirely** when the mark field is dense.
- **Low-saturation categorical hues** for a type dimension that should not compete with density.

## What is this piece's own

The provider's label layer, which is not an editorial decision and does not transfer.

## What was not verified

The reader-located state — only the default view was read. Whether the piece carries a legend for
its crime types; none is visible in the frame captured.
