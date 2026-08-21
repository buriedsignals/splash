# Round five — findings measured by the controller before any producer ran

## C1 — an identifier with a hyphen becomes a negative measure  ← the headline

Found at FREEZE time on `stress-y-rural-broadband`, whose first column holds
`Commune-001 … Commune-186`:

    "name": "municipality", "type": "number", "unit": "Commune",
    "min": -186, "max": -1, "sum": -17391,
    "denominator": { "column": "households" }

A column of place names is typed as a **measure**, with a **unit**, a **negative range**
and a **sum**. The unit reader — added in round one for `"12 %"` and widened in round two —
takes the alphabetic prefix as a unit and the hyphen as a minus sign.

Reproduced on the simplest possible input, no story involved:

    Commune-001, Commune-002, Commune-003  ->  number, unit "Commune", min -3,  max -1,  sum -6
    COVID-19,    COVID-20,    COVID-21     ->  number, unit "COVID",   min -21, max -19, sum -60
    T-34,        T-72,        T-90         ->  number, unit "T",       min -90, max -34, sum -196
    Alpha,       Beta,        Gamma        ->  text  (correct)

The shape `<letters>-<digits>` is not exotic: case IDs, product codes, region codes,
ISO designations, and `COVID-19` itself. Every one of them becomes a signed number.

**What it poisons downstream**, all of it live in this tree today:
- `findValueColumn`/`chooseValueColumn` will offer it as the column a superlative is about.
- `requirementFinding` counts it as a numeric column, so `numeric-pair`, `multiple-series`
  and `few-series` all fire on a table whose only "measure" is a list of names.
- Round four's own denominator detector has already attached `households` to it as a
  denominator, so the toolchain is prepared to reason about names per household.

Round four's finding 1 was the checker matching numbers to the wrong column. This is one
layer earlier: the profiler manufacturing a column that was never numeric at all.

## C2 — Arabic-Indic digits are refused correctly, and the reason says so

`stress-x-tunisian-water`'s consumption column mixes Western and Arabic-Indic digits
(`٨٩٠٠٠٠٠٠` for Sfax). The profiler refuses the column and records:

    looked numeric but "٨٩٠٠٠٠٠٠" is not, so the column stays text

Correct, and the reason names the offending value. Whether a journalist would rather have
the column read is a product question; refusing with the value named is the honest default.

## C3 — the denominator detector does not read Arabic

`stress-x` carries `السكان` — population — beside a consumption column, and no denominator
candidate is reported. The detector matches column names against a list of English words
(`popul|resident|inhabit|household|pupil|student|…`). That is a stated limitation of a
name-based rule rather than a bug in it, but it means round four's fix is Latin-script only,
and the fix landed one round after a Greek story and in the same round as an Arabic one.

## C4 — what the freeze got right

- `stress-t`'s duplicate row (Sweden twice, byte-identical) is reported: `duplicates.count: 1`.
- `stress-t`'s `survey_date` mixes `2025-03-01`, `01/03/2025` and `March 2025`; typed `text`.
- `stress-y`'s `measured` column, uniform ISO dates, typed `date`.
- `stress-y`'s `broadband_pct` refused with the unit ambiguity named: `"53.7 %" has one,
  "62.3" does not`.

---

# Beat Y — 186 rows, delegated, delivered. 20 defects.

`whereIs → {"phase":"done","missing":[]}`. Datawrapper chart `yNwL8` created; nothing deleted.

**The chart is good.** All 186 dots, nothing truncated or sampled; the impossible 104.2% reading
annotated in place rather than removed (`Commune-063: 104.2% — above the ceiling, unexplained`);
a labelled 100% reference line; the subtitle naming the six blank returns AND the impossible one.
Round four's credit fix visible in the footer as `Source: not stated`.

Three of the twenty verified independently by the controller:

## Y1 — `credit: unattributed` never reaches a producer  ← our own round-four fix, half-landed

    buildChartPayload({... credit: "unattributed" ...}).metadata.describe["source-name"]
    -> "unattributed, 2025-06-30"

The word **"unattributed" would print under a published newsroom chart.** `dw-beat`'s own
`detect-delivered-text.mjs:223` states the opposite in its error text — *"record `credit:
unattributed` and the artefact prints \"Source: not stated\""*.

    grep -rl "creditLine\|UNATTRIBUTED_CREDIT" skills/ | grep -v test
    -> storyboard, deliver/format-handover, deliver/SKILL.md, the catalogue

**No producer reads it.** Round four's fix landed in the editorial record and in the hand-over and
in neither of the two places that draw pixels. The delivered PNG says "Source: not stated" only
because the agent hand-patched `spec.json`, and recorded the divergence rather than hiding it.

## Y2 — a dark-ground newsroom cannot use Datawrapper, and finds out after publishing

The run created chart `yNwL8`, uploaded 186 rows, patched the metadata, **published it**, exported
the PNG, and only then threw:

> the delegated export came back on the opposite side from the ground this story declared:
> ground #16191B (luminance 0.009), export luminance 0.991

The refusal is right; its **placement** is the defect. `runPreflight` says
`datawrapper {available: true}`; `formatProducerGate` offers "Datawrapper or custom?" without
mentioning the surface; and `proposePalette` for this newsroom offers ONLY dark-ground options —
so a Buried Signals story cannot record a palette this producer can honour. A live chart now
exists on the account that the journalist was never told could not be delivered.

## Y3 — the house accent reaches no non-bar chart type

Round three found the accent ignored by a delegated bar chart and fixed it. `buildChartPayload`
sets `visualize["base-color"]` only when the chart type matches `/bars|column/`, so a scatter
falls back to `custom-colors` — the key round three itself measured as inert.

Measured off the delivered bytes: **2014 pixels of `#18a1cd` (Datawrapper's own blue) against 1811
of the house `#5B8A8A`, and every one of those 1811 is rule or label.** The 186 marks are not the
newsroom's colour.

## Y4 — `cms-insertion` would post 30,131 replacement characters into a CMS

Verified by the controller:

    ownedFileForInsertion(beatDir, "static")  -> chart.png
    readFile(..., "utf8")                     -> length 73479, U+FFFD 30131

`deliver.mjs:781` reads the chosen file as UTF-8 and hands it to `buildInsertion` as
`insertionHtml`. For a static Datawrapper beat there is only a PNG. `offerForms` lists the form as
`available: true`, and it is the form this brief's journalist most plausibly wants — *"we need it
in the CMS by tonight"*. The agent measured it read-only and chose `owned-file` instead, so
nothing was posted anywhere.

## The rest, as reported

5 — nothing anywhere notices a percentage above 100 · 10 — a scatter's x axis is unmanaged and
landscape ships `-4,000 households` (it disappears at portrait, which is how it was isolated) ·
13 — the hand-over promises a vector that does not exist · 14 — `SUBJECTS.md` is required at the
last gate and by no gate before it · 19 — the Datawrapper treatment map has no distribution type ·
20 — five of `dw-beat`'s declared guards have no caller outside their own file.

---

# Beat W — three photographs, one with no caption and no photographer. 14 defects.

`whereIs → done`. **The render is good work.** Three photographs in one consistent letterboxed
box; the portrait frame (1200x1600) is letterboxed with side bars rather than cropped or stretched;
and the 2010 photograph carries, in the delivered pixels, *"No caption or photographer came with
this frame. Source: not stated"*. The honest path round four opened for `credit` exists here too,
and a newsroom that genuinely cannot attribute a picture is no longer stopped.

## W1 — the honest absence defeats the capability that was built to see it  ← two of our own fixes colliding

`photosDeclareAltAndCredit` counts a credit as present when it is non-empty and not wrapped in
`[...]`. The delivered beat prints **`Source: not stated`** under two of three photographs — the
exact string this tree agreed in round four means *nobody named a source* — and the guard answers:

    {"photos":3,"missingAlt":0,"missingCredit":0}

verified by the controller against the delivered SVG. The agent's own three passes show the whole
mechanism:

    PASS 2 (bracketed): {"photos":3,"missingAlt":1,"missingCredit":2}
    PASS 3 (prose)    : {"photos":3,"missingAlt":0,"missingCredit":0}

Between those two passes nothing changed about the beat except **the wording of the two absences.**

The capability's own catalogue entry claims it reads "an alt and a credit read mechanically off the
delivered file, not merely assumed because a write-time refusal exists". It now accepts the
sentence meaning "there is no credit" as a credit. Round two closed the one string round two
happened to use; round four introduced a second one and nobody told the detector.

## W2 — `stress-h-site-photographs/source/data.csv` is JSON

Verified: `JSON.parse` succeeds on it. A frozen `source/data.csv` from round two contains a JSON
object, and that story's runner does `JSON.parse(readFile(".../source/data.csv"))`. It is the only
other image beat in the tree. Frozen, so not fixable in place — but it means the format of a
frozen source is checked by nothing.

## W3 — portrait is refused, and drawn without its stage band a third of the beat is covered

The size gate can choose `portrait`; `image-beat` **has no size table at all**, so it cannot honour
it. Drawn without the stage band, a third of the beat is covered. This is the first round ever to
pin portrait, and the first format asked for it cannot do it.

## The rest, as reported

3 — the refusal is one field at a time, so three gaps take three round trips · 5 — the seed uses
`captionTop` as a baseline and `creditTop` as a top · 6 — the letterbox bar is never measured
against anything · 7 — the example-runner sweep measures nothing for this format · 8 — three of
`image-beat`'s four declared guards have no caller outside their own tests · 9 — `owned-file`
delivers the whole of `renders/`, working files included · 10 — `formatHandover` carries ONE alt
and ONE credit; an image beat has one of each per photograph · 11 — candidate selection is
chart-and-map only, and its two guards go vacuous for `image` · 13 — recording a typeface for an
image story needs a cross-skill import.

---

# Beat U — scrolly, with a step where nothing happens. 9 defects.

`whereIs → done`. **The round-two scrolly fixes DID change what a producer makes**: this beat is a
scrub with 19–27% redraw per step and every mark declaring `reached`, against round two's 15%-of-
frame graphic with prose that was neither a card nor opaque nor centred. That is the clearest
"did the fix land" answer any round has produced.

And the flat spot is judged correctly: 2000–2005 records an identical area and volume, the article
explains why, and the guard agrees it is the story rather than a defect — 22.0% redraw,
`stillSteps` and `stalledSteps` both empty.

## U1 — an aggregate "equals" that is 27% out, returning the checker's strongest verdict  ← our own new code

Verified by the controller on the frozen story:

    "The Rhone glacier has fallen to 0.61 square kilometres in 2025."
    supported | 0.61 | equals the sum of column "volume_km3" (0.482)

`0.61` is the 2025 AREA. It is declared equal to the sum of a different column, `volume_km3`,
which is `0.482` — a 27% gap — and `supported` is the strongest verdict this checker gives, the one
`groundingScalar` closes G1 on.

The cause (`ground-claim.mjs:310-314`):

    const AGGREGATE_TOLERANCE = 0.01;
    Math.abs(value - sum) <= Math.max(0.5, Math.abs(sum) * AGGREGATE_TOLERANCE)

The absolute floor exists for a good reason, stated in its own comment — "so a small column (sum 9)
is not held to a tolerance of 0.09" — and it scales catastrophically downward: for a sum of 0.482
the window is ±0.5, so **any value from −0.018 to 0.982 "equals" it.** The smaller the column, the
wider the relative window, without limit.

**Measured exposure: 7 of the 27 stories in `stories/` carry a column whose sum is under 50** —
`milan-cortina` (34 and 5.5), `stress-g` (36), `stress-s` (1), `stress-k` (42), `stress-o` (15),
`stress-u` (10.5 and 0.482), `stress-c` (31.3).

This is in the path Task A rewrote this week. It is also round four's finding 1 wearing a third
face: a number matched to the wrong column, now via an aggregate rather than a range.

## U2 — `reveal-fills-the-frame` measures a hard-coded list of four beats

Verified in `skills/scrolly/test/composition-fills-frame.test.ts`:

    const POPULATION = [
      "scrolly-one-chart-swiss-life-expectancy/...", "scrolly-chart-eu-carbon/...",
      "scrolly-image-grinnell-glacier/...", "scrolly-mixed-grinnell-ice/...",
    ];

Four paths, typed by hand, plus `stress-g` named in its own describe block. And the population is
asserted only `toBeGreaterThan(0)`, never against the floor the guard defines. **A new scrolly beat
is measured by none of it** — U's own beat included.

The agent reports the same shape more widely: 5 of the 13 guards `verify-scrolly.mjs` declares are
never called by its driving run.

This is precisely what the traits derivation exists to abolish — a population typed rather than
derived — surviving inside a skill the catalogue reaches.

## The rest, as reported

`SUBJECTS.md` required by delivery and checked by neither gate (round-four finding 9, one file
over — and W reported it independently, so that is two formats) · `skills/scrolly/SKILL.md` refuses
single-`frameKind` beats in two places while documenting, verifying and shipping the scrub model
for exactly them.

---

# Beat T — map / video, portrait, over names that will not join. 15 defects.

`whereIs → done`. Real MapTiler basemap, real mp4 (1.2 MB), portrait 1080x1920.

## What T got right

- **The join failures are published, not hidden.** `Holland`, `Macedonia`, `Czech Republic` and
  `Belgiumm` do not match the shapes; the map draws every unmatched country in a hatched fill with
  a "did not report" key, and the footnote says *"31 of 42 countries did not report; definitions of
  'recycled' differ."* A reader is told, in the frame, what is missing.
- **The takeaway is hedged to what the data supports**: *"Germany recycles more of its waste than
  any country that reported"* — not "than any country in Europe", which the joins cannot support.
- **Task A's grounding is doing real work.** `resolveGrounding(…, {csv})` returned `supported` on
  two claims read out of the frozen rows — `"Germany"'s own value in "recycling_rate" (67.8) is the
  column's maximum`, `"Macedonia"'s … (18.4) is the column's minimum`. A false takeaway
  (*"France has the highest"*) makes `groundingScalar` **throw**, naming the refutation. That is
  the mechanism working end to end on real material.

## CONTROLLER CORRECTION — the empty band is not a defect

I measured 684 px of empty ground below the content (35.6% of the frame) and read it as a
composition failure. It is deliberate: the agent's report states *"the bottom 672 px of the 1920 px
frame is ground because the platform's caption and buttons sit there."* That is the portrait
safe band. The measurement was right; my reading of it was wrong.

## T1 — portrait's real cost, which nothing warns about

The honest number, from the agent: at a 36 px type floor inside the 979 px safe band, the furniture
a phone reader must be able to read — title over two lines at 50 px, the conclusion line, a legend
with six ticks, a two-line caveat, a two-line credit — takes **439 of 979 px**, leaving **560** for a
square European plate in a 1080 px-wide frame. **The map ends up 187 CSS px across on the phone it
is made for.**

Nothing in the toolchain says this before a beat is written. The only thing that caught it was a fit
guard the agent wrote by hand, firing twice.

## T2 — no frame-fill rule reaches a fixed frame

Measured in the catalogue:

    fills-its-frame         capability  requires ["ships-standalone-html"]
                            -> chart-web, dw-beat, map-web, scrolly
    reveal-fills-the-frame  guard       requires ["reader-driven-reveal"]  -> scrolly

So the question "does the graphic fill the frame it was given" is asked of **web formats only** —
the ones whose container varies — and never of static or video, whose frame is fixed and known at
render time. The capability was declared against the trait describing its first instance (a
standalone page) rather than the trait describing the property (a beat with a delivered frame).

## T3 — `map-beat` ships no size table, so gate 2c's `size:` reaches nothing

Same shape W reported for `image-beat`. Pinning `portrait` reached nothing until the beat carried
`#shared/chart-video/sizes.mjs` by hand. **Two of the eight producing skills cannot honour a size
the gate is allowed to choose**, and this is the first round that ever chose portrait.

## T4 — `decollide`, a round-five fix, is unreachable from every video component

It lives in a module that imports `@resvg/resvg-js`, which a Remotion component cannot load. So the
de-collision Task E copied into all seven `draws-own-geometry` skills is, for the video format,
present in the file tree and impossible to call.

## T5 — the profile's `duplicates` has a writer and no reader

Sweden appears twice, byte-identical; `profile.json` says `duplicates.count: 1`; nothing downstream
reads it, so the beat had to find the repeat again at the join.

## The rest, as reported

1 — nothing maps a country NAME to a shape key anywhere, and `unmatched-value-hides` only caught the
four dirty names because the beat keyed values by the raw source string, a convention nothing
documents · 3 — the two shared size guards read markup a browser-rendered video never yields ·
4 — a map label clipped by the plate is silent · 6 — `claimViolations` knows exactly one claim, the
CO2 seed's · 7 — `plateFollowsGround` passes a reading that never happened · 8 — `verify-map.mjs`
declares `surfaceLuminance` twice, byte for byte · 9 — not one guard in `verify-map.mjs` is
reachable from a command · 10 — `owned-file` ships the beat's internals to the newsroom ·
11 — the closing offer asks for a word the recorder rejects · 12 — `groundTakeaway` attaches a
superlative to a REFUSED column on an incidental word · 13 — it decides two clauses of one takeaway
against different evidence.

---

# Beat V — chart / video, portrait AND square, values crossing zero. 15 defects.

`whereIs → done`. Two sizes rendered as mp4: portrait 1080x1920 and square.

## The best artefact of the round, and the clearest proof a round-four fix landed

The portrait diverging bar puts the zero line at centre, gains right and losses left, sorts
descending, labels every bar with its signed value in thin-space thousands, and accents `Centre`
with a highlight band. Both of its numeric claims verified by the controller against the frozen
data:

- *"Across all seven regions the balance is a net loss of 9 380 people."* — exact.
- *"Per 1000 residents Sud, not Ouest, gained most."* — Sud 5.11 per 1000, Ouest 4.57. True.

**That second line is round four's denominator prompt reaching the pixels.** Nothing asked for it
in the brief's data; the toolchain raised the question, the producer answered it, and the answer is
correct and printed where a reader sees it. Two rounds ago the same class of story shipped a raw-
count headline that was false per capita.

It also carries *"Net balance only: births and deaths are not in this table"* — the journalist's
own limit, in the frame — and `Source: not stated`, the round-four credit path, again in a second
format.

`Montagne` at −780 against `Centre` at −21 800 is 3.6% of the largest bar and still legible,
because every bar carries its own printed value — `bar-and-column.md`'s own rule, applied.

## The fifteen defects are in the report

`stories/stress-v-regional-migration/NOTES-FOR-MAINTAINER.md` carries the same list, written by
the producer beside the beat.

---

# Beat X — Arabic, right-to-left, two numeral systems. 9 defects.

`whereIs → done`. **The best-judged beat of the round.**

## What X got right

- **Arabic renders correctly in the pixels** — joined, right-to-left, not reversed, not boxes.
- **The bars grow right-to-left from a right-hand axis**, labels on the right, values at the bar
  ends. The chart is laid out for the script, not merely translated.
- **The unreadable value is drawn as a dashed, unfilled bar** with an Arabic annotation saying the
  Sfax figure was written in Arabic-Indic numerals (`٨٩٠٠٠٠٠٠`), could not be read automatically,
  and was converted by hand — so it is drawn without a fill. That is the honest treatment of a
  value the toolchain refused, published rather than hidden.
- The subtitle states the table does not cover the whole republic, so no national ranking can be
  read from it.

**The blue bar is not a defect.** `PALETTE.md` records `accent: "#1F6FB2"` with `origin: subject`
and the reasoning: blue-for-water is `SUBJECT_CONVENTIONS`' own value, measured at 3.34:1 against
the ground, above the 3:1 non-text floor, with both house accents kept in `accents` for later
series. A journalist chose a convention over the house recommendation and recorded why.

## X1 — every name-based lexicon in this toolchain is English-only  ← the round's structural theme

Three independent instances, in three different skills, all found this round:

| lexicon | what it missed |
|---|---|
| the denominator detector (round four) | `السكان` — population — beside a consumption column |
| `palette`'s `SUBJECT_CONVENTIONS` | `محافظة تونس` matched nothing, so blue-for-water was never offered |
| `groundTakeaway`'s claim vocabulary | an Arabic superlative is not a claim, so **the one thing this beat asserts was never checked** |

Each was written against the language its first story happened to be in. The tree has now shipped
a Greek story and an Arabic one.

## X2 — the typeface gate certifies a font that cannot draw the story's text

`familyResolves` probes a **Latin** string. So the gate passes a family that renders this story's
own Arabic as empty boxes. The check is green precisely where it matters least.

## X3 — resvg ignores SVG `direction`

Arabic lines are laid out as left-to-right paragraphs, so sentence-final punctuation lands on the
wrong side. A rasteriser limitation rather than a Splash bug, but nothing in the toolchain knows
about it or says so.

## X4 — `creditTracesToRecord`, a round-four rule, cannot see a fabricated credit in a non-cased script

## X5 — the example-runner sweep, corrected

X reported that its runner rewrote its own committed renders while the scratch directory stayed
empty. **Verified**: scratch dir 0 files, committed PNG mtime changed, and the sweep classifies it
`called: true, unaimable: false`.

The controller's first attempt to size this said "28 of 116 runners write into the repository".
**That number was wrong** — it came from a crude `process.argv` grep. Measured properly:

    distinct runners the sweeps call                              : 116
      no entrypoint at all (a library — spawning it renders nothing): 45
      entrypoint, reads argv (genuinely aimable)                    : 70
      entrypoint, IGNORES argv (writes into the repository)         :  1

So the real finding is **not** mass repository rewriting. It is that **45 of 116 members of the
sweep's population are library modules with no entrypoint**: spawning them renders nothing and
exits 0, so they pass trivially. F's sweep reports "chart-beat: 55 ran to completion" — and 39% of
what it counts proves nothing at all.

The write-home shape is real but rare in the committed tree (one proof beat). It matters because
X's beat has it, and X's beat was written from `chart-beat/SKILL.md`'s own Quick start — so every
NEW beat written from the documented pattern will write home while the sweep believes it was aimed
at a scratch directory. `example-runners.mjs`'s header claims "IT DOES NOT WRITE INTO THE
REPOSITORY"; the test it applies is the presence of the STRING `outDir`, not the ability to be aimed.

These sweeps are in `ci.yml` as of this session.
