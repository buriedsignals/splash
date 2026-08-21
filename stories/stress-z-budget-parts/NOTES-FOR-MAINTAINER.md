# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at production (chart / web)

Eighteen defects met while producing `1-postes-du-budget` (chart / web) from a French municipal
budget whose `Recettes exceptionnelles` line is −104,6 M€. None of them was spoken to the journalist;
the beat was produced around all of them and the workarounds live inside this story only.

### The grounding check confirms the sentence the article says is false

`groundTakeaway`'s totality shape reads a bare `100 %` token and answers, verbatim:

    { "claim": "100 %", "verdict": "supported",
      "detail": "column \"part_pct\" sums to 100, which is the whole (100)" }

`part_pct` sums to 100 ONLY because −9,7 cancels 9,7 points of overshoot. The shape never checks
that the members it is summing are parts. Three consequences, each measured on this story's own
frozen table:

1. "The sum of the parts exceeds 100% because one line is negative." → `supported`, with that same
   detail. So does "The seven lines do not make up 100% of the budget." `TOTALITY_PERCENT_RE` is
   `/\b100\s?%/g` and nothing reads what the sentence DOES with the token, so a claim asserting the
   opposite of totality is confirmed by the totality evidence.
2. The other three totality patterns — `the whole of`, `all of`, `together … make up` — are English
   only, on a file whose `LEXICON_LANGUAGES` declares English, French, Greek and Arabic and whose
   `isShareColumn` carries all four languages' column-name stems. A French totality claim fires only
   when it happens to contain the literal `100 %`.
3. `readNumericToken` refuses every comma-carrying numeral as ambiguous, so on this French story
   `1 188,3`, `104,6`, `1 083,7` and `38,1` all came back `unverifiable`. The SAME sentence written
   with ASCII decimals came back `supported` — `1083.7 millions` matched the column's own sum. The
   verdict turns on the decimal separator, and `groundTakeaway` takes no language argument even
   though the story records `language: fr` and the newsroom records `languages`.

`grounding: unverifiable` in this story's `STORYBOARD.md` is the honest reading of a check that
could not read the takeaway's own numbers.

### The `part-to-whole` requirement cannot be satisfied by a part-to-whole table

`propose.mjs`'s `requirementFinding` tests `part-to-whole` as
`measures.length >= 2 && nonnegative`. Measured both ways on synthetic profiles:

- the canonical LONG table (one category column, one non-negative value column, five rows — the
  shape every pie ever drawn from a CSV has) leaves `part-to-whole` UNRESOLVED, so
  `recommendVisualChoice` can never recommend a pie, a treemap or a stacked bar from it;
- the WIDE table the requirement was written for (one row, three non-negative measures) satisfies it
  and then fails pie's own `few-categories` and stacked-bar's own `categorical`.

That is a mechanical account of why no part-to-whole treatment has ever been chosen in six rounds.
It did refuse this story, but by accident: `nonnegative` is `every` over ALL measures and both
`montant_meur` and `part_pct` have negative minima. It never asks whether the members make a whole.

### Nothing else refuses a negative slice

`grep -rn "negative" skills/chart-beat/references/types/` finds one sheet that names the case —
Marimekko ("zero or negative total breaks the whole width-allocation logic"). Pie, treemap,
stacked bar and sankey say nothing. In the catalogue, `nonnegative-value` is a requirement on
treemap and sankey but NOT on `chart.pie-and-donut` or `chart.stacked-bar`.

### The candidate menu's own refusals are wrong for this family

Three separate faults, all visible in the menu `formatCandidates` printed for this story:

- The "when NOT to reach for it" sentence is cut at the SOURCE FILE'S LINE WRAP, not at the
  sentence. Four types are affected — heatmap, histogram, pie and waterfall — and two of them are
  the two this story needed. The pie's reads "This is the type most often misused in a newsroom, so
  be honest about it rather than reflexive." and drops the sentence that would have refused this
  table outright ("If the parts don't sum to one meaningful whole … a pie is not just weak, it's
  making a claim — 'these add up to something' — that the data doesn't support"). The waterfall's is
  cut at "a set of independent", losing the clause that refuses a part-to-whole of a single total.
- The pie's own machine-readable limit is `slices > 5`. `formatCandidates` enforces only limits
  whose `unit` is `rows`, so seven postes were offered a pie with a "Check by hand" note. The one
  count that sheet states is the one the gate cannot use.
- `assertDistinctWays(["Pie and donut","Treemap","Stacked bar"])` returns `true`. All three are one
  whole split into parts, differing only in the channel (angle / area / cumulative length) — the
  exact shape it refuses for bar-and-lollipop. It knows only the `sameIdeaAs` links type sheets
  declare, and no part-to-whole sheet declares one.

### The delivered page is set in a typeface nobody chose

`render-web.mjs`'s `buildCss` writes `font-family: Helvetica, Arial, sans-serif` as a literal
(line 524), and that file imports `deriveFurniture`, `measureText` and `readPalette` from its own
vendored `render-still.mjs` but NOT `readTypeface` or `assertDrawnInActiveTypeface`. The guard
catalogue records `typeface-is-recorded` as an EXCEPTION for this skill on the grounds that its
vendored copy "carries readTypeface … enforced by the renderer instead of asked of the author".
That is true of this format's static PREVIEW path and false of the artefact it ships. `NEWSROOM.md`
records `Space Grotesk, Courier New`; the delivered page is Helvetica. A `TYPEFACE.md` was written
beside this story anyway, with the gap named in its own prose.

### Two width defects the format's own checks did not see

At 375×812 the first render of this beat drew its seven bars in a FIVE-PIXEL plot column: the three
measured gutter tracks are fixed pixel widths and summed to 322 of 375, leaving `1fr` with the
remainder. `verify-web.mjs` passed it, 52/52. Its check is
`m.plot.h >= 100` against `.chart-plot` — a HEIGHT, of the whole grid box including the gutters —
and it has no width dimension at all. `graphicFillsItsFrame`, which reached this skill in the last
round's widening, would not have caught it either: it measures the FIGURE's box against the window,
and the figure was full width the whole time. The widening is real; on the case this story produced
it is silent. Both were worked around inside this beat by capping each gutter track as a `min()` of
its measured width and a percentage, and by anchoring the write-back's label to the zero line.

### Three recorded facts with no reader

- **`surfaceGap`.** `runPreflight` computes `capabilities.datawrapper.surface = {ground: "#16191B",
  static: true, web: false}` for this dark-ground newsroom, and `surfaceGap` turns it into a
  sentence. `grep -rn "surfaceGap"` finds the definition, its own tests, and one line of prose in
  `dw-beat/SKILL.md` — no producer, no gate, no delivery path. `datawrapperMatch({medium: "chart",
  format: "web", treatment: "Pie and donut"})` still returns `d3-pies`/`d3-donuts` with nothing
  saying the embed surface is refused. Had the journalist chosen the pie, the producer gate would
  have offered Datawrapper for web and the refusal would never have been said.
- **`newsroomLanguages`.** `NEWSROOM.md` records `languages: en`; this article and every delivered
  word are French; both Gate-2 readings pass. `newsroomLanguages` has no reader outside its own
  module, its own test and the installer, so the documented rule — that the recorded list is what
  the language confirmation chooses among — has no mechanism behind it.
- **`cmsKind` / `cmsEndpoint`.** `grep -rn "cmsKind" skills/deliver/scripts/` returns nothing.
  `offerForms` listed "CMS insertion" as `available: true` for a newsroom that has recorded no CMS
  at all, while `embed` was correctly disabled with a probed reason. The CMS row is narrowed by the
  beat and never by the newsroom.

### Two smaller ones

- `framingMeasurement`'s `spreadAgainstExtent` is `(max − min) / max`, which cannot stay under 1 on
  a signed series — it printed 125,4 % here — and `largestAgainstMedian` returns `null` without
  comment when the median is at or below zero. The diverging family is the one family that always
  has negative values, and it is the family this ratio cannot be read on.
- `readPalette`'s refusal tells an unattended run to record "exactly its ground and accent (and
  accents, when the newsroom carries more)", but `proposePalette`'s option objects carry no
  `accents` key — only `{id, origin, ground, accent, label, reasoning, provenance, contrast,
  remedy}`. A run following the instruction verbatim has to go back to `NEWSROOM.md` itself.
- `intake`'s profiler records `part_pct.sum = 100` and `part_pct.min = -9.7` side by side, and
  nothing carries forward that the first is produced by the second. A share column with a negative
  member is exactly the case where `sum` is not a whole, and that is the one number the grounding
  check trusts as one.
