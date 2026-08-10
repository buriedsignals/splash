# Aspect-range probe — the measurements, as produced

Regenerate with `bun proof/aspect-range-probe/render.mjs` from the repository root. Every
number below is written by that script. `ASPECT-VERDICT.md` beside this file is the other half
— what a person saw when the PNGs in `arms/` were opened — and is not generated.

Within one regime the plot's WIDTH and the type size are held constant, so aspect is the only
quantity that differs between two arms. The `regime` column is `plot width / tick size`: the
default 900/26 is the article's reading distance, and 700/36 and 370/36 are what a 1080-wide
frame really gives a chart at the phone's own 36px floor.

| type | arm | regime | frame | plot | aspect drawn | what carries the argument |
|---|---|---|---|---|---|---|
| waterfall | `arms/waterfall-0p35.png` | 900px / 26px | 1012x2711 | 900x2571 | 0.35:1 | bar width 159.1; shortest step (px) 295; shortest step h:w 1.9; opening bar h:w 12.9 |
| waterfall | `arms/waterfall-0p5.png` | 900px / 26px | 1012x1940 | 900x1800 | 0.50:1 | bar width 159.1; shortest step (px) 206.5; shortest step h:w 1.3; opening bar h:w 9 |
| waterfall | `arms/waterfall-0p9.png` | 900px / 26px | 1012x1140 | 900x1000 | 0.90:1 | bar width 159.1; shortest step (px) 114.7; shortest step h:w 0.7; opening bar h:w 5 |
| waterfall | `arms/waterfall-1p5.png` | 900px / 26px | 1012x740 | 900x600 | 1.50:1 | bar width 159.1; shortest step (px) 68.8; shortest step h:w 0.4; opening bar h:w 3 |
| waterfall | `arms/waterfall-2p4.png` | 900px / 26px | 1012x515 | 900x375 | 2.40:1 | bar width 159.1; shortest step (px) 43; shortest step h:w 0.3; opening bar h:w 1.9 |
| waterfall | `arms/waterfall-3p6.png` | 900px / 26px | 1012x390 | 900x250 | 3.60:1 | bar width 159.1; shortest step (px) 28.7; shortest step h:w 0.2; opening bar h:w 1.3 |
| waterfall | `arms/waterfall-4p6.png` | 900px / 26px | 1012x336 | 900x196 | 4.59:1 | bar width 159.1; shortest step (px) 22.5; shortest step h:w 0.1; opening bar h:w 1 |
| waterfall | `arms/waterfall-6.png` | 900px / 26px | 1012x290 | 900x150 | 6.00:1 | bar width 159.1; shortest step (px) 17.2; shortest step h:w 0.1; opening bar h:w 0.8 |
| slope | `arms/slope-0p35.png` | 900px / 26px | 1418x2655 | 900x2571 | 0.35:1 | steepest line (deg) 42.8; label rows de-collided at the right end 0; tightest label gap (px) 54.5 |
| slope | `arms/slope-0p5.png` | 900px / 26px | 1418x1884 | 900x1800 | 0.50:1 | steepest line (deg) 33; label rows de-collided at the right end 0; tightest label gap (px) 38.2 |
| slope | `arms/slope-0p9.png` | 900px / 26px | 1418x1084 | 900x1000 | 0.90:1 | steepest line (deg) 19.8; label rows de-collided at the right end 2; tightest label gap (px) 32 |
| slope | `arms/slope-1p5.png` | 900px / 26px | 1418x684 | 900x600 | 1.50:1 | steepest line (deg) 12.2; label rows de-collided at the right end 4; tightest label gap (px) 32 |
| slope | `arms/slope-1p8.png` | 900px / 26px | 1418x584 | 900x500 | 1.80:1 | steepest line (deg) 10.2; label rows de-collided at the right end 4; tightest label gap (px) 32 |
| slope | `arms/slope-2.png` | 900px / 26px | 1418x534 | 900x450 | 2.00:1 | steepest line (deg) 9.2; label rows de-collided at the right end 4; tightest label gap (px) 32 |
| slope | `arms/slope-2p2.png` | 900px / 26px | 1418x493 | 900x409 | 2.20:1 | steepest line (deg) 8.4; label rows de-collided at the right end 5; tightest label gap (px) 32 |
| slope | `arms/slope-2p4.png` | 900px / 26px | 1418x459 | 900x375 | 2.40:1 | steepest line (deg) 7.7; label rows de-collided at the right end 5; tightest label gap (px) 32 |
| slope | `arms/slope-3p6.png` | 900px / 26px | 1418x334 | 900x250 | 3.60:1 | steepest line (deg) 5.1; label rows de-collided at the right end 5; tightest label gap (px) 32 |
| small-multiples | `arms/small-multiples-0p5.png` | 900px / 26px | 1012x1828 | 900x1800 | 0.50:1 | columns 1; rows 6; panel box 900 x 225.7; panel aspect 4 |
| small-multiples | `arms/small-multiples-0p9.png` | 900px / 26px | 1012x1028 | 900x1000 | 0.90:1 | columns 2; rows 3; panel box 429 x 254.7; panel aspect 1.7 |
| small-multiples | `arms/small-multiples-1p1.png` | 900px / 26px | 1012x846 | 900x818 | 1.10:1 | columns 2; rows 3; panel box 429 x 194; panel aspect 2.2 |
| small-multiples | `arms/small-multiples-1p2.png` | 900px / 26px | 1012x778 | 900x750 | 1.20:1 | columns 2; rows 3; panel box 429 x 171.3; panel aspect 2.5 |
| small-multiples | `arms/small-multiples-1p3.png` | 900px / 26px | 1012x720 | 900x692 | 1.30:1 | columns 2; rows 3; panel box 429 x 152; panel aspect 2.8 |
| small-multiples | `arms/small-multiples-1p5.png` | 900px / 26px | 1012x628 | 900x600 | 1.50:1 | columns 2; rows 3; panel box 429 x 121.3; panel aspect 3.5 |
| small-multiples | `arms/small-multiples-2p4.png` | 900px / 26px | 1012x403 | 900x375 | 2.40:1 | columns 3; rows 2; panel box 272 x 104.5; panel aspect 2.6 |
| small-multiples | `arms/small-multiples-3p6.png` | 900px / 26px | 1012x278 | 900x250 | 3.60:1 | columns 3; rows 2; panel box 272 x 42; panel aspect 6.5 |
| bump | `arms/bump-0p5.png` | 900px / 26px | 1290x1896 | 900x1800 | 0.50:1 | rank row pitch (px) 200; year column (px) 26.5; steepest single-year move (deg) 82.5 |
| bump | `arms/bump-0p9.png` | 900px / 26px | 1290x1096 | 900x1000 | 0.90:1 | rank row pitch (px) 111.1; year column (px) 26.5; steepest single-year move (deg) 76.6 |
| bump | `arms/bump-1p5.png` | 900px / 26px | 1290x696 | 900x600 | 1.50:1 | rank row pitch (px) 66.7; year column (px) 26.5; steepest single-year move (deg) 68.3 |
| bump | `arms/bump-2p4.png` | 900px / 26px | 1290x471 | 900x375 | 2.40:1 | rank row pitch (px) 41.7; year column (px) 26.5; steepest single-year move (deg) 57.6 |
| bump | `arms/bump-2p9.png` | 900px / 26px | 1290x406 | 900x310 | 2.90:1 | rank row pitch (px) 34.4; year column (px) 26.5; steepest single-year move (deg) 52.5 |
| bump | `arms/bump-3p2.png` | 900px / 26px | 1290x377 | 900x281 | 3.20:1 | rank row pitch (px) 31.2; year column (px) 26.5; steepest single-year move (deg) 49.7 |
| bump | `arms/bump-3p6.png` | 900px / 26px | 1290x346 | 900x250 | 3.60:1 | rank row pitch (px) 27.8; year column (px) 26.5; steepest single-year move (deg) 46.4 |
| population-pyramid | `arms/population-pyramid-0p5.png` | 900px / 26px | 956x1868 | 900x1800 | 0.50:1 | band pitch (px) 85.7; bar height (px) 73.4; label type (px) 26; widest bar (px) 388.8 |
| population-pyramid | `arms/population-pyramid-0p9.png` | 900px / 26px | 956x1068 | 900x1000 | 0.90:1 | band pitch (px) 47.6; bar height (px) 40.8; label type (px) 26; widest bar (px) 388.8 |
| population-pyramid | `arms/population-pyramid-1p2.png` | 900px / 26px | 956x818 | 900x750 | 1.20:1 | band pitch (px) 35.7; bar height (px) 30.6; label type (px) 26; widest bar (px) 388.8 |
| population-pyramid | `arms/population-pyramid-1p5.png` | 900px / 26px | 956x668 | 900x600 | 1.50:1 | band pitch (px) 28.6; bar height (px) 24.5; label type (px) 26; widest bar (px) 388.8 |
| population-pyramid | `arms/population-pyramid-1p8.png` | 900px / 26px | 956x568 | 900x500 | 1.80:1 | band pitch (px) 23.8; bar height (px) 20.4; label type (px) 26; widest bar (px) 388.8 |
| population-pyramid | `arms/population-pyramid-2p4.png` | 900px / 26px | 956x443 | 900x375 | 2.40:1 | band pitch (px) 17.9; bar height (px) 15.3; label type (px) 26; widest bar (px) 388.8 |
| population-pyramid | `arms/population-pyramid-3p6.png` | 900px / 26px | 956x318 | 900x250 | 3.60:1 | band pitch (px) 11.9; bar height (px) 10.2; label type (px) 26; widest bar (px) 388.8 |
| line | `arms/line-0p5.png` | 900px / 26px | 1037x1882 | 900x1800 | 0.50:1 | steepest segment (deg) 83; first to last (deg) 62; gridline pitch (px) 562.5 |
| line | `arms/line-0p7.png` | 900px / 26px | 1037x1368 | 900x1286 | 0.70:1 | steepest segment (deg) 80.3; first to last (deg) 53.3; gridline pitch (px) 401.9 |
| line | `arms/line-0p83.png` | 900px / 26px | 1037x1166 | 900x1084 | 0.83:1 | steepest segment (deg) 78.5; first to last (deg) 48.6; gridline pitch (px) 338.8 |
| line | `arms/line-0p9.png` | 900px / 26px | 1037x1082 | 900x1000 | 0.90:1 | steepest segment (deg) 77.6; first to last (deg) 46.3; gridline pitch (px) 312.5 |
| line | `arms/line-1p5.png` | 900px / 26px | 1037x682 | 900x600 | 1.50:1 | steepest segment (deg) 69.8; first to last (deg) 32.1; gridline pitch (px) 187.5 |
| line | `arms/line-1p9.png` | 900px / 26px | 1037x556 | 900x474 | 1.90:1 | steepest segment (deg) 65; first to last (deg) 26.3; gridline pitch (px) 148.1 |
| line | `arms/line-2p4.png` | 900px / 26px | 1037x457 | 900x375 | 2.40:1 | steepest segment (deg) 59.5; first to last (deg) 21.4; gridline pitch (px) 117.2 |
| line | `arms/line-2p9.png` | 900px / 26px | 1037x392 | 900x310 | 2.90:1 | steepest segment (deg) 54.6; first to last (deg) 17.9; gridline pitch (px) 96.9 |
| line | `arms/line-3p6.png` | 900px / 26px | 1037x332 | 900x250 | 3.60:1 | steepest segment (deg) 48.6; first to last (deg) 14.6; gridline pitch (px) 78.1 |
| line | `arms/line-4p5.png` | 900px / 26px | 1037x282 | 900x200 | 4.50:1 | steepest segment (deg) 42.2; first to last (deg) 11.8; gridline pitch (px) 62.5 |
| line | `arms/line-0p7-w700t36.png` | 700px / 36px | 867x1102 | 700x1000 | 0.70:1 | steepest segment (deg) 80.3; first to last (deg) 53.3; gridline pitch (px) 312.5 |
| line | `arms/line-0p83-w700t36.png` | 700px / 36px | 867x945 | 700x843 | 0.83:1 | steepest segment (deg) 78.5; first to last (deg) 48.5; gridline pitch (px) 263.4 |
| line | `arms/line-1-w700t36.png` | 700px / 36px | 867x802 | 700x700 | 1.00:1 | steepest segment (deg) 76.2; first to last (deg) 43.2; gridline pitch (px) 218.8 |
| line | `arms/line-1p3-w700t36.png` | 700px / 36px | 867x640 | 700x538 | 1.30:1 | steepest segment (deg) 72.3; first to last (deg) 35.9; gridline pitch (px) 168.1 |
| line | `arms/line-1p8-w700t36.png` | 700px / 36px | 867x491 | 700x389 | 1.80:1 | steepest segment (deg) 66.2; first to last (deg) 27.6; gridline pitch (px) 121.6 |
| line | `arms/line-2p6-w700t36.png` | 700px / 36px | 867x371 | 700x269 | 2.60:1 | steepest segment (deg) 57.5; first to last (deg) 19.9; gridline pitch (px) 84.1 |
| line-two-series | `arms/line-two-series-0p83-w700t36.png` | 700px / 36px | 1089x945 | 700x843 | 0.83:1 | end-label gutter (px) 322.3; gutter as share of frame 30%; end labels apart (px) 66.2; lines the reference label lies on 0 |
| line-two-series | `arms/line-two-series-1p2-w700t36.png` | 700px / 36px | 1089x685 | 700x583 | 1.20:1 | end-label gutter (px) 322.3; gutter as share of frame 30%; end labels apart (px) 45.8; lines the reference label lies on 0 |
| line-two-series | `arms/line-two-series-1p6-w700t36.png` | 700px / 36px | 1089x540 | 700x438 | 1.60:1 | end-label gutter (px) 322.3; gutter as share of frame 30%; end labels apart (px) 34.4; lines the reference label lies on 0 |
| line-two-series | `arms/line-two-series-2-w700t36.png` | 700px / 36px | 1089x452 | 700x350 | 2.00:1 | end-label gutter (px) 322.3; gutter as share of frame 30%; end labels apart (px) 27.5; lines the reference label lies on 0 |
| line-two-series | `arms/line-two-series-0p83-w370t36.png` | 370px / 36px | 759x548 | 370x446 | 0.83:1 | end-label gutter (px) 322.3; gutter as share of frame 42%; end labels apart (px) 35; lines the reference label lies on 2 |
| line-two-series | `arms/line-two-series-1p5-w370t36.png` | 370px / 36px | 759x349 | 370x247 | 1.50:1 | end-label gutter (px) 322.3; gutter as share of frame 42%; end labels apart (px) 19.4; lines the reference label lies on 2 |

## Where each type's geometry comes from

- **waterfall** — `proof/static-germany-electricity-bridge/`, its own `*Geometry` export and its own frozen data.
- **slope** — `proof/static-renewables-shift/`, its own `*Geometry` export and its own frozen data.
- **small-multiples** — `proof/static-small-multiples-solar-eu-six/`, its own `*Geometry` export and its own frozen data.
- **bump** — `proof/static-bump-emitter-rank/`, its own `*Geometry` export and its own frozen data.
- **population-pyramid** — `proof/static-swiss-age-pyramid/`, its own `*Geometry` export and its own frozen data.
- **line** — `proof/more-line-swiss-life-expectancy/`, its own `*Geometry` export and its own frozen data.
- **line-two-series** — `proof/vidx-line-life-expectancy/`, its own `*Geometry` export and its own frozen data.

