# Centring probe — the measurements, as produced

Regenerate with `bun proof/portrait-aspect-probe/centring-probe.mjs` from `twin/`.
Every number here is written by that script. `CENTRING-VERDICT.md` beside it is the other
half — what a person saw when the PNGs were opened — and is not generated.

`void above` / `void below` bound the BLOCK: the header's first ink to the chart's last.
Anything the drawing pins to the bottom margin (the line's source credit) is outside the
block by construction and is reported separately in the verdict.

| arm | shift | void above | void below | title top edge | plot aspect | plot centre |
|---|---|---|---|---|---|---|
| `h-b0-capped-bare` | — | 55.7px (2.9%) | 873.8px (45.5%) | 2.9% | 1.1:1 | 31.1% |
| `h-v1-block-centred` | +409px | 464.7px (24.2%) | 464.8px (24.2%) | 24.2% | 1.1:1 | 52.4% |
| `h-v2-plot-centred` | +418.3px | 55.7px (2.9%) | 455.6px (23.7%) | 2.9% | 1.1:1 | 52.9% |
| `h-v3-safe-band-centred` | +207.5px | 263.2px (13.7%) | 666.3px (34.7%) | 13.7% | 1.1:1 | 41.9% |
| `l-b0-capped-bare` | — | 56.5px (2.9%) | 909px (47.3%) | 2.9% | 0.8:1 | 28.7% |
| `l-v1-block-centred` | +426.3px | 482.8px (25.1%) | 482.8px (25.1%) | 25.1% | 0.8:1 | 50.9% |
| `l-v2-plot-centred` | +410.2px | 56.5px (2.9%) | 498.9px (26%) | 2.9% | 0.8:1 | 50.1% |
| `l-v3-safe-band-centred` | +224.8px | 281.3px (14.6%) | 684.3px (35.6%) | 14.6% | 0.8:1 | 40.4% |

The plot's own aspect is identical across every arm of each type: the variants move
the drawing and change nothing about it, which is what makes the comparison a comparison.

## Against the platforms' own safe areas

A story-format post is not shown on a blank rectangle. Each row asks whether the arm's
plot sits clear of the platform's published chrome, and names any text that falls under it.

| platform | top | bottom | safe band | standing |
|---|---|---|---|---|
| Instagram Stories + Reels | 269px | 672px | 269–1248px (51% of the frame) | published by the platform |
| TikTok (third-party consensus) | 130px | 484px | 130–1436px (68% of the frame) | **not published** — third-party consensus, and TikTok says a longer caption makes it smaller |

| arm | platform | plot centre in the band | whole plot in the band | title in the band | text under the chrome |
|---|---|---|---|---|---|
| `h-b0-capped-bare` | Instagram Stories + Reels | yes | **no** | **no** | "Six in ten countries emit under 4 …"; "Per-country distribution for 2023 …"; "producers sit far out on the right…"; "Source: Global Carbon Budget (2025…"; "120 countries"; "Median: 3.1 t" |
| `h-b0-capped-bare` | TikTok (third-party consensus) | yes | yes | **no** | "Six in ten countries emit under 4 …"; "Per-country distribution for 2023 …"; "producers sit far out on the right…" |
| `h-v1-block-centred` | Instagram Stories + Reels | yes | **no** | yes | "0"; "20"; "0"; "4"; "8"; "12"; "16"; "20"; "24"; "28"; "32"; "36"; "40"; "CO2 emissions per capita (tonnes/y…" |
| `h-v1-block-centred` | TikTok (third-party consensus) | yes | yes | yes | "CO2 emissions per capita (tonnes/y…" |
| `h-v2-plot-centred` | Instagram Stories + Reels | yes | **no** | **no** | "Six in ten countries emit under 4 …"; "Per-country distribution for 2023 …"; "producers sit far out on the right…"; "Source: Global Carbon Budget (2025…"; "0"; "20"; "0"; "4"; "8"; "12"; "16"; "20"; "24"; "28"; "32"; "36"; "40"; "CO2 emissions per capita (tonnes/y…" |
| `h-v2-plot-centred` | TikTok (third-party consensus) | yes | yes | **no** | "Six in ten countries emit under 4 …"; "Per-country distribution for 2023 …"; "producers sit far out on the right…"; "CO2 emissions per capita (tonnes/y…" |
| `h-v3-safe-band-centred` | Instagram Stories + Reels | yes | yes | **no** | "Six in ten countries emit under 4 …"; "CO2 emissions per capita (tonnes/y…" |
| `h-v3-safe-band-centred` | TikTok (third-party consensus) | yes | yes | yes | none |
| `l-b0-capped-bare` | Instagram Stories + Reels | yes | **no** | **no** | "Rainfall over the sample town fell…"; "Sample data — not a real measureme…"; "900"; "950 mm" |
| `l-b0-capped-bare` | TikTok (third-party consensus) | yes | **no** | **no** | "Rainfall over the sample town fell…"; "Sample data — not a real measureme…"; "950 mm" |
| `l-v1-block-centred` | Instagram Stories + Reels | yes | **no** | yes | "Sample data — not a real measureme…"; "600"; "650"; "2016"; "2018"; "2020"; "2022"; "2024"; "the sample town 604 mm" |
| `l-v1-block-centred` | TikTok (third-party consensus) | yes | yes | yes | "Sample data — not a real measureme…"; "2016"; "2018"; "2020"; "2022"; "2024" |
| `l-v2-plot-centred` | Instagram Stories + Reels | yes | **no** | **no** | "Rainfall over the sample town fell…"; "Sample data — not a real measureme…"; "600"; "650"; "2016"; "2018"; "2020"; "2022"; "2024"; "the sample town 604 mm" |
| `l-v2-plot-centred` | TikTok (third-party consensus) | yes | yes | **no** | "Rainfall over the sample town fell…"; "Sample data — not a real measureme…" |
| `l-v3-safe-band-centred` | Instagram Stories + Reels | yes | yes | yes | "Sample data — not a real measureme…" |
| `l-v3-safe-band-centred` | TikTok (third-party consensus) | yes | yes | yes | "Sample data — not a real measureme…" |

