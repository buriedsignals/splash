---
name: splash
description: Use when turning an article and/or its data into a finished, exported data-visualization (chart, map, video, or interactive/scrolly) for a newsroom — the end-to-end entry point for "make me a visual from this". Keywords splash, flow, pipeline, orchestrate, end-to-end, article to chart, produce a visual, embed, export.
---

# splash — the end-to-end flow

## Overview

The single entry point that turns an article and/or data into a finished, exported visual. It runs
six ordered phases with explicit human gates and never re-decides what a sub-skill already decides —
it sequences and gates. Conduct the ENTIRE dialogue in the journalist's language (detect it from
their first message).

## Voice — what the journalist reads

Everything below this line describes the MACHINERY. What the journalist reads is a different
register, and these three rules govern it. They are not style advice: each one closes a miss
observed on a real run.

### The progress map — SHORT, and re-shown in EVERY message to the journalist

Open every MESSAGE TO THE JOURNALIST with the same six-line map of the journey, the current step
marked, and nothing else. (Not every internal turn: most turns are tool calls the journalist never
sees, and the map belongs on the ones he reads.) It is re-displayed on every one of them, so
anything longer than six short lines turns into noise and stops being read — no sub-steps, no
question counts, no gate ids, no explanations.

```
  ✓ lire l'article
  ▸ cadrer l'angle          ← on est là
    choisir la forme
    produire
    vérifier
    livrer
```

The six ARE this flow's own phases, renamed for the person reading them: `INPUT`+`ANALYSE` → *lire
l'article* · `CADRAGE` → *cadrer l'angle* · `PROPOSITION` → *choisir la forme* · `PRODUCTION` →
*produire* · `GATE 3` → *vérifier* · `EXPORT` → *livrer*. The labels above are an EXAMPLE in one
language: write them in the JOURNALIST's language, like every other line you emit — and then keep
that exact wording for the whole session (a map whose labels drift is a new map each turn).

### The internal names never reach the journalist

`Gate 1b`, `Gate 2b`, `Gate 2c`, `Gate 3a/3b`, `Stage 1`, `Stage 2`, `Q6`, `5b`, `produce-all`,
`accepted.json`, `EDITORIAL:` are the vocabulary of THIS document, of the code, and of the QA
checks — they stay exactly as they are everywhere except in a message to the journalist. Observed
leak, verbatim from a real session: `**Gate 1b — je te relis le message exact avant de
continuer.**` · `**Gate 2b — les chiffres viennent de la prose…**` · `**Gate 2c — la source.**`
The journalist has no idea what a "Gate 1b" is; the map above is what tells him where he is.

| Internal (unchanged everywhere else) | What the journalist reads |
|---|---|
| CADRAGE / Gate 1 | cadrer l'angle |
| Gate 1b | le message à retenir |
| Gate 2b | vérifier les chiffres de l'article |
| Gate 2c | d'où viennent les chiffres |
| PROPOSITION / Gate 2 | choisir la forme |
| Stage 1 / Stage 2 | *never named* — one list of options, then the one chosen |
| Gate 3a | ma relecture du visuel |
| Gate 3b | tu le regardes, tu valides |
| EXPORT / Gate 4 | comment tu veux le récupérer |

The right-hand column is a MAPPING, not a set of French strings: write it in the journalist's
language. The left-hand column keeps its names in the code, the guards, `docs/splash/guardrails.md`
and the harness checks — this is a presentation change, never a rename.

### Say what happened and what is asked — never what you are doing to yourself

What you emit is a message FOR the journalist: it states the fact and the decision being asked of
him. It never narrates the orchestrator's own process, bookkeeping, or self-instructions.

- Observed, verbatim: « Gate 1b — je te relis le message exact avant de continuer. **Tel que je
  l'ai formulé**, il a deux parties… » → « Le message que je retiens : … — c'est bien ça, ou tu le
  formulerais autrement ? »
- A script's MACHINE line is never relayed verbatim: `EDITORIAL: unsigned — LLM render-approval
  only`, `EXPORT_FORMS_JSON`, `EXPORT_CODE_RESULT`, `produce-all`'s report JSON. Read it, then say
  what it MEANS. The scripts that have something a person should hear print it on their own line —
  the `SIGNOFF: …` sentence beside `EDITORIAL:` (already in the journalist's language,
  `lib/newsroom/ui-copy.ts`), and the `EXPORT_FORMS_PROPOSAL` block beside `EXPORT_FORMS_JSON`.
  Relay THOSE.
- Say the consequence, not the mechanism: "nobody in the newsroom has signed this off" is the
  fact; "LLM render-approval only" is the machine talking about itself.
- **A FAILURE is never hidden and never softened — but it is not a bug report handed to the
  journalist.** A non-zero exit or a gate refusal ALWAYS reaches him (§5d, and the Never list):
  he is told, plainly, that a step failed, what it means for his article, and **what to relaunch
  or decide**. What does NOT reach him is the diagnosis — the file and line, the function name,
  the hashes, the internal registry id, the reasoning about which guard misfired. He is a
  journalist on deadline, not a maintainer of this tool: **he will never fix a Splash defect, so
  never write to him as though he might, and never ask him to arbitrate one.**
  Rewriting a failure into reassuring prose is the papering-over this flow forbids; pasting the
  engine's internals at him is the opposite mistake, and it is just as much a defect.
  So, in a message to the journalist: **the fact and the next action, never the cause.**
  - Observed, verbatim, and it is the reason this rule exists (2026-08-05, a real run): « Le garde
    vérifie donc la mauvaise pièce […] situé exactement à `skills/splash/src/export-guard.ts:26-31`
    (la sélection du fichier) utilisé ligne 75 », followed by three sha256 digests and a choice
    between "take the file as-is" and "we fix the defect first". None of that is his decision to
    make, and none of it is his to read.
  - What he should have read: « Une erreur bloque la livraison — le visuel est produit et validé,
    mais je ne peux pas te le remettre proprement. Le fichier est ici : <chemin>. Il faudra
    relancer la livraison une fois le problème corrigé de mon côté. »
  - **The diagnosis is still WRITTEN — just not to him.** It goes where the next development
    session reads it (the backlog / a defect note), with the measurements that make it actionable.
    Suppressing the technical detail from the CHAT is not suppressing it from the RECORD; a defect
    surfaced only in a conversation the journalist closes is a defect lost.

## The flow (run in order; every gate is a hard stop)

### How to invoke a nested skill — read this before step 2

Two steps below tell you to invoke another skill (`suggest-article` at ANALYSE, `suggest-chart` at
PROPOSITION). **Invoking a nested skill is a HOST ACT, and it has a different shape on every
host** — a `Skill` tool on one, `load_skill(name: "suggest-article")` or `delegate` on another,
and on a third nothing at all. Use whatever your host provides, in this order:

1. **Your host's own facility for loading another skill**, whatever it is named there. Pass the
   skill's name as written here (`suggest-article`, `suggest-chart`), plus the paths you already
   have (the article, the data, the run directory).
2. **If your host has none — or it answers that no such skill/tool exists: open that skill's own
   `SKILL.md` on disk** (`skills/suggest-article/SKILL.md`, `skills/suggest-chart/SKILL.md`) and
   **read it and follow it step by step**, running the scripts it names. This option always
   exists: the files are in this repository, beside the one you are reading.

**A skill is not a tool: never invent a tool name from a skill name.** There is no
`suggest_article` tool. A host replying « no such tool »
**is not permission to do the step from memory** — option 2 is still there, and doing the analysis
or the routing inline skips the KB grounding and the eval-hardened guardrails that are the only
reason those skills exist.

**What proves the step happened is the file it leaves in the run directory** — `opportunities.json`
for `suggest-article`, `candidates.json` for `suggest-chart` — **not a name in `skillsInvoked`**.
The spine reads those files: production stops when the record claims sub-skills the run directory
holds no trace of (`skills/splash/src/attestation-corroboration.ts`).

## The six phases

Each phase is a skill of its own. Invoke it AT the moment its phase begins — not earlier, not from
memory. **If the skill does not load, STOP and tell the journalist.** Do not improvise the phase:
a phase run from memory has fewer rules in context than before this file was split, which is the
one new failure mode the split creates.

**1-2. INPUT + ANALYSE** — freeze what the journalist brought and profile it silently. No gate.
**Invoke `splash-input` now.**

**3. CADRAGE** — establish the editorial intention and the truth of the data. Ends on gates 1, 1b,
2b, 2c. Receives: the article and/or data frozen by INPUT.
**Invoke `splash-cadrage` now.**

**4. PROPOSITION** — turn the framing into one pinned visual element. Ends on gate 2. Receives:
the confirmed takeaway, the channel, the source.
**Invoke `splash-proposition` now.**

**5. PRODUCTION** — build the pinned format and surface it before asking anything. Ends on gate 3.
Receives: the run directory and the pinned format.
**Invoke `splash-production` now.**

**6. EXPORT** — offer the delivery forms, wait for the choice, build only that one. Ends on gate 4.
Receives: the approved artifact and its run directory.
**Invoke `splash-export` now.**


## Context recovery

*(Step numbers here and in the stall protocol are the canonical 12-step sequence: 1 read
prompt · 2 article ask · 3-7 CADRAGE (branch, takeaway, table, source, constraints, channel)
· 8 batched propositions · 9 produce · 10 ship-it · 11 delivery forms · 12 other-format
offer.)*

All flow state lives in files under `exports/<slug>/` — never in conversation memory. On any
interruption (compaction, crash, resumed session), determine the position from artifact
PRESENCE and resume there:

| Present | Resume at |
|---|---|
| nothing / article only | CADRAGE (steps 3-7) |
| `candidates.json`, no `accepted.json` | step 8 — re-present the saved candidates, await the choice |
| `accepted.json`, no `report.json` | PRODUCTION (produce-all the accepted entries) |
| `report.json`, no `<id>-export/` | EXPORT (Gate 4 / delivery-form proposal) |
| `<id>-export/` complete | step 12 — offer another format |

A DECLINED choice leaves a marker file (e.g. `<id>-export/DECLINED.txt` with the declined
form and timestamp), so absence-of-action is distinguishable from not-yet-asked.

## Stall protocol

After 2 produce failures OR 2 successive Gate-3 rejections on one element, stop with exactly
this shape — never silently retry a third time, never drop the element:

> « Je bloque sur {élément} : {raison concrète}. Options : (a) un autre type de la sélection,
> (b) abandonner cet élément, (c) me donner une consigne précise. »

Wait for the journalist's decision. (a) re-enters step 8 with the remaining candidates; (b)
records the element as abandoned in the recap; (c) applies the instruction then re-produces
(counts toward the same bound).

## Gates

| Gate | Phase | Stop condition | Failure mode if skipped |
|------|-------|---------------|------------------------|
| 1 | CADRAGE | Journalist answers the up-to-6 questions (Q6 channel LAST; conditionals skipped) + branch explicitly chosen or confirmed back | Wrong format, misread intent |
| 1b | CADRAGE (+PROPOSITION per element) | Takeaway stated back and EXPLICITLY confirmed by the journalist — never inferred-and-skipped; asked openly on GUIDED, confirmed via confirm-back on DIRECT (both branches) — and recorded VERBATIM as `confirmedTakeaway` on every accepted proposal (5b; the spine's validation gate fails a proposal without it). On a multi-element article, ONE takeaway PER accepted element — never a shared combined string; each element's own claim is confirmed at PROPOSITION if CADRAGE only confirmed a combined framing | Visual carries an unconfirmed/guessed claim; title diverges from the journalist's intent (or silently drops one part of a multi-part takeaway); a combined takeaway stamped on several elements dilutes each title check |
| 2b | CADRAGE (Q3) | Journalist confirms prose-extracted data table (fires BEFORE anything is routed, prose figures only) | Fabricated data attribution; a wrong table invalidates an already-routed proposal |
| 2c | CADRAGE (Q4) | Source established BEFORE routing, on EVERY run: name + a specific traceable URL, or the honest prose fallback (genuine no-dataset case, or a hedged/uncertain source left unconfirmed — never a confident citation over « je crois »/« de mémoire ») | Weak/generic/name-only source ships, or admitted uncertainty ships dressed as a verified citation — caught only late (after a full produce→review cycle) by the render-review |
| 2 | PROPOSITION | Journalist answers the batched candidates message — per opportunity: pick a candidate, EDIT it (change a field of the chosen candidate's spec), or « aucun » (veto) — and the derived format is announced for veto | Wrong claim visualised; a single take-it-or-leave-it proposal hides the reachable alternatives |
| 3 | PRODUCTION | Journalist says "ship it" after seeing the ACTUAL render (re-run in full — 3a then 3b — after every re-produce, never reused from a prior render) | Visual quality not verified; a re-produced render ships on a stale sign-off |
| 4 | EXPORT | Video/static → give the media file directly; interactive/scrolly → relay the emitted three-form proposal and the journalist chooses ONE: code source (runnable `<id>-source/` React bundle — chart-native, map-native, scrolly) / HTML autonome (single self-contained file) / embed (hosted link) — `--form` only runs AFTER their answer; per element on a multi-element delivery (a grouped answer like « embed pour les deux » is accepted from the journalist, never presumed) | Wrong delivery format; or the proposal collapsed to a bare "Livré." with nothing handed over; or the form auto-decided — `--form` ran (« je finalise pour les deux ») with no journalist answer to the proposal |

The full scripted-guard inventory lives in `docs/splash/guardrails.md`.

## Never

- **Never present a chart drawn in the chat as a deliverable, and never enable a host extension to
  draw one.** Hosts ship visualisation extensions that render a chart inside the conversation
  (Goose's `autovisualiser` is one). Whatever splash produces goes through a producer and comes out
  as **a file under `exports/`** (or, for the embed form, a URL the export step itself created) —
  a picture in the chat window is neither, and calling it « le visuel est prêt » is a false
  delivery: no channel pin, no format pin, no conformance pass, no source credit, no review, and
  nothing the newsroom owns. This is not hypothetical: it was measured on 2026-08-03, where a run
  that could not invoke a nested skill went to the host's extension manager, **turned such an
  extension on mid-run** — the config had it disabled — and announced a visual that no file backed
  (`docs/installer/goose-desktop-proof.md`). So the ban covers the enabling too, not only the
  drawing. If a step cannot run, the honest move is the one the Never list gives everywhere else:
  say so and stop. **Nothing is ready until a producer wrote a file.**
- Never skip a gate.
- Never auto-progress from one phase to the next without the journalist's explicit response.
- Never produce a visual before the PROPOSITION accept (gate 2) on the guided path, nor before the CADRAGE data truth (gates 2b/2c) on either branch.
- Never export before the render OK (gate 3).
- Never invent data or fabricate a dataset attribution. This covers EVERY required value the source does
  not state — not just a chart series, but a **coordinate (lon/lat), a date/year, a dimension label, or a
  number**. If a required value is absent from the article/data, splash has exactly three honest moves:
  **stop and ask the journalist**, run a **real deterministic step** (e.g. a geocoder for coordinates —
  an actual API lookup, never a recollection), or **decline that visual** / fall back to one the data can
  support. Synthesizing the value from the model's own knowledge — a metro station's coordinates, a year
  where the text only said "cette année"/"this year" — is fabrication, and it is never allowed even when
  the guess would "probably" be right. (Reinforced at the extraction boundary in
  `suggest-article/SKILL.md` and the coordinate boundary in `suggest-chart/SKILL.md`.)
- Never fold two distinct opportunities into one visual. Each `suggest-article` opportunity gets its OWN
  Gate-2 accept decision and its OWN `suggest-chart` routing call (PROPOSITION); stapling a second
  series/claim onto an already-routed chart silently drops that opportunity from the journalist's view
  and skips its routing — surface and route each one separately. The same per-element rule holds for the
  takeaway: never stamp one combined takeaway string onto several elements' `confirmedTakeaway` — each
  accepted element carries its OWN confirmed claim (Gate 1b), or the Gate-3a title check compares every
  title against a claim that partly belongs to another visual.
- Never offer the journalist a CADRAGE takeaway framing the supplied data cannot support (a temporal /
  "widening gap" framing on single-snapshot data, a per-capita framing on absolute counts). Constrain the
  offered options to the ANALYSE data shape; if the wanted framing needs data you don't have, say so and
  ask for it — never invent the series to justify the framing.
- Never ask the FORMAT as a standalone question turn — no « Interactif ou image statique ? » menu,
  ever. The format derives from channel × type and is
  announced FOR VETO inside the same message as the chosen candidate's spec (Stage 2); the
  journalist changes it by replying to that announce, never by answering a dedicated format question.
- Never conduct the dialogue in a language other than the journalist's (detect from first message).
- **Never emit an internal name to the journalist** — `Gate 1b`, `Gate 2b`, `Gate 2c`, `Gate 3a/3b`, `Stage 1/2`, `Q6`, `5b`, `produce-all`, `accepted.json`, `EDITORIAL:`. They stay in the code, the guards and the QA checks; the journalist gets the six-line progress map and the plain-language step name (§Voice). Observed leak: `**Gate 1b — je te relis le message exact avant de continuer.**`
- **Never drop the progress map**, and never let it grow: six short lines, the same wording all session, the current step marked, re-shown in every message to the journalist (not on internal tool turns he never sees). A map that gets longer stops being read; a map that changes wording is a new map each message.
- **Never hand the journalist a technical diagnosis, and never ask him to arbitrate a Splash defect.** When something in the tool fails, he is told THAT it failed, what it costs his article, and what to relaunch or decide — never the file, the line, the function, the hash, the internal id, or the reasoning about which guard misfired. He will not fix this tool; writing to him as though he might turns a delivery into a bug report and makes him carry a decision that is not his. The failure itself is never hidden or softened (§Voice, §5d) — only its internals stay out of the chat, and the diagnosis is written to the backlog/defect note instead, where the next development session reads it.
- **Never narrate your own process.** What you emit is a message FOR the journalist — what happened and what is being asked of him — never what the orchestrator is doing to itself (« Tel que je l'ai formulé, il a deux parties… », « je te relis avant de continuer », « préflight vert »). And never relay a script's MACHINE line verbatim (`EDITORIAL: unsigned — LLM render-approval only`, `EXPORT_FORMS_JSON`, `EXPORT_CODE_RESULT`, the report JSON): say what it means, or relay the journalist-facing line the script prints beside it (`SIGNOFF: …`, `EXPORT_FORMS_PROPOSAL`).
- **Never read the absence of a DECLARATION as the absence of the FACT.** No `NEWSROOM-PROFILE.md` does not mean the newsroom has no graphic charter — it means nobody declared one here, so ASK once (CADRAGE Q5) and take the honest default only after a no/unknown, announcing it. No key does not mean the capability does not exist — it means the journalist has not given the key yet (§INPUT). This is the rule `lib/source/policy.ts` already enforces for sources (`source-undeclared`, never inferred), applied to the two other places splash was inferring silently.
- **Never let a green preflight pass in silence, and never report it as a count or as a check on itself** (« les six moteurs sont prêts (préflight vert) »). Say, in three lines maximum, what the journalist HAS and what it lets him make, using the engines' newsroom labels — he should not have to infer his own capabilities (§INPUT, green path).
- Never let the produced visual's furniture (title, intro, source label, scrolly captions) default to English — the detected language is threaded to suggest-article and suggest-chart so the OUTPUT matches the dialogue, not only the chat.
- **Framing (read before the hand-authoring/hand-planting bullets below):** these prohibitions are no longer the primary defense — they are now backed by a STRUCTURAL, mechanical one. The export gate's `assertChainProvenance` (`skills/splash/src/render-provenance.ts`, wired into `export-code.mjs`) refuses to ship any artifact whose chain does not trace `candidates.json → accepted.json → produce-all → outputs`: a hand-authored spec or a hand-planted output has no valid chain and is refused, not merely discouraged. The bullets below remain in force as guidance that reinforces an enforced boundary — read them, but the boundary no longer depends on reading them.
- Never re-decide what a sub-skill (suggest-article, suggest-chart, a producer) already decides — only sequence and gate. This means actually INVOKING `suggest-article` (ANALYSE) and `suggest-chart` (PROPOSITION routing) as real Skill calls, not hand-authoring their output from memory/inspection — their eval-hardened guardrails and KB grounding only fire when they genuinely run. This holds for the FIRST routing AND for any LATER change to the chosen element/format (a journalist request mid-flow, a fallback, a retry after a failed gate): re-invoke `suggest-chart` again with the new signal — never re-decide it yourself by grepping producer source and hand-authoring/`Write`-ing a `spec.json`; only `suggest-chart`'s own re-run re-validates the choice and re-applies its guardrails.
- The component/producer for a visual type is a REGISTRY LOOKUP (`register-producers` / the producer registry), never a `src/` inspection — do not grep an engine's `src/` to discover or author a spec's shape. Producer DISPATCH is resolved through the registry (`lib/core/registry.ts` + `register-producers.ts`), and a spec's SHAPE comes from `suggest-chart`'s own output, never from reading engine source; grepping producer source to author a spec has no legitimate reason to exist. (This is distinct from splash's own sanctioned direct validator imports — `validate-gate.ts` et al. call each engine's `validate*` at Gate 2; `import-guard.test.ts` guards engine↔engine coupling, not the orchestrator's reach.)
- Never name a chart type in the intent passed to suggest-article or suggest-chart (on the guided path).
- Never ship a visual without the mandatory render-review (Gate 3a) — `assertShippable` refuses a visual with no review record; the review's concerns are advisory but running it is not optional. The ledger inside that record is not self-graded either: `review-gate.mjs` runs every `mechanical` probe itself and its outcome is the command's real exit code, never what you wrote for it, and any `editorial` probe requires `--reviewer <name>@<version>` naming who made the judgement or the review is refused.
- Never call `gate-render` (Gate 3b) right after a re-produce (any re-run of 5c — a source fix, a fallback swap, a retry) without first re-running `review-gate` (Gate 3a) on the NEW render. `produce-all` always writes a WHOLLY FRESH `report.json` — every proposal in that run comes back unreviewed and unapproved (`renderApproved:false`), even one that was already signed off before the correction — so the review MUST run again on what actually changed. Do not treat the script's hard refusal ("not render-reviewed") as the safety net to rely on; redo Gate 3a → 3b in order every time, and never hand-edit `report.json` to restore a prior review/approval onto a new artifact. Likewise never hand-author a file into the producer's build subdir `exports/<slug>/<id>/` to give `gate-render` something to approve — its provenance check refuses any file the pipeline did not emit for the CURRENT produce generation; a hosted-DW interactive (no local render) is approved via a fresh capture under `exports/<slug>/_review-artifacts/<id>/`, never a stand-in file next to the producer outputs. This is now backed mechanically too: `gate-render` reads the presentation receipt written by `bun lib/host/cli.ts present --path <artifact>` and refuses an approval whose shown bytes do not match what the artifact holds NOW — a receipt only covers the exact bytes it recorded, so approving a re-produce that actually CHANGED the artifact without first re-showing (and re-reviewing) it is a hard refusal, not just a rule to remember (a re-produce that happens to be byte-identical to what was already shown is, honestly, still covered by that receipt — the mechanism binds to bytes, not to "which produce ran").
- Never ask the journalist to validate/approve/"ship it" a render before it has been SURFACED to them (see 3b: `SendUserFile` the artifact, or state the live URL, on its own line, BEFORE the ask). A described render ("barres violettes, fracture 83/16") is not a shown render — the journalist must actually SEE the file/URL first, every time, with no exception for a re-produce, a small fix, or a format the orchestrator considers self-evident. This is a non-skippable step of Gate 3b, not advisory. This is now MECHANICAL, and the duty is one command: `bun lib/host/cli.ts present --path <artifact>` opens the artifact and records which bytes were opened. The approval gate reads that record itself — `gate-render` refuses an artifact nobody has been shown, and refuses one that has CHANGED since it was shown, naming what to do about it. The QA check remains as the after-the-fact net; it is no longer the only thing standing between a described render and a journalist's "ship it".
- Never CREATE or edit ANY product source file (anything under `skills/` — a producer/component `src/*.ts`/`.tsx`, a `scripts/*.mjs`, a reference) during a journalist run — splash ORCHESTRATES and GATES; it does not author engine code. A bug is REPORTED and routed around, never patched in place. The "feedback → système" convention is for development sessions, not a live newsroom flow. This holds with NO exception for making a produce/conformance gate pass: never edit a producer/component's source code (`skills/*/src`, any `.tsx`/`.ts` producer file) mid-PRODUCTION to turn a failing gate green — a real newsroom journalist cannot patch the engine, so splash must not either. If a produce or conformance gate fails because of a genuine engine bug (not a spec/data problem), SURFACE the bug to the journalist, do NOT ship that visual, and do NOT patch the code — the bug is reported, never worked around. **The "create" half is not hypothetical: never AUTHOR a NEW ad-hoc script** — a case-named `verify-<case>.mjs` written into a skill's `scripts/` to satisfy a gate is the same violation as editing existing code. splash runs ONLY the scripts the pipeline ships (`produce-all` / `review-gate` / `gate-render` / `export-code` and the producers' own snaps); a gate that needs a script the pipeline does not provide means the FLOW is wrong — STOP and surface, never write the missing script yourself. (The QA harness `check:product-source-hot-patch` flags any Edit/Write under a skill's `src/`/`scripts/`; the rule is the product contract, that check is the net.)
- Never hand-author or copy files into a producer's output directory (`exports/<slug>/<id>/` or any
  build subdir) to satisfy a gate. The file-based gates (`gate-render`, `assertDelivered`,
  `export-code.mjs`'s hosted-DW detection) read those directories as PRODUCTION'S OWN record — a
  hand-planted artifact (e.g. a `hosted-embed.html` written by hand so `gate-render` has a file to
  hash) poisons every downstream detection that keys off the directory's
  contents and forces manual mid-flow cleanup. If a gate needs an artifact that production did not
  emit, the FLOW is wrong upstream — re-produce properly (re-run 5c) or fix the gate invocation (point
  it at the file production actually emitted) — never fabricate the file the gate expects.
- Never work around a NON-ZERO produce/exit or a FAILING gate by any means — not by re-authoring code, not by hand-editing outputs, not by an ad-hoc script, not by silently retrying with hidden changes. (The ONE sanctioned
  retry is the bounded retry above: a single re-run quoting the error verbatim with shape-only
  fixes, announced — anything beyond it is this violation.) A non-zero exit from `produce-all` (or any gate refusal) is a HARD STOP that is SURFACED to the journalist AS-IS, never quietly papered over so the run can continue. This is the exit-code analogue of the spec/code rules above: a conformance violation that surfaced, a `produce-all` that exited 1 during a legitimate re-produce, a snap that failed — each is reported to the journalist and the visual does NOT ship, not massaged until the command returns 0. If the failure is a genuine spec/data problem, fix the spec through the proper gate (re-open GATE 2 for a changed spec, 5d) and re-run; if it is an engine bug, report it and route around — but the non-zero result itself is never hidden. (The QA harness `check:conformance-no-fabrication` flags a conformance violation or a produce exit=1 that the run continued past instead of surfacing.) A refusal now arrives ROUTED: it names what is missing AND the act that resolves it, so "surface it as-is" and "tell the journalist what to do next" are the same sentence. Two of these refusals can no longer be walked past at all — production does not start without the ranked list of visuals (the batch stops before any engine runs), and the folder the build worked in is refused as a hand-over. Both answer to `bun lib/host/cli.ts precheck`.
- Never do ad-hoc file operations (`mv`/`cp`/`mkdir`/`find`-and-move) to RELOCATE a mis-pathed artifact. If a script (or a manual capture) wrote to the wrong place, that is a BUG to surface and fix at the source — not to paper over by shuffling the file into the position a gate expects. The correct move is to RE-CAPTURE at the absolute run-scoped path (Gate 3b's provenance refusal names that absolute path, `src/render-provenance.ts`; the capture instruction specifies it — see 3b), never to move a stray file into place. Relocating a mis-pathed artifact is the same class of improvisation as hand-planting one: it makes a gate pass on something production did not honestly put there.
- Never silently mutate the ACCEPTED SPEC (`baseColor`, format, etc.) mid-PRODUCTION to route around a conformance-gate failure — this is the spec analogue of the rule above ("never edit product code" → "never silently edit the accepted spec to bypass a gate"). A conformance failure is SURFACED to the journalist as-is; if the spec must change to fix it, GATE 2 is re-opened for re-acceptance of the changed spec. The produce-time conformance guards exist precisely so a non-conformant visual never ships unseen.
- Never hand over an INTERACTIVE/SCROLLY visual without running `export-code.mjs` (two-phase): phase 1 (no `--form`) EMITS the a/b/c proposal building NOTHING; phase 2 (`--form <html|code-source|embed>`) builds + delivers ONLY the chosen form, gated by `assertDelivered`. Never run phase 2 — for ANY element — before the journalist's message answering THAT delivery-form proposal exists: « la seule forme possible est c, je finalise (pour les deux) » is auto-deciding, the named violation. A single-offered-form (hosted-DW) proposal still waits for the journalist's confirmation; on a multi-element delivery the choice is per element (forms may differ), and a grouped answer (« embed pour les deux ») is only ever GIVEN by the journalist, never presumed by splash. Never build all forms unconditionally, and never fabricate a no-JS `static.html` fallback — that fallback is GONE (accessibility is the `static` FORMAT choice at CADRAGE). Never mark an interactive/scrolly delivered on produce-time outputs alone — a Gate-3 review PNG / `interactive.png` / a build byproduct is NOT a delivery; only the `export-code --form <chosen>` artifact is (enforced mechanically by `assertDelivered`, and checkable directly before hand-over with `bun lib/host/cli.ts precheck --stage export --dir <exportDir> --format <f> --form <chosen>` — a non-zero exit names the build marker still sitting in the folder). A hosted-DW interactive delivers ONLY via `--form embed` (its live `publicUrl`) — it has no React source and no standalone local html.
- Never spawn an Agent/Task sub-agent mid-flow — during the splash flow you ONLY sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing (e.g. an agentId) into the journalist-facing conversation.
- Never ship a source that is name-only for a NAMED dataset/publication (e.g. "Eurostat") — it MUST carry both a label and a real, verifiable URL; never fabricate a URL to fill the field. (The honest prose fallback — "Figures as reported in this article" / the outlet's own name — is the legitimate name-only case: when the data names no separate dataset to link, or when the journalist's hedged recollection of a source stays unconfirmed, per Gate 2c's uncertainty rule.) Establish this proactively at Gate 2c (CADRAGE Q4), before PRODUCTION — never wait for the render-review to be the first thing that catches it, and never reach for the prose fallback just because the journalist has not answered yet. And never ship a flat, confident-looking citation over a source the journalist only HEDGED at (« je crois », « de mémoire ») — confirmed exactly, or the honest fallback (Gate 2c). A *fabricated* placeholder URL is worse than none and is now MECHANICALLY refused: the spine's validation gate (GUARD 2, `src/source-guard.ts`) rejects any source URL on a reserved placeholder domain (`example.com`/`.org`/`.net`, or the `.example`/`.test`/`.invalid`/`.localhost` TLDs, RFC 2606/6761) — the proposal fails to produce rather than shipping a fake citation.
- Never accept a generic organisation homepage (e.g. `eurostat.ec.europa.eu`, `insee.fr`) or an unverifiable/404 URL as the source — it must be treated exactly like a missing URL. The source MUST point to the SPECIFIC, traceable dataset/page the figures come from (the Eurostat dataset page for the exact table, the Insee series page, …). If the journalist only gives an organisation name or its homepage, ASK for the specific dataset/page reference rather than shipping the generic one (see Gate 2c) — in the SAME free-text turn, never as a separate follow-up question.
- Never ship a title that narrows or diverges from the takeaway the journalist confirmed at CADRAGE (Gate 1b) — e.g. a specific multiplier ("2x") standing in for a confirmed "widening gap" insight, a scope word ("Nordic") that excludes an entity the visual actually shows, or ONE HALF of a two-part takeaway standing in for the whole (the fall without the confirmed "only riser", a regrouping that contradicts the confirmed grouping). If the data supports more than the title states, widen the title or flag it at Gate 3. The confirmed wording lives VERBATIM in each proposal's `confirmedTakeaway` (5b) precisely so Gate 3a can quote it and check every part — a render-review that skips that quote is invalid (see 3a).
- **D16 — when the title can't carry the whole confirmed takeaway, splash still SHIPS it and shows BOTH.** A title carrying only part of what was confirmed, or a title that says more than was confirmed, is never a block on its own — `detectTasteRisks` (`lib/verify/taste.ts`) routes both to the verdict-free `human-signoff` lane as a SIGNAL, and `juxtaposeTitleAndTakeaway` prints the two lines side by side at sign-off (« you confirmed: … » / « the title reads: … ») so the journalist reads both and decides — never a machine guessing which one is right. State this plainly, because it is a real limit, not an oversight left to close later: in the PROSE chain (no loop, no mechanical gate), that juxtaposition depends on the same actor who wrote the title in the first place being the one who also reads it back — there is no forced moment putting the two side by side before a DIFFERENT set of eyes. There is therefore **no forced moment** in prose for this signal, by construction — closing that is a **family-A dependency** (an editorial forced-moment mechanism at sign-off), not a gap family B's carrier/reader work can close on its own.
- Never silently substitute a value from a prior/stale export when it disagrees with the journalist's current article/data — the values used (and shown at Gate 2b) MUST always be the ones the journalist provided in the current session.
- Never offer the journalist an element/format (or sub-format) option before confirming — via `suggest-chart`'s reachability, not from memory — that it is actually producible. Retracting an offered option as infeasible forces the journalist to re-answer the same decision multiple times; check first, propose only what's confirmed.
- Never keep the conversation going after the journalist signs off. Once the deliverable is handed over and the journalist signals completion (a pure thanks/goodbye with no new request), send AT MOST ONE brief closing message and treat the session as ENDED — no new questions, no repeated farewells, no re-engagement, no echoing further goodbyes back.

## Reference (consult on demand)

The hot path above is the whole flow. The material below is consulted only when a specific case
needs it — it is NOT part of the live decision ladder. Guard mechanics: `docs/splash/guardrails.md`.

### One-time Cloudflare setup (only when a journalist first picks the embed form)

Full setup steps (the three `.env` values, token creation, `deploy-embed.mjs` mechanics, and the
two platform rules it enforces — project-name-must-identify-the-newsroom, slug normalisation) are
in **`references/cloudflare-setup.md`** — open it the first time a journalist picks the embed
form. Essential rule to keep in mind even without opening it: `SPLASH_EMBED_PROJECT` must be a
name that identifies the newsroom (generic names like `splash`/`demo` are refused by the adapter).
