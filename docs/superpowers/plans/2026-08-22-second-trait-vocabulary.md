# A second trait vocabulary — derived, and where the derivation does not hold

Measured on `feat/parity-by-traits`, 2026-08-22. Nothing in the repository was changed.

---

## 0 · One correction to the premise, before anything else

The brief says the seven skills "carry no traits and therefore no rule can ever reach them."
Measured, that is half true, and the wrong half is load-bearing.

    bun -e 'import {provenTraits} from "./scripts/traits.mjs"; …'

    splash             ["delegates-rendering","reads-a-journalists-csv","reads-a-provider-credential"]
    storyboard         ["reads-a-journalists-csv"]
    deliver            ["ships-standalone-html","inlines-its-assets","reads-a-provider-credential"]
    intake             ["reads-a-journalists-csv"]
    doctrine           []
    newsroom-charter   []
    palette            ["reads-a-palette"]

Six of the seven already **prove** traits from the existing vocabulary. What excludes them is not
the vocabulary — it is `reachable()` (`scripts/guards.mjs:91`), which iterates `PRODUCING_SKILLS`
and never asks the other seven anything. `traits.test.ts` iterates the same constant, so none of
these skills has a `TRAITS.json` and nothing forces one.

**That changes the shape of the decision.** A second vocabulary alone fixes nothing. The population
constant is the gate, and whatever is decided about vocabulary has to be decided about that
constant in the same breath.

It also carries a cost nobody has paid yet. The 14 witnesses were only ever validated against 8
skills. Run them over 15 and three of them fire where they were never written to:

| witness | fires on | why | verdict |
|---|---|---|---|
| `delegates-rendering` | `splash` | `keys.mjs:120` — `const DATAWRAPPER_PROBE = "https://api.datawrapper.de/v3/me"` | **false** — splash renders nothing; this is a probe URL |
| `ships-standalone-html` | `deliver` | `deliver.mjs:1127` writes `EMBED_CODE.html` | **false** — an embed snippet, not a beat page |
| `inlines-its-assets` | `deliver` | `deploy-embed.mjs:391` `buffer.toString("base64")` | **false** — an upload encoding, not a data URI in a delivered file |
| `reads-a-palette` | `palette` | calls `readPalette(` | **half** — the trait's own `describes` says "its own **render** calls readPalette"; palette renders nothing |

`reads-a-journalists-csv` on `intake` and `storyboard` is **true** and interesting — see §4.2.

---

## 1 · The four candidate traits

Each is witnessed by a regex over the skill's own `scripts/`+`assets/`, `verify-*`/`detect-*`
excluded, exactly as the current 14 are.

### V1 · `bounded-by-a-language-list`

> the skill's own decisions are bounded by a hand-written list of natural languages, declared in
> code, so a story in a fifth language is a case it cannot read rather than a case it read and
> found nothing in

**Witness** `/export const [A-Z][A-Z0-9_]*_LANGUAGES\b/`

| carries | declaration |
|---|---|
| `storyboard` | `ground-claim.mjs:358` `LEXICON_LANGUAGES = ["English","French","Greek","Arabic"]` |
| `intake` | `profile.mjs:204` — same four, byte-identical |
| `palette` | `palette.mjs:567` `CONVENTION_LANGUAGES = ["English","French","Greek","Arabic"]` |
| `deliver` | `journalist-language.mjs:35` `SCAFFOLD_LANGUAGES = ["en","fr"]` |

Does **not** carry: `splash`, `doctrine`, `newsroom-charter`. **No producing skill carries it** —
0 of 8. Population 4.

**Defect it would have caught** — round six, AD1:

> Same table, same sentence; only the denominator column's NAME changes language:
>
>     denominator "ludność"     -> scalar: supported
>     denominator "population"  -> scalar: unverifiable
>
> So the English table gets the round-four downgrade and the Polish table gets **`supported`** — a
> verdict MORE confident than the one an unreadable claim receives. […] This is the sharpest form
> of C1: **the lexicon gap is not a missing prompt, it is a false confirmation.**

And round five, X1, which named the population before anyone had a word for it:

> Three independent instances, in three different skills, all found this round: the denominator
> detector · `palette`'s `SUBJECT_CONVENTIONS` · `groundTakeaway`'s claim vocabulary. **Each was
> written against the language its first story happened to be in.**

**The rule it would carry.** *A decision bounded by a declared language list states that bound on
the verdict the journalist reads, and never returns its most confident verdict on text outside the
bound.* All four already do it — `scriptsNotRead`/`lettersNotRead` + `LEXICON_LANGUAGES_SAID`
(storyboard, intake), `scriptsWithNoConvention` (palette), `untranslatedNotice` (deliver) — and
each has written the same test locally and separately: `storyboard/test/lexicon-languages.test.ts`,
`intake/test/denominator-languages.test.ts`, `palette/test/subject-conventions-scripts.test.ts`.
Four parallel local tests of one rule is exactly what a catalogue cell is for.

**Witnessed?** Yes, mechanically, both directions. But see §5.1 — it witnesses a *naming
convention*, not a mechanism.

---

### V2 · `answers-a-phase-gate`

> the skill decides, from a story's own record, whether a phase may advance — and it is not the
> only reader that decides it

**Witness** `/export (?:async )?function [a-z][A-Za-z]*(Gap|Gaps|Closed)\(/`

| carries | decisions |
|---|---|
| `splash` | `preflight.mjs`: `surfaceGap`, `capabilityGap` · `where.mjs`: `destinationGap`, `deliveryClosed`, `surveyGap` |
| `storyboard` | `storyboard.mjs`: `sizeGap`, `destinationGap`, `assemblyGap`, `surveyGap`, `recordedClaimGaps` · `capability-gap.mjs`: `capabilityGap` · `producer-gate.mjs`: `producerGap` · `format-gate.mjs`: `treatmentFormatGap` · `format-catalog.mjs`: `formatGap` |
| `deliver` | `another-format.mjs`: `capabilityGap`, `deliveryClosed` |

Does **not** carry: `intake`, `palette`, `doctrine`, `newsroom-charter`. **0 of 8 producing.**
Population 3.

**Defect it would have caught** — round four, Q3:

>     whereIs → {"phase":"delivery","missing":[]}
>     materialise → throws: "this output has no bound review…"
>
> `splash/SKILL.md`'s own "one gotcha" section describes this exact class — two gates that can
> refuse for reasons the other cannot see — and records it as fixed for G2. **It is not fixed for
> G3→G4.**

and round six, AD: *"`SUBJECTS.md` is required at G4, produced at G2, and required by no gate
between — `whereIs` answered `production, missing: []` on a story that could not close."* The
`COPIES` comment on `surveyGap` calls that *"reported independently by six formats across two
rounds, the most-reported defect in this project's history."*

**A live, currently-open instance, measured today.** `capabilityGap` exists in all three skills and
is **not** registered in `COPIES`. Two of the three are byte-identical; `deliver`'s is not:

    splash/scripts/preflight.mjs        const row = capabilities[medium];
    storyboard/scripts/capability-gap.mjs  const row = capabilities[medium];
    deliver/scripts/another-format.mjs  const row = capabilities?.[medium];

    capabilityGap(undefined, "map")  →  splash: THROWS · storyboard: THROWS · deliver: null

**The rule it would carry.** *A gap/closed decision named identically in more than one gate reader
is one decision — registered in `COPIES` and byte-identical.* `COPIES` already walks `surveyGap`,
`destinationGap`, `treatmentNames` and `deliveryClosed` for precisely this reason; nothing forces
the fifth.

**Witnessed?** Yes. The `*Gap`/`*Closed` suffix is already this tree's own convention across 16
export sites and appears in no producing skill.

---

### V3 · `probes-a-live-service`

> it reaches a third party over the network to decide something the journalist is told, so "the
> service said no" and "the probe could not be made" are two answers it must not conflate

**Witness** `/\bfetchFn\b/`

| carries | where |
|---|---|
| `splash` | `keys.mjs` (`probeMapTiler`/`probeDatawrapper`/`probeCloudflare`), `preflight.mjs`, `run-operation.mjs` |
| `deliver` | `deliver.mjs:1001` (hosted deployment) |
| `newsroom-charter` | `fetch-document.mjs:26` `fetchWithTimeout` |
| **`dw-beat`** | producing skill — see §3 |

Does **not** carry: `storyboard`, `intake`, `palette`, `doctrine`. Population 4, **spanning both
axes**.

**Defect it would have caught** — round four, P7:

> Without one: all three capabilities `available: false`, reason *"MapTiler threw: fetchFn is not a
> function"* — which a journalist reads as "MapTiler is down". With `fetchFn: (u,i)=>fetch(u,i)`:
> map 200, datawrapper 200, hostedEmbed 403. **Two of three are actually open on this machine.**

and the same shape in a producing skill, real-story cluster 3: *"`verify-live-map.mjs` … reads the
key with no alias list, reports nothing verified, and **exits 0**."*

**The rule it would carry.** *A probe distinguishes a refusal by the service from a probe that
could not be made, and never reports the second as the first.* `splash/scripts/keys.mjs:137`
`resolveFetch` is that rule, written once, after P7 — and it is written nowhere else.

P8 is the second half and needs V2 as well: *"preflight and `offerForms` disagree about hosted
embed, in the direction the journalist sees. Both skills' documented rules held, and the journalist
is still told two different things."*

**Witnessed?** Yes, but by a parameter name. See §5.1.

---

### V4 · `proposes-a-value-the-journalist-confirms`

> it does not decide; it renders a proposal a journalist answers, and every value in it either
> names where it was read or is asked as a question

**Witness** `/export function formatProposal\(/`

| carries | file |
|---|---|
| `palette` | `palette/scripts/format-proposal.mjs:84` |
| `newsroom-charter` | `newsroom-charter/scripts/format-proposal.mjs:21` |

Does **not** carry the other five, nor any of the 8 producing skills. Population 2.

**Defect it would have caught** — real-story cluster 5:

> `proposePalette` **prints a false sentence about a file it says it did not read**, does not check
> the shape of `newsroom` and then claims it measured it, has no answer for a part-to-whole beat
> with more parts than the newsroom has accents…

and round six, AD: *"`proposePalette` measures a house palette only against the ground `NEWSROOM.md`
records, so a PRINT delivery found the newsroom's primary accent at **2.20:1** with nothing
objecting"*; and round six, AC: *"`proposePalette` answers 'there is no NEWSROOM.md' about a
complete one."*

**The rule it would carry.** *Every value a proposal offers names the declaration it was read from,
and a value that could not be read is asked as a question rather than stated.* That rule is already
written — as **prose, in the other skill**: `newsroom-charter/scripts/format-proposal.mjs:1-6`,
*"every value sitting next to the declaration it was read from, every unresolved field named as a
question instead of a guess."* Every defect above landed in `palette`, which does not have it in
code or in prose. Two skills, one rule, one of them carrying it — that is the exact geometry the
catalogue exists for.

**Witnessed?** Yes, and least fragile of the four: an exact export name present in both, absent
everywhere else.

---

## 2 · Coverage

| skill | V1 language-bound | V2 phase-gate | V3 live probe | V4 proposal |
|---|:--:|:--:|:--:|:--:|
| `splash` | | ● | ● | |
| `storyboard` | ● | ● | | |
| `deliver` | ● | ● | ● | |
| `intake` | ● | | | |
| `palette` | ● | | | ● |
| `newsroom-charter` | | | ● | ● |
| `doctrine` | | | | |
| *(producing)* `dw-beat` | | | ● | |
| *(producing)* other 7 | | | | |

No trait is carried by all seven (a constant). None is empty. Every skill but `doctrine` is
reachable by at least one.

**Rejected after measuring — these are constants, not traits:**

| candidate | fires on | verdict |
|---|---|---|
| writes a SHOUTING-CASE record into a story dir | 12 of 15 | constant |
| throws naming a missing SHOUTING-CASE record | 13 of 15 | constant |
| defines `contrast()`/`luminance()` | 9 of 15 | constant, and already held by `splash/test/helper-parity.test.ts` |
| takes a `storyDir`/`beatDir` | 7 of 15, split across both axes on no principle | not a mechanism |

The colour-floor case is worth naming because it looks like a trait and is not: the discriminating
fact between `palette`/`newsroom-charter` and the seven producing skills that also define
`contrast()` is not the maths — it is that the first two *propose* a colour and the rest *draw*
with one. That distinction is V4.

---

## 3 · One namespace or two

**One namespace, one population, and a rule may require traits from either axis.** Argued from V3,
and from something already in the tree.

`fetchFn` fires on `splash`, `deliver`, `newsroom-charter` **and `dw-beat`**. In two namespaces
with two populations, "a probe that could not run says so" has to be written twice — once for the
three, once against a new axis-1 trait for `dw-beat` — and those two copies are precisely the drift
this whole mechanism exists to abolish.

That is not hypothetical. It has already happened, in the direction nobody is watching:

- `plate-follows-theme` requires `owns-a-surface-it-did-not-choose` and `reachable()` derives
  `map-beat, map-web, scrolly, dw-beat`. The decision function `plateFollowsGround` has **five**
  registered copies. The fifth is `splash/scripts/preflight.mjs` — a skill the rule can never
  reach. `COPIES` explains why in its own comment: *"a preflight that said dark where the guard
  says middle would not have moved the surprise, only relocated it."* **The catalogue says four
  skills; the decision lives in five.**
- `capabilityGap` (§V2) is the same shape without the registration: three copies, one divergent.

So mixing axes in one `requires` is meaningful, and the case that makes it meaningful is a rule
that must reach the earliest gate *and* the producer that would otherwise refuse too late.

The guard that keeps a mixed rule honest already exists and needs no new machinery: `reachable()`
must be non-empty, and `unstatedRows` forces a cell for every skill it derives. A rule mixing two
traits no skill carries together fails the first check on the day it is written — which is what
four agents refused by hand last round.

**The cost is the population constant, not the namespace.** Widening `PRODUCING_SKILLS` to all
fifteen makes the four witnesses in §0 fire falsely. Two shapes are available:

1. **Widen and tighten.** One population, all 15. Requires re-tightening `delegates-rendering`,
   `ships-standalone-html`, `inlines-its-assets` and re-wording `reads-a-palette`. Honest, and the
   re-tightening is itself worth doing — three of the four are matching a substring where they mean
   a mechanism.
2. **A second constant** (`EDITORIAL_SKILLS`), `reachable()` deriving over the union. Leaves the
   existing 8 witnesses untouched. But it re-introduces a hand-typed population one level up, which
   is defect shape 2 from `CONSTRAINTS.md` with a new name.

I recommend (1) and say plainly that it is more work.

---

## 4 · The skills where the derivation does not hold

### 4.1 · `doctrine` — no honest trait exists, and that is the right answer

`skills/doctrine/scripts/` holds **one file, 90 lines**, exporting `checkReferenceSet` and
`countReferenceRows` — two pure string functions over a markdown table. It witnesses 0 of the
current 14 and 0 of the 4 proposed. It has no story directory, no gate, no lexicon, no probe, no
proposal.

Its recorded defects are not defects *in a skill the catalogue reaches* — they are defects **in the
catalogue**: B27 *"Two scrolly-only types in `MATRIX.md` exist in no type sheet | doctrine +
scrolly"*, and Z4 *"an argued catalogue exception is true of the wrong path […] this one measured a
path the format does not deliver."*

`doctrine` is the registry. `guard-parity.test.ts`, `guard-wiring.test.ts`, `traits.test.ts` and
`exception-covers-the-delivered-path.test.ts` all live in `doctrine/test/` and *are* the mechanism
that judges it. A catalogue rule about `doctrine` would be the registry judging itself through
itself. **Recommendation: name `doctrine` as permanently outside both vocabularies, in writing, and
say why — an absence that is argued is not a gap.**

### 4.2 · `newsroom-charter` — two traits, and not one defect of its own

Searched the whole record. `newsroom-charter` appears in
`2026-08-21-stress-findings-round-{four,five,six}-raw.md`, `2026-08-22-real-story-findings.md`,
`-closures.md` and `-open-findings.md` **only as a member of the excluded seven**. Not one defect
has ever landed in it.

So a vocabulary derived from defects has, strictly, nothing to derive for it. Both V3 and V4 reach
it by *shared mechanism* — the probe it makes, the proposal it renders — and the defects that
justify both traits landed in `splash` and `palette`. That is a legitimate reason to hold a trait
(that is what `plate-follows-theme` does for `dw-beat`), but it should be recorded as inherited,
not earned. It is also the thinnest of the seven in another way: it runs **once per newsroom**,
where every other skill here runs once per story.

### 4.3 · `intake` — one trait, and its biggest defects are covered by none of the four

`intake` carries only V1. Its two largest recorded clusters — the panel-grounding collapse (10
defects) and *"the profiler cannot describe a panel"* (6) — are covered by no candidate above.

They are already one decision: `panelShapeOf` is registered in `COPIES` across
`storyboard/scripts/ground-claim.mjs` and `intake/scripts/profile.mjs`, alongside
`readNumericToken`, `scriptsNotRead` and `lettersNotRead`. And the trait that would name them
already exists on the *first* axis: `reads-a-journalists-csv` **proves true on `intake` and
`storyboard` today**, measured. `csv-split-by-hand` requires exactly that trait and would reach
both the moment the population widened.

I did not resolve whether that means `intake` needs no second-axis trait for this cluster, or
whether the honest answer is that "reads a frozen table" was always a both-axes trait and the
population was the only thing hiding it. It is a real choice and it is the owner's.

---

## 5 · What I could not resolve

**5.1 · All four witnesses read a naming convention, not a mechanism.** `_LANGUAGES`, `*Gap`,
`fetchFn`, `formatProposal`. The current 14 are mostly the other kind — *a file exists*
(`bake-plate.mjs`, `timing.ts`, `render-still.mjs`), *a call is made* (`readPalette(`,
`export function joinValues(`). Only `reads-a-provider-credential` has this shape, via
`..._KEY_ALIASES`.

The consequence is a **false negative**: a skill that grows the mechanism under another name
carries the defect and not the trait, and nothing goes red. That is defect shape 2 from
`CONSTRAINTS.md` (a population typed rather than derived) in its quiet form. I looked for a
file-level or call-level witness for each of the four and did not find one.

Ranked by fragility, least to most:

1. `formatProposal` — exact export name, 2 sites, present in both, absent everywhere else.
2. `_LANGUAGES` — suffix, 4 sites, each already carrying a companion test that names the bound.
3. `fetchFn` — parameter name; a skill using `fetch` directly is invisible to it.
4. `*Gap`/`*Closed` — suffix, 16 sites; the widest and the one most likely to gain a member under
   another name.

**5.2 · `deliver`'s membership of V1 is the weakest cell in the table.**
`SCAFFOLD_LANGUAGES = ["en","fr"]` is a list of BCP-47 tags for the language a document is
*written* in. The other three are lists of language *names* for text the skill *reads*. The rule
"the bound is stated where the journalist reads it" holds for all four. Anything stronger — "the
declared lists agree", the obvious next rule — is **false for `deliver` by construction** and must
not be written. If the owner wants the stronger rule, `deliver` has to leave V1 and the trait needs
splitting.

**5.3 · Whether `intake`'s panel cluster belongs on this axis at all** — §4.2/4.3 above.

**5.4 · No rule proposed here has been written or tested.** Each is a claim that a rule *could* be
stated over a non-empty, non-total population. The mutation check that would prove any of them —
break the mechanism, watch the test go red — was outside this task, and `CONSTRAINTS.md` is right
that a green test nobody has broken is not evidence.

**5.5 · `deliver` also carries the P8 defect, which needs V2 and V3 together** — a rule
`requires: ["answers-a-phase-gate", "probes-a-live-service"]` derives `{splash, deliver}`,
non-empty and non-total. It is the best concrete argument for one namespace, and I could not verify
that it is the *only* such rule, because I did not enumerate mixed pairs exhaustively.

---

## 6 · Recommendation in one paragraph

Adopt V1–V4 in **one namespace with the existing 14**, widen the population to all fifteen skills
and tighten the four witnesses §0 lists, record `doctrine` as permanently outside with the argument
in §4.1, and record `newsroom-charter`'s two traits as inherited rather than earned. Start with V2:
it has the largest recorded defect history, the strongest existing partial mechanism (`COPIES`), and
a live open instance — `capabilityGap`, three copies, one divergent, unregistered — that would turn
red the day the rule is written, which is the only acceptance test worth having.
