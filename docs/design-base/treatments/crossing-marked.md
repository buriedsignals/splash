# crossing-marked

- kind: derived
- name: The year the series crosses its reference level is drawn and named
- applies: the beat declares a reference level AND its series crosses that level after its peak
- draws: annot
- priority: 8
- detect: the delivered artifact carries a mark at the crossing point's coordinates and a text run
  within one line-height of it naming the crossing year
- provenBy: proof/co2-suisse/renders/*.png

## The rule

When a beat is about a series returning to a level, draw the year it returns.

## Why it needs no published precedent

`proof/co2-suisse/crossing-geometry.ts` **already computes it** — `crossing` is the first reading
after the peak at or below the reference — and nothing was drawing it. This treatment borrows
nothing from anybody: it renders a fact the beat's own geometry holds and its own title claims.

That is why the two-publication floor does not apply. That floor exists to stop a newsroom's HABIT
being copied without its logic (`doctrine/references/anti-patterns.md`, closing entry). Applied to a
fact the data contains, it refuses honest work — and it did, for a day, on this exact treatment.

## What it found the first time it was drawn

The crossing came back **2023, not 2024**: 31,98 Mt against the 32,5 Mt level, while 2024 reads
32,07 Mt — *higher* than the year before. The beat's title ("En 2024, la Suisse a émis moins de CO₂
qu'en 1967") stays true and states strictly less than the data supports, and the chart could show
neither the earlier crossing nor the uptick. **A treatment surfaced an editorial fact the graphic
was hiding.** Not decoration.

## What limits it

A series that crosses many times has many crossings, and drawing all of them says nothing. The
predicate takes the first crossing AFTER the peak, which is the one a return-to-level story is
about; a beat whose story is the oscillation itself needs a different treatment.
