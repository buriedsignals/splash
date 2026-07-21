---
description: Turn an article and/or its data into a finished, exported data-visualization (chart, map, video, or interactive/scrolly) for a newsroom.
---

Invoke the `splash` skill — the end-to-end flow (INPUT → ANALYSE → CADRAGE → PROPOSITION →
PRODUCTION → EXPORT) — with the content provided in argument.

Usage:
- `/splash https://example.com/article` — a URL
- `/splash path/to/article.md` — a file
- `/splash` (no arg — paste the article/data directly, or say there isn't one yet)

Conduct the entire dialogue in the journalist's language (detect it from their first message).
The flow runs ordered phases with explicit human gates — every gate is a hard stop; see
`skills/splash/SKILL.md` for the full flow and `skills/using-splash/SKILL.md` for the plugin's
skill catalog.
