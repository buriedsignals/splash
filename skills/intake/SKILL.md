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
| Profiler | `scripts/profile.mjs` | `profileTable(rows)` — types each column (`number`/`date`/`text`), counts missing/distinct, ranges numeric columns and totals them (`min`, `max`, `sum`), and names what it will not decide for the journalist: `reason`, `gaps`, `mixedUnits`, `denominator` |
| Orchestrator | `scripts/freeze.mjs` | `freezeSource({storyDir, articlePath, dataPath})` — reads both source files once, profiles the data, writes the three frozen artifacts, refuses a second call |

## How it works (the shape)

1. **Parse** the CSV with a real state machine (quoted/unquoted, not a `.split(",")`) — `parseCsv` in `csv.mjs`.
2. **Profile** the parsed rows: each column gets a strict-numeric-literal type check, a missing count (blank cells counted, never dropped), a distinct count, and — for numeric columns only — a `min`, a `max` and a `sum`, in `profileTable` in `profile.mjs`. The `sum` is there for one named downstream reader: `storyboard`'s grounding check, which cannot otherwise place a part-to-whole total, because a total is by construction outside the range of the column it sums.
2b. **Report what only the journalist can settle.** A column carries `reason` when it looked numeric and was refused, `gaps` when a sequence's own grain skips a step, `mixedUnits` when a sibling `unit` column says the range is not one measure, and `denominator` when a population-shaped column sits in the same table — see below. None of the four repairs anything.
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
