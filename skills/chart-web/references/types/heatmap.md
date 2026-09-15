# Heatmap — in web

Worked example: `proof/web-heatmap-europe-electricity` (2026-09-15), from `proof/static-heatmap-europe-electricity`.

- **The gesture**: the reader raises the FLOOR and watches which cells survive it.
- **Start from what a ramp cannot do.** Colour ranks; it does not measure — and a sequential ramp's low
  end is close to the ground by construction, which here is 29 cells under 0,5 % and 44 under 5 %. Two
  thirds of the grid is a pale wash that no cell and no key can turn back into a reading.
- **Build it with `chart-web/assets/filter.ts`** in its threshold-as-named-bands form: each band
  reveals a sentence saying how much of a country's electricity the survivors still account for. Pure
  CSS, so it works with the script absent.
- **Give the value twice over**: the cells that carry the argument print their own share, and all 63
  answer with their exact value under the pointer — a cell is a colour and a colour is a bin, so
  either the number is printed or the reader is owed another way to get it.
- **One hue at increasing strength, and order chosen from the answer.** Nine sources are nine columns,
  not nine colours: a qualitative palette would say the sources differ in KIND along the axis meant to
  carry magnitude. Rows order by low-carbon share, columns group renewables-first, so the three routes
  the headline names are three shapes rather than three facts to assemble. The pointer resolves by CELL
  (`data-hit="cell"`) — seven rows share every x.
