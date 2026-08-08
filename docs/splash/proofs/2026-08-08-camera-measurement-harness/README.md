# Camera measurement harness — live run against the tour-box renders

**2026-08-08.** The instrument that reads a map video's zoom out of the mp4 itself, brought in
from a scratchpad with tests. Home: `lib/core/camera-measure.ts` (arithmetic + limits + unit
tests) and `skills/map-native/scripts/measure-camera.mjs` (the IO shell).

## What it measures, and why this method

A mark at `(lon,lat)` sits at unit Web-Mercator `(u,v)`; on screen it is `px = s·(u,v) + o`
with `s = 512·2^zoom`. Two marks give `s`, and `s` gives the zoom. The translation `o`
cancels, so furniture insets and letterboxing cost nothing.

Three instruments were tried on this problem. Two were wrong, and both failures are recorded
because they are the reason this one is trusted:

| instrument | verdict |
| --- | --- |
| pixel distance between marks of known coordinates | **the one that survived** |
| whole-frame pixel-difference | measures ink, not camera — moved the WRONG WAY on a correct fix |
| IoU disc-fit | returned z ≈ 4.2 where this method reads 9.06 — five doublings out |
| SHA-256 of two mp4s | not an instrument: the render is not byte-deterministic |

## Live run — every published number reproduced

Run with `bun skills/map-native/scripts/measure-camera.mjs <mp4> <config> <kind>` against the
renders of 2026-08-07. Every figure in `skills/map-native/src/core/tour-box.ts`'s header came
back identical.

### Four Alpine glaciers (locator, `after-clustered.mp4`) — the "one clean level" claim

| beat | frame | zoom | blobs | inliers | rms px |
| --- | --- | --- | --- | --- | --- |
| establish | 150 | **8.478** | 4 | 4 | 0.14 |
| reveal Rhone | 267 | **9.470** | 2 | 2 | 0.26 |
| reveal Zmutt | 396 | 9.477 | 2 | 2 | 0.34 |
| reveal Trift | 525 | 9.466 | 2 | 2 | 0.32 |
| reveal Gorner | 654 | 9.480 | 2 | 2 | 0.31 |
| takeaway | 783 | 8.477 | 3 | 3 | 0.30 |

→ +0.992 / +0.999 / +0.988 / +1.002 levels in from establish. Record says `8.478 → 9.47 (+0.99)`.

### Five Seine sites (symbol, `after-ribbon.mp4`) — the ribbon, "+1.000"

| beat | zoom | note |
| --- | --- | --- |
| establish | **13.258** | 5 blobs, rms 0.06 |
| reveal Pont d'Austerlitz | **14.258** | +1.000 |
| reveal Notre-Dame | 14.257 | +0.999 |
| reveal Louvre / Alexandre III / Trocadéro | — | `no-reading`: one mark in frame |
| takeaway | 13.258 | rms 0.05 |

Record says `13.258 → 14.26 (+1.00)`. The three unreadable stops are the finding, not a
failure: the tighter the true framing, the fewer neighbours remain (limit L1).

### Six European cities (symbol, `wide.json`) — the continental cap

| render | establish | stops |
| --- | --- | --- |
| capped (`after-continental.mp4`) | **4.224** | every stop unreadable — no neighbour left in frame |
| uncapped (`uncapped-continental.mp4`) | 4.224 | London 5.084 · Paris 5.165 · Berlin 5.051 |

Record says establish `4.224` and uncapped stops `z 5.05–5.17, still ~1 level in`. Both halves
reproduce. The capped tour reading nothing at every stop is exactly the cap working: the frame
holds one city.

The capped stops refuse in three different ways — `no-fit`, `no-reading`, `residual-too-high`
— i.e. all three guards bite on real data, not just in synthetic tests.

## Codec noise, measured

Two renders of the same config by the same code, different files:

```
sha256 270323089e2959c6…  10359783 bytes
sha256 af3c21332018d70d…  10359730 bytes
```

Both read **zoom 4.224, centre (4.8686, 47.7899)** — and their **hue masks came out
bit-identical at every measured beat**. The codec noise that defeats SHA-256 never reaches the
mask. Two genuinely independent samples of one camera do exist (a tour's `establish` and
`takeaway` frame the same box hundreds of frames apart) and read 8.478 vs 8.477.

⇒ Do not assert a measured zoom tighter than **±0.02 levels**.

Because the two determinism renders produce identical masks, only four cases are committed as
ground truth — a fifth would be the same input twice, asserting nothing.

## Ground truth in the gate

`lib/core/camera-measure.fixture.json` (101 KB) carries the **real hue masks** of these
renders, run-length encoded, for four cases. The gate therefore runs connected components, the
disc shape filter, the RANSAC correspondence, the residual gate and the zoom arithmetic on
**real pixel data**, in milliseconds, with no mp4 in the repo. The RGB→hue thresholding and
frame decoding are covered synthetically and by re-running the CLI.

`expect.zoom` in the fixture is a regression lock. `expect.published` is what `tour-box.ts`
independently records — the named tests assert against that.

## Mutation results

13 mutations of the arithmetic; 11 turn the suite red on the tests that name the claim.

| mutation | red |
| --- | --- |
| M1 `TILE_SIZE` 512→256 | 22 |
| M2 `zoomFromScale` drops the tile divisor | 31 |
| M3 Mercator latitude → plate carrée | 28 |
| M4 Mercator `v` flipped | 28 |
| M5 residual gate removed | 4 |
| M6 disc shape filter removed | 13 |
| M7 least squares uses x only | 2 |
| M8 inlier assignment stops reserving marks | **0 — see below** |
| M9 hue tolerance → 0 | 1 |
| M10 negative-scale guard removed | **0 — see below** |
| M11 min blob size floor removed | 6 |
| M12 centre read at frame origin | 6 |
| M13 inlier tolerance blown open | 36 |

**M8 and M10 are silent, and that is measured, not overlooked.** Both guard the least-squares
refine (`den === 0`, `num <= 0`). Neither is reachable today: the RANSAC seed requires
`dPx > tolPx`, so every inlier set spans more than the tolerance around a positive-scale
prediction, which keeps the covariance positive and non-zero. They are kept rather than
deleted — loosen that constraint and both go live, and the failure they prevent is a NaN
reported as a zoom. The *contract* they protect is pinned by tests instead: a mirrored frame
and a coincident mark pair must both come back refused, whichever branch refuses them. This is
stated in the code at the guard.

## Stated limits

`lib/core/camera-measure.ts` carries seven, each with its measurement:

- **L1** two marks or no reading — a scale needs a baseline.
- **L2** overlap fails in three regimes (disc filter drops it / merged centroid still reads
  true within ±0.02 / residual gate refuses the band between). Never a distance short by half.
- **L3** the hue mask is a fallback and costs false candidates — measured 38:1 water-to-marks
  on the continental frame; paid for by shape filter, RANSAC and the residual gate.
- **L4** a wrong number is worse than no number — residual gate at 1.0 px, real fits 0.03–0.35.
- **L5** codec noise floor — ±40 channel tolerance is a floor; zoom repeatability ±0.02 levels.
- **L6** candidate budget — refuses past 64 blobs rather than hang on an O(n⁴) search.
- **L7** the zoom is trustworthy, the **centre is frame-relative**. Confirmed arithmetically:
  the centre sits 0.0534° off at z 8.478 and 0.0264° off at z 9.47 — one constant ≈ 39 px
  furniture inset seen at two zooms (39.3 px and 38.6 px), not two different errors.

## Reproducing

```bash
bun skills/map-native/scripts/measure-camera.mjs <mp4> <config.json> locator|symbol
bun skills/map-native/scripts/measure-camera.mjs <mp4> <config.json> symbol --hue-histogram
bun test lib/core/camera-measure.test.ts
```

The mp4s live in the session scratchpad, not the repo — they are 6–19 MB each and the
committed masks are what the gate needs.

### Why `--hue-histogram` exists

The first continental run reported **0 blobs at every beat**. The config to hand
(`wide.json`) declares `brandHue: "#FF00FF"`, so magenta was keyed on; the frames are blue.

That looked like a house-colour bug, and was chased until it was measured out:

- `houseFill("#FF00FF")` returns `#FF00FF` — the hue is not rejected.
- `SymbolStory.tsx:277` paints `circle-color: houseFill(config.brandHue)`; the composition
  declares no schema, so `--props` passes through.
- A **live still** rendered from that exact config comes back **hue 300, 13 305 px** —
  magenta. The current code honours `brandHue` on a symbol story video.
- The archived mp4s were rendered from `proof/spread.json`: the **same six cities, no
  `brandHue`** — hence `#2171b5`, the documented default.

**No product defect.** The lesson is about the instrument, and it is now in the CLI's usage
text: the mark colour is a property of the *render*, not of the config file you happen to
hold. An mp4 outlives its config. `--hue-histogram` answers "what colour is actually in this
frame" in one frame, and is the first thing to reach for when a run finds nothing.

(The continental fixture's marks were taken from `wide.json`, whose six points are byte-identical
to `spread.json`'s. The geometry — and therefore every measurement above — is unaffected.)
