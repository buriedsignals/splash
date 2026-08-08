# Trial: three beats, three independent agents

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
| B | Swiss net migration, 1990–2024 | crosses zero, tiny negatives against large positives | the seed has no zero-crossing case at all |
| C | Swiss life expectancy, 2000–2024 | very narrow range far from zero, one sharp dip | the opposite extreme |

## Result on the stated hypothesis: NOT CONFIRMED

**The zero-anchoring bug recurred zero times out of three.** A produced a fitted 28/38/48 axis; B
drew and labelled a zero line on a series that genuinely crosses it; C omitted the zero line
entirely and said why — a line encodes by slope. All three applied the corrected rule correctly.

Cost was identical across all three: **two render cycles each**, no stalls.

## But the propagation is real, in a different shape

Beat B's axis runs **−45 to 105** on data spanning −3.4 to 84. A third of the frame is empty and the
top tick sits 25% above any real value. Its own report names the cause: `yTickValues`'s
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

### 2. No claim-grounding — the first outright regression against the engine

Beat A's brief carried a takeaway that is **false against the real data**: it claimed 2024 was below
every year since 1993, while the fetched series gives 2024 = 37.18 Mt against 1993 = 35.95 Mt. The
agent rendered the true numbers rather than reconciling them to the brief, and flagged the mismatch
— correct behaviour, and the reason it was caught.

**Nothing in the toolkit catches it.** The rendered chart states a claim in its title that the chart
itself visibly refutes: the accented 2024 point sits above the dashed 1993 reference. The entire
architecture anchors on the confirmed takeaway, and no gate confronts that takeaway with the frozen
data.

The engine this branch twins has a claim-grounding guard for exactly this class. Starting from zero
lost it. This is the clearest case so far of the twin being worse, not merely different.

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

**For the branch overall:** the craft holds up — three competent charts from three agents with no
shared context, in two cycles each. The gaps are in the guards, and one of them (claim-grounding) is
a capability the engine already had.
