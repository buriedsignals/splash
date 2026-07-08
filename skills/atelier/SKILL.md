---
name: atelier
description: Use to run the whole atelier pipeline end-to-end from an article and/or data to a finished, exported visual. Sequences ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT with human gates, invoking suggest-article, suggest-chart, and the producers. The single entry point for "make me a visual from this". Keywords atelier, flow, pipeline, orchestrate, end-to-end, article to chart, produce a visual, embed, export.
---

# atelier — the end-to-end flow

## Overview

The single entry point that turns an article and/or data into a finished, exported visual. It runs
six ordered phases with explicit human gates and never re-decides what a sub-skill already decides —
it sequences and gates. Conduct the ENTIRE dialogue in the journalist's language (detect it from
their first message).

## The flow (run in order; every gate is a hard stop)

### 1. INPUT

Accept: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a bare
topic. Normalise to `{ article?, data?, topic? }`. Do not proceed until you have at least one.

### 2. ANALYSE (silent)

Invoke `suggest-article` to read silently: identify the data, the quantified claims, and the
narrative structure. Produce NO output to the journalist yet — this primes CADRAGE. For a bare topic
(no article/data), instead NAME the real dataset the topic needs (the honest sans-rien path) and
carry that forward.

### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, ≤4 questions, one at a time)

Ask each question as ONE well-formed single-select prompt (a short header, 2–4 concrete options) and
wait for the answer before the next — never batch several into one call, which is what malforms the
question tool.

1. Branch: "Do you already have a visual in mind, or should I guide you?"
2. Takeaway: "What is the one thing a reader should leave with?" → the insight/angle.
3. Audience & channel: "Where does this publish — article embed, social, print?" → the format signal
   (feeds suggest-chart Gates 1–4: static / interactive / video / scrolly) AND the media aspect for a
   video/image: social-vertical → portrait (9:16), feed → square (1:1), article/web → landscape (16:9).
4. Constraint (only if relevant): mobile-first, deadline, house palette.

Branch:
- **DIRECT** (journalist names the visual, e.g. "a scrolly map"): skip PROPOSITION. Go to PRODUCTION,
  passing suggest-chart the (data, intent) PLUS the forced element/format — suggest-chart still emits
  a VALIDATED spec and applies its guardrails (obey the choice, but if it violates a hard guardrail,
  surface the warning to the journalist rather than shipping a broken visual). On DIRECT, the branch
  fires at Q1 — the remaining CADRAGE questions (Q2–Q4) are skipped; intent is inferred from the
  article + the named visual.
- **GUIDED**: go to PROPOSITION.

### 4. PROPOSITION — GATE 2 (guided path only)

Present the `suggest-article` ProposalSet × `suggest-chart` routing as plain-language lines — for each
opportunity: what it shows, which visual, why.

**GATE 2b (data provenance — prose proposals only):** if a proposal's figures are
`provenance:"prose"`, show the reconstructed table and get an explicit confirmation that the numbers
are correct BEFORE the journalist accepts/edits/rejects that proposal. The ordering is: confirm the
table (2b) FIRST as its OWN question, THEN accept / edit / reject (2) — never bundle "are these figures
right?" and "do you accept this visual?" into one question (they are different decisions). Never
fabricate a dataset attribution.

Only accepted proposals continue.

### 5. PRODUCTION

PRODUCTION is a coded, **drop-proof** loop — you do NOT run producers one at a time from prose.
You assemble the accepted proposals into one file and let `produce-all` produce every one of them,
so a secondary proposal can never silently drop.

**5a. Validate each spec first.** For every accepted proposal, run the producer's spec validator
(`validateChartSpec` for charts; `validateChoroplethConfig` / `validateLocatorConfig` /
`validateSymbolConfig` / `validateMapSpec` for maps) and fix any warning — in particular a title that
reads as a label rather than the insight — so a weak spec never reaches GATE 3.

**5b. Assemble `exports/<slug>/accepted.json`** — an array, one entry per accepted proposal:
`{ "id": "<stable-id>", "producer": "dw-chart|chart-native|map-dw|map-native|scrolly",
"format": "static|interactive|video|scrolly", "spec": <the validated producer spec>,
"provenance": "table|prose|none", "confirmedTable": <true ONLY after Gate 2b> }`.
`producer` + `format` are what suggest-chart routed; `provenance` comes from suggest-article.

**5c. Produce everything at once** — report to a FILE (the gates and EXPORT read it back):
```bash
bun skills/atelier/scripts/produce-all.mjs exports/<slug>/accepted.json exports/<slug> \
  > exports/<slug>/report.json
```
`produce-all` iterates EVERY proposal, dispatches to the right producer + format, and writes
`{ results: [{ id, producer, format, status, outputs?, publicUrl?, reason?, error?, renderApproved }] }`.
It exits non-zero only if some `status` is `"failed"`. (Redirecting to `report.json` is required — the
report is the machine channel; producer progress goes to stderr, so stdout stays pure JSON.)
Each proposal's artifacts land in a **per-proposal subdir** `exports/<slug>/<id>/` — that subdir (not the
parent `exports/<slug>`) is the `<outDir>` you hand to the EXPORT scripts below.

**5d. Act on each result's `status` (every accepted id appears — nothing is dropped):**
- **`produced`** → go to GATE 3 for that visual.
- **`needs-confirmation`** (a `provenance:"prose"` proposal not yet confirmed) → this is **Gate 2b**:
  show the reconstructed table to the journalist, get an explicit OK, set that proposal's
  `confirmedTable: true` in `accepted.json`, and re-run 5c. Never chart a prose figure unconfirmed.
- **`needs-fallback`** (a native chart type chart-native cannot map) → re-emit a **dw-chart** `ChartSpec`
  for that claim via suggest-chart, replace that proposal's `producer`/`spec` in `accepted.json`, re-run
  5c. Do not hand-translate.
- **`failed`** → surface the `error`; fix the spec or drop the proposal. Never ship a failed visual.

**GATE 3 (render) — per produced visual.**

**3a. Render-review FIRST (mandatory, Layer 2).** Before you show the journalist anything, put the
produced visual through an INDEPENDENT editorial pass per `references/render-review.md`: read the ACTUAL
render + the article + data against the six criteria (title honesty, source traceability, honest
encoding, earns-its-place, legibility/a11y, fidelity). These catch what the spine's code gates cannot —
a title that misstates the metric, a fabricated source, a misleading encoding. Where the harness supports
subagents, SPAWN a fresh reviewer given only the render + article + data + criteria; else review
adversarially (try to falsify). Record it (export is refused without a review record):
```bash
bun skills/atelier/scripts/review-gate.mjs exports/<slug>/report.json <id> [concern...]
```

**3b. Show + approve.** Show the ACTUAL render (open it / a screenshot) TOGETHER WITH the review's
concerns, and get an explicit "ship it". The concerns are advisory — the journalist is the editor.
Verify quality, not just that it built. **After "ship it", record the approval:**
```bash
bun skills/atelier/scripts/gate-render.mjs exports/<slug>/report.json <id> <the-approved-artifact>
```
`gate-render` is the ONLY writer of the render approval; EXPORT refuses any visual not render-reviewed
(3a) AND not approved (3b) — so an unreviewed, unseen, or unapproved render can never ship.

_(Under the hood `produce-all` dispatches to `chart-native/scripts/produce-from-spec.mjs`,
`map-native/scripts/produce.mjs`, `scrolly/scripts/produce.mjs`, and the Datawrapper producers — you
call `produce-all`, not them directly. An omitted map-native format still defaults to `static`, never
the full video set.)_

### 6. EXPORT — GATE 4 (delivery depends on the visual's format)

**Delivery location — stable, never the scratchpad.** Write every hand-over (export folder, mp4, PNG) to
`exports/<slug>/` under the journalist's working directory (the atelier project root), NOT the session
scratchpad — the scratchpad is temporary and gets cleaned, so the journalist would lose the deliverable
(and cannot find it). After delivering, print the file/folder's ABSOLUTE path. `export-code.mjs` refuses
(non-zero) if the export path looks ephemeral. The ship scripts also refuse unless the proposal is
`produced` AND render-approved (GATE 3 done) — pass the report + id so the gate can check.

Branch on the format the journalist chose at CADRAGE / that `suggest-chart` routed to:

- **VIDEO (mp4):** the producer emits three aspect ratios — **landscape** (`*landscape.mp4`, 16:9, for
  article/web/YouTube), **square** (`*square.mp4`, 1:1, for a feed post), **portrait** (`*portrait.mp4`,
  9:16, for Reels/TikTok/Shorts). Confirm which aspect the journalist needs — default it from the CADRAGE
  channel answer (social/vertical → portrait; feed → square; article/web → landscape) — and hand over
  that mp4. A video IS the media — no code/embed forms; just give the chosen file.
- **STATIC IMAGE (a static chart / map PNG):** hand over the `static.png` directly (the aspect the
  producer rendered). A static image IS the media — just give the file.
- **INTERACTIVE or SCROLLY (a self-contained `interactive.html` / `scrolly.html`):** only here do the
  three delivery forms apply — ask which the journalist wants:
  - **Code source (dev — self-host / customise):** run `bun skills/atelier/scripts/export-code.mjs exports/<slug>/<id> exports/<slug>/<id>-export --results exports/<slug>/report.json --id <id>` (the source is the per-proposal build subdir from 5c).
    Hands over a folder with all the built files (`interactive.html`, `static.png`, `static.html`) + an
    `EMBED.md`. Embed the interactive visual with the `<iframe src="interactive.html">` snippet.
  - **HTML statique (one self-contained file, no JS):** the `static.html` produced by `export-code`
    (the image inlined) — a single dependency-free file that embeds in any CMS/email/offline.
  - **Composant en lien embed (hosted, non-technical):** run
    `bun skills/atelier/scripts/deploy-embed.mjs exports/<slug>/<id>/interactive.html <slug> --results exports/<slug>/report.json --id <id> <appName>` → an
    iframe-ready URL to the hosted interactive component. The host is the **journalist's OWN fly.io app**
    (not a shared central host) — pass its name as the 3rd argument or via `$ATELIER_EMBED_APP`. If the
    journalist has not set up their fly.io host yet, offer the code-source / static-HTML forms now and say
    the embed link is pending their one-time setup.

  **One-time fly.io host setup — on the JOURNALIST'S OWN fly.io account** (run once from
  `skills/atelier/embed-host/`; fly.io app names are globally unique, so the journalist picks their own,
  e.g. `<newsroom>-embeds`):
  ```bash
  flyctl auth login                        # the journalist's own fly.io account
  flyctl launch --no-deploy --name <their-app>   # creates their embed host app; commit fly.toml
  flyctl volumes create data --size 1
  flyctl deploy
  ```
  After that, `deploy-embed.mjs <html> <slug> <their-app>` (or `$ATELIER_EMBED_APP=<their-app>`) uploads
  directly to their app via `flyctl ssh sftp shell`. There is no shared default app name — each journalist
  hosts on their own account.

  **Auth:** `flyctl` reads credentials from either `flyctl auth login` (interactive, stored in `~/.fly/`)
  or a `FLY_API_TOKEN` in the environment (create with `flyctl tokens create deploy`). For a headless /
  automated run, put `FLY_API_TOKEN` (and `ATELIER_EMBED_APP`) in `.env` — Bun loads them into the
  environment and `flyctl` picks them up. See `.env.example`.

## Gates

| Gate | Phase | Stop condition | Failure mode if skipped |
|------|-------|---------------|------------------------|
| 1 | CADRAGE | Journalist answers the ≤4 questions + branch chosen | Wrong format, misread intent |
| 2b | PROPOSITION | Journalist confirms prose-extracted data table (fires BEFORE Gate 2 for prose proposals) | Fabricated data attribution |
| 2 | PROPOSITION | Journalist accepts / edits / rejects each proposal | Wrong claim visualised |
| 3 | PRODUCTION | Journalist says "ship it" after seeing the real render | Visual quality not verified |
| 4 | EXPORT | Video/static → give the media file directly; interactive/scrolly → journalist chooses code source / static HTML / embed link | Wrong delivery format |

## Never

- Never skip a gate.
- Never auto-progress from one phase to the next without the journalist's explicit response.
- Never produce a visual before the PROPOSITION / provenance OK (gates 2 and 2b) on the guided path.
- Never export before the render OK (gate 3).
- Never invent data or fabricate a dataset attribution.
- Never conduct the dialogue in a language other than the journalist's (detect from first message).
- Never let the produced visual's furniture (title, intro, source label, scrolly captions) default to English — the detected language is threaded to suggest-article and suggest-chart so the OUTPUT matches the dialogue, not only the chat.
- Never re-decide what a sub-skill (suggest-article, suggest-chart, a producer) already decides — only sequence and gate.
- Never name a chart type in the intent passed to suggest-article or suggest-chart (on the guided path).
- Never ship a visual without the mandatory render-review (Gate 3a) — `assertShippable` refuses a visual with no review record; the review's concerns are advisory but running it is not optional.
- Never edit the engine source (anything under `skills/`) during a journalist run — a bug is REPORTED and routed around, never patched in place. The "feedback → système" convention is for development sessions, not a live newsroom flow.
- Never hand over an INTERACTIVE visual without offering the three delivery forms at GATE 4 — code source, static HTML, and the fly.io embed link — as an explicit choice (machinery: `export-code.mjs` + `deploy-embed.mjs`). A SCROLLY has no static image, so it offers only **code source + embed link** (its embed targets `scrolly.html`, not `interactive.html`) — do not promise a static-HTML form for a scrolly.
