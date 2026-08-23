# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at intake

INTAKE — the aggregate proposal is blind exactly on the panel shape open data ships in.

Ran: `freezeSource` on the Eurostat data-browser CSV for `sdg_02_40` (746 rows, 21 columns, one row
per country per year, downloaded 23 Aug 2026). Two of the 38 rows in the entity column are not
countries: `EU` and `EU27_2020`, the European Union aggregates, and they sit in the middle of the
alphabetical list between ES and FI.

Came back: `panel.aggregates.byStructure: []`, `structure.answered: false`, reason "no column of
this table holds one stable code per entity with a shape most of them share". No warning of any
kind reaches the journalist.

Expected: at least a proposal naming `EU27_2020`, whose code is shaped unlike the 36 ISO-2 codes
around it.

Measurement: `structurallyUnlikeRows` skips `c === entity`, and in this table the entity column IS
the code column (`geo`). Duplicating `geo` into an extra column named `geo_code` and re-profiling
the same bytes returns
`byStructure: [{entity:"EU27_2020", proposedBy:"code-shape", code:"EU27_2020"}]`,
`structure: {column:"geo_code", shape:"AA", entitiesWithThatShape:37, entitiesCoded:38}`.
So the mechanism works; it is simply switched off whenever the panel's entity key and its code are
the same column, which is the normal shape of every SDMX download (Eurostat, OECD, ECB, UNSD).

The only other candidate column, `Geopolitical entity (reporting)` (the labels), can never fire
either: `shapeOf` is length-sensitive, so "Albania" -> "Aaaaaaa" and "Bulgaria" -> "Aaaaaaaa" are
different shapes, the dominant shape covers 4 of 38, and `dominantCount * 2 <= coded` rejects it.

Cost: I had to find both aggregates by eye. A journalist who did not would have ranked the EU
average as if it were a 37th country.
