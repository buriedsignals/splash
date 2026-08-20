# Stress findings, round two — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the nine defects the second stress test found — six beats across the whole media × format grid, produced from deliberately imperfect input — and, for every defect that can happen in more than one skill, close it as a **rule in the catalogue** so the derivation carries it everywhere its traits reach.

**Architecture:** Each finding is fixed where it lives, then asked one question: *can this happen in another skill?* If yes it becomes a `guard`, `capability` or `discipline` declaring the TRAITS it requires; `reachable()` derives the population and the suite refuses debt. If no, it is fixed with a regression test and says so.

**Source:** the round-two stress test of 2026-08-20 — `stress-d-asylum-gap` (chart/web), `stress-e-electricity-mix` (chart/video), `stress-f-housing-pressure` (map/web), `stress-g-eight-checkpoints` (scrolly), `stress-h-site-photographs` (image), `stress-i-median-wages` (delegated Datawrapper).

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, watched failing.
- English only, everywhere. No mention of any AI tool in code, comments or commit messages. **Never `git commit --amend`** in this tree.
- **No cross-skill runtime imports.** A decision reaching a second skill is COPIED and registered in `COPIES` (`skills/splash/test/guard-copies-parity.test.ts`).
- Edit through `Bash`, never Edit/Write — a global formatter hook breaks byte-identical copies.
- Every mechanism added is **mutation-checked**, exact red message in the commit body.
- `owedRows()` and `unstatedRows()` empty when a task finishes; an exception needs a MEASURED reason.
- **The six frozen stress stories are the acceptance test.** A fix nobody can see in what they produce has not been demonstrated.

---

### Finding 1 — the delivered page declares a language it is not written in

`renderWeb`'s HTML shell hard-codes `<html lang="fr">`, baked in for its first caller, a French CO₂ beat. Every English beat rendered through it misdeclares its language to a screen reader and to a translation engine. Found because a stress beat had to patch it in its own runner rather than in the skill.

**Sharing:** every skill that ships a standalone page can carry this. Declare a `guard` requiring `ships-standalone-html`, detected on the DELIVERED artefact: the page's `lang` matches the language the story recorded. Do not invent a language detector — the story states its language; the page must agree with it.

---

### Finding 2 — the key a journalist fills is not the key the code reads

`.env` names it `DATAWRAPPER_API_TOKEN`; `dw-beat` reads `DATAWRAPPER_TOKEN` and refuses with "no token" while a valid 64-character token sits in the file. The same family exists for MapTiler (`REMOTION_MAPTILER_KEY`, `VITE_MAPTILER_KEY`).

**Sharing:** every skill that needs a provider credential. Reconcile the names, and make the refusal name **which variable it looked for and which the root actually holds**. Declare it where the trait fits, or state plainly in the commit why it cannot be a catalogue rule.

---

### Finding 3 — a delivered page leaves half its frame empty

`stress-f`'s choropleth occupies the left half of a 1440×900 window; the right half is empty ground. `map-web`'s own description promises a page that "fits the reader's window", and `chart-web`'s promises a graphic that "fills its container edge to edge".

- [ ] Measure first, across every delivered web page in the tree: what fraction of the frame the graphic actually covers, at three widths. **The measurement decides the floor** — do not invent one.
- [ ] Fix `stress-f` and whatever pattern produced it.
- [ ] **Sharing:** a `capability` requiring `ships-standalone-html`, detected on the delivered page.

---

### Finding 4 — the scrolly does not have the shape its own skill describes

`skills/scrolly`'s own description: *"a FIXED graphic that fills the frame, with an opaque prose card centred over it and travelling upward"*. `stress-g` delivers a graphic covering roughly 15% of the frame and prose that is neither a card nor opaque nor centred. `verify-scrolly.mjs` passed it.

- [ ] Measure the delivered scrollies in `proof/` the same way before deciding whether `stress-g` is the outlier or the seed is.
- [ ] Fix what the measurement says is wrong — the beat, the seed, or the description if it promises something the vehicle never did.
- [ ] **Sharing:** a `guard` requiring `reader-driven-reveal`, run by that skill's own verifier.

---

### Finding 5 — a unit inside the cell types the measure `text`, silently

`"12 %"` makes `pressure` type `text` with `min`/`max`/`sum` null and **no `reason` recorded**, although the round-one fix promises a reason on any column that looked numeric and was refused. Same class as the thousands separator, one step further out.

- [ ] Failing test first, from `stories/stress-f-housing-pressure/source/profile.json`.
- [ ] A trailing or leading unit is either read (and the unit recorded) or refused **with its reason**. Ambiguity is never guessed; `0x1F` must still be `text`.

---

### Finding 6 — a hole in the middle of a series is invisible in the profile

`stress-d` reports `year: min 2008, max 2017, distinct 8` and never says 2013 and 2014 are missing. A naive line would bridge the gap and invent two years of data.

- [ ] Failing test first.
- [ ] For an ordered numeric or date column, the profile reports the gaps: which values the sequence skips. Reporting, never repair.

---

### Finding 7 — a part-to-whole claim is never checked against the column's own sum

`share_pct` summed to 95.2 in the frozen profile while the article said the shares "make up the whole of national supply". `sum` exists in the profile for exactly this, and nothing joined the two.

- [ ] Failing test first, with the article's sentence verbatim.
- [ ] A takeaway asserting totality — "the whole of", "all of", "together they make up", "100%" — is checked against the summed column and comes back `contradicted` when the sum is not a whole, naming both numbers.
- [ ] Local to `storyboard`, which the catalogue cannot reach; say so.

---

### Finding 8 — a capability that cannot observe its own failure

`every-photo-says-what-it-shows` reports clean on a manifest with an empty alt and a missing credit, because `image-beat`'s write-time refusal already stopped that beat before the detector could see it. A check whose failure mode is unreachable is theatre by this plan's own definition.

- [ ] Decide, with the evidence: either the capability measures the DELIVERED artefact (where the placeholder text `[alt text not supplied by the newsroom]` is itself the observable gap), or it is not a capability and is retired with a measured reason.
- [ ] Whichever way, mutation-check that the new form CAN fail.

---

### Finding 9 — the refusal tells an agent to stop, and every agent kept going

`palette`'s refusal says *"do not write PALETTE.md yourself"* and *"end the turn there"*. Three independent agents wrote it anyway, because finishing their task required it. A rule every reader breaks is not a rule.

- [ ] Decide honestly: either the unattended path is legitimate and the refusal describes it (a recorded proposal, an answer whose `origin` says who chose it, and what an agent may do when no journalist is present), or it is not and the skills that need a palette must stop.
- [ ] Whatever is decided, the text and the practice must agree afterwards.

---

## Self-review

**Coverage.** Nine findings, nine tasks. Four ask the sharing question and answer it in the catalogue (1, 2, 3, 4); three are local to the one reader or checker every story passes through (5, 6, 7); one is a decision about a rule landed yesterday (8); one is a decision about a refusal's honesty (9).

**Two findings need a measurement before their fix has a shape** (3 and 4) and say so; neither may pick a threshold that was not measured.
