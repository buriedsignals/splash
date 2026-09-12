---
format: web
type: connected-scatter
---

# Beat — Les seize ont tous nettoyé leur électricité, et cinq pèsent moins qu'avant (web)

**Type:** connected scatter. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 2000 and 2024, **all sixteen** countries raised the low-carbon share of their own
electricity — and **five of them now carry less of the sixteen's low-carbon total than they did**.
France gained 4,2 points at home and lost 11,8 points of European weight: it produced more, and the
others produced faster.

The beat refuses to render if any country's own mix got dirtier, if the countries that lost weight
are not a minority, or if the subject did not move right and down.

## Why this form

The two axes are **not the same quantity twice**, and that is the whole reason this type is here: a
country can move right (cleaner at home) and down (a smaller share of the continent's low-carbon
electricity) in the same quarter century. An arrow makes that one gesture; two bar charts make it two
facts a reader has to join.

`the-connector-is-either-furniture-or-the-mark` — here the connector **is** the mark, so it is drawn
in ink weight with a head, not as a hairline between two dots.

## What the web adds

Sixteen arrows crossing one another leave room for about five labels. **Every endpoint answers**
with its country, both of its shares at that date, and the absolute low-carbon generation in TWh
behind them — the quantity two shares can never state between them. Five names are drawn; the other
eleven are named by the pointer.

The pointer resolves in **both** axes (`data-hit="cell"`): thirty-two endpoints scattered over a
plane are not a series, and an x-only answer would name the wrong country.

## Two things the render taught, both now in the shared spine

- **A tick ceiling below the highest mark draws that mark off the frame, silently.** France's own
  2000 weight is 38,4 % and the first pass topped the axis at 30. The ceiling is computed from the
  readings now, and the component throws if any point falls outside its own axes.
- **An absolutely-positioned label is as wide as what is LEFT of its container, not as wide as its
  max-width.** The note anchored at 91 % had 9 % of the plot to lay itself out in, and the
  `translateX(-100%)` that follows only moves the ribbon it already became — a one-line note came
  out five words tall. `noteAnchor` now anchors a right-half label from the **right** edge.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of
`proof/static-connected-scatter-lowcarbon/data.csv`.
