---
size: landscape
type: marimekko
format: static
medium: chart
grounding: supported
---

# Beat — Coal is 12 % of these six countries' electricity, and it sits in two columns

**Type:** marimekko (variable-width stacked columns). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Six European countries, 2024, 1 637.5 TWh. **Coal is 200.9 TWh — 12.3 % of the six — and 99.2 % of
it is generated in two countries, Germany and Poland.** Every other column's coal band is a hairline
or nothing at all: France's is 0.2 % of its own mix, Sweden's, Norway's and Switzerland's round to
zero.

Column WIDTH is the country's own generation, column HEIGHT is its mix, so a band's AREA is a real
quantity in TWh — which is what this form is for and what a set of six percentage columns could not
say.

Every figure is computed in `render-directions.mjs` and asserted before the render: the coal share of
the six, the two countries holding it, and — because a marimekko's areas are a product of two
scales — that each column's bands sum to its own total.

## Why this form, and the refusal it carries

`references/types/` and this base's own harvest agree on the failure: **a variable-width chart whose
narrowest units fall below a few pixels has stopped encoding its second dimension**, and the IEA's
marginal cost curve is the corpus's worked negative case. This beat measures its own narrowest
column before drawing — Switzerland, 4.8 % of the total, 39 px at this frame — and refuses rather
than draws when that falls under the floor a reader could see.

## What the harvest gave it

Seven references, three independent publications: the IEA's four cost curves, Ferdio's two
specimens, and Visual Capitalist's smoking-rates plate. Two rules two or more of them agree on are
filed — the width dimension is named on the plate, and a narrow cell degrades its label instead of
dropping it — and the palette question they answer differently is settled in `PALETTE.md`.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh, 2024, frozen beside this beat as `data.csv`.
