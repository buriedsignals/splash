# The editorial exchange

The governing principle: **propose, do not interrogate.** Reacting is easy; inventing is hard. A
journalist on deadline does not fill in a questionnaire. This reference is the shape of the
conversation that produces `STORYBOARD.md` — six movements, then the discipline that keeps every
one of them from decaying into a form.

## ① Restitution

Before any question, give back what was read: the claims in the article that could become visual,
ordered by strength. *"Here is what I read in your piece."* The journalist corrects. This catches
misreadings immediately instead of opening with a volley of questions about a text that may have
been misunderstood.

## ② The confirmed takeaway — G1

One non-skippable question: *if the reader keeps one sentence from this visual, which one?*
Confirmed **verbatim** and written into `STORYBOARD.md`'s `takeaway:` field. It is the only anchor
that later makes a drifting title detectable — the twin's predecessor's most recurrent failure.

## ③ The journalist's hand — five questions, each with a destination

Every one of these harvests something the data cannot supply on its own, and every answer has a
named place it lands in the storyboard. That destination is what stops the five questions from
being disguised parameter collection: nothing is asked "because the form has a field for it" —
each question exists because a specific downstream decision cannot be made without it.

| The question, as asked | What it harvests | Where it lands |
|---|---|---|
| *"In this data, who is the subject of your piece?"* | the subject, which the data does not designate — the maximum is not the subject | **the single semantic accent.** Real predecessor bug: a scatter labelled its max-y instead of the subject |
| *"What does the reader compare it to — last year, the average, the announced target, the next town?"* | the editorially meaningful reference point | baseline, second series, annotation. A number alone says nothing |
| *"What does this data NOT let you conclude?"* | the boundary the journalist knows and the data never states (sample, correlation vs causation, scope) | the anti-overclaim check on the title, and what an annotation is allowed to assert |
| *"Which paragraph does this visual follow — and what does the text already say next to it?"* | what is already written | **do not duplicate** (if the axis carries `2024`, the callout gives the value, not the year). Also feeds channel and size |
| *"How do you credit it, and as of what date?"* | the house convention and the effective date | the visible source line, and traceability |

Asked one at a time. Every answer has a destination; none is disguised parameter collection.

### When the answer is "I don't know" or "none"

The first journalist session (`twin/JOURNALIST-TEST-RESULT.md`) found the defect these five
questions had been shipped with: when the answer was absence — "I don't know", "not yet decided" —
the exchange recorded the absence and moved on. That is harvesting, not accompaniment. These
questions exist to help the journalist think, not to extract a field from them; when they do not
have an answer, the system's job is to **propose one, with its reasoning, and let the journalist
accept it, adjust it, or reject it** — never to re-ask the same question, and never to silently
manufacture an answer they never gave.

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
  that first states the divergence, which argues for mid-article placement, `article-web` channel,
  full-width size, not a lead visual"* — and say what that placement implies downstream, so the
  proposal is a reason, not a guess.
- **Credit** — propose the newsroom's standing convention (`NEWSROOM.md`) and today's date as the
  effective date; the journalist confirms or corrects rather than dictating both from nothing.

None of this is a re-ask. The question was asked once; what follows an "I don't know" is a proposal
the journalist disposes of in one move, exactly as movement ⑤ already does for slots and candidates
— the same discipline, now applied to all five questions, not only the last movement.

## ④ The reference loop, shown — the new part

Find two or three real newsroom treatments of **the same argument structure** and show them: *"the
FT treated this class of argument this way, the NYT that way — the first foregrounds the
trajectory, the second the comparison."* The journalist picks or rejects.

It is the only point in the journey where taste travels both ways: the model gains a concrete
target instead of an abstract rule, and the journalist gains vocabulary for saying what they want.
This is quality lever number one.

The named reference set ships in `twin-doctrine`; live research is run when the argument structure
is new to the set — before coding a substantial chart or establishing a new chart family, never
after.

## ⑤ The storyboard proposal — G2

Slots and candidates, presented **as readable narrative, not a table of specs**: what each proves,
its medium, its genre, its vehicle if any, and one line of why. The journalist drops, reorders,
adds, vetoes. Then it is written — `checkStoryboard` in `scripts/storyboard.mjs` is exactly this
gate, machine-checked: every slot needs a `chosen` candidate that is one of its own `candidates`,
or gate 2 has not actually closed no matter what the conversation implied.

## ⑥ The beat brief

`BRIEF.md` before any code: evidence hierarchy, reveal order, single accent, source, the
anti-patterns of this case. Derived from the five previous movements, so never conjured from
nowhere.

## Discipline of the exchange — our failures, as rules

- **One question at a time.** Never a questionnaire.
- **Always carry a recommendation — everywhere in the exchange, not only in the proposal.** Never
  make someone choose in a vacuum. The system accompanies the journalist's thinking rather than
  extracting fields from them; the decision is always theirs; when they hand the choice back, it
  proposes the most suitable option and explains why, with the trade-offs.
- **Never ask twice.** Repetition is a bug, not caution.
- **Silence is not consent.** A proposal waits for an answer.
- **The journalist's language governs** the entire exchange, errors and recaps included.
- **Never write in their place**: not the title, not the takeaway, not the caption, not the
  source, without validation. Editorial intent never leaves the journalist.
- **A gate closes into a file**, not into the conversation.
