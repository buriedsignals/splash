# Typeface feasibility — measured, 2026-08-09

**This is a measurement report, not a spec.** `PLAN-2026-08-10.md:67-71` says W7 cannot be specified
until two third-party behaviours are measured and a licensing question is asked. Both behaviours are
now measured, on the pinned versions, by rendering and looking. Nothing in the tree was changed to
write this; every probe ran in `/tmp` against `twin/node_modules`.

`survey/furniture-typeface-credits.md:342-347` states the two open questions and calls them
uncertainty it could not close. They are closed below. It also predicted the shape of the risk
(§4c, "a copy that disagreed would measure every gutter against a font nobody is looking at").
**That prediction is now a measured, reproduced defect** — and it is worse than the survey guessed,
because it does not need a missed *copy*. It needs a missed *call site inside one copy*, and there
are exactly two per copy.

Environment: `@resvg/resvg-js` 2.6.2 (resolved from `^2.6.2`, `node_modules/@resvg/resvg-js/package.json:3`),
`remotion` / `@remotion/cli` 4.0.507, `puppeteer` 24.x, macOS 25.3, Bun 1.3.5. Test face: **Inter 4.0**
(SIL OFL), chosen because it is **not installed on this machine** — verified against the 299 families
`system_profiler SPFontsDataType` reports, so a successful render can only have come from the file
I pointed at.

---

## Summary of what was measured

| # | Question | Answer |
|---|---|---|
| 1 | Does `fontFiles` work on resvg 2.6.2? | **Yes** — `fontFiles`, `fontDirs` and `defaultFontFamily` all work, with **TTF and OTF**. **WOFF2 is silently ignored.** resvg **never errors** on an unresolved family. |
| 2 | Does Remotion 4.0.507 pick up an in-composition `@font-face`? | **Yes for the paint**, from frame 0, with a base64 data URI, no config. **No for `measureText`** — the video substrate measures the fallback. Fixed by `delayRender` + `document.fonts.load`, measured. |
| 3 | What does embedding cost the standalone HTML? | Subsetted to the Latin range: **+28 KB for two weights**. Subsetted to the glyphs one chart actually draws: **+9.6 KB**. Unsubsetted: **+296 KB** — unreasonable against 29–110 KB chart artifacts. |
| 4 | Blast radius of a re-measure? | **Smaller than feared, if measure and paint agree.** A +12% face and a +23% face both re-rendered three static beats with **zero clipped text and zero new collisions**. If they *dis*agree, the same beats clip in three places each. |
| 5 | Licensing? | OFL 1.1 **explicitly permits embedding and redistribution**, with a notice condition that naive subsetting breaks. A typical commercial EULA **forbids exactly what we would do**. |
| — | Is there a middle path? | Measured on 10 real newsrooms: **3/10 name a Google-Fonts face** (including **Heidi.news, the pilot — Roboto, OFL**), **7/10 name a proprietary self-hosted face**, **0/10 a system face**. |

---

## 1. resvg 2.6.2 and `fontFiles`

### The measurement

`bun /tmp/twinfont/probe-resvg.mjs` — one 900×120 SVG, one `<text>`, rendered under nine option sets;
SHA-256 of each PNG, so "did the glyphs change" is a byte question, not an opinion.

```
=== control: what the tree renders today ===
helvetica-system             sha=d1b10ea2ccaccaa0
georgia-system               sha=b2727c73a3f71e27
=== Inter is NOT installed on this machine ===
inter-systemonly             sha=a27bb2dea9bfbd38
=== fontFiles ===
inter-fontFiles-ttf          sha=c0c7ebaa66d01b9b
inter-fontFiles-otf          sha=2c79118c7b2063de
inter-fontFiles-woff2        sha=a27bb2dea9bfbd38
=== fontFiles with system fonts OFF ===
inter-nosys-ttf              sha=c0c7ebaa66d01b9b
inter-nosys-defaultfam       sha=c0c7ebaa66d01b9b
=== fontDirs ===
inter-fontDirs               sha=c0c7ebaa66d01b9b
=== silent-fallback check: a face that exists nowhere ===
nonexistent-face             sha=a27bb2dea9bfbd38
nonexistent-nosys            sha=c0c7ebaa66d01b9b
```

Read three things off that table:

1. **`fontFiles` works.** `inter-fontFiles-ttf` differs from every system render, and both PNGs were
   opened and looked at: the Inter render is visibly Inter (the flagged `1`, the different `%`, the
   wider set). `fontDirs` gives the identical hash. `defaultFontFamily` works. **OTF works** and
   gives a slightly different hash from TTF — CFF outlines rasterise marginally differently, which is
   itself worth knowing if a proof PNG is ever byte-compared.
2. **WOFF2 is silently ignored.** `inter-fontFiles-woff2` has the *exact* hash of the no-font
   fallback. resvg's `fontdb` does not decompress WOFF2. So the file we embed in the HTML (WOFF2) and
   the file we hand resvg (TTF/OTF) **cannot be the same file**. That is a provisioning fact, not a
   nuisance: the resolver must produce both forms.
3. **resvg never errors.** `nonexistent-face` renders happily in the system fallback;
   `nonexistent-nosys` renders happily in whatever single font was loaded. There is **no error path
   and no return value** that says "I could not find the face you asked for". Any refusal has to
   happen *before* the render, by checking the resolved file's own `name` table.

### The API shape that works

```js
new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: ["/abs/path/Inter-Regular.ttf"], defaultFontFamily: "Inter" } })
```

`node_modules/@resvg/resvg-js/index.d.ts:3-15` documents `fontFiles`, `fontDirs`,
`defaultFontFamily`, `serifFamily`, `sansSerifFamily`, `monospaceFamily`. All measured working
except WOFF2 input.

### Where it has to go in this tree — **47 sites, in a shape that is already guarded**

`grep -rn "loadSystemFonts" --include="*.mjs" . | grep -v node_modules | grep -v /test/` → **47**,
and the per-file breakdown is the important part:

```
   2 × 22 render-still.mjs copies   (skills/*, shared/, root-template/, and 13 proof/ map copies)
   1 × 3  inspect-render.mjs copies
```

**Exactly two per `render-still.mjs`, and they must agree**: the probe inside `measureText`
(`shared/chart-beat/render-still.mjs:186`) and the rasteriser (`:217-218`). §4 below measures
what happens when they do not.

That is a better seam than the survey's §6 hoped for: one new top-level function per copy —
`resolveFontOptions()` returning the `{ font: {...} }` object — called from both sites.
`render-still-parity.test.ts` walks the tree and compares top-level functions, so the 22nd copy is
guarded the moment it lands, with nobody maintaining a list.

---

## 2. Remotion 4.0.507 and an in-composition `@font-face`

### The measurement

A lab at `/tmp/fontlab` with `node_modules`, `skills` and `shared` symlinked to the tree, and a real
copy of `proof/vidz-bar-column-top-emitters`. Two edits to the **copy**: `FONT_FAMILY` →
`"InterProbe, Helvetica, Arial, sans-serif"`, and a `<style>` child of the composition's root `<svg>`
carrying two `@font-face` rules whose `src` is a `data:font/woff2;base64,…` URI (Inter Regular and
Bold, 292,949 bytes of CSS).

```
remotion still  proof/vidz-bar-column-top-emitters/index.ts vidz-bar-column-top-emitters out.png --frame=0
remotion still  … --frame=-1
remotion render … --sequence --frames=0-4 --concurrency=1
```

**The paint works, and works at frame 0.** The last frame and all five of frames 0–4 were opened and
looked at: every one is Inter, against the committed Helvetica original. No fallback flash, no
config, no `@remotion/fonts` package, no `staticFile`. A `<style>` inside the composition is enough.

### The finding that matters: `measureText` does **not** see the face

The video substrate measures with a detached Canvas at module scope
(`ColumnRankingVideo.tsx:83-96`, and 26 sibling copies). I built a probe that draws the sentence and,
directly under it, a rule whose width **is** `measureText(sentence)`. If the rule ends where the ink
ends, the measurement and the paint agree.

| composition | what it does | `measureText` result |
|---|---|---|
| `probe-no-face` | no `@font-face`; paints in Helvetica | **623.65 px** |
| `probe-with-face` | `@font-face` present; **paints in Inter** | **623.65 px** ← the fallback number |
| `probe-waited` | `delayRender()` + `document.fonts.load()` + `document.fonts.ready`, canvas created after | **648.51 px** |

`/tmp/fontlab/probe-with-face.png` was opened: the text is Inter, the rule stops ~29 px short of the
ink. `/tmp/fontlab/probe-waited.png`: the rule ends exactly at the ink.

**So Remotion will happily paint a house face while every gutter in the frame was measured in
Helvetica**, and nothing anywhere says so. 4.0 % under-measurement for Inter; §4's table says 12.6 %
for Verdana and 23.0 % for Courier New.

**The fix is known and measured**, and it is structural rather than mechanical: each video component
has to gate its own render on `document.fonts.load(...)` before its measuring canvas is created.
That is a change to 27 `.tsx` files that today measure synchronously at module scope, and
`video-helper-parity.test.ts` already discovers and compares `measureText`/`wrap` in every `.tsx`
that carries `measuringContext`, so the copies stay in step for free.

**Not measured:** whether `@remotion/fonts`' `loadFont()` would do this more cleanly. That package is
not in `package.json` and I did not install it. The route above is the one I proved.

---

## 3. What embedding costs the standalone HTML

### Sizes, measured

```
stat -f%z on the delivered artifacts, and on Inter's own files
pyftsubset (fontTools 4.x in a /tmp venv) for the subsets
```

| file | bytes | base64 |
|---|---|---|
| `Inter-Regular.woff2`, unsubsetted | 108,488 | 144,652 |
| `Inter-Bold.woff2`, unsubsetted | 111,040 | ~148,000 |
| `InterVariable.woff2` (one file, all weights) | 345,588 | ~461,000 |
| subset to Google-Fonts' `latin` range, Regular | **10,540** | ~14,100 |
| same, Bold | **10,300** | ~13,800 |
| subset to the **52 distinct characters one delivered chart actually draws** | **3,564** | ~4,800 |

The 52 characters were extracted from `proof/webx-carbon-footprint/carbon-footprint.html` itself:
`" %(),-./012345678:;ABCDGMOSWabcdefghiklmnoprstuvwxy·"`.

### Against what exists today

`find proof -name "*.html"` → **24 delivered files, 28,869 B to 641,606 B**. Two populations:

- **chart-web / scrolly: 28.9 KB – 110 KB** (18 files)
- **map-web: 186 KB – 642 KB** (6 files; they carry baked geometry)

A real standalone page with two subsetted weights base64-embedded was built and **opened in Chrome
from `file://` with no network** (`bun /tmp/twinfont/probe-standalone.mjs`):

```
with-face  html bytes 28598   fonts: ["HouseFace 400 loaded","HouseFace 700 loaded"]  canvas measureText: 458.00
no-face    html bytes   543   fonts: []                                              canvas measureText: 450.26
```

Both screenshots were opened. **The HTML furniture *and* the SVG `<text>` marks both pick up the
embedded face** — which matters, because the web genre draws in both.

### The cost, stated plainly

| embedding choice | added bytes | on the smallest chart artifact (28.9 KB) | on the largest map artifact (642 KB) |
|---|---|---|---|
| exact glyph subset, 2 weights | **~9.6 KB** | +33 % | +1.5 % |
| Latin subset, 2 weights | **~28 KB** | +97 % | +4.4 % |
| unsubsetted, 2 weights | **~296 KB** | **+1,024 %** | +46 % |
| variable font, unsubsetted | ~461 KB | +1,596 % | +72 % |

**Where it stops being reasonable: at the unsubsetted file.** Tripling-to-elevenfolding a 29 KB
deliverable to carry glyphs it never draws is not defensible. Subsetted, it is never the dominant
cost — the *exact-glyph* subset is smaller than the CSS it arrives in.

Two consequences the spec has to carry:

- **Subsetting is not an optimisation here, it is the feasibility condition.** That means a
  subsetter in the toolchain. `pyftsubset` is Python; the tree is Bun-only today. Either a small
  WOFF2 subsetter in JS, or an accepted external dependency, or a **pre-subsetted face committed
  beside the story** (which fits this branch's frozen-inputs habit better than either).
- **Two weights, not one.** Every beat draws 400 and 700. Italic would be a third.

---

## 4. The blast radius of a re-measure — the number that decides "week or month"

### Method

`/tmp/fontlab` again, with `shared/chart-beat` and `skills/chart-beat` as real copies.
`FONT_FAMILY` swapped in `shared/chart-beat/render-still.mjs:26` and three static beats
re-rendered through **their own** `render.mjs`. Then an analyser
(`bun /tmp/twinfont/collide.mjs <svg>`) re-measures every `<text>` node's ink box in the family the
SVG declares and reports (a) anything outside the frame, (b) any two text boxes that overlap.
The same analyser on both renders, so the delta is the measurement.

Faces: **Verdana (+12.6 % on a title string)** and **Courier New (+23.0 %)** — chosen from a measured
width table, at both 13 px and 24 px:

| string | Helvetica | Georgia | Verdana | Courier New | Inter |
|---|---|---|---|---|---|
| "Emissions rose 41% since 1990" | 338.0 | 325.0 (−3.8 %) | 380.0 (+12.4 %) | 414.0 (+22.5 %) | 351.0 (+3.8 %) |
| "Switzerland" | 122.0 | 125.0 (+2.5 %) | 138.0 (+13.1 %) | 157.0 (+28.7 %) | 131.0 (+7.4 %) |

(A realistic house sans differs from Helvetica by 3–8 %. Verdana and Courier are deliberately past
the realistic range.)

### Result A — when measure and paint agree, **almost nothing breaks**

| beat | face | text outside frame | overlapping text pairs | plot top moved |
|---|---|---|---|---|
| `static-heatmap-coal-share-europe` | Helvetica (committed) | 0 | 0 | — |
| | Verdana | **0** | **0** | 256 → 276 (+20 px) |
| | Courier New | **0** | **0** | +extra header lines, still 0/0 |
| `static-small-multiples-solar-eu-six` | Helvetica | 0 | 0 | — |
| | Verdana | **0** | **0** | 257 → 257 (0) |
| | Courier New | **0** | **0** | 0/0 |
| `static-swiss-age-pyramid` | Helvetica | 0 | 0 | — |
| | Verdana | **0** | **0** | 150 → 180 (+30 px) |
| | Courier New | **0** | **0** | 0/0 |

All three Verdana renders and the Courier heatmap were **opened and looked at**. They are ugly in
Courier, and correct. The title re-wraps (pyramid 1 → 2 lines, heatmap subtitle 4 → 5), the header
grows, the plot loses up to 30 px of a fixed frame — and every gutter, every end-label, every axis
tick re-derives and fits, because they were measured rather than guessed. **This is the measured-gutter
discipline paying out**, and it is the single most important number in this report: it means W7 is
*not* "re-verify 23 types by hand and fix the collisions".

Residue, honestly: the frame height is fixed per beat, so a taller header eats the plot. At Courier
the heatmap's grid nearly reaches the bottom margin. There is a face wide enough to squeeze a plot
to nothing; none of the realistic ones is.

### Result B — when they disagree, **three beats clip in ten places**

The realistic missed site: the paint gets the house face, the measurement does not. Simulated by
taking each **committed** SVG (laid out in Helvetica) and rasterising it declaring Verdana:

```
mismatch static-swiss-age-pyramid            2 text nodes outside the frame
mismatch static-heatmap-coal-share-europe    4
mismatch static-small-multiples-solar-eu-six 3
```

`/tmp/twinfont/mismatch-static-small-multiples-solar-eu-six.png` was opened: the title reads
**"in every one of the EU's s"**, the subtitle reads **"so a flat pa"**, and Italy's end-label
"13.5%" runs off the right edge. Silently. In the PNG. **This is the exact defect
`render-still.mjs:151-165` exists to prevent**, reintroduced by touching one of the two call sites
and not the other.

### Result C — the map genre has a loud guard with about two lines of headroom

`skills/map-beat/assets/Co2MapStill.tsx:155-159` throws when the header block meets the legend.
I recomputed that arithmetic per face (`bun /tmp/twinfont/map-guard.mjs`), on the 308 px column:

| strings | Helvetica | Verdana | Courier New |
|---|---|---|---|
| the seed's own short ones | 121 px headroom | 121 px | 104 px |
| a realistic long title + the OWID source string the chart beats ship | **44 px** | 44 px | **27 px** (source wraps to 5 lines instead of 4) |

So the map beats do **not** clip silently — they throw, by name, with the numbers in the message.
But a wide face plus a long source has roughly **two source-lines of slack**, and each throw is a
hand re-tune of that beat. The strings in the second row are representative, not taken from a
shipped map beat; treat the 44 px as an order of magnitude.

---

## 5. Licensing — the question, named precisely

I am not giving legal advice. I am naming what the owner is deciding, with the licence texts read
rather than remembered.

**What we would actually do**: take a font file the newsroom licensed, **copy it into a file we hand
to the newsroom, which the newsroom then publishes on the open web**, where any reader can extract
it. That is redistribution of the font software, not use of it. Every question below follows from
that one sentence.

### SIL OFL 1.1 — permits it, with a condition that naive subsetting breaks

Read from `https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/OFL.txt`:

> Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software,
> to use, study, copy, merge, **embed**, modify, **redistribute**, and sell modified and unmodified
> copies of the Font Software, subject to the following conditions:

> 2) Original or Modified Versions of the Font Software may be bundled, redistributed and/or sold
> with any software, **provided that each copy contains the above copyright notice and this license**.
> These can be included either as stand-alone text files, human-readable headers or in the
> appropriate machine-readable metadata fields within text or binary files **as long as those fields
> can be easily viewed by the user**.

> The requirement for fonts to remain under this license **does not apply to any document created
> using the Font Software**.

Three operative facts:

1. **Embedding and redistribution are explicitly permitted.** The reader's copy of the HTML is fine.
2. **Condition 2 is a live obligation on us**, and I measured that the obvious pipeline breaks it:

   ```
   inter/web/Inter-Regular.woff2   nameIDs: [0,1,2,3,4,5,6,7,8,9,11,12,13,14,256…276]
       13 'This Font Software is licensed under the SIL Open Font License, Version 1.1…'
       14 'http://scripts.sil.org/OFL'
   sub-gflatin.woff2 (pyftsubset, defaults)  nameIDs: [0,1,2,3,4,5,6]
       13 None
       14 None
   ```

   **Default subsetting strips nameID 13 (the licence) and 14 (its URL)**, keeping only the copyright.
   Fix is one flag (`--name-IDs`) or an OFL notice in the delivered HTML's head — but it has to be a
   named requirement, because nothing would ever catch it.
3. **Subsetting is a "Modified Version"** (the licence defines that as including "changing formats").
   Condition 3 then bites *if* the face declares a Reserved Font Name. Roboto's OFL header declares
   none (checked: the only "Reserved Font Name" string in the file is the definitions section) — which
   is Google Fonts' deliberate practice, and **all 1,942 families in Google Fonts' own metadata carry
   `isOpenSource: true`**. A face from elsewhere may well declare an RFN, and then a subset must be
   renamed.

### A typical commercial webfont licence — forbids exactly what we would do

Typofonderie's EULA, fetched and quoted:

> "Any Typofonderie Digital Font converted into Webfont is prohibited and not covered by this license."

> "Each licensed Webfont may solely be used for the maximum number of domains and up to the maximum
> number of **page views by month** listed into the purchased Self-Hosted Webfont License invoice."

> "Users licensed are **not allowed to send documents to third parties by including the Digital Font
> file** composing content of the document. Content of any document sent to any third party **must be
> vectorized or embedded inside an image** (.PNG, .JPG, .TIFF…) or within a secured PDF format."

That one vendor is not every vendor, but the three axes it names are the standard ones:

- **desktop ≠ webfont** — the file the newsroom's designers have may not be legal to serve at all;
- **metering by domain and monthly pageviews** — a self-contained HTML the newsroom can copy anywhere
  is, by construction, unmetered;
- **no font file inside a document sent to a third party** — and this clause even prescribes our
  fallback: *vectorised, or inside an image*.

### So the decision the owner is making

**For the static PNG and the mp4, licensing is nearly a non-issue** — the glyphs become paths and
pixels, which is what commercial EULAs already contemplate ("vectorized or embedded inside an image").
Only the machine we render on needs the file.

**For the standalone HTML it is the whole issue**, because that file *is* the font file, redistributed.
Three coherent positions:

- **(a) OFL/Apache faces only for the web deliverable.** We embed. We ship the notice. No further
  question. Covers 3 of the 10 newsrooms measured below — including the pilot.
- **(b) The newsroom asserts its own right**, records it in `NEWSROOM.md`, and we embed what they name.
  Moves the decision to the party that holds the licence, which is where it belongs — but it means the
  tool will happily produce a file its user is not entitled to publish, on the user's own word.
- **(c) House face on static/video, resolvable face on web.** Honest, no legal exposure, and the thing
  the newsroom sees most (the interactive) is the thing that is not theirs.

This is the one item in this report that is **not** a technical decision, and I am not making it.

---

## 6. Is there a middle path? — measured on 10 real newsrooms

The survey could not say what fraction of newsrooms name a resolvable face. I measured it: each site
loaded in the same Chrome build puppeteer pins, `getComputedStyle` on the first heading and on
`document.body`, plus every `@font-face` family the page actually loaded. Classified against this
machine's 299 system families and against Google Fonts' own 1,942-family metadata list.
(`bun /tmp/twinfont/newsrooms.mjs`)

| newsroom | first named family | resolvable? |
|---|---|---|
| **heidi.news** *(the pilot)* | **Roboto** | **on Google Fonts — OFL 1.1** |
| tagesanzeiger.ch | Libre Franklin | on Google Fonts — OFL 1.1 |
| 24heures.ch | Libre Franklin | on Google Fonts — OFL 1.1 |
| letemps.ch | Ratio Sans | proprietary, self-hosted |
| rts.ch | RTS Neue VAR | proprietary, self-hosted |
| republik.ch | RepublikSerif | proprietary, self-hosted |
| lemonde.fr | Marr Sans | proprietary, self-hosted |
| theguardian.com | GH Guardian Headline | proprietary, self-hosted |
| nzz.ch | NZZ Sans | proprietary, self-hosted |
| swissinfo.ch | SWI Aktiv Grotesk | proprietary, self-hosted |

**3 / 10 resolvable from a public open-licensed source. 7 / 10 not. 0 / 10 a system face.** And note
what follows the named face in every stack: `Helvetica, Arial, Verdana, sans-serif`, or
`system-ui, -apple-system…`. **Every newsroom measured already ships a fallback stack to its own
readers.** Typography has done this for thirty years; nobody calls it a defect.

That is what makes "we use your face when we can resolve it, and say plainly when we cannot"
**coherent with invariant 1** — but only under one condition, which the measurements make sharp:

> **The refusal must happen at resolution time, not at render time.**

Because measured: **resvg falls back silently** (§1, `nonexistent-face` renders), **Chrome falls back
silently**, and **Canvas `measureText` falls back silently** (§2). No substrate will ever tell us.
So a font stack in a config file is not an answer with a fallback — it is an answer that can turn
into a value nobody chose, invisibly, in a PNG. The shape that satisfies invariant 1 is the shape
`PALETTE.md` already has: a **recorded answer with its origin**, resolved to a **file path**, checked
against the file's own `name` table before anything renders, and a **loud refusal naming what it
looked for** when it cannot. A journalist who is then told "we cannot get *Marr Sans*; your charts
will be set in Inter — accept or supply the file" has *chosen*. A silent stack has not.

---

## 7. Recommendation, with cost bands

Three paths. I recommend **C then A**, for the reason the plan gives about seeds
(`PLAN-2026-08-10.md:44-46`): prove the mechanism on one genre, then propagate — which is exactly how
the palette landed, and why `palette-proof/PROOF.md` exists.

### Path A — the full answer: the house face reaches all three substrates

Everything below is measured-feasible; none of it is speculative.

| piece | what it is | days |
|---|---|---|
| Recorded answer + resolver | a `TYPEFACE`-shaped recorded file (or a field on `PALETTE.md`), resolving a named face to **a TTF/OTF for resvg and a subsetted WOFF2 for the web**, verifying the resolved file's `name` table matches, refusing loudly and naming every place it looked | 2–3 |
| Still substrate | `resolveFontOptions()` as a top-level function duplicated into 22 `render-still.mjs` copies, called from **both** the `measureText` probe and the rasteriser (44 sites); `FONT_FAMILY` derived from the recorded answer | 3–4 |
| Video substrate | 27 `.tsx`: `delayRender` + `document.fonts.load` before the measuring canvas; the `@font-face` into the composition | 2–3 |
| Web substrate | base64 the subset into the ~8 `buildCss` sites and the ~26 bare literals; OFL notice in the head | 2–3 |
| Guards + their mutations | one walking guard that the two resvg call sites in each copy take the *same* options (the §4-B mismatch is its mutation); one that a rendered still's text ink stays inside the frame (the §4-B render reddens it); extend `video-helper-parity` to the font gate | 2–3 |
| Re-render and **look** | 70 beats, opened; the map column guard re-tuned where it throws (§4-C) | 3–5 |
| **Total** | | **14–21 days ≈ 3–4 weeks** |

### Path B — static and video only, web keeps the fallback stack

Drops the web substrate and the whole licensing question. **8–12 days**. I do not recommend it: the
interactive is what a reader meets, and a chart whose PNG is in the house face and whose HTML is in
Helvetica is a worse answer than either alone.

### Path C — one genre, proven, the way the palette was — **start here**

The static chart genre only: recorded answer + resolver + the two resvg call sites in
`shared/chart-beat/render-still.mjs`, its walking guard and mutation, a refusal, and a
`typeface-proof/` beside `palette-proof/` showing a house answer, a resolvable-but-not-house answer,
and the refusal. **4–6 days.** It buys the two things that decide Path A's real cost — does the
resolver's refusal read well to a journalist, and does the OFL notice obligation survive contact with
the subsetter — before 27 video components are touched.

### The one thing that must not be traded away

**The font must never be a bare module-level constant.** Not for the reason the survey gave (parity
tests only compare functions — true, `render-still-parity.test.ts:42-45` says so itself), but for the
stronger reason §4-B measured: the two resvg call sites inside a **single** copy must agree, and a
constant cannot express that. A function can, and the walking test guards it for free.

---

## 8. Where a measurement failed, or I did not take it

- **I did not render a map beat with a swapped face.** `skills/map-beat/scripts/render-preview.mjs`
  wants a pre-baked plate at `/tmp/map-twin/plate-900`, which needs the basemap step. §4-C recomputes
  the column invariant's arithmetic instead, on **representative** strings I wrote, not a shipped map
  beat's. The direction is certain; the 44 px is an order of magnitude.
- **I did not render an mp4.** Frames 0–4 and the final frame, as stills and as an image sequence.
  A full encode was not run.
- **I did not test `@remotion/fonts`.** Not installed here.
- **I did not test the scrolly or image genres at all.**
- **No JS/Bun WOFF2 subsetter was evaluated.** `pyftsubset` needed a Python venv; the tree is Bun-only.
  Whether a Bun-native subsetter exists at usable quality is unmeasured, and it is a real input to
  Path A's "recorded answer + resolver" line.
- **The 10-newsroom sample is a sample**, chosen for relevance (Swiss + French + one anglophone), not
  drawn at random. It is enough to refute "most newsrooms use a system face" and enough to establish
  that the pilot's own face is OFL. It is not a population estimate.
- **`dw-beat` is out of scope entirely** — Datawrapper renders its own furniture, and the
  parent repository's note that a house theme was not reachable on its plan is a prior, not evidence
  about this tree.
- **Everything measured here is macOS/arm64.** resvg's system-font enumeration and Chrome's fallback
  differ on Linux, and a newsroom on Windows is unmeasured — which matters most for the
  `loadSystemFonts` path Path A partly removes.
