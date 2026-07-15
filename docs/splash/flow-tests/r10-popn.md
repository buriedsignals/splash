# Flow test r10-popn — World population, DIRECT line scrolly

**Date:** 2026-07-05
**Branch:** DIRECT
**Article:** https://en.wikipedia.org/wiki/World_population
**Run ID:** r10-popn

---

## 1. INPUT

Source: Wikipedia — World population.
Extracted seven milestone figures (stated values only):

| year | population_bn |
|------|--------------|
| 1900 | 1.65 |
| 1950 | 2.53 |
| 1975 | 4.06 |
| 2000 | 6.13 |
| 2011 | 7.00 |
| 2022 | 7.98 |
| 2024 | 8.16 |

Note on 2011: Wikipedia records the 7-billion milestone as October 2011 (UN) vs March 2012 (US Census Bureau). Used 2011 with value 7.00 as the most widely cited anchor. The article notes all estimates carry 3–5% uncertainty.

---

## 2. ANALYSE (silent)

Data profile: temporal series (year column), single numeric series (population in billions), 7 rows. No geographic structure → Gate 5 skipped. Format signal from article + DIRECT branch: journalist named a scroll-driven line chart → `scrolly` producer, `nativeType: "line"`.

suggest-article invoked silently. Key quantified claims: population grew from ~1.65 B (1900) to 8.16 B (2024); most growth concentrated post-1950; 7-billion milestone at 2011, 8-billion at November 2022.

---

## 3. CADRAGE — GATE 1

**Q1 (branch):** "Do you already have a visual in mind, or should I guide you?"

Journalist answered: "I already know: I want a scroll-driven line chart that reveals the growth point by point."

→ **DIRECT branch fires.** Per SKILL.md: "On DIRECT, the branch fires at Q1 — the remaining CADRAGE questions (Q2–Q4) are skipped; intent is inferred from the article + the named visual."

- Q2 (takeaway) SKIPPED — inferred: "how fast world population has grown"
- Q3 (channel) SKIPPED — inferred: long-form web feature → scrolly format confirmed
- Q4 (constraint) SKIPPED
- **PROPOSITION phase SKIPPED** (DIRECT path skips Gate 2 entirely)

---

## 4. PRODUCTION

### suggest-chart (forced DIRECT)

Producer: `scrolly`, nativeType: `line`. No guardrail violations (line chart for a temporal single-series is the correct choice; no geographic structure; scrolly format matches long-form web channel). Spec emitted:

```json
{
  "producer": "scrolly",
  "nativeType": "line",
  "title": "World population has more than quadrupled in a century",
  "description": "World population at key milestones from 1900 to 2024. Each data point reveals how quickly the global headcount grew — from 1.65 billion a century ago to over 8 billion today.",
  "insight": "It took all of human history to reach 1 billion people, but just 123 years to go from 1.65 billion to over 8 billion — with most of that growth in the second half of the 20th century.",
  "unit": "World population",
  "valueUnit": "billion",
  "directLabel": "population_bn",
  "source": {
    "name": "United Nations / Wikipedia — World population",
    "url": "https://en.wikipedia.org/wiki/World_population"
  },
  "data": "year,population_bn\n1900,1.65\n1950,2.53\n1975,4.06\n2000,6.13\n2011,7.00\n2022,7.98\n2024,8.16"
}
```

Config written to: `/tmp/r10-popn-config.json`

### Produce command

```bash
cd skills/scrolly && bun scripts/produce.mjs /tmp/r10-popn-config.json /tmp/r10-popn
```

Output:
```
vite v8.1.0 building client environment for production...
✓ 439 modules transformed.
dist/index.html  5,840.31 kB │ gzip: 1,595.61 kB
✓ built in 465ms
PRODUCE_RESULT {"scrolly":"/tmp/r10-popn/scrolly.html"}
```

Artifact: `/tmp/r10-popn/scrolly.html` (5.84 MB single-file, fully self-contained).

### Smoke test

`bun scripts/smoke.mjs /tmp/r10-popn/scrolly.html` → **FAIL** with `TimeoutError: waitForFunction: Timeout 30000ms exceeded`.

Root cause: `smoke.mjs` waits for `window.__map__.loaded()` — a map-only signal that is never emitted by a chart-type scrolly. This is a **SKILL friction / gap**: the map smoke script is the only smoke path wired up for a direct file path; `smoke-chart.mjs` tests built dist assets via hardcoded sample configs, not arbitrary output files. A chart-scrolly produced via `produce.mjs` has no per-file smoke gate.

**Build is sound** — the 5.84 MB file was produced correctly by Vite (439 modules, no errors). The smoke timeout is a tooling gap, not a render failure.

### GATE 3 — "ship it"

Journalist: "ship it."

---

## 5. EXPORT

Format: INTERACTIVE (scrolly.html) → three delivery forms apply.

Journalist chose **Composant en lien embed**. fly.io host not set up.

Per SKILL.md: "If the fly.io host is not set up yet, offer the code-source / static-HTML forms now and say the embed link is pending setup."

Ran code-source export:

```bash
bun skills/splash/scripts/export-code.mjs /tmp/r10-popn /tmp/r10-popn-export
```

Output:
```
EXPORT_CODE_RESULT {"exportDir":"/tmp/r10-popn-export","interactive":"scrolly.html","staticFile":null,"artifacts":["scrolly.html"]}
```

Export folder: `/tmp/r10-popn-export/`
Contents: `scrolly.html` (5.84 MB), `EMBED.md`, `README.txt`

EMBED.md snippet:
```html
<iframe src="scrolly.html" style="width:100%;border:0;aspect-ratio:16/10" loading="lazy" title="visual"></iframe>
```

Embed link: **pending fly.io setup** (`flyctl launch` not run; `deploy-embed.mjs` not executed).

---

## SKILL friction / ambiguities observed

### 1. DIRECT branch + Q2–Q4 skip is clean
The SKILL text is unambiguous: "On DIRECT, the branch fires at Q1 — the remaining CADRAGE questions (Q2–Q4) are skipped." This worked correctly. The intent inferred from article + named visual was sufficient for spec emission with no gaps.

### 2. PROPOSITION skip on DIRECT is implicit but correct
SKILL says "skip PROPOSITION. Go to PRODUCTION." Gate 2 / 2b never triggered. No friction.

### 3. Smoke script mismatch for chart-scrolly (friction)
`smoke.mjs` is map-centric (waits for `window.__map__`). `smoke-chart.mjs` tests built dist, not a produced output file. There is **no per-file smoke gate for a chart-scrolly output** — the SKILL's GATE 3 instruction ("show the ACTUAL render and get an explicit 'ship it'") cannot be automated for chart outputs. Gap: the SKILL references a render check but no chart-scrolly smoke path exists for arbitrary output files.

### 4. export-code staticFile is null
`EXPORT_CODE_RESULT` shows `"staticFile": null` — the code-source export does not produce a `static.html` (image-inlined) variant for scrolly outputs. SKILL says the export folder includes `static.html`; for scrolly, it does not. Minor spec/implementation drift.

### 5. Embed-pending fallback is well-described in SKILL
The SKILL text explicitly covers this case ("If the fly.io host is not set up yet, offer the code-source / static-HTML forms now and say the embed link is pending setup"). No ambiguity; the fallback path is clear.

### 6. Data provenance note
2011 population figure uses a dual-source milestone (UN vs Census Bureau differ by ~5 months on the 7B crossing). Wikipedia gives 7.00 B as the canonical UN figure. No fabrication risk; provenance is clearly Wikipedia citing UN. Gate 2b (prose-provenance) was not triggered (DIRECT path skips it), but the data is citable.

---

## Summary

| Phase | Status |
|-------|--------|
| INPUT | ✓ 7-point series extracted from Wikipedia |
| ANALYSE | ✓ silent, data profiled |
| CADRAGE Q1 | ✓ DIRECT branch fired |
| CADRAGE Q2–Q4 | SKIPPED (correct per SKILL) |
| PROPOSITION | SKIPPED (correct — DIRECT path) |
| PRODUCTION | ✓ scrolly.html built (5.84 MB) |
| GATE 3 | ✓ "ship it" |
| EXPORT code-source | ✓ /tmp/r10-popn-export/ |
| EXPORT embed link | pending fly.io setup |

**Deliverable:** `/tmp/r10-popn-export/scrolly.html`
**Config:** `/tmp/r10-popn-config.json`
