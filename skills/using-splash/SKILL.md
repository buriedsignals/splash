---
name: using-splash
description: Entry point and catalog for the splash plugin — open-source visual storytelling for every newsroom.
---

# using-splash

The splash plugin turns an article and/or its data into a finished, exported data-visualization
(chart, map, video, or interactive/scrolly) for a newsroom — no code to write. Local-first, no
website, no backend.

## When to invoke

- Start the end-to-end flow: `/splash "<article/data>"` (or `/splash` alone — paste the content,
  or say there isn't one yet).
- Anything else (revising, previewing) is out of scope today — splash produces one element per
  cycle and offers another format after each export (see `skills/splash/SKILL.md`, Step 12).

## Available skills

### User-facing

- **`splash`** (via `/splash`) — the end-to-end orchestrator. Six ordered phases with explicit
  human gates: INPUT → ANALYSE → CADRAGE → PROPOSITION → PRODUCTION → EXPORT. It sequences and
  gates; it never re-decides what a sub-skill below already decides.

- **`newsroom-charter`** — for a newsroom that has no `NEWSROOM-PROFILE.md` and no idea what its
  own hex codes are: reads the newsroom's website, proposes a house colour / ground /
  typefaces with the origin of each value, and writes the profile only after the journalist
  validates it. Refuses and asks the question when the site declares nothing.

### Internal — invoked by the flow, not directly

- **`suggest-article`** — reads the article + data, proposes WHERE a visual serves the narrative
  (a vetoable `ProposalSet` of opportunities: claim + data + intent). Feeds `suggest-chart`.
- **`suggest-chart`** — turns a data profile + editorial intent into a visual-element decision
  (which chart or map, which format, which producer) and emits the validated spec.
- **`suggest-image`** — for a NARRATIVE claim with the journalist's OWN images (photos, satellite,
  archives) when the chart data test fails; matches images to article passages, collects alt +
  credit, emits the `image-story.json` manifest behind a mandatory veto gate.
- **`chart-native`** — the native (non-Datawrapper) chart engine: 41 types, ONE React+D3
  component ships static PNG + interactive HTML + Remotion mp4. Motion / rich-interactivity path.
- **`map-native`** — the native (non-Datawrapper) map engine: choropleth, symbol, locator and
  more via MapTiler; static PNG + interactive HTML + Remotion mp4 from one component.
- **`dw-chart`** — standard charts (line, bar, column, scatter, pie, dot, range) via a Datawrapper
  embed + an owned static PNG. The default, thin chart path.
- **`map-dw`** — Datawrapper maps (choropleth or locator) as an owned static PNG or a hosted
  embed. Symbol/proportional maps route to `map-native` instead (Datawrapper has no labeled
  static symbol map).
- **`scrolly`** — the scroll-driven interactive (scrollytelling) orchestrator; owns the scroll
  scaffold and step dispatcher, and imports the visual renderer from `map-native` or
  `chart-native` depending on the story.
- **`image-native`** (script only, no `SKILL.md` — invoked via
  `bun skills/image-native/scripts/produce.mjs`) — produces the image-scrolly `suggest-image`
  specs.

## What splash never does

- Never generates the article text or the source images/illustrations — editorial intent stays
  with the journalist.
- Never re-decides what a sub-skill already decided — only sequences and gates.
- Never skips a gate or auto-progresses without the journalist's explicit response.

See `skills/splash/SKILL.md` for the full flow, gates, and the "Never" list.
