// twin/shared/map-beat/tints.mjs
//
// THE TWO COLOURS A BASEMAP IS ALLOWED, AND WHY THEY ARE MEASURED RATHER THAN CHOSEN.
//
// A fixed dose cannot work across three grounds. At 0.14 of the filed water hue, `nocturne` rendered
// sea and land at 1.014:1 — the same colour. A dark blue mixed into a navy ground produces no
// separation at all. The original escaped this by accident: its sea took the ACCENT, and nocturne's
// accent is a pale mint, which lightens.
//
// So the rule targets a MEASURED gap and takes the smallest dose that reaches it: the basemap stays
// as quiet as it can while a coastline still reads.

import { mix, contrast, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";

/** Below this, a coastline stops reading as a coastline. Measured on the six converted types. */
export const SEA_LAND_MIN = 1.22;
/** Above this, the basemap has more weight against the page than the marks it carries — which is
 *  what `the-basemap-gives-up-its-contrast` forbids. */
export const BASEMAP_MAX = 1.6;

/** THE FILED WATER CONVENTION, AND WHY IT IS A CONSTANT HERE RATHER THAN AN IMPORT.
 *
 *  It is `palette`'s `water` convention — the blue a reader already holds, the semantic-resonance
 *  study's own opening example — and the authority for it is
 *  `skills/palette/scripts/palette.mjs`'s `SUBJECT_CONVENTIONS`. The trunk cannot IMPORT that:
 *  `shared/` is vendored on its own into a newsroom's root, with no `skills/` beside it, so a climb
 *  out of `shared/` resolves in this checkout and fails in the install — a break that only appears
 *  where nobody is watching. So the value is duplicated across the copy boundary, the way this
 *  repository duplicates every helper that crosses one, and `the-trunk-stands-alone.test.ts` holds
 *  the two in step. */
export const WATER_HUE = "#1F6FB2";

export function plateTints(direction) {
  const { ink } = deriveFurniture(direction.ground);
  const land = mix(direction.ground, ink, 0.045);
  const hue = WATER_HUE;

  for (let dose = 0.06; dose <= 0.7; dose += 0.02) {
    const water = mix(direction.ground, hue, dose);
    if (contrast(water, land) < SEA_LAND_MIN) continue;
    if (contrast(water, direction.ground) >= BASEMAP_MAX) break;
    return { water, land, seaLandContrast: contrast(water, land) };
  }

  throw new Error(
    `no dose of the filed water hue separates sea from land by ${SEA_LAND_MIN}:1 on ground ` +
      `${direction.ground} while staying under ${BASEMAP_MAX}:1 against it — this direction and ` +
      `this hue are too close for a basemap, and the beat must be told rather than shown a flat map`,
  );
}

/** THE FLOOR A FRONTIER MUST CLEAR AGAINST THE LAND IT DIVIDES, and the ceiling it may not pass.
 *
 *  A frontier is not a datum: it is the ground telling a reader which country they are looking at.
 *  Below the floor it is not a frontier, it is a smudge; above the ceiling it competes with the
 *  marks, which is `the-basemap-gives-up-its-contrast` read one level down. Both are measured and
 *  reported by `basemapGeography`, so a beat can put its own marks' contrast beside them and show
 *  that the subject still dominates its context. */
export const BORDER_MIN = 1.7;
export const BORDER_MAX = 3.0;

/** The registers the basemap's own words are allowed, smallest first. A name on the ground is
 *  FURNITURE: it never reaches the size a beat gives its own labels, and a beat that hands a bigger
 *  number here has stopped treating the map as context. */
const NAME_SIZES = {
  country: ["interpolate", ["linear"], ["zoom"], 2, 10, 4, 11.5, 6, 13],
  city: ["interpolate", ["linear"], ["zoom"], 5, 9.5, 8, 11],
  water: ["interpolate", ["linear"], ["zoom"], 2, 9.5, 5, 10.5],
};

/** FRENCH FIRST, THEN WHATEVER THE TILE HAS. MapTiler's own label layers read `{name:en}`, so a
 *  French page left alone prints "Germany" beside a sentence that says "l'Allemagne". */
const FRENCH_NAME = ["coalesce", ["get", "name:fr"], ["get", "name:en"], ["get", "name"]];

const jsonRe = (re) => ({ source: re.source, flags: re.flags });

/** The quietest ink, walked up from the land, that a reader can read this word on EVERY ground the
 *  page actually paints behind it — land, water, and the halo that rings the glyph. Measuring a map
 *  label against the page's own ground is the mistake this repository has paid for twice: the page
 *  ground is not what is behind a word printed on a basemap. */
function nameInk(land, ink, backdrops, min) {
  for (let dose = 0.5; dose <= 1.0001; dose += 0.02) {
    const candidate = mix(land, ink, Math.min(dose, 1));
    if (backdrops.every((b) => contrast(candidate, b) >= min)) return candidate;
  }
  return null;
}

/**
 * WHEN A BEAT'S OWN MARKS DO NOT CARRY THE COUNTRIES, THE BASEMAP MUST.
 *
 * A choropleth fills all forty countries: its marks ARE the geography, and sweeping the provider's
 * borders and names away leaves nothing missing. A fan of bands and a scatter of circles carry no
 * countries at all, and the same sweep leaves a pale blob a reader cannot locate anything on — the
 * owner's verdict on two shipped beats, read side by side: « la carte derrière ne donne aucune
 * notion des pays et peu détaillé ».
 *
 * So this derives, from ONE direction, the geography such a beat keeps and the ink it keeps it in:
 * national frontiers, country names, city names once a reader has zoomed in far enough to want
 * them, and the names of the seas. Every colour is measured — against the LAND and the WATER the
 * basemap paints, never against the page behind them — and every one is deliberately quieter than a
 * mark: the frontier is capped below `BORDER_MAX`, and no name is ever given a size a beat gives
 * its own labels.
 *
 * Returns the two keep-lists in JSON form (a plan is a file and `JSON.stringify` flattens a RegExp
 * to `{}`), the ink rules `applyBasemapInk` applies, and what was measured, so the beat can print it.
 */
export function basemapGeography({ ground, land, water, ink, font, textMin = TEXT_CONTRAST_MIN }) {
  const overLand = [land, ground];
  const overWater = [water, ground];
  const country = nameInk(land, ink, [...overLand, water], textMin);
  const city = nameInk(land, ink, overLand, textMin);
  const sea = nameInk(water, ink, overWater, textMin);
  if (!country || !city || !sea)
    throw new Error(
      `no ink between this direction's land ${land} and its own furniture ink ${ink} reads at ` +
        `${textMin}:1 on land, on water ${water} and on the halo ${ground} at once — the basemap's ` +
        `own names would be unreadable somewhere on the map, and a name a reader cannot read is worse ` +
        `than no name`,
    );

  let border = null;
  for (let dose = 0.1; dose <= 1.0001; dose += 0.02) {
    const candidate = mix(land, ink, Math.min(dose, 1));
    if (contrast(candidate, land) < BORDER_MIN) continue;
    if (contrast(candidate, land) > BORDER_MAX) break;
    border = candidate;
    break;
  }
  if (!border)
    throw new Error(
      `no dose of this direction's ink separates a frontier from its land ${land} by ${BORDER_MIN}:1 ` +
        `without passing ${BORDER_MAX}:1 — the ground would either show no countries or out-shout the marks on it`,
    );

  /** WHAT IS KEPT, AND WHAT IS STILL SWEPT AWAY. National frontiers only: `Other border` carries
   *  admin levels 3 to 10, which at a continental framing is a mesh of départements over a beat
   *  about countries. Place, town, village and state names go the same way — a reader locating a
   *  band's destination needs the country, and the city once they have zoomed to it. */
  const keepTextures = [jsonRe(/country border|disputed border/i)];
  const keepLabels = [jsonRe(/country labels|city labels|ocean labels|sea labels/i)];

  const words = (size, colour) => ({
    layout: {
      "text-field": FRENCH_NAME,
      "text-font": font,
      "text-size": size,
      "text-letter-spacing": 0.02,
      "text-max-width": 8,
      "text-padding": 2,
    },
    paint: {
      "text-color": colour,
      /** THE HALO IS THE PAGE'S GROUND AND NOT THE LAND, and that is what makes one word readable on
       *  both. Land and water sit within `BASEMAP_MAX` of each other by construction, so a halo in
       *  either would vanish over the other; the ground is the one colour that rings the glyph the
       *  same way over a coast. */
      "text-halo-color": ground,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.2,
      "text-opacity": 1,
    },
  });

  return {
    keepLabels,
    keepTextures,
    ink: [
      {
        match: jsonRe(/country border|disputed border/i),
        paint: {
          "line-color": border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 4, 0.9, 7, 1.4],
          "line-opacity": 1,
        },
      },
      { match: jsonRe(/country labels/i), ...words(NAME_SIZES.country, country) },
      { match: jsonRe(/city labels/i), ...words(NAME_SIZES.city, city) },
      { match: jsonRe(/ocean labels|sea labels/i), ...words(NAME_SIZES.water, sea) },
    ],
    measured: {
      border,
      country,
      city,
      sea,
      borderOnLand: contrast(border, land),
      countryOnLand: contrast(country, land),
      countryOnWater: contrast(country, water),
      countryOnHalo: contrast(country, ground),
      seaOnWater: contrast(sea, water),
    },
  };
}
