# Eight of these PNGs are superseded captures. Do not read a number off them.

Written 2026-08-09. **Read this before citing anything in this folder.**

Eight images in this directory render a **net-migration series and a life-expectancy series that no
data in this repository supports**, and credit both to the **Federal Statistical Office** — an
institution that does not publish the life-expectancy figure they show at all. They are kept as the
record of what was rendered on 2026-08-08, not as evidence of any number.

| File | Standing |
|---|---|
| `3-MIGRATION--twin.png` | **SUPERSEDED — false data, false credit** |
| `3-MIGRATION--twin-d3.png` | **SUPERSEDED — false data, false credit** |
| `3-MIGRATION--main-datawrapper.png` | **SUPERSEDED — false data, false credit** |
| `3-MIGRATION--main-chartnative.png` | **SUPERSEDED — false data, false credit** |
| `2-VIE--twin.png` | **SUPERSEDED — false data, false credit** |
| `2-VIE--twin-d3.png` | **SUPERSEDED — false data, false credit** |
| `2-VIE--main-datawrapper.png` | **SUPERSEDED — false data, false credit** |
| `2-VIE--main-chartnative.png` | **SUPERSEDED — false data, false credit** |
| `1-CO2--*` (four files) | Sound — re-verified against frozen data, see §4 |
| `video-*`, `ranking-*`, `map-*` | Outside this notice |

---

## 1. What happened

Both beats were rendered from series that lived only in `/tmp` and were **invented**. The two
commits that fixed the beats say so in their own words:

- `5b5760b1` (2026-08-09 04:37) — *"the old `/tmp/video-twin/migration.csv` turns out to have been
  an invented series (a suspiciously straight decline from 15.3 to 1.5 across 2000-2024)"*
- `f80983f9` (2026-08-09 04:36) — *"the old `/tmp/video-twin/life-expectancy.csv` turns out to have
  been an invented, suspiciously smooth series"*

These PNGs were committed at **2026-08-08 13:54** (`75201458`). The corrections landed about
**15 hours later**. Neither the images nor the prose citing them were re-run.

## 2. Migration — the recomputed truth

Computed from `../migration/data.csv` (the frozen FSO table, 34 rows, **1991–2024**):

| | Rendered here | Truth in the frozen data |
|---|---|---|
| Negative years | 1997 and 1998 | **1996 and 1997** |
| First negative | −1.9k | **−5.807k** (1996) |
| Second negative | −3.4k | **−6.834k** (1997) |
| 1998 | shown below zero | **+1.177k — positive** |
| Series start | 1990 | **1991** |
| Maximum | ≈84k | **139.118k** (2023) |
| 2024 | ≈62k (`main-chartnative` end label reads 62.4) | **82.792k** |

Every negative on these images is on the wrong year, at the wrong value, and one of the two years
labelled below zero was a year of **net immigration**. The title *"Twice since 1990"* also predates
the data: the FSO table starts in 1991, which is why the corrected beat reads *"Twice since 1991"*.

The credit *"Federal Statistical Office"* is the right institution for migration — it is the
**numbers** that were not theirs.

**The corrected render is in the tree: [`../migration/migration-still.png`](../migration/migration-still.png)**
— *"Twice since 1991"*, `1996 · −5.8k`, `1997 · −6.8k`, axis −20k to 140k.

## 3. Life expectancy — the recomputed truth

Computed from `../life-expectancy/data.csv` (OWID's unedited export, 148 rows, **1876–2023**):

| | Rendered here | Truth in the frozen data |
|---|---|---|
| 2020 label | 82.9 | **83.0626** → rounds to **83.1** |
| 2023 label | 84.0 | 83.9536 → rounds to 84.0 ✔ |
| Endpoint | **84.2 years at 2024** | **2024 does not exist in the series.** It ends 2023. |
| 2019 reference | (dashed, unlabelled value) | 83.7804 |
| 2022 | ≈83.5 | **83.2003** |
| Credit | Federal Statistical Office | **UN World Population Prospects (2024), via Our World in Data** |

The credit is the worse half. Per `f80983f9`, the FSO publishes **only sex-split** life expectancy
(Hommes / Femmes) — there is no combined figure to plot without averaging two series by hand, which
`../life-expectancy/render.mjs` itself calls *"an invented number wearing a real institution's
name"*. **The figure on these four images is not one the named institution publishes.** That is this
project's own named worst class of defect.

The endpoint is the second half: `84.2 years` is drawn at a year for which no row exists anywhere in
this repository.

**The corrected render is in the tree: [`../life-expectancy/life-expectancy-still.png`](../life-expectancy/life-expectancy-still.png)**
— credited *"UN World Population Prospects (2024), via Our World in Data · data 2023"*,
`2020 · 83.1 yrs`, ending at 2023.

## 4. The CO₂ case is sound — checked, not assumed

`co2-suisse` also read from `/tmp` and was frozen the same night (`3f093471`), so the four
`1-CO2--*` images were checked rather than presumed clean. Recomputed from `../co2-suisse/data.csv`
(OWID / Global Carbon Budget, 167 rows, 1858–2024):

- `Niveau de 1967` drawn at **32,5** → 1967 = **32.5270 Mt** ✔
- end label `2024 · 32,1 Mt` → 2024 = **32.0717 Mt** ✔
- `pic de 1973` → the series maximum is **1973, at 46.2049 Mt** ✔
- title *"En 2024, la Suisse a émis moins de CO₂ … qu'en 1967"* → 32.072 < 32.527 → **true** ✔
- credit *"Global Carbon Budget 2025, via Our World in Data"* matches the frozen file's provenance ✔

`3f093471` records the same result independently: freezing the data changed nothing on screen,
because that script already filtered by entity at read time.

## 5. Why these were marked and not re-rendered

A faithful re-render is not available, for four reasons, each checkable:

1. **This folder holds pixels and nothing else.** `git ls-files twin/proof/comparison` returns 18
   PNGs — no data file, no component, no render script, no manifest. Nothing here can be re-run.
2. **The input is gone.** Both series lived in `/tmp/video-twin/`, in a temp directory belonging to a
   run that ended on 2026-08-08.
3. **Half of the eight are not ours to re-render.** `main-chartnative` and `main-datawrapper` were
   produced by separate agents in the established engine's own tree, one of them against a live
   Datawrapper API. They cannot be reproduced from this worktree at all.
4. **One of them is deliberately a record of a build that no longer exists.**
   `3-MIGRATION--twin.png` is the pre-switch build and `3-MIGRATION--twin-d3.png` is the after.
   Re-rendering it with today's code would delete the *before* half of that comparison.

Deleting them would erase evidence about **layout** — axis fitting, assertion-versus-geometry,
where the one emphasised label lands — and those read the same whatever series is underneath. So
the pixels stay byte-identical as the record of
what was rendered, and this notice removes their standing as evidence of any number.

## 6. One more fact a reader should have

`2-VIE--twin.png` and `3-MIGRATION--twin.png` are **byte-identical** to
`../trial/beat-c-life-expectancy.png` and `../trial/beat-b-migration.png` (SHA-256
`de03f5fa…` and `76b0fa59…`). The trial run was committed at 2026-08-08 11:35, the head-to-head at
13:54: for two of its three static cases, the twin's side of the comparison **is** the trial's
render, reused rather than produced for the head-to-head. The two folders are therefore not
independent evidence of each other.
