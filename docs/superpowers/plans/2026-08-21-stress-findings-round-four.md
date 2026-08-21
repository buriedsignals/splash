# Stress findings, round four — the raw record

**Source:** the round-four stress test of 2026-08-21. Four stories, six beats, the first
multi-beat story this repo has ever produced and the first stress stories ever DELIVERED.

- `stress-p-transport-ridership` — three beats (chart/static, chart/web, chart/static), all
  delivered, `whereIs → done`
- `stress-q-safety-incidents` — one beat (chart/static), delivered, `whereIs → done`
- `stress-r-greek-schools` — one beat (chart/static), delivered
- `stress-s-unspent-fund` — **no beat**, and that is the correct answer

## Why this round targeted what it did

Three rounds had exercised production and nothing after it. Measured before dispatching: `export/`
was **empty in all fifteen** stress stories from rounds one to three, and every one held exactly
one beat. So round four aimed at the ground no round had touched — several beats in one story,
the `deliver` phase, a headline the data refutes once you divide by a denominator, a non-Latin
script with long labels and a corrupt cell, and a story whose honest answer is one number.

## The findings, by weight

### The editorial check is the round's centre of gravity

| # | finding |
|---|---|
| **1** | `groundTakeaway` reports **"3 of 3 claim(s) confirmed"** on per-100k rates matched against a raw-count column by coincidence — including `100`, the "k" in "100k" |
| **2** | `resolveSuperlative` can never decide anything: it needs rows, and `profile.json` has never carried rows. 21 of 21 stories, every superlative, always `unverifiable` |
| **3** | 8 of 12 ordinary superlatives are invisible to the vocabulary — including `the worst`, the false headline this round was built around |
| **4** | `groundingScalar` discards `coverage` and closes G1 `supported` on one tautological match (`2026` inside `year [2026, 2026]`) |
| **5** | Nothing anywhere reasons about a count against its denominator. Four stories carry one; two had already shipped |
| **6** | A corrupt cell silently disarms the check for the whole column, and the resulting `unverifiable` is indistinguishable from a genuinely hard claim |

### Two gates that disagree, at both ends of the phase

| # | finding |
|---|---|
| **7** | `whereIs → {"phase":"delivery","missing":[]}` on a beat `materialise` refuses: `where.mjs` reads `OUTPUT-REVIEW.json` only inside `feedbackRevisionState`, behind a `FEEDBACK.md` that cannot exist before a first delivery. Nothing upstream ever writes that record, and no phase-owning SKILL.md names it |
| **8** | `whereIs → done` while every export still carries `.another-format: pending` and `.other-subjects: pending` |
| **9** | `language` is required by `deliver` and is in neither Gate 2's `REQUIRED_SCALARS`. The refusal is well written and fires after the storyboard, palette, component, render and approval are all done |
| **10** | preflight says hosted embed is closed (403); `offerForms` offers it, because it checks for the presence of env vars, not the probe result |

### What ships when nobody is looking

| # | finding |
|---|---|
| **11** | An **invented source** — "compiled by Buried Signals" — printed on all three of P's delivered artefacts. The article names no source; `credit` is required and has no honest empty value |
| **12** | R's delivered chart says the Peloponnese has **no 2026 figure** and that Eastern Macedonia and Thrace has **392 schools**. Both false. Two independent de-collision passes disagree by one row when a value is null |
| **13** | R's own first version drew a 1104-school region above an 1802-school one. Caught only by opening the PNG |
| **14** | `types/slope.md` REQUIRES label de-collision and no skill provides a helper for it — so every author writes it again, and one beat produced two data-integrity bugs from one hand-rolled pass |
| **15** | A `--` reaches Q's visible footnote, its `<desc>`, and the alt text in its hand-over. The only reader-visible instance in the tree |

### Machinery that has quietly stopped working

| # | finding |
|---|---|
| **16** | **All eighteen `chart-web` example runners are dead** on round two's own `assertRecordedLanguage` fix, callers never migrated. `chart-web/SKILL.md:29` warns about this exact failure from a previous occurrence; `:287` still tells a reader to run a dead one. Green suite both times, because the suite exercises the seed |
| **17** | `TYPEFACE.md` — five render paths refuse without it, **nothing writes it**, no movement proposes it, no gate checks it |
| **18** | `SUBJECTS.md` — same shape. `exchange.md` ⑩ requires it; `grep … \| grep -i write` returns nothing |
| **19** | No slopegraph can pass `verify-web`: the HOVER check probes bounding-box centres, which two crossing lines share exactly. The format's own committed slopegraph fails |
| **20** | `runPreflight` has no default for `fetchFn` and reports every capability closed, with a reason a journalist reads as "MapTiler is down" |
| **21** | `chart-web`'s mechanism is not vendored into `shared/`, so a story beat must import four levels up into `skills/` — a path that would not resolve in an installed root |

### The recommender

| # | finding |
|---|---|
| **22** | `chart.streamgraph` recommended **first, confidently, zero unresolved requirements**, for a one-row table. Of 46 requirements, 2 consult row count |
| **23** | `year` is counted in both `facts.numeric` and `facts.temporal`, so a (year, value) table satisfies `multiple-series` on the strength of its own x-axis — 9 of 21 stories. Meanwhile `ground-claim.mjs` DOES exclude the year column: two modules in one skill, opposite answers |
| **24** | A chosen treatment is never checked against its own sheet's *When NOT to use it* — a six-row scatter closed the gate. And `assertDistinctWays` compares names, so it accepts `["Bar and column","Lollipop","Treemap"]` though the lollipop sheet calls itself "a bar, minus the fill" |
| **25** | No producer anywhere for "one confirmed figure". The honest answer to `stress-s` has no cell in the catalogue |

## What went right, and should not be lost

- **`stress-s` refused correctly.** No chart, nothing invented, `slots: []`, gate left open with
  `"no slot: nothing would be produced"`.
- **P's beat 3 published its own refusal in its subtitle** — the journalist asked for the Aveiro
  line, the data has no route, and the chart says so in the delivered pixels.
- **Two of four agents found the per-capita inversion unprompted** (Q's Sul/Centro, P's
  Porto/Lisboa) and both built the honest chart. The toolchain asked neither.
- **The delivered `HANDOVER.md` is good work**: files and their purposes, where the visual goes,
  paste-ready alt text carrying the finding, credit, and the journalist's own stated limit with a
  note that it belongs beside the visual. Never seen before, because nothing had ever been delivered.
- **Greek rendered cleanly end to end** — thirteen names, a 29-character label, a Greek column
  header, nothing clipped or dropped.
- **The producers reported their own defects** rather than hiding them: R named its rank inversion
  and its 4.22:1 connector contrast; P recorded beat 2's `verify-web` failure as `failed` in
  `OUTPUT-REVIEW.json`, in `APPROVED.md`, in the caveat and in the hand-over.

## The theme

Round three's plan opened by saying *"a checker that recognises shapes will always be one shape
behind"* and then redesigned the checker's contract. Round four's theme is one layer up:
**every mechanism that failed here failed silently, and several were verified green while failing.**

- a checker that cannot resolve an entity prints `unverifiable` and looks honest (2)
- a scalar that throws away its own coverage prints `supported` (4)
- eighteen dead runners under a green suite that only exercises the seed (16)
- two gates that agree in the test fixtures and disagree on a first delivery (7, 8)
- two files nothing writes, undiscovered because each skill ships its own copy (17, 18)
- a required field with no honest empty value, filled with a plausible invention (11)

Round two's finding 8 named the class — *"a capability that cannot observe its own failure"*. It is
now the dominant failure mode, and the raw per-beat record with every reproduction command is in
`2026-08-21-stress-findings-round-four-raw.md`.
