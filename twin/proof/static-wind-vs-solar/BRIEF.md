# Beat — Switzerland is the outlier: solar beats wind

**Type:** grouped bar. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560.

## Claim

Switzerland is the only one of six countries where solar generates a larger share of electricity
than wind; in France, Germany, Norway, Poland and Sweden, wind's share is the larger of the two.

## Subject and accent

No single hue is reserved as "the subject" here — the claim compares two series across six
categories, so colour carries series identity (wind vs solar), per `references/types/grouped-
bar.md`'s own carve-out for a legend when direct labelling can't do the whole job alone. The
Switzerland reversal is named directly with an ink annotation and leader line, not a third colour.

## Source

Ember & Energy Institute, Statistical Review of World Energy (2025), via Our World in Data ·
`electricity-mix.csv`, filtered client-side to Switzerland, France, Germany, Norway, Poland,
Sweden — the URL-level `country=` filter param does not reliably filter every OWID indicator
variant (`twin-intake/references/ourworldindata-csv-filter-trap.md`), confirmed by checking
distinct entity counts before trusting any of tonight's fetches.

## What went wrong, caught by looking

The first render clipped the source-date line and ran the Switzerland annotation off the right
edge of the frame — both fixed by wrapping the source line on measured width and clamping the
callout's anchor inside the plot instead of centring it on a bar that sits at the very edge.
