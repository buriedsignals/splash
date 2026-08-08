# Defect — `pictogram` is built but unreachable from the spec chain (2026-08-07) — CLOSED

> **The capability landed 2026-08-08** (branch `feat/pictogram-type`). See the struck section
> "What was deliberately NOT done" below: the type is reachable, and the refusal this note records
> no longer fires.

Opened by a real `/using-splash` run (article: Heidi.news, JO Milan Cortina — run dir
`exports/jo-milan-cortina/`), where the journalist named « pictogramme » on the DIRECT branch.

> **CLOSED 2026-08-07** (branch `fix/mapper-prose-drift`). Two of the three things this note
> asserted were re-measured and found FALSE; the one that was true is now guarded by a test.
> Struck rather than left standing, because a defect note that still lists what is fixed — or
> what was never broken — becomes a to-do list nobody trusts.

## What was measured FALSE (struck)

- ~~"The type is offerable-looking and unproducible through the prose chain."~~ It is not
  offerable. `validateAccepted` (`skills/splash/src/validate-gate.ts`, `deferredTypeError`)
  refuses a `nativeType: "pictogram"` proposal at the gate, by name, quoting the registry's own
  reason: `"pictogram" is not an offerable chart-native type: family-B: stylistic variant of
  waffle. Choose a type the knowledge base models, or ask a maintainer to call the engine
  directly.` The journalist meets a named refusal, not a silent `FALLBACK_TO_DW`. The engine
  half of the note is accurate (no `pictogram` key in `MAPPERS`, `UnsupportedNativeType` if a
  spec ever got that far) — but nothing routes a spec that far.
- ~~"`suggest-chart/SKILL.md`'s list … omits `radial-bar`, `dot-strip`, `connected-scatter` and
  `pictogram`."~~ Measured at runtime against `Object.keys(MAPPERS)`: the two prose lists and
  `MAPPERS` agreed **exactly**, 27/27, in both directions, with all three of `radial-bar`,
  `dot-strip` and `connected-scatter` present. (`dot-strip` has been in that sentence since
  `a1cee661`, 2026-07-06.) `pictogram`'s absence is correct, not drift: it has no mapper.
  Registry parity was clean too — non-deferred ≡ `MAPPERS` (27), deferred ∩ `MAPPERS` = ∅.

## What was TRUE, and where it was closed

**"Nothing compares the two."** The prose lists were right by hand-discipline alone — every type
productionized since 2026-07 edited those two sentences in the same commit as its mapper
(`heatmap` in `1b9f2cc1`, `violin` in `613885ed`, …), and nothing would have failed if an author
forgot. Same for the registry: `completeness.test.ts` asserted "non-deferred ⇒ has a mapper" and
nothing asserted the inverse.

Closed by three guards, each mutation-verified (break it, watch it redden for the right reason,
restore — the record is inline in each test):

- `skills/chart-native/tests/mappers-doc-parity.test.ts` (new) — both prose lists in
  `suggest-chart/SKILL.md` vs `Object.keys(MAPPERS)`, **both directions**, plus a non-vacuity
  check so a reworded sentence fails loudly instead of making the guard scan nothing.
- `skills/chart-native/tests/completeness.test.ts` — *no deferred type carries a mapper*
  (a built, guarded type the gate would refuse by name: the honest repair for that state is to
  un-defer the type, not to delete its mapper), and *every `MAPPERS` key is a declared
  `NATIVE_TYPES` id*.
- `skills/suggest-chart/SKILL.md` now says out loud that the engine ships 41 types, that the rest
  are `deferred` and refused by the gate with their reason, and that both copies of the list are
  machine-compared — so the next mapper's author is told where the second copy is.

## What was deliberately NOT done — and was done on 2026-08-08 (struck)

~~**No `pictogram` mapper was added.**~~ The note framed that as a product decision rather than a
defect repair, and it was: the decision was taken on 2026-08-08, in the direction the journalist
had asked for. The type is now offerable end to end — un-deferred in `native-types.ts` (family A:
a two-column count is the most article-realistic CSV there is), mapped in `MAPPERS`, guarded in
`PRODUCE_GUARDED_TYPES`, sheeted at `knowledge/references/chart/types/pictogram.md`, named in both
prose lists, and rendered in all three formats under
`skills/chart-native/output-proof/pictogram/`. `skills/splash/src/pictogram-reachable.test.ts` is
the pair of this note's own refusal test: the same proposal now passes the gate AND reaches a
render config.

Two of this note's premises did not survive contact:

- **"a stylistic variant of waffle"** (the registry's deferral reason) is wrong. A waffle divides
  ONE whole into shares that sum to it; a pictogram compares SEVERAL independent magnitudes that
  sum to nothing. They share arithmetic, not a claim. The shared part — largest-remainder cell
  allocation — is genuinely not reusable here, because a pictogram allocates nothing: its count is
  `value / unitPerIcon` outright.
- **"the countability problem … `computePictogramLayout` does not wrap: 380 icons on one row render
  ~2 px each"** was real, and is closed by DECIDING the unit rather than by wrapping. Wrapping
  would have made counting harder (rows × columns), and the isotype convention is a short single
  row. `chooseUnitPerIcon` derives a round 1-2-5 unit that puts the longest row inside ~12 icons,
  and the produce guard refuses a row past 20 BY NAME — 380 icons is now a loud failure with the
  repair stated ("raise the unit per icon, or use a bar"), not a 2 px hedge.

A third defect the note could not have seen, because only a render shows it: a remainder under a
quarter of an icon drew NOTHING (the clip window was the icon's cell, and the glyph's ink starts
25 % across it). Fixed and locked — see `output-proof/pictogram/NOTES-native.md`.

`knowledge/references/chart-selection.md` now carries a `pictogram` entry too: it was left alone
here as "a different surface", which was right while the type had no mapper and wrong the moment
it had one.

## What the run did instead

Offered `waffle` (in `MAPPERS`, countable squares, `unit` names what one square represents) as the
honest substitute, with the withdrawal recorded in
`exports/jo-milan-cortina/candidates.json` (`tier: "withdrawn"`).
