# Task 0 — the probe, as produced

Regenerate with `bun probe.mjs` from this directory. Every number below is written by
that script; nothing here is typed by hand.

Generated from 213 countries, median 3.14 t/capita.

## 1 + 2 — clipping, collisions, plot fill

| render | frame | typeScale | runs | clipped | collisions | plot fill H | plot fill W | plot aspect | tallest bar h:w |
|---|---|---|---|---|---|---|---|---|---|
| base (900x560, typeScale 1) | 900x560 | 1 | 24 | **0** | **0** | 55% | 80.5% | 2.35:1 | 4.2:1 |
| landscape | 1920x1080 | 2.1 | 24 | **0** | **0** | 51% | 80.9% | 2.82:1 | 3.5:1 |
| square | 1080x1080 | 1.2 | 24 | **0** | **0** | 71.9% | 80.2% | 1.12:1 | 8.9:1 |
| portrait | 1080x1920 | 1.2 | 24 | **0** | **0** | 84.2% | 80.2% | 0.54:1 | 18.4:1 |
| landscape, half frame at 2x (960x540, typeScale 1.05) | 960x540 | 1.05 | 24 | **0** | **0** | 51.1% | 80.6% | 2.8:1 | 3.5:1 |

## 4 — what needed editing

`ProbeHistogram.tsx` is 339 lines against the beat's 300.
Run `diff -u ../CarbonFootprintHistogram.tsx ProbeHistogram.tsx` and read it: the answer
to measurement 4 is whether that diff contains anything outside {typeScale, tick hints,
collision thresholds, the frame itself}.

## 5 — the rasteriser

`probe-landscape.png` and `probe-landscape-half2x.png` are both 1920x1080 files.
Open them side by side at 100%: the question is whether the half frame at 2x reads
softer, and whether either has type that is too small at the delivered size.

