# The Guardian — "Where can you afford to buy a house?"

- url: https://www.theguardian.com/society/ng-interactive/2015/sep/02/unaffordable-country-where-can-you-afford-to-buy-a-house
- archive: url-list
- type: choropleth, reader-parameterised
- export: web
- readAs: the page as it serves the map at rest, with its own panel

## What it is

A choropleth of England and Wales showing how far a median house price sits beyond a salary the
reader types in. The default is £26,500, and the map recolours as that number changes.

## What it does with information

**The reader's own number is the parameter.** The headline claim is stated against it in words —
"91% of England and Wales would be beyond your means in 2014" — so the map answers a question the
reader asked rather than one the newsroom chose.

**The legend states the unit, not just the ramp**: "Multiple of £25,000 — 2 3 4 5 6 10+", with the
final class open-ended. A reader can read a colour back to a number without leaving the map.

**A second, tiny map repeats the whole country inside the panel**, beside the sentence, so the
claim and its shape sit together while the large map is being explored.

## What it does with style

The pixel route reads the palette as **diverging**, two poles at the measured `#CCCCCC` ground —
a pink-to-red ramp for the unaffordable end and pale blues at the other. Panel type is the
Guardian's own serif for the headline against a sans for the controls.

## What is transferable

- **A legend that names its unit and leaves its top class open** (`10+`), rather than a bare ramp.
- **Repeat the whole at thumbnail size beside the claim** when the main view invites exploration:
  the reader can lose the overview otherwise.
- **Let the reader's own number parameterise the encoding**, where the story is about their
  position rather than a national average.

## What is this piece's own

The Guardian's furniture and its house serif; the £25,000 step.

## What was not verified

Any state after the default — the map recolours on input and only the resting state was read. The
capture includes the site's own navigation and advertising chrome, which is not part of the piece.
