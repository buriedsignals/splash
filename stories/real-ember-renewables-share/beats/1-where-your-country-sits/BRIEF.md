# Beat 1 — where your country sits

Slot 1 of `../../STORYBOARD.md`. Medium `chart`, format `web`, treatment **Dot strip**, producer
custom (no Datawrapper mapping exists for this treatment in either format).

## The one thing this beat proves

That the world's single renewable-share figure describes almost nobody, and that where a reader's
own country sits is not predictable from it.

## What is drawn

One horizontal lane. 211 dots, one per country or territory with a 2023 row in the frozen file,
each placed by its own renewable share on a single 0–100% axis that runs the full width of the
frame. Vertical jitter only — a dot's height carries no meaning and the y axis has no scale, which
is the type's own contract.

A vertical rule marks the world's 30.3%. A second, lighter rule marks the median country, 26.5%,
because the gap between the two is what "weighted by generation" means and it is otherwise invisible.

Direct labels on the two extremes: the 8 countries at exactly 100% and the 15 at exactly 0%. Those
two groups are the argument, so they are stated on the frame and never gated behind interaction.

## What the web format carries that a still could not

211 marks cannot be labelled. Every one of the readings a static frame would have had to omit is
available on demand and only on demand:

- Hover or tap anywhere in the lane resolves to the nearest dot in two dimensions and names that
  country with its exact share.
- Every dot is `tabIndex=0` with its own `aria-label` and `data-detail`, baked at build time, so the
  page is walkable by keyboard with the script absent entirely.
- A search box moves focus to a named country and holds it lit. It filters nothing and hides
  nothing: with it empty the frame already shows everything the title claims.
- The generic accessible table prints all 211 readings linearly for a reader with no spatial access
  to the picture.

No filter. The beat fails the filter test on requirement 1: the frozen file carries no dimension of
this slice a reader would want to narrow. There is no region column, no income column joined to the
country rows — the income groups exist only as four separate aggregate entities with no membership
list — and inventing a region mapping would be putting data in the file that is not in it. So the
beat writes no fieldset, no CSS rule and no attribute.

No entrance motion. Nothing here builds; there is one state.

## What is deliberately not drawn, and why

**No regional aggregate, and the reason is printed on the frame.** The desk asked that the
multiple-reporting-body problem be named rather than settled quietly. It is in this file and it is
worse than a footnote: five subjects carry two or three series at once, and Europe's 2023 reads
46.64% (Energy Institute), 40.04% (Our World in Data's own aggregate) and 39.74% (Ember) — a spread
wider than the whole 2015–2023 rise in the world figure. Nothing in the file can choose among them,
so nothing regional is drawn and the Europe case is printed as the beat's own caveat.

**Not 2025, though the file has it.** 2025 holds 91 of 214 countries and 2024 holds 196. A
latest-year strip would drop more than half the world without saying so. 2023 (211) is the last
near-complete year.

**Not the full 1900–2025 range the article repeats.** Before 1985 the file holds two entities, the
United Kingdom and the World, and the United Kingdom's own series starts in 1920.

## Words on the frame

- Title: the confirmed takeaway, shortened to fit one line of a chart's own headline.
- Caveat: the two-body disagreement and the 2023 choice.
- Source: `Ember (2026) and other sources, with major processing by Our World in Data`, the file's
  own metadata line, quoted verbatim in the article.

## Colours and type

`../../PALETTE.md` — ground `#16191B`, one accent `#1B7F4B` (the subject's own convention, 3.52:1).
`../../TYPEFACE.md` — `Helvetica, Arial, sans-serif`, `origin: default`, because `NEWSROOM.md`'s
Space Grotesk does not resolve on this machine. Neither is named as a literal anywhere in this
beat's code.
