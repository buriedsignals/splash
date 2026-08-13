# All three PNGs here carry a false claim. Do not read a number off them.

Written 2026-08-09. **Read this before citing anything in this folder.**

These are the three renders from a 2026-08-08 three-agent trial.
Every one of them states something the data does not support. Two of the three render a series that
exists **nowhere in this repository**, under the **Federal Statistical Office**'s name.

| File | Standing |
|---|---|
| `beat-b-migration.png` | **SUPERSEDED — invented series, false years, false credit** |
| `beat-c-life-expectancy.png` | **SUPERSEDED — invented series, a year that does not exist, credit names an institution that does not publish this figure** |
| `beat-a-norway.png` | **Data and credit sound; the title is false against its own chart** |

---

## Beats B and C: the same files as the comparison dossier

`beat-b-migration.png` and `beat-c-life-expectancy.png` are **byte-identical** to
`../comparison/3-MIGRATION--twin.png` and `../comparison/2-VIE--twin.png` (SHA-256 `76b0fa59…` and
`de03f5fa…`). The full recomputation, with the frozen data and the corrected renders to read
instead, is in **[`../comparison/SUPERSEDED.md`](../comparison/SUPERSEDED.md)**. In short:

- **Beat B** labels `1997: −1.9` and `1998: −3.4`. The frozen FSO table (`../migration/data.csv`)
  has its two negative years at **1996 (−5.807k)** and **1997 (−6.834k)**, and **1998 is +1.177k —
  positive**. The series starts 1991, not 1990, and peaks at 139.118k, not ≈84k.
  Corrected render: [`../migration/migration-still.png`](../migration/migration-still.png).
- **Beat C** labels `2020 82.9` (truth **83.0626 → 83.1**) and draws its endpoint, **`84.2 years`, at
  2024 — a year the frozen series does not contain**; it ends 2023. Its credit, *Federal Statistical
  Office*, names an institution that publishes only **sex-split** life expectancy, so the combined
  figure shown is not one that institution publishes.
  Corrected render: [`../life-expectancy/life-expectancy-still.png`](../life-expectancy/life-expectancy-still.png).

## Beat A: the title is false, but the numbers and the credit are not

The audit noted this beat was not recomputable because this folder commits no data. It is
recomputable — Norway's annual territorial CO₂ series is frozen in a sibling beat,
`../vidz-bump-emitter-rank/data.csv` (Norway, 1990–2024, same OWID / Global Carbon Budget
provenance the render credits), cross-checked at 2024 against
`../vidz-bar-column-top-emitters/data.csv`.

Recomputed:

- **1993 = 35.948 Mt** — the render's dashed reference reads `1993: 35.9 Mt CO₂` ✔
- **2024 = 37.183 Mt** — the render's accented point reads `37.2 Mt CO₂` ✔
- Title: *"Norway emitted less CO₂ in 2024 than in any year since 1993."* Of the 31 years from 1993
  to 2023, exactly **one** is below 2024 — **1993 itself, at 35.948 Mt**. The claim is **false**, and
  the chart shows it: the accented 2024 dot sits visibly **above** the dashed 1993 rule.

So beat A is a **title** defect only. Its two rendered values are correct roundings of the real
series and its credit matches the data's real provenance. That is a different and much smaller
failure than beats B and C, where the series itself was invented and the credit was wrong. The
distinction is worth keeping: only beat A is the kind of claim-grounding failure a takeaway-versus-
data gate would catch. Beats B and C would sail through such a gate — their titles agree perfectly
with the numbers they were given. What was wrong was the numbers.

## Why these were marked and not re-rendered

The folder contains three PNGs and no data, component, or render script. The three agents each
worked in a separate Splash root outside the repository; those roots are gone, and beats B and C read their series from
`/tmp/video-twin/`, which is gone too. Nothing in this repository can regenerate any of these three
images. They are kept as the record of what three independent agents rendered on 2026-08-08 — which
is what the trial was for — with their standing as evidence of any *number* removed by this notice.
