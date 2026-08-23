# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at intake

INTAKE — the aggregate proposal is blind exactly on the panel shape open data ships in.

Ran: `freezeSource` on the Eurostat data-browser CSV for `sdg_02_40` (746 rows, 21 columns, one row
per country per year, downloaded 23 Aug 2026). Two of the 38 rows in the entity column are not
countries: `EU` and `EU27_2020`, the European Union aggregates, and they sit in the middle of the
alphabetical list between ES and FI.

Came back: `panel.aggregates.byStructure: []`, `structure.answered: false`, reason "no column of
this table holds one stable code per entity with a shape most of them share". No warning of any
kind reaches the journalist.

Expected: at least a proposal naming `EU27_2020`, whose code is shaped unlike the 36 ISO-2 codes
around it.

Measurement: `structurallyUnlikeRows` skips `c === entity`, and in this table the entity column IS
the code column (`geo`). Duplicating `geo` into an extra column named `geo_code` and re-profiling
the same bytes returns
`byStructure: [{entity:"EU27_2020", proposedBy:"code-shape", code:"EU27_2020"}]`,
`structure: {column:"geo_code", shape:"AA", entitiesWithThatShape:37, entitiesCoded:38}`.
So the mechanism works; it is simply switched off whenever the panel's entity key and its code are
the same column, which is the normal shape of every SDMX download (Eurostat, OECD, ECB, UNSD).

The only other candidate column, `Geopolitical entity (reporting)` (the labels), can never fire
either: `shapeOf` is length-sensitive, so "Albania" -> "Aaaaaaa" and "Bulgaria" -> "Aaaaaaaa" are
different shapes, the dominant shape covers 4 of 38, and `dominantCount * 2 <= coded` rejects it.

Cost: I had to find both aggregates by eye. A journalist who did not would have ranked the EU
average as if it were a 37th country.

## Found at framing

FRAMING (G1 grounding) — the entity resolver reads ordinary English words as ISO country codes, and
decides a verdict on the wrong country.

Ran: `resolveGrounding` (which calls `groundTakeaway`) on candidate takeaways over the frozen
Eurostat table, whose entity column holds two-letter geo codes.

Came back, on the takeaway I actually wanted to confirm —
  "Estonia has the highest organic-farmland share in 2024, at 22.58 % of its utilised agricultural area."
— verdict `supported` (correct), but the 22.58 numeral's own detail reads:
  `within the range of column "OBS_VALUE" [0, 25.69] — but no row this sentence's own subject ("AT")
   owns holds it; the row that does belongs to "dataflow", which this sentence does not name`
The sentence names Estonia. "AT" is Austria, and it is in that sentence only as the English word
"at". Replacing "at" with "with" moves the reported subject to "IT" (Italy), from the letters in
"with"/"its". Two defects in one string, and the second is separate: `dataflow` is the constant value
of the SDMX `STRUCTURE` column, offered to the journalist as the name of an entity that owns a row.

Then the shape that matters, because the verdict itself turns on it:
  "Austria has the highest organic-farmland share in 2024, as seen in the 22.58 % it reports."
  -> `contradicted`: `"IT"'s own value in "OBS_VALUE" within "TIME_PERIOD" 2024 is 19.49, not the
     maximum (22.58)`
Austria has NO 2024 row at all — its series ends in 2020. Delete the word " it " from that same
sentence and the checker answers correctly:
  "Austria has the highest organic-farmland share in 2024, seen at 22.58 %."
  -> `unverifiable`: `could not resolve any name this sentence offers to a row in the frozen data
     within "TIME_PERIOD" 2024 — it read "Austria", and the table holds no such row`

So the fallback fires only when the NAMED entity is absent from the period — which is exactly the
case a journalist needs the truth about. Here it produced a right answer for a wrong reason. On a
table where the substring-matched entity happens to hold the period's maximum, the same path
produces a FALSE CONFIRMATION about a country with no data at all.

Expected: the same refusal the word-free sentence gets. A two-letter code found inside a word is not
a name the sentence offers.

Cost: I read a verdict about Italy on a sentence about Austria and had to mutate five sentences to
work out which of the two the checker was actually deciding.

## Found at intake

INTAKE — a column the table itself declares as a percentage is summed, and asked whether it should
be read per head.

Ran: `freezeSource` on the Eurostat CSV. It has a `unit` column (one value, `PC_UAA`) and a
`Unit of measure` column (one value, "Percentage of total utilised agricultural area"), beside
`OBS_VALUE`.

Came back, in `source/profile.json`, on `OBS_VALUE`:
  `"sum": 4870.099999999999`
  `"denominatorNotInThisTable": { "says": "... nothing here can decide whether this column should be
   read per head ..." }`

Expected: no total, and no per-head question. The sum of 746 percentages taken across 38 entities
and 25 years is not a measure of anything, and a share of an area is already a rate.

Measurement: the profiler reads a unit column only for the literal glyph `%`, and only to look for
values above 100 (`percentAboveHundred`, `unit === "%"`). Re-profiling the same bytes with every
`unit` cell rewritten to `%` changes neither field: sum 4870.099999999999, denominator still asked.
So this is not "the code `PC_UAA` was not understood" — a declared unit does not reach either
decision at all.

The mechanism to withhold already exists and is right next door: the same profile withholds the sum
on the period column with `"no total: this column is a sequence ... and the sum of a period is not a
measure of anything"`. A declared rate has the same claim on it.

Cost: nothing on this beat, because I read the unit column myself. On a story where the journalist
took `sum` for a total, it is a number nobody can defend.

## Found at production

PRODUCTION (chart-web) — the driven check refuses any mark below full opacity, on a beat that ships
no filter, in the section that has just skipped for having no filter.

Ran: `bun skills/chart-web/scripts/verify-web.mjs --file .../distance-to-the-target.html --shots`
on the first build, where the two countries with no figure for the newest year were drawn at
`opacity: 0.55` — one accent, reduced, which is what this story's own PALETTE.md records as the
encoding for a row whose figure is older.

Came back: three failures, all the same one —
  `laptop-wide: the default view dims nothing — the full claim is on screen — 27 marks, opacities 1/0.55`
  `phone: ...` and `laptop-wide (no JS): ...`
— printed under `FILTER`, four lines below
  `skip laptop-wide: the filter's own behaviour — this beat ships no filter`.

Expected: the check to be about a filter, or to say what it is really about.

Measurement: `checkFilter`'s no-filter branch asserts `marks.every((o) => o === 1)` over
`[data-detail], .seg, .pt`. It cannot tell a mark dimmed BECAUSE IT WAS FILTERED OUT from a mark
drawn at reduced opacity because the encoding says so, and this format has decided that opacity
belongs to filtering. That decision is defensible and I took it: the rows are now drawn HOLLOW,
same accent at full strength, which is the better drawing.

What is wrong is where and how it is said. It is not an accessibility catch: `#D4A853` at 0.55 over
`#16191B` measures 3.32:1 against the 3:1 non-text floor, so nothing about the reader's eye refused
this. And the sentence a producer reads — "the default view dims nothing" — describes a filter state
on a beat that has no filter and no state. "Opacity is reserved for filtering in this format; encode
a difference some other way" is the rule, and it belongs in `web-discipline.md` where a component is
written, not only in the filter section of a driven run.

Cost: one rebuild, and several minutes deciding whether a green run was reachable at all.

## Found at production

PRODUCTION (chart-web) — 69 driven checks passed on two frames a desk would have sent back.

Both were found by opening the screenshots, and both are the class `SKILL.md` already says a script
cannot see. Recorded because they are the two collisions this format's own geometry makes likely,
not because the doctrine is silent about the class.

1. **A value label struck through by its own mark.** At 1600x800, the first build drew each row's
   value beside its dot and flipped the label to the LEFT of the dot past a width threshold — so the
   accent stem ran straight through `22.6 %`, `21.2 %` and `19.5 %`. Every check passed. The fix was
   not a nudge: right of the dot clips off the frame at 375px, where the plot is 167px wide and the
   longest label is 80px, so the values had to become a measured label column in the gutter.

2. **Six axis numbers in a 167px plot.** At 375x812 the same build printed
   `0 % 5 %10 %15 %20 %25 %` as one unreadable run, and the fit section reported
   `phone 375x812: the graphic fills a real share of the window — 96.9% of the window against a
   38.0% floor`. Filling the window and being legible in it are different facts, and only the first
   is measured.

The common cause is the format's own trade: type is a fixed CSS size and geometry stretches, so at
375px the number of marks per unit of plot is 4x what it is at 1600px while the labels are the same
size. A beat with many rows meets this every time. A cheap measurement exists for both — the format
already measures text (`measureText` sizes the y gutter), so an axis whose neighbouring label boxes
overlap at the narrowest verified viewport, and an overlay label whose box intersects a drawn mark,
are both arithmetic on values this pipeline already has.

Cost: two rebuilds, and they would have shipped if I had trusted the run.

## Found at delivery

DELIVERY — the one journalist-facing sentence this format computes has no home on disk, and nothing
tells the producer to give it one.

Ran: `materialise({form: "owned-file", format: "web", ...})` with placement, credit, language and
caveat handed in.

Came back: `a hand-over cannot be written without alt — each is already recorded (placement and
credit are hand fields 4 and 5, alt is in the component)`.

Measurement: `resolveRecordedAlt` reads `beats/<outputId>/ALT.md`, and
`grep -rl ALT_TEXT_FILE skills/` names three files, all of them `deliver`'s own. No craft skill
writes it, `chart-web/SKILL.md` never mentions it, and the reference chart × web beat in this tree
(`stories/real-ember-renewables-share/beats/1-where-your-country-sits`) has no `ALT.md` at all — it
passed the string through from its runner's return value.

`deliver/SKILL.md` states this limit in its own words ("no craft skill writes `ALT.md` today, so a
beat that records nothing is the ordinary case"), so it is not hidden. What it is, is the shape this
project keeps naming: the alt text is composed in the runner, returned to a caller, and lives in a
conversation until someone happens to write it down. The producer that computes it is the one thing
in the chain that knows it.

Cost: one throw, then one file written by hand. The message is good — it names the file and says
where the answer lives — and the only thing missing is a producer that writes it.

## Found at storyboard

STORYBOARD (G2b) — a caller error is reported as a reachability verdict that had just been computed
the other way.

Ran: `formatPublicationFormatGate({recommended: "web", rationale, options: ["static","web","video",
"scrolly"], treatment: "Lollipop"})` — `options` as the format names, which is what the parameter is
called.

Came back: `recommended publication format web is not reachable`.

Expected: something about the argument's shape. In the same session, one line earlier,
`formatGap("chart","web")` returned `null`, `treatmentFormatGap("Lollipop","web")` returned `null`
and `confirmFormatReachable({medium:"chart",format:"web",treatment:"Lollipop",capabilities})`
returned `"yes"`.

Measurement: the function builds `byFormat` from `options.map((option) => [option.format, ...])`. A
string has no `.format`, so every key is `undefined`, `byFormat.get("web")` is `undefined`, and
`!recommendation?.reachable` is true. The refusal is the same sentence a genuinely unreachable
format gets.

Cost: a wrong diagnosis and a detour into `format-catalog.mjs` looking for the gap. Small, and it
would cost a model more: "web is not reachable" is exactly the kind of sentence a caller believes
and works around.

## Found at storyboard

PALETTE (typeface) — the measurement is taken on the wrong machine for a web beat.

Ran: `proposeTypeface({newsroom})`, which refused: it requires a `resolves` function and names
`familyResolves`, exported by a `render-still.mjs`, as what to pass.

That refusal is right for a still: resvg draws the fallback and reports nothing, so an unmeasured
proposal is a guess. But this beat's artefact is an HTML page, and the face it is drawn in resolves
in the READER's browser. `familyResolves` measures this machine's fontconfig, which is a fact about
the render host and not about any reader.

Here the answer lands right for the wrong reason: the page embeds no font file, so a reader without
Space Grotesk sees the fallback whatever this machine holds, and `origin: default` is honest. It
would land wrong the day a web beat inlines a face as a data URI — this machine would report "does
not resolve" about a font the page carries with it.

Cost: nothing on this run. Recorded because the proposal's own text ("this machine does not have
it") is read as an answer about the delivered page, and for a web beat it is not one.

## Found at production

PRODUCTION (chart-web) — a derived population with a hand-typed length, and delivering one beat
turns five tests red at once.

Ran: `bun test skills/chart-web/test` after this beat's page landed in
`stories/<slug>/beats/<beat>/renders/`.

Came back: `176 pass, 5 fail`. All five are the same assertion in five sibling files —
`accessible-table.test.ts:180`, `degrades-without-javascript.test.ts:123`,
`keyboard-reach.test.ts:130`, `reduced-motion.test.ts:144`, `weight-ceiling.test.ts:85` — each
`expect(files.length).toBe(24)`, each reporting `Expected: 24  Received: 25`.

Measured: `deliveredPages(root)` returns 25 pages, and exactly one of them is new — this beat's.
Run in isolation, `keyboard-reach.test.ts` is `4 pass, 1 fail`: the capability walk itself passes on
the new page (27 of 27 marks reached by Tab, 27 named), and only the COUNT fails. The same holds for
the other four; the format's own driven verifier reports every one of these capabilities green on
this page.

Not fixed, and deliberately: this round's brief is do not edit `skills/**`, it measures the
toolchain rather than repairing it. Recorded because of the shape rather than the red.

`deliveredPages` exists precisely so the population is DERIVED — its own doc-comment says the four
walks used to start at `proof/` and stop there, so six beats under `stories/` had never been put to
any of them. The list is derived and the LENGTH is typed, in five places, and the comment above it
instructs the next author to hand-edit all five. Eight agents delivered into `stories/` this round;
that is five files edited eight times, and every one of those edits is indistinguishable from the
edit that would paper over a page silently dropping out of the walk — which is the exact failure the
number is there to catch.

What the number is protecting is real (a count that creeps DOWN must fail loudly) and it does not
need a magic literal: the walk's own result committed as a manifest beside the tests, or an
assertion that every page a previous run saw is still in the walk, keeps the loud failure on the
disappearance and stops charging a story for existing.
