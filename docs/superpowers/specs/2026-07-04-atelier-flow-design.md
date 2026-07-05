# Atelier flow — orchestrator design

**Goal:** One top-level entry point that runs the whole atelier pipeline end-to-end — from an
article and/or data to a finished, exported visual — sequencing the skills we already built and
adding the two missing pieces: the framing questionnaire (CADRAGE) and the export choice.

**Architecture:** A dedicated orchestrator **skill** (`skills/atelier/SKILL.md`) drives six ordered
phases with explicit human gates. It never re-implements analysis, routing, or production — it
*invokes* `suggest-article` (analysis + opportunities), `suggest-chart` (element/format/producer
routing + spec), and the producers (`dw-chart`, `chart-native`, `map-dw`, `map-native`, `scrolly`).
It adds CADRAGE (intent questionnaire + a guided/direct branch) and EXPORT (code vs embed link).

**Tech stack:** Claude Code skill (Markdown SKILL.md, XML-tagged body — the atelier skill
convention). The producers it calls are Bun/TypeScript. The embed-link export uses `flyctl`.

## Global Constraints

- Language: the orchestrator is **user-facing** — detect the journalist's language from their first
  message and conduct the ENTIRE dialogue (questions, recaps, gate prompts, export) in that language.
- Never invent data or claims (inherited from `suggest-article`/`suggest-chart`).
- Nothing auto-progresses past a gate — every gate is an explicit human stop.
- The orchestrator decides nothing the sub-skills already decide; it sequences and gates.
- Bun always for any script. English for code/comments/commits; the *dialogue* follows the journalist.

## The six phases

### 1. INPUT
Accept any of: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a
bare topic ("sans rien"). Normalise into `{ article?, data?, topic? }`. A messy CSV may be routed to
data-preparation first (out of scope for v1 — note it).

### 2. ANALYSE (silent)
Run `suggest-article`'s silent read: identify the data, the quantified **claims**, and the
**narrative structure**. Produce nothing to the user yet — this only primes CADRAGE. For a bare topic
(no article/data), ANALYSE instead names the data the topic would need (the honest "sans rien" path).

### 3. CADRAGE (gate 1 — questionnaire)
In the journalist's language, one question at a time, ≤4 questions:
1. **Branch:** "Do you already have a visual in mind, or should I guide you?"
2. **Takeaway:** "What is the one thing a reader should leave with?" → the insight/angle.
3. **Audience & channel:** "Where does this publish — article embed, social, print?" → the format
   signal that fires `suggest-chart`'s Gates 1–4 (static / interactive / video / scrolly).
4. **Constraint (optional):** mobile-first, deadline, house palette — only if relevant.

The answers become the `intent` (+ format signal) that `suggest-chart` consumes.

**Branch outcomes:**
- **Direct** — the journalist states the visual ("a scrolly map of the migration data"). Skip
  PROPOSITION. Run `suggest-chart` **constrained to their stated element/format** so the hand-chosen
  visual still gets a validated spec + the quality guardrails. Go to PRODUCTION.
- **Guided** — go to PROPOSITION.

### 4. PROPOSITION (gate 2 — accept/edit/reject)
Guided path only. Present the `suggest-article` ProposalSet (which claims deserve a visual) ×
`suggest-chart` routing (element / format / producer per claim), each as a plain-language line: *what*
it shows, *which* visual, *why*. The journalist accepts, edits, or rejects each. Only accepted
proposals proceed.

**Data-provenance gate (2b):** if any accepted proposal's figures were extracted from prose
(`provenance: "prose"`), show the reconstructed table and get an explicit OK before producing (the
`suggest-article` rule) — never fabricate a dataset attribution.

### 5. PRODUCTION
For each validated visual, run the chosen producer with the `suggest-chart` spec. The producer emits
its self-contained artifact(s) — a static PNG, an interactive HTML, mp4s, or a scrolly HTML — and
runs its own render guardrails (responsive, occlusion, label-safety, filter smokes, etc.).

**RENDER gate (gate 3):** show the actual render (open it / a screenshot) and get an explicit "ship
it" before EXPORT. Verify quality, not just "it built."

### 6. EXPORT (gate 4 — code vs link)
Ask the journalist which they want:
- **Code (technical):** hand over the producer's artifacts — the self-contained `.html` (+ PNG/mp4) —
  with a one-line embed note (`<iframe src="…">` or `<img>`). Immediate, no infra.
- **Embed link (non-technical):** deploy the HTML and return an iframe-ready URL.

**Embed-link mechanics:** ONE persistent fly.io host app (e.g. `atelier-embeds.fly.dev`) serving many
projects, each at `…/<slug>/index.html`. A deploy script (`skills/atelier/scripts/deploy-embed.mjs`)
uses `flyctl` to upload a project's HTML to the app and prints the embeddable URL. One app, many
embeds — no per-project app sprawl. Requires the user's fly.io account (a `flyctl auth` + the app
created once). Until the app is set up, EXPORT offers **code now + "embed link (setup pending)."**

## Gates (summary)

| # | Gate | Stop |
|---|------|------|
| 1 | CADRAGE | the questionnaire (branch + intent) |
| 2 | PROPOSITION | accept / edit / reject each proposed visual (guided path) |
| 2b | Data provenance | confirm a prose-reconstructed table before producing |
| 3 | RENDER | show the real render, get "ship it" |
| 4 | EXPORT | choose code vs embed link |

## File structure

- Create: `skills/atelier/SKILL.md` — the orchestrator (XML-tagged body; sequences the phases + gates;
  invokes the sub-skills; conducts the dialogue in the journalist's language).
- Create: `skills/atelier/scripts/deploy-embed.mjs` — the fly.io upload script (last increment).
- Create (once, manual/scripted): the `atelier-embeds` fly.io app + a minimal static file server
  (a tiny Dockerfile serving `/data/<slug>/index.html`). Documented in the SKILL, wired last.
- No changes to the sub-skills' responsibilities; the orchestrator only calls them.

## Testing / verification

- **Flow dry-run (no infra):** a documented walkthrough on a real article that exercises INPUT →
  ANALYSE → CADRAGE (both branches) → PROPOSITION → PRODUCTION → EXPORT(code), asserting each gate
  stops and each phase invokes the right sub-skill. This reuses the ROUND-style real-article tests.
- **Direct vs guided:** one case each — a journalist who names the visual (direct) and one who is
  guided — both reach a produced, render-verified artifact.
- **Export(code):** the handed-over `.html` opens standalone and is iframe-embeddable.
- **Export(link):** once fly.io is set up, the deploy script returns a URL that renders the embed;
  a smoke that the uploaded HTML is reachable and correct.

## Out of scope (v1)

- Messy-CSV data-preparation as a pre-INPUT step (note the hook; build later).
- Multi-visual "dashboard" export (one project = one or a small set of visuals, each its own artifact).
- fly.io app auth/cost management beyond a single personal account + one app.
- The fly.io embed is the LAST increment; the flow + code export is the first working milestone.
