# Sources — Case 4: Global diffusion of nationwide same-sex marriage (2001–2025)

## Dataset

`data.csv` lists every sovereign country where same-sex marriage became legal **nationwide**, with
the ISO-A3 code and the **year the nationwide law/ruling took effect**. 36 countries, 2001–2025.
Columns: `iso_a3`, `country`, `year`.

This is a **temporal-diffusion** dataset: the measure is the *year of adoption per region*, i.e.
change-over-time distributed across a world map. Every row is a discrete state-change event.

## Per-figure provenance

| Figure(s) | Source |
|---|---|
| Full country-by-year effective dates (Netherlands 2001 … Thailand 2025) | Wikipedia — Timeline of same-sex marriage: https://en.wikipedia.org/wiki/Timeline_of_same-sex_marriage and Legal status of same-sex marriage: https://en.wikipedia.org/wiki/Legal_status_of_same-sex_marriage |
| Netherlands first (1 April 2001) | Wikipedia — Same-sex marriage in the Netherlands |
| South Africa 2006 (first in Africa) | Wikipedia — Same-sex marriage in South Africa |
| United States 2015 (Obergefell v. Hodges, Supreme Court) | Wikipedia — Obergefell v. Hodges |
| Taiwan 2019 (first in Asia, effective 24 May 2019) | Wikipedia — Same-sex marriage in Taiwan |
| Estonia 2024 (first Baltic / post-Soviet, effective 1 Jan 2024) | ERR News: https://news.err.ee/1609209284 ; Human Rights Watch: https://www.hrw.org/news/2023/06/22/estonia-legalizes-same-sex-marriage |
| Liechtenstein 2025 (effective 1 Jan 2025) | Library of Congress Global Legal Monitor: https://www.loc.gov/item/global-legal-monitor/2024-08-14/liechtenstein-marriage-act-amended-to-allow-same-sex-marriage |
| Thailand 2025 (first in Southeast Asia, effective 22/23 Jan 2025) | Library of Congress: https://www.loc.gov/item/global-legal-monitor/2025-03-18/thailand-law-recognizing-same-sex-marriage-takes-effect/ ; NPR: https://www.npr.org/2025/01/23/g-s1-44322/thailand-same-sex-marriage-law |

## Notes on scope / honesty

- **"Effective year" convention:** the year the nationwide law or court ruling *took effect*
  (not the year it was passed). Where a country legalised via a court ruling that flipped the whole
  nation (e.g. USA 2015, Taiwan 2019), that year is used.
- **Nepal deliberately excluded.** Nepal has only an interim "temporary register" (2024) that does
  not grant equal legal rights (Human Rights Watch, Dec 2023; NIDCRD statement, May 2025). It is not
  full nationwide legalisation, so it is left out rather than misrepresented.
- **Sub-national / partial cases excluded** (e.g. Mexico's state-by-state path before national
  effect) to keep one clean "nationwide effective year" per sovereign country.
- Every claim in `article.md` (each country's year, "first in Africa", "first in Asia", the 2015
  tipping point, the two 2009–2013 clusters) is derivable from `data.csv`. No number is invented or
  interpolated.
- ISO-A3 codes are the standard ones (NLD, BEL, ESP, ZAF, USA, TWN, THA, …) so the data joins to the
  `world.geojson` basemap the native map/scrolly engines require.
