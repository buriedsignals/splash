---
format: video
type: choropleth
size: landscape
---

# Beat — Le charbon a reculé dans les douze — la Pologne en tire encore plus de la moitié (video)

**Type:** choropleth (map). **Medium/format:** map / **video**, on the live MapTiler map. **Size:** landscape
(1920 × 1080). **Data:** the frozen `proof/static-heatmap-coal-share-europe/data.csv` (Ember, via Our World in
Data), read in place — twelve countries × 2010–2024.

## The claim

Coal's share of electricity fell in all twelve of the EU-27-plus-UK power systems that leaned on it most in 2010.
Three drew half or more from coal in 2010 (Poland 87 %, Czechia 55 %, Greece 54 %); in 2024 only Poland does (54 %).
`beat.mjs` (`assertClaim`) measures each part and throws when the data stops saying it.

## Why the change, and why the years run

The latest year alone is a map of eleven pale countries and one dark one — true, but it hides that every one of them
fell. The request was a map of the share; the reasoning led to the change, told the one way only a video can: the
years run on the map itself, each country's fill stepping class by class with its own reading, while the count at or
above half steps down (3 → 4 → 3 → 1 … → 1).

## The selection travels with the picture

These are the twelve most coal-dependent in 2010 — the rule is inside the data. Every other country is bare land,
and the key names that absence « hors des 12 », a swatch of the basemap's own land, distinct from the palest class
(the ramp starts at the smallest dose that stands 1.3:1 from the land). The eyebrow states the rule.

## Shots and choreography

| event | what the viewer sees |
| --- | --- |
| `establish` | the title card from frame 0: « Charbon · les 12 pays les plus dépendants en 2010 » over the title |
| `reference` | the map, the twelve in their 2010 classes, lowest first; the panel: « 2010 », « 3 pays ≥ 50 % », the key with the 50 % borne marked in the accent |
| `reveal` | **the years run**: 2010 → 2024, twelve frames a year, the fills step with their readings and the counters with them |
| `subject` | the panel leaves; the camera travels onto Poland (centred on both axes), the fills **rewind** to 2010 as it leaves; once settled: Poland outlined in the accent, named with its share, Germany and Czechia named; the years **replay** and each share counts down on one gauge (0–100 %, the 2010 reading left as a trace, the half notched): Poland stays over the notch, Czechia crosses it, Germany never reached it |
| `conclusion` | the close-up names leave, the camera pulls back; Poland's word returns beside its outline; the panel returns at 2024; the source on the sea, one line |
| `hold` | the final map, 2 s |

Rules kept: nothing is named while the camera moves; no end card; minimal words (no standfirst, no callout);
every word ≥ 30 px, held to the type floor at every event's end.

## The map

The plan (`plan.mjs`) is the scrolly pilot's approach, written for this data: dataviz style, flat Web Mercator,
one MapTiler Countries fill layer per country beneath the water (so every bound paint is data-constant — the colour
an interpolation over the bound `year`, the opacity the class arrival), borders, Poland's outline over a halo of the
ground, and the regions' borders of the twelve arriving with the close-up. The frame drives it in numbers
(`mapStateAt`); `measure.mjs` measured each fixed camera once (`measured.json`) and the credit, the panel and every
word are placed from that measurement in Bun. The key reaches MapTiler only through the local proxy.

**The ramp is neutral** (ground toward ink — map-beat's rule for a choropleth, and coal's own grey); **the accent is
spent on Poland** and on the half it is measured against.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`, from
`render-directions-video.mjs`. The credit sets its shortest form (« Ember · © MapTiler © OpenStreetMap ») — the only
one the whole map's open sea holds on one line; provisional, as on the worked example.
