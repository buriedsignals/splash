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

A numeral is placed against the column its own SENTENCE names, never against whichever column
happens to contain it, so a takeaway naming two measures gets a refusal naming both rather than a
placement nobody chose; and a bare calendar year is read as a period, not as a measurement. Where
the sentence states a scale word ("1.12 million") the numeral is read both ways — as written and
multiplied — because the column's own unit may already carry the scale.

Whichever verdict lands, say what the check could and could not see — `resolved.detail` carries
both halves, including WHY each unplaced claim could not be placed. An `unverifiable` claim is information, not a refusal, and it must not be presented as
one.

### The second question at G1 — what SHAPE is this claim? (round six, task LANG)

Every superlative pattern behind `resolveGrounding` is a regex written by hand, one language at a
time, because a superlative is **grammar, not vocabulary**: `أكثر من غيرها`, `the most`, `le plus`,
`najwięcej`, `το περισσότερο`. No table of labels gives morphology and word order, so this hole
cannot be closed by data at all — `stress-ad-polish-hospital-beds` asserts a Polish superlative and
the check produced **no claim at all**, which reads exactly like a takeaway with nothing in it.

So ask the journalist, about the sentence they have just confirmed:

> **Is this a maximum, a minimum, a comparison between two named things, a total, or none of those
> — and about which column?** (If it is a comparison: which two, and which of them is ahead.)

They are reading their own sentence, so the question is language-independent by construction.
Record the answer in `STORYBOARD.md`'s own front matter, beside `grounding:`:

    claimShape: "maximum"                 maximum · minimum · comparison · total · none
    claimColumn: "łóżka_szpitalne"
    claimEntity: "Mazowieckie"
    claimVersus: "Śląskie"                comparison only
    claimDirection: "greater"             comparison only — greater · less

and pass it to the grounding call: `resolveGrounding(takeaway, profile, { csv, recorded })` at G1,
or `{ csv, storyboard: meta }` on any later re-grounding, which reads it back out of the file.

Three rules govern what the answer then does, and the third is the one that matters:

1. **The guess stays as the default.** A journalist who answers nothing gets exactly the behaviour
   this check had before. Never invent an answer on their behalf; `claimShape` absent is a complete
   and ordinary state.
2. **The recorded shape wins.** A journalist who answers is not second-guessed by a regex.
3. **The disagreement is REPORTED.** Where the check's own patterns read a different shape for the
   same sentence and the same entity, that reading is taken out of the claims it may decide with and
   printed in `resolved.detail` — *"N reading(s) by this check's own patterns disagreed and were set
   aside — each one is a defect in those patterns, not in the takeaway"*. **Say that sentence out
   loud to the journalist.** It is the only way a defect in those patterns will ever surface: a
   parser silently overruled is a parser nobody can audit. Measured on
   `stress-u-rhone-glacier`, whose "the lowest since 1990" the patterns read as a comparison and
   confirmed — true here, and the next one will not be.

A half-recorded answer is refused by gate 2 rather than half-used: a shape with no column, a
comparison with only one side or no direction. That state is the one in which nobody can tell
whether the journalist was asked and declined or was never asked at all, which is the silence the
whole of this movement exists to remove.

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
| *"Where should we position this graphic?"* — then read the frozen article at that position and propose what it already says, for confirmation | what is already written | **do not duplicate** (if the axis carries `2024`, the callout gives the value, not the year) |
| *"Who does this data come from, how do you credit them, and as of what date?"* | the SOURCE, credited — or, said plainly, that there is none | the visible source line, and traceability. **`unattributed` is a legitimate answer** and prints `Source: not stated` on the artefact |

Asked one at a time. Every answer has a destination; none is disguised parameter collection.

The placement question used to carry a second clause — *"also feeds channel and size"* — and that
clause was not a destination at all, it was a **decision taken out of order**: format and size settled
at movement ③, before ④ had named a single type. It is now movements ⑥ and ⑦, where the journalist
is actually asked. Placement keeps only its editorial half.

**ASK THE POSITION; DON'T ASK THEM TO READ THE ARTICLE BACK.** This question used to be asked as
*"Which paragraph does this visual follow — and what does the text already say next to it?"*, and a
journalist answered: *"I have no idea what you are talking about … if the goal is placement the
question needs to be framed differently like 'Where should we position this graphic'. I trust your
opinion."* Their wording is the actual decision, and they engaged with it immediately.

Two clauses were doing different jobs and only one of them belonged to the journalist. The frozen
article on that run was 2,746 lines across 20 sections — *"which paragraph"* has no answer anybody
produces from memory at that size, and the second clause lands as a comprehension test. **The
position is theirs; what the text says at that position is ours to read out of the frozen article
and propose back for confirmation.** The `do not duplicate` destination is unchanged and is still
the reason the movement exists; it is just no longer harvested by asking a journalist to recite
their own copy.

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
- **Credit** — **`unattributed` is a legitimate answer, and it is the DEFAULT one.** Run
  `proposeCredit({ newsroom, article })` (`scripts/storyboard.mjs`): it reads the article's own
  attributing sentences back — verbatim, never rewritten — offers the newsroom's standing convention
  from `NEWSROOM.md` beside them, and always carries a third option whose recorded value is
  `unattributed` and whose printed line is `Source: not stated`. It recommends the article's own
  words where the article has any, and `none` where it has none. **A line the article MARKED as its
  source outranks a sentence that merely carries a cue**, and what is offered is what the marker
  points at, not the label with it: `real-ember-renewables-share` writes *"Source line, verbatim
  from the file's metadata: Ember (2026) and other sources – with major processing by Our World in
  Data"*, and the proposal that missed it recommended the article's opening narrative sentence,
  newline and all, as the line that would print under the chart. Every proposed value is one line —
  a credit prints on one. It never recommends the house
  convention on its own, because that convention is a TEMPLATE with `{source}` where the story's
  source goes, and filling that hole from nothing is exactly the failure this rule was written for:
  `stress-p-transport-ridership` shipped three delivered beats reading *"Source: city network
  figures for 2025, compiled by Buried Signals"* — an article that attributes nothing, and the
  newsroom's own name in `NEWSROOM.md` doing duty as a data source it never touched. A credit is
  the one hand field that names a THIRD PARTY, so an invented one is not a weak answer, it is a
  false statement about somebody else. Today's date is still proposed as the effective date.

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

**ASK THE INTENT OUT LOUD, and record it.** Step 1 of `chart-choice.md` is the highest-leverage
line in the whole document, and it used to happen silently inside the agent's head. *"Show
association"* and *"show departure from an expected ordering"* reach different rank-1 forms from the
same two columns of data — a question a journalist answers instantly and an agent gets wrong. On a
real run one did: the intent was assumed to be association, Scatter is rank 1 there, and the claim
was actually that one commune departs from an expected ordering, where the rank-1 forms are the
diverging bar and the dumbbell. The editor persona had independently offered the dumbbell. Nothing
downstream could tell, because nothing was written down.

So the slot records `intent:`, and both gate readers refuse without it. One field, asked where the
slot is defined — naming what the slot is FOR is the same 2a question as naming its medium. Walking
the ranking from there, and reading the selected type's own sheet before proposing it (step 6, which
was being skipped), is what the guide asks; this records the step that decides the rest.

**A reference is not evidence that a form is right.** If the inspiration lookup at ⑧ argues for a
candidate the ranking REMOVED, state the conflict and resolve it; do not settle it silently in the
reference's favour. On the run above, the external chart justified Scatter on the strength of a
fitted expectation line, and the chosen producer could not draw one — so the justifying mechanism
was never built. A reference is a way of executing a form well.

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

**And when the answer is "several" — one slot, not several slots.** A scroll-driven piece is a
VEHICLE: it assembles different media behind one narrative, and round six ran one that was a chart,
then two photographs, then a locator map, in that order, as one beat. Its slot recorded
`medium: chart` and said underneath, in its own prose, that this "is a compromise, not a reading",
because a slot carried exactly one medium and the record had no way to say what the beat IS.

So a slot on an assembling format also records **`assembles:`** — the media in the order the reader
meets them, opening on the slot's own `medium`:

    medium: chart
    format: scrolly
    assembles: [chart, image, map]

The list is the ORDER, not a set, and its first entry IS `medium:` — which stays the single key
production dispatches on, and stops being a compromise. It is recorded **only** on a format that
carries several behind one narrative (`scrolly` today); a static or a video beat draws one medium,
and a static slot listing two is refused with the answer: that is one slot per medium. A scrolly
that genuinely draws one medium records no `assembles:` at all, and a list of ONE is refused,
because it says nothing the `medium:` field does not.

**It does NOT become several slots.** A slot is one claim, one beat directory, one brief, one
approval and one delivery. Splitting that beat into three would have been three of each for one
visual — which is exactly what the journalist did not ask for.

## ⑥ The format — G2b

This movement is a hard turn boundary. Present one recommendation and the complete publication-
format choice, ask which Splash should produce first, then **end the turn**. Nothing from ⑦–⑩ may
appear in that assistant message. A preference in `context.md` changes the recommendation; it never
answers the question.

*Static, Interactive web, Video, or Scrollytelling?* Offered **only where reachable for the medium just chosen** —
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

**And a journalist may want more than one of them, for one argument.** Round six: *portrait for the
stories, and square for the feed* — one claim, one beat, two frames. The record held one size, so
the only shape the contract offered was a second slot, which is a second beat, a second brief, a
second approval and a second delivery for one visual; the producer pinned one size on the slot and
registered two compositions inside the beat, leaving the record saying one thing and the delivery
doing another.

So `size:` takes a LIST when they ask for more than one:

    size: [portrait, square]

Ask the question once, and record every frame they name. Both Gate-2 readings check each entry
against the set above and refuse the same frame recorded twice (*"a slot exports each frame once"*).
A format that takes no size takes no list either.

`proposeSizes(format)` (`scripts/propose.mjs`) is the reachable set. Where it has **one member,
state it and say so** — "this ships landscape; portrait and square are not built yet" — rather than
staging a question with one answer. Where it has more, ask. Where it is EMPTY the format takes no
size at all and none is recorded. Either way widening the set later widens a set and re-plumbs
nothing.

**There is no print size and no print question.** Every export is a screen artefact at one of the
three sizes above; a printed edition re-lays it out downstream, from the delivered file. A
`destination: screen | print` field used to be asked here and read by nothing, and it was deleted
for that reason (issue #59) — a recorded answer nobody reads is a guess written into the record.

## ⑧ The reference loop — OFFERED, not required

Find two or three real newsroom treatments of **the same argument structure** and show them: *"the
FT treated this class of argument this way, the NYT that way — the first foregrounds the trajectory,
the second the comparison."* Look the structure up by its own column in
`doctrine/references/reference-set.md`; live research is run when the argument structure is new
to the set — before coding a substantial chart or establishing a new chart family, never after.

**IT IS OFFERED AT THE TREATMENT DECISION, AS A THIRD OPTION** — beside the menu of candidates and
the recommended process — and Gate 2 closes without it. `reference:` is no longer in
`REQUIRED_SCALARS` and there is no `G2-reference` gate. When the journalist takes it, the answer
lands in `reference:` exactly as before.

Why it stopped being compulsory: its intent is about INSPIRATION, not validation, and inspiration
is something a journalist reaches for when they want it — not a toll gate between choosing a size
and choosing a colour. By this point the medium, format and size are settled and the next real
question is which treatment to produce; two published treatments arriving in between, each needing
a paragraph of explanation, interrupt a decision the journalist is already making. Its own answer
vocabulary gave it away: *"the journalist rejected both"* was recorded as `none — both rejected`,
and this file had to insist that was "a fact, not a loss". **A movement that must defend its own
null answer should not have been mandatory.**

Taken deliberately it is still the one point where taste travels both ways — the model gains a
concrete target instead of an abstract rule, and the journalist gains vocabulary for saying what
they want. It is a strong lever, and a lever is pulled, not tripped over.

**A reference never overrides a ranking removal** (#48). If the inspiration argues for a candidate
`chart-choice.md` removed, say so and resolve it; a reference is a way of executing a form well, not
evidence that the form is right.

## ⑨ The palette and the typeface — subject first, newsroom second, journalist third

**ASK ONLY WHEN THERE IS SOMETHING TO DECIDE** (#41). Call `paletteDecision({ newsroom, subject })`
first. On most stories it answers `ask: false` — no subject convention applies and the newsroom's
own pair clears the floor — and the palette is DERIVED from `NEWSROOM.md`, measured on write, and
written with `origin: newsroom`. Nobody is asked, because `NEWSROOM.md` already carries the answer
and preflight already validated it.

It asks in exactly two cases, and both are real decisions:

1. **A subject convention competes** — blue for water, green for renewables. It is doing work the
   legend would otherwise have to do, for THIS chart, and that beats looking like the masthead.
2. **The house pair fails the floor.** The newsroom's own colours cannot be used as they stand, and
   the remedy is the journalist's to choose. The refusal names the measurement and the nearest
   colour that clears it.

Nothing this movement exists for is lost by not asking. The value is the FLOOR and the PROVENANCE,
not the prompt: `formatPalette` measures before it writes, so a failing pair surfaces as case 2
rather than as a silent file, and `parsePalette` still measures again on read.

When it does ask, `proposePalette` proposes in that order and recommends in that order. When no
convention applies, the proposal SAYS so and the newsroom's colours lead — never silently reduced
to one option with no explanation, which is what the run did.

The escape hatch is unchanged: a journalist who wants a different colour for one beat drops a
`PALETTE.md` beside it, and `readPalette` finds the nearest one first.

Lands in `PALETTE.md`.

**And the same question for the TYPE, in the same movement.** `palette`'s `proposeTypeface({
newsroom, resolves, sample })` offers every face `NEWSROOM.md` records, in the newsroom's own order,
plus the substrate's own stack as an explicit option — each one MEASURED on the machine that will
render, because resvg draws the fallback for a face it does not have and reports nothing. **Pass
`sample`**: the strings this story will actually draw, category labels and all. Without it every
answer is about a Latin probe, which on a Greek or Arabic story is an answer to another question —
and the proposal's own `sampleLimit` says which of the two you are reading.
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

**A candidate is an object, and this is the shape both functions accept:**

```js
{ type: "Beeswarm", why: "every country as its own mark", format: "static", marks: 211 }
```

`type` and `why` are required; `format` and `marks` are optional. `marks` is how many marks THIS
beat would draw. A bare treatment name, a candidate with no reason, an unknown key, or a `marks`
that is not a whole count are each refused by name — `assertDistinctWays` and `formatCandidates`
read the same shape through the same reader, so a set that passes one cannot throw in the other.

**AND EACH CARRIES THE OTHER HALF OF ITS OWN SHEET.** Every candidate line names when NOT to reach
for that type, in the sheet's own words, because a slot once closed on a Scatter of six rows while
`types/scatter.md` refused exactly that on disk. **A sheet's limit in ROWS is about the MARKS the
beat draws, never the source table's row count**: pass `marks` on the candidate and this THROWS
rather than renders; leave it out and the limit travels to the journalist as a by-hand check with
the row count printed beside it, so the difference is visible. On a long-form panel those two
numbers are nothing like each other — 7,585 rows for a beat drawing 211 marks — and the version
that assumed they were the same quoted `beeswarm.md`'s own sentence at the journalist as though it
were about their beat. A limit in any other unit (slices, levels) is handed to the journalist to
check by hand for the same reason. When a candidate departs from the chooser's first
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
- A faithful mapping: render `formatProducerGate({treatment, match, format, capabilities})`, ask
  whether the journalist prefers Datawrapper or a custom build, and **end the turn**. Do not run
  production in the same turn.
- A faithful mapping the newsroom's GROUND cannot carry in this format: the same call states what
  preflight measured — the ground, and that a published Datawrapper embed follows the reader's own
  colour scheme — and names custom as the path that remains. There is no question there, because
  the Datawrapper answer to it is one `confirmProducerChoice` refuses.
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

**And the call is not optional, because GATE 2 ITSELF refuses without it.** This movement used to
say `recordSurveyedSubjects` is called before it ends, and nothing checked: the reader at the end of
the run read a MISSING `SUBJECTS.md` as an empty survey and told the journalist their article's other
angles had been looked at when none ever had. `readSurveyedSubjects` throws for that, naming this
movement and this call. An article that genuinely yielded nothing else is recorded as the empty
survey — `subjects: []` — because "there was nothing else" is an answer, and an answer is written
down.

**But a refusal at the END of the run is not a gate, it is a wall.** The throw arrived after the
storyboard, the palette, the component, the render, the approval and the hand-over, and six formats
across two rounds each hit it and each wrote the file retroactively, from memory of a survey that had
already happened — the exact failure the file exists to prevent, happening around the file itself.
So **gate 2 closes into TWO files**: `STORYBOARD.md` and `SUBJECTS.md`. `surveyGap(storyDir)` is the
one decision that says so, exported by `storyboard/scripts/storyboard.mjs` for this phase to run on
itself beside `checkStoryboard`, and carried byte-identically by `splash/scripts/where.mjs`, whose
`whereIs` reports the gap as `G2-subjects` and keeps the story in the `storyboard` phase until this
movement has actually happened. `checkStoryboard` stays pure over the front matter and takes no
second argument; the file question is a directory question and is asked by the function that owns
it.

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
