# Notes for the maintainer

Found while running one real story — WHO's rabies register, world choropleth, map × web — end to
end on `feat/parity-by-traits`, 2026-08-23. Nothing here belongs to the journalist and nothing here
is in `export/`.

Every entry: what I ran, what came back, what I expected, what it cost.

---

## Phase `intake`

### I1 — the period column is the record's own timestamp, so a 195×15 panel profiles as no panel

**Ran** `freezeSource` over the frozen `source/data.csv` (2 919 rows, 25 columns, one row per country
per year, 2010–2024).

**Came back** `"panel": null`.

**Expected** `panel: {entity: "SpatialDim", period: "TimeDim", periods: 15, …}` — the profiler's own
step 2a says "Almost all open data is a PANEL … `panel` names the entity column, the period column."

**Why.** `findYearColumn`'s order is
`named.find(holdsPeriods) ?? named[0] ?? columns.find(holdsPeriods)`. This table's period column is
`TimeDim` (integer, 2010–2024) and its name matches neither `year` nor `date`. The only column whose
NAME matches is `Date` — WHO's record-modification timestamp, a text column with 5 distinct values.
`named[0]` returns it and short-circuits the `columns.find(holdsPeriods)` fallback that would have
found `TimeDim`. Reproduced directly:

```
findYearColumn      -> { name: "Date", type: "text" }
panelShapeOf        -> { isPanel: true, periodColumn: "Date", periods: 5, entityColumn: null }
candidates named a period:   [ "Date:text" ]
candidates holding periods:  [ "TimeDim", "TimeDimensionValue" ]
```

The function's own docstring states the rule it breaks here: *"the name proposes and the values
decide … A column named for a period whose values are not period-shaped is not the period column."*
The code lets the NAME decide whenever no name-matched column has period-shaped values.

**Cost.** Everything downstream that reads the panel is blind. See S1.

### I2 — a stated incompleteness in plain English, reported as no incompleteness at all

**Ran** the same freeze, over an article whose Overview paragraph reads *"Globally there are an
estimated 59 000 deaths from rabies annually; **however, due to underreporting**, documented case
numbers often differ from the estimate."*

**Came back**

```
statedIncompleteness.claims: []
statedIncompleteness.says:  "the frozen prose states no incompleteness in English and French"
```

**Expected** the claim to be carried. The publisher states an incompleteness, in English, in the
plainest possible words, and it is the whole subject of this story.

**Why.** The lexicon is `incomplete, partial, partially, preliminary, provisional, year to date`
plus their French forms. `underreporting` / `under-reported` / `undercount` are not in it.

**Cost.** This is recurring shape 3 — a missing lexicon producing a false confirmation rather than a
refusal. The sentence *"the frozen prose states no incompleteness"* is not a hedge; it is a positive
statement, and it is false about this file. A producer who trusted it would have shipped a register
as if it were a census.

---

## Phase `storyboard`

### S1 — `2024` cannot be grounded, because the profile carries no period column

**Ran** `groundTakeaway` on the confirmed takeaway.

**Came back**, for the numeral `2024`:
`"2024" reads as a calendar year, and this profile carries no period column to place it against; …
(it does fall inside "TimeDim" [2010, 2024], "TimeDimensionValue" [2010, 2024])`.

The message names, in its own parenthesis, the two columns that ARE the period. This is I1's cost,
paid at the gate.

### S2 — a space-grouped numeral is split into two claims, and both are scored

**Ran** `groundTakeaway` on WHO's own numerals as WHO writes them.

**Came back** `59 000` scored as two separate claims, `"59"` and `"000"`; `3 021` as `"3"` and
`"021"`. Written unspaced, `59000` is one claim (still `unverifiable`, correctly — it is not in the
table). Measured both ways.

**Expected** one claim per numeral. `settleGroupedNumeral` exists for a COMMA-grouped numeral; the
space group — SI style, and the style WHO, Eurostat and the Swiss offices all publish in — is not
read at all.

**Cost.** `"021"` is not a claim anybody made. A journalist who quotes their source's own house style
gets a verdict about tokens that are not numbers.

### S3 — a real published file cannot be grounded at all, because the check needs the prose to name a column

**Ran** four candidate takeaways.

**Came back** `decided: 0 of 1` on all four editorial ones, every claim `unverifiable`, each with
*"this profile carries 4 measures ("Id", "TimeDim", "NumericValue", "TimeDimensionValue") and the
claim names none of them."*

**Expected** the check to reach at least the reported total. It can: given
`The file records 33732 reported human rabies deaths between 2010 and 2024` it answers
`supported — equals the sum of column "NumericValue"`. The mechanism works; it requires the
journalist's sentence to contain a machine column name. No published sentence ever will.

**Cost.** `grounding: unverifiable`, recorded honestly. G1 gave this story nothing. This is not a
bug in one lexicon — it is that the join between prose and table is by column NAME, and a real
publisher's API names its columns for its own schema.

---

## Phase `production` — the four changes that landed hours before this story

### P1 — THE WRAP REACHED THE SKILL AND NOT THE CHOROPLETH. A world beat announces that it wraps, and paints one world.

**The headline.** This is the first independent beat to meet the wrap ruling, and the ruling reaches
it in one half only.

**Ran** the documented path for a choropleth: `map-web/SKILL.md`, "Producing a choropleth", which
names `proof/mapgen-choropleth-web/` as *"the complete worked beat to copy"*. Copied it, swapped the
study set, camera and data, baked and rendered.

**Came back** — from the beat's own render, unprompted:

```
this beat does not fill its container: this camera spans 360° of longitude and the box range asks
for a frame 476.5° wide — … so the box is filled by repeating the world east and west.
```

…and the page paints **one** world. `grep -c data-world` on the delivered page: **0**.

**Why, exactly.** The wrap is two halves and they were distributed to different populations.

| Half | File | Commit | Who got it |
| --- | --- | --- | --- |
| The *derivation* (`cannotCover`) | `delivery-frame.mjs` | `45ca781f` | all 5 `mapgen-*` proofs, the skill, the bear story — **7 files** |
| The *painter* (`repeatWorlds`) | `render-web.mjs` | `c4783e32` | `skills/map-web` and `proof/mapgen-hexgrid-web` — **2 files** |

`grep -rl repeatWorlds` over the whole tree returns three producing scripts:
`skills/map-web/scripts/render-web.mjs`, `proof/mapgen-hexgrid-web/render-web.mjs`, and
`stories/real-owid-life-expectancy/.../render-web.mjs`. Every other `render-web.mjs` — including the
choropleth's, which references `cannotCover` **eight** times — computes the wrap, prints the
sentence, hands `cannotCover` to its component, and never repeats anything.

So this is (c) in your own terms: it fires, and something downstream drops it. Not (a): the beat was
baked and rendered minutes ago on the current tree. Not (b): the derivation is right, and the
delivered page carries both layers `repeatWorlds` needs (`id="mw-fallback"`, `class="mw-overlay"`,
one each) — it would have applied cleanly.

**What it costs, measured on the delivered page.**

| Width | Container | Box | Coverage | Worlds painted |
| --- | --- | --- | ---: | ---: |
| 1600×900 | 1568.0 × 583.5 | 1045.9 × 583.5 | **66.7 %** | 1 |
| 2990×1718 (the owner's) | 2958.0 × 1443.2 | 2585.1 × 1443.2 | **87.4 %** | 1 |
| 375×812 | 343.0 × 237.9 | 343.0 × 191.3 | **80.4 %** | 1 |

The spare room is **page ground**, which is the one thing the full-box change says it never is.

Three of the format's own instruments disagree with each other about this page:

- `verify-fills-the-box.mjs` prints `FILLS ITS CONTAINER BY WRAPPING … 3 copies of a 1400x781
  plate` **and** marks all three widths `← UNDER` **and** exits `1`. It believes `cannotCover` and
  measures the picture, and never reconciles the two.
- `verify-wraps-the-world.mjs` **throws** — `no primary world in this reading` — instead of
  reporting that no copy is painted. A verifier that cannot report the defect it exists for.
- `skills/map-web/test/frame-fills-window.test.ts`'s second case is literally named *"names every
  page that does not — and the list is empty, because the wrap emptied it"*. My two pages put two
  entries back into it.

### P2 — the sub-pixel census is optimistic by one width step, for the same reason

**Ran** `marksStrandedWithNoChannel` / `drawnWidthAt` over the delivered page.

**Came back** `plateIsBoundByHeight(html) === false`, so `drawnWidthAt(1600) = 1568`.

**Expected** `true`, and `1044`. The browser measures the map at **1043.9 px** in a 1568 px stage —
it *is* bound by height.

**Why.** `plateIsBoundByHeight` detects the wrap by looking for the CSS rule `height: 100cqh`, which
`render-web.mjs` emits *only on the wrapping branch*. No wrap in this beat, so no rule, so `false`.

**Cost, measured:**

| Width | `drawnWidthAt` says | browser measured | marks under a pixel, at each |
| --- | ---: | ---: | --- |
| 1600 | 1568 px | 1044 px | **33** vs **40** |
| 2990 | 2958 px | 2585 px | 28 vs 28 |
| 375 | 343 px | 341 px | 78 vs 80 |

The production-time verdict a journalist reads understates by 7 marks at 1600 px. The live probe,
which measures the real camera, says **50 of 194** at 1600×900. The floor is real; it is one step
lower than it should be, and the reason is P1.

### P3 — the no-data fill and the ramp's first class are 1.28:1 apart, on every ground this format ships

**This is not a dark-ground problem, and that is the finding.** The story turns on two opposite
facts — 94 countries filed nothing, 44 filed a real zero — and colour cannot tell them apart.

**Ran** `choroplethSurfaces` on four ground/accent pairs, six classes each, and measured contrast
ratios rather than luminance distances.

| Ground | no-data | nearest class | **contrast** | luminance gap (what the guard measures) | water vs no-data |
| --- | --- | --- | ---: | ---: | ---: |
| `#16191B` + `#D4A853` (this story) | `#343434` | `#484439` | **1.28:1** | 0.0237 | **1.02:1** |
| `#FFFFFF` + `#B2182B` (the worked beat) | `#e7e7e7` | `#dbc5c8` | **1.32:1** | 0.2075 | **1.00:1** |
| `#FFFFFF` + `#1A6B8A` | `#e8e8e8` | `#c6d1d6` | **1.27:1** | 0.1823 | **1.00:1** |
| `#0B0B0B` + `#E8E8E8` | `#303030` | `#424242` | **1.31:1** | 0.0249 | **1.00:1** |

The non-text floor is 3:1. All four pass `assertSurfacesRead`.

**Why it can never pass.** `offRampLuminance` puts the no-data fill at the MIDPOINT between the
ground and class 1. A midpoint's contrast against the upper end is
`(L₁+0.05) / ((L_g+L₁)/2 + 0.05)`, which rises toward **2.00:1** as `L₁` grows and is below it
everywhere. **No palette, no ramp low end and no class count reaches 3:1.** It is a property of the
midpoint rule, not of any beat.

**Why the guard cannot see it.** `assertSurfacesRead` measures a *luminance gap* against
`SURFACE_CLEARANCE = 0.02`. That is a different quantity from contrast and it scales differently at
each end of the range: 0.0237 on a dark ground and 0.2075 on white both pass, and both are ~1.3:1.
The units are wrong for the question.

**And the sea.** `water` and `noData` come out **1.02:1** here and **1.00:1** on the other three —
identical luminance on white. `assertSurfacesRead`'s third check requires them to be `0.02` apart in
luminance **OR** `MIN_CHROMA` apart in chroma, and the chroma branch is the only one that can ever
fire on a dark ground: the band between the ground (0.0094) and class 1 (0.0581) is 0.0487 wide, and
after each surface is held 0.02 clear of both ends the window left for them is **0.0087** — smaller
than the 0.02 they would have to be apart from each other. Recurring shape 4: a requirement that
cannot fire. A reader who cannot use hue gets one surface where there are two.

**What I did in the beat.** Nothing to the colour — no palette fixes it. The distinction travels in
WORDS, which `types/choropleth.md` asks for anyway: the first tick reads `0 — filed, reported none`
and the swatch reads `No return filed — 94 countries. Not a zero.`

### P4 — the ramp's low end refuses this newsroom's own recorded ground, for every class count and both accents

**Ran** `choroplethSurfaces("#16191B", "#D4A853", breaks)` for 2 to 8 classes, then again with the
newsroom's second recorded accent `#5B8A8A`.

**Came back** — refused, **14 of 14 times**:
`the no-data fill #2f2f2f measures 0.028 relative luminance, inside this ramp's own range … Derive
it from the ground with noDataFor/waterFor, and if there is no room, raise the ramp's own low end so
there is.` The same call on the proof beat's white ground passes at every class count.

**The arithmetic**: at low end `0.20`, class 1 sits at `0.0464`, the ground at `0.0094`, the midpoint
at `0.0279` — clearance `0.0185` against a `0.0200` floor. **Short by 0.0015, 7.5 %.** `0.22` is the
first value that passes.

**Cost.** A journalist on this newsroom's own recorded charter, following the documented path,
cannot render a choropleth at all. The refusal's advice — *"raise the ramp's own low end"* — names no
file and no number; the constant is `0.2`, an unlabelled positional argument inside `choroplethRamp`
in `ChoroplethWeb.tsx`, under a comment explaining why it was raised from `0.10` to `0.20`. It was
raised to almost enough. `map-web/SKILL.md` itself records this ramp as climbing `0.052 → 0.616` on
this exact pair — `0.052` is the low end at `0.22`, not at `0.20`, so the documentation already
describes a ramp that passes while the shipped constant refuses.

I set it to `0.24` in this beat's own copy (clearance `0.0233`), with the measurement in the file.

### P5 — the component could not express a claim whose second end is an absence

`ChoroplethWeb.tsx` threw `the subject and the comparison must both have a joined value`. This
beat's comparison is India, which filed nothing. Refusing it would have meant either dropping the
half of the argument the takeaway is about or painting a silence as a number. Changed in the beat's
own copy: a silent comparison gets no triangle on the value scale (a triangle at 0 would say "India
reported zero", the one reading this beat exists to refuse) and its callout reads
`India — filed nothing for this year. Not zero: no return.`

### P6 — nothing in this toolchain proposes a class break

`grep -rl "jenks\|quantileBreaks\|proposeBreaks\|naturalBreaks\|chooseBreaks\|classIntervals"` over
the whole tree: **nothing**. `binIndexLowerInclusive` consumes breaks; no function produces them.

What the documented path handed me was `CO2_BREAKS = [2, 4, 6, 8, 10]` under a docstring reading
*"the same six-class split … for the same quantity (CO₂ per capita)"* — tonnes of CO₂ per person,
inherited by a register of human deaths. Nothing would have refused it. A count-of-people register
is the ordinary case for this cell and its distribution is always this skewed:

```
min 0   q25 0   median 1   q75 12   q90 56   max 641
```

I chose `[1, 5, 25, 100, 250]` by hand from that distribution — 44 / 23 / 16 / 9 / 5 / 3, and class 1
is exactly the countries that reported zero, which is worth having. But the toolchain's default for
a fresh beat is *the previous beat's breaks, in the previous beat's unit*, silently.

### P7 — the reader-facing name came from the csv, and half this beat's shapes have no csv row

`displayName` threw `the csv names no entity for AGO`. 94 of 194 shapes are countries that filed
nothing, so they have no row. A reader hovers those too — they are the argument. Fixed in the beat by
freezing WHO's own `DIMENSION/COUNTRY` table beside the data and reading every name from it, with a
cross-check that refuses two spellings for one code.

### P8 — the page is 1.39× the format's own ceiling and nothing refused it

3 626 085 bytes against `CEILING_BYTES = 2 605 355`. `weightAgainstCeiling` exists and
`skills/map-web/test/weight-ceiling.test.ts` reddens after the fact, but no producer calls it: the
render printed the pointer census and the wrap verdict and said nothing about weight. 869 KB is the
inlined maplibre-gl, 1 740 KB is this beat's 194 shapes in lon/lat for the live layer.

---

## Phase `delivery`

### D1 — a successful map × web delivery cannot be committed, and either way one guard is red

`materialise({form: "owned-file"})` substitutes the real MapTiler key into
`export/<id>/<page>.html`, which is inside the repository.

- **With the delivered file as delivered:** `skills/splash/test/no-key-in-the-repository.test.ts`
  goes red, naming it — 2 failures. (Its own header says it scans tracked files only; the file was
  untracked and it found it anyway, so the header and the code disagree, but the red is correct.)
- **With the placeholder put back by hand** (what I did — the keyed copy is kept outside the tree):
  `skills/map-web/test/the-handover-agrees-about-the-key.test.ts` goes red on that same file,
  because the hand-over says the page carries a key and the in-repo copy does not.

Both measured. There is no third state. The previous map × web story escaped only because no key was
recorded on that run, so its hand-over says *"No MapTiler key was recorded"* and its export is
placeholder-free by accident rather than by design. What is missing is a delivery that writes the
newsroom's keyed file somewhere that is not the repository, or an export that is committed with the
placeholder by design and a hand-over that says so.

### D2 — the delivery manifest does not bind the export's own bytes

I replaced `export/…/reported-rabies-deaths-2024.html` with a different file (placeholder instead of
key) and `whereIs` still answered `delivery` with no `stale-delivery`, then `done`. `draftDigest`
binds the BEAT's `renders/`, which is unchanged; nothing checks that the bytes in `export/` are the
bytes `materialise` wrote. Convenient for me here; it is also the hole the `stale-delivery` check was
built to close, one directory along.

### D3 — the hosted embed is honestly closed, and the two accounts of it agree

`preflight` said `hostedEmbed: {available: false, reason: "Cloudflare answered 403"}` and
`offerForms` offered the `embed` row disabled with the same sentence. Round four's finding 10 — one
credential, two accounts of it — stays closed. Recording the pass, not only the failures.

---

## Tests outside my ownership that my beat reddens

`bun test skills/map-web/test` → **11 fail, 336 pass**. Eight are population ratchets whose own
comments say the next beat is expected to redden them (`12` → `14`, or my two files added to a named
list): `the-value-table-is-collapsed` ×2, `keyboard-reach`, `weight-ceiling`'s file count,
`the-live-layer-is-in-the-artifact`, `accessible-table`, `degrades-without-javascript`,
`same-facts-without-the-picture`. Bumping them means editing `skills/**`, which this round forbids,
so they are reported rather than fixed.

Three are real and are P1, P8 and D1 above: `frame-fills-window` ×2, the derived weight ceiling
(`measuredMax` 2 154 925 → 3 626 085), and `the-handover-agrees-about-the-key`.

`bun test skills/doctrine/test` → **106 pass, 0 fail.**

`bun test skills/splash/test` → 3 fail. One was mine and is fixed
(`csv-hand-split` caught a `split(",")` in my own runner — correctly; the render is byte-identical
after the fix). The other two, `render-output-lands-in-its-own-beat` ×2, name only
`proof/mapgen-*/render-web.mjs`, which my commits never touch, and read regex literals (`"/>"`,
`"/g, "`) as absolute paths. They arrived with the wrap work landing in those five files and belong
to whoever is holding that.
