---
name: intake
description: Use to freeze a journalist's article and data into a story's source/ folder and silently profile the data — the INTAKE phase of the doctrine twin, asking nothing and never revisited.
---

# intake — freeze the source, profile the data

## Overview

Turns the article and CSV a journalist brought into a **frozen, immutable record**: `source/article.md`, `source/data.csv`, `source/profile.json`. This phase is **silent** — it asks the journalist nothing. It reads, it parses, it types the columns, it writes. Once frozen, the source is never modified again; a second freeze attempt is refused, so the record of what was actually analysed can never drift out from under the rest of the pipeline.

## When to use

- At the start of a story, right after the story workspace exists (a `stories/<slug>/` directory with the `source/` subdirectory for intake to write into), before any framing or design work.
- When you need a reliable `{type, min, max, missing, distinct}` per column to reason about later — never call a downstream phase against a CSV that hasn't been through here first.
- **Not** for re-profiling after the journalist edits their data — that requires a fresh story (frozen means frozen).

## The one gotcha that will waste your day (read first)

**`Number(v)` lies.** `Number("0x10")` is `16`, `Number(" 12 ")` is `12`, `Number("")` is `0`. A naive numeric-type check built on raw `Number()` will silently type a hex product code or postal code as a number, and can drag a column's min/max toward zero from blank cells. `profile.mjs` guards this with a strict decimal-literal regex (`NUMERIC_RE`) run *before* `Number()` is trusted, and blank values are trimmed and set aside as `missing` before typing ever sees them. If you touch `typeOf`, keep that ordering — regex first, `Number()` second, never `Number()` alone.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Reader | `scripts/csv.mjs` | `parseCsv(text)` — a real RFC 4180 reader: quoted fields, embedded commas/newlines, doubled quotes, CRLF **and** lone-CR line endings |
| Profiler | `scripts/profile.mjs` | `profileTable(rows, {prose})` — types each column (`number`/`date`/`text`), counts missing/distinct, ranges numeric columns and totals them (`min`, `max`, `sum`), describes the table's own SHAPE (`panel`, with its entity, its period, its per-period coverage and which rows are aggregates of the others), carries a stated incompleteness off the frozen prose (`statedIncompleteness`), and names what it will not decide for the journalist: `reason`, `gaps`, `mixedUnits`, `denominator`, `denominatorUnread`, `denominatorNotInThisTable`, `percentAboveHundred`, `sumWithheld`, `gapsAreNotCoverage` |
| Orchestrator | `scripts/freeze.mjs` | `freezeSource({storyDir, articlePath, dataPath})` — reads both source files once, profiles the data **with the article's own prose in hand**, writes the three frozen artifacts, refuses a second call |

## How it works (the shape)

1. **Parse** the CSV with a real state machine (quoted/unquoted, not a `.split(",")`) — `parseCsv` in `csv.mjs`.
2. **Profile** the parsed rows: each column gets a strict-numeric-literal type check, a missing count (blank cells counted, never dropped), a distinct count, and — for numeric columns only — a `min`, a `max` and, except on a period column, a `sum`, in `profileTable` in `profile.mjs`. The `sum` is there for one named downstream reader: `storyboard`'s grounding check, which cannot otherwise place a part-to-whole total, because a total is by construction outside the range of the column it sums.
2a. **Describe the table's own shape.** Almost all open data is a PANEL — one row per entity per
period — and until this was added the profile described one as a flat table. `panel` names the
entity column, the period column, how many of each, whether the panel is balanced, how many entities
each period carries, and which rows are aggregates of the other rows. See "The panel" below.
2b. **Report what only the journalist can settle.** A column carries `reason` when it looked numeric and was refused, `gaps` when a sequence's own grain skips a step, `mixedUnits` when a sibling `unit` column says the range is not one measure, `denominator` when a population-shaped column sits in the same table, `denominatorUnread` when a sibling numeric column is NAMED IN A LANGUAGE THIS PROFILER DOES NOT READ, `percentAboveHundred` when a column whose own values carry `%` holds a share above 100, `sumWithheld` when a total was refused because the column is a period, `gapsAreNotCoverage` when a full range is not full coverage, and `denominatorNotInThisTable` when a panel's denominator can only be in another file — see below. None of them repairs anything.
2c. **Carry a stated incompleteness off the prose.** `statedIncompleteness` — see "What this
profiler cannot decide" below.
3. **Freeze**: `freezeSource` checks `source/article.md` doesn't already exist (refuses with `"already frozen"` if it does), then reads the article and CSV, runs the profiler, and writes all three files into `source/`. A read failure (missing file, permission denied, no `source/` directory to write into) surfaces its real error — it is never mislabelled as "already frozen" and never swallowed.

## A count is not a rate, and this profiler never divides

`stress-q-safety-incidents` ranks five districts by `incidents` with `residents` in the very next
column. Centro has the highest raw count (412) but only the second-highest rate (205 per 100,000);
Sul, third on the raw count, is the highest per resident (233). The article's headline is true one
way and false the other, and until round four nothing in this toolchain — profiler, grounding,
producer — ever asked the question. Four of the twenty-one frozen stories carry an explicit
denominator (`residents`, `population`, `households`, `μαθητές_2026`).

So a numeric column that is neither a sequence (a year is an x axis, not a count) nor
denominator-shaped itself now carries:

```js
{ name: "incidents", type: "number", min: 96, max: 412, sum: 1372, denominator: { column: "residents" } }
```

**It is a report, not a repair, and the distinction is load-bearing.**
`stress-a-energy-bills` carries `households` beside `price_eur`, and its shipped beat draws
`price_eur` RAW — correctly, because a household energy bill is already a per-household figure.
A profiler that divided there would invent a number nobody claimed. So this names the column and
stops; `storyboard`'s grounding check puts the question to the journalist, with both rankings in
front of them, and the journalist decides.

A candidate is found by a column's own NAME (`DENOMINATOR_NAME_TOKENS`), never by two columns'
shapes — the same identity test `UNIT_COLUMN_NAME_RE` and `isSequenceColumn` already use, and for
the same reason: "the bigger number is the denominator" would name `network_km` against
`trips_millions`. Where several candidates sit in one table, every one of them is named.

### A denominator this profiler cannot NAME is reported too

Round six, finding C2. That token list reads four languages, and until this round a NO from it was
reported as nothing at all — the same empty answer a table with no denominator in it gets.
`stress-ad-polish-hospital-beds` carries `ludność` (population) one column from `łóżka_szpitalne`;
the article's own second paragraph raises the per-capita reading, and this profile said nothing.

Adding Polish would close that table and leave the next one exactly as silent, so what is closed is
the SHAPE: **a lexicon's negative is reported with its own reach when the names it rejected were
names it could not read.** The four declared languages (`LEXICON_LANGUAGES`, copied byte for byte
from `storyboard/scripts/ground-claim.mjs` along with both coverage nets) are written with a known
repertoire of scripts and letters, so a column name using anything outside it — Polish `ś`, Czech
`ř`, Turkish `ğ` — is a name this profiler cannot read:

```js
{ name: "łóżka_szpitalne", type: "number", min: 7900, max: 21400, sum: 100800,
  denominatorUnread: { reads: "English, French, Greek and Arabic",
                       columns: ["ludność"], charactersNotRead: ["ś", "ć"] } }
```

It is a second field, not a wider `denominator`, and the distinction is the same one this whole
section is about: `denominator` names a column this profiler READ and recognised, `denominatorUnread`
names one it could not read at all. A reader that cannot tell them apart has been handed a guess.
Identity, never shape, is unchanged — nothing here claims an unread column IS a denominator.

### The ASCII half is closed by data, not by a stated limit

Round six, task LANG. `bevolking` is Dutch for population and is plain ASCII, so no script net and
no letter net can ever see it — and until this round the profiler answered a confident nothing about
it while `population`, one column over in another language, downgraded the verdict. A concept has
names in every language, so the list is now MEASURED rather than remembered:
`doctrine/references/concept-labels.json` holds Wikidata's own labels and aliases for `human
population`, `inhabitant`, `household`, `student` and `schoolchild`, filtered to the tokens no
character test in this tree can flag, and copied into the generated region of
`DENOMINATOR_NAME_TOKENS` in all ten files that read a column name. CLDR was measured first and
carries one of the twelve concepts these lexicons key on, so it is not the source.

**Vendored, never fetched.** `scripts/concept-labels.mjs --write` copies the table into the files; a
lexicon that needs a network is a lexicon that fails in a newsroom without one, and nothing under
`skills/` names Wikidata at all.

**The limit that remains, said out loud:** the table declares 39 languages — the EU's own official
languages plus the European and Mediterranean neighbours — and a language outside that reach spelling
itself in plain ASCII (Indonesian `penduduk`, Swahili `wakazi`) still passes both nets.
`storyboard`'s grounding check is where that limit is stated to the journalist, on the verdict it
would otherwise inflate. `ludność` is deliberately NOT in the table: `lettersNotRead` already names
it, and a gap is reported once between the two mechanisms, never twice.

## A unit is a mark, not a word glued to an identifier

`stress-y-rural-broadband`'s first column holds `Commune-001` … `Commune-186`. Until round five
this profiler typed it `number`, with `unit: "Commune"`, `min: -186`, `sum: -17391` — it read the
alphabetic prefix as a unit and the hyphen as a minus sign — and three downstream readers then
believed it: `storyboard`'s `measureColumns` offered it as the column a superlative is about,
`numeric-pair` and `multiple-series` counted it, and `denominator` attached `households` to it, so
the toolchain stood ready to reason about place names per household. `COVID-19` reads as `-19` the
same way, and so does every case id, product code and ISO designation shaped `<letters>-<digits>`.

The rule was decided with the corpus in front of it — all 114 CSVs frozen in this tree:

| Form | What the corpus actually held | What is accepted now |
| --- | --- | --- |
| **Before** the number | 12 distinct tokens: `Commune`, `OWID_EU`, `Q`, `ci`, `ew`, `hv`, `nc`, `nn`, `pr`, `uu`, `March`, `term`. **Not one is a measure** — every one is an identifier or a month | a currency symbol only (Unicode `Sc`: `$`, `€`, `£`, `¥`, …). Never letters |
| **After** the number | `%` (two stories), `+` (`80+`, an age band's open top), `(Jan-Mar)` (a parenthesised aside on a year) | at most eight characters of letters, currency symbols and measure marks (`%`, `‰`, `°`, `²`, `³`, `·`, `/`) — no hyphen, no bracket, never a bare sign |

A Unicode category rather than a list of currencies, so the leading form is not one more lexicon
written against the language its first story happened to be in. `"12 %"`, `" 12 % "`, `"9 kg"` and
`"1,234.5"` all read exactly as before; `"0x1F"` is still text.

## A percentage above 100 is reported, and only when the data says "percentage"

`stress-f-housing-pressure` holds `143 %`. A share above 100 is either an error or a figure that
was never a share (an index, an occupancy, a change), so the profile names the values and stops —
nothing is clamped, dropped or re-scaled:

```js
{ name: "pressure", type: "number", unit: "%", min: 1, max: 143, percentAboveHundred: { count: 1, values: [143] } }
```

**What this profiler cannot know, stated rather than guessed.** A column is a percentage when its
own VALUES say so — the uniform trailing `%` above — and never when only its NAME says so.
`stress-y`'s `broadband_pct` carries `104.2`; the name says percent and the article calls it a
percentage, but the data says nothing, and that column is refused as text anyway (its `%` is on
some values only). Reading a unit off a column name would be the same guess `UNIT_COLUMN_NAME_RE`
and `DENOMINATOR_NAME_TOKENS` both refuse to make about a sibling column, so `broadband_pct` gets
no report here. A journalist who wants that value checked has to say the column is a percentage;
the profiler will not decide it for them.

## The panel — one row per entity per period

Three real stories were run end to end against Our World in Data panels — 3 900, 7 585 and 21 565
rows of `entity, code, year, value` — and every one of them was profiled as a flat table of four
columns. The profile is what every later phase reasons from, so a shape it cannot describe is a
shape the whole chain is blind to. What went wrong, measured:

- `rowCount: 3900` was read as a count of subjects. It is 260 entities over 15 periods.
- NINE of those 260 "entities" are AGGREGATES of the other rows — `World`, six continents,
  `European Union (27)`, `Europe (excl. Russia)`. The article's own question was *"where the count
  is heaviest"*; taken off the file it answers **the World**, then **Africa**, then a country.
- `year.gaps: []` over `[1900, 2025]` reads as full coverage and is not: the Ember file carries 245
  entities in 2022 and 114 in 2025.
- `duplicates: 0` is TRUE (no repeated row) and reads as an answer to a question about repeated
  subjects that it never asked — there are 260 rows per year.
- `year.sum: 7874100` was the largest-looking number in the profile. It is the total of a calendar.

```js
panel: {
  entity: "entity", period: "year", entities: 260, periods: 15,
  rowsPerPeriod: { min: 260, max: 260 }, balanced: true,
  says: "one row per entity per period: … rowCount (3900) counts readings, never subjects …",
  decidedBy: 'every ("entity", "year") pair is unique across all 3900 rows, and "entity" holds no blank',
  coverage: { byPeriod: [{ period: 2012, entities: 260 }, …], fullest: {…}, thinnest: {…}, says: "…" },
  aggregates: { … see below … },
}
```

**ONE DECISION, NOT TWO.** The shape itself is `panelShapeOf`, `storyboard`'s own function, copied
here **byte for byte** and walked by `COPIES` in `splash/test/guard-copies-parity.test.ts`. Both
skills have to answer "is this a panel, and which column names its subject" about the same frozen
file — the profiler to describe it, the grounding check before it reads a value out of it — and a
profiler that says panel while the check that decides a gate says flat table is worse than neither
saying it. Its dependency `findYearColumn` is copied byte-identically beside it; it is not yet
walked, because that test anchors on a doc comment the storyboard copy does not carry.

**The key is checked, never named.** A table is a panel when one period value carries more than one
row, and the column that keys those rows apart is the text column whose value is unique WITHIN every
period. A key column with a BLANK in it loses: `code` also keys the wildfire table (the one entity
with no code has exactly one row per year, so `(code, year)` is unique across all 3 900 rows) and it
identifies nothing for that row, so the never-blank column wins, then the one with more distinct
values, then the leftmost.

**Where the shared derivation and this profiler's own typing part, the profile says so.**
`panelShapeOf` finds the period column by NAME (`findYearColumn`, no test of the values);
`isSequenceColumn` finds it by the column's own VALUES and publishes the answer as `gaps`. Measured
across the 36 frozen tables they part once: `stress-t-europe-recycling`'s `survey_date` holds
`2025-03-01`, `01/03/2025` and `March 2025`, is named the period by the first and refused by the
second. Where that happens the panel carries `periodNotASequence` rather than a period this
profiler's own typing will not stand behind — and `gapsAreNotCoverage` is not written at all, because
a column with no gaps has no full range to mistake for full coverage. **The fix belongs in the one
decision, in both copies: prefer a column the table's own values make a sequence, and fall back to
the name.**

**A period column carries no total.** `sum` is `null` on any column `isSequenceColumn` recognised as
a sequence, and `sumWithheld` says why, so the refusal does not read like a text column's empty
total.

**A full range is not full coverage.** `coverage.byPeriod` counts the entities each period carries,
and where that count is not flat the PERIOD COLUMN itself carries `gapsAreNotCoverage` — because
`gaps: []` is where a reader looks. A producer reaching for "the latest year", the obvious move,
silently drops more than half the world on the Ember file, and until this nothing said a word.

### Which rows are aggregates of the other rows

```js
aggregates: {
  says: "an aggregate here is a row of this table that is the SUM of other rows of the same table …",
  byArithmetic: [
    { entity: "World", decidedBy: "arithmetic", column: "events", periods: 15,
      members: ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"],
      alsoSummedBy: 251, detail: "two sets of this table's own rows that share no row add up to …" },
    { entity: "Africa", decidedBy: "arithmetic", memberOf: "World", detail: "one of 6 rows that …" },
    …
  ],
  byStructure: [ { entity: "European Union (27)", proposedBy: "code-shape", code: "OWID_EU27" },
                 { entity: "Europe (excl. Russia)", proposedBy: "code-missing", code: null }, … ],
  arithmetic: { ran: true, over: 'the 12 rows the "code" column\'s own shape sets apart',
                column: "events", nodes: 246, exhausted: false, measuresTried: ["events"] },
  structure: { column: "code", shape: "AAA", entitiesWithThatShape: 248, entitiesCoded: 259 },
}
```

**There is no list of aggregate names in this file, deliberately.** A hand-typed "World, Africa,
Asia…" is the shape this repository has been burned by, and it would leave `ASEAN (Ember)`,
`Less developed regions, excluding China` and `Europe (excl. Russia)` invisible. Two tests answer
instead, and every row says which one answered it.

**The arithmetic decides.** For each candidate row, the profiler looks for a set of OTHER rows whose
values add up to it in EVERY period it appears in. One period proves nothing — with 260 numbers some
subset adds up to almost anything — and the same set holding across fifteen periods is not a
coincidence. Two searches run per candidate: over the proposed rows alone (for `World` this returns
the six continents), and with every row the structure did NOT propose taken as one block (for
`World` this returns those 248 rows plus Kosovo, Northern Cyprus and Akrotiri and Dhekelia — the 251
real places). When both exist and share no row, two disjoint sets of this table's own rows add up to
the same total in every period; the small set therefore stands in for the large one, which is what
makes its MEMBERS aggregates too. That is how the six continents are decided, and it is an argument
from the numbers, not from the names.

**The structure proposes and the arithmetic decides, in that order.** A row nothing set apart is
never put to the arithmetic at all, and the reason is a measurement:
`heat-pump-adoption-across-europe` holds ten countries over five years, and Poland plus the United
Kingdom add up to the Netherlands EXACTLY in all five — 5+3, 7+4, 10+5, 13+7, 17+9. Three
independent percentages. Five periods over nine other rows is not enough repetition to rule a
coincidence out; the wildfire file's fifteen over eleven is, and the rows the code column sets apart
are the ones worth spending it on. The limit that leaves, said rather than hidden: **an aggregate
whose code is shaped like every other row's is not reached here at all.**

Its declared limits, each of them observable in the output rather than written here only:

- **Non-negative columns only.** The pruning that makes the search finish is only valid while
  nothing can bring a partial sum back down; a signed column is a different question this does not
  put. `measuresTried` names the columns it looked at.
- **A witness of one row is refused.** "A equals B in every period" is two identical series, which
  is worth knowing and is not a sum.
- **A share does not sum.** On the Ember percentage column no witness exists and none is invented:
  `byArithmetic` is empty and the 32 aggregates are still named, by structure.
- **A table carrying one period is not searched.** With nine numbers and a single period some
  subset adds up to almost any of them: `stress-b-piped-water` returned three countries as
  aggregates of each other before `AGGREGATE_MIN_PERIODS` existed.
- **The search is bounded** — `AGGREGATE_SEARCH_NODE_BUDGET`. Exhausting it sets `exhausted: true`,
  because "found none" and "stopped looking" are two different answers.
- **A table with no structural proposal and more than `AGGREGATE_SEARCH_ENTITY_CEILING` entities is
  not searched at all**, and `arithmetic.ran` is `false` with the reason. A search that quietly
  answered "no aggregates" about a table it never looked at would be worse than no search.

**The structure proposes, and over-reaches by construction.** A published panel carries a code
column beside its entity column, one code per entity, and the aggregates in it are the rows the
publisher could not give a country code to. The code column is found by its RELATION to the entity
column — one value per entity, blanks allowed, and **injective**: a code NAMES EACH SUBJECT ONCE, and
that is what tells it apart from a CATEGORY column that also holds one value per entity.
`stress-aa-salary-spread`'s `department` is five values over 240 employees with a majority shape
covering about 60% of them, and without injectivity it proposed 96 employees as aggregate candidates
on a salary table. Never by being named "code", the same
identity-not-shape test `UNIT_COLUMN_NAME_RE` and `DENOMINATOR_NAME_TOKENS` make for their own
questions. Values are then reduced to a SHAPE (letters to `A`/`a`, digits to `9`: `AFG` is `AAA`,
`OWID_WRL` is `AAAA_AAA`) and a row whose shape is not the majority shape, or whose code is missing,
is **proposed**. The same test sweeps in Kosovo, Northern Cyprus and Akrotiri and Dhekelia, which are
places and not sums — which is exactly why `byStructure` is reported apart from `byArithmetic` and
never called a decision. Where the code column carries no majority shape, `structure.answered` is
`false` with a reason.

## What this profiler cannot decide, said where the journalist reads it

Two limits here cannot be removed by a profiler. The fix is that the tool SAYS SO.

### A stated incompleteness is prose, and the guard downstream looks for a column

The wildfire dataset states the single most dangerous fact about itself in its own description line:

> *"Number of wildfires. The 2026 data is incomplete and was last updated 21 August 2026."*

`intake` freezes that into `article.md` as prose and never as a column, and `storyboard`'s
partial-period guard matches a COLUMN NAME (`^months?_covered$|^coverage$|^complete(ness)?$`). So
eight months of 2026 read as a full year beside fourteen complete ones, and its 370 394 world fires
read as a 41% collapse. The profile now carries the claim as a first-class field, and
`freezeSource` hands the article to the profiler so it is populated in production:

```js
statedIncompleteness: {
  reads: "English and French",
  words: ["incomplete", "partial", …, "provisoire", "provisoires"],
  column: "year",
  readProse: true,
  claims: [{ period: 2026, column: "year", word: "incomplete",
             sentence: "The 2026 data is incomplete and was last updated 21 August 2026." }],
  says: "the frozen prose states that a period this table holds is incomplete — a CLAIM the journalist wrote …",
}
```

**It is a CLAIM, not a fact**, and the sentence travels with it for that reason: the profiler cannot
check whether a period really is short, only that the journalist's own frozen prose says so. A
sentence qualifies when it carries one of the declared words AND a numeral that is one of the period
column's own values — the numeral is what ties the claim to a row of the table, and without it a
sentence about an incomplete *argument* would read as a sentence about an incomplete *year*.

**The reach is declared**, the same policy `denominatorUnread` states one section up: a lexicon's
silence must not read as a clean bill. Two languages, not the four `LEXICON_LANGUAGES` declares —
these are the words this list can spell correctly, and a dataset stating its incompleteness in Greek
or Arabic is a gap named out loud rather than a guess made quietly. The field is emitted whenever the
table HAS a period for a sentence to be about, claims or none, and `readProse: false` distinguishes
"nothing was said" from "nothing was read".

### A panel's denominator is a different file

`findDenominatorColumn` looks in the same table. Every country panel published one indicator per
file — Our World in Data, Eurostat, the World Bank — keeps its population and its area somewhere
else, so the round-four downgrade cannot fire and its silence carried no information at all.
*"The Democratic Republic of Congo recorded more wildfires in 2025 than any other country"* is true
of the raw column and is a fire-count artefact of savanna burning across a 2.3 million km² country,
and nothing in the run said so.

A profiler cannot fetch the other file. What it can do is stop its own silence from reading as
"asked and answered", so a measure column of a PANEL that got no denominator answer at all now
carries:

```js
{ name: "events", type: "number", min: 0, max: 1148499, sum: 42410733,
  denominatorNotInThisTable: {
    says: "this table holds no denominator-shaped column, and a panel published one indicator per file keeps its denominator — population, area, households — in a different file; …",
    reads: "English, French, Greek and Arabic" } }
```

Only on a panel, and only where `denominator` and `denominatorUnread` both said nothing, so it never
argues with an answer that exists.

## Quick start

```js
import { freezeSource } from "./scripts/freeze.mjs";

const { article, data, profile } = await freezeSource({
  storyDir: "/path/to/stories/my-story",
  articlePath: "/path/to/draft.md",
  dataPath: "/path/to/rainfall.csv",
});
// source/article.md, source/data.csv, source/profile.json now exist and are frozen.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Which story workspace to freeze into | `storyDir` | `freezeSource()` call |
| Which article file to freeze | `articlePath` | `freezeSource()` call |
| Which CSV to freeze and profile | `dataPath` | `freezeSource()` call |

## Files

- `references/ourworldindata-csv-filter-trap.md` — how Our World in Data's CSV endpoint silently ignores country filters without `&csvType=filtered`, and the rule: always count rows to verify a dataset arrived as expected.
- `scripts/csv.mjs` — `parseCsv`, the RFC 4180 reader.
- `scripts/profile.mjs` — `profileTable`, the column profiler.
- `scripts/freeze.mjs` — `freezeSource`, the orchestrator (depends on the two above).
- `test/{csv,profile,freeze}.test.ts` — `bun:test` coverage, including regression tests for the hex/empty-table and lone-CR fixes made on top of the original design.
- `test/panel.test.ts` — the panel shape, the aggregate tests, per-period coverage, the withheld period total, the stated incompleteness and the panel denominator sentence, measured against the three real Our World in Data files frozen under `stories/real-*`.
