# The journalist test — protocol

The one thing no agent can simulate. Everything else about this branch has been tested by the same
system that built it, including the editorial exchange, which an agent played convincingly and
therefore proved nothing about.

**Budget: one session, 30–45 minutes, one real journalist, one of their own articles.**

---

## What is actually being tested

Not "is the tool good". The premise underneath the whole editorial layer:

> **We propose, we do not interrogate. Reacting is easy; inventing is hard. A journalist on
> deadline does not fill in a questionnaire.**

If that premise is wrong, the storyboard skill is wrong, and no amount of work on the craft skills
rescues it. This session is the cheapest possible way to find out.

A second thing rides along: whether the five hand-of-the-journalist questions harvest editorial
judgement or merely collect parameters in disguise. The proof run claims every one of them changed a
pixel — but the agent answering them had read the doctrine that wrote them.

---

## Setup (about 20 minutes, done before they arrive)

1. Copy `skills/splash-twin/assets/root-template/` to a folder, `bun install`, add a `.env` with the
   keys, and write a real `NEWSROOM.md` for their newsroom — name, url, language, house colour,
   ground, typefaces.
2. Run the preflight. It must be green before they sit down. Their first five minutes must not be
   spent watching an install.
3. Ask them in advance for **one published article of their own with a dataset behind it**. Not a
   demo, not something chosen to suit the tool. Freeze it with `twin-intake` beforehand so the
   session starts at the exchange, which is what is being tested.
4. Have the run driven by whoever is hosting, with the journalist answering. They should not have to
   type into a terminal.

---

## The rule for the person running it

**Do not help.** The instinct to rescue a bad question — to rephrase it, to add an example, to
explain what the tool is getting at — is exactly what will hide the defect. If a question lands
badly, let it land badly and write down that it did.

Say once, at the start: *"If a question is unclear or annoying, say so — that is what we are
testing, not you."* Then stay quiet.

---

## What to observe, movement by movement

Record behaviour, not opinion. The signals below are what distinguish a working exchange from a
polite one.

### ① Restitution — the claims read back before any question

- Did they **correct** it? A correction is the strongest positive signal in the whole session: it
  means the restitution was specific enough to be wrong.
- Did they correct a **fact**, or only a framing? (In the proof run, the agent-journalist corrected a
  date and was itself wrong — the frozen data settled it. Watch for whether that exchange happens
  and whether it feels like help or like being second-guessed.)
- Or did they just say "yes, that's right"? Bland agreement means the restitution was too vague to
  be useful, and movement ① is not earning its cost.

### ② The confirmed takeaway

- How long did they take? Hesitation here is **information, not failure** — it may be the first time
  anyone asked them to compress the piece to one sentence.
- Did they give a sentence, or a topic? "Emissions are falling" is a topic. "In 2024 Switzerland
  emitted less than in 1967" is a takeaway. If they give a topic and the tool accepts it, the gate
  is not doing its job.
- Did they want to change it later? If so, note where — that tells you whether the gate closed too
  early.

### ③ The five questions — the core of the test

Ask them one at a time, as written. Record for each: **the time to answer**, and whether they
answered *that* question or a different one.

| # | As asked (fr) | What it is for | Failure signal |
|---|---|---|---|
| 1 | *« Dans ces données, qui est le sujet de votre papier ? »* | the single semantic accent | they name the maximum instead of their subject, or ask what you mean by "sujet" |
| 2 | *« À quoi le lecteur compare — l'an dernier, la moyenne, l'objectif annoncé, la commune d'à côté ? »* | the baseline / reference line | they say "I don't know, whatever is normal" — the comparison is the argument, and if they have none the chart may not have one either |
| 3 | *« Sur quoi ces données ne permettent PAS de conclure ? »* | the anti-overclaim guard on the title | they answer with a data-quality caveat instead of an editorial limit, or draw a blank |
| 4 | *« Ce visuel arrive après quel paragraphe — et qu'est-ce que le texte dit déjà juste à côté ? »* | not duplicating the prose | they have not decided where it goes; note whether the tool copes |
| 5 | *« Vous créditez comment, et à quelle date d'effet ? »* | the visible source line | friction here is fine and expected; note if it feels bureaucratic at the end of a run |

**The question to watch hardest is 3.** It is the one most likely to feel like an exam. If a
journalist bristles at being asked what their data cannot prove, that is worth knowing before this
ships to a newsroom.

### ④ The reference loop

Known gap: the shipped set has four rows and covers few argument structures. If theirs is not
covered, the honest move is to say so and show the nearest analogy — watch whether that reads as
useful or as padding.

- Did the references change what they wanted? Or did they nod politely and keep their first idea?
- Did they ask to see more? That would mean the loop is working and the set is too small.

### ⑤ The proposal — slots and candidates

- **Did they veto anything?** If a journalist never rejects a candidate across a whole session, the
  proposal mechanism is decorative. Vetoing is the behaviour the design is built around.
- Did they pick the recommendation, or a different one? Both are fine; never deviating is not.
- Did they want a treatment that was not offered?

### Production and the render

- At Gate 3, when they see the PNG: what is the **first thing** they say? First reactions are the
  only unrehearsed data in the session.
- Did they ask for a change? Was it expressible, or did it need code?

---

## The closing question, asked exactly like this

> *"En une phrase, qu'est-ce que ce visuel prouve ?"*

Compare their answer to the takeaway they confirmed in ②. If the two have drifted, the anchor did
not hold — and that is the single failure this whole architecture was built to prevent.

---

## Capture sheet

Fill this in during the session, not after.

```
Journalist / newsroom / date:
Article + dataset:

① restitution      corrected? [ ]  what:
② takeaway         time:           sentence or topic?
③ Q1 subject       time:           answered the question asked? [ ]
   Q2 comparison   time:           [ ]
   Q3 limits       time:           [ ]   bristled? [ ]
   Q4 placement    time:           [ ]
   Q5 credit       time:           [ ]
④ reference loop   changed their mind? [ ]   asked for more? [ ]
⑤ proposal         vetoed anything? [ ]      picked the recommendation? [ ]
render             first words:
                   asked for a change? [ ]   expressible without code? [ ]
closing            their sentence:
                   drifted from ②? [ ]

Total wall clock:
Moments they hesitated, in order:
Anything they said unprompted about the process:
```

---

## What would count as a refutation

Write these down before the session so the result cannot be rationalised afterwards.

- **They never veto and never correct.** The whole propose-don't-interrogate design is then
  ceremony: they are being walked through a form and agreeing to it.
- **Three or more of the five questions have to be explained** before they can be answered. Then the
  questions collect parameters and only look editorial.
- **Their closing sentence has drifted from their confirmed takeaway.** The anchor did not hold, and
  the anchor is the architecture's central claim.
- **They ask, in any words, "can't you just do it and show me?"** That is the honest verdict on the
  entire editorial overlay, and it is the answer this branch most needs to hear if it is true.

## What would count as confirmation

- They correct the restitution on a point of fact.
- At least one of the five answers changes the drawing in a way they can point at afterwards.
- They veto a candidate and say why.
- Their closing sentence matches their takeaway.

---

## After the session

Write the result into `twin/JOURNALIST-TEST-RESULT.md` — the filled sheet, verbatim quotes where you
have them, and the verdict against the two lists above. Quotes beat paraphrase; a paraphrase of a
journalist's objection is already half a rebuttal.

If it refutes the design, that is the cheapest good news this branch will ever get.
