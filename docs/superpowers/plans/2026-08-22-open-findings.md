# Every finding still open — one list, six rounds

**189 defects** were found across rounds five and six (82 + 107). This is what is NOT closed, and
why. It supersedes the round-five triage, which round six partly invalidated.

Closed and verified since: rounds five and six's fix plans (16 tasks), plus the tier-1 work in
flight. What follows is the residue.

---

## A. The sharing mechanism reaches half the tree — and that is the largest open thing here

    skills the catalogue CAN reach : 8   chart-beat chart-web chart-video dw-beat
                                         map-beat map-web image-beat scrolly
    skills outside it entirely     : 7   splash storyboard deliver intake
                                         doctrine newsroom-charter palette

The traits derivation describes what a skill **draws**. So every fix to the editorial checker, the
profiler, the gates and delivery is local **by construction** — it cannot become a shared rule, and
three separate rulings this week said so with the same reasoning: a rule declared against a trait no
producing skill carries derives an empty population, which the parity test refuses.

That means the mechanism this whole branch is built on **does not cover**: `ground-claim.mjs` (five
rounds of defects), `profile.mjs` (three), `where.mjs` and the gates (four), `deliver` (three).

**This is a design question for the owner, not a bug to fix.** Either those seven skills get a
second mechanism, or it is accepted and written down that half the tree is guarded only by its own
tests.

---

## B. Named, reproduced, not fixed

| # | finding | where | why it stands |
|---|---|---|---|
| B1 | `tableCarriesTheMarks` reads only the FIRST `<table>` on a page | map-web + chart-web, byte-identical copies | reported by MAPFLOW, out of its scope |
| B2 | `decollide` is unreachable from every video component — it imports a rasteriser a Remotion component cannot load | 7 skills carry it, 5 can call it | round-five tier 2 |
| B3 | `framingMeasurement` cannot read a series that crosses zero, nor a histogram's own marks | chart-beat | V1, AA8 |
| B4 | `verify-web`'s "is the plot a strip" measures a HEIGHT; a 5px-wide plot passed 52 checks | chart-web | Z3 — the width check was never written |
| B5 | `rampsFromSource` throws on the shape its own guard list implies | map-beat | V11 |
| B6 | resvg ignores SVG `direction`, so Arabic sentence-final punctuation lands on the wrong side | all static paths | X1 — a rasteriser limitation, now stated rather than silent |
| B7 | `stress-h-site-photographs/source/data.csv` **is JSON** | frozen source | unfixable in place; the real finding is that nothing checks a frozen source's format |
| B8 | `proof/mapgen-choropleth-video` and `stress-m-forest-loss` still carry the pre-ruling staggered build | proof + stories | the doctrine and the corpus disagree until they are rebuilt |
| B9 | The example-runner sweep's population still counts library modules with no entrypoint | 8 skills | WIRE closed the CALLER half; the POPULATION half is open |
| B10 | `image-beat`'s refusal is one field at a time, so three gaps take three round trips | image-beat | W3 |
| B11 | The seed uses `captionTop` as a baseline and `creditTop` as a top; the letterbox bar is never measured | image-beat | W5, W6 |
| B12 | `formatHandover` carries ONE alt and ONE credit; an image beat has one of each per photograph | deliver | W10 |
| B13 | Candidate selection is chart-and-map only, and its two guards go vacuous for `image` | storyboard | W11 |
| B14 | Recording a typeface for an image story needs a cross-skill import | image-beat | W13 |
| B15 | Nothing maps a country NAME to a shape key; `unmatched-value-hides` worked only because the beat keyed by the raw source string, a convention nothing documents | map-beat | T1 |
| B16 | A map label clipped by the plate is silent | map-beat | T4 — `label-fits-inside-the-plate` was added; the CLIPPING half is what remains |
| B17 | `claimViolations` knows exactly one claim, the CO2 seed's | map-beat | T6, partly addressed |
| B18 | `formatCandidates` documents a field it does not accept | storyboard | T14 |
| B19 | The last rung of the render ladder has no mechanical form | chart-video | V13 |
| B20 | A type sheet's refusal in an unrecognised unit is not machine-checkable | storyboard | Y18 |
| B21 | The Datawrapper treatment map has no distribution type | dw-beat | Y19 |
| B22 | Profile `duplicates` has a writer and no reader | intake → everywhere | T5 |
| B23 | Nothing notices a percentage above 100 when the column is not marked `%` | intake | Y5 — bounded deliberately: a percentage is known from values, never from a name |
| B24 | Six gap years reported in a series with no gaps; lat/lon counted as measures in the PROFILE | intake | AC7, AC8 — the grounding side was fixed, the profile side was not |
| B25 | `bake-plate.mjs` hard-codes `dataviz-light` with no flag | scrolly | AC12 |
| B26 | The shipped bake cannot be used by any beat that is not a USGS river gauge | scrolly | AC13 |
| B27 | Two scrolly-only types in `MATRIX.md` exist in no type sheet | doctrine + scrolly | AC2 |
| B28 | One row of `scrolly/SKILL.md` describes a map track the skill does not ship | scrolly | AC19 |

---

## C. The decisions that are the owner's, not mine

1. **"All languages", properly.** The lexicons declare four and now name a LETTER outside their
   repertoire, which catches Polish without adding Polish. A Latin-script language spelling itself
   in plain ASCII (Dutch `bevolking`) is still invisible, and the verdict says so where the
   journalist reads it. Going further splits three ways — two lexicons need nothing, three could key
   on a concept with a vendored multilingual label table, and the claim vocabulary is GRAMMAR and
   cannot be enumerated at all.
2. **The packaging question.** `main` ships `.agents/skills/*` as symlinks into `skills/`, while
   `root-template/shared/` is a physical copy — and the test guarding that copy says in its own
   header why a symlink is the wrong mechanism. Skill scripts now reach `#shared/` 34 times against
   9 before this branch.
3. **The MapTiler key in local history at `08851cd8`.** Out of the working tree; still in history;
   branch unpushed. Rewrite that history, or rotate the key, before any push.
4. **Whether the seven non-producing skills get a sharing mechanism at all** — section A.
