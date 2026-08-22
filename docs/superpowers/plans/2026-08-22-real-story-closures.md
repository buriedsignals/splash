# The 54 real-story defects — what was done about each

Companion to `2026-08-22-real-story-findings.md`, which is the list. This is the answer to it.

Seven packages, split by the files each one owns so they could be worked at once. Every fix was
written test-first and **mutation-checked**: the mechanism was broken again afterwards and the test
had to go red. Where a limit could not be removed, the fix is that the tool now says so on the
verdict the journalist reads, and a test asserts the sentence.

---

## 1 · The grounding check on panel data — 10 defects · closed

`rowValue` took the first row of a year with no entity filter, so every two-year comparison in every
story was answered about the alphabetically first entity in the file: `supported` for a false
sentence about Canada out of Afghanistan's rows, `contradicted` — the verdict that blocks G1 — for a
true one about Ghana, and byte-identical details for two different countries.

The shape of the table is now established before anything is read out of it, and **derived rather
than named**: a panel is a table one period carries several rows for, and the column keying those
rows apart is the text column unique within every period, never blank in preference to blank. From
that one derivation:

- a comparison resolves its own subject, or refuses and names what would lift the refusal;
- an entity superlative is decided **inside the period the sentence names**, against that period's
  own extreme rather than the column's — San Marino held the longest life expectancy in 1950 at
  71.59, and the column's maximum is 86.37, seventy years later;
- a numeral's verbatim holder either belongs to the sentence's subject or is said not to;
- a totality claim is refused on a column of independent shares — 7,585 percentages summing to
  221,735.86 of nothing — and **releases its numeral**, so the range check still gets to say that
  100 is that column's own maximum;
- a correctly rounded extreme is placed rather than refused (86.4 against a maximum of 86.3724);
- a numeral governed by a span word reads as a difference, not a level;
- a recorded claim shape supersedes the pattern reading of its own sentence **even when the two
  agree about the grammar** — which is how a refusal the journalist recorded was outvoted by a
  reading of another country's rows.

Fell out of the same work: a name the table almost holds — "Lisbon" against "Lisboa" — is now
reported as the spelling question it is, which is exactly what lets a sentence-initial "In" fall
through to the table's own keys instead of being taken for a subject.

Measured after: all three real stories decide their G1, with the right numbers and the subject named.

## 2 · The profiler could not describe a panel — 6 defects · closed

The panel shape, the coverage of each period, and which subjects are **aggregates of other rows** —
decided by arithmetic and by the table's own structure, never by a list of names. It reaches all 9
aggregates in the wildfire file, all 32 in Ember, all 29 in life expectancy, and states the one case
it cannot reach (an aggregate whose code is shaped like every other row's). No sum for a column its
own typing calls a sequence. The article's stated incompleteness travels out of the frozen prose
onto the profile, so the downstream partial-period guard has something to read.

`panelShapeOf` is **one decision in two skills**, copied byte-identically and registered in `COPIES`
rather than written twice — measured over all 36 frozen tables, zero disagreements where four
existed before.

Three false positives the profiler found by sweeping the whole corpus, none visible from the three
real files, each closed: two European countries summing exactly to a third in all five years;
a nine-row table where three countries are "aggregates" of each other; and 96 employees set apart on
a salary table by a department column read as codes.

## 3 · Verifiers that verified something else — 12 defects · closed

`chart-web`: the command a producer actually runs asked **2 of its 18 declared decisions**; it now
asks 15 and names the other three with the argument for why one page cannot answer them. The
capability walks reach every root a beat lives in, not only `proof/`. Every control on the page is
verified, not only the filter the skill itself builds. A check that could not fail now prints its
own numbers instead of nothing.

`map-web`: the live probe reaches every map type instead of crashing on any choropleth; it refuses a
key it cannot find instead of verifying nothing and **exiting 0**; the driver verifies the page it
was pointed at rather than this skill's seed; `plateFollowsGround` refuses a value nobody measured.

## 4 · map/web was structurally unfinished — 11 defects · closed

The skill teaches the cell it can already produce. The beat population is derived from where beats
live rather than from `proof/`. The worked beat survives being copied where beats actually live.
The frame is the camera's own shape rather than a square, **and the sea follows the palette** — both
raised directly by the owner, looking at real rendered maps. One world is painted, not three. A
pointer target a neighbour covers is named, measured at four widths.

## 5 · Palette and credit — 5 defects · closed

The ground sentence is built from where the ground actually came from, so it can no longer name a
file it did not read. The shape of a `newsroom` argument is checked before anything claims to have
measured it. The comparison field a part-to-whole beat needs is derived beside `seriesInks`, with
the 3:1 floor and the pairwise separation measured per step — it returns byte-for-byte what the real
story had derived by hand. A marked source line is read as the credit.

## 6 · Delivery and orchestration — 5 defects · closed

**`done` now means the delivered bytes are still the approved bytes**, derived from the two digests
already in the tree rather than from a file's existence. Reproduced on the real story exactly as
reported, and it answers `stale-delivery` where it answered `done`. A re-delivery keeps the answers
the journalist already gave. A hand-over refuses HTML entities instead of printing them. A beat's
alt text has a recorded home delivery can read. The plan-version precondition says what it wants.

## 7 · Catalogue and type vocabulary — 5 defects · closed

**A treatment answers to every name its own sheet title yields.** 85 derived names, zero collisions
inside a medium, one across media (`bubble` — a bubble chart is a scatter, a bubble map is
proportional symbols), resolved by longest shared name with the medium as the distinguishing fact.
28 of the 30 declared aliases were deleted because the rule now reaches them, and the catalogue
**refuses** a declared alias the rule already yields — so a declared alias is now a claim that the
rule cannot reach that word, and a third one appearing is evidence about the rule.

The unreachable cells are derived from what a producer holds rather than typed. A row limit is
measured against the beat's marks rather than the source table's rows. There is one candidate shape,
and it is the documented one. The producer gate reads the surface preflight already measured.

---

## Found while fixing, not in the original 54

- **`years_service [0, 34]` was read as a table's own period**, because the period rule tested a
  column's NAME and never its values. Two consequences, invisible for six rounds: a salary table of
  240 employees was described as a panel of 240 readings over 35 "periods", and the table's **second
  measure disappeared**, struck out as the axis — so every requirement about several measures was
  answered about one. The name proposes and the values decide, which is the rule the coordinate test
  three lines below had always stated.
- **A raw NUL byte** in `ground-claim.mjs` made every text tool read its 203 KB as binary: `grep -rn`
  skipped the file in silence. A guard nobody can grep is a guard nobody finds.
- **A frozen source was not the format its name claimed** — `stress-h-site-photographs/source/
  data.csv` had been a JSON document since intake froze it, through five rounds and a delivered beat.
  Round five recorded it as "unfixable in place" and named the real finding correctly: nothing
  checked. Now a sweep does, over every frozen source.
- **A committed runner swallowed its own failure.** The heat-pump web beat ended
  `main().catch(console.error)`, so when `renderWeb` grew its required `language` argument the runner
  threw, printed, and **exited 0** — and `deadExampleRunners`, the sweep written for exactly this,
  reads the exit code. The page shipped `<html lang="fr">` against a storyboard recording `en`, and
  no accessible table at all on a format declaring `same-facts-without-the-picture`.
- **A static beat had nowhere to record where it is published.** Two agents reached it from opposite
  sides and each correctly refused to fix it alone. A static graphic lands on a screen or on paper,
  the two have different grounds, and guessing is how a beat shipped a 2.20:1 accent onto a printed
  page. The slot records it, gate 2c asks for it at the first moment it is knowable, and one beat
  measured 8.01:1 on `screen` and 2.20:1 on `print`.
- **A story beat hand-split its own CSV**, in a table holding `Bonaire Sint Eustatius and Saba` and
  `European Union (27)`. The output was unchanged — no name in the six bands carries a comma — which
  is exactly why the guard exists rather than the eye.

## Refused, with the measurement — and right to be

Four of the seven packages refused an instruction of mine and were correct each time. The pattern is
worth keeping: **a rule for a skill outside `PRODUCING_SKILLS` derives an empty population**, so
four agents independently declined to add a `guard-catalogue.json` entry for `intake`, `palette`,
`storyboard` or `splash`. That is not a gap in those fixes; it is the open design question recorded
as section A of `2026-08-22-open-findings.md`, and it belongs to the owner.

Also refused, each with the number that justified it: renaming five Datawrapper names when 58 had
the same mismatch (the fix is the matching rule); loosening a check to make it fire when the real
answer is that 0 of 24 delivered pages draw a leader; comparing review identity for delivery
staleness when a legitimate re-binding moves the record and not the file; and blocking `whereIs` on
the new destination field, which would have demoted two stories that are `done` today.

## Still open, named

- `mutateStoryboard` does not clear a slot's `destination` when the format changes. The stale value
  is refused loudly by both gates, so it is observed rather than silently believed.
- The example-runner sweep does not yet refuse a runner that swallows its own failure. It is the
  only such runner in the tree, and the decision lives in eight byte-identical copies.
- Two defects in `stories/heat-pump-adoption-across-europe` were found by chart-web's widened walk;
  the render was rebuilt, and the story's own storyboard remains parked at G2 for an older reason.
