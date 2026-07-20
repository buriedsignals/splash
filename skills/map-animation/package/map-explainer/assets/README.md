# map-explainer assets

The runnable example. Copy into a Remotion project and adapt.

## Files

| File | What | Goes to (in your project) |
| --- | --- | --- |
| `RiverReveal.tsx` | Main component (river reveal + electric head + sequenced country animate-ins). | `src/components/` |
| `CountryLabel.tsx` | Reusable Space Grotesk label. | `src/components/` |
| `tokens.ts` | Palette + durations the components import (`import … from "../theme/tokens"`). | `src/theme/` |
| `example-Root.tsx` | Minimal `<Composition>` scaffold (duration = the beat). | `src/Root.tsx` |
| `sample-data/yarlung-flow.json` | Pre-generated river line → run the component without prep. | `src/geo/` |
| `sample-data/country-meta.json` | Pre-generated per-country `{stop, anchor, border}`. | `src/geo/` |
| `preview.png` | A still from the proven render. | — |
| `../scripts/prep-geo.mjs` | Geo pipeline → river line, `country-meta.json`, `borders.geojson`. | (build tool) |

## Project layout (the pieces must line up)

```
your-remotion-project/
  src/
    index.ts                       # registerRoot(RemotionRoot)
    Root.tsx                       # from example-Root.tsx
    components/RiverReveal.tsx      # imports ../geo/yarlung-flow.json, ../geo/country-meta.json, ../theme/tokens
    components/CountryLabel.tsx
    theme/tokens.ts
    geo/yarlung-flow.json           # the river line  (rename prep output, or change the import name)
    geo/country-meta.json
  public/
    geo/borders.geojson             # loaded via staticFile("geo/borders.geojson") — MUST live under public/
  .env                              # REMOTION_MAPTILER_KEY=...
```

`RiverReveal.tsx` imports the river + meta from `../geo/…` and loads `borders.geojson` from `public/geo/`
via `staticFile`. `prep-geo.mjs` writes to `out/` — copy those into `src/geo/` and `public/geo/`
accordingly (the component's import filenames are `yarlung-flow.json` / `country-meta.json`; either match
them or edit the imports).

## The country-key contract (get this right or a country silently renders nothing)

The lowercase country keys must be **identical** in all four places:

1. `prep-geo.mjs` → `COUNTRIES` (and so the `country` property baked into `borders.geojson` + `country-meta.json`)
2. `RiverReveal.tsx` → `ORDER`
3. `tokens.ts` → `COUNTRY` and `COUNTRY_DARK` (one light + one dark hex per country)

The label text is `country.toUpperCase()`. So for the Nile: `["ethiopia","sudan","egypt"]` everywhere.

## Generic vs project-specific

**Generic:** the choreography (river reveal, electric head, border→fill→label sequence), `CountryLabel.tsx`,
the geo algorithms (entry stops, pole of inaccessibility, single-segment border), the overlay-labels-via-
`map.project` pattern.

**Change for a new river + countries:**

| In | Change |
| --- | --- |
| `prep-geo.mjs` | `COUNTRIES`, `RIVER`/`BORDER` input paths, `FRAME_BBOX`, `ANCHOR_BBOX`, `NUDGE` (all `[W,S,E,N]` / `[lng,lat]`). |
| `RiverReveal.tsx` | `ORDER`, the `START`/`END` camera (frame your geography), the timing window + sequence durations. |
| `tokens.ts` | `COUNTRY` / `COUNTRY_DARK` keys + hex (each dark = a manually darkened fill); `COLORS.river`. NB the river *glow* colour is hardcoded in `RiverReveal.tsx` (`#49C6FF`), not read from `COLORS.riverGlow`. |
| env | `REMOTION_MAPTILER_KEY` — unrestricted MapTiler key. |

## Run

```bash
# 1. bake the geo (needs YOUR river + country GeoJSONs — see prep-geo.mjs CONFIG; outputs to out/)
node ../scripts/prep-geo.mjs

# 2. from the Remotion project root — render. --gl=angle is MANDATORY (the map is WebGL; without it the
#    headless canvas comes back blank).
npx remotion still   src/index.ts MapExplainer out.png --frame=N --gl=angle --timeout=120000
npx remotion render  src/index.ts MapExplainer out.mp4  --gl=angle --concurrency=1 --timeout=120000
```

Deps: `remotion` (4.0.x), `@maptiler/sdk` (^4), `@turf/turf` (^7), and `@remotion/google-fonts` **version-
matched to your remotion** (`npm i @remotion/google-fonts@<remotion-version>`) for Space Grotesk — swapping
fonts means changing the `@remotion/google-fonts/SpaceGrotesk` import in `CountryLabel.tsx`. The river input
must be a single clean source→mouth LineString — see `../references/geo-prep.md` (routing prerequisite).
