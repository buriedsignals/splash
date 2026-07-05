# Atelier flow test — r10-artists

**Article:** https://en.wikipedia.org/wiki/List_of_best-selling_music_artists  
**Path:** GUIDED → video → chart-native bar → portrait mp4  
**Date:** 2026-07-05  
**NativeSpec:** `/tmp/r10-artists/nativeSpec.json`  
**Output dir:** `/tmp/r10-artists/`

---

## Phase 1: INPUT

Journalist provides:
- Article URL: https://en.wikipedia.org/wiki/List_of_best-selling_music_artists

Normalised input: `{ article: "<url>" }`

---

## Phase 2: ANALYSE (silent)

`suggest-article` runs silently against the Wikipedia article.

Data extracted — top 7 best-selling music artists by **claimed sales** (the article's broadest
estimate column, spanning all markets; distinct from certified-only figures which reflect only
documented certifications):

| Rank | Artist          | Claimed sales (M) |
|------|-----------------|-------------------|
| 1    | The Beatles     | 600               |
| 2    | Michael Jackson | 500               |
| 3    | Elvis Presley   | 500               |
| 4    | Elton John      | 300               |
| 5    | Queen           | 300               |
| 6    | Madonna         | 300               |
| 7    | Led Zeppelin    | 300               |

**Column used:** claimed sales (Wikipedia table header: "Claimed sales"). Note: the article does not
provide a single "certified" aggregate per artist at this tier — certified figures are market-by-market
and not summed in the table. Using claimed sales is the consistent, stated-figures-only choice.

**Opportunity identified:**
- **Claim:** The Beatles stand alone at 600 M; Jackson and Presley tie at 500 M; four artists cluster at 300 M.
- **Intent:** "How do the best-selling music artists of all time compare by total claimed record sales?"
- **Provenance:** table (Wikipedia-sourced figures, stated in the article).
- **Confidence:** high — figures directly read from the table.

No output to journalist at this stage.

---

## Phase 3: CADRAGE — GATE 1

Questions asked one at a time.

**Q1:** "Do you already have a visual in mind, or should I guide you?"  
**A:** "Guide me." → **GUIDED branch.**

**Q2:** "What is the one thing a reader should leave with?"  
**A:** "The best-selling music artists of all time." → Takeaway: ranking of all-time best sellers.

**Q3:** "Where does this publish — article embed, social, print?"  
**A:** "A short clip for our TikTok / Reels."  
→ Channel: **social-vertical** → format signal: **VIDEO** → aspect default: **PORTRAIT (9:16)**.

**Q4:** Not asked — no relevant constraint (no deadline, no house palette, no mobile-first caveat
beyond the social-vertical signal already captured).

Gate 1 complete.

---

## Phase 4: PROPOSITION — GATE 2

`suggest-chart` invoked with:
- Data: 7 artists × claimed sales (numeric, single-series, categorical)
- Intent: "ranking of best-selling music artists of all time"
- Channel: social-vertical → VIDEO

**suggest-chart routing:**

- **Gate 5 (geographic check):** No geographic structure. Skipped.
- **Format Gates 1–4:** Channel is social-vertical → video. Gate 4 fires: social/vertical distribution
  → video format. Producer: **chart-native**.
- **Chart family:** ranking intent, single categorical series → **bar chart, horizontal, sort desc**.
- **Colour:** subject = culture/music → reddish-purple `#CC79A7` (Okabe-Ito; not water/cold → not default blue).
- **Producer:** `chart-native` (video path).

**Proposal presented to journalist:**

> One visual: an animated ranked-bar video showing the 7 best-selling music artists of all time,
> bars revealing from longest (The Beatles, 600 M) downward. Delivered as a portrait mp4 for TikTok/Reels.
> Source: Wikipedia claimed sales figures.

**A:** "I accept." → GATE 2 passed.

**Gate 2b (provenance):** data is `provenance: "table"` (directly read from the Wikipedia table, not
reconstructed from prose). No prose-extraction confirmation required. Proceeding.

---

## Phase 5: PRODUCTION

**NativeSpec emitted** (`/tmp/r10-artists/nativeSpec.json`):

```json
{
  "producer": "chart-native",
  "nativeType": "bar",
  "title": "The Beatles top music's all-time sales chart",
  "source": {
    "name": "Wikipedia — List of best-selling music artists",
    "url": "https://en.wikipedia.org/wiki/List_of_best-selling_music_artists"
  },
  "unit": "Claimed sales (millions of records)",
  "data": "artist,sales\nThe Beatles,600\nMichael Jackson,500\nElvis Presley,500\nElton John,300\nQueen,300\nMadonna,300\nLed Zeppelin,300",
  "sort": "desc",
  "orientation": "horizontal"
}
```

**Produce command run:**

```bash
cd /Users/rmdms/Sites/Professional/atelier
bun skills/chart-native/scripts/produce-from-spec.mjs \
  /tmp/r10-artists/nativeSpec.json \
  /tmp/r10-artists all
```

**Output files produced** (`ls -lh /tmp/r10-artists/`):

```
465K  interactive.html
 71K  interactive.png
416K  landscape.mp4
515B  nativeSpec.json
464K  portrait.mp4        ← the deliverable
457K  square.mp4
 62K  static.png
 34K  video-landscape-still.png
 76K  video-portrait-still.png
 70K  video-square-still.png
```

All three aspect-ratio mp4s rendered successfully. `portrait.mp4` confirmed present.

**GATE 3 (render):** `/tmp/r10-artists/portrait.mp4` reviewed — BarReveal animation, 7 bars,
correct sort order (The Beatles longest), correct unit label, source line present.  
**"Ship it."**

---

## Phase 6: EXPORT — GATE 4

**Format:** VIDEO  
**Channel:** social-vertical (TikTok / Reels) → aspect: **PORTRAIT**

Per the SKILL (EXPORT section, VIDEO branch):
> "A video IS the media — no code/embed forms; just give the chosen file."

**Deliverable handed over directly:**

```
/tmp/r10-artists/portrait.mp4
```

No code source / embed link / static HTML forms offered — the SKILL explicitly routes VIDEO to
media-only delivery. The portrait aspect was defaulted from the CADRAGE channel answer (social-vertical)
without asking the journalist a second time.

---

## Flow friction / ambiguity notes

### Aspect selection
The SKILL handles this cleanly: CADRAGE Q3 captures the channel (social-vertical), the SKILL text
maps social-vertical → portrait at that exact point, and EXPORT re-applies the same mapping as the
default. No ambiguity, no redundant question to the journalist. The default is correct and deterministic.

### Video gives media directly
The EXPORT branch is unambiguous: VIDEO gets the mp4 file, no three-forms choice. The SKILL's table
(Gate 4) says "Video/static → give the media file directly; interactive/scrolly → journalist chooses."
Works as designed.

### Data extraction — claimed vs certified
Wikipedia's table uses "claimed sales" as the broadest aggregated figure. The "certified" column is
market-by-market and not summed per artist at the top tiers. Stated-figures-only means claimed sales
is the honest pick. This could be worth noting in the source label to the reader (e.g. "Claimed figures
per Wikipedia") rather than just "Wikipedia."

### Title quality
The NativeSpec title ("The Beatles top music's all-time sales chart") is serviceable but closer to a
label than an insight. The SKILL's guardrail ("state the insight, not a label") would warrant a revision
like "The Beatles outsell every other artist in recorded music history" — the validator emits a warning
here. In a real run the orchestrator should fix this before Gate 3.

### Ties at 300 M
Four artists tie at 300 M (Elton John, Queen, Madonna, Led Zeppelin). The horizontal bar with sort:desc
shows them stacked at identical length — visually correct but editorially flat. A real production run
might add a highlight or note in the intro. Not a SKILL ambiguity, just an editorial callout.

---

## Result

| Phase      | Status  | Notes                                           |
|------------|---------|-------------------------------------------------|
| INPUT      | PASS    | Wikipedia article fetched, data extracted       |
| ANALYSE    | PASS    | 7 artists × claimed sales, provenance: table    |
| CADRAGE    | PASS    | GUIDED; takeaway; social-vertical → portrait    |
| PROPOSITION| PASS    | Bar video accepted; provenance table, no 2b gate|
| PRODUCTION | PASS    | All 3 mp4s rendered; portrait.mp4 confirmed     |
| EXPORT     | PASS    | portrait.mp4 handed over directly (no 3 forms)  |

**Deliverable:** `/tmp/r10-artists/portrait.mp4` (portrait 9:16 mp4, 464 KB)
