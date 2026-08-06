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
- **Always carry a recommendation.** Never make someone choose in a vacuum.
- **Never ask twice.** Repetition is a bug, not caution.
- **Silence is not consent.** A proposal waits for an answer.
- **The journalist's language governs** the entire exchange, errors and recaps included.
- **Never write in their place**: not the title, not the takeaway, not the caption, not the
  source, without validation. Editorial intent never leaves the journalist.
- **A gate closes into a file**, not into the conversation.
