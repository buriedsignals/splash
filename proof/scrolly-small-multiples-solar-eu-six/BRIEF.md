---
format: scrolly
type: small-multiples
---

# Beat — Le solaire faisait moins de 3 % de l'électricité des six plus grands pays de l'UE en 2010 ; en 2024, plus d'un dixième dans quatre d'entre eux (scrolly)

**Type:** small multiples (six line panels). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from
a phone to a wide desktop.

The `small multiples` type in the scrolly format, drawn once per filed direction from the same six countries (the
EU's most populous, a rule fixed before any solar figure was read), readings, claim and assertions as
`static-small-multiples-solar-eu-six`. The static beat predates the design base and is set in English; this one is set
in French through the three filed directions.

## The choreography

The type's one non-negotiable is the shared scale; the scroll draws the panels on it, compares them, then shows what
breaking it would do and takes it back (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | six panels, one scale; in 2010 solar is under 3 % everywhere: 2.4 % in Spain, 0 % in Poland and Romania | **reveal** | a point in each panel, its value beside it |
| 2 | year by year to 2024 | **trace** | a playhead draws every line, the year counting in the header |
| 3 | above 10 % in 2024: Spain, Germany, Italy, Poland | **mark** | a 10 % floor across every panel, the four names in the accent |
| 4 | the six lines on one chart: Spain on top at 20.7 %, France at the bottom at 4.4 % | **merge** | the panels travel onto one chart, each line named at its end |
| 5 | on its own scale France would climb as high as Spain — false, which is why the panels share one | **rescale** | every panel stretched to its own maximum, its own ceiling written inside it |
| 6 | the reading line | **pull back** | the shared scale again: the static plate |

## Precision

- **Laid out in the reader's pixels**: three panels a row on a wide stage, two on a narrow one, every panel the same
  size with the same gutters; tick numbers down the left column only, years along the bottom row only.
- **The trap is labelled while it is shown**: the header reads « échelles propres : trompeur », each panel prints its
  own ceiling, and the next card restores the shared scale.
- **Every sentence is asserted**: the frozen file holds exactly the six, fifteen readings each, every one a share;
  every panel rose; the 2010 maximum rounds up to 3 %; four of six pass 10 %; Spain tops and France closes the order;
  France's and Spain's own-scale fills lie within a fifth of each other.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
