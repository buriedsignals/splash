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
| Profiler | `scripts/profile.mjs` | `profileTable(rows)` — types each column (`number`/`date`/`text`), counts missing/distinct, ranges numeric columns and totals them (`min`, `max`, `sum`), and names what it will not decide for the journalist: `reason`, `gaps`, `mixedUnits`, `denominator`, `denominatorUnread`, `percentAboveHundred` |
| Orchestrator | `scripts/freeze.mjs` | `freezeSource({storyDir, articlePath, dataPath})` — reads both source files once, profiles the data, writes the three frozen artifacts, refuses a second call |

## How it works (the shape)

1. **Parse** the CSV with a real state machine (quoted/unquoted, not a `.split(",")`) — `parseCsv` in `csv.mjs`.
2. **Profile** the parsed rows: each column gets a strict-numeric-literal type check, a missing count (blank cells counted, never dropped), a distinct count, and — for numeric columns only — a `min`, a `max` and a `sum`, in `profileTable` in `profile.mjs`. The `sum` is there for one named downstream reader: `storyboard`'s grounding check, which cannot otherwise place a part-to-whole total, because a total is by construction outside the range of the column it sums.
2b. **Report what only the journalist can settle.** A column carries `reason` when it looked numeric and was refused, `gaps` when a sequence's own grain skips a step, `mixedUnits` when a sibling `unit` column says the range is not one measure, `denominator` when a population-shaped column sits in the same table, `denominatorUnread` when a sibling numeric column is NAMED IN A LANGUAGE THIS PROFILER DOES NOT READ, and `percentAboveHundred` when a column whose own values carry `%` holds a share above 100 — see below. None of the six repairs anything.
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

**The limit that remains, said out loud:** an undeclared language spelling itself in plain ASCII —
Dutch `bevolking`, Italian `popolazione` — passes both nets and no character test will ever see it.
`storyboard`'s grounding check is where that limit is stated to the journalist, on the verdict it
would otherwise inflate.

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
