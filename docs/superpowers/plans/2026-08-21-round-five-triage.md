# Round five — triage

Eighty-two defects found. **Twenty-two closed** (tasks A, B, C, E, F, the CMS item of G, and four
found by the controller while integrating). Sixty remain. This file is the decision about them, so
that what is not being done is *named* rather than quietly dropped.

The test applied to each: **can a reader of a published graphic be misled, or can a newsroom's
system be broken, by this defect?** If yes it was done. If no it is below, with what it costs to
leave it.

---

## Closed this round

| finding | what it was |
|---|---|
| C1 | `COVID-19` typed as `number, unit "COVID", min -19`. A column of names arrived with a range, a sum and a denominator. |
| U1 | `0.61` declared "equals the sum of `volume_km3` (0.482)" — a 27% gap — returning `supported`, the verdict that closes G1. |
| Y1, Y4, T12, T13, X7 | a refuted takeaway closing as `unverifiable`; a year "placed" in a household count; a superlative bound to a refused column on an incidental word; two clauses judged against different evidence; `"142 million"` unreadable against a column in base units. |
| X3, X8, C3, X4, X6, B's table | **all six lexicons**, under one declared policy. The Arabic superlative that nothing checked now produces a claim. |
| the owner's ruling, T4, T5, T6 | the staggered choropleth reveal and its "pending" stipple — traced to `geo-discipline.md` rule 10, which **mandated** it. Rule rewritten, seed rebuilt, `reveal-order-is-earned` added. |
| T2-controller | `fills-its-frame` re-declared from `ships-standalone-html` to `materialises-a-beat`: 4 skills → 8. A fixed frame is finally asked whether it fills. |
| Y6, Y7, Y8, Y9, X2, W2 | the word "unattributed" under a published chart; the accent reaching no non-bar type; a dark-ground newsroom learning after publication; the honest absence defeating the guard built to see it. |
| Y11, Y12, Y13 | a CMS insertion of 30 131 replacement characters, a source bundle for a beat with no source, a hand-over promising a vector that does not exist. |
| 3 reds | `stress-v`'s helper drift, `stress-y`'s hand split, and the walk that could not parse a TypeScript return type. |

---

## Not done, and why — the named backlog

### Tier 1 — worth doing next, in this order

1. **`SUBJECTS.md` is required at G4 and checked by neither G2 gate.** Reported independently by
   U, V, W **and** Y — four formats, one gap, and it is round-four finding 9 one file over. Nothing
   is published wrongly; a story simply cannot close. Cheap, and the most-reported defect of the round.
2. **`map-beat` and `image-beat` ship no size table** (T2, W1, W12, V2, V3, V4). The first round ever
   to pin `portrait` found two of eight producing skills unable to honour a size gate 2c may choose.
   Either they gain a table, or the gate stops offering what the medium cannot make.
3. **`owned-file` ships the beat's internals** — the whole `renders/` tree, unfiltered, in every
   format (T10, V7, W9). A newsroom receives working files it did not ask for. Embarrassing, not
   dangerous.
4. **A slot records ONE size** and V's journalist asked for two frames of one argument (V12).

### Tier 2 — real, and nothing depends on them today

5. **The guards that measure nothing** (T7, T8, T9, W7, W8, X5, Y20, U2, and 45 of 116 sweep members
   being library modules). This is theme 2, and it is the largest single group left. It matters for
   the future — a guard nobody runs is a guard that will be wrong when it is needed — and **not one
   line of it changes what a reader sees today.** That is the whole reason it is here and not above.
6. **`decollide` is unreachable from every video component** (T5) — it imports a rasteriser a
   Remotion component cannot load. The de-collision exists in seven skills and is callable from five.
7. `framingMeasurement` cannot read a series that crosses zero (V1) · `rampsFromSource` throws on
   the shape its own guard list implies (V11) · `assertDistinctWays` accepts treatments in no type
   sheet (V14) · a scatter's x axis is unmanaged and landscape ships `-4,000 households` (Y10).
8. `writeOutputReview` makes the caller repeat a digest it computes (Y16, V10) · `whereIs`'s
   approval refusal does not name the file it wants (Y15) · `DATAWRAPPER.json` does not record the
   size (Y17) · the closing offer asks for a word the recorder rejects (T11).

### Tier 3 — stated, not scheduled

9. `stress-h-site-photographs/source/data.csv` is **JSON** (W14). Frozen, so unfixable in place. The
   real finding is that nothing checks the format of a frozen source.
10. `proof/mapgen-choropleth-video` and `stories/stress-m-forest-loss` still carry the pre-ruling
    staggered build. The doctrine and the corpus disagree until they are rebuilt.
11. resvg ignores SVG `direction` (X1) — a rasteriser limitation, now stated rather than silent.
12. `image-beat`'s refusal is one field at a time, so three gaps take three round trips (W3) ·
    the seed uses `captionTop` as a baseline and `creditTop` as a top (W5) · the letterbox bar is
    never measured (W6) · `formatHandover` carries one alt and one credit where an image beat has
    one per photograph (W10) · candidate selection is chart-and-map only (W11) · recording a
    typeface for an image story needs a cross-skill import (W13).
13. Nothing maps a country NAME to a shape key (T1) — `unmatched-value-hides` worked only because
    the beat keyed by the raw source string, a convention nothing documents.
14. `claimViolations` knows one claim, the CO2 seed's (T6, partly addressed) · `formatCandidates`
    documents a field it does not accept (T14) · the last rung of the ladder has no mechanical form
    (V13) · a type sheet's refusal in an unrecognised unit is not machine-checkable (Y18) · the
    Datawrapper treatment map has no distribution type (Y19) · profile `duplicates` has a writer and
    no reader (T5-controller).

---

## The decision the owner still holds

**"All languages", properly.** The lexicon policy now declares four (English, French, Greek, Arabic)
and names the script it could not read. Going further splits three ways, and only the owner can
choose:

- **Two lexicons are already language-independent** and need nothing: `familyResolves` probes the
  real sample, and `creditTracesToRecord` treats case as a property of scripts.
- **Three are word lists that could genuinely become all-languages** — the denominator tokens,
  `isShareColumn`, and `SUBJECT_CONVENTIONS` — by keying on the CONCEPT and vendoring a multilingual
  label table (CLDR, Wikidata) rather than typing a fifth language by hand. Bounded work; the source
  coverage should be measured before committing to it.
- **One cannot**: the claim vocabulary is GRAMMAR, not vocabulary. No label table gives morphology
  and word order. The language-independent alternative is to stop guessing the claim from the text
  and have the journalist confirm its shape — one more question in an exchange that already asks for
  the takeaway, and correct in every language by construction.

**And the packaging question**, unchanged: `main` ships `.agents/skills/*` as symlinks into
`skills/`, while `root-template/shared/` is a physical copy — and the test that guards the copy says
in its own header why a symlink is the wrong mechanism. Skill scripts now reach `#shared/` 34 times,
against 9 before this branch. Which of the two is the real distribution path is a product decision.
