# scrolly — self-contained embeddable module (data-tied captions) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** make the scrolly an embeddable, self-contained MODULE: richer **data-tied** step captions
(never an article excerpt) + module furniture (insight title + description + source) + conformance.
Grounded in `docs/atelier/embeddable-module-best-practices.md`.

## Goal

Modules are embedded INTO a newsroom's article to support it — they are not the article. So the scrolly's
text must be **self-contained and data-tied**, not pulled from the article (verbatim excerpts create
redundancy and bloat; embeds also circulate out of context and must stand alone). Today the step prose is
a bare label ("Norway — 99%"); upgrade it to a real 1–2 sentence data-tied caption that states the value
**and the comparison that matters**, and give the module the standard furniture (title + description +
source) so it works standalone.

## What changes

### 1. Richer data-tied captions — `chapters.ts`

`mapStoryToChapters` already drops `establish` and empty `takeaway`, keeping title + reveals (+ distinct
takeaway). Upgrade the per-step prose:

- **Intro step** (the first step, full extent): prose = the **description** (the what/when/where line),
  NOT the title — the title lives in the persistent header (§2), so repeating it as the intro caption
  would re-create the very "doublon" we are removing. The intro caption frames the figure ("Share of
  electricity from renewables, 2024"), then the reader scrolls into the data.
- **Reveal steps**: instead of the bare `callout.text` ("Norway — 99%"), generate a caption that adds the
  **rank descriptor**. The `mapStory` reveal beats are, by `deriveMapStory`'s construction, ordered
  **max then min**. So among the reveal steps: the FIRST is the highest, the LAST is the lowest (when two
  reveals; a single reveal gets no rank descriptor). Caption shape:
  `"<name> — <value>, the highest of the <N> shown"` / `"<name> — <value>, the lowest"`.
  - `N` = the count of regions with data (from the layout — see signature change below).
  - Single-data-region case: `"<name> — <value>"` (no rank).
- **Takeaway step** (only emitted when its copy is distinct from the title): prose = that insight copy.

The descriptor wording is generic (the engine doesn't know the data is "Europe"); it states "the
highest/lowest of the N shown". The journalist edits any caption downstream (the `/viznews-revise` path —
out of scope here); the engine auto-generates the starting point. **No article text is ever pulled in.**

Signature: `mapStoryToChapters` needs the count of data regions to write "of the N shown", so it takes a
small `meta` addition: `mapStoryToChapters(beats, { title, source?, regionsWithData })`. `regionsWithData`
comes from `layout.joined.filter(j => j.value !== null).length`, which the caller (Scrolly / audit)
already computes the layout for.

### 2. Module furniture — `Scrolly.tsx` + the config

A self-contained embed shows an **insight title + a short description + the source**, independent of the
step captions:

- **Description** — add an optional `description?: string` to the scrolly config (1 sentence: what / when
  / where + units; e.g. "Share of electricity from renewables, 2024"). The sample config's existing long
  `unit` string is exactly this kind of description — reuse it as the default description when
  `description` is absent.
- **A small persistent module header** (top-left, always visible) showing the **insight title** (bold).
  This is the standalone figure title — it stays pinned so the module reads as a titled figure even when
  shared out of context. The title appears ONCE (here), never also as a scroll-step caption.
- **Description** — carried by the **intro step caption** (§1), the what/when/where line. It appears once.
- **Source** — already pinned bottom-right; keep, always visible. Title (header) + description (intro
  caption) + source (footer) = the self-contained furniture, each shown exactly once. No duplication with
  the step captions, which carry the per-region data points.

### 3. Conformance — `conformance.ts`

Extend `checkScrollyConformance` so an embeddable module must be self-contained:

- title present (already), ≥ 3 steps (already), every step has non-empty prose (already), map refs in
  range (already), **plus**: a `source` (name + url) is present (embeds must carry their own source), and
  a `description` is present (the figure's what/when/where). Add `source`/`description` to the
  `ScrollyStory` shape (carry them through `mapStoryToChapters`).

### 4. Encode in the engine SKILL.md + the shared reference

The `scrolly` SKILL.md gains a short "embeddable module" section pointing at
`docs/atelier/embeddable-module-best-practices.md`: self-contained, data-tied captions (never article
excerpts), title + description + source furniture, 3–6 steps. So future visual types inherit the rule.

## Out of scope

- Authored/edited captions (the `/viznews-revise` path) — the engine auto-generates; overriding is later.
- Pulling ANY article text into the module (explicitly rejected per the best-practices research).
- Uniforming title+description+source furniture across ALL engines (chart/map/video) — a separate,
  toolkit-wide pass; this spec only touches scrolly.
- A real article→module pipeline wiring in suggest-article/suggest-chart — later; this is the module side.

## Testing

| Case | Expectation |
| --- | --- |
| `mapStoryToChapters` on the sample (max=NOR, min=POL) | intro caption = the description; reveal captions carry "the highest of the N shown" / "the lowest"; the title appears in NO step caption (it is the header); no article text |
| Single data region | the lone reveal caption has no rank descriptor |
| `checkScrollyConformance` | missing source or description → flagged; valid story → no violations |
| Build + scroll smoke | unchanged (camera moves on scroll); header shows title + description |
