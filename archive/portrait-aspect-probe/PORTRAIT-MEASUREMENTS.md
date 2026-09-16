# Portrait probe — the measurements, as produced

Regenerate with `bun proof/portrait-aspect-probe/portrait-probe.mjs` from `twin/`.
Every number below is written by that script. `PORTRAIT-VERDICT.md` beside this file is
the other half — what a person saw when the PNGs were opened — and is not generated.

## The declared aspect ranges, and where they come from

Not picked. Each type's range is the extremes of what its own `stretch` render measured at
the three frames this project has already opened and accepted, rounded outward to a tenth.

| type | frame | size | plot aspect | tallest mark h:w |
|---|---|---|---|---|
| histogram | base | 900x560 | 2.35:1 | 4.2:1 |
| histogram | landscape | 1920x1080 | 2.82:1 | 3.5:1 |
| histogram | square | 1080x1080 | 1.12:1 | 8.9:1 |
| line | base | 900x560 | 1.54:1 | n/a (a line has no such mark) |
| line | landscape | 1920x1080 | 1.79:1 | n/a (a line has no such mark) |
| line | square | 1080x1080 | 0.81:1 | n/a (a line has no such mark) |
| ranking-columns | base | 900x560 | 3.11:1 | 4.3:1 |
| ranking-columns | landscape | 1920x1080 | 3.38:1 | 4:1 |
| ranking-columns | square | 1080x1080 | 1.34:1 | 10.1:1 |

- **histogram** — declared range **1.1:1 – 2.9:1**
- **line** — declared range **0.8:1 – 1.8:1**
- **ranking-columns** — declared range **1.3:1 – 3.4:1**

## The arms, all at 1080x1920

`editorial words` counts the words in the strings the arm actually DRAWS as prose — title,
standfirst/subtitle, source, callout, annotations. Axis tick labels and value labels are
excluded: they are the chart reading itself out, not the frame carrying an argument.

| arm | clipped | collisions | plot aspect | plot share of frame height | primary mark | editorial words |
|---|---|---|---|---|---|---|
| `h-a-stretch` | **0** | **0** | 0.54:1 | 84.2% | 18.4:1 | 58 |
| `h-b0-capped-bare` | **0** | **0** | 1.1:1 | 41% | 9:1 | 58 |
| `h-b-capped-furnished` | **0** | **0** | 1.1:1 | 41% | 9:1 | 142 |
| `h-b2-story-type` | **0** | **0** | 2.39:1 | 16.2% | 4.1:1 | 142 |
| `l-a-stretch` | **0** | **0** | 0.41:1 | 88.3% | n/a — see the slope table | 15 |
| `l-b-capped-furnished` | **0** | **0** | 0.8:1 | 44.9% | n/a — see the slope table | 117 |
| `r-a-columns-stretch` | **0** | **0** | 0.62:1 | 81% | 21.9:1 | 64 |
| `r-b-columns-furnished` | **0** | **0** | 1.26:1 | 39.4% | 10.7:1 | 119 |
| `r-c-bars-transposed` | **0** | **0** | 0.73:1 | 58.8% | 10.7:1 | 119 |

What each arm is:

- `h-a-stretch.png` — histogram A — plot fills the frame (today)
- `h-b0-capped-bare.png` — histogram B0 — plot clamped, leftover left empty (control)
- `h-b-capped-furnished.png` — histogram B — plot clamped, leftover spent on furniture
- `h-b2-story-type.png` — histogram B2 — the same clamp and the same words, typeset for a phone
- `l-a-stretch.png` — line A — plot fills the frame (today)
- `l-b-capped-furnished.png` — line B — plot clamped, leftover spent on furniture
- `r-a-columns-stretch.png` — ranking A — ten vertical columns, plot fills the frame (today)
- `r-b-columns-furnished.png` — ranking B — ten vertical columns, plot clamped, leftover furnished
- `r-c-bars-transposed.png` — ranking C — the same ten values as horizontal bars

## The line's own measurement: slope

A histogram's argument is a shape and a ranking's is a length, so `tallest mark h:w` says
what happened to them. A line's argument is a SLOPE, which that column cannot see. Both
angles below are read off the rendered path, in degrees off horizontal.

| arm | steepest drawn segment | first reading to last |
|---|---|---|
| `l-a-stretch` | 80.6° | 65.2° |
| `l-b-capped-furnished` | 71.9° | 47.7° |

## Cross-check — is arm A a straw man?

`PortraitLine` claims to be a copy of `ChartSeed.tsx` with one added arm. The seed ITSELF is
rendered at portrait (`l-a-seed-itself.png`) and measured with the same instrument:

- seed at portrait: **0.41:1**, fill **88.3%**, steepest segment **80.6°**
- probe arm A:      **0.41:1**, fill **88.3%**, steepest segment **80.6°**

They agree. Arm A is what the tool draws today, not a worse thing built to lose.

