# Subject conventions — the evidence, and why the table is short

`SUBJECT_CONVENTIONS` in `scripts/palette.mjs` holds four entries. This file is why each one is
there, and — more importantly — why there are only four.

## What language the table reads, and what it does outside it

`CONVENTION_LANGUAGES` — **English, French, Greek and Arabic**, the four this tree has frozen a story
in. Each entry's `match` carries the same words in all four, behind unicode word boundaries rather
than `\b`, which is ASCII-only and cannot see the edge of a Greek or Arabic word.

**Why it had to be said, round five, finding X1.** `stress-x-tunisian-water` is a story about
`استهلاك المياه` — water consumption — and blue for water is the strongest entry in this table. The
regexes held English and French words only, so the proposal reached the newsroom branch as though
the story carried no convention at all, and the journalist recorded **this table's own hex**
(`#1F6FB2`) through the proposal's "something else" escape.

**And where it is looked up.** That story's recorded subject is `محافظة تونس` — Tunis governorate. No
vocabulary in any language can find water in the words "Tunis governorate", because there is none
there: the subject LINE names the entity, and a convention is about the SUBJECT MATTER. So the
subject is asked first and what the story says it is ABOUT (`proposePalette`'s `about` — the
takeaway) second, and the option's provenance says which of the two answered.

**Outside the four.** Gaining languages can never be finished. What this table may not do is answer
"no convention applies" in a way that reads identically whether it looked and found nothing or could
not read a word — so `scriptsWithNoConvention` names the script, and `noConventionReason` says it out
loud. A silent miss is the defect; a stated one is not.

## The claim being made

A subject-fit colour is not "a colour that suits the topic". It is a colour a reader **already
holds** before they read the legend. That is a claim about readers, and it has been measured.

Lin, Fortuna, Kulkarni, Stone & Heer, *Selecting Semantically-Resonant Colors for Data
Visualization*, Computer Graphics Forum 32(3), Proc. EuroVis 2013. Their finding, stated plainly:
when a category's colour matches the association readers already carry for that category, people
read the chart **measurably faster** than with an equally distinguishable but arbitrary assignment.
Their own worked examples are the mundane ones — money green, water blue, fruit in its own colour.

Two things follow, and both shape this table:

1. Semantic resonance is worth reaching for, because it buys real reading speed, not taste points.
2. It only buys that when the association is genuinely shared. A colour that resonates for the
   person who picked it and nobody else is an arbitrary assignment wearing a justification.

## The four, and what each rests on

| id | Accent | The association, and where it comes from |
|---|---|---|
| `renewables` | `#1B7F4B` | Green for renewable generation. Held consistently across energy trackers and climate desks; a reader who has seen one electricity-mix chart has seen this one. |
| `fossil` | `#3A3A3A` | Near-black grey for coal. This is the **material's own colour** — the strongest kind of resonance in the Lin et al. sense, where the association is the object itself rather than a learned code. It also survives being plotted against renewable green without competing with it. |
| `water` | `#1F6FB2` | Blue for water. The single most reliably held colour association in the study — it is the paper's own opening example. |
| `heat` | `#C1440E` | Warm red for rising temperature. Decades of climate charts have taught it. Scoped deliberately to the **warm end only**: a series that runs both ways needs a diverging scale, which is a different decision and one this skill does not make. |

## Why it stops at four

Every entry added is a claim that readers share an association. The failure mode is not a missing
entry — that costs a journalist one extra sentence, and the house theme covers it. The failure mode
is an **invented** entry, which teaches a reader a code that does not exist and does it with the
authority of a tool that measured everything else it said.

So the bar for adding a row is: name where the association comes from, in the row itself. If the
honest answer is "it feels right", the row does not go in. Colours that were considered and left
out for exactly that reason: purple for inflation, orange for unemployment, teal for health.

## Why a multi-match returns nothing

`matchConvention` returns the single matching convention, and **null when several match**. A story
about coal-fired power replacing hydro hits `fossil` and `water` both. That is not two accents; it
is an editorial decision about which series carries the argument — the journalist's, not the
table's. Returning the first hit would make that decision by table order, invisibly, and the
journalist would have no way to see that a choice was made at all.

The same logic is why a subject convention is offered as a **departure** from the house theme, never
applied over it. The newsroom's identity is the default; a convention is a reason to leave it for
one beat, and reasons get shown.

## What this table is not

It is not a palette. It proposes **one accent** against a ground that comes from elsewhere — the
newsroom's, or white when there is no newsroom. Sequential scales, diverging scales, and
categorical sets of more than one hue are all out of scope here; they are decisions with their own
constraints (ordering, midpoint, colour-vision deficiency separation) that a single-accent lookup
table has no business making.
