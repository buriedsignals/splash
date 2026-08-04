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
- **A FAILURE is the one exception, and it is not an exception to this rule but to its habit:** a
  non-zero exit or a gate refusal is still surfaced AS-IS, verbatim, never softened and never
  hidden (§5d, and the Never list) — add the plain sentence saying what it means for the
  journalist, but the machine's own words travel with it. Rewriting a failure into reassuring
  prose is the papering-over this flow forbids.

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

### 1. INPUT

Accept: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a bare
topic. Normalise to `{ article?, data?, topic? }`. Do not proceed until you have at least one.

**Keys are a PREREQUISITE — collected in the flow, never a mid-production crash.** Run
`bun lib/host/cli.ts newsroom` at INPUT. It answers with `capabilities` (each `id`, `label`,
`status`, and a `reason` carrying the get-it URL), plus `language`, `publisher` and `blockers`.

**Why that command and not `preflight.mjs`:** measured, the loop's readiness knows strictly more.
Preflight reports SIX production engines and nothing else. `newsroom` reports **twelve**
capabilities — those six engines PLUS the six delivery routes (`embed-cloudflare`, `zip`,
`embed-cms`, `embed-s3`, `embed-fly`, `embed-hosted`), each with its own status. It also resolves
env alternative groups, non-secret settings from `newsroom.json`, installed npm dependencies, and
probes the headless browser Remotion needs against a 1 MB floor.

That difference is not cosmetic: with preflight alone, INPUT can tell the journalist what he can
MAKE and says nothing about how he can PUBLISH — so he discovers at EXPORT that his route was
never configured, on a finished visual. The loop knew at INPUT. Say it at INPUT.
(`preflight.mjs` still exists and still works; it is simply the narrower of the two.)

When the report shows key-less engines on a
fresh install (no `.env`, or every engine yellow), tell the journalist what each missing key
unlocks (the `reason` strings carry the get-it URLs) and COLLECT them — one free-text prompt per
key, then save via `bun skills/splash/scripts/save-key.mjs <NAME> <value>` (the ONLY sanctioned
way a key reaches `.env` — never hand-edit the file, never echo the value back), then re-run
preflight and confirm. A journalist who wants to skip a key skips the engines it unlocks — the
Stage-1 candidates stay annotated, nothing is silently hidden.

**The GREEN path has a script too — say what he HAS, not that a check passed.** The red path above
is scripted in detail and the green one used to be scripted not at all, so a journalist whose
install was fine learned nothing about his own capabilities. Observed, verbatim, and it is the
WHOLE of what that run told him — inside a parenthesis, in a sentence about something else: « Les
six moteurs sont prêts (préflight vert) ». « Préflight vert » is a check reporting on itself;
« six moteurs » is a count of things he cannot name. Instead, in the journalist's language, in
**three lines maximum**, say what is available and — one short clause each — what it lets him
MAKE. Each engine entry of the preflight report carries a newsroom-facing `label` (`ENGINE_LABELS`,
`skills/splash/src/preflight.ts`): those labels are the SOURCE of what is ready, **not the
wording** — read them, then GROUP them into the journalist's capabilities. Six engine labels
listed one by one would blow the three-line budget, name a SaaS vendor in journalist copy, and
expose an in-house/hosted split he has no use for. `dw-chart` + `chart-native` ⇒ « des
graphiques » · `map-dw` + `map-native` ⇒ « des cartes » · `scrolly` ⇒ « un scrolly » ·
`image-native` ⇒ « un récit photo ». Never the producer ids, never the raw labels, never a bare
count:

> « Tout est en place : je peux te faire des **graphiques** (statiques, interactifs ou en vidéo),
> des **cartes** (idem), un **scrolly** qui se déroule au défilement, et un **récit photo** si tu
> as les images. »

**Say that the check RAN, not only what it found.** Observed: a journalist who could not tell whether
the keys had been verified at all. One clause is enough and it belongs in the same breath as the
capability line — « j'ai vérifié tes accès : … ». A silent check and an absent check read identically
from the outside, and the whole point of doing it at INPUT is that he stops worrying about it.

**Then one line on PUBLISHING, from the same answer** — the six delivery capabilities, grouped the
same way and never listed one by one: `zip` ⇒ « un paquet à télécharger » · `embed-cloudflare` /
`embed-fly` / `embed-s3` ⇒ « un lien intégrable » · `embed-cms` ⇒ « directement dans We.Publish ».
Say what is `ready`, and name a `disabled` route only when he asks for it or when it is the one he
will want. This is the line preflight could never produce, and its absence is why a journalist
could reach EXPORT with a finished visual and no way to ship it:

> « Pour la diffusion : paquet téléchargeable et lien intégrable disponibles ; le CMS n'est pas
> branché. »

Then say the same for what is NOT available and what it costs him — « la carte demande une clé
MapTiler (gratuite, 2 min) ; sans elle je reste sur les graphiques » — and move on. It is an
ANNOUNCEMENT, not a question: it never blocks, and it is said ONCE, at INPUT.

**Absent ≠ nonexistent — for keys as for anything else.** A key that is missing is a key the
journalist has not GIVEN yet, never a capability that does not exist: name it, say what it
unlocks and where to get it, and let him decline. Never present a key-less engine as an
impossibility. This is the same rule the newsroom charter gets at CADRAGE Q5, and the same one
`lib/source/policy.ts` enforces for sources — an absent declaration is `source-undeclared`, never
a fact inferred by default.

**No article supplied → ask for the article** before anything else (canonical step 2): a bare
topic or a lone dataset does not start CADRAGE — ask once, plainly (« envoie-moi l'article, ou
dis-moi s'il n'existe pas encore »). Only when the journalist confirms there IS no article does
the bare-topic path (name the real dataset the topic needs) apply.

### 2. ANALYSE (silent)

Invoke `suggest-article` **as a real Skill call** (not a mental paraphrase — actually run the
`suggest-article` skill; the ACT differs per host, see « How to invoke a nested skill » above, and
the fallback is to read `skills/suggest-article/SKILL.md` and follow it) to read silently: identify the data, the quantified claims, and the
narrative structure. Produce NO output to the journalist yet — this primes CADRAGE. Improvising this
analysis inline instead of invoking the skill skips its provenance discipline and guardrails — a real
cost observed in practice, not a theoretical one. For a bare topic (no article/data), instead NAME the
real dataset the topic needs (the honest sans-rien path) and carry that forward.

### 3. CADRAGE — GATE 1 (questionnaire, journalist's language, up to 6 questions, one at a time, conditionals skipped — and NEVER a « do you have photos? » turn: image availability is resolved by PICKING the image-scrolly candidate, not by a CADRAGE question)

Ask each question as ONE well-formed single-select prompt (a short header, 2–4 concrete options) and
wait for the answer before the next — never batch several into one call, which is what malforms the
question tool. **Exception:** a question that must capture free-form data — most notably the data
SOURCE (its label and URL) — is NEVER single-select; a fixed menu of options cannot carry a URL. Ask
it as a free-text prompt instead (see Q4, the source question, below).

The Q-labels below are STABLE positions (Q1 branch · Q2 takeaway/Gate 1b · Q3 prose-table/Gate
2b · Q4 source/Gate 2c · Q5 constraint · Q6 channel), not a promise that every one is a fresh
single-select turn: Q1 fires only when the intent is unclear (a named visual keeps the
confirm-back inference), Q3 only on prose-extracted figures, Q5 only if relevant. Q2's takeaway
is asked openly on GUIDED but folded into a confirm-back on DIRECT. So the number of turns a
journalist actually answers VARIES — announce the REAL running count, never a hardcoded number
the flow did not reach (a canned « Q6, toujours posée » when the flow did not reach it).

**Language is never one of these six — the budget is already spoken for.** The journalist is NOT
asked which language to work in; that would be a seventh turn on a flow already capped at six.
The article's language is DECLARED at INPUT (`articleLang` on the run declaration, resolved once
by `initRun`, `lib/loop/init.ts`) and confirmed back FOLDED INTO the very next thing you say —
never as its own question (« compris, je pars sur l'anglais — je cadre l'angle », not a separate
« quelle langue veux-tu ? » turn). The order of authority is fixed and never inverted: an
explicit signal from the journalist wins over the article's own declared language, which wins
over the newsroom's house-profile default (`resolveLanguage`, `lib/newsroom/language.ts`) — the
profile is the LAST resort, and it never overwrites a language the other two already
established.

1. **Branch (DIRECT vs GUIDED) — an EXPLICIT journalist-facing turn, never a branch you pick silently
   from their opening message and merely announce as decided.** When the opening names no specific
   visual, ask it openly — "Do you already have a visual in mind, or should I guide you?". When the
   journalist NAMED a specific visual in their opening (e.g. "a scrolly map"), inferring DIRECT from that
   naming is legitimate, but CONFIRM the inference back rather than deciding it silently — « tu as déjà
   une idée précise (une carte scrolly) — on part là-dessus, ou tu préfères que je te guide ? ». The
   journalist must be able to SEE the branch decision and veto it into GUIDED; the branch is never set
   without their visible answer.
2. **Takeaway — GATE 1b (un-skippable, both branches):** "What is the one thing a reader should leave
   with?" → the insight/angle. This is a DISTINCT, mandatory step — it is NEVER collapsed into any other question, and it
   is NEVER satisfied by inferring the takeaway from the article and moving on. Even when the article
   plainly implies a takeaway, you MUST state your inferred takeaway back to the journalist in one plain
   sentence and get their EXPLICIT confirmation (or correction) before leaving CADRAGE. On GUIDED, ask it
   openly (offer only supported framings, below); on DIRECT, the open-ended asking is replaced by a
   confirm-back of the takeaway inferred from the article + the named visual — but the confirmation itself
   is NEVER skipped. Do not advance to PROPOSITION/PRODUCTION on an unconfirmed, silently-inferred
   takeaway — that is exactly the miss this gate exists to close.
   **★ Record the confirmed takeaway VERBATIM.** The exact sentence the journalist confirmed (or the
   corrected wording they gave back) becomes each accepted proposal's OWN confirmed sentence — its
   REQUIRED `confirmedTakeaway` field in `accepted.json` (5b, one per element; see ★ One element =
   one confirmedTakeaway below) — the spine's validation gate (`src/validate-gate.ts`) FAILS any
   proposal missing it or carrying an empty string, on BOTH branches (there is no path on which a
   takeaway was never confirmed). A MULTI-PART takeaway ("X is falling everywhere AND Italy is the only
   riser") is recorded WHOLE — every part, never just the half the chosen chart type happens to
   foreground. The render-review (Gate 3a) then quotes this field back against the produced
   title/insight, part by part.
   **★ One element = one confirmedTakeaway.** The multi-part rule above is about ONE element whose
   single claim has several parts. It is NOT a licence to share: when a session accepts SEVERAL
   elements (a multi-opportunity article), each element carries ITS OWN confirmed takeaway — the one
   sentence the journalist confirmed FOR THAT element — never one combined string ("both at once: the
   price cooldown AND the plateau") copied onto every entry. Confirm one takeaway PER accepted
   element before it reaches `accepted.json` (5b); if only a combined framing was confirmed at
   CADRAGE, split it and confirm each element's own claim at PROPOSITION. A shared combined string
   DILUTES the Gate-3a title check: element A's title (showing only prices) gets compared against a
   two-part claim half of which belongs to element B — the check can neither pass nor fail honestly.
   **★ Every takeaway option you offer MUST be supported by the supplied data (use the ANALYSE data
   shape).** Never float a framing the data cannot substantiate: do NOT offer a temporal / trend framing
   ("the gap is widening", "growth since 2015", "rising", "over time") when the data is a **single
   snapshot with no time dimension** — a widening/narrowing story is undecidable from one point in time;
   do NOT offer a per-capita / rate framing when only absolute counts exist; do NOT offer a
   spatial-pattern framing when the data is not geographic. Offering an unsupported framing forces a
   later retraction and tempts a fabricated series to "back it up". If the journalist genuinely wants a
   trend, say the current data can't show it and ask for the time series — never invent one.
   **★ Gate 1b WIDENS to the claim-arc when the routed candidate is a chart-scrolly or chart-video
   (chart-native).** Confirming the takeaway is necessary but not sufficient for a narrative format: a
   scrolly/video does not just STATE the claim, it PROVES it beat by beat. From the `confirmedTakeaway` +
   the data, the orchestrator PROPOSES a beat plan — `establish → build+ → [turn] → payoff` (the role
   sequence follows Cohn's Establisher/Initial/Peak/Release narrative grammar — Cohn, N. (2013), "Visual
   Narrative Structure", Cognitive Science 37(3):413-452 — adapted to data-video by Amini, F. et al.
   (2015), "Understanding Data Videos", CHI '15:1459-1468, whose dominant real-world pattern is `E+I+PR+`:
   one `establish`, `build` REPEATABLE, `turn` OPTIONAL, one `payoff`) — where each beat names a **role**
   (`establish`/`build`/`turn`/`payoff`), the **claim** it asserts (its own "so what", one sentence), and
   its **anchor** in the data (the x-value/category/range the beat sits on). `suggest-chart` emits, per
   role, CANDIDATE anchors scaffolded from the data (establish = the opening point, build = the
   rising/falling stretch, turn = the largest swing/inflection, payoff = the point that carries the
   confirmed takeaway) — a scaffold to propose FROM, never beats invented and sprung on the journalist
   unseen. The journalist CONFIRMS, TWEAKS (moves an anchor, rewrites a claim, drops a build step), or
   VETOES the whole plan back to auto-pick. The confirmed arc is pinned VERBATIM as chart-native's
   `spec.beats` — each beat carrying `role` + `text` (the confirmed claim) alongside its existing anchor
   (`x`/`xEnd`/`category`).
   **WHICH point is the turn, and whether a given beat actually advances the argument, is the
   JOURNALIST's call — non-mechanizable, never decided by the code.** The code enforces only the arc's
   SHAPE, fail-loud (`arcErrors`, `skills/chart-native/src/chart-story.ts`): the arc opens on
   `establish`, closes on `payoff`, carries **at least one** `build`, **at most one** `turn`, and every
   role-bearing beat asserts a non-empty claim (`text`). A malformed shape (no `establish`, no `payoff`,
   zero `build`, two `turn`s, or a role beat with an empty claim) fails the proposal loud before
   production — on top of the existing anchor-must-exist-in-the-data check (see the beat-model rule at
   PROPOSITION, below).
   **Map claim-arc — ALL SEVEN map-native story types now carry it; say what each one anchors on,
   never "only choropleth/symbol".** The claim-arc override exists for every real map-native story
   type — `choropleth`, `symbol`, `locator`, `cartogram`, `dot-density`, `route`, `hex-grid`
   (`ARC_CAPABLE_MAP_TYPES`, `skills/map-native/src/map-arc.ts` — `hex-grid` was the last to gain it).
   There is no map type left whose beats can ONLY come from the salience auto-pick. It is a SEPARATE
   field from chart-native's: a map arc is a **region-anchored `arcBeats`** plan — `{ region, role,
   text }` per beat — same shape as the chart arc (`establish → build+ → [turn] → payoff`), same
   journalist confirm/tweak/veto, same fail-loud shape check (`arcErrors`), pinned VERBATIM as
   `arcBeats` once confirmed. **`arcBeats` and chart-native's `spec.beats` are never interchangeable —
   a chart `beats` field submitted on a map spec is rejected loud, use `arcBeats` for a map.** What
   `region` anchors on is type-specific — confirm the ACTUAL anchor with the journalist, never a
   generic "region":
   - `choropleth` / `dot-density` / `cartogram` — a named region the data already has (region key /
     region id).
   - `symbol` / `locator` — a named point (a marker's own label).
   - `route` — a territory the route crosses, COMPUTED from the injected geometry at produce time,
     never a string the journalist declares up front — so a route's arc cannot be content-checked at
     the gate the way the other six are; a typo'd territory name is caught later, at produce, by name,
     against the territories that route actually crosses (`resolveRouteArc`, `route-story.ts`).
   - `hex-grid` — a **place**, not a region key: a hex cell is computed by binning points, so no cell
     has a name until the data is binned. A hex-grid beat's `region` is the journalist's own free-text
     label for the place, and it MUST also carry `lon`/`lat` — the only type whose anchor needs
     coordinates, resolved against the binned grid by point-in-polygon. A beat missing either, or
     carrying an out-of-range one, is refused AT THE GATE (`validateHexGridConfig`,
     `validate-config.ts`) — structural, same moment as every other type's shape check. A
     WELL-FORMED coordinate that lands on no populated cell is a separate, later refusal, BY NAME,
     at produce time (`resolveHexGridArc`, `hex-grid-story.ts`) — the content check, deferred
     because it needs the binned grid.
   `arcBeats` submitted on a type string outside this list of seven is still refused BY NAME at
   validation (`unsupportedArcBeatsErrors`, `skills/map-native/src/map-arc.ts`) rather than accepted
   and silently dropped at the render — the old failure this guards, kept as defence-in-depth for an
   eighth type, should one ever land. Every real map type today is on the list, so this should never
   fire for a real one.
   **★ A route's confirmed arc reaches NO output today — never promise otherwise.** A route video
   always draws its line on continuously, through every crossed territory in geographic order — every
   camera mode a route video can take (`route-reveal`, `guided-tour`, or `simple`) resolves to the SAME
   composition, `RouteReveal` (`skills/map-native/scripts/lib/story-comps.mjs`) — and `RouteReveal`
   deliberately never reads `arcBeats` (`RouteReveal.tsx:159-171`): a continuous self-drawing line has
   no discrete-beat seam to honour a plan with. The scrolly track has no route branch either —
   `MAP_SCROLLY_TYPES` (`skills/scrolly/src/scrolly-types.ts`) lists six map types, not seven — so a
   route scrolly is refused at the gate outright, WITH OR WITHOUT a confirmed `arcBeats` (Tier-0
   `validateAccepted`, `skills/splash/src/validate-gate.ts`: it names the missing scrolly host and, on
   an `arcBeats`-bearing spec, says explicitly that the plan would reach no reader-facing output).
   **A route's confirmed arc therefore reaches the reader through NEITHER format** — say this plainly
   the moment a journalist starts confirming one: authoring a route storyboard today produces a plan
   that ships nowhere, video or scrolly. This is a genuine, unclosed capability gap, not a formatting
   choice — building the missing route scrolly component is a separately scoped follow-up, not done
   here. No other arc-capable type has this gap: the other six all read `arcBeats` both in their
   guided-tour video composition (`*Story.tsx`) and their scrolly (`*Scrolly.tsx`); only the
   *fixed-camera* video family (`*Reveal.tsx`, the `simple` camera-mode opt-in, never the default)
   skips it everywhere — symmetric across every type, not a gap unique to any one of them.
   **Locator (marker map) already tours per place before any arc is confirmed — never deny it, and
   never call `revealMode` a choropleth setting.** A locator video's default camera mode is
   `guided-tour` — the default for every map type but route, which draws on instead
   (`defaultCameraMode`, `skills/map-native/scripts/lib/story-comps.mjs:87-89`) — and its guided-tour
   composition (`LocatorStory.tsx:1-3`) already visits one place (or one category) at a time, each with
   its own camera box, a caption ramp per beat, and a central place/category label (the same pattern
   every beat-driven map story shares — choropleth/symbol/cartogram/hex-grid/dot-density). A confirmed
   arc only picks WHICH places that tour visits and what each caption says, in place of the salience
   auto-pick — it does not switch on a capability that was otherwise off. `revealMode`
   (`LocatorConfigShape.revealMode`, `"context"` default | `"sequential"`) is that tour's camera
   choreography — `context` keeps the establishing bounds in view around each reveal, `sequential` cuts
   straight to each place instead — it is camera behaviour, not a fill/colour setting, and every
   arc-capable type but route carries the same field for the same reason.
3. **Prose table — GATE 2b (prose-extracted figures only):** when the figures come from the
   article's prose, show the reconstructed table (verbatim quotes) and get an explicit
   confirmation BEFORE anything is routed — a wrong table must never invalidate an
   already-routed proposal. Rules unchanged from when this gate lived at PROPOSITION: the
   reconstructed table MUST be built from the CURRENT article/data given this session — never
   carried over, silently, from a prior or stale export sitting in `exports/<slug>/`; if a
   prior export exists, the journalist's current input is always the authority. It is its OWN
   question, never bundled with any later accept — "are these figures right?" and "do you
   accept this visual?" are different decisions. Never fabricate a dataset attribution.
   **GATE 2b applies only to `provenance:"prose"` figures** — a `"table"` (or `"none"`)
   element never goes through 2b, so its `confirmedTable` (set in 5b) stays `false`/absent;
   only set it `true` after an actual 2b confirmation fires for a prose element.
4. **Source — GATE 2c (EVERY run):** the source is asked on EVERY run — CSV data needs its
   « Source : » line too, not only prose — and established HERE, BEFORE any routing (so Gate 3a is
   never the first thing to catch a weak source). Free-text prompt (name + URL), never a menu; Q3 and
   Q4 are two successive prompts, never one bundled question. Resolve a source for EACH distinct
   dataset. Start from `suggest-article`'s `sourceHint`; a source resolves to exactly ONE of THREE
   states, and a NAMED org is never thrown away:
   - **(a) name + specific, traceable dataset/page URL** — the goal; ship both verbatim.
   - **(b) named org kept NAME-ONLY** — an org named but no precise URL obtainable; `source.name` =
     the org, `url` omitted. A legitimate honest citation, NOT a reason to fall back to generic prose.
   - **(c) generic prose fallback** ("Figures as reported in this article") — legitimate ONLY when the
     article names no org at all, or a hedged recollection stays unconfirmed (uncertainty rule below).
   Ask ONE free-text question collecting label AND the specific URL together (never a two-step
   "source?" then "URL?"). A bare org homepage (`eurostat.ec.europa.eu`, `insee.fr`) is NOT state (a) —
   ask once for the specific page, else keep NAME-ONLY (b); and never UPGRADE a given URL to a deeper
   one you cannot confirm. Collapsing a named org (b) into the fallback (c), or diverging a
   journalist-provided URL, is caught mechanically: carry `suggest-article`'s `sourceHint` onto each
   accepted proposal (5b) so the source guards (`sourceNamePreservedReason` / `sourceUrlFidelityReason`,
   `src/source-guard.ts`) fail the produce — see `docs/splash/guardrails.md`.
   - **Journalist UNCERTAINTY is not a source.** When the answer comes hedged — « je crois »,
     « de mémoire », "I think it was the 2023 report", the journalist cannot name the exact
     report/dataset — do NOT ship a flat, confident-looking citation built on that admission:
     a reader cannot tell a hedged recollection from a verified reference, so a confident
     citation over admitted uncertainty is a DEFECT, even when the guess happens to be right.
     Exactly two honest moves: **(1)** get the journalist's EXPLICIT confirmation of the exact
     source — the confirmed name + the specific dataset/page URL (offer to wait while they
     check); or **(2)** use the honest prose fallback — "Chiffres tels que rapportés dans cet
     article" / "Figures as reported in this article" (or name-only with the OUTLET's own
     name) — which claims no more than what is actually known. Never dress the uncertain
     recollection up as a confirmed dataset citation, and never invent a URL to firm it up.
   The resolved source (one of the three states) goes into each accepted spec at 5b, with
   `suggest-article`'s `sourceHint` copied verbatim alongside it. The honest prose fallback is
   legitimate ONLY in two cases — no separate cited dataset (`provenance:"prose"`/`"none"`), or a hedged
   recollection left unconfirmed — never merely because the journalist has not answered yet. Gate 3a's
   render-review source check stays the safety net if a URL turns out unreachable.
5. Constraint (conditional): mobile-first, deadline, house style. The mobile/deadline half fires
   only if relevant — but the **house-charter half fires whenever no `NEWSROOM-PROFILE.md` exists**
   (see ★ below): a missing file is a question owed, not a decision made.
   - **Newsroom profile (F2):** the project's house style lives in `NEWSROOM-PROFILE.md` (palette
     + default `source` + `lang` + `credit` + `theme`; see `NEWSROOM-PROFILE.example.md`). It is **auto-applied
     at produce time** — `produce-all`'s `mergeProfileDefaults` merges it onto every spec as DEFAULTS (the
     per-element value always wins). **You do NOT load it manually; just ANNOUNCE** the house style is being
     applied (palette + default source/lang) so the journalist can veto.
     **★ NO PROFILE FILE ⇒ ASK ONCE. The absence of a FILE is not the absence of a FACT.** Observed,
     verbatim, on a real run: « Pas de NEWSROOM-PROFILE.md dans le projet : pas de charte maison à
     appliquer, je pars donc sur une couleur choisie pour le sujet. » A newsroom that never wrote the
     file still has a graphic charter — the file's absence says only that nobody has DECLARED it here.
     This repo already learned the distinction once and wrote it down (`lib/source/policy.ts`: an absent
     declaration is `source-undeclared`, "never public by default and never unknown-decide-later",
     because *"nothing was declared"* must never render identically to *"this is where it came from"*).
     It applies here unchanged. So when no `NEWSROOM-PROFILE.md` exists, ask ONE question, in the
     journalist's language, offering the honest default in the same breath — « ta rédaction a une charte
     graphique (couleurs, police, crédit) ? si oui donne-la-moi et je l'applique ; sinon je choisis une
     couleur adaptée au sujet et je te l'annonce ».
     **This is NOT a gate — it never blocks.** One question, asked once, at Q5. A "no", an "I don't
     know", a shrug, or no answer at all ⇒ take the honest default (auto subject-fit colour +
     per-article source/lang) and SAY you are taking it, naming the colour (that announcement is
     already required at PROPOSITION, ★ Colour/palette).
     **A "yes" needs a mechanical landing — say WHICH one, never just "I'll apply it".** House
     defaults exist through exactly one route: `mergeProfileDefaults` reading `NEWSROOM-PROFILE.md`
     at produce time (above). PROPOSITION's colour rule assumes a house palette was already veto'd at
     profile-merge (★ Colour/palette), and hand-authoring or mutating an accepted spec to carry the
     colour instead is forbidden (see Never). So a "yes" lands in ONE of two sanctioned places, and
     you say which:
     - **Write the charter to `NEWSROOM-PROFILE.md`** — then every article inherits it. Offer this
       first, without insisting. To derive the whole charter (colours, theme, credit) from the
       newsroom's own website rather than asking field by field, use the newsroom-charter skill
       (branch `feat/newsroom-charter-from-site`) — it is THE generator of that file; never
       hand-roll a second path to the same file.
     - **He declines the file** ⇒ say plainly that the colour then applies to THIS run only, and get
       it there the one sanctioned way: pass it as an EXPLICIT colour signal to `suggest-chart` at
       PROPOSITION, which re-routes and emits a spec carrying it (flagged `baseColorExplicit`, which
       wins over the profile). Never slip it into an accepted spec by hand.

     Never re-ask it later in the same session, and never ask it at all when the file exists.
     Colour/theme reach every producer (chart-native/dw-chart `baseColor`, map house
     ramp/fill on light+dark basemaps); an explicit per-element colour flagged `baseColorExplicit` wins, and a
     diverging map keeps its registry palette. Mechanics are in the code (`mergeProfileDefaults`) — a
     non-CVD-safe house colour ships AS CHOSEN (brand-first) and is downgraded to a Gate-3 render-review concern.
6. **Channel — the LAST CADRAGE question ("Where will it be published?"):** « Où sera-t-il
   publié ? » — a STRUCTURED single-select, journalist's language, exactly three options —
   **Social vertical (Stories/Reels)** · **Social feed (Instagram/Facebook post)** · **Article
   web / embed — interactif, image ou vidéo (destination print ⇒ image statique)** — asked
   LAST so the data truth and constraints are known, and every PROPOSITION candidate is
   channel-aware at emission.
   This is not a free-text prompt (never ask it as one) — the pick still maps 1:1 onto
   `skills/splash/src/channel.ts`'s `Channel` enum, which deterministically fixes both the media SIZE and
   the ALLOWED FORMAT SET for everything downstream (mechanics unchanged):
   - **Social vertical** → portrait **9:16** · formats {image, video}.
   - **Social feed** → square **1:1** · formats {image, video}.
   - **Article web / embed** → media **landscape 16:9** / component **responsive** · formats
     {image, video, interactive}. This is the FULL-CAPABILITY channel: interactive is the default
     (`interactiveDefault`), and image, video and scrolly (a kind of interactive) are all available.
     **PRINT lives HERE as a SUB-CASE — the channel model needs no 4th channel**: a paper
     page is a static-image deliverable, so a print-destined piece answers (c), and a STATED print
     destination steers the format pin to `static` at PROPOSITION (see "Article/web has NO static
     fallback" below) — never interactive/video, which no printed page can host. **Word option (c) so
     the channel reads full-capability with print as the parenthesised sub-case** — "article web /
     embed — interactif, image ou vidéo (destination print ⇒ image statique)" — NEVER as "article
     web / print (image statique) / embed", which reads as if the WHOLE channel were static-only and
     primes the journalist (and any later reviewer) toward the wrong expectation when the pinned
     format is interactive; never force a print piece into an off-fit social answer or leave it
     unable to answer.
   **Hard rule: not article/embed ⇒ image or video only — NEVER interactive or scrolly.** Only the
   article/web channel can host an interactive (scrolly is a kind of interactive). **Always asked — on
   EITHER branch, never skipped, at the same LAST position on both branches.** A DIRECT-named visual
   still needs a channel: a journalist-naming "a bar chart" doesn't by itself say feed→square vs
   web→landscape, and downstream, `suggest-chart`'s routing cannot even restrict its format set without
   it (see `knowledge/references/formats/format-selection.md`).
   Skipping Q6 is exactly the failure mode that let a visual escalate to interactive/video/scrolly with
   none of the channel constraints established — never skip it.
   **The formats named in option (c) describe the channel's ALLOWED SET — they are NOT a menu to pick
   from here, and NOT a second question: NO standalone format question exists anywhere in the flow.**
   "Interactif, image ou vidéo" tells the journalist what the article-web channel CAN host; splash must
   NEVER follow the channel pick with a separate CADRAGE turn re-offering static / interactive / video —
   that double-ask is redundant with this label and inflates the question count. The single format
   derives from channel × type and is decided later, exactly once: pinned at PROPOSITION and
   announced-vetoable on GUIDED (Gate 2, §4), or named by the journalist inside Q1 on DIRECT. Q6 fixes
   the allowed SET; the format pin is surfaced ONCE, at PROPOSITION — the two never double-ask.

Branch:
- **DIRECT** (journalist names the visual, e.g. "a scrolly map"): skip PROPOSITION's candidate menu, but
  NOT the rest of CADRAGE — Q2 (takeaway/Gate 1b, via confirm-back: a named visual carries a chart TYPE,
  not a confirmed CLAIM), Q3/Q4 (data truth, branch-independent) and Q6 (channel, same LAST position) all
  still apply; the branch fires at Q1, Q5 stays conditional. Go to PRODUCTION, passing suggest-chart the
  (data, intent, channel) PLUS the forced element/format — it still emits a VALIDATED spec and applies its
  guardrails (obey the choice, but surface a hard-guardrail warning rather than ship a broken visual). If
  the named visual's exact sub-format is still open (e.g. "a scrolly" — bars vs line reveal), confirm
  reachability via `suggest-chart` before offering — never offer then retract.
- **GUIDED**: go to PROPOSITION.

### 4. PROPOSITION — GATE 2 (guided path only)

For each `suggest-article` opportunity, invoke `suggest-chart` **as a real Skill call** (the ACT
differs per host — see « How to invoke a nested skill » above; never
guess the element/format/producer yourself — that re-decides what a sub-skill already decides and
skips its KB-grounded guardrails). Since the canonical 12-step flow (2026-07-16) it answers in TWO
stages, and the presentation is BATCHED:

**Stage 1 — candidates, all opportunities, ONE batched message.** For every opportunity,
`suggest-chart` returns its reachable candidates — charts AND maps — each with its editorial
why ("why it can be interesting" for THIS claim), the first one recommended. Reachable = a
mapper exists × the data shape fits × every deterministic guardrail passes × the channel
(known since CADRAGE Q6) allows at least one of its formats — a barred candidate NEVER
appears. An engine that fails preflight (C2) is annotated, never hidden.

**A fifth language is refused HERE, at the offer — never later, at delivery.** A run whose
declared language has no furniture row (`isCoveredLang`, `lib/core/language-coverage.ts` — today
`en`/`fr`/`de`/`it`) returns ZERO candidates and one honest refusal naming the languages that ARE
covered, before a single candidate is even considered — never a chart that ships mixed (its
numbers in the run's language under a caption still reading the English "Source:"). Point the
journalist at `docs/splash/language-debt.md` if they want to see what closing that gap for their
language would actually take — it is a debt list, not a promise. **If `suggest-chart`
returns a single decision with NO candidates payload, re-invoke it ONCE demanding Stage 1
explicitly** (« return the candidates JSON first — every reachable type with its why ») — the
bounded-retry rules apply; never relay a take-it-or-leave-it decision to the journalist.
**Write the raw Stage-1 payload to `exports/<slug>/candidates.json` BEFORE presenting** —
one entry per opportunity, each candidate with `type`/`producer`/`tier`/`why` exactly as
suggest-chart returned them — including, per opportunity, either a narrative candidate — from the WHOLE family matched to
the story shape (chart-scrolly/chart-video for a temporal series, map-story/map-scrolly for a
geographic progression, image-scrolly for a prose-visual sequence) — or the explicit
`narrativeRuledOut` reason (suggest-chart's contract: silent narrative absence is not a valid
payload). The journalist never sees this JSON (the presentation below is
plain language); the file is the mechanical trace that the menu existed, and the resume point
if the session dies mid-PROPOSITION (see Context recovery). **`produce-all` ENFORCES this: it
resolves `candidates.json` beside `accepted.json` and REFUSES (fail-hard, per proposal) any
non-direct proposal whose PRODUCER is not named in the menu — or any run with no
`candidates.json` at all.** So the menu is a hard precondition of production, not a courtesy: a
spec for a producer the suggester never proposed cannot ship. (The gate is producer-level, not
type-level — a narrative candidate names a format like `chart-scrolly` while its spec names the
underlying `line`/`choropleth`, so a type-strict gate would false-block scrolly; off-menu TYPE
within an offered producer stays caught by the render review + GUARD 4/5.) The ONLY exemption is
the DIRECT branch (journalist NAMED the visual) — declare it with
`skillsInvoked: ["splash:cadrage-direct", …]` on that proposal (5b). Never satisfy the gate by
faking a candidate or a direct declaration.
**★ Each option says what it SHOWS that the others do not — never only what it is.** Observed on a
real run: two options, each described correctly (« nuage de points, 12 communes, km en x, €/m² en
y ») and neither saying why a journalist would pick it. A description is not a reason. The `why`
already travels on every candidate (§5b, `candidates.json`) and was simply not rendered — the same
shape as a placement the code emits and the prose drops. Give each option ONE clause of editorial
consequence, and make them comparable: « celui-ci montre que le prix décroche avec la distance ;
celui-là, que ce sont les communes les plus lointaines qui grossissent le plus vite. Le premier
explique, le second surprend. » A journalist choosing between two scatter plots described
identically is choosing at random.

**★ A narrative format is an option, not an afterthought.** When the material carries a sequence — a
before/after, a threshold crossed, a geography walked, a claim needing two steps to land — scrolly
and video belong in the list ON THE SAME FOOTING as the static and interactive ones: same one-clause
why, same visual weight. Do not bury them in a trailing sentence, and do not present three variants
of one static idea as if that were the whole space. `candidates.json` already carries either a
narrative candidate or an explicit `narrativeRuledOut` reason — `check:narrative-not-considered`
enforces that in the DATA. This rule is about the MESSAGE: the journalist must SEE the option the
data already knows about. If narrative was ruled out, say so in one clause with its reason rather
than silently listing only what remains.

Present ALL opportunities' candidate lists in ONE batched message — never a per-opportunity question loop
— and let the journalist answer per opportunity (pick a candidate, or « aucun » = veto; a
vetoed opportunity emits `no-chart` with the reason). Each kept opportunity remains its OWN
accept decision and its OWN `accepted.json` entry with its OWN confirmedTakeaway — the
batching is presentation, never a merged decision.

**Chosen candidate on a yellow engine → collect the key NOW (prerequisite before
production):** explain where to get it (the preflight `reason` carries the URL), take the
journalist's key in one free-text prompt, save it via `save-key.mjs`, re-run
`preflight.mjs` and confirm green — then produce. A `red` engine (deps not installed) is not
key-fixable: surface the `bun install` instruction and stop for that element (stall-protocol
options apply). Never start PRODUCTION on a non-green engine.

**Stage 2 — one spec per kept opportunity.** For each choice, `suggest-chart` emits the full
validated spec. The format is **derived from channel × type** (social ⇒ static or video at
the channel's size; article-web ⇒ interactive by default) and announced for veto in the same
breath, WITH its size — « un chart colonnes INTERACTIF, responsive, calé sur ton canal
article web — on part là-dessus ou tu le veux en image ? » · « une image PORTRAIT (9:16)
pour ta Story — ok ? ». An explicit journalist format signal (« une image
statique », « pour le print ») WINS over the default. The accepted spec pins exactly ONE
`format`; `assertFormatAllowed(channel, format)` re-checks it at produce time, unchanged.

`suggest-chart` pins exactly ONE `VisualFormat` from `allowedFormats(channel)` (never the whole set);
`interactiveDefault` (`skills/splash/src/channel.ts`) only steers the article-web default. The journalist
may change it, but to another single member of the channel's allowed set. Q6 set only the ALLOWED SET, so
this Stage-2 announce is the FIRST and ONLY place the single format is surfaced — channel and format never
double-ask. **Hard rule:** a non-article/embed channel lands on image or video only, never
interactive/scrolly; point back to the Q6 pick rather than escalating.

**★ Colour/palette — name the subject-encoding HERE, for the same veto.** When the emitted spec
carries a **subject-motivated** palette — an auto subject-fit ramp (no house profile), or a colour
chosen to ENCODE the subject (sequential for magnitude, a diverging scale around a midpoint, a domain
hue) — announce the palette AND *why it fits the subject* in the same breath as the format, so the
journalist consciously confirms the colour reads right for the topic (« je code l'intensité en vert
séquentiel — ça te va ? » · « une échelle divergente rouge↔bleu centrée sur zéro »). This makes
palette-fit — the one axis no code can judge (green≠politically-loaded, sequential-for-ordered-data, no
rainbow) — a NAMED, vetoable editorial confirm, not a silent default. **No call-out for a default
CVD-safe categorical palette or a confirmed house palette** — they carry no subject claim (the house
palette is already veto'd at profile-merge; a categorical set encodes identity, not a subject scale).
The semantic *correctness* of the fit stays the journalist's call (and a Gate-3a render-review concern);
this rule only guarantees the choice is surfaced, never buried.

**Narrative sub-format — who picks it reuses the CADRAGE branch:**
- **interactive** → the sub-format is **explore-libre** (pan/zoom/hover) vs **scrolly** (sequential).
- **video** → the sub-format is the camera/reveal mode (reveal-simple, guided-tour, zoom-out, pan,
  line-reveal, ranked-bars… — per producer).
- **GUIDED** → the AI PICKS the sub-format (grounded in the routing, announced above, vetoable) — do not
  make the journalist choose a reveal style blind.
- **DIRECT** → the journalist NAMES the sub-format themselves, but only once it is checked reachable via
  `suggest-chart` (see "Only offer what is confirmed producible" below) — never offer a named sub-format
  that turns out not to be producible.

**Story-warrant check (mechanical, before proposing scrolly/video).** When the routed candidate would
be a chart scrolly or chart-video, CONSULT `assessStoryArc` (`skills/splash/src/story-warrant.ts` — a
design heuristic, not credited literature: no source cited here claims "some data shapes don't deserve
an arc" — Segel & Heer (2010, "Narrative Visualization", IEEE TVCG 16(6):1139-1148, the author↔reader
axis), McKenna et al. (2017, "Visual Narrative Flow", Computer Graphics Forum 36(3):377-387), and Kosara
& Mackinlay (2013, "Storytelling: The Next Step for Visualization", IEEE Computer 46(5):44-50) are
adjacent design context that INFORMED this heuristic, never its authority) on the series; if it returns
`hasArc:false`, PROPOSE the static annotated chart instead and say why (its `reason`) — the journalist
may veto back to the scrolly/video.
**Flagged fallback — say this at the same moment.** Absent a journalist-confirmed claim-arc (Gate 1b
above), a chart-scrolly/chart-video still ships — it falls back to the salience auto-pick
(`narrativeFallbackWarning`, `skills/chart-native/src/chart-story.ts`) — but that fallback is never
silent: it surfaces as an advisory concern at the render-review (Gate 3a, below), read as "this
narrative is auto-generated by salience, not confirmed as an argument". An un-confirmed, auto-picked
narrative is not blocked — it is flagged. Confirm a claim-arc at Gate 1b to turn a sequence of salient
points into an actual argument.

**Chart-scrolly BEAT MODEL — announce it honestly HERE, and carry a confirmed plan into the spec.**
When the routed sub-format is a chart scrolly (line/bar/scatter), the PROPOSITION must state, up front,
what is auto and what the journalist controls — the observed failure was a FLOW failure: the journalist
confirmed a 3-beat narrative plan, the engine silently auto-picked its own beats, and the mismatch
surfaced only at Gate 3 AFTER production. So:
- **Default (auto):** absent an explicit plan, the engine picks the steps itself — line: first + last +
  the 2 biggest moves; bar: the top-3 leaders + the lowest (a fixed 4-step walk); scatter: 3 outliers.
  Say this — never imply the steps will follow a plan that was only discussed in prose.
- **Controllable (explicit `beats`):** for a LINE, an ordered list of beats each anchored on an x-value
  (or an x..xEnd range) from the data + the confirmed step caption; for a BAR, the exact ordered list of
  categories to walk — the walk length follows the list (5 confirmed steps = 5 walk steps), and a named
  entity the journalist wants in its own step (e.g. « Alpes-Maritimes ») is simply listed. Scatter has
  no override (auto outliers only) — say so instead of promising one.
- **★ Claim-arc `role` (line/bar, since S2):** a controllable beat may ALSO carry a `role`
  (`establish`/`build`/`turn`/`payoff`) alongside its anchor + caption — see the widened Gate 1b above for
  how the plan is proposed/confirmed. A beat WITHOUT a `role` still works exactly as before (anchor +
  caption only, byte-identical legacy path) — `role` is additive, never required to ship a scrolly.
- **A confirmed plan MUST land in the spec** as the chart-scrolly `beats` field (see suggest-chart's
  Chart scrolly section) — never acknowledged in dialogue then dropped on the floor. The journalist's
  order is the emitted order (narrative order wins, even non-chronological).
- **Fail-loud tripwire:** every beat anchor is validated against the data at the spine gate (5a,
  `narrativeBeatErrors`) and again at derive — a typo'd year/category fails the proposal loud BEFORE
  production, never a silently shifted or dropped beat.
- **★ Comparative/rank captions MUST match the data ordering.** Every beat caption that makes a
  COMPARATIVE or RANK claim — « devant » / "ahead of", « top 3 », "the highest", « le plus bas » — is
  checked against the ACTUAL sorted data BEFORE production: the named entity's value must really sit
  in the asserted position relative to EVERY entity it is compared to. This is a real shipped error,
  not a hypothetical: a beat caption asserted a département ranks « devant » two others while its
  value (27.2) was LOWER than both (30.6, 28.4) — the caption inverted the sorted order visible on
  screen. A caption the data contradicts is corrected (or its claim dropped) before the spec is
  produced; the render-review (Gate 3a) then re-verifies each step caption against what that step
  visually shows (see 3a).
- **Map scrolly** named-step control is `arcBeats`, NOT this track's `beats` field — a chart-native
  `beats` field submitted on a map spec is still mechanically rejected (see the region-anchored
  claim-arc at Gate 1b, above): every map-native type accepts a confirmed `arcBeats` plan
  (`establish → build+ → [turn] → payoff`, same confirm/tweak/veto) at validation — but **`route` is
  the one exception with nowhere for it to land**: its scrolly is refused at the gate outright (no
  `MAP_SCROLLY_TYPES` branch — see the claim-arc rule above), so an `arcBeats` plan on a route never
  reaches a scrolly reader. For the other six — choropleth/symbol/locator/cartogram/dot-density/
  hex-grid — point the journalist at `arcBeats` here; never tell them a map story has no named-step
  control — that limitation no longer exists for THEM.

**Article/web has NO static fallback — the pinned format is the ONLY artifact, so pin the one the
journalist actually wants.** For the article-web channel, `suggest-chart` routing DEFAULTS to interactive
(`interactiveDefault`, `skills/splash/src/channel.ts`) — it wins ONLY absent a concrete reason otherwise.
That default is NOT a mandate: an explicit journalist format signal ("a static image", "a static chart",
"just an image", "pour le print") WINS over it — pin `static`, never interactive. **Print is the
strongest such signal**: when the STATED destination is print (the journalist answered (c) at CADRAGE
Q6 NAMING the print destination — print is a sub-case of that channel, the pick alone does not imply
it — or says the piece is print-bound at any point), pin `static` — a printed page cannot run
an interactive or a video, so `interactiveDefault` never applies to it. Since the single-format
redesign there is NO auto no-JS `static.html` produced alongside an interactive (a11y = choosing the
`static` FORMAT, see §6 and the export guardrail below) — whichever ONE format is pinned is the ONLY
artifact the journalist gets, so a wrong default is NOT backstopped by a byproduct. Announce that pinned
`{format}` explicitly for veto (Gate 2, above) — never silently default to interactive and jump straight
to production as if a static image still tagged along.

**One opportunity = one accept decision = one `suggest-chart` call.** Each DISTINCT `suggest-article`
opportunity is routed and accepted INDEPENDENTLY — never fold a second opportunity's series/claim into
another opportunity's visual. If ANALYSE surfaces two claims (e.g. a minimum-wage series AND an
inflation series), that is TWO proposals, TWO Gate-2 accept decisions, and TWO `suggest-chart` calls —
even when both trend over time and could be stapled onto one chart. Combining them silently drops the
second opportunity from the journalist's sight (they never got to accept/reject it) and it never reaches
its own routing. Surface EVERY opportunity as its own line; the journalist decides which to keep, and
each kept one becomes its own `accepted.json` entry (5b) that `produce-all` renders separately. Each
kept opportunity also carries its OWN Gate-1b `confirmedTakeaway` — that element's confirmed claim,
never one combined multi-element string stamped onto every entry (see CADRAGE Gate 1b).

**Only offer what is confirmed producible.** Before presenting an element/format (or sub-format —
e.g. which scrolly reveal style) to the journalist, it must already have been checked as reachable via
`suggest-chart`'s own routing/reachability, never assumed from memory. Never offer an option and then
have to retract it as engine-infeasible after the fact — if a candidate isn't reachable, drop it before
it reaches the journalist rather than proposing it and walking it back.

**Preflight annotation (C2).** Before presenting engines/types, run
`bun skills/splash/scripts/preflight.mjs`; a not-ready engine is **annotated, never silently omitted**
(the journalist picks it and fixes the key, or picks a ready alternative). The produce-time gate re-checks
mechanically — this annotation is honesty, not the enforcement (`docs/splash/guardrails.md`).

**Data truth was established at CADRAGE (Gates 2b/2c — Q3/Q4), BEFORE this routing.** The prose
table (2b) and the source (2c) are NOT re-asked here. If — exceptionally — an accepted element's
figures turn out to rest on prose the journalist never confirmed, `produce-all` refuses it
(`needs-confirmation`, 5d): go back to the CADRAGE Q3 rules, confirm the table as its OWN question
(never bundled with the visual accept), set `confirmedTable: true`, and re-run. The resolved 2c
source (one of the three states — name+URL verbatim, named org name-only, or the honest prose
fallback) goes onto every accepted proposal's spec at 5b, with `suggest-article`'s `sourceHint`
copied verbatim alongside it.

**★ PHRASING CONTRACT — when the offer comes from the proposal brain (`lib/brain`).** The brain
hands over an offer as **data**, never as prose: each option carries `id` · `engine` · `format` ·
`intent` · `whySource` (the sheet's own `bestFor`/`notFor` fragments + the computed facts) · and,
when something stands in the way, `readiness: { status, reason }`. Alongside it comes `excluded` —
every discarded form with the reason it was discarded. **The code decides; the model only writes.**

**An explicit journalist format signal wins here too — but only if it is RECORDED.** Write it to
the element's `requestedFormat` on the run manifest BEFORE `propose()` builds the offer: the brain
then filters the whole offer down to it and names a refusal if the channel does not carry it — an
unrecorded signal is a signal the offer never sees. (This pipeline is the one with a run manifest
to write it onto; Stage 2's `suggest-chart` above has none — its own format announcement is pinned
straight onto that spec instead.)

Five rules, all mechanical:

1. **`why` is rendered, not inherited.** A brain-built option arrives with `why: ""` — deliberately
   empty, because `whySource.fragments` are the KB's ENGLISH sentences and the journalist reads
   French, German or Italian. Write each `why` in the journalist's language **from that option's
   `whySource` only** (its fragments and its facts) — no other source, no number that is not in
   `whySource.facts` / `fragments` / `readiness.reason`. Never show, and never persist, an option
   whose `why` is still empty.
2. **`verifyOffer(phrased, offer)` runs BEFORE the offer is shown — it is not optional** (spec §7).
   It throws on an id that was not offered, a discarded id presented as offered, and on ANY change
   to the list or its order (dropping an option — including dropping them all — is a silent removal
   and fails exactly like reordering). Go through `applyPhrasing()` (`lib/loop/phrase.ts`): it is
   the one path that calls the guard and then writes the `why` back onto the manifest. From a host
   that is not JavaScript, that path is `phrase --run <dir> < phrasing.json`.
   **This is no longer only a contract in prose:** `nextActions` answers `phrase` while any offered
   `why` is still empty, and `assertInvariants` refuses to WRITE a manifest whose chosen option
   carries a blank one. "Never persist an option whose `why` is still empty" is now enforced by the
   manifest itself.
3. **A marked option is presented marked.** Set `markAcknowledged: true` on the phrasing of every
   option carrying a `readiness` (the guard refuses the phrasing otherwise, and equally refuses the
   flag on an unmarked option), **and print `readiness.reason` beside that option's `why`** — the
   mark's own words are emitted by the code, never left to the model to restate. The guard checks
   the acknowledgement STRUCTURALLY; it cannot verify meaning across languages, so printing the
   reason is what makes the disclosure real.
4. **A marked form is still offered — and it is never chosen silently.** Marks come from three
   places: a capability the newsroom has not turned on, an INPUT the run has not declared (an
   image scrolly walks the journalist's own photographs), and an engine production cannot build
   yet (`lib/loop/buildable.ts`). All three MARK, none removes. There used to be a fourth — "the
   whole-article branch, not built yet" — on every scrolly; it is gone, because a scrolly is an
   embeddable element like any other (one self-contained HTML file, the embed genre, the same
   publishers and the same iframe snippet an interactive gets), proven end to end in
   `lib/loop/scrolly-e2e.test.ts`. A mark WARNS, it does not forbid: the journalist may pick a
   marked form and the choice stands. The one exception is a form nothing can build —
   `chooseForm` refuses it in the words the offer displayed, and the loop routes back to the
   choice rather than looping on a refusal. Say so plainly and offer the ranked alternatives again.
5. **Une limite DÉCLARÉE est imprimée, pas résumée.** Une option peut porter `limits` : ce que la
   forme, une fois construite, **ne fera pas** (« cette carte interactive ne sera pas navigable au
   clavier »). Ce n'est pas une marque de readiness — la forme est constructible, elle est classée
   normalement, et elle reste choisissable. Poser `limitsAcknowledged: true` sur le phrasage de
   chaque option qui en porte une (le garde refuse le phrasage sinon, et refuse également le
   drapeau sur une option qui n'en porte aucune), et **imprimer chaque phrase de `limits` à côté
   du `why`** — les mots sont émis par le code, jamais restitués par le modèle.

**★ THE DECISIONS ARE MECHANICAL — never hand-edit `run.json`.** A decision the journalist makes
is written by CODE, with its own refusals, exactly like the offer is built by code. Editing the
manifest to record a choice produces state nothing validated, in a loop whose every guard assumes
the opposite — and it is the last place where the flow was prose instead of a mechanism.

**Including the run's own creation.** This rule used to name a path that did not exist: nothing
created a run, so hand-editing was the only way to get one. `initRun` closes that, and every row
below is now reachable from a host that is not JavaScript.

| The act | The mechanism | Refuses |
|---|---|---|
| starting the run | `initRun(runDir, declaration)` (`lib/loop/init.ts`) — host: `init --run <dir> < declaration.json` | a declaration carrying anything a command must EARN (`angle`, `proposal`, `artifact`, `delivery`, `orient`, `events` — refused **by name**) · a directory that already holds a run · an input path that does not exist · **a data input whose source is not declared** (`sources.data` is written once, HERE — no later step can add it, so a run begun without it is stuck at produce for good; the refusal carries the question to put to the journalist) · a source ledger the policy rejects (checked before a byte is written) · a declared geography path that does not exist or is not a file · a declared geography file that is not valid JSON · a declared geography file that is not a GeoJSON geometry or FeatureCollection object · **a declared geography file whose coordinates fall outside its declared CRS's valid range** (`lib/geo/crs.ts`'s `coordinateRangeVerdict`, checked before a byte is frozen — a projected CRS mistaken for WGS84, the most journalist-visible of the four geography refusals) |
| the confirmed angle | `confirmAngle(el, parts)` (`lib/loop/angle.ts`) — host: `confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s> --intent <id> [--emphasis <s>]` | a blank takeaway (it becomes the title) · a blank alt text (WCAG 1.1.1 — the producers fail hard on it) · a blank unit · a blank or out-of-vocabulary intent (one of nine closed values — put the question to the journalist first with `suggest-intent --takeaway <s>`, never present the raw id). Five NAMED slots, never a field the caller designates: that is what keeps it from being a "write any prose anywhere" command |
| writing the offer's prose | `applyPhrasing(run, elId, phrased)` (`lib/loop/phrase.ts`) — host: `phrase --run <dir> < phrasing.json` | see the phrasing contract above — ids, count, exact order, discards, marks, every number grounded, and a blank `why` |
| which form gets built | `chooseForm(el, id)` (`lib/loop/choose.ts`) — host: `choose-form --run <dir> --option <id>` | an id that is not in the offer (naming the ones that are) · an empty offer (carrying the brain's own refusal) · a form nothing can build |
| where it goes | `requestDelivery(run, el, decor, opts)` (`lib/loop/request-delivery.ts`) — host: `request-delivery --run <dir> [--to <id,id>]` | nothing produced yet · a stale artifact · a destination this install does not know |
| shipping it | `approve(run, el, runDir, ceremony, policy)` (`lib/loop/approve.ts`) — host: `approve --run <dir> [< ceremony.json]` | an artifact nobody CAPTURED, REVIEWED or was SHOWN · a blocking finding still open without a valid override · a warning nobody acknowledged · an override with no reason or no actor, or naming a finding the review does not carry · under `requiredSigners`, a missing/foreign/invalid Ed25519 signature over the artifact's exact bytes |

**The unit is stated ONCE, in the subtitle — never repeated onto every value label.** A standalone
static/interactive/video chart-native render states it once, right above the plot
(`BarChart.tsx:98-101`, the pattern every chart-native component's `subtitle={config.unit}`
repeats); the one exception is a scrolly-embedded chart, whose walked bar's DIRECT value label
must read complete on its own with nobody having scrolled past the subtitle, so it appends a
short unit there instead (same file). The rule holds for a Datawrapper chart too, despite
`ChartSpec` having no `unit` field of its own: the assembler states it once in the printed
subtitle, and never lets a subtitle the journalist already wrote swallow it silently — matched on
a real token boundary, not a raw substring, so a single-letter unit ("m", "t", "h", "g") is not
lost inside an unrelated word (`lib/loop/assemble/dw-chart.ts`). A map has no subtitle slot for
it: the unit travels WITH the values themselves, via `valueUnit` (every map-native branch), with
the choropleth additionally emitting a distinct `unit` for its own legend-header reader.

Then the deterministic steps run themselves: `advance()` (`lib/loop/driver.ts`), or
`advance --run <dir>` from a host that is not JavaScript. Deciding and sending are TWO acts —
`request-delivery` records where it goes, `advance` publishes it — so a missing credential never
erases what the journalist decided.

**★ THE GATE IS MECHANICAL TOO — "show the render" is no longer prose.** Gate 3's rule (below)
is that nobody is asked to approve a visual they have not seen, and in the V1 flow that rule
lives in this document, which is what made it skippable (issue #3). In the V2 loop it is a
STATE: between `produce` and `deliver`, `nextActions` routes through **capture → review →
preview → approve**, each one a step `advance` performs, and `deliver()` refuses an artifact
that carries no approval covering its exact provenance.

| The step | What it does | What it refuses to let pass |
|---|---|---|
| `capture` | opens the REAL deliverable at the container it publishes into (the newsroom's embed box, else the channel's own size) and measures the component, its furniture and its colours — at the article width plus the narrow/wide edges for a responsive one | furniture that is missing, hidden, or outside the frame; a component that overflows its container; an image that is not the size its destination publishes at; a still taken for another destination |
| `review` | turns those measurements into findings whose severity comes from ONE central table, records the reviewer's mode and hashes, and routes the axes no machine can settle into a verdict-free `tasteRisk` lane | a severity chosen by whoever found the defect; a claim of independence nobody earned (`independentSemanticReview` reads `unavailable`, never `pass`) |
| `preview` | resolves the deliverable FROM THE MANIFEST, re-hashes it, and presents it — recording which bytes were shown and how | a png standing in for an interactive; stale bytes; a printed path with no reason why no viewer opened |
| `approve` | the journalist's decision, written by `approveElement` — the only sanctioned writer of `approved` — plus a sign-off document beside the run | everything in the row above, and publication itself: `deliver` has no path around it |

**The Ed25519 sign-off is not a second approval.** `approved` says WHAT was approved; the
signature says WHO. With `requiredSigners` in `NEWSROOM-PROFILE.md`, an approval cannot be
written without a verified signature over the artifact's bytes, and it travels inside the
sign-off document `approved.signoffPath` names — the editor still signs with
`scripts/sign-artifact.mjs`, unchanged. **Publishing never goes through `verb publish`**: that path
skips the sign-off, the provenance-freshness check, the profile-derived metadata, the readiness
and the genre legality, and the façade refuses it for that reason.

**Nor does rendering, when the credit matters.** `verb render` IS callable — it is a first-class
façade capability — but it validates no `spec.source`: the contract holds the spec opaque, so the
credit inside it is whatever the caller typed. The façade's answer therefore carries
`sourcePolicy: { checked: false }`, so such an artifact cannot pass for a policy-checked one. It
also carries no provenance, so it can never be published through Splash. To render under the
source policy, create a run and let `produce` take the credit from the declared ledger.

Only accepted proposals continue.

### 5. PRODUCTION

PRODUCTION is a coded, **drop-proof** loop — you do NOT run producers one at a time from prose.
You assemble the accepted proposals into one file and let `produce-all` produce every one of them,
so a secondary proposal can never silently drop. If the element/format needs to change during
PRODUCTION (a fallback, a journalist request, a retry) — go back through `suggest-chart` for the new
routing, the same way `needs-fallback` (5d) already re-emits via suggest-chart; never hand-author the
producer spec yourself (see Never).

**5a. Validate each spec first.** For every accepted proposal, run the producer's spec validator
(`validateChartSpec` for charts; `validateChoroplethConfig` / `validateLocatorConfig` /
`validateSymbolConfig` / `validateMapSpec` for maps) and fix any warning — in particular a title that
reads as a label rather than the insight — so a weak spec never reaches GATE 3. The spec's `source`
must be the one already established at Gate 2c (name + a specific traceable URL, or the honest prose
fallback per 2c — the genuine no-dataset case, or a hedged source left unconfirmed; never a confident
citation over a « je crois ») — never a placeholder, never the `suggest-article` `dataSource.table` filename
slipped in as the label (see suggest-article's Gotcha (4)). **A reserved placeholder URL
(`…example.com`, `.test`, `.invalid`, `localhost`, RFC 2606/6761) is MECHANICALLY rejected by the spine's
validation gate (GUARD 2, `src/source-guard.ts`) — the proposal comes back `status:"failed"`, never
produced; a name-only prose source with no URL still passes.**

**5b. Assemble `exports/<slug>/accepted.json`** — an array, one entry per accepted proposal:
`{ "id": "<stable-id>", "producer": "dw-chart|chart-native|map-dw|map-native|scrolly",
"format": "static|interactive|video|scrolly", "spec": <the validated producer spec>,
"confirmedTakeaway": "<the takeaway the journalist EXPLICITLY confirmed FOR THIS ELEMENT (Gate 1b),
VERBATIM — every part of that element's multi-part takeaway, never a paraphrase, and never a combined
multi-element string shared across entries>",
"provenance": "table|prose|none", "confirmedTable": <true ONLY after an actual Gate 2b prose-table
confirmation — stays false/absent for "table" (and "none") provenance, which never go through 2b;
never set it true on a table-provenance proposal just because it looks accepted>,
"channel": "social-vertical|social-feed|article-web",
"sourceHint": <OPTIONAL — `suggest-article`'s `sourceHint` verbatim, `{ "name"?, "url"? }`, set ONLY
when the ARTICLE itself named a source/URL; omit entirely when it named none>,
"skillsInvoked": ["splash:cadrage-guided" | "splash:cadrage-direct", "<each sub-skill you actually
invoked>", …] }`.
`producer` + `format` are what suggest-chart routed; `provenance` comes from suggest-article.
**`sourceHint`, when the article named a source, MUST be carried onto the accepted proposal** — the
spine's source guards (`validateAccepted` → `sourceNamePreservedReason` / `sourceUrlFidelityReason`)
consume it to FAIL (B) a named org collapsed to the generic "reported in this article" fallback, and
(D) a shipped URL that diverges from the journalist-provided one. This is prose-enforced the same way
as `channel` and `confirmedTakeaway`: there is no script that transforms `suggest-article`'s in-context
ProposalSet into `accepted.json` — YOU copy the hint across here, verbatim. Dropping `sourceHint`
silently disarms those guards, exactly like dropping `channel` disarms the format gate. **Backstop:**
when the shipped `source` is the generic fallback but no `sourceHint` was threaded (on a `table`-backed
claim), `validateAccepted` emits a non-blocking render-gate WARNING (`ProposalResult.warnings`) so a
dropped hint is no longer fully silent — treat that warning as "confirm the article really named no
source; if it did, thread the hint and re-produce". It is advisory only; it never blocks the produce.

- **`skillsInvoked`** (REQUIRED on new proposals): the skills you actually invoked for this
  element, first entry declaring the branch — `"splash:cadrage-guided"` or
  `"splash:cadrage-direct"` — then e.g. `"suggest-article"`, `"suggest-chart"`. Copied across
  like `channel`/`confirmedTakeaway`; the spine gate warns when absent and FAILS a guided
  entry without `suggest-chart` (GUARD 5).
- **`anchor`** (copy it across when `suggest-article` provided one): the element's placement in
  the article — `{ paragraphIndex, quote }`, the passage this visual serves. Copied verbatim
  like `sourceHint`; EXPORT emits it at hand-over (§6, delivery placement).
- **`freeStanding: true`** — the OTHER way to declare a placement, and it is a declaration, not a
  blank. It says this element belongs to the piece as a whole rather than to one passage: an
  opening visual, a closing one, a standalone card. Use it whenever there is no passage to anchor
  on, instead of leaving both fields out.

  **Once an article was read, silence is not an option: the export REFUSES an element that declares
  neither.** An `anchor` or `freeStanding: true` — one of the two, per element. This is the one
  place the flow makes you say something you could previously omit, and the reason is that an
  omitted placement is indistinguishable from a forgotten one: the journalist receives a finished
  visual with no idea where it goes, which is exactly what suggest-article did the work to prevent.
  A run with no article at all (a bare topic) is unaffected — nothing to place it in, nothing
  refused. Neither is a direct-branch run that never read one.

**`confirmedTakeaway` is REQUIRED** — the spine's validation gate (`src/validate-gate.ts`) FAILS any
proposal missing/empty it (GUARD 3), on both branches. It is the Gate-1b presence lever: Gate 3a quotes
it VERBATIM against the produced title, part by part — copy the confirmed wording exactly, never a
paraphrase that drops a part. **Per-element, never shared:** each entry carries its OWN confirmed claim;
the same gate FAILS two proposals of a batch with the byte-identical `confirmedTakeaway` (GUARD 3b).
**`channel` is REQUIRED** — the CADRAGE Q6 pick, copied verbatim; `produce-all`'s channel/format gate
reads it to enforce "not-embed ⇒ never interactive/scrolly", and an ABSENT channel falls back to the
permissive `article-web` (a dropped `channel` would ship an interactive nobody asked for; a GARBLED one
fails closed). Never omit it. See `docs/splash/guardrails.md`.

**Record each flow decision mechanically (does NOT replace the gate — it feeds it).**
After the corroborating step, run the sanctioned writer so the spine can verify it:
- after suggest-chart produced `candidates.json`:
  `bun skills/splash/scripts/save-decision.mjs suggest-chart-invoked <runDir>`
- when citing the article's source:
  `bun skills/splash/scripts/save-decision.mjs source-fidelity <runDir> --payload '{"article":"…","sourceName":"…","sourceUrl":"…"}'`
- when escalating to chart-native on a dw-reachable type:
  `bun skills/splash/scripts/save-decision.mjs producer-escalation <runDir> --payload '{"escalationReason":"…"}'`
`<runDir>` is the directory that holds `accepted.json`/`candidates.json`. The writer REFUSES a
decision whose evidence is missing — you cannot record a routing that did not happen.

**Before producing: the menu is a precondition, checkable directly.** `produce-all` itself refuses
to start when no ranked menu was ever written down for this story — the same disk fact is available
standalone, so a missing menu is caught before the heavier script even runs:
```bash
bun lib/host/cli.ts precheck --stage production --dir exports/<slug>
```
A non-zero exit means `candidates.json` is absent (PROPOSITION's Stage-1 write never happened, or
happened somewhere else) — production does not start until it exists, for every proposal EXCEPT
the direct branch: an `accepted.json` where every proposal is `skillsInvoked: ["splash:cadrage-direct"]`
(the journalist NAMED the visual) needs no menu, and `precheck` reads that same file beside `--dir`
to grant the same exemption `produce-all` itself applies.

**5c. Produce everything at once** — the report lands in a FILE by itself (the gates and EXPORT read
it back):
```bash
bun skills/splash/scripts/produce-all.mjs exports/<slug>/accepted.json exports/<slug>
```
`produce-all` iterates EVERY proposal, dispatches to the right producer + format, and writes
`{ results: [{ id, producer, actualProducer, format, status, outputs?, publicUrl?, reason?, error?, renderApproved }] }`.
It exits non-zero only if some `status` is `"failed"`. **`produce-all` WRITES `exports/<slug>/report.json`
itself** — you do not have to redirect, and forgetting to is no longer a way to lose the render gate
and the sign-off (both take that file as an argument; a real host run produced a correct chart, forgot
the `>`, and left both unreachable with nothing reporting it). It still prints the report on stdout,
so `> exports/<slug>/report.json` remains legal and writes the same bytes; producer progress goes to
stderr, so stdout stays pure JSON.
**Producer-match guard (GUARD 1, `src/producer-guard.ts`):** `actualProducer` records what ACTUALLY
ran; `produce-all` fails-hard when it diverges from the accepted `producer` (a silent dw-chart→chart-native
flip is refused). The ONE sanctioned switch is the native→dw fallback (`needs-fallback`, below); any other
element/format change goes back through `suggest-chart` (5d / see Never) — never hand-swap the producer in
`accepted.json`. See `docs/splash/guardrails.md`.

Before dispatch, `produce-all` re-validates EVERY accepted proposal at the spine
(`src/validate-gate.ts` → `validateAccepted`): the producer's own validator, the placeholder-source
guard (GUARD 2), and the deterministic guardrail-parity gate (aspect↔type, chart-native furniture,
subject-fit) — there is no trust boundary with `suggest-chart` (same LLM), so a HAND-AUTHORED spec must
clear the identical bar or it comes back `status:"failed"`. Guard details: `docs/splash/guardrails.md`.
The SEMANTIC parts (is the title really the insight? the RIGHT chart?) have no gold at produce and stay
the render-review's job (GATE 3); validator WARNINGS stay advisory here, surfaced at the render gate.

**Every re-produce (any re-run of 5c) writes a WHOLLY FRESH `report.json`** — `renderApproved:false` and
`reviewed` absent for EVERY proposal, even one already approved before the correction (a re-produced
artifact has never been through Gate 3). So Gate 3a then 3b MUST run again, in order, on the NEW render;
never call `gate-render` right after a re-produce assuming a prior sign-off holds (see Never), and never
hand-edit `report.json` to restore a prior approval. The render-provenance guard refuses a stale-generation
approval — `docs/splash/guardrails.md`.
Each proposal's artifacts land in a **per-proposal subdir** `exports/<slug>/<id>/` — that subdir (not the
parent `exports/<slug>`) is the `<outDir>` you hand to the EXPORT scripts below.

**5d. Act on each result's `status` (every accepted id appears — nothing is dropped):**
- **`produced`** → go to GATE 3 for that visual.
- **`needs-confirmation`** (a `provenance:"prose"` proposal not yet confirmed) → this is **Gate 2b**:
  show the reconstructed table to the journalist, get an explicit OK, set that proposal's
  `confirmedTable: true` in `accepted.json`, and re-run 5c. Never chart a prose figure unconfirmed.
- **`needs-fallback`** (a native chart type chart-native cannot map) → re-emit a **dw-chart** `ChartSpec`
  for that claim via suggest-chart, replace that proposal's `producer`/`spec` in `accepted.json`, re-run
  5c. Do not hand-translate. This native→dw direction is the ONE producer switch GUARD 1 sanctions; the
  reverse (dw→native) or any other switch is refused (see 5c).
- **`failed`** → surface the `error`; fix the spec or drop the proposal. Never ship a failed visual.
  **A non-zero `produce-all` exit (or any gate refusal) is a HARD STOP surfaced to the journalist AS-IS
  — never worked around** by re-authoring code, hand-editing outputs, an ad-hoc script, or a silent retry
  with hidden changes (see Never; the harness `check:conformance-no-fabrication` catches a produce exit=1
  the run continued past). If the
  failure is a **conformance gate** rejecting the accepted spec (e.g. a colour/contrast/format
  violation) — do NOT silently mutate the accepted spec (`baseColor`, format, etc.) to make the gate
  pass without saying so: SURFACE the conformance issue to the journalist as-is, and if the spec
  genuinely needs to change to fix it, re-open GATE 2 for the journalist to re-accept the changed spec —
  never edit-and-reship a spec the journalist never saw (see Never). If the
  failure traces to the PRODUCER/COMPONENT'S own source code rather than the spec — a genuine engine bug,
  not a data/shape problem — do NOT edit that code (`skills/*/src`, any `.tsx`/`.ts` producer file) to force
  the gate green, and do NOT author a NEW ad-hoc script (a case-named `verify-*.mjs`) to stand in for a
  pipeline step: REPORT the bug to the journalist (this visual cannot ship yet) and drop or route around
  the proposal instead (see Never).

**Bounded retry — a failing produce/validate is never worked around.** When produce-all or a
validator exits non-zero, it is retried ONCE, with the error message quoted verbatim and
shape-only fixes (fix the malformed/missing spec field the error names — a SUBSTANTIVE spec
change still re-opens GATE 2 (5d); never rewrite content to dodge a guard, never switch tools,
never hand-build artifacts). If it fails again: STOP and present the failure to the journalist
honestly (see the Stall protocol, below the flow).

**GATE 3 (render) — per produced visual.**

**3a. Render-review FIRST (mandatory, Layer 2).** Before you show the journalist anything, put the
produced visual through an INDEPENDENT editorial pass per `references/render-review.md`: read the ACTUAL
render + the article + data against the six criteria (title honesty — including that the title matches
the takeaway the journalist confirmed at CADRAGE Gate 1b, not a narrower or different claim — source
traceability, honest encoding, earns-its-place, legibility/a11y, fidelity). **The review MUST QUOTE the
proposal's `confirmedTakeaway` (from `accepted.json`, 5b) VERBATIM and state EXPLICITLY whether the
produced title/insight carries ALL its parts** — a two-part takeaway ("X is falling everywhere AND
Italy is the only riser") needs BOTH parts carried by the visual's title/framing, or the dropped part
recorded as a concern; a review that never quotes the confirmed takeaway, or quotes it without the
part-by-part statement, is NOT a valid render-review (this omission is itself a review failure —
re-run 3a properly). This is the recurring miss this lever exists to close: a chart type that
foregrounds one half of the confirmed claim (a slope showing the fall but not the one riser) silently
drops the other half unless the review names it. **For a SCROLLY, the review MUST likewise verify EACH
step caption against what that step visually shows** — in particular any COMPARATIVE or RANK claim in
a caption (« devant » / "ahead of", « top 3 », "the highest") is checked against the actual data
ordering the step renders; a caption asserting an order the sorted values contradict is a concern (a
shipped beat caption claimed a value ranked « devant » two others while it was lower than both — see
the beat-model rule at PROPOSITION). A scrolly review that never states this per-step caption check is
not a valid render-review either. These catch what the spine's
code gates cannot — a title that misstates the metric, a fabricated or incomplete source, a misleading
encoding. **Never spawn an Agent/Task sub-agent to do this review** — during the splash flow you ONLY
sequence, gate, and invoke producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing
(an agentId) into the journalist-facing conversation. Review adversarially yourself (try to falsify each
criterion). **For an interactive or scrolly deliverable, a static read (`static.png` / a video frame)
verifies ONLY the still surface — layout, labels, colour, aspect, title, source, emphasis. It shows
NOTHING about hover/tooltip/pan/zoom: never assert an interaction "works" from a still.** An interaction
claim (a tooltip surfaces, its text is legible, it stays in-viewport, a map popup shows the right
name/value) is allowed only by citing the pass of the producer's interaction snapshot — which already ran
fail-hard inside `produce-all` — or re-running it: chart-native `snap-tooltip-contrast.mjs` /
`snap-tooltip-viewport.mjs`, map-native `snap-proof.mjs` (see `references/render-review.md`, "Interaction
claims require an interaction test"). No cited run → record "not interaction-tested", never a pass. Record
it (export is refused without a review record) — **`--probes` is REQUIRED: a PLAN of every check the
review runs, not a self-reported result** — `[{kind: "mechanical", check, command: […]}, {kind:
"editorial", check, outcome: pass|concern|resolved, note?}, ...]` (inline JSON or a file path; see
`references/render-review.md`, "Record it"). **The probes decide, the gate reads them:** a
`mechanical` probe carries the argv that answers it, and `review-gate.mjs` RUNS it itself — the
recorded outcome is what the command's exit code says (0 → `pass`, anything else → `concern`),
never what you write. An `editorial` probe is the half no command can answer (a judgement); it
carries its own `outcome`/`note` untouched, but the moment the plan carries even ONE, **`--reviewer
<name>@<version>`** (e.g. `desk-reader@1.0.0`) is REQUIRED, naming WHO made that judgement — a
review with an editorial probe and no `--reviewer` is refused. The gate refuses an empty ledger, a
probed concern the review silently drops (EACH concern-outcome probe must be referenced by a
surfaced concern quoting its `check` verbatim — `"<check>: <what failed>"`; an unrelated concern
never accounts for it), and a failure keyword (404/absent/missing/mismatch…) no probe outcome
reflects — a probed failure is either surfaced as its own concern (advisory) or explicitly resolved
with evidence, never narrated away. (A fresh DW publish may 404 its `dataset.csv` briefly — a
`mechanical` probe's own command should retry once, internally, after
`DW_DATASET_PROPAGATION_RETRY_MS` before answering `concern`; through this CLI a retry that clears
is recorded as `pass`, never `resolved` — `resolved` is reachable only for an `editorial` probe.)
```bash
bun skills/splash/scripts/review-gate.mjs exports/<slug>/report.json <id> \
  --probes '[...]' [--reviewer <name>@<version>] [concern...]
```

**3b. SURFACE the render, THEN ask — never the reverse.** Before you ask the journalist ANYTHING about
the visual, put the ACTUAL render in front of them: send the artifact file (the PNG/HTML) with
`SendUserFile`, or — for a hosted producer — state the live URL on its own line. **Describing the chart
in prose is NOT showing it** ("barres violettes, fracture 83/16" is a description, not a view); the render
displaying on YOUR side is not the journalist seeing it. Asking "c'est bon ?" / "tu valides ?" before the
journalist can actually SEE the render is the recurring "je veux bien valider mais tu ne me l'as pas
montré" failure — surface FIRST, ask SECOND, every time. Then present the review's concerns TOGETHER with
it and get an explicit "ship it". The concerns are advisory — the journalist is the editor. This
should rarely fire on source now that Gate 2c establishes it proactively before PRODUCTION — but if a
concern is about the source (missing, name-only, generic, or unclear), ask the journalist to supply it as
ONE free-text prompt collecting the label AND the **specific, traceable dataset/page URL** together (e.g.
the Eurostat dataset page for the exact table, the Insee series page — NOT the organisation's homepage) —
never a single-select (see CADRAGE) — then update the spec, **re-run 5c (`produce-all`) to get the NEW
render, and re-run 3a (`review-gate`) on THAT render** before showing again — never jump straight from an
updated spec to 3b (`gate-render`); the fresh report 5c writes resets `reviewed`/`renderApproved` for
exactly this reason (see the ★ note under 5c above), and 3b's approval is only ever for the render just
shown, never a prior one.
Verify quality, not just that it built.

**SHOWING IT IS A COMMAND, not only an intention.** (The duty is also in the Never list below; it
belongs HERE too, in the step where the act happens — a rule found only in an appendix is a rule read
after the mistake.) Open the artifact for the journalist with `present`, which BOTH surfaces it and
writes the receipt the approval gate reads back (`_shown/<file>.json`, `lib/loop/presentation.ts`):
```bash
bun lib/host/cli.ts present --path exports/<slug>/<id>/static.png
```
Skip it and `gate-render` refuses — *« nobody has been shown this visual yet, so there is nothing to
have an opinion about »* — which is correct, and is exactly what a run that described the render in
prose instead of opening it deserves. The refusal names this command, so a run that forgets it can
recover; do not make it earn that.

**After "ship it", record the approval — pass the LOCAL
artifact file path on disk, NEVER the public/cloud URL** (a Datawrapper `publicUrl`, a Cloudflare embed
link, etc.): `gate-render` opens and hashes the file at that path, so a public URL ENOENTs. It must be
the SAME path `present` was given — the gate compares the approved bytes against the shown ones.
```bash
bun skills/splash/scripts/gate-render.mjs exports/<slug>/report.json <id> exports/<slug>/<id>/static.png
```
(swap `static.png` for whichever local file the journalist approved — e.g. `interactive.html`,
`scrolly.html`, or the rendered `.mp4` — always the path under `exports/<slug>/<id>/`, never a URL.)
**PROVENANCE is enforced mechanically** (`src/render-provenance.ts`): the approved file must be an
output the pipeline emitted for the CURRENT produce generation — listed in this report's `outputs`
and no newer than the report's `generatedAt` stamp. A file hand-authored into the build subdir, or an
artifact from a later produce approved against a stale report, is a hard refusal — save the fresh
`report.json` and redo 3a → 3b. **Hosted-DW interactive (a `publicUrl`, NO local render):** never
write a stand-in file into `exports/<slug>/<id>/` (it would leak into export-code's hosted-embed
detection) — capture the reviewed live embed (screenshot or saved page) into the sanctioned
`_review-artifacts/<id>/` directory (SIBLING of the build subdir) and approve THAT file; the gate
accepts it only for a hosted result and only if captured AFTER the current produce generation.
**Capture to an ABSOLUTE, run-scoped path — never a bare relative `exports/...`.** Verifying an
interactive means you may have `cd skills/<producer>/` earlier to run an interaction snap, so a
relative `exports/<slug>/_review-artifacts/<id>/` resolves against THAT cwd and the screenshot lands
under `skills/<producer>/exports/…`. Resolve the absolute capture dir FIRST — anchored on where `report.json` lives, e.g.
`CAP="$(cd exports/<slug> && pwd)/_review-artifacts/<id>"; mkdir -p "$CAP"` — and capture into `$CAP`
(then approve `$CAP/<file>`). If a capture ever lands in the wrong place, that is a mis-path to RE-CAPTURE
at the absolute path (the provenance refusal names it), never to `mv` into position (see Never).
`gate-render` is the ONLY writer of the render approval; EXPORT refuses any visual not render-reviewed
(3a) AND not approved (3b) — so an unreviewed, unseen, or unapproved render can never ship.

_(Under the hood `produce-all` dispatches to `chart-native/scripts/produce-from-spec.mjs`,
`map-native/scripts/produce.mjs`, `scrolly/scripts/produce.mjs`, and the Datawrapper producers — you
call `produce-all`, not them directly. An omitted map-native format still defaults to `static`, never
the full video set.)_

### 6. EXPORT — GATE 4 (delivery depends on the visual's format)

**★ State the PLACEMENT of each delivered element — WHERE it goes in the article. You RELAY it; you do
not compose it.** The export scripts emit the placement themselves, per element, between the markers
`SPLASH_PLACEMENT <proposalId>` and `END_SPLASH_PLACEMENT` (plus a machine `PLACEMENT_JSON` line for
anything that parses). **Relay it VERBATIM.** Do not rewrite those lines into your own sentence, do not
translate them, and do not assemble a placement from the proposal yourself — `skills/splash/src/placement.ts`
resolves it from the accepted entry and `export-code.mjs` prints it at every hand-over, so a hand-written
version can only drift from what the code decided.

Two things to carry when you relay. First, **the quote is what to trust** and the paragraph number is
only an indication: a journalist edits their piece between the analysis and the delivery, so §4 may have
become §5 while « les frontaliers de Bonneville » is still exactly where the visual belongs. Say it that
way round. Second, placement stays ADVISORY — the journalist does the final positioning.

On a multi-element hand-over, relay each element's own block, so a 3-visual article gets « le chart des
recettes → §2 ; la carte → §5 ; le scrolly → la fin », not one undifferentiated dump. Absent an anchor,
the emitted block says the element is free-standing — relay that too, and never invent a paragraph.

**★ The sign-off state is TOLD, never pasted.** The export scripts print the machine token
`EDITORIAL: unsigned — LLM render-approval only` (or `signed by …`, or `skipped …`) and, on the
next line, the same state as a sentence for a person — `SIGNOFF: …`, already in the journalist's
language (`lib/newsroom/ui-copy.ts`). Relay the `SIGNOFF:` line, never the `EDITORIAL:` one: the
INFORMATION matters at hand-over (nobody human has signed this off — the automatic checks are all
that stands behind it), the machine's phrasing of it does not.

**Delivery location — stable, never the scratchpad.** Write every hand-over (export folder, mp4, PNG) to
`exports/<slug>/` under the journalist's working directory (the splash project root), NOT the session
scratchpad — the scratchpad is temporary and gets cleaned, so the journalist would lose the deliverable
(and cannot find it). After delivering, print the file/folder's ABSOLUTE path. `export-code.mjs` refuses
(non-zero) if the export path looks ephemeral. The ship scripts also refuse unless the proposal is
`produced` AND render-approved (GATE 3 done) — pass the report + id so the gate can check. **If a ship
script exits non-zero (an ephemeral path, an unmet `assertDelivered` shape, a missing prerequisite), that
is a HARD STOP surfaced to the journalist — never worked around** by `mv`/`cp`-ing files into the shape a
gate expects, by hand-editing the export folder, or by a silent retry; fix the actual cause (re-run the
correct `--form` build, point the script at the file production emitted) and re-run the script (see Never).

Branch EXACTLY on the channel/format model (`skills/splash/src/channel.ts`) — **image and video hand
over the media directly, no delivery menu; only interactive gets a delivery choice, and only because
article-web is the one channel that can host it**:

- **VIDEO (mp4):** hand over the mp4 directly, at the CADRAGE channel's size and the narrative sub-format
  chosen at PROPOSITION (camera/reveal mode) — no code/embed forms, the media IS the deliverable. The
  producer renders **only the one aspect the channel requires** — social-vertical → **portrait 9:16**
  (1080×1920), social-feed → **square 1:1** (1080×1080), article-web → **landscape 16:9** — **one mp4, not
  three** (the aspect is threaded via `SPLASH_CHANNEL`; a fail-hard produce-time conformance step refuses
  a render whose size ≠ the channel). Native chart-native/map-native now render **true 9:16** for
  social-vertical (Slice 2 repointed the portrait comps 1080×1350 → 1080×1920), matching `dw-chart`'s
  static portrait — no more 4:5 caveat.
  **Run the hand-over script even though there is no delivery menu** — it is what PRINTS the placement
  block, and §6 forbids you to compose one yourself:
  `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results exports/<slug>/report.json --id <id>`.
  Without it nothing states where the video goes, and the placement guard never runs either, because it
  lives inside this script.
- **STATIC IMAGE (a static chart / map PNG):** hand over the `static.png` directly, at the channel's size
  (portrait 1080×1920 for social-vertical, square 1080×1080 for social-feed, landscape 1200×675 for
  article-web) — no delivery menu, just the file.
  **Run the hand-over script anyway**, for the same reason as VIDEO: it prints the placement block, and
  §6 forbids composing one by hand —
  `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results exports/<slug>/report.json --id <id>`.
  Skipping it is how a static or video delivery silently loses its placement while interactive keeps one.
  `precheck --stage export --dir <dir> --format static`
  is not documented as a required step here the way it is for interactive/scrolly above (the mechanism is
  format-agnostic, but coverage is uneven across producers: chart-native's static/video build subdir always
  carries `config.json` so the check is meaningful there, map-native's does not plant a marker in every
  case, so a clean check is not yet a reliable "this folder is safe to hand over" signal for it — a
  follow-up, not resolved here).
- **INTERACTIVE or SCROLLY (a self-contained `interactive.html` / `scrolly.html`, article-web only):**
  splash **PROPOSES three delivery forms and the journalist CHOOSES one — and ONLY the chosen form is built
  (LAZILY, on demand)**. There is no "produce all forms unconditionally": the React bundle and the Cloudflare
  deploy are expensive/irreversible, so nothing beyond the produced `interactive.html`/`scrolly.html` is
  materialised until the journalist has picked. **There is NO auto no-JS `static.html` fallback** — accessibility
  is a FORMAT choice at CADRAGE (picking `static` IS the accessible path), not a file bolted onto every
  interactive. `export-code.mjs` is a **two-phase** script:
  1. **Phase 1 — emit the proposal (build NOTHING).** Run WITHOUT `--form`:
     `bun skills/splash/scripts/export-code.mjs exports/<slug>/<id> exports/<slug>/<id>-export --results exports/<slug>/report.json --id <id>` (the source is the per-proposal build subdir from 5c).
     It emits a fixed three-form proposal DESCRIBING what each form WOULD be — an `EXPORT_FORMS_JSON {…}` line
     (machine-parseable: `forms.a` = `{kind, path, pending:true}`, `forms.b.path` = the standalone HTML file,
     `forms.c.command`/`url`, each with a `deliver` command = the exact `--form` re-invocation) plus an
     `EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL` human block. **No bundle is assembled, no deploy runs,
     no folder is written** at this phase — the paths in the proposal are `pending`.
  2. **THEN relay the emitted proposal VERBATIM and ASK which form the journalist wants (a / b / c) — an
     explicit, un-skippable GATE.** Do NOT collapse it to a bare "Livré."; do NOT pick for them. Relay the
     script's `EXPORT_FORMS_PROPOSAL` block (it already carries the concrete paths + the `deliver` command for
     THIS export), then wait for their answer.
     **★ WAIT means WAIT: after emitting the proposal, `--form` MUST NOT run until a journalist message
     answering THIS proposal exists in the conversation.** "The only possible form is c, so I finalize" is the
     NAMED VIOLATION — observed on a real two-element hosted-DW run, where splash emitted both proposals,
     announced « Je finalise la livraison sous cette forme pour les deux », and ran `--form embed` twice
     without a single journalist turn in between. A hosted-DW proposal offering ONLY form c is still this
     gate: the journalist confirms the single form; splash never confirms in their place.
     **Multi-element delivery: the form choice is PER ELEMENT (forms may differ).** Either ask element by
     element, or ask ONCE for all of them while EXPLICITLY offering the grouped reply (relay each element's
     proposal and invite « une forme par élément, ou la même pour tous »). A grouped journalist answer
     (« embed pour les deux ») is a valid choice for every element it names — but the grouping is the
     JOURNALIST's to give, never splash's to presume: applying one element's answer (or no answer at all)
     "to both" is auto-deciding, the same named violation.
     The three forms are:
     - **a) Code source** (`forms.a`) — the delivery depends on the producer: **chart-native** assembles
       ON DEMAND a `<id>-source/` runnable React/Vite bundle (`export-source.mjs`) — `bun install && bun run
       build` → `dist/index.html` reproduces the interactive (THIS is the headline form-1 capability).
       **map-native / scrolly** assembles ON DEMAND a `<id>-source/` runnable Vite project too
       (`bundle-source.mjs`, closure-traced) — same build command, but **online-only** (needs the
       journalist's OWN `VITE_MAPTILER_KEY`, never baked in). Per-producer bundle mechanics (closure-tracing,
       exact file layout, deps) are in **`references/export-code-source-forms.md`**.
     - **b) HTML autonome** — JUST the single self-contained file: the JS-inlined `interactive.html`
       (`scrolly.html` for a scrolly). One file, drops into any CMS/email/offline.
     - **c) Embed (hébergé)** — deploy the html to the newsroom's own Cloudflare Pages project and share the returned URL
       (for a **hosted-DW** producer, whose interactive IS the already-published embed, this is the live
       `publicUrl` — no deploy step). **A SELF-HOSTED embed (no live `publicUrl`) needs the Cloudflare credentials**
       to deploy. When one is missing the proposal flags form c `available:false` and carries `missingKeys` +
       a `reason` with the get-it URL.
       **A missing embed key is a KEY-PREREQUISITE, not a dead end — treat it exactly like a yellow engine
       key (§INPUT):** if the journalist picks c), explain what the missing key unlocks and where to get it
       (the `reason` carries the URL), collect it in ONE free-text prompt per key, save it with
       `bun skills/splash/scripts/save-key.mjs <NAME> <value>` (never hand-edit `.env`, never echo the value
       back), then re-run the `--form embed` deliver command. Only if the journalist declines to provide the
       key do you fall back to **b) HTML autonome**. Never silently downgrade c) to b).
       `SPLASH_EMBED_PROJECT` is the newsroom's own project name and becomes the PUBLIC URL — ask for a name
       that identifies the newsroom (e.g. `heidi-news-splash`); generic names are refused by the adapter.
       (A hosted-DW form c stays available — it needs no deploy of ours.)
  3. **THEN build + deliver ONLY the chosen form** — re-run `export-code.mjs` with `--form <html|code-source|embed>`
     (the `deliver` command from the proposal is exactly this):
     - `--form html` → copies the standalone `interactive.html`/`scrolly.html` into the export folder; print its
       ABSOLUTE path (that single file IS the delivery).
     - `--form code-source` → runs `export-source.mjs` NOW (chart-native) or `bundle-source.mjs` NOW
       (map-native/scrolly) to assemble the runnable `<id>-source/` bundle; print its ABSOLUTE path.
     - `--form embed` → runs `deploy-embed.mjs` NOW to publish to the newsroom's OWN Cloudflare Pages project
       (`$SPLASH_EMBED_PROJECT`) and records the hosted URL in `EMBED_URL.txt` (a hosted-DW producer
       records its already-live `publicUrl`, no deploy). Share the URL. **Integrity: `deploy-embed.mjs`
       FAIL-FASTS (non-zero, before any network call) if the Cloudflare credentials are unset and there is no live
       `publicUrl` — it never half-deploys or writes a placeholder; `export-code` surfaces that message and
       refuses.** The URL recorded must pass `isHostedUrl` (a real https origin) or the export fails.
     Each run ends with the `assertDelivered(files, { format, form })` gate — the folder must match the
     `(format, chosen form)` shape or the export fails loudly. For **form embed** that gate is strict like
     static/video: the folder must be EXACTLY `EMBED_URL.txt` holding a resolvable https URL — the pre-export
     PRODUCTION output (the produced `interactive.html`/`static.png`) is NOT an embed deliverable, so handing
     it over cannot fake `delivered`. **Hosted Datawrapper interactives** (`publicUrl`,
     no local html) offer ONLY form c (the live embed) — there is no React source and no standalone local html
     to hand over.
     **Before you NAME this folder to the journalist, the same fact is checkable directly, on demand:**
     ```bash
     bun lib/host/cli.ts precheck --stage export --dir exports/<slug>/<id>-export --format <format> --form <chosen>
     ```
     A non-zero exit means the folder still holds a file the build leaves behind (`config.json`,
     `report.json`, …) — that is the directory the build worked in, not the finished deliverable
     (`assertDelivered` already refuses this INSIDE `export-code.mjs`; this is the same disk fact,
     callable again right before you relay the path — a second look costs one command).

  **`delivered` REQUIRES that `export-code.mjs --form <chosen>` built the artifact** (for interactive/scrolly).
  Never report an interactive/scrolly as delivered on produce-time outputs alone — a Gate-3 review PNG,
  `interactive.png`, or the build subdir's byproducts are NOT a delivery. If the `--form` build did not run, the
  visual is NOT delivered, no matter how the run otherwise ended.

  The one-time Cloudflare setup (on the newsroom's OWN account) + the token details are in
  **`references/cloudflare-setup.md`** — consult it only when a journalist first chooses the embed form.

**Session close — after the handover.** Once the deliverable is handed over and the journalist signals
completion — a pure thanks/goodbye with no new request ("Merci, tout est en ordre", "That is everything,
thanks") — send AT MOST ONE brief closing message and treat the session as ENDED: no new questions, no
re-engagement, no repeated farewells, and no echoing further goodbyes back (trading "Parfait, à bientôt."
/ "À bientôt !" variants turn after turn is noise, not service). A message that carries ANY new request
alongside the thanks is NOT a close — handle the request instead. (The step-12 other-format offer
below is made WITH the handover, BEFORE any close — the journalist declining it, or a pure thanks
after it, is what closes the session.)

### Step 12 — offer another format (proactive, after EVERY export)

Once an element is exported, OFFER another format of the same element — « tu la veux aussi en
vidéo pour Instagram, ou en image pour le print ? » — the journalist doesn't have to know to
ask (canonical step 12). On a yes:
- re-ask ONLY the channel/format pin for the new target (one line, or infer + confirm-back
  when the ask names it — « une vidéo Instagram » ⇒ social-feed/video);
- append a NEW `accepted.json` entry: `id` = `<original-id>-<format>` (NEW id ⇒
  `produce-all`'s per-id `freshOutDir` can never wipe the first delivery); `spec`,
  `confirmedTakeaway`, `provenance`/`confirmedTable`, `sourceHint` copied VERBATIM (the
  duplicate-takeaway guard, GUARD 3b, sanctions this ONE twin shape — a `<id>`/`<id>-<format>`
  pair — because it is the SAME element re-formatted, not a second element);
- PRODUCTION → Gate 3 → EXPORT run as any cycle (a fresh render is never pre-approved).
No re-CADRAGE, no re-selection. The single-format model is untouched: each cycle produces
exactly ONE pinned format — « chaque graphique aura plusieurs formats » = short journalist
cycles, never a batch.

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
