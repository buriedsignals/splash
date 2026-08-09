# Survey — furniture, typeface and credits

**Read-only survey, 2026-08-09/10.** Axis: `FEEDBACK-2026-08-10.md` items **B1.1** (credits at the
bottom), **B1.2** (palette changeable), **B1.3** (typeface changeable) and **B3.3** (web title and
description take the full width). Nothing in the tree was changed to write this.

Everything below is measured on the tree at `twin/`. Counts come from scans re-runnable from this
file's own commands; where I could not measure something I say so rather than infer it.

**The branch rule this survey is written under.** The twin is Tom Vaillant's self-contained-skill
method: a skill directory must stay copy-pasteable, so helpers are **duplicated, never imported
across skills**. That rule is enforced by `skills/splash-twin/test/no-cross-skill-imports.test.ts:311-361`
(every string literal in every non-`test/` source file under `skills/`, resolved on disk, must stay
inside its own skill). So this survey does **not** look for a shared furniture layer. It asks:
**what is the smallest change per craft skill, made identically across them, and what guards it
against drift.**

---

## 0. The population being changed

`MATRIX.md:14` — **23 types: 17 chart + 6 map.** On disk (`twin/proof/`): **70 beat folders with a
`BRIEF.md`**, plus `co2-suisse` (no brief, `MATRIX.md:56`) and the non-beat folders
(`comparison/`, `trial/`, `seance/`, `palette-proof/`).

The eight craft skills, and how each one's furniture actually reaches pixels:

| skill | furniture substrate | source line lives | title/desc width |
|---|---|---|---|
| `twin-chart-beat` | SVG `<text>`, drawn by the beat's own `.tsx` | **top**, under title/subtitle | n/a (fixed 900×560) |
| `twin-chart-web` | **HTML** over a text-free SVG | **bottom** (`<p class="chart-source">`) | **capped 640px** |
| `twin-chart-video` | SVG `<text>` inside a Remotion composition | **top**, under title | n/a |
| `twin-map-beat` | SVG `<text>`, left column beside the plate | **top** of the left column | n/a |
| `twin-map-web` | HTML furniture + SVG marks | **top** (`<p class="mw-source">`) | uncapped (100%) |
| `twin-image-beat` | SVG `<text>` | no story-level source; **per-photo credit under its photo** | n/a |
| `twin-scrolly` | HTML header + per-step panels | **top** (`<p class="source">` in the header) | capped 640px |
| `twin-dw-beat` | Datawrapper renders it | wherever DW puts `source-name` | not ours |

There is **no shared furniture component anywhere**, and there is no `<ChartFrame>`-style wrapper
as in the original Splash. Every beat lays out its own header block. That is the design, not a gap.

---

## 1. Where furniture is drawn today — evidence

### 1a. The static chart seed is the template every static beat copied

`skills/twin-chart-beat/assets/ChartSeed.tsx:229-256`:

```
  // The header is laid out first, because the plot starts where the header stops.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  …
  const padding = {
    top: sourceBaseline + 34,
```

Two things follow, and they matter for B1.1:

1. The source is drawn at `y = sourceBaseline` (`ChartSeed.tsx:288-290`), i.e. **in the header**.
2. **The plot geometry reserves its top padding FROM the source's own baseline**
   (`ChartSeed.tsx:249`). Moving the credit down is therefore not a one-line move of a `<text>`:
   `padding.top` must be re-derived from the title/subtitle block alone, and `padding.bottom`
   (currently `PAD + 24`, `ChartSeed.tsx:251`) must grow by the wrapped source's own height. Two
   edits per component, both arithmetic, both already local to the component.

### 1b. Every seed repeats that block. I counted them.

58 components define a `sourceBaseline` or a `sourceTop`. I printed every definition. **All 58
derive the source's position from something ABOVE it** — `titleBaseline`, `subtitleTop`,
`limitsBaseline`, `caveatBaseline`, `noteBaseline`, `titleTop`. **Not one is anchored to
`height - PAD`.** Representative sites:

- static chart: `proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx:130-133`
- static chart: `proof/static-swiss-age-pyramid/SwissAgePyramid.tsx:169`
- video chart: `proof/vidy-histogram-life-expectancy/HistogramVideo.tsx:253`
- video chart: `skills/twin-chart-video/assets/EmissionsVideo.tsx:245`
- static map: `skills/twin-map-beat/assets/Co2MapStill.tsx:141`
- video map: `skills/twin-map-beat/assets/Co2MapVideo.tsx:177`
- map web: `proof/mapgen-hexgrid-web/HexGridWeb.tsx:219`

The single exception is the fluid web genre — see 1c.

### 1c. The fluid chart-web genre already puts the credit at the bottom

`skills/twin-chart-web/assets/ChartWebSeed.tsx:383-386` draws `<h2 class="chart-title">` and
`<p class="chart-caveat">` in a `.chart-header`; `:607` draws `<p class="chart-source">{source}</p>`
**after** the plot, as the figure's last child. Verified in the shipped artifact: in
`proof/webx-carbon-footprint/carbon-footprint.html`, `class="chart-title"` is at byte 14506 and
`class="chart-source"` at byte 26009 — title first, source last.

The second component in the same file, `ChartWebPreviewSvg` (`:646`), does put the source in the
header — but its own header (`:631-641`) says it is the documentation thumbnail and
"explicitly NOT what `render-web.mjs` ships to a reader". Not part of B1.1.

### 1d. The map genres append the basemap credit to the source string

`skills/twin-map-beat/assets/Co2MapStill.tsx:128-129` and
`skills/twin-map-web/assets/MapWebSeed.tsx:160` both render `${source} · ${basemapCredit}`.
Any relocation of the source line moves the MapTiler attribution with it. I did **not** check
whether MapTiler's terms constrain where that attribution may sit; that is a real open question for
the spec, not something the code answers.

### 1e. `twin-map-beat` has a hard invariant that a relocation would trip

`Co2MapStill.tsx:155-159` throws when the header block collides with the legend:

```
  if (captionY - 14 < sourceBottom)
    throw new Error(
      `the column does not fit: the source ends at ${sourceBottom} and the legend starts at ${captionY}. …`
```

Moving the source out of the column frees space and makes this guard vacuous in its current form —
it would need re-pointing at whatever now ends the column, or it becomes a test that cannot go red.

---

## 2. B1.1 — the credits, and what decides where they sit

### The placement is not accidental. It is a documented doctrine override.

`skills/twin-doctrine/references/information-architecture.md:45-50` — the general stack puts the
source line at **the bottom**, "in the same position across every graphic a newsroom ships". Then
`:56-70`, "When a genre-scoped file disagrees with this stack":

> **Where the two disagree, the genre-scoped file wins.** The source line is the live example: this
> file's default (item 5 above) fixes it at the bottom; `static-discipline.md` places it directly
> beneath the title for a static chart beat, matching what the seed component actually draws.

And `skills/twin-chart-beat/references/static-discipline.md:138-151`, a section titled
"The source under the header, not in a footer":

> The source line sits directly beneath the title … Not 9px, not in the bottom-right corner, **not
> cropped when somebody screenshots the top of the chart.**

So B1.1 reverses a written rule with a stated reason. **Any spec that changes the code and leaves
these two files alone ships a repository that contradicts itself** — and per HANDOVER's own lesson
("Prose is the unguarded surface", `HANDOVER.md:408-415`), nothing mechanical will catch it. Two
prose edits belong in the same change: `static-discipline.md:138-151` and
`information-architecture.md:56-70` (which cites the override as its worked example, so deleting
the override leaves that section pointing at nothing).

### What is open, by count

| genre | beats | credit today | B1.1 status |
|---|---|---|---|
| static chart | 17 | header, top | **open** |
| video chart | 19 (line has 3) | header, top | **open** |
| web chart, fluid | 17 (16 matrix + `co2-suisse`) | bottom | **already true** |
| web chart, legacy two-rung | 1 (`more-heatmap-co2-per-capita-decades`) | header, top, inside SVG | **open** |
| static map | 8 | top of left column | **open** |
| video map | 6 | top of left column | **open** |
| web map | 5 | top (`mw-source` / SVG header) | **open** |
| image | seed only | per-photo credit under its photo | arguably already satisfied; **no story-level source exists** |
| scrolly | 2 | header, top (`render-scrolly.mjs:140`) | **open** |
| dw | Datawrapper's own `source-name` (`skills/twin-dw-beat/scripts/map-spec.mjs:207`) | DW's convention | **out of our hands** |

Roughly **57 beat components** carry a top-anchored credit. Each needs the two-line arithmetic
change from 1a; several also need a guard re-pointed (1e).

---

## 3. B1.2 — the palette. Measured, not assumed.

The mechanism exists and works. `readPalette` is at
`twin/shared/twin-chart-beat/render-still.mjs:105-123`, with `parsePalette` at `:125-147`. It walks
up from a beat's directory to a `stopAt`, reads `PALETTE.md` front matter (`ground`, `accent`,
`origin`), and **throws naming every directory it searched** rather than defaulting — the
anti-fallback rule made mechanical. `proof/palette-proof/PROOF.md` proves it end to end on the
static chart genre with a house answer, a journalist answer, and the refusal.

### How far it actually reaches

**`readPalette` is present in 6 of the 22 `render-still.mjs` copies.** Measured by grepping for
`export function readPalette` in every copy:

| carries `readPalette` | does not |
|---|---|
| `shared/twin-chart-beat/render-still.mjs` | `skills/twin-map-web/scripts/render-still.mjs` |
| `skills/splash-twin/assets/root-template/shared/twin-chart-beat/render-still.mjs` | `skills/twin-scrolly/scripts/render-still.mjs` |
| `skills/twin-chart-beat/scripts/render-still.mjs` | `skills/twin-image-beat/scripts/render-still.mjs` |
| `skills/twin-chart-video/scripts/render-still.mjs` | the 13 `proof/*/render-still.mjs` map copies |
| `skills/twin-chart-web/scripts/render-still.mjs` | |
| `skills/twin-map-beat/scripts/render-still.mjs` | |

**15 of the 70 beats read a recorded palette. 54 name a hex literal. 1 does neither.** Measured by
scanning every `proof/*/render*.mjs` for `readPalette(` versus
`(ground|accent)\s*:\s*"#[0-9A-Fa-f]{6}"`:

- **reads `readPalette`** (15): `mapgen-dot-web`, `mapgen-symbol-web`, `mapvid-dot-population`,
  `mapvid-hexgrid-quakes`, `mapvid-locator-geneva`, `static-bar-top-emitters-2024`,
  `static-bump-emitter-rank`, `static-diverging-bar-eu-per-capita`, `static-heatmap-coal-share-europe`,
  `static-small-multiples-solar-eu-six`, `vidz-bar-column-top-emitters`, `vidz-bump-emitter-rank`,
  `vidz-diverging-bar-eu-per-capita`, `webz-bump-emitter-rank`, `webz-diverging-bar-eu-per-capita`
- **names a hex literal**: the other 54
- **neither**: `more-heatmap-co2-per-capita-decades`, which holds
  `const GROUND = "#FFFFFF"` at `render-web.mjs:37` and a second `background: #FFFFFF` in its CSS at
  `:255`
- 17 `PALETTE.md` files exist on disk; **no root `twin/PALETTE.md`**, so the "one decision at the
  story root serves every beat" path is not exercised anywhere in this tree

**Every craft skill's own seed runner still names hex.** Measured on the eleven skill-level render
scripts: `readPalette` appears in **zero** of them; `ground:`/`accent:` hex literals appear in
`twin-chart-beat/scripts/render-preview.mjs`, `twin-chart-video/scripts/render-preview.mjs`,
`twin-chart-web/scripts/render-preview.mjs`, `twin-map-beat/scripts/render-preview.mjs`,
`twin-map-beat/scripts/render-map.mjs`, `twin-chart-web/scripts/render-web.mjs`,
`twin-map-web/scripts/render-web.mjs`, `twin-scrolly/scripts/render-scrolly.mjs`, and
`twin-image-beat/scripts/render-preview.mjs` (`const ground = "#FFFFFF"`, `:38`).

This is the load-bearing part of the finding: **the thing a new beat is copied FROM still
hardcodes.** So the 54/70 is not a backlog that shrinks on its own — it is the rate at which the
canon reproduces itself.

### Two prose claims that overstate the code

Both are the failure class `HANDOVER.md:408-415` names, and neither is caught by any guard:

- `skills/twin-palette/SKILL.md:3` — "**Every render reads that file, and refuses rather than
  default**"; and `:95` — "**Every render reads it, and none defaults.**" Measured: 15 of 70 beats,
  0 of 11 skill seed runners.
- `proof/palette-proof/PROOF.md:49-51` — "The web, video, map and scrolly genres **import the same
  vendored `readPalette`** and are guarded for parity". Measured: `twin-scrolly`, `twin-map-web` and
  `twin-image-beat` copies of `render-still.mjs` do **not** carry `readPalette` at all, and
  `render-still-parity.test.ts:20-25` explicitly permits that subset ("a superset and a subset are
  both fine"). So the guard is not covering what this sentence says it covers.

### What B1.2 still needs, per skill

`readPalette` duplicated into the 3 skill copies that lack it (`twin-map-web`, `twin-scrolly`,
`twin-image-beat`), then each skill's own seed runner switched from its hex literal to a
`readPalette` call, then the beats. The duplication is **automatically guarded the moment it
lands**: `render-still-parity.test.ts` walks the tree (`:149`) and compares every copy
function-by-function, so a fourteenth `readPalette` that drifted from the canonical one fails
without anyone wiring it up.

---

## 4. B1.3 — the typeface. The full picture, and the honest cost.

### 4a. `typefaces` is collected, validated, and reaches nothing

`skills/splash-twin/scripts/newsroom.mjs:3` — `typefaces` is one of the six required fields;
`:28-31` — `validateNewsroom` errors when it is missing. It has a documented meaning
(`skills/splash-twin/assets/root-template/NEWSROOM.example.md:7` and `:15`, "`typefaces` lists the
house fonts, most prominent first") and `twin-newsroom-charter` measures it off the newsroom's own
site (`scripts/derive-charter.mjs:136`, `chooseTypefaces`).

**Nothing reads it.** I grepped `typeface` across every `.mjs`/`.ts`/`.tsx` in the tree: the only
hits outside `twin-newsroom-charter`, `newsroom.mjs` and tests are prose. `PALETTE.md`'s own front
matter carries `ground`, `accent`, `origin` and nothing else
(`skills/twin-palette/assets/PALETTE.example.md:1-5`), so there is no recorded-answer file a font
could arrive through today. The project already says this out loud:
`proof/palette-proof/PROOF.md:53-55` — "**Not `typefaces`.** … The one font stack is `FONT_FAMILY`
in `render-still.mjs`, and threading a newsroom's own faces means shipping or resolving those
faces — a different problem, not started."

### 4b. Where a font is named — three distinct substrates, 75 sites

Measured by grepping `Helvetica` and `FONT_FAMILY` across `.tsx`/`.mjs`/`.ts`, excluding `test/`:

| substrate | shape | sites |
|---|---|---|
| **resvg / still** | `export const FONT_FAMILY = "Helvetica, Arial, sans-serif"` in `render-still.mjs` | **22** (every copy) |
| **browser Canvas / video** | each video `.tsx` declares its **own** `export const FONT_FAMILY` | **27** (25 beats + `twin-chart-video/assets/EmissionsVideo.tsx:49` + `twin-map-beat/assets/Co2MapVideo.tsx`) |
| **web / HTML+CSS** | a bare string literal, no constant at all | **26** |

The 29 static/map `.tsx` that *import* `FONT_FAMILY` (e.g.
`proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx:12-16`) are not extra sites —
they are the substrate working correctly.

The web sites are the untidiest, because there is no constant to change:

- JSX attribute, 15 sites, e.g. `skills/twin-chart-web/assets/ChartWebSeed.tsx:460` and `:746`,
  `proof/mapgen-choropleth-web/ChoroplethWeb.tsx:316`,
  `proof/more-heatmap-co2-per-capita-decades/Co2HeatmapWeb.tsx:312`
- CSS in a `buildCss` template, 7 sites: `skills/twin-chart-web/scripts/render-web.mjs:197`,
  `skills/twin-map-web/scripts/render-web.mjs:232`,
  `skills/twin-scrolly/scripts/render-scrolly.mjs:200`, and the four map-web beats' own
  `render-web.mjs` (`mapgen-choropleth-web:209`, `mapgen-dot-web:140`, `mapgen-hexgrid-web:142`,
  `mapgen-locator-web:130`, plus `more-heatmap-co2-per-capita-decades:255`)
- one inline style: `skills/twin-scrolly/assets/ScrollySeed.tsx:566`

**The video and web paths do not share the still path's const.** They cannot: the video substrate is
`document.createElement("canvas").getContext("2d")` and the still substrate is resvg, and
`skills/splash-twin/test/video-helper-parity.test.ts:1-10` says exactly why the duplication is
deliberate. The web path names the font twice per beat — once for the CSS that lays out the HTML
furniture, once for the SVG geometry that still carries a few `<text>` marks.

### 4c. **No guard covers `FONT_FAMILY` today.** This is the important part.

`skills/splash-twin/test/render-still-parity.test.ts:42-45`, in its own "WHAT IT PROVABLY DOES NOT
CATCH":

> 2. A drift in module-level CONSTANTS. `HEX`, `FONT_FAMILY` and the `measured` cache live outside
>    any function and are not compared. **`FONT_FAMILY` in particular is load-bearing** — the seed
>    draws with it and `measureText` measures with it, so a copy that disagreed would measure every
>    gutter against a font nobody is looking at.

`video-helper-parity.test.ts` compares only `measureText` and `wrap` (its `FAMILY` const,
`:69`). So of the 75 sites, **zero** are protected against drift. If a typeface change is applied by
editing 75 places, the very first one missed produces a chart whose gutters were measured in
Helvetica and drawn in something else — silently, in the PNG, which is the exact defect
`measureText`'s own doc-comment (`render-still.mjs:151-165`) exists to prevent.

**That is the finding that should shape the spec.** The cheap version of B1.3 — "make the font a
parameter" — is only cheap if the parameter is a **function**, because the walking parity tests
compare top-level `function NAME(…)` declarations and nothing else. A
`resolveTypeface(...)`-shaped helper duplicated into each `render-still.mjs` is guarded the moment
it lands; a changed `FONT_FAMILY` constant is guarded by nobody, forever. I am not recommending an
implementation here — but any spec that leaves the font as a bare const inherits an unguarded
75-site duplication, and the branch's own guard authors have already written down that they know it.

### 4d. Resolution — what it actually costs

Naming a face is not rendering it. Three separate substrates each need the glyphs present, and
**none of them has any font-provisioning code today**. I grepped the whole tree for
`fontFiles`, `fontDirs` and `defaultFontFamily`: **zero hits.** Every rasteriser call is
`new Resvg(svg, { font: { loadSystemFonts: true } })` (e.g.
`shared/twin-chart-beat/render-still.mjs:186` and `:217-218`).

| substrate | how a glyph is found today | what a house face would cost |
|---|---|---|
| **still (resvg)** | `loadSystemFonts: true` only | the face must be **installed on the journalist's machine**, or resvg needs `fontFiles`/`fontDirs` pointed at a shipped file. Silent failure mode: resvg falls back, `measureText` measures the fallback, gutters are "correct" for a font nobody sees. |
| **video (Remotion/Chrome)** | the headless browser's system fonts | same install requirement, or an `@font-face` with an embedded/served file inside the composition. Not present. |
| **web (standalone HTML)** | the **reader's** machine | `proof/webx-carbon-footprint/carbon-footprint.html:17-20` sets `font-family: Helvetica, Arial, sans-serif` with **no `@font-face` and no external font link**. A licensed house face would have to be base64-embedded in the standalone file — which is the only self-contained option, and it carries a **licensing question** (webfont embedding rights) that is not a code question at all. |

There is also a **verification** cost nobody has paid yet: every gutter in this project is measured
(`measureText`, and the doc-comment at `render-still.mjs:151-165` about the 3.3× under-measurement).
Change the face and every measured gutter, every `wrap()` line-break, and every collision guard
re-computes against different metrics. The label collisions this project has repeatedly found by
looking (`HANDOVER.md:437-449`) are exactly the class a font swap re-opens across all 23 types.

**My honest read: B1.3 is the most expensive of the four items, and it is expensive in a place the
feedback does not name.** Threading a *string* to 75 sites is mechanical. Getting a *glyph* onto
three substrates — one of which is a stranger's browser — plus re-verifying every measured gutter on
23 types × 3 genres, is the real cost. A spec that scopes B1.3 as "thread the string" will land
green and ship charts in Helvetica.

**Uncertainty I could not close:** I did not test whether resvg's `fontFiles` option works in this
project's pinned `@resvg/resvg-js` (`^2.6.2`, `twin/package.json`), nor whether Remotion 4.0.507
picks up a `@font-face` inside a composition without extra configuration. Both are claims about
third-party behaviour and both should be **measured** before a spec depends on them — the branch's
own habit.

---

## 5. B3.3 — the web title and description, full width

### One line causes it, and it is documented as deliberate

`skills/twin-chart-web/scripts/render-web.mjs:240`:

```
.chart-header, .chart-source { max-width: 640px; }
```

with `.chart-figure` and `.chart-plot` at `width: 100%` and no cap (`:200-218`, and the comment
block at `:200-206` describing "THE FLUID FILL"). So the geometry already fills; only the words are
capped. `skills/twin-chart-web/references/web-discipline.md:131-135` states it as a decision:

> The two places a long line of prose genuinely does become unreadable at full bleed — the header
> block (title + caveat) and the source line — are the **ONLY** things given a reading-measure cap
> (`640px`, `render-web.mjs`'s `buildCss`)

**This is the same shape as B1.1: the owner is overturning a written rule, so the reference file has
to move with the code**, or the repository argues against its own render.

### The leverage is unusually good — but only for 17 of the 23 web beats

**All 17 fluid chart-web beats import that CSS rather than vendoring it.** Verified: every one of
their `render-web.mjs` files carries
`import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs"` — e.g.
`proof/webx-carbon-footprint/render-web.mjs:14`, `proof/webz-bump-emitter-rank/render-web.mjs:36`,
`proof/co2-suisse/render-web.mjs:24`. That is legal: `no-cross-skill-imports.test.ts` only scans
files **under `skills/`** (`:113-120`, `:314`), and a beat is a story, not a skill.

So B3.3 for the chart-web genre is **one line in one file, plus re-rendering 17 HTMLs** (the 640px
string is baked into each committed artifact, e.g.
`proof/webx-carbon-footprint/carbon-footprint.html:63`).

### The web genre is not one population — it is three

Measured by parsing every committed HTML for `class="chart-source"`/`class="mw-source"` (fluid),
`data-layout="narrow"` (legacy two-rung) and every `max-width: Npx`:

| population | beats | title/desc width today |
|---|---|---|
| **fluid chart-web** (shared `renderWeb`) | 17 | capped **640px** — B3.3 open, one-line fix |
| **fluid map-web** (`mapgen-dot-web`, `mapgen-symbol-web`) | 2 | **uncapped**, `.map-web { width: 100% }` (`skills/twin-map-web/scripts/render-web.mjs:243-244`) — B3.3 **already true**; credits at top, so B1.1 open |
| **legacy two-rung** — `mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web`, `more-heatmap-co2-per-capita-decades` | 4 | **all text is SVG `<text>` inside a capped SVG** (`max-width: 860–900px`); each has its own `buildCss` and its own `DESKTOP_LAYOUT`/`NARROW_LAYOUT` pair |
| **scrolly** | 2 | header capped 640px (`skills/twin-scrolly/scripts/render-scrolly.mjs:221`) |

**The four legacy two-rung beats are the real finding here.** They never migrated to the fluid
redesign `HANDOVER.md:503-528` describes. For them, "title takes the full width" is not a CSS cap —
the title is an SVG `<text>` node inside a `viewBox` that a media query swaps between two fixed
layouts, so making it fluid means the same rewrite the chart-web genre already did once (SVG carries
geometry only; every word becomes HTML positioned in percentages). One of the four is
`more-heatmap-co2-per-capita-decades`, which is precisely feedback **B6.2** ("the visual must take
the full available width"). B6.2 is not a beat defect — **it is the migration debt, showing through.**

I did **not** verify by rendering that the fluid map-web layout is genuinely full-width at every
viewport; I read the CSS. Another agent is surveying responsiveness (B3.2) and that measurement
belongs to them.

---

## 6. The seam — the smallest change per craft skill, and what guards it

There is no shared layer to find, and the branch forbids creating one. What there **is** is a
well-chosen unit of duplication that already exists, plus two guards that make duplication safe at
scale. The seam is: **put the change inside a top-level `function` in `render-still.mjs`, because
that is the one artifact every craft skill already vendors and the one shape the walking parity
tests compare.**

Why that unit and no other:

1. **`render-still.mjs` is already in every craft skill** — 22 copies, one per skill plus one per
   map beat plus `shared/` plus the root template. Nothing new is introduced by adding to it.
2. **`render-still-parity.test.ts` walks the tree** (`:68-76`, `:149`) and compares every copy
   **function by function** (`:109-146`), normalising formatting (`:104-106`) so a formatter cannot
   turn it red. A new copy is guarded the moment it lands. A **superset and a subset are both fine**
   (`:20-25`) — so a skill that genuinely does not need a helper is not forced to carry it.
3. **`video-helper-parity.test.ts` does the same for the Canvas substrate** — it discovers every
   `.tsx` carrying `measuringContext` (`:73+`) rather than importing a list.
4. **The counter-example is on record.** `helper-parity.test.ts` uses a hand-written import list
   (37 imports). `render-still-parity.test.ts:4-9` records what that cost: twenty copies existed,
   six were named, fourteen were guarded by nothing; and `video-helper-parity.test.ts:14-19` records
   that an agent "kept a DEAD export alive purely so the list would keep importing it".
   **A guard maintained by remembering stops covering things.** Any new guard this work needs must
   walk, not list.

### The four items against that seam

| item | unit of change | already guarded? |
|---|---|---|
| **B1.2 palette** | duplicate the existing `readPalette`/`parsePalette` into the 3 skill copies lacking them; switch each skill's own seed runner off its hex literal | **yes, free** — they are top-level functions, the walk compares them the moment they land |
| **B1.3 typeface** | the font must stop being a module-level **const** and become something the parity walk can see | **no** — `render-still-parity.test.ts:42-45` names `FONT_FAMILY` as out of scope, by design. **This is the one item that needs a new guard**, and the guard must walk the tree the way its two siblings do |
| **B1.1 credits** | per-component arithmetic in ~57 seeds; no helper involved | **no, and no guard is natural** — layout is per-type. What *is* mechanical: a check that the source `<text>`'s y exceeds the plot's bottom, or that `.chart-source` is the figure's last child. That is a claim about output, closer to `beat-genre-produces-artifact.test.ts` than to a parity test. I have not verified such a check is feasible for the SVG genres without rendering. |
| **B3.3 full width** | one CSS line for 17 beats; a genre migration for 4 | n/a — CSS, not a duplicated helper |

### Where I would argue for something other than pure duplication — one place, stated plainly

**Nowhere for the code.** Every one of the four items fits the duplication rule, and B1.2 proves it
already works at 22 copies.

But the **reference files are a different question**, and I want to name it rather than let it pass.
B1.1 and B3.3 each require reversing a rule written in a `references/` file, and those files are
**not** duplicated — `information-architecture.md` lives once in `twin-doctrine` and is cited by
name from the genre files. So the prose has a single source of truth while the code deliberately
does not. That asymmetry is fine and probably correct; the risk is that it makes the prose edits
easy to forget, and nothing scans markdown (`HANDOVER.md:408-415`, `:488-490`). **My finding is not
"build a shared code layer" — it is "the doc edits are part of the change, and only a human will
catch them if they are missed."**

---

## 7. Leverage ranking

Ranked by types × genres closed per edit, with the honest cost of each.

**1. B3.3, fluid chart-web — `render-web.mjs:240`.**
One line. Closes the item for **17 of 23 types in the web genre** at once, because all 17 beats
import that CSS. Cost: delete/raise the cap, edit `web-discipline.md:131-135` so the doc stops
defending it, re-render 17 HTMLs. **Highest leverage in the whole survey by a wide margin.**

**2. B1.2 — `readPalette` into 3 skill copies + 11 seed runners.**
The mechanism is built and proven; what is missing is reach. Duplicating into `twin-map-web`,
`twin-scrolly` and `twin-image-beat` plus switching each skill's own seed runner off its hex literal
**changes what every future beat is copied from** — which is the only thing that stops the 54/70
regenerating. Auto-guarded by the walking parity test. Cost: small, and the two overstated prose
claims (`twin-palette/SKILL.md:3` and `:95`, `palette-proof/PROOF.md:49-51`) should be corrected in
the same change, since they currently describe the finished state rather than the real one.

**3. B1.1 — the credit relocation, ~57 components.**
No shared unit exists, so this is genuinely 57 edits of the same two-line arithmetic — but the shape
is **identical everywhere** (1a/1b), which makes it the ideal parallel-agent job rather than a
design problem. Cost concentrated in three places, not spread evenly: the `twin-map-beat` column
invariant (`Co2MapStill.tsx:155-159`), the basemap-credit concatenation (1d, needs a terms check),
and the two doctrine files that currently say the opposite (§2). The 17 fluid chart-web beats need
nothing.

**4. B3.3 / B6.2 — the four legacy two-rung beats.**
`mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web`,
`more-heatmap-co2-per-capita-decades`. Not a CSS cap: the words are SVG `<text>` in a fixed viewBox.
Closing them means repeating the SVG-geometry-only / HTML-furniture migration that
`HANDOVER.md:503-528` describes. **Four beats, one migration each** — low leverage per unit of work,
but it also closes B6.2 and probably a share of B3.2, and it removes the last place where the web
genre means two different things.

**5. B1.3 — the typeface.**
Lowest leverage per unit of work and highest risk. 75 naming sites across three substrates, **none
guarded**; a new walking guard needed; glyph resolution unsolved on all three substrates and
carrying a font-licensing question on the web one; and every measured gutter on 23 types × 3 genres
re-verifies against new metrics. It is last not because it matters least — the owner asked for it —
but because it is the only one of the four whose cost is not mostly known, and a spec written
without measuring 4d's two open questions would be a spec written on a guess.

---

## 8. Holes in this survey, stated

- **I rendered nothing.** Every claim about what is *drawn* comes from source and from committed
  artifacts, not from looking at pixels. B3.3's "already true" for the two fluid map-web beats is a
  CSS reading, not a screenshot.
- **MapTiler attribution placement** (1d) — I did not check whether the terms constrain where the
  basemap credit may sit. B1.1 on the six map genres depends on that answer.
- **resvg `fontFiles` and Remotion `@font-face`** (4d) — I read that no such code exists; I did not
  test whether either mechanism works in this project's pinned versions.
- **`twin-dw-beat`** — I established only that furniture is Datawrapper's (`map-spec.mjs:204-215`:
  `source-name`, `custom-colors`, `force-attribution: false`). Whether DW's theme/font is reachable
  on this account's plan is not something I probed; the parent repository's `CLAUDE.md` records that
  it was **not** reachable on the original Splash's plan, which is a strong prior but not evidence
  about this tree.
- **B1.1 for `twin-image-beat`** — the per-photo credit already sits under its photo
  (`ImageBeatSeed.tsx:133-137`, `:236-243`), but there is **no story-level source line at all**.
  Whether that is a satisfied item or a missing one is an editorial question, not a code one.
- **Component counts.** "~57 components with a top-anchored credit" is derived from the 58
  `sourceBaseline`/`sourceTop` definitions minus `ChartWebSeed`'s preview-only one. Some files
  (e.g. `proof/mapgen-choropleth-video/`) hold both a still and a video component, so the count is
  of components, not of beats, and a handful of beats will need two edits.
