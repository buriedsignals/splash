---
name: inspiration
description: Use when a journalist wants to see what newsrooms have already published on a subject — before a story exists, during one, or with no intention of producing anything — by searching the infoviz.design gallery once and showing the raw list (title, newsroom, date, link) with the searches left today. Needs no story directory, opens no gate, produces nothing.
---

# inspiration — what newsrooms already made of a subject

## Overview

A journalist often wants to look before they build: how did other newsrooms show floods, an
election night, a heatwave? The infoviz.design gallery indexes thousands of published charts, maps
and interactives. This skill asks it once and puts the answer in front of the journalist as a
plain numbered list — the title linked to the original, the newsroom, the date — followed by how
many searches are left today.

It is a separate journey, not a phase. It never creates or reads a story directory, never opens a
gate, never hands over to a craft skill, and never decides that one of the results is the right
treatment. What the journalist does with the list is theirs.

Three rules shape it:

1. **One search per request.** The gallery rations searches per address (five a day without an
   account). The skill sends the journalist's own subject once. It never rephrases, never retries
   with other words, and never runs a second query to "improve" the list.
2. **The raw list, unedited.** No ranking, no summary, no grouping by technique. An empty list is
   said as an empty list.
3. **The quota is always said.** After every search, the searches left today; when none are left,
   the time the count resets.

## When to use

- The journalist asks what has already been done on a subject, wants examples, precedent or
  inspiration — with or without a story, with or without the intent to produce anything.
- Run it with the journalist's subject as they said it. If they gave no subject, ask for one before
  running anything.
- **Not** a substitute for the storyboard's reference loop, and **not** a step of the production
  flow: it does not move a story forward and `whereIs` does not know it.
- **Not** for choosing a treatment on the journalist's behalf.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Request | `scripts/search.mjs` | `searchInspiration({query, fetchFn, timeoutMs, apiBase})` — one POST under one deadline covering request and body; returns the list and quota, or the reason there is none; never throws |
| Words | `scripts/format.mjs` | `formatInspiration(result)` — the numbered list, the quota line, or the plain sentence for each failure |

## How it works (the shape)

1. **Check the subject.** Blank → `empty-query`; longer than the gallery accepts → `query-too-long`.
   Neither contacts the gallery.
2. **Ask once.** `POST https://infoviz.design/api/graphics/examples` with `{"query": subject}`, read
   `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
3. **Keep what can be opened.** An item needs a title and an http(s) link; newsroom, date and image
   become null when missing.
4. **Say it.** `formatInspiration` renders the list and the searches left, or the reason:
   `limit-reached` (with the reset time), `unexpected-response` (with the status), `unreachable`
   (with the cause).

## Quick start

```bash
bun skills/inspiration/scripts/search.mjs "floods in Pakistan"
bun skills/inspiration/scripts/search.mjs "election night maps" --json
```

The first prints the markdown to show the journalist as it is. The second prints the structured
result. Both exit with code 1 when there is no list.

```js
import { searchInspiration } from "./scripts/search.mjs";
import { formatInspiration } from "./scripts/format.mjs";

const result = await searchInspiration({ query: "heatwaves" });
console.log(formatInspiration(result));
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How long one search may run, request and body together | `15000` ms | `DEFAULT_TIMEOUT_MS`, `search.mjs` (override via `searchInspiration({timeoutMs})`) |
| The longest subject sent to the gallery | `1000` characters | `MAX_QUERY_LENGTH`, `search.mjs` |
| Which gallery is asked | `https://infoviz.design` | `INFOVIZ_API`, `search.mjs` (override via `searchInspiration({apiBase})`) |

## Files

- `scripts/search.mjs` — `searchInspiration`, `normaliseItems` — the one bounded request and the
  item filter; also the command line.
- `scripts/format.mjs` — `formatInspiration` — every sentence the journalist reads.
- `test/search.test.ts` — the request, the 429, the unexpected answers, the hung request and the
  stalled body, against stubbed responses.
- `test/format.test.ts` — the rendered list, the markdown escaping, and each failure sentence.
- `test/search.live.test.ts` — one real search, run only with `SPLASH_LIVE_INFOVIZ=1` because it
  spends one of the day's searches.
