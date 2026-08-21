# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard (G1)

**Polish is a silent miss in every name-based lexicon this phase reads.**

`resolveGrounding` on this story's takeaway returns `unverifiable` with
`coverage: {evaluated: 0, decided: 0, unreadable: []}`. The takeaway is a Latin-script sentence, so
`scriptsNotRead` finds nothing to name and the "name the script you could not read" safety net —
round five's own fix — never fires. The verdict is indistinguishable from the one a sentence gets
when it WAS read and carried nothing checkable.

Measured cost, by mirroring the same story in English with English column names:

    resolveGrounding("Mazowieckie has more hospital beds than any other region.", enProfile, {csv})
      -> claim: "more hospital beds than any other"
         "Mazowieckie"'s own value in "hospital_beds" (21400) is the column's maximum — and note
         that "population" sits beside "hospital_beds" ... By "hospital_beds" alone the highest is
         "Mazowieckie" (21400); per "population" it is "Śląskie" (17800 / 4400000 = 0.00405). The
         two readings do NOT agree, and which one this claim is about is the journalist's to settle.

That is the entire editorial finding of this beat, produced by the toolchain, in English, and
withheld in Polish.

**And the denominator half is worse than absent — it INVERTS the verdict.** Isolating the lexicon
(English measure column, Polish `ludność` left as frozen):

    resolveGrounding("Mazowieckie has more hospital beds than any other region.", p, {csv})
      -> verdict: supported
         "Mazowieckie"'s own value in "hospital_beds" (21400) is the column's maximum (21400)

`supported` closes G1 green on a raw-count superlative with its denominator one column away —
which is exactly the defect round four's finding 5 was written to close. The downgrade to
`unverifiable` is gated on `findDenominatorColumn`, and that reads
`DENOMINATOR_NAME_TOKENS`, which holds English, French, Greek and Arabic. A denominator column
named in a fifth language does not weaken the check, it switches it off.

Three independent copies of that token list, all missing Polish:
`intake/scripts/profile.mjs`, `storyboard/scripts/ground-claim.mjs`,
`chart-beat/scripts/detect-denominator-reading.mjs`.

## Found at storyboard (③ the hand)

**`proposeCredit` recommends `none` on an article that names its source, in Polish.**

    attributionsIn(article)  ->  []
    proposeCredit(...)       ->  recommended: "none", prints "Source: not stated"

The article's third sentence is *"Dane pochodzą z Narodowego Funduszu Zdrowia i dotyczą 2025 roku."*
`ATTRIBUTION_CUES` and `DATA_CAME_FROM` (`storyboard/scripts/storyboard.mjs`) hold English,
French, Greek and Arabic. Polish *pochodzą z* matches neither.

Round five's fix to this landed in one half only. The printed sentinel is no longer the raw word
`unattributed`, so the artefact would have said "Source: not stated" rather than leaking a
maintainer's token — but the RECOMMENDATION is still wrong, and it is wrong in the direction that
loses a named third party.

The second half is a structural gap rather than a vocabulary one: unlike `ground-claim.mjs`'s
`scriptsNotRead` and `palette.mjs`'s `scriptsWithNoConvention`, `proposeCredit` has **no
coverage report at all**. It returns `attributions: []` with the same confidence whether it read
the article and found no attribution or could not read a word of it. The round-five discipline
("declare your languages, name what you could not read") reached three lexicons and not this one.

## Found at storyboard (④ the survey / ⑩ the candidates)

**Five of the fifteen Splash treatment names in `references/datawrapper-chart-types.json`
match no row of `references/type-survey.md`.**

    Area and stacked area   vs  Area (and stacked area)
    Dumbbell                vs  Dumbbell (range plot)
    Scatter and bubble      vs  Scatter (and bubble)
    Slope                   vs  Slope (slopegraph)
    Waterfall               vs  Waterfall (bridge)

`formatCandidates` looks the survey row up by exact (case-folded) name. A candidate written in the
Datawrapper catalogue's spelling therefore renders with **no purpose sentence, no "Not for"
refusal, and no limits** — and the limits are the load-bearing half:

    formatCandidates(..., profile {rowCount: 5}) with "Scatter (and bubble)"  ->  REFUSED
    formatCandidates(..., profile {rowCount: 5}) with "Scatter and bubble"    ->  ACCEPTED

`Scatter` carries the only `rows` limit in the whole generated survey, and it is one of the five
mismatched names. The one mechanically enforced row limit in this phase is defeated by the other
name the toolchain itself uses for the same treatment — the name `datawrapperMatch` returns, and
therefore the name a producer-gate turn puts in front of a journalist.

`assertDistinctWays` reads `sameIdeaAs` off the same survey rows, so a mismatched name loses
that check too; today only `Lollipop` declares one, so nothing is currently missed there.

## Found at palette (⑨)

**A house palette is measured only against the ground the newsroom recorded, and this
delivery is for print.**

The journalist asked for a static frame *do druku*. `proposePalette` offered two options, both on
`NEWSROOM.md`'s `ground: #16191B`, and recommended `#D4A853` at 8.01:1. Nothing in the
proposal, in `format-catalog.mjs`, or at G2b knows that `static` can mean paper — "print" appears
in this tree only inside `another-format.mjs`'s prose description of the still.

On the ground a printed page actually has:

    #D4A853 on #FFFFFF   2.20:1   the house PRIMARY accent, BELOW the 3:1 non-text floor
    #5B8A8A on #FFFFFF   3.86:1   the house second accent, the one this beat had to use
    #B28D46 on #FFFFFF   3.00:1   adjustToContrast(#D4A853, #FFFFFF, 3)

So the newsroom's lead colour is unusable the moment the ground changes, and the only way to record
a light ground at all is the proposal's free-text escape — i.e. `origin: journalist`, a colour
nobody measured for them. An unattended run following this skill's own written rule ("write
PALETTE.md yourself, using **exactly** that option's ground and accent") would have delivered a
near-black full-bleed frame to a printer.

**And the knock-on reaches the drawing.** `deriveFurniture("#FFFFFF").grid` is `#d1d1d1`, 1.53:1
— below SC 1.4.11 for a DATA mark, which furniture was never calibrated to be. `muted` (#616161,
6.19:1) is what this corpus's other ranking beats use for their field, but every one of them draws
on a dark ground, where muted is lighter than the page; on white it is darker than the accent, so
the seven field bars shout over the one bar carrying the argument (rendered and looked at,
`beats/1-beds-per-resident/probe/field-muted.png`). The compliant middle does not exist:
`readApart("#5B8A8A", "#929292")` is `false`. There is no ink in this palette that is both above
the mark floor and distinguishable from the accent.

## Found at production (chart-beat)

**`familyResolves` takes a sample now; the gate that enforces it still does not pass one.**

`useTypeface` (`render-still.mjs`, and its four vendored copies) calls
`familyResolves(typeface.family)` with no second argument, so the only enforced typeface check in
the render path still lays out `RESOLUTION_PROBE` — `"Handgloves 0123456789 — MWmw il1 %"`,
Latin, no diacritic, no ogonek, no stroked l. `proposeTypeface` does pass the sample and reports
`drawsTheSample`, which is where round five's fix landed; the refusal does not.

For this story it happens not to matter, and only because the recommended option is
`origin: default` — and `useTypeface` skips the check entirely for `origin: default`. The
proposal's own `drawsTheSample` for that option is `null`: **the recommended face is the one
option never measured against the story's own strings.** The diacritics were settled by rendering
the frame and reading the glyphs at 4x (Ś ą Ł ó ż ę ń ś ź ć all correct, no tofu), which is what
`sampleLimit` says to do — but that is a human step with no record anywhere except this note and
`APPROVED.md`.

**`graphicFillsItsFrame` is reachable only from its own test.** `grep` for it outside
`skills/*/scripts/detect-fills-its-frame.mjs` returns two test files and nothing else. Round five
widened the file to all eight producing skills; no producer calls it, so a static beat's fill
fraction is measured only if the author thinks to. Run by hand here: 76.25% against this skill's own
`FLOOR_FRACTION` of 35.15%. This is the `guard-wired-to-run` gap `chart-beat/SKILL.md` already
declares against itself — recorded because it is still open on the format this beat ships.

**`denominatorReadingStated` answers `applies: false` on the one story in this tree it was
written for.** `{"applies": false, "reason": "no denominator-shaped column in the frozen table"}` —
because the column is called `ludność`. The BRIEF states `reading: per ludność` anyway, by hand,
in the form the guard would have asked for.

## Found at delivery (the closing offer)

**`SUBJECTS.md` is required at G4 and required by no gate before it.**

`otherSubjectsFor` throws — correctly and with an excellent message — when the file is absent, and
that throw arrives AFTER the storyboard, the palette, the typeface, the component, three renders,
the approval and the delivery. On this run it arrived with the export already written.

The call is documented in exactly one place: `storyboard/references/exchange.md`, movement ⑩.
It is in none of `storyboard/SKILL.md`'s Architecture, Files, Tuning knobs or "How it works"
lists; `checkStoryboard` does not require it, `missingForGate2` does not require it, and
`whereIs` answered `{"phase":"production","missing":[]}` on a story that could not close.

That is the same shape `splash/SKILL.md` names for itself twice over — "when two gates decide the
same question, they read the same record" — with G2 and G4 disagreeing about a record G2 is the
phase that produces. The file was written after the fact here, from the survey at ④, which is
precisely the `stress-p` failure `other-subjects.mjs`'s own header records as the reason it
started throwing.

**And the Polish delivery is served in English, honestly.** `SCAFFOLD_LANGUAGES` is
`["en", "fr"]`, so `HANDOVER.md`, the format offer and the subject offer all open with
`untranslatedNotice` and carry the journalist's own Polish sentences inside an English scaffold.
This is the designed behaviour and it is the right one — recorded here only so the count is known:
on this story three journalist-facing documents out of three are in a language the journalist did
not choose.

**Nothing checks `language:` against the newsroom's own list.** `NEWSROOM.md` records
`languages: en`; this story recorded `language: pl`; `checkStoryboard` validates the SHAPE of
the code and nothing else, and `newsroomLanguages` is never consulted at G2. The exchange's own
prose says the list "is what that confirmation chooses among". Here that is the lenient direction
and it let a correct story through, but the rule is unenforced in both directions.

## Found at storyboard (⑨ the palette) — a second reading

**The escape is the only way to record a light ground, and it costs the `origin` field its
meaning.**

`proposePalette` has no `ground` input and no surface input: it returns `NEWSROOM.md`'s single
recorded ground on every option. A print delivery therefore cannot be answered from the proposal at
all — only through "Something else — give me the two hex codes", which `palette/SKILL.md` defines
as `origin: journalist`.

So this story's `PALETTE.md` says `origin: journalist` for a decision no journalist took, because
there is no other honest value available: it is not `newsroom` (the ground is not the newsroom's),
it is not `subject` (no convention applies to hospital beds — the four-entry
`SUBJECT_CONVENTIONS` table has no health row at all, which is the honest answer and not a
defect), and `default` is not one of the three. The unattended-run rule in `palette/SKILL.md`
covers exactly two cases — `recommended` names a passing option, or it is `null` — and this is a
third: `recommended` names a passing option that is wrong for the delivery surface.
