# The reveal kind honours the journalist's walk — rendered proof

Sub-project ④(b), 2026-08-04. Two REAL produce runs of the same choropleth sample
(`assets/sample-data/choropleth.json`, `cameraMode: "simple"` → the Reveal family), rendered at
the same frame (140), differing only by an `arcBeats` walk.

The walk is **deliberately against the data's rank** — `GBR → DEU → NOR` while `NOR` carries the
highest value — because that is the only shape of walk that can tell "the journalist's order was
honoured" apart from "the ramp happens to look ordered".

| | what the frame shows |
|---|---|
| `without-walk.png` | Scandinavia and central Europe tint **together** — one ramp, everybody at once, the highest values reading first because they are the darkest bins |
| `with-walk.png` | **only the United Kingdom is in** — beat 1. Norway, the highest value in the data, has not entered yet |

That inversion is the proof: what appears, and in what order, comes from the walk the journalist
confirmed, not from the data's salience.

Regenerate:

    bun scripts/produce.mjs <config-with-arcBeats>.json <outDir> video

Not wired into `bun run check` — it is two live MapTiler-backed Remotion renders (~2 min each),
the same reason `verify-source-bundle.mjs` stays opt-in.
