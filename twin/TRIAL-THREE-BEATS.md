# Trial: three beats, three independent agents

> **Correction, 2026-08-09.** Two of the three renders this document scores were drawn from
> **invented series** that exist nowhere in this repository, credited to the **Federal Statistical
> Office**. Beat B's negative years and beat C's endpoint are both false; beat C's credit names an
> institution that does not publish the figure shown. **§2 below originally scored beat A as the
> only claim-grounding failure — that verdict was wrong, and is corrected in place.** The renders
> are kept as the record of the run; every number read off them in this document has been
> recomputed from frozen data or withdrawn. Full recomputation and the corrected renders:
> [`proof/trial/SUPERSEDED.md`](proof/trial/SUPERSEDED.md).

Run 2026-08-08. **Purpose:** test the strongest known objection to this branch — that a bespoke
component copied from the seed inherits the seed's defects, and that a registry would fix such a
defect once for every chart while here it propagates silently into every beat anybody writes.

The proof run (`PROOF.md`) hit exactly that: its component copied `yTickValues` and inherited a
zero-anchoring bug the doctrine's own prose forbids. One occurrence is an anecdote. This trial asks
whether it is a law.

## Method

Three agents, no shared context, none told what was being looked for. Each received the same
framing: read the doctrine and the seed, write a bespoke component for one story, render it, look at
the PNG, iterate at most three times, report honestly. Each worked in its own Splash root outside
the repo.

Datasets were chosen to stress the scale logic in three different ways:

| Beat | Story | Shape | Why |
|---|---|---|---|
| A | Norway CO₂, 1990–2024 (real, fetched live) | floor near a step boundary | the condition that triggered the proof run's bug |
| B | Swiss net migration, 1990–2024 *(the series handed to the agent was invented; the real FSO table runs 1991–2024)* | crosses zero, tiny negatives against large positives | the seed has no zero-crossing case at all |
| C | Swiss life expectancy, 2000–2024 *(invented; the real series ends 2023)* | very narrow range far from zero, one sharp dip | the opposite extreme |

Only beat A worked from real data. Beats B and C were handed synthetic series out of `/tmp` —
discovered a day later and corrected at `5b5760b1` / `f80983f9`. That does not touch what the trial
was testing (whether a copied function propagates its defects), because the axis logic under test
runs on whatever series it is given. It does invalidate every *value* those two renders display, and
it changes the verdict in §2.

## Result on the stated hypothesis: NOT CONFIRMED

**The zero-anchoring bug recurred zero times out of three.** A produced a fitted 28/38/48 axis; B
drew and labelled a zero line on a series that crosses it; C omitted the zero line entirely and said
why — a line encodes by slope. All three applied the corrected rule correctly.

This verdict survives the data problem in §Method: it is a judgement about axis behaviour, readable
off the images whatever series is underneath. B's zero line was the right call on its invented
series and remains the right call on the real one, which crosses zero at 1996 and 1997.

Cost was identical across all three: **two render cycles each**, no stalls.

## But the propagation is real, in a different shape

Beat B's axis runs **−45 to 105** on data spanning −3.4 to 84 — *the invented series; the real FSO
table spans −6.834k to 139.118k, so the specific extents below describe the render, not Switzerland.*
A third of the frame is empty and the top tick sits 25% above the highest point drawn. The mechanism
is what matters here and it is visible whatever the numbers are. Its own report names the cause:
`yTickValues`'s
"evenise the tick count" rule spends its odd step by pushing the floor down an extra step, dragging
the ceiling with it.

Same shared pure function, same copy-paste inheritance, different symptom. The mechanism the
hypothesis predicted is present; only the specific defect differed. **Nobody can fix it once for
everyone** — B's copy carries it, A's and C's copies carry it latent, and a fourth beat will
rediscover it on whatever data shape triggers it there.

## Findings the trial was not looking for

### 1. The doctrine contradicts itself — found independently by two of three agents

`information-architecture.md` places the source line last in the stack, "fixed at the bottom… so a
reader who has learned where to look once never has to search for it again."
`static-discipline.md`, and the seed's actual code, put it "directly beneath the title." These are
opposite instructions, not a nuance, and nothing flags that they disagree. Both B and C resolved it
the same way — follow the chart-scoped file and the seed — and both flagged that they had to guess
which document was authoritative.

Two independent discoveries of the same trap is not a fluke.

### 2. No claim-grounding — and it is worse than this section first said

**Corrected 2026-08-09.** This section originally read *"the first outright regression against the
engine"* and named beat A as the single instance, leaving beats B and C scored as passes. **All
three beats shipped a false claim.** Beat B's artifact carries a worse one than beat A's, and the
document was scoring it as a success.

**Beat A — a false title over true numbers.** The brief's takeaway claimed 2024 was below every year
since 1993. Recomputed from the frozen Norway series (`proof/vidz-bump-emitter-rank/data.csv`,
cross-checked at 2024 against `proof/vidz-bar-column-top-emitters/data.csv`): **2024 = 37.183 Mt**
against **1993 = 35.948 Mt**, and of the 31 years from 1993 to 2023 exactly one — 1993 itself — is
below 2024. The claim is false. The agent rendered the true numbers rather than reconciling them to
the brief, and flagged the mismatch: correct behaviour, and the reason it was caught. Both values on
the chart (`37.2`, `35.9`) are correct roundings, and the credit matches the data's real provenance.

**Beats B and C — true titles over invented numbers.** Both were rendered from series that existed
only in `/tmp` and were fabricated, credited to the **Federal Statistical Office**. Beat B puts its
two negative years at 1997/1998 when the real table has 1996/1997 and **1998 is positive**. Beat C
draws its endpoint, `84.2 years`, at **2024 — a year the real series does not contain** — and
credits a combined life-expectancy figure to an institution that publishes only sex-split series.
Full recomputation: [`proof/trial/SUPERSEDED.md`](proof/trial/SUPERSEDED.md).

**The two failures are different, and the difference is the finding.** A takeaway-versus-data gate —
the guard the engine has and this branch lacks — would have caught beat A. It would have passed
beats B and C without a murmur, because their titles agree perfectly with the numbers they were
given. Nothing in the toolkit asks the prior question: *where did this series come from, and does
the institution named on it publish it?* Two of three beats failed that question, and this document
did not ask it either until the audit did, a day later.

**Nothing in the toolkit catches any of it.** The entire architecture anchors on the confirmed
takeaway; no gate confronts that takeaway with the frozen data, and no gate confronts the data with
its own credit. The engine this branch twins has a claim-grounding guard for the first class.
Starting from zero lost it — and never had the second. This is the clearest case so far of the twin
being worse, not merely different.

### 3. No guard that the accent lands on the named subject

Flagged by two of three. "Put the accent on the subject, and the subject is not the maximum" is a
doctrine sentence applied by judgement. Nothing enforces it, and nothing would have stopped any of
the three from labelling the peak instead.

### 4. The toolkit is not portable

All three had to import `render-still.mjs` by absolute path into this repository, because a Splash
root vendors no copy of the craft skill's code. A newsroom cannot install this. Named as a known
limitation in `PROOF.md`; three independent runs confirm it is the first thing every beat hits.

### 5. Smaller traps, each found by one agent

- `${value}` on JSON `84.0` prints `84`. No error, no warning — visible only by looking at a
  neighbouring label that kept its decimal.
- Axis ticks use the ASCII hyphen from `toFixed()`; hand-written callouts use the Unicode minus.
  Nothing normalises them, so one chart can ship both.
- The seed covers no zero-crossing series, so there is no documented pattern for making a small but
  real deviation legible without exaggerating it.

## What this changes

**For the copy-paste objection:** weakened but not withdrawn. The doctrine's *rules* propagated
correctly three times out of three — agents read them and applied them. The seed's *code*
propagated its quirks, as predicted. The distinction matters: prose scales, copied functions do not.
`seed-anatomy.md` warns against parameterising the seed and says nothing about which of its parts
are meant to be copied and which shared. That is the question SP7 should answer first, and this
trial sharpens it rather than settling it.

**For the branch overall:** the *craft* holds up — three well-made charts from three agents with no
shared context, in two cycles each. The *evidence* did not: all three shipped a false claim, and two
of them shipped invented numbers under a real institution's name. The gaps are in the guards, and
they are two, not one: claim-grounding (a capability the engine already had) and provenance — no
gate anywhere asks whether the series is real and whether the institution credited publishes it.
Nothing in this document caught either; the render audit did, a day later.
