---
format: web
type: column
---

# Beat — La Chine a émis plus de CO₂ en 2024 que les 5 pays suivants réunis (web)

**Type:** bar and column (ranking, vertical columns). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Of the ten countries that emitted the most CO₂ in 2024, China's **12,29 Gt** exceeds the next
**five** added together (**11,65 Gt**), and is 2,5 times the United States' 4,90 Gt. The ten
together carry **68,9 %** of the world total.

Every figure is computed in the runner from the frozen file and printed before the render. The ten
members and their order are a ranking, not a list: 215 rows whose `Code` is a bare ISO-3166 alpha-3
are kept and 32 OWID aggregates dropped, both counts printed, which is what stops "Asia" from
topping a chart of countries. **"the next five" is a search**: countries below the subject are added
one at a time and the count stops at the last one still under its total. If the data moved so the
answer were three, the headline would say three; fewer than two and the beat throws rather than draw
the comparison.

## What the web adds, and why it is not the plate repeated

Ten bars is few enough that the static plate labels every one, so "hover for the value" would be the
same numbers a second time — the repetition `web-discipline.md` refuses. The reading this page adds
is **derived** and the plate has no room for it: for every country, **how many of the countries
below it in the ranking you must add together before they match it.** That is the headline's own
arithmetic asked of all ten, computed over the whole 215-country ranking rather than over the ten
drawn — the United States needs 2, India 3, Germany 2, China 6.

Everything the plate states is drawn unconditionally: the ten columns, their printed values, the
bracket and its sum, the caveat, the reading line and the source, all present with JavaScript off.

## Treatments spent

- `every-bar-labelled-lets-the-axis-go` — each column prints its own number, so the page carries a
  **zero baseline and a stated unit instead of a value axis**. A length encoding still needs its
  zero and has one; what it does not need is a ruler nobody reads once every bar is written.
- `accent-marks-the-thread` — one column is the subject and carries the direction's accent; the
  other nine are one neutral step off the direction's own ground, taken to the non-text floor. A
  ranking where every bar shouts has no subject.

The bracket is drawn where the comparison is made, spanning exactly the columns it adds up, so a
reader can count the bars under it rather than trust a sentence.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped** (all five the
filter's; this beat declares none: the ranking carries no dimension a reader would narrow, and the
default view already shows everything the title claims).

## Source

Global Carbon Budget 2025, via Our World in Data · 2024. `data.csv` is a byte-for-byte copy of
`proof/static-bar-top-emitters-2024/data.csv`, re-parsed independently here.
