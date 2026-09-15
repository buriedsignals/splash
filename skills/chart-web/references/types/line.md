# Line — in web

Worked example: `proof/web-line-swiss-co2` (2026-09-15), from `proof/co2-suisse`.

- **The gesture is `ask-a-mark`**, on the format's shared `assets/interaction.mjs` and declared in
  `BRIEF.md` through `assets/interaction-plan.ts`: no bespoke vocabulary, because the reader's move
  here is to point at a year.
- **Give the reader the baseline the plate had to choose for them**: a still prints four of 167
  readings and asserts ONE comparison; here each of the 167 years answers with its own value, its
  distance under the peak, the pre-peak year it winds the series back to, and where today stands
  against it.
- **Derive every answer in the runner, from one function**: `woundBackTo` computes both the title's
  reference year and every year's own clause, so the tooltip cannot disagree with the headline.
- **Resolve by nearest x, not by hit-testing the circle**: at 375 px consecutive years are 2 px
  apart; pointer, tap and Left/Right/Home/End share one path and every reading is focusable at build
  time.
- **Refused: a brush or an era filter.** The x-axis IS the encoded variable, so every option takes
  years off the frame — and two of them, 1973 and 1967, are the claim. Refused on rule 5, not taste.
