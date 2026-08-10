# The journalist test — first session

Run 8 August 2026, following the protocol in `JOURNALIST-TEST.md`. One session, the editorial
exchange only (movements ①–⑤ of `storyboard/references/exchange.md`), Gate 2 closed into
`STORYBOARD.md`, production stalled by design, not faked.

## The stated limit — read this before the rest

**Rémy played the journalist.** He is the project's developer. He could not be surprised by the
system the way a real newsroom journalist would be — he knows what each question is for, what the
gate checks, and what the tool can and cannot render. This session does not test whether the
exchange annoys a journalist on deadline, whether a question needs explaining before it can be
answered, or whether the whole premise ("propose, don't interrogate") survives contact with someone
who has never seen the tool. Nothing here settles that; `JOURNALIST-TEST.md`'s own budget line — one
real journalist, one of their own articles — was not met.

What this session *does* test, honestly: whether the five questions are **answerable** in the order
asked, whether the restitution and the gate hold together end to end on a real story, and whether a
skilled adversarial user can break the exchange by giving it the answers a system's own author would
be tempted to avoid ("I don't know", "none"). It found a real defect on that narrower ground, which
is why this record exists.

**Article:** Heidi.news, *"Moins de fumée dans le monde, mais plus de forêts en feu"* (Sciences).
Paywalled — only the standfirst and the opening of a Copernicus interview were readable. The
restitution in movement ① was made on that fragment, and the journalist was told so at the time,
before movement ① ran.

## Movement by movement

### ① Restitution

Three claims given back, strongest first: global biomass-burning emissions at a 24-year low in H1
2026, driven by Asia and Africa halving since the early 2000s; Europe and the US burning more than
usual (500,000 ha in the EU, 2.4 M ha in the US, 65% above the ten-year average); the lopsided
geography (three-quarters of emissions from Africa and Asia, under an eighth from North America and
Europe). Plus the structural reading offered alongside the claims: the world total falls because the
dominant region falls, while the watched region rises.

**Journalist's response: *"oui."* No correction.**

### ② The confirmed takeaway — G1

Given in one compressed sentence, without hesitation:

> **"Les feux reculent dans le monde mais avancent chez nous"**

The system then surfaced a real tension before sealing the takeaway: Copernicus measures
**emissions** — smoke and carbon — not fires. Nothing in the readable fragment gives a global
burned-area figure; the only areas cited are the ones rising in Europe and the US. So the second
half of the sentence is well-grounded and the first says "fires" where the source says "smoke" — a
distinction the article's own headline takes care to make. Three options were offered: keep it as
given; adjust it; or say the paywalled part carries a global burned-area figure that would ground
"feux" literally.

**The journalist chose to keep it**, on the ground that "feux" stands for "émissions" in common
usage. The takeaway was sealed verbatim.

This is the guard behaving correctly: it surfaced the gap, it did not block on it, and it did not
rewrite the journalist's sentence. The human decided with the information in front of them.

### ③ The five questions

| # | As asked | Answer (verbatim) |
|---|---|---|
| Subject | *"Dans ces données, qui est le sujet de votre papier ?"* | **"L'Europe et les États-Unis"** — a two-entity subject |
| Comparison | *"À quoi le lecteur compare ?"* | **"L'Afrique et l'Asie, explicitement"** — the mechanism-revealing choice over the world total, which already contains them |
| Limits | *"Sur quoi ces données ne permettent PAS de conclure ?"* | **"rien"** |
| Placement | *"Ce visuel arrive après quel paragraphe ?"* | **"Je ne sais pas encore où il se place"** |
| Credit | *"Vous créditez comment, et à quelle date d'effet ?"* | **"Copernicus / CAMS, données 1er semestre 2026"** |

All five were answered as asked — none needed explaining, none was answered as a different question,
no one asked what a term meant. Against the refutation list in `JOURNALIST-TEST.md`, that clears the
"three or more questions had to be explained" bar cleanly. But two of the five answers are absences
("rien", "je ne sais pas encore"), and what the exchange did with those absences is the finding
below.

### ④ The reference loop

Failed for the second time on a real case, in the same way `PROOF.md` first found it: the shipped
set's four rows carry no two-diverging-series argument, which is exactly this story's structure.
Live research to the set's own standard — look at the graphic, read the caption beside it — does not
fit inside a beat's budget. This was said plainly to the journalist rather than papered over, and one
lesson was transposed by analogy instead: NYT Upshot's annotation states the conclusion on the
graphic itself; applied here, the divergence must be labelled with the takeaway, not merely drawn.

**The journalist took it.**

### ⑤ The proposal — G2

One slot, three treatments, with a recommendation and a stated data problem, given together: two
lines over time (recommended — a movement needs a time axis); small multiples by region; a slope
from the early 2000s to 2026. The data problem was surfaced before the choice, not after: only the
slope is feasible with the fragments in hand — two lines and small multiples need the CAMS/GFAS
regional series, which is not on Our World in Data.

**The journalist chose the two lines anyway** — the recommendation, made with the harder data
requirement stated up front, not the safer option the data problem argued for.

`checkStoryboard` was run for real on the written front matter: **Gate 2 closed.** Evidence copied
to `twin/proof/seance/STORYBOARD.md`.

### Production

**Stalled, not faked.** The chosen treatment needs a regional time series that was not in hand, and
manufacturing points from four fragments is exactly what the never-list forbids. No beat was
rendered this session. That is the correct behaviour given the data on hand, but it means this
session produced no render and no "first thing they said at Gate 3" — that observation from
`JOURNALIST-TEST.md`'s protocol has no data point here.

## Capture sheet

```
Journalist / newsroom / date:   Rémy (developer, playing the role) / n/a / 8 August 2026
Article + dataset:              Heidi.news, "Moins de fumée dans le monde, mais plus de forêts en
                                 feu" — paywalled, standfirst + interview opening only

① restitution      corrected? [ no ]   what: none — "oui."
② takeaway         time: not timed    sentence, given without hesitation, one compressed sentence
③ Q1 subject       time: not timed    answered the question asked? [ yes ]
   Q2 comparison   time: not timed    [ yes ]
   Q3 limits       time: not timed    [ yes — "rien" ]   bristled? [ no ]
   Q4 placement    time: not timed    [ yes — stated as unknown ]
   Q5 credit       time: not timed    [ yes ]
④ reference loop   changed their mind? [ n/a — no matching row existed ]
                    asked for more? [ no, took the analogy offered ]
⑤ proposal         vetoed anything? [ no ]      picked the recommendation? [ yes, despite the
                                                  stated data problem ]
render             first words:      n/a — production stalled, no render this session
                    asked for a change? [ n/a ]
closing            their sentence:   not asked — production stalled before this point
                    drifted from ②?  untested

Total wall clock: not recorded
Moments they hesitated, in order: none observed
Anything they said unprompted about the process: none recorded beyond the answers above
```

Two protocol steps were not reached — the closing question (*"En une phrase, qu'est-ce que ce visuel
prouve ?"*) and the render reaction — because production stalled for a legitimate data reason before
either point. Both remain untested by this session, not confirmed.

## The finding that matters, and it is the journalist's, not the system's

The controller's first reading of this session was that Gate 2 is defective because it closed on
`limits: "rien"` and `placement: "pas encore décidé"` — presence checked, substance not.

**The journalist rejected that reading, and was right.** *"Rien"* is a legitimate answer: if a
journalist sees no limit, that is the information, and the system has no business manufacturing a
caveat to fill the field. The real defect is different, and larger:

**When the journalist did not know, the system recorded their ignorance and moved on. It should have
proposed.** The discipline list in `exchange.md` already said *"Always carry a recommendation. Never
make someone choose in a vacuum"* — but that rule had only ever been applied to movement ⑤, the
slots-and-candidates proposal. The five questions of movement ③ were designed as **harvesting** and
must be **accompaniment**: the system is there to help the journalist think, to guide them toward
their own choices, and to propose what fits when asked. The final decision always stays with the
journalist — but when they say "I don't know", the system's job is to propose what is most suitable
and say why, not to log the gap and continue.

## What changed as a result

`references/exchange.md`, movement ③, is rewritten with a new subsection — "When the answer is 'I
don't know' or 'none'" — giving each of the five questions a fallback proposal instead of a silent
pass-through, with the placement question worked through as the concrete example (propose a
placement from the article's own structure, state what it implies for channel and size). The
discipline list's *"Always carry a recommendation"* rule is promoted from a rule about movement ⑤
alone to a rule about the whole exchange, with the accompaniment principle spelled out. `SKILL.md`'s
Overview reflects the same, in one added clause. None of this rewrites what the journalist actually
said in this session — `STORYBOARD.md`'s `limits: "rien"` stands as given, unedited; the fix changes
what the exchange does on the *next* run when an answer is an absence, not this one's record.

## What worked

- **The takeaway was given in one sentence, without hesitation** — no coaxing needed, no topic
  offered in place of a sentence.
- **The smoke-versus-fire guard surfaced a real gap and left the decision to the human.** The system
  had grounds to block or to silently rewrite "feux" to "émissions"; it did neither. It named the
  gap, gave three ways to resolve it, and sealed whatever the journalist chose.
- **The gate closed into a file**, not into the conversation — `checkStoryboard` ran against the
  actual written front matter and returned closed, matching the discipline list's own rule that a
  gate closes into a file.
- **All five questions were answerable as asked**, clearing the "three or more need explaining"
  refutation bar with room to spare.
- **The recommendation was taken with its cost stated up front**, not hidden until after the choice
  — the journalist picked the harder-to-source treatment knowing it was harder to source.

## What did not work

- **No correction at restitution.** `JOURNALIST-TEST.md` calls a correction the strongest positive
  signal in the whole session, because it proves the restitution was specific enough to be wrong.
  This session got a bare *"oui."* — bland agreement, by the protocol's own definition. That absence
  is unresolved by this record, not explained away: it may be because the restitution was accurate,
  or because the journalist did not report or own this particular article and so had no independent
  memory of it to check the restitution against, unlike the `PROOF.md` run where the writer had
  written the framing himself. A real newsroom session, on the journalist's own reporting, is the
  only way to tell which.
- **The reference loop missed for the second time on a real case.** `PROOF.md` found this first, on
  a long-time-series-against-a-benchmark story; this session found it again, on a two-diverging-
  series story. Two different real stories, two different argument structures, zero matching rows in
  the shipped set of four. This is not a new defect — it is the same one, confirmed on independent
  ground.
- **The system recorded ignorance instead of proposing.** The finding above, in full: two of the
  five hand-of-the-journalist answers were absences, and the exchange, as it shipped into this
  session, treated absence as a closed answer rather than an opening for a proposal. Fixed at the
  doctrine level (see above); not yet re-tested in a second live session.

## What remains untested

A real newsroom journalist, on deadline, on their own article, who has never seen this system
before and cannot anticipate what a question is for. Every finding in this record — including the
one that mattered most — came from a session that could not test whether the exchange holds up
against that person. `JOURNALIST-TEST.md`'s budget for exactly that session is still open.

## Backlog item, not built this session

The reference set needs coverage per argument structure and per chart type. The current four rows
have now missed twice, on two different real stories, in two different sessions — once on a long
time series read against a historical level, once on two series moving in opposite directions. This
is the same quality lever `exchange.md` itself calls number one (*"the only point in the journey
where taste travels both ways... this is quality lever number one"*), missing on its first two real
tests. Recorded here, not addressed: growing the set, or giving the loop a cheaper verification tier
that is honest about being cheaper, is separate work.

## Verdict against the protocol's own lists

Against `JOURNALIST-TEST.md`'s refutation list: none of the four refutation conditions were met —
the journalist did correct-or-not on restitution as a real choice (bland agreement is a weak signal,
not a refutation on its own), no question needed explaining, the closing-sentence-drift check was
never reached to fail, and the journalist never asked "can't you just do it and show me?".

Against the confirmation list: two of four are met plainly (at least one of the five answers changed
the drawing plan they can point at — the subject and comparison answers directly shaped the chosen
slot's content — and no veto was needed because the recommendation was accepted with its cost
disclosed). The other two — correcting the restitution on a point of fact, and a closing sentence
matching the takeaway — were not met, the first genuinely, the second because production stalled
before the closing question was ever asked.

**Net:** neither confirmed nor refuted by this protocol's own bar. What this session actually
delivered is narrower and more useful than either verdict: a real defect, found on a real story, not
by asking whether the tool is good but by watching what it did with an honest "I don't know" — and a
correction to the doctrine, not just to the example, per the branch's own standing rule.
