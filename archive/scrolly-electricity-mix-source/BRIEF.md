---
format: scrolly
type: stacked-bar
---

# Beat — La Norvège tourne à 99 % de renouvelables, la Pologne s'appuie sur le fossile (scrolly)

**Type:** stacked bar (100 %). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `stacked bar` type (100 %) in the scrolly format, drawn once per filed direction from the same six countries, three
families and claim as `static-electricity-mix-source`. That static predates the design base and is set in English with
a bespoke palette; this beat is set in French through the filed directions — see `PALETTE.md`.

## The choreography

A 100 % stack is read from its base; the scroll fills the columns one family at a time, then changes which family
stands on the base (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | six countries in 2024, each column 100 %; renewables first: 99 % in Norway, 27 % in France | **grow** | the renewable segments, sorted by share |
| 2 | nuclear on top: 68 % in France, 31 % in Switzerland, 29 % in Sweden; none elsewhere | **grow** | the nuclear segments |
| 3 | fossil closes every column: 69 % in Poland, 41 % in Germany | **grow** | the fossil segments fill to 100 % |
| 4 | sorted by fossil share, fossil on the base: Poland first | **reorder + flip** | the columns travel; fossil slides to the base, the low-carbon families ride on it |
| 5 | renewables and nuclear together: Sweden, Norway and Switzerland above 98 % low-carbon, France at 95 % | **merge** | nuclear takes the renewables' hue, one share written |
| 6 | the reading line | **pull back** | the static plate, sorted by renewables |

## Precision

- **Laid out in the reader's pixels**: six columns, 0 to 100 % up; a segment's share written inside it when its height
  holds the number, in the ink that reads on its fill; a phone drops the sign and staggers the names on two rows.
- **Every sentence is asserted**: every source column in one family, each column's families summing to 100 %, Norway
  the highest renewable share at 98.5 % or more, Poland the highest fossil share at 69 %, France, Switzerland and Sweden
  the only nuclear countries, Norway, Sweden and Switzerland the only ones above 98 % low-carbon, France between 90 and
  98 %.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
