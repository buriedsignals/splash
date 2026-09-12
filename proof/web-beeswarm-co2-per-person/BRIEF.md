---
format: web
type: beeswarm
---

# Beat — Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l'humanité (web)

**Type:** beeswarm. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

The **6** countries emitting 20 t of CO₂ per person or more hold **0,6 %** of humanity. The largest
circle on the page is India — 1,4 billion people at 2,1 t — *below* the median of the 213 countries
(3,1 t). The world average, 4,6 t, already sits above what **64 %** of people emit.

The runner refuses to render if the heaviest emitters hold 1 % or more, if the world average sits
above less than 60 % of people, or if the largest circle is not below the country median. Both
callouts are **derived, not chosen**: the biggest circle and the farthest one out — the two marks a
reader's eye lands on anyway.

## What the web adds

A swarm's argument is the SHAPE of a distribution, and the price it pays is that 213 marks share one
axis and almost none can be named. The static plate names two. **This page names all 213**: every
circle answers with its country, its figure, its population, and **the share of humanity that emits
less than it does** — a percentile computed here over the whole population, and exactly the number
the shape makes a reader want.

## The packing is deterministic, and that is a claim about the picture

Marks are placed in descending order of radius, each at the y closest to the axis that clears every
circle already placed. No force simulation and no random seed: the same file produces the same swarm
on every machine, which is what makes the image a measurement rather than a rendering.

## Two defects the eye caught on the first render

- **The two level rules' labels collided.** The median (3,1) and the world average (4,6) are 1,5 t
  apart on a 40 t axis — 34 px — and the first label read "médi". A level's label belongs to its own
  rule, so the two rows are staggered rather than the rules moved.
- **The callouts were in English.** 213 countries is far past the point where a hand-filed French
  name per country is safe — a wrong translation inside a tooltip is a factual error nobody would
  catch. So the page carries the **source's own names** and says so in its source line, and only the
  two derived callouts, which also appear in the headline's prose and the alt text, are named in
  French.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped** (all the filter's;
this beat declares none).

## Source

Global Carbon Budget 2025 · population 2023, via Our World in Data · 213 countries. `data.csv` is a
byte-for-byte copy of `proof/static-beeswarm-co2-per-person/data.csv`, re-parsed independently here.
