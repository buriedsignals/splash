# Sources — Case 1: Share of electricity from solar, by European country, 2024

## Dataset

`data.csv` gives the share of each country's electricity generated from solar power in
2024, for 15 European countries. It includes an ISO3 country identifier column for
mapping.

Columns: country, iso3, solar_share_2024_pct.

## Per-figure provenance

Per-country 2024 solar shares (all fifteen rows):
- Wikipedia — "Solar power by country", 2024 solar share of electricity table
  (compiled from Ember / Our World in Data):
  https://en.wikipedia.org/wiki/Solar_power_by_country

Verified 2024 values used (percent of national electricity from solar):
Hungary 27.3, Spain 21.9, Netherlands 21.1, Greece 19.8, Lithuania 18.8,
Bulgaria 18.2, Germany 17.9, Portugal 17.3, Italy 16.9, Belgium 15.6,
Austria 14.1, Denmark 13.4, Poland 11.3, Romania 9.8, Czechia 5.8.

Underlying data can also be traced to:
- Ember — Yearly Electricity Data (CC BY 4.0):
  https://ember-energy.org/data/yearly-electricity-data/
- Our World in Data — Share of electricity production from solar:
  https://ourworldindata.org/grapher/share-electricity-solar

## EU-27 aggregate figures (used in the closing paragraph)

- Solar reached 11% of EU electricity in 2024 and overtook coal (10%) for the first
  time; solar generation was 304 TWh, up 22% year on year.
  Source: Ember — European Electricity Review 2025, "2024 at a glance":
  https://ember-energy.org/latest-insights/european-electricity-review-2025/
  (coal 10% / 269 TWh; solar 304 TWh; +22% growth)

## Reporting that inspired the article

- Ember's European Electricity Review 2025 coverage ("solar overtook coal in the EU
  for the first time in 2024") and reporting on Hungary leading Europe on solar share.

## Notes

- Every quantified claim in `article.md` maps to a row/value in `data.csv`
  (each country percentage; the 27.3 vs 5.8 spread of "more than 20 percentage points").
- The EU-27 aggregate numbers (11%, coal 10%, 304 TWh, +22%) are NOT in `data.csv`
  by design — they are context in the final paragraph, cited to Ember above. If the
  ② binding stage requires every figure to appear in the data, those four aggregate
  figures are the only ones sourced outside the CSV and can be added as a separate
  "EU-27 average" row if needed.
- Switzerland was excluded from the earlier draft list (it is not in the EU) to keep the
  map dataset EU/EEA-focused; Czechia (5.8%) was added as a verified low-end anchor.
