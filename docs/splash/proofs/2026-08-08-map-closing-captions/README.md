# The five map types that had no closing line

2026-08-08. The route track got a data-tied closer on 2026-08-08
(`docs/splash/proofs/2026-08-08-route-closing-caption-and-frame-updates`); that proof recorded,
with a render, that the other five map types close on their own **description** and left it as a
named neighbouring problem. This is that problem, reproduced across all five and closed.

Everything below was measured on **built pages** (`skills/scrolly/scripts/produce.mjs`, opened and
scrolled to the end in Chromium) and on **rendered video frames** (Remotion `still --frame=-1` of
each type's `*Story` composition, the same props path `produce.mjs` uses), on the shipped sample
configs — none of which carries an `insight`, which is the shape every loop-assembled config has.

## 1 — what the last card said, before

Each row is the page's **opening** card and its **closing** card, verbatim, from the same render.

| type | opening card | closing card |
|---|---|---|
| symbol | Venture funding raised by startups headquartered in each city, 2024 | **Venture funding raised by startups headquartered in each city, 2024** |
| hex-grid | Reported road-traffic incidents in Great Britain over one year. Each hexagon aggregates the incidents that fall inside it; darker cells mark denser hotspots. | **Reported road-traffic incidents in Great Britain over one year. Each hexagon aggregates the incidents that fall inside it; darker cells mark denser hotspots.** |
| cartogram | Share of electricity generated from renewable sources (wind, solar, hydro, biomass) across European countries in 2023. Each tile represents one country. | **Share of electricity generated from renewable sources (wind, solar, hydro, biomass) across European countries in 2023. Each tile represents one country.** |
| dot-density | Estimated population by country, 2023. Each dot represents a fixed number of people, so denser clusters mark the most populous nations. | **Estimated population by country, 2023. Each dot represents a fixed number of people, so denser clusters mark the most populous nations.** |
| locator | Five Seine-side sites that anchored the first Olympic opening staged outside a stadium, 26 July 2024. | **Five Seine-side sites that anchored the first Olympic opening staged outside a stadium, 26 July 2024.** |

`web-before-hex-grid-closes-on-its-description.png` shows one of them on the page.

**And on the video, the same beat said nothing at all.** Every `*Story.tsx` gates its
`<CaptionCard>` on `beat?.copy`, so an empty takeaway renders no card:
`video-before-locator-closes-on-nothing.png` is the last frame of `LocatorStory` — the map, the
header, and no closing line.

One cause for both: each deriver set the takeaway beat's `copy` to `closingInsight(insight, title)`,
which is `""` when there is no distinct editorial line. The web then fell through
`mapStoryToChapters`'s generic `hasCopy ? b.copy : desc`; the video fell through to nothing.

## 2 — the rule chosen, per type, and why each is honest

One home: `closingCaption(insight, title, derived)` in `skills/map-native/src/map-story.ts`, beside
`closingInsight`, called by all six derivers — the journalist's line when it is genuinely one, the
type's own derived closer otherwise. The derived closers live next to it, and there are **four of
them for six types**, because they are keyed to the SHAPE OF THE DATA, not to the map type:

| shape | closer | types |
|---|---|---|
| named subjects, one number each | `deriveTakeawayCopy` (already existed, for choropleth) | choropleth · **symbol** · **cartogram** |
| anonymous bins over a grid | `deriveBinTakeawayCopy` | **hex-grid** |
| one dot stands for N of something | `deriveDotTakeawayCopy` | **dot-density** |
| plotted places, no numbers at all | `derivePlacesTakeawayCopy` | **locator** |

(route keeps `routeSpan` in `route-story.ts`: its facts are a trajectory's, and its step list is not
a beat list.)

**symbol** — leader, tail, fold gap. A proportional-symbol map is a choropleth's data in circles:
named subjects with one number each. It gets the same sentence, not a sixth variant. The pair is
read off **every point**, not off the capped reveal walk, because the map DRAWS every circle — a
close that called the fifth-largest "the tail" would describe the tour, not the map. **No total**:
the values a symbol map encodes are not always additive (this engine ships an earthquake-magnitude
sample), and a sum of magnitudes is a number nothing in the data supports.

**cartogram** — the same sentence, for the same reason: named cells, one value each, all of them
drawn.

**hex-grid** — the peak, against the number of bins. Bins are anonymous, so there is no name to
close on; and there is no total either that is true across all three aggregates (`sum` and `count`
add up, `mean` does not), so none is stated. The peak's value goes through the deriver's own `fmt`,
so the close speaks the aggregate's own words ("18 points", "12 kWh avg").

**dot-density** — what one dot is worth, and what the whole scatter adds up to. Both halves come
from the **drawn** dots (`dotValue × totalDots`), which is exactly what a reveal caption already
multiplies per region — so the close and the walk agree, and the number is one the reader can count
rather than one only the source file knows.

**locator** — how many places, and how far apart the two furthest of them are. A locator marker
carries no number at all (`chapters.ts` has a whole branch for that), so every quantitative sentence
the other types write would be invented here. The span is the widest real **pair**, not the bounding
box's diagonal — the diagonal is always ≥ the pair, so it would state a distance no two plotted
places actually are apart.

**The deliberate silences.** A type with nothing honest to say returns `""`, and `closingCaption`
returns `""` with it — the scrolly then falls back to the description and the video shows no card,
which is what a caption-less takeaway has always got. Three cases, each with its reason in the code:
one symbol point (no spread), one hex bin (a peak needs something to be a peak *of*), one plotted
place (no count worth stating, no span). And a locator span under one kilometre is **dropped** rather
than rounded — "0 km end to end" would say the opposite of the truth.

## 3 — what the last card says now

| type | closing card, verbatim from the render |
|---|---|
| symbol | `London: 296$bn, Amsterdam: 52$bn — a 6-fold gap` |
| hex-grid | `18 points in the densest hexagon, 62 hexagons in all` |
| cartogram | `Norway: 98, Czech Rep.: 15 — a 7-fold gap` |
| dot-density | `one dot = 100k, 442.6M in all` |
| locator | `5 sites, 6 km end to end` |

`web-after-*.png` — one page per type, each scrolled to its last card.

**The video path, from the same beat.** `video-after-locator.png` and `video-after-hex-grid.png` are
the last frames of `LocatorStory` and `HexGridStory`: the same sentences, on the caption card that
was empty before. Both paths are fixed by one change because both read the same `beat.copy` — the
derivers compose it, `mapStoryToChapters` ships it verbatim, and `*Story.tsx` renders it.

**Localized**, through `lib/core/story-copy` like every other generated word — four languages, and
the numbers through `formatLocaleNumber`:

- `web-after-locator-fr.png` — **`5 sites, 6 km d'un bout à l'autre`**
- `web-after-hex-grid-fr.png` — **`18 points dans l'hexagone le plus dense, 62 hexagones au total`**
  (the elided article is why the bin noun rides in the locale row rather than being concatenated by
  the caller: "the densest hexagon" but "l'hexagone le plus dense", "in der dichtesten Zelle",
  "nell'esagono più denso")

## 4 — three neighbouring defects, measured here, genuinely not this one

All three were read off the **same renders** as the table in §1, so they are measurements, not
suspicions. None is the closing card: each lives in a different mechanism.

**(a) "the lowest" is asserted over a walk that was cut short.** From the symbol page, verbatim:

    London — 296$bn, the highest of the 6 shown
    …
    Rome — 67$bn, the lowest        ← Amsterdam, 52$bn, is on the same map

Same on hex-grid (`#5 hexagon — 15 points, the lowest`, of 62) and cartogram (`Denmark — 64, the
lowest`, of 18). The mechanism is `chapters.ts`'s `i === minBeat` — the LAST reveal gets `copy.lowest`
whatever the walk covered. It is honest for choropleth, whose `magnitudeRevealRows` deliberately
appends the true tail with `rankRole: "tail"`; it is false for the four types whose walk is a plain
top-N. This is a REVEAL descriptor read off a beat's position, not a missing takeaway — the same
class as the `pattern: "categorical"` fix the locator already carries, and its fix is a rule about
when position may stand in for rank.

**(b) dot-density's walk is ranked by DENSITY and captioned as if by VALUE.** Verbatim, in order:

    Netherlands — 18M, the highest of the 14 shown
    Belgium — 12M
    United Kingdom — 67M
    Germany — 84M

The order is correct (dots per area) and the descriptor is a lie about the number printed beside it.
Same file, same `chapters.ts` branch as (a), and it needs the deriver to declare what its walk ranked
— a `Beat.pattern` decision, not a caption edit.

**(c) `POINTS PER HEXAGON` ships in English on a French page.** Visible bottom-right in
`web-after-hex-grid-fr.png`. That is `layout.aggregateLabel`, composed in `hex-grid-geo.ts` from the
config, not furniture from the locale table — a legend/geo-layer i18n leak, not a caption one.

## Regenerate

    # the page (per type)
    cd skills/scrolly && bun scripts/produce.mjs <config>.json <outDir>
    # then open <outDir>/scrolly.html and scroll to the last .step

    # the video's closing frame (per type)
    cd skills/map-native && bunx remotion still remotion/src/index.ts <Comp> out.png \
      --frame=-1 --gl=angle --props=<{"config": …}>

Neither is wired into `bun run check` — both are live MapTiler-backed builds. The behaviour itself is
covered without a network by `skills/map-native/tests/map-closers.test.ts`.
