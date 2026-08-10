# Our World in Data CSV filter trap

Our World in Data's grapher CSV endpoint accepts a `country` parameter that **appears to filter but does not** without an explicit `&csvType=filtered` parameter.

## The trap

**Without `csvType=filtered`:**
```
https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv?country=~CHE
```
Returns HTTP 200 with **10,582 rows** — the entire global dataset across 249 distinct countries, regardless of the `country` parameter.

**With `csvType=filtered`:**
```
https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv?country=~CHE&csvType=filtered
```
Returns HTTP 200 with **26 rows** — only Switzerland's data.

A journalist fetching the first URL to compute "Switzerland's share" will compute it across all 249 countries and publish a wrong number under Our World in Data credit, because the HTTP 200 gave no warning.

## The rule

**Always verify a fetched dataset by counting rows and checking the distinct values it actually contains.** Do not trust that the URL parameters did what you meant. A 200 status code means the server understood the request, not that it gave you what you asked for.

## How to check

After fetching, count rows: `csv | wc -l`. List the distinct values in a country/region column: `csv | cut -d',' -f2 | sort | uniq | wc -l`. If you asked for Switzerland and got 249 countries, the parameter did not work.

In `freezeSource`, this is part of why `profile` counts `distinct` per column — it is your first check that the data arrived as expected.
