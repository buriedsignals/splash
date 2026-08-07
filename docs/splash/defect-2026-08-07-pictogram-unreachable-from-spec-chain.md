# Defect — `pictogram` is built but unreachable from the spec chain (2026-08-07) — CLOSED

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

## What was deliberately NOT done

**No `pictogram` mapper was added.** The note's option 1 was to write one; option 2 was to accept
that the type is deliberately not offered and make the refusal say so. Option 2 is already the
shipped behaviour — the gate names the type and its reason — so adding a mapper would be a
product decision (is a pictogram worth offering a small newsroom over `waffle`?), not a defect
repair, and it carries the countability problem the note itself identified
(`computePictogramLayout` does not wrap: 380 icons on one row render ~2 px each). If that
decision is ever taken, un-defer the entry in `native-types.ts` and add the mapper — the guards
above then require the KB ref, the conformance entry and both prose lists to follow.

`knowledge/references/chart-selection.md`'s per-type catalogue was left alone: it is a different
surface (CSV shapes, not the offerable set), and the only mapped types missing from it are the
four in `LEGACY_KB_FAMILY_BACKFILL` (`bar`, `line`, `scatter`, `pie`) — a tracked, shrinking
exemption, not a new gap.

## What the run did instead

Offered `waffle` (in `MAPPERS`, countable squares, `unit` names what one square represents) as the
honest substitute, with the withdrawal recorded in
`exports/jo-milan-cortina/candidates.json` (`tier: "withdrawn"`).
