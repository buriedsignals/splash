# The editorial exchange

The governing principle: **propose, do not interrogate.** Reacting is easy; inventing is hard. A
journalist on deadline does not fill in a questionnaire. This reference is the shape of the
conversation that produces `STORYBOARD.md` — ten movements, then the discipline that keeps every
one of them from decaying into a form.

**The order is the argument.** Every movement below depends on the one before it, and the run this
document was rewritten after got three of them backwards: the takeaway was grounded *after* the
journalist had already picked a treatment; medium, format and size were pinned in one undifferentiated
move; and the palette proposed the newsroom's colours before the subject's. Each is a decision taken
before the thing it depends on. Do not reorder these to save a turn.

## ① Restitution

Before any question, give back what was read: the claims in the article that could become visual,
ordered by strength. *"Here is what I read in your piece."* The journalist corrects. This catches
misreadings immediately instead of opening with a volley of questions about a text that may have
been misunderstood.

## ② The confirmed takeaway, and its grounding — G1

One non-skippable question: *if the reader keeps one sentence from this visual, which one?*
Confirmed **verbatim** and written into `STORYBOARD.md`'s `takeaway:` field. It is the only anchor
that later makes a drifting title detectable — the twin's predecessor's most recurrent failure.

**Then ground it, here, before anything is picked.** Run
`resolveGrounding(takeaway, profile, { csv })` (`scripts/propose.mjs`) against the frozen profile —
and hand it the text of the story's own frozen `source/data.csv`, which is where the ROW-level
facts a superlative needs come from, since no `profile.json` carries rows — then record
`groundingScalar(resolved)` as
`grounding:`. Three values close this gate: `supported`, `unverifiable`, or
`overridden — "<reason>"`. **`contradicted` is not a closing value**: a claim the data refutes is
either corrected with the journalist, or overridden by them with a reason THEY give —
`groundingScalar` throws rather than manufacture one. In the run this fired nine movements too late
— after the slot had been pinned — so the journalist was asked to dispose of a dispute about a
choice they had already made.

**How the many become the one.** `groundTakeaway` returns a verdict PER CLAIM and `grounding:` is a
single word, so the collapse is written down rather than left to whoever is running the exchange:
**any refuted claim → `contradicted`** · **at least one CONFIRMED claim, none refuted, and every
sentence of the takeaway read → `supported`** · **anything less → `unverifiable`**.

Two things deliberately do NOT make a takeaway `supported`, both because a check that cannot fail is
not support. A numeral that merely falls inside a column's range comes back `consistent` — placed,
not confirmed (`233` sits inside `incidents [96, 412]`, and so does the `100` of "100k"). And a
takeaway one of whose sentences produced no claim at all is one this check did not read the whole
of, so it withholds `supported` and names the sentence it never saw.

Whichever verdict lands, say what the check could and could not see — `resolved.detail` carries
both halves. An `unverifiable` claim is information, not a refusal, and it must not be presented as
one.

## ③ The journalist's hand — five questions, each with a destination

Every one of these harvests something the data cannot supply on its own, and every answer has a
named place it lands in the storyboard. That destination is what stops the five questions from
being disguised parameter collection: nothing is asked "because the form has a field for it" —
each question exists because a specific downstream decision cannot be made without it.

**Five questions, six fields**: credit yields both `credit` and `effectiveDate`, which is why the
hand has six destinations and this movement has five turns. An earlier draft of this file counted
four in its heading and listed five in its table — a model asking four and leaving one field empty
is refused by both gates with no explanation of which question it skipped.

**These questions come before the medium is chosen, so none of their destinations may presume one.**
`subject` is what the survey at ④ and the palette at ⑨ are *of*, so the hand has to stay early — but
an earlier draft of this table wrote destinations that only made sense for a chart ("the single
semantic accent", "baseline, second series"), and the run duly drew bars three times before any
medium existed.

| The question, as asked | What it harvests | Where it lands |
|---|---|---|
| *"In this data, who is the subject of your piece?"* | the subject, which the data does not designate — the maximum is not the subject | **the one element the visual emphasises, whatever its medium.** Real predecessor bug: a scatter labelled its max-y instead of the subject |
| *"What does the reader compare it to — last year, the average, the announced target, the next town?"* | the editorially meaningful reference point | **the reference the reader measures against** — the mechanism that carries it is chosen with the medium, not here. A number alone says nothing |
| *"What does this data NOT let you conclude?"* | the boundary the journalist knows and the data never states (sample, correlation vs causation, scope) | the anti-overclaim check on the title, and what an annotation is allowed to assert |
| *"Which paragraph does this visual follow — and what does the text already say next to it?"* | what is already written | **do not duplicate** (if the axis carries `2024`, the callout gives the value, not the year) |
| *"How do you credit it, and as of what date?"* | the house convention and the effective date | the visible source line, and traceability |

Asked one at a time. Every answer has a destination; none is disguised parameter collection.

The placement question used to carry a second clause — *"also feeds channel and size"* — and that
clause was not a destination at all, it was a **decision taken out of order**: format and size settled
at movement ③, before ④ had named a single type. It is now movements ⑥ and ⑦, where the journalist
is actually asked. Placement keeps only its editorial half.

### When the answer is "I don't know" or "none"

The first journalist session found the defect these questions had been shipped with: when the
answer was absence — "I don't know", "not yet decided" — the exchange
recorded the absence and moved on. That is harvesting, not accompaniment. These questions exist to
help the journalist think, not to extract a field from them; when they do not have an answer, the
system's job is to **propose one, with its reasoning, and let the journalist accept it, adjust it, or
reject it** — never to re-ask the same question, and never to silently manufacture an answer they
never gave.

Per question, on absence:

- **Subject** — propose the actor the confirmed takeaway already names, and say so: the takeaway is
  a sentence about someone or something, and that noun phrase is the candidate subject.
- **Comparison** — propose the reference point implied by the takeaway's own shape (a stated "than",
  a named period, an implied baseline) before falling back to "the average" or "last year" as a
  generic default.
- **Limits** — **"none" is a legitimate answer.** If the journalist sees no limit, that is the
  information, and it is recorded as given, verbatim — never replaced by an invented caveat. The
  system may still separately offer a limit it can see in the data itself (a short window, a
  correlation dressed as a cause, a source that only measures a proxy for the claim) for the
  journalist to accept or reject — offering is not manufacturing, and the two must not be conflated.
- **Placement** — the worked example, because this is the one the first session actually hit: with
  no placement decided, propose one from the article's own structure — *"this follows the paragraph
  that first states the divergence, which argues for mid-article placement"* — and say what that
  placement implies for the questions still to come, so the proposal is a reason, not a guess.
- **Credit** — propose the newsroom's standing convention (`NEWSROOM.md`, whose `credit` field
  preflight has already read back) and today's date as the effective date; the journalist confirms
  or corrects rather than dictating both from nothing.

None of this is a re-ask. The question was asked once; what follows an "I don't know" is a proposal
the journalist disposes of in one move, exactly as movement ⑩ already does for slots and candidates
— the same discipline, applied to all five questions, not only the last movement.

## ④ The survey — everything that could be made of this data

**Not a question.** It is the ground the medium question at ⑤ stands on, and it is the movement the
exchange did not have: forty type sheets ship in this toolchain and the conversation had never heard
of one of them, so the run offered three candidates that were three variants of the same bar.

Read `references/type-survey.md` — generated from the type sheets themselves, and read back by
`typeSurvey()` (`scripts/propose.mjs`) — then read `references/chart-choice.md`. Name the narrow
intent expressed by the confirmed takeaway and comparison, apply the chooser's hard refusals, and
rank only the types this story's frozen profile can actually support. Then name:

- the types the profile **could** support, each with what that type is for, in one line;
- a type the profile **cannot** supply the shape for, said as *not applicable, and why* (a slope
  needs exactly two moments; a bump needs a rank per period; a choropleth needs a region key);
- of each remaining type, whether it is **reachable** — `proposeMediums({capabilities})` and
  `proposeFormats({medium, capabilities})` (`scripts/propose.mjs`) run `formatGap` and
  `capabilityGap` for you and hand back every row with its own refusal attached. A medium closed by
  a missing key is said HERE, with what would open it, not three movements later.

The chooser is advisory. Its first surviving type is the recommendation, not a dispatch rule. A
lower-ranked type may lead when the subject, comparison, limits, placement or delivery context gives
it a stronger story-specific reason; say why the higher surviving type lost. Reachability is checked
after editorial fit, so an unproven type is reported as unproven rather than quietly ranked below a
weaker form. Do not ask the journalist to operate or override the ranking.

Genuinely different ways of seeing the same numbers, not three treatments of one. `assertDistinctWays`
refuses a candidate set whose candidates are not one idea each — the run offered three and all
three were stacked-or-grouped bars of the same three numbers. If the honest answer is that this data
supports two ways of seeing and no more, say two: what is refused is not "fewer than three", it is
several labels over one idea.

It counts IDEAS, not labels. A type resolves to whatever type its own sheet says it already is —
`types/lollipop.md` opens by calling itself "a bar chart's thin sibling: same job … 'a bar, minus
the fill'", so a menu offering a bar and a lollipop is one idea twice and is refused. The kinship is
declared in the sheet (`<!-- same idea as: … -->`) and generated into `references/type-survey.md`;
a sheet that declares kinship in prose without declaring it machine-readably fails the generator.

## ⑤ The medium — G2a

*Which KIND of visual is this?* Chart, map, or image — validated by the journalist before anything
narrower is discussed, because everything narrower depends on it. Carry a recommendation, with the
reason, drawn from ④. `proposeMediums({capabilities})` is the honest list: each medium with the
formats it reaches, the type sheets this toolchain holds for it, and — if the environment has closed
it — the sentence saying so.

Lands in the slot's `medium:`.

## ⑥ The format — G2b

This movement is a hard turn boundary. Present one recommendation and the complete publication-
format choice, ask which Splash should produce first, then **end the turn**. Nothing from ⑦–⑩ may
appear in that assistant message. A preference in `context.md` changes the recommendation; it never
answers the question.

*Static / print, Interactive web, Video, or Scrollytelling?* Offered **only where reachable for the medium just chosen** —
`proposeFormats({medium, capabilities})` returns all four with a `reachable` flag and a `why`, so a
format this medium cannot reach is named as absent rather than quietly omitted (`image` reaches
`static` and `scrolly`; it has no web or video producer, and the journalist hears that here).
Render the turn with
`formatPublicationFormatGate({recommended, rationale, options: proposeFormats({medium, capabilities})})`,
send that output unchanged, and stop.

After the journalist replies, record `format:` and take `reachable:` from
**`confirmFormatReachable({medium, format, capabilities})`** —
the one function that produces that `"yes"`, and only after `formatGap` and `capabilityGap` have both
returned `null`. It throws the refusal otherwise, so an unreachable pair cannot be handed a yes to
write down. **That recorded verdict is what both Gate-2 readings check**, and neither gate re-runs
the check — see `scripts/storyboard.mjs`'s header for why that matters. Until `propose.mjs` existed
nothing called either gap function at all, and `reachable:` was a field the gates read and no code
wrote.

## ⑦ The size — G2c

*Portrait, square, or landscape* for a static or a video. **A web or a scrolly page takes NO size
at all** — it fills whatever container the CMS gives it, so nothing is asked here and the slot
carries no `size:` field. Never record a fluid size: both Gate-2 readings refuse that value
(*"a web beat takes no size — it fills the container it is given, so leave the field out; there is
no 'fluid' size"*), and this very line used to name it as the value for web and scrolly — a refusal
a model earned mid-journey by following the instructions it was given.

The set, exactly as `proposeSizes(format)` computes it and `sizeGap` enforces it — `exchange-shape.test.ts`
compares this line against both, so it cannot drift into naming a value the gate refuses again:

    static: landscape, square, portrait
    video: landscape, square, portrait
    web: none
    scrolly: none

`proposeSizes(format)` (`scripts/propose.mjs`) is the reachable set. Where it has **one member,
state it and say so** — "this ships landscape; portrait and square are not built yet" — rather than
staging a question with one answer. Where it has more, ask. Where it is EMPTY the format takes no
size at all and none is recorded. Either way widening the set later widens a set and re-plumbs
nothing.

## ⑧ The reference loop, shown

Find two or three real newsroom treatments of **the same argument structure** and show them: *"the
FT treated this class of argument this way, the NYT that way — the first foregrounds the trajectory,
the second the comparison."* Look the structure up by its own column in
`doctrine/references/reference-set.md`; live research is run when the argument structure is new
to the set — before coding a substantial chart or establishing a new chart family, never after.

**This movement ends in a real question**, like every other one. It is the only movement in the
journey that used to have none: the run showed two references and the next question was about the
slot, so the journalist was never asked. The answer lands in `reference:` — and *"the journalist
rejected both"* is recorded as `none — both rejected`, a fact, not a loss.

It is the one point in the journey where taste travels both ways: the model gains a concrete target
instead of an abstract rule, and the journalist gains vocabulary for saying what they want. This is
quality lever number one.

## ⑨ The palette and the typeface — subject first, newsroom second, journalist third

`palette`'s `proposePalette` proposes in that order and recommends in that order. A convention
the reader already holds (blue for water, green for renewables) beats house colours for THIS chart,
because it is doing work the legend would otherwise have to do. When no convention applies to the
subject, the proposal SAYS so and the newsroom's colours lead — never silently reduced to one
option with no explanation, which is what the run did.

Lands in `PALETTE.md`.

**And the same question for the TYPE, in the same movement.** `palette`'s `proposeTypeface({
newsroom, resolves })` offers every face `NEWSROOM.md` records, in the newsroom's own order, plus
the substrate's own stack as an explicit option — each one MEASURED on the machine that will
render, because resvg draws the fallback for a face it does not have and reports nothing.
`writeTypeface` records the answer. Lands in `TYPEFACE.md`, beside `PALETTE.md`.

It is asked here, at the movement where the newsroom's own charter is already open, and not left to
the render: five render paths refuse without that file, and until round four nothing anywhere wrote
one — so a story reached its first render with a refusal naming three ways out and no way to take
any of them. There is always an answer: a face this machine does not have is refused rather than
swapped, and `origin: default` records the stated fallback as a choice with the gap named.

## ⑩ The storyboard proposal, and the beat brief

Slots and candidates, presented **as readable narrative, not a table of specs**: what each proves,
its medium, its format, its size, and one line of why. `formatCandidates({medium, candidates,
profile, capabilities})` (`scripts/propose.mjs`) renders that list FROM the verdicts — each candidate
carries the type sheet's own purpose sentence verbatim and the reason THIS story is worth seeing that
way, which is required, because a candidate with no reason is a name in a list. A candidate whose
pair the catalog refuses cannot be rendered at all.

**AND EACH CARRIES THE OTHER HALF OF ITS OWN SHEET.** Every candidate line names when NOT to reach
for that type, in the sheet's own words, because a slot once closed on a Scatter of six rows while
`types/scatter.md` refused exactly that on disk. Pass the frozen `profile`: where a sheet states a
limit in ROWS — the one unit `source/profile.json` carries — this THROWS rather than renders. A
limit in any other unit (slices, levels) is handed to the journalist to check by hand rather than
silently measured against a row count, which is not what the sheet means. When a candidate departs from the chooser's first
surviving type, its reason also says why. The journalist drops, reorders, adds, vetoes.
Then it is written — `checkStoryboard` in `scripts/storyboard.mjs` is exactly this gate,
machine-checked: every slot needs a `chosen` candidate that is one of its own `candidates`, or gate
2 has not actually closed no matter what the conversation implied.

### After the treatment is chosen — custom or Datawrapper, conditionally

Treatment selection above is platform-neutral. Only after the journalist has chosen a treatment,
check it with `datawrapperMatch({medium, format, treatment})` from
`scripts/producer-gate.mjs` against `references/datawrapper-chart-types.json`.

- No mapping, or a format Datawrapper cannot fulfil: ask nothing. The absence of producer fields is
  the canonical custom state for an unmapped treatment; continue because Datawrapper was never a
  faithful option for this chosen treatment.
- A faithful mapping: render `formatProducerGate(...)`, ask whether the journalist prefers
  Datawrapper or a custom build, and **end the turn**. Do not run production in the same turn.
- On the next reply: persist `producer: custom`, or persist `producer: datawrapper` together with
  the catalogue's exact `datawrapperType`. Validate it through `confirmProducerChoice(...)`.

Never fold this preference into the candidate menu. The journalist first chooses the chart that
best proves the claim regardless of platform; only then do they choose how that chart is made.

**And what the journalist DROPPED is written down too, before this movement ends.** The angles this
survey found and the storyboard did not keep are the article's other sub-subjects — already found,
already grounded, already checked reachable — and they used to live in this conversation and die
with it. `recordSurveyedSubjects({storyDir, subjects})`
(`skills/deliver/scripts/other-subjects.mjs`) writes every angle ④ turned up, kept or dropped,
into `stories/<slug>/SUBJECTS.md`: an `id` that could name a beat directory, the `medium` and
`format` it would take, and `learns` — what the READER would learn from it, in a sentence, because a
type name is not a reason to draw something. It is read back at the very end of the run, re-checked
against the story as it then stands, and offered: *"Ou même le relancer sur des sous-sujets de son
article qui seraient intéressants à transformer en visuel"* (the owner, 2026-08-10). Nothing here is
invented for the record — an article that yielded one angle records one.

**And the call is no longer optional in practice, because the delivery refuses without it.** This
movement used to say `recordSurveyedSubjects` is called before it ends, and nothing checked: the
reader at the end of the run read a MISSING `SUBJECTS.md` as an empty survey and told the journalist
their article's other angles had been looked at when none ever had. `readSurveyedSubjects` now
throws, naming this movement and this call. An article that genuinely yielded nothing else is
recorded as the empty survey — `subjects: []` — because "there was nothing else" is an answer, and
an answer is written down.

Then `BRIEF.md`, before any code: evidence hierarchy, reveal order, single accent, source, the
anti-patterns of this case. Derived from the nine previous movements, so never conjured from nowhere.

## Discipline of the exchange — our failures, as rules

- **One question at a time.** Never a questionnaire.
- **Always carry a recommendation — everywhere in the exchange, not only in the proposal.** Never
  make someone choose in a vacuum. The system accompanies the journalist's thinking rather than
  extracting fields from them; the decision is always theirs; when they hand the choice back, it
  proposes the most suitable option and explains why, with the trade-offs.
- **A recommendation may not be DRAWN as a chart before a chart has been chosen.** The run illustrated
  three hand questions with ASCII bar charts, at movement ③, a whole movement before any medium existed
  — so the journalist was shown bars five times before being asked whether this was a chart at all.
  A recommendation before ⑤ is a sentence.
- **Never ask twice.** Repetition is a bug, not caution.
- **Silence is not consent.** A proposal waits for an answer.
- **The journalist's language governs** the entire exchange, errors and recaps included — and it is
  RECORDED, in `STORYBOARD.md`'s `language:` field, as its code (`fr`, `de-CH`). Ruling R4: it
  follows the ARTICLE, not the newsroom's configuration (a francophone paper can publish in
  English), and it is confirmed with the journalist against what `NEWSROOM.md` says the newsroom
  publishes in. It is written down because the exchange is not the last thing they read: the
  delivery writes `HANDOVER.md` and makes both halves of the closing offer long after this
  conversation's own language has stopped being visible, and it reads that field rather than
  guessing. A hand-over came out in English on a French story exactly once, for want of it.
- **Never write in their place**: not the title, not the takeaway, not the caption, not the
  source, without validation. Editorial intent never leaves the journalist.
- **A gate closes into a file**, not into the conversation.
