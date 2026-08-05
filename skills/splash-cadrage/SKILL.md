---
name: splash-cadrage
description: "Use as phase 3 of the splash flow: the questionnaire that establishes editorial intent, the confirmed takeaway, the channel and the source. Invoked by skills/splash at the CADRAGE step, never directly by a journalist. Keywords cadrage, framing, gate 1, takeaway, questionnaire, channel, source, editorial intent."
---

# splash-cadrage — CADRAGE — establish the editorial intention and the truth of the data. Gates 1, 1b, 2b, 2c.

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
   **★ WHERE THE WORDS COME FROM — the rule that makes a proposed beat honest.** The machine
   APPAIRS and ORDERS; it does not write the journalism. Transposed verbatim from the principle
   `suggest-image` already ships and that this project validated in practice: *the model serves
   MATCHING and ORDER only — "which passage of the article is this beat about?" — never
   description.* So:
   • **Each beat's claim is drawn from the passage of the JOURNALIST'S OWN ARTICLE that speaks to
     that anchor**, reformulated to stand alone — never invented, never derived from the data
     alone. What they re-read is their own prose, not a machine's sentence.
   • **The order follows the article's narrative**, not the data's salience. "The machine sorts by
     descending value" and "the journalist argues" are different orders, and the second one wins —
     this is precisely what the earlier storyboard did backwards.
   • **What the article does not supply is ASKED, never filled in.** If no passage speaks to an
     anchor the data makes salient, say so and offer to drop the beat or hear what it should say.
     Silence is a question, not a licence.
   • The `draftText` the engine emits is a **factual label** (`"Genève — 1780 CHF"`, an anchor and
     a number), deliberately not a sentence: it says what the beat is ABOUT so the journalist knows
     which passage to draw from. It is never shipped — `produce` refuses a beat whose `text` is
     empty (`unauthoredBeats`).
   **This applies to the MAP track identically** (sub-project ③ opened it: a map scrolly and a map
   video are proposed a walk the same way), and to the `stepped` video kind.

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
