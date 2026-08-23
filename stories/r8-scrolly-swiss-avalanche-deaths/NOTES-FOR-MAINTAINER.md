# Notes for the maintainer — round eight, the `scrolly` format

One real story, run end to end: SLF's fatal-avalanche register (EnviDat, doi:10.16904/envidat.412,
downloaded 2026-08-23, not cleaned) through intake → storyboard → palette → production →
verification → delivery. Nothing under `skills/` was edited. Every entry names the phase, what was
run, what came back, what was expected, and what it cost.

---

## 1 — INTAKE. `freezeSource` reads a publisher's banner line as the header and reports success

**Ran:** `freezeSource({ storyDir, articlePath, dataPath })` on the download, unmodified.

**Came back:** `source/profile.json` — `rowCount: 1409`, ONE column named
`"WSL Institute for Snow and Avalanche Research SLF"`, `type: "text"`, `missing: 0`,
`distinct: 1409`, `duplicates: { count: 0 }`, `panel: null`. No warning, no refusal, exit 0.

**Expected:** either the 21 columns the file has, or a refusal naming what it could not parse.

The publisher ships three banner lines above the header row — the institute's name, the dataset
title, an update timestamp — which is one of the shapes `round8.md` names as expected mess
("a header on line 4"). `parseCsv` takes line 1 as the header unconditionally; `profileTable` has
no check that would notice a one-column table, a `distinct` equal to `rowCount`, or a header cell
containing spaces and no delimiter.

**What it cost:** the profile is a false confirmation, and it propagates (see 2). The beat's own
reading layer finds the header by the one column name the schema guarantees
(`headerIndex`, `avalanche-data.ts`); the frozen CSV and the wrong profile are both kept as the
measurement. `freezeSource` also refuses a second call, so a story cannot re-freeze after noticing.

**CLOSED 2026-08-23.** `intake/scripts/header.mjs` reads the header instead of assuming it: the
header is the first row as wide as the table itself, everything above it is a publisher's banner
kept verbatim in the record, and a file whose rows agree on no width is REFUSED rather than handed
one. `source/profile.json` has been re-derived from the SAME untouched bytes — 21 columns, 1,406
rows — and carries `header.says`: *"this file's header is on line 4; the 3 lines above it are a
publisher's banner and are not data"*. The publisher's `data.csv` was not edited and this beat's own
reader is unchanged. `freezeSource`'s refusal of a second call still stands, and it is no longer the
reason a story is stuck with a false record: re-deriving the PROFILE is not a re-freeze, because the
profile is intake's own statement about the bytes and never the bytes.

## 2 — STORYBOARD/G1. The grounding gate cannot tell a broken profile from a profile with no numbers

**Ran:** `groundTakeaway(takeaway, profile, { csv })` against the frozen profile, then again against
a correctly parsed one, on the same takeaway.

**Came back:**

| profile | verdict | detail |
| --- | --- | --- |
| the frozen (broken) one | `unverifiable` ×4 | `"profile has no numeric column with a range to check against"` |
| correctly parsed | `unverifiable` ×4 | `"\"247\" was not placed: this profile carries 8 measures (…) and the claim names none of them"` |

The second message is a good one — the takeaway's figures are sums over subsets of rows and the
profiler holds column ranges, so it genuinely cannot decide. The first is indistinguishable from
"your data has no numbers in it", when what actually happened is that the whole table was profiled
as one text column. `unverifiable` is not a gate error, so Gate 2 closes either way.

**Cost:** a journalist who trusted G1 would have had no signal at all that intake had failed.

## 3 — STORYBOARD/③. `attributionsIn` finds 0 of 4 attributions and `proposeCredit` states that as fact

**Ran:** `proposeCredit({ newsroom, article })` on an article whose body carries two full academic
citations, two DOIs and a dataset title with its publisher.

**Came back:** `attributions: []`, one option (`unattributed`), recommended, with the reason
`"The article names no source — nothing in it attributes these figures to anyone"`.

**Expected:** either the article's own citation, or "I could not find one".

`ATTRIBUTION_CUES` holds cue phrases (`according to`, `published by`, `data from`, `Source:` …) and
`MARKED_SOURCE_LINE` needs a label opening with `sources?|credits?|attribution|crédits?|πηγή|المصدر`.
A **bare bibliographic citation** — `"Title", Publisher, EnviDat, doi:10.16904/envidat.412` — matches
neither, and it is the most common way a real article credits a dataset. So does a bare URL, and so
does `Terms of use: …`. Recurring shape 3 in `CONSTRAINTS.md`: a missing lexicon producing a false
confirmation rather than a refusal, and the reason sentence asserts something untrue.

**Cost:** the journalist has to reject the recommendation and use the escape hatch. Cheap here
because a human was reading; the risk is a run with nobody watching, which the function's own header
already warns about for a different field.

**Suggested:** a DOI (`\bdoi:\s*10\.\d{4,9}/\S+`) and a bare URL are attributions; and when the
lexicon finds nothing, say "no cue this reader knows" rather than "the article names no source".

## 4 — STORYBOARD/⑥. `formatsFor` and `formatPublicationFormatGate` do not fit together

**Ran:** `formatPublicationFormatGate({ recommended: "scrolly", rationale, options: formatsFor("map") })`
— the two functions `storyboard/SKILL.md` names one after the other for this gate.

**Came back:** `Error: recommended publication format scrolly is not reachable`.

**Expected:** either the gate turn, or "options must be rows, not format names".

`formatsFor` returns `["static","web","video","scrolly"]`; the gate reads `option.format` and
`option.reachable` off each entry, so every string becomes `{format: undefined, reachable: undefined}`
and the recommendation is reported UNREACHABLE — an editorial verdict — for a shape error. The
working call is `proposeFormats({ medium, capabilities })`. Recurring shape 3 again, one level down.

## 5 — PRODUCTION. `skills/scrolly/scripts/bake-plate.mjs` cannot bake any beat but its own

Measured 2026-08-23. Four independent blockers, none with a flag:

1. the camera centre comes from `readStation`, which parses a **USGS site file** and requires
   `site_no`, `station_nm`, `dec_lat_va`, `dec_long_va`, `drain_area_va`;
2. output filenames are the literals `potomac-plate.jpg` / `potomac-plate.json` whatever `--out`
   says, so two beats baking into one directory overwrite each other;
3. `CAMERA.zoom` is a module constant (9) with no flag, and the file carries an
   `@parity-exempt` note saying it deliberately has no bounds path — a country is a bounds;
4. `CAMERA.style` is the literal `"dataviz-light"`, with no flag.

(4) is the one this story could not work around. `NEWSROOM.md` records `ground: #16191B`;
`plateFollowsGround` (`splash/scripts/preflight.mjs`) refuses a light plate under a dark ground, and
`verify-scrolly.mjs` measures the same pairing on the delivered page. **The skill's own bake cannot
produce a plate this story's own guards would accept.**

Swept across the tree: **three skills hard-code `dataviz-light`** (`scrolly`, `map-beat`, `map-web`)
and **none derives it**; **five beat directories** carry their own fix, two of them deriving the
style from the recorded ground by luminance
(`stress-f-housing-pressure`, `real-owid-life-expectancy`) and three typing the dark style directly.
This beat is the sixth copy. `stress-ac-alcanede-kilns` reported (1)–(2) in round seven; (3) and (4)
are new. The four lines that would close it:

```js
const DARK_SIDE = 0.25;                       // plateFollowsGround's own boundary
const style = flag("--style", luminanceOf(ground) <= DARK_SIDE ? "dataviz-dark" : "dataviz-light");
```

## 6 — VERIFICATION. `verifyBeatFiles` runs `csvSplitByHand` on raw source; `handSplitCsvReaders` strips comments first

`csvSplitByHand` is a registered byte-identical COPY in `intake/scripts/verify-frozen-csv.mjs` and
`scrolly/scripts/verify-scrolly.mjs`. The CALLERS are not:

```js
// intake/scripts/verify-frozen-csv.mjs — handSplitCsvReaders
csvSplitByHand(readFileSync(path, "utf8").replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, " "))
// scrolly/scripts/verify-scrolly.mjs:1235 — verifyBeatFiles
csvSplitByHand(readFileSync(path, "utf8"))
```

So the same decision on the same file gives two verdicts. This beat's reading layer was FAILED for a
comma split that appears **inside a comment warning against it**, while its actual row parser is the
quote-aware one the guard exists to ask for.

Measured over `stories/`, `proof/` and `skills/`: **10 files trip the raw form; 2 genuinely cut rows;
8 trip only on their own prose** — including `skills/scrolly/scripts/verify-scrolly.mjs` itself,
which fails its own rule. `guard-copies-parity` compares the copied FUNCTION's bytes, so it cannot
see that the pre-processing — which is half the decision here — diverged.

**Cost:** the fix the guard forces is cosmetic and it deletes the warning that documents the hazard.

## 7 — VERIFICATION. `scroll-integrity.test.ts` walks `proof/` only, never `stories/`

`skills/scrolly/SKILL.md` says the test "walks `verify-scrolly.mjs` over the seed and **every scrolly
on disk** at three widths". `scroll-integrity.test.ts:213` is `const PROOF = join(SKILL, "..", "..", "proof")`
and nothing else is read. Measured: **9 rendered scrollys under `proof/` are walked; 5 beats under
`stories/` import `renderScrolly` and are walked by nothing.** A journalist's own delivered beat is
outside the population the format polices — which is the population that actually ships.
Running `verify-scrolly.mjs` by hand is the only cover, and this beat did.

## 8 — VERIFICATION. The no-JS assertion certifies a page where 3 of 4 steps are captioned wrong

`verifyStates` asserts, with JavaScript disabled: exactly one `.step-frame.active`, no
`scrolly--live` baked in, every `.step-panel` non-empty, and `.scrolly-steps` scrollable. All four
pass here. Driven with JS off and measured:

```
activeFrames: ["where"]
visibleFrames: [{where,1},{two-terrains,0},{crossover,0},{forecast,0}]
words per panel: [29, 29, 23, 36]     scrollDistance: 3755
```

The reader scrolls through all four cards over the **map**, so step 2's definition, step 3's
crossover and step 4's forecast are each read against a picture belonging to step 1. The guard asks
about COUNTS (one active frame, prose present) and never about CORRESPONDENCE, so a page in which
75% of the steps show the wrong graphic reads as a pass. Screenshot in this round's scratch output.

This is the scaffold's own behaviour — `renderScrolly` bakes exactly one `active` and only the
inlined script moves it — so no beat can fix it from outside `skills/`.

## 9 — PALETTE. Two accents are measured against the ground and never against each other

`PALETTE.md` records `#D4A853` (8.01:1 against ground) and `#5B8A8A` (4.58:1). Against **each other**
they are **1.75:1** — below the 3:1 non-text floor, on the one frame where two series cross 88 times.
`proposePalette`'s `formatProposal` prints both ground measurements and nothing pairwise.

`readApart(a, b)` exists and returns `true` here — it passes on hue distance alone (221) with the
contrast at 1.75 — but it lives in `render-still.mjs`, is used only to pick further inks from a ramp,
and **`skills/scrolly/scripts/render-still.mjs` does not carry it at all** (4 of 8 producing skills do).
Nothing on the scrolly path asks the question.

Worked around in the beat: solid against dashed, plus a direct label per series. A colour-blind
reader gets the line style; the palette gate gave no reason to add it.

## 10 — PALETTE/TYPE. `scrolly` reads no `TYPEFACE.md`, as its own SKILL.md admits

`proposeTypeface` + `writeTypeface` ran, measured `Space Grotesk` on this machine (absent),
declined `Courier New` for chart digits, and recorded the substrate stack with `origin: default`.
`render-scrolly.mjs:263` writes `Helvetica, Arial, sans-serif` into the delivered CSS as a constant
and `scrolly/scripts/render-still.mjs` holds `FONT_FAMILY` as a `const` with no `useTypeface`.
The gap is named in the beat's `BRIEF.md` and in the delivered `HANDOVER.md`, which is what the
skill asks for — recording it, not closing it.

## 11 — DELIVERY. An unavailable form's reason interpolates `undefined`

`offerForms` returned, for `embed`:

> "Cloudflare hosted delivery is configured, and the check Splash ran against it was refused:
> **undefined**. The credentials are present, so this is the account or the token's permissions
> rather than a missing setting."

The sentence is built to carry the refusal and the refusal is missing. A journalist is told a
credential failed and not what said so.

## 12 — SPLASH. `runPreflight({ root })` throws a TypeError from two files down

`splash/SKILL.md` names it as `runPreflight({root, env, fetchFn})`, but `env` has no default and no
check, so the documented-shorthand call dies at `keys.mjs:107` with
`TypeError: undefined is not an object (evaluating 'env[canonical]')`. One line — `env = process.env`,
or a named refusal — and the first command a journalist runs stops looking broken.

---

## What this beat had to work around, and did not

Nothing was worked around at a gate. The one gate that refused this run was
**G2-subjects** (`whereIs` held the story in `storyboard` until `SUBJECTS.md` existed), and it was
right: movement ⑩ had been skipped. It cost one call to `recordSurveyedSubjects` and produced five
real angles the article carries and this beat does not draw.

## What the data itself did, that no phase asked about

- **Three spellings of one municipality** — `"\tPontresina"`, `Pontresina`,
  `Pontresina/Puntraschigna`. The tab is a whitespace bug; the bilingual name is not, and merging it
  would be an editorial decision nothing recorded. Trimmed and recorded respectively.
- **Two spellings of one canton** — `GL` (25 rows) and `Gl` (1). Found because `cantonName` refuses
  a code it does not hold instead of printing it.
- **`LI` is not a Swiss canton.** Liechtenstein: 5 accidents, 6 deaths, inside a file the publisher
  titles "Fatal avalanche accidents in Switzerland". The register follows the SLF's forecast region,
  which covers the principality; the file never says so. Same refusal found it.
- **The publisher's two files disagree.** The per-year count file (doi:10.16904/14) differs from the
  accident register in **5 of the 85 winters both cover**, by one or two deaths. The beat counts from
  the register and its source line says so.
- **One column is entirely empty** (`forecasted.dangerlevel.rating2.subdivision`, 1,406 blanks) and
  `activity` is multi-valued, so 12 of 2,146 deaths cannot be put on one side of the split.
