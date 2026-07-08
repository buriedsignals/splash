# Channel-driven format, size, sub-format & export — design

**Status:** approved (Rémy, 2026-07-08). Supersedes the free-text channel + silent-format-ladder flow.

**Goal:** Make the chain **channel → format → size → narrative sub-format → export/delivery** deterministic
and explicit, so the confirmed distribution channel is actually respected end-to-end (today it is "jamais
vraiment respecté car pas clair"). The channel becomes a structured choice that hard-constrains the format
set and the size; within that, the AI picks the format on grounded evidence and announces it (vetoable).

## Problem (why)

Today's flow (see `skills/atelier/SKILL.md` CADRAGE §3 + `knowledge/references/formats/format-selection.md`):
- CADRAGE Q3 asks the channel as **free text** ("article embed, social, print?") — fuzzy to map downstream.
- The **format** (static/interactive/video/scrolly) is decided **silently** by the suggest-chart Gate 0→5
  ladder — never announced, never reconciled with the channel.
- The **channel→size** mapping lives only in prose + was just wired for dw-chart static export alone; it is
  not a shared table every producer honors, and **sub-formats** (interactive explore-vs-scrolly; video
  aspect/reveal) are not tied to the channel.

The QA harness corroborates this repeatedly (batch 2026-07-08):
- **recyclage**: PROPOSITION promised portrait 9:16 for a confirmed vertical-social channel, shipped a wide
  landscape bar strip (a row-driven type that cannot take that aspect) — channel ignored.
- **geneve-loyers-video**: social/story channel wanted a video, shipped an interactive.html.
- **zurich / loyers-dispersion**: escalated to interactive on the journalist's stated preference without the
  channel/evidence justifying it.

## The decision model (approved)

### 1. Channel — a structured pick (replaces the free-text Q3). Exactly three channels:

| Channel | Size | Allowed formats |
|---|---|---|
| **Social vertical** (Stories / Reels) | Portrait **9:16** | image · video |
| **Social feed** (Instagram / Facebook post) | Square **1:1** | image · video |
| **Article web / embed** | media → **landscape 16:9** · component → **responsive** | image · video · **interactive** |

**Hard rule:** **not-embed ⇒ never interactive.** Only the article/web-embed channel can host an interactive
(or scrolly, which is a kind of interactive). Social channels are image or video only.

### 2. Format — chosen within the channel's allowed set

- The channel first **narrows** the format set (table above). Within that set the format is chosen by "what
  best serves the narrative" (the suggest-chart grounded judgment), then **announced explicitly in
  PROPOSITION and vetoable** — never silent.
- **Article/web default = interactive (franc).** For the article/web-embed channel, **interactive is the
  default**; it wins unless there is a concrete reason not to (see the a11y invariant below). This is a
  deliberate product choice by Rémy that amends the KB's former blanket static-first stance **for this
  channel only**.
- **A11y invariant (non-negotiable, keeps the reach grounding intact):** whenever interactive is chosen, a
  **static fallback that carries the core claim on its own is always produced** — the interactive layer is
  additive, never load-bearing (≈85% of readers never touch hover/click; Archie Tse / NYT / Malofiej). So
  "interactive-first" for article/web does NOT drop the static; it ships alongside it.
- Static-first still governs the **social** channels only as far as "image vs video" — and there,
  interactive isn't even in the set.

### 3. Narrative sub-format — AI proposes; the journalist may choose (reuses the DIRECT/GUIDED branch)

- **interactive** → a narration sub-format: **explore-libre** (pan/zoom/hover) vs **scrolly** (sequential),
  plus per-producer reveal styles.
- **video** → a narration sub-format: camera / reveal modes (reveal-simple, guided-tour, zoom-out, pan,
  line-reveal, ranked-bars…), per producer.
- **Who chooses:** the CADRAGE branch already asks what the journalist wants. **GUIDED → the AI chooses the
  sub-format for them** (grounded, proposed, vetoable). **DIRECT → the journalist names it** (still checked
  reachable before it is offered). Default is AI-proposes.

### 4. Export / delivery

- **image / video** → output the media **directly** at the channel size + the chosen narrative sub-format.
  **No delivery choice** — the media IS the deliverable.
- **interactive** → **three delivery options** (made explicit, tied to the interactive format):
  1. **source code** (the component's source),
  2. **static HTML** (one self-contained file, no server),
  3. **fly.io embed link** (the journalist's own hosted component → iframe URL).

## What changes where (implementation surface — detail lands in the plan)

- **`skills/atelier/SKILL.md`** — CADRAGE Q3 becomes a structured 3-way channel pick; PROPOSITION announces
  the chosen `{format, size, sub-format}` reconciled to the channel (vetoable); EXPORT §6 branches exactly on
  the model above (media = direct; interactive = the 3 deliveries); the "≤4 questions / branch order" wording
  is reconciled so Q3 stays a real gate.
- **Shared channel table (new module)** — a single source of truth `channel → { size, aspect, allowedFormats,
  subFormatHints }`, consumed by suggest-chart routing AND every producer's export sizing. Generalizes the
  `dw-chart/src/export-aspect.ts` table already built.
- **`knowledge/references/formats/format-selection.md`** — the ladder is reframed: **the channel first
  constrains the allowed-format set**; article/web defaults interactive (with the static-fallback invariant);
  social = image/video; the static-first sources stay as the a11y-fallback grounding, not a blanket veto.
- **`skills/suggest-chart` (routing)** — reads the structured channel, restricts the format set, applies the
  article/web interactive-default, and picks a chart TYPE/layout that FITS the channel aspect (the recyclage
  lesson: a portrait/square channel must route to a portrait-safe type — e.g. a vertical column, not a
  row-driven horizontal bar — or a media render composed at that aspect).
- **Producers** (`dw-chart`, `chart-native`, `map-native`, `scrolly`) — every export honors the channel size
  from the shared table (portrait/square/landscape media; responsive interactive), not a per-producer default.
- **Conformance/harness** — a produce-time / harness check that the shipped deliverable's format ∈ the
  channel's allowed set and its aspect matches the channel size (so "promised 9:16, shipped landscape" fails
  hard instead of shipping).

## Out of scope (explicit)

- No Print / PDF / email channel bucket (Rémy: hors scope).
- The separate bug backlog from the 2026-07-08 test batch — numberFormat "0%" ×100, source-URL capture UX,
  paris-metro scrolly timeout/camera, d3-arrow-plot annotation crash — is a **different lot**, not folded in
  here.
- Building brand-new video narration modes or new interactive sub-formats beyond what the producers already
  expose (this wires the CHOICE + size, it does not invent new renderers).

## Testing

- Unit: the shared channel table (each channel → correct size/allowedFormats/subFormatHint); the
  format-set restriction (social excludes interactive; article/web includes it, defaults interactive);
  the aspect-fit type guard (portrait/square channel never yields a row-driven horizontal bar).
- Conformance: deliverable format ∈ allowedFormats(channel) ∧ deliverable aspect == size(channel), fail-hard.
- End-to-end (harness): re-run recyclage (vertical → must ship portrait, not landscape),
  geneve-loyers-video (story → must ship a video, not interactive), a web-embed case (→ interactive by
  default with a static fallback present), each render-verified by eye.
