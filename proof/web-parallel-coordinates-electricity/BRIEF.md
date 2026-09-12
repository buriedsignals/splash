---
format: web
type: parallel-coordinates
---

# Beat — 5 pays sur 16 tirent plus de 25 % de leur électricité du nucléaire, 10 plus de 20 % de l'éolien (web)

**Type:** parallel coordinates. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Of sixteen European countries in 2024, **five** draw more than 25 % of their electricity from nuclear
and **ten** draw more than 20 % from wind; **two do both — Finland and Sweden.** The correlation
between the two shares across the sixteen is **−0,44**, computed here, not asserted.

## The axis order is the argument

**Only adjacent axes show a relationship.** A crossing between two neighbours is a real inverse; a
line that rises three axes later is nothing. So nuclear sits beside wind — the crossing between them
*is* the claim — and the order is stated in the reading line rather than left to be inferred.

`each-rail-is-headed-by-what-it-is` — every axis carries its own name and **its own ceiling in its own
units**. A parallel-coordinates plate with one shared scale is a lie about seven different
quantities; one with seven unlabelled scales is a picture.

## What the web adds, and it is the defect this form has on paper

Sixteen lines over seven axes is a tangle, and a plate cannot isolate one: a reader who wants to
follow Finland has to trace it by eye through fifteen crossings. Here every vertex answers with its
country and **all seven of its shares at once**. The tangle stops being a defect and becomes the
point — it is the shape of sixteen mixes, and any one can be pulled out of it.

## The hit target is the vertex, not the line, and the verifier forced that

`.line-hit` exists in the shared stylesheet and `initLines` wires it. But every check
`verify-web.mjs` makes probes a mark **at the centre of its bounding box** — which for a path
spanning seven axes is empty space. Built that way, this page reported **47 failures that were not
defects and no failure that was one**. A vertex is a mark with a centre; each carries its whole
country's row, so hitting any of the seven answers the same thing, and `data-hit="cell"` resolves in
both axes because sixteen vertices share every x.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of
`proof/static-parallel-coordinates-electricity-mix/data.csv`.
