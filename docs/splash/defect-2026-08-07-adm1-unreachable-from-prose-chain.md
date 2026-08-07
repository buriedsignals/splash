# Defect — three faults found on one journalist run (2026-08-07) — CLOSED

Opened by a real `/using-splash` run (Heidi.news, « Pourquoi les prisons genevoises sont-elles
pleines à craquer ? »), run dirs `exports/prisons-genevoises` and `exports/prisons-map`.

> **CLOSED 2026-08-07.** All three are fixed, each proven on a render rather than on a config.
> The note is struck rather than left standing: a defect note that still lists what is fixed
> becomes a to-do list nobody trusts, and this file had already become one once — it kept its
> "the loop never applies the charter" title for hours after that had been closed and proven.

## 1 — an admin-1 choropleth could not be produced from the prose chain

The chain has no `orient` step, so `config.featureIdsByValue` was never written and every
admin-1 map — Swiss cantons, French départements, US counties — was offerable, validatable and
unbuildable.

**Closed** by `skills/map-native/src/adm1-backfill.ts`, called at the top of both native
producers. The join is re-pointed at the column that actually resolves (`canton_code` = "CH-GE"
resolves nothing; `canton` = "Genève" resolves 4/4), a declared key that DOES resolve always
wins, and the journalist's confirmed storyboard is carried across the re-point. Proven on a
produced render, plus a keyless produce-level test on each producer. `dot-density` and
`cartogram` are deliberately excluded — their components pin the join key to `iso_a3` — and now
carry their own refusal on both chains (`skills/map-native/src/region-join-support.ts`).

## 2 — the interactive choropleth popup omitted the space before a word unit

Shipped « Genève — 157détenus / 100 000 hab. » beside a legend that read « 43–65,8 détenus /
100 000 hab. » on the same render.

**Closed**: both renderers build that string in one place (`lib/core/region-popup.ts`), and the
cartogram and hex-grid callouts route through the shared formatter too. A `%` prints identically
either way, which is how this survived every earlier review — the word-unit case is the asserted
one now.

## 3 — the loop chain never applied the newsroom house palette to a map

`NEWSROOM-PROFILE.md` declared `palette: ["#d5121e"]` and the map shipped default blue. The prose
chain applied the charter through `mergeProfileDefaults`; the loop had no equivalent, and `Decor`
carried the profile without ever handing it to a map assembler. Worse than a missing feature: the
INPUT phase announces « j'applique la charte » in words.

**Closed** at `assemblerFor` (`lib/loop/assemble/index.ts`) — one wrap covering every engine,
with the policy *imported* from `mergeProfileDefaults` rather than restated, so the two chains
cannot drift on what a charter means. Proven on the pixels: legend swatches are exactly
`houseRamp("#d5121e", 5)`, Genève's polygon `rgb(40,92,160)` → `rgb(142,34,34)`.

Proving the other half of a charter — the **ground** — then found that a dark charter could not
produce at all: `snap-theme.mjs` wrote its debug screenshot into the delivery directory, so the
run died on *"static format requires exactly one image file, found 2"*. The first newsroom to
write `theme: dark` would have been the one to find it. Also closed, with pixel proofs for a
dark, a navy and a pink ground.

## Cost on the run

The journalist was told the map could not be produced and was offered the chart fallback. No
visual was shipped for the map. Nothing was patched, nothing hand-planted.
