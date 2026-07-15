# Splash — Visual Element Grid

The map of every visual Splash can produce, crossed with every output format. Rows are the **real FT
Visual Vocabulary types** (the bible), not invented families. Source of the row list:
`corpus/ft-visual-vocabulary/categories.json` — 72 entries across 9 intents (~55 unique types; some types
serve several intents).

## Two grains (don't conflate them)

- **Knowledge grain — fine.** One best-practice fiche **per specific type**. A treemap, a fan chart, a
  slope each have their own "correctness de base" and integration, exactly like a map (route ≠ choropleth
  ≠ flyover). This is where precision lives.
- **Tool grain — coarser.** We do **not** build 55 × 3 = 165 tools. Types that share a rendering engine
  collapse into one **skill group** (column ≈ bar ≈ diverging bar = one engine, different params). ~11
  skill groups cover the ~55 types. Genuinely distinct beasts (treemap, pie, sankey, map) get their own.

A skill = **transversal KB** × **the type's fiche** × **the format's discipline**.

Status: ✅ built · 🔨 priority to build · ◻ planned · — rarely useful in this format.
`[D3]` = FT ships a D3 template for this type (a hint it's first-class). `S/I/V` = static / interactive / video.

---

## The catalogue (by FT intent)

### Deviation — variation +/- from a reference point
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Diverging Bar | ✓ | BAR | 🔨 | 🔨 | ◻ |
| Diverging Stacked Bar | ✓ | BAR | ◻ | ◻ | — |
| Spine Chart | ✓ | BAR | ◻ | ◻ | — |
| Surplus/Deficit Filled Line | | LINE | ◻ | ◻ | ◻ |

### Correlation — relationship between variables
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Scatterplot | ✓ | SCATTER | 🔨 | 🔨 | — |
| Line + Column | ✓ | LINE | ◻ | ◻ | — |
| Connected Scatterplot | | SCATTER | ◻ | ◻ | ◻ |
| Bubble Chart | ✓ | SCATTER | ◻ | 🔨 | — |
| XY Heatmap | ✓ | SCATTER | ◻ | ◻ | — |

### Change over Time — trends
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Line | ✓ | LINE | 🔨 | ✅ `chart-annotated` | 🔨 `line-reveal` |
| Column (timeline) | ✓ | BAR | 🔨 | 🔨 | ◻ |
| Slope | ✓ | LINE | ◻ | ◻ | — |
| Area Chart | ✓ | LINE | 🔨 | 🔨 | ◻ |
| Fan Chart (Projection) | | LINE | ◻ | ◻ | — |
| Calendar Heatmap | ✓ | TIMELINE | ◻ | ◻ | — |
| Priestley Timeline | ✓ | TIMELINE | ◻ | 🔨 | ◻ |
| Circle Timeline | ✓ | TIMELINE | ◻ | ◻ | — |
| Stock Price / Seismogram | | LINE | — | ◻ | — |

### Ranking — order matters more than absolute value
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Ordered Bar / Ordered Column | ✓ | BAR | 🔨 | 🔨 | 🔨 `ranked-bars` |
| Lollipop (Horizontal / Vertical) | ✓ | BAR | 🔨 | ◻ | ◻ |
| Dot Strip Plot | | DISTRIBUTION | ◻ | ◻ | — |
| Slope (rank) | ✓ | LINE | ◻ | ◻ | — |
| Bump Chart | ✓ | TIMELINE | ◻ | ◻ | ◻ |
| Ordered Proportional Symbol | | SPECIALTY | ◻ | ◻ | — |

### Distribution — how values spread
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Histogram | ✓ | DISTRIBUTION | 🔨 | ◻ | — |
| Boxplot | ✓ | DISTRIBUTION | ◻ | ◻ | — |
| Violin Plot | | DISTRIBUTION | ◻ | ◻ | — |
| Population Pyramid | ✓ | DISTRIBUTION | ◻ | ◻ | — |
| Dot Plot (range) | ✓ | DISTRIBUTION | 🔨 | ◻ | — |
| Barcode Plot | | DISTRIBUTION | ◻ | ◻ | — |
| Cumulative Curve | | LINE | ◻ | ◻ | — |

### Part to Whole — one entity broken into components
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Stacked Column / Proportional Stacked Bar | ✓ | BAR | 🔨 | ◻ | — |
| Pie Chart | ✓ | PART-RADIAL | 🔨 | ◻ | ◻ |
| Donut Chart | | PART-RADIAL | ◻ | ◻ | ◻ |
| Arc (Hemicycle) | | PART-RADIAL | ◻ | ◻ | — |
| Treemap | ✓ | PART-HIER | 🔨 | ◻ | — |
| Sunburst | | PART-HIER | ◻ | ◻ | — |
| Voronoi | | PART-HIER | — | ◻ | — |
| Gridplot (Waffle) | | PART-GRID | 🔨 | ◻ | 🔨 `proportional-squares` |
| Isotype (Pictogram) | | PART-GRID | ◻ | ◻ | ◻ |
| Venn Diagram | | SPECIALTY | ◻ | — | — |
| Waterfall | ✓ | FLOW | ◻ | ◻ | — |

### Magnitude — size comparison
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Column / Bar | ✓ | BAR | 🔨 | 🔨 | 🔨 |
| Paired (Grouped) Column / Bar | ✓ | BAR | ◻ | ◻ | — |
| Proportional Symbol | | SPECIALTY | ◻ | ◻ | ◻ |
| Isotype (Pictogram) | | PART-GRID | ◻ | ◻ | ◻ |
| Radar Chart | | SPECIALTY | ◻ | ◻ | — |
| Bullet Chart | ✓ | BAR | ◻ | ◻ | — |
| Parallel Coordinates | | SPECIALTY | — | ◻ | — |

### Spatial — geography matters
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Basic Choropleth | | MAP | 🔨 | 🔨 | ◻ |
| Proportional Symbol (map) | | MAP | ◻ | 🔨 | ◻ |
| Flow Map | | MAP | ◻ | ◻ | ✅ `map-explainer` |
| 3D Terrain Flyover | | MAP | — | — | ✅ `cesium-flyover` |
| Contour Map | | MAP | ◻ | ◻ | — |
| Equalised / Scaled Cartogram | ✓ | MAP | ◻ | ◻ | — |
| Dot Density | | MAP | ◻ | ◻ | — |
| Heat Map (grid) | | MAP | ◻ | 🔨 | — |
| Interactive explorable (filters/zoom) | | MAP | — | 🔨 `interactive-map` | — |

### Flow — movement between states
| Type | D3 | Skill group | S | I | V |
|---|---|---|---|---|---|
| Sankey Diagram | ✓ | FLOW | ◻ | 🔨 | ◻ |
| Chord Diagram | | FLOW | ◻ | ◻ | — |
| Network Diagram | | FLOW | ◻ | 🔨 | — |
| Waterfall | ✓ | FLOW | ◻ | ◻ | — |

### Editorial elements — beyond the FT chart vocabulary (added for journalism)
| Type | Skill group | S | I | V |
|---|---|---|---|---|
| Photo / image narrative (before-after, crossfade) | EDITORIAL | — | 🔨 `image-scrolly` | ◻ |
| Big number / stat / pull-quote | EDITORIAL | 🔨 | ◻ | ◻ |

---

## Skill groups (the tool grain) — ~11 engines cover ~55 types

| Group | Shared engine | Covers (examples) |
|---|---|---|
| **BAR** | d3 band+linear scales, rects | column, bar, diverging, stacked, grouped, ordered, lollipop, bullet |
| **LINE** | d3 time/linear + line/area path | line, area, slope, fan, line+column, cumulative |
| **SCATTER** | d3 linear x/y + circles | scatter, bubble, connected scatter, xy-heatmap |
| **DISTRIBUTION** | binning + box/violin/strip | histogram, boxplot, violin, dot plot, pyramid, barcode |
| **PART-RADIAL** | d3 arc/pie | pie, donut, hemicycle |
| **PART-HIER** | d3 hierarchy/treemap | treemap, sunburst, voronoi |
| **PART-GRID** | grid of cells | waffle, isotype/pictogram |
| **FLOW** | d3-sankey / force | sankey, chord, network, waterfall |
| **TIMELINE** | time axis + events | priestley, circle, calendar heatmap, bump |
| **MAP** | MapTiler/Cesium + geo-prep | choropleth, flow map, cartogram, flyover, explorable |
| **SPECIALTY** | per-type | radar, parallel coordinates, venn, isotype |
| **EDITORIAL** | layout + type | photo narrative, big-number |

So the real build universe ≈ **(skill group × format)** where the combo is useful — on the order of
**15–20 skills**, not 165. Each skill still carries the fine, per-type fiches for the variants it renders.

---

## What every type's fiche contains (the knowledge grain)

1. **Intent** — FT category + when to use / when NOT (→ which type instead).
2. **Correctness "de base"** — the data/integration pitfalls *specific to this type* (e.g. pie: hard to
   compare angles → label values; treemap: labels overflow small tiles; area: component change invisible;
   choropleth: rates not totals; isotype: whole numbers only, never slice a figure).
3. **Per-format discipline** — static / interactive / video non-negotiables.
4. **Global inheritance** — color, typography, accessibility, number formatting (from the transversal KB).
5. **Sources** — FT vocab note + data-to-viz caveat + relevant paper (credited).
6. **Status** — skill name or "to build".

The `Map` fiche is fully worked as the reference (see the earlier map deep-dive: known-good basemap →
strip clutter → bake geometry → frame-gate the video). Every other fiche mirrors that depth.

---

## Build order

Fill incrementally — one skill group × format per build, never all at once. Priority follows the grant
pilot + the Annemasse investigation's needs. The transversal KB is built in parallel so each new cell
inherits global best-practice. The `chart-annotated` pilot (Line × interactive) is the first cell to
upgrade from "generic" to "global × type × format" once the KB references exist.
