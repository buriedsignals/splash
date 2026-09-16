---
takeaway: "In 2024, four countries -- Russia, Turkey, Germany and Poland -- generated the large majority of all coal electricity burned in Europe; Russia alone, the highest of any European country, generated 215 TWh from coal."
subject: "coal-fired electricity generation by country, Europe, 2024"
comparison: "each country's 2024 coal generation, ranked against the others"
limits: "one calendar year (2024) only; generation volumes in TWh, not capacity, cost or emissions; covers only the countries carried by this panel"
placement: "article web page, scroll-driven interactive embedded inline"
credit: "Source: Ember, Energy Institute -- Statistical Review of World Energy (2025), via Our World in Data"
effectiveDate: "2026-09-16"
grounding: supported
language: en
claimShape: maximum
claimColumn: coal_generation__twh
claimEntity: Russia
slots:
  - id: "1"
    proves: "coal power in Europe is now concentrated in a handful of countries, not spread evenly across the continent"
    medium: map
    format: scrolly
    reachable: yes
    intent: "show where the volume of coal generation is concentrated across the continent, texture rather than a single per-country number"
    candidates: ["Dot density map", "Cartogram"]
    chosen: "Dot density map"
---

Coal power in Europe is not evenly spread. Four countries -- Russia, Turkey, Germany and Poland --
account for the large majority of what is burned; the other twenty-one coal-burning countries in
this panel each contribute a small remainder, several under one TWh. A dot-density map, one dot per
fixed slice of generation, is the honest way to show that texture: dense clusters over the four
holdouts, sparse dots elsewhere, with the "1 dot = N TWh" key making the density readable as a
number and not just an impression.
