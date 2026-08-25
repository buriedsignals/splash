---
takeaway: "In 2023 the six countries where a newborn could expect fewer than 60 years of life were all in sub-Saharan Africa, against a world average of 73.2 years."
grounding: unverifiable
reference: "The New York Times, The Upshot -- 'Extensive Data Shows Punishing Reach of Racism for Black Boys' (19 March 2018), reference-set row 1, structure 'a group-level rule that individual cases visibly break'. The transferable move: state the finding on the graphic as its own sentence while the individual marks keep the honest texture of exceptions. Applied here as a direct annotation naming the six countries under 60 and their continent, drawn over 229 country shapes that also show Haiti and Nauru sitting low outside that continent -- the rule and its exceptions in one frame."
subject: "the six countries whose 2023 period life expectancy is under 60 years, all of them in sub-Saharan Africa"
comparison: "every drawn country's 2023 figure against every other's, on one five-class scale a reader can read a bracket off"
limits: "Period life expectancy, in the dataset's own words: the years the average person born in that year would live if they met the same chances of dying at each age as people did that year. It is not a forecast of how long a baby born in 2023 will actually live, and the caption says so. 2023 is the most recent year the source carries and every one of its 236 ISO-coded countries has a reading, so no country is missing for want of a year. Our World in Data's own aggregates -- the World, the continents, the income bands, 'Least developed countries' -- are 24 further rows in the frozen file and are dropped: they are not territories and a choropleth may not paint them. Of the 237 coded entities in 2023, 229 find a shape in Natural Earth 1:50m and are drawn; 8 do not, because Natural Earth folds them into the state that administers them (Bonaire Sint Eustatius and Saba, Gibraltar, Guadeloupe, French Guiana, Martinique, Mayotte, Reunion, Tokelau). Their readings exist and this map does not show them. Twelve shapes carry no reading and are drawn as no-data, which is a class on the legend and not a blank."
placement: "inside the article, as an interactive embed the reader can hover"
credit: "Riley (2005); Zijdeman et al. (2015); Human Mortality Database (2025); UN World Population Prospects (2024) -- with major processing by Our World in Data"
effectiveDate: "2026-08-22"
language: "en"
slots:
  - id: 1-life-expectancy-2023
    proves: "that in 2023 every country under 60 years of period life expectancy was in sub-Saharan Africa, and that a reader can get any single country's own figure by asking for it"
    medium: map
    format: web
    reachable: yes
    candidates: ["Choropleth", "Proportional symbol (symbol / bubble map)", "Cartogram"]
    chosen: "Choropleth"
    producer: custom
---

## What the visual shows

One world map, one year. Every country Natural Earth gives this map a shape for is shaded by its
2023 period life expectancy across five classes, and the reader gets any country's own figure --
its name, its years, its class -- by hovering it, focusing it with the keyboard, or reading the
table that ships beside the map.

The annotation states the finding outright: the six countries under 60 years are Nigeria, Chad,
Lesotho, the Central African Republic, South Sudan and Somalia, and all six are in sub-Saharan
Africa. The map keeps the texture that sentence flattens -- Haiti and Nauru sit in the next class
up and are nowhere near that continent, and half of sub-Saharan Africa is above 60 as well.

## Why a choropleth and not the other two

Life expectancy is an INTENSITY over a territory -- years per person born there -- which is what
shading area means and the one thing a choropleth is for
(`map-beat/references/types/choropleth.md`). A proportional symbol would size a circle by a rate,
which is the mistake that sheet's own "when not to use it" names from the other side: a symbol
carries a magnitude, and this number has none. A cartogram would resize each country by population
so that Nigeria and Monaco stop being 900 000 times apart in area; it answers a real objection to
this map and it was rejected because the reader would then be reading two encodings at once, on a
shape they no longer recognise, for a finding that is about WHERE.

## What the map cannot do, and what carries it instead

At world scale a country under roughly 3 000 km2 is a mark a reader cannot hover: Monaco, which
holds the highest reading in the whole file (86.4 years), is a fraction of a pixel. The
accompanying table carries every drawn country in reading order, so the extremes are reachable by
someone the map cannot serve. That is why the annotation is built on the LOW end -- six large
countries a reader can actually see and point at -- rather than on Monaco.
