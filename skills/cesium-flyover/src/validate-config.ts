// The flyover config contract — what a journalist's run hands this engine, and what the
// Remotion composition is actually given.
//
// STRICT, like dw-chart's validator and for the same reason: a field this engine does not read
// is a field the journalist believes they set. Every knob below is threaded through to
// CesiumFlyover's props; anything else is refused by name rather than dropped in silence.
//
// The two compositions are FIXED in duration (remotion/src/Root.tsx registers them), so there
// is deliberately no `durationSeconds` knob: accepting one and rendering 24 s anyway is exactly
// the un-threaded-field failure this repo keeps paying for. Speed is set by `travelKm` against
// the composition's own clock — 13 km over 24 s is the proven ~0.54 km/s glide.

export type LngLat = [number, number];

export type FlyoverSource = string | { name: string; url?: string };

export interface FlyoverConfig {
  type: "flyover";
  /** "landscape" = MapTiler terrain + satellite (the proven, editorially safe path).
   *  "city" = Google Photorealistic 3D Tiles (needs a billing-enabled Google key; its
   *  licensing is a blocking editorial question, see SKILL.md § Credentials). */
  mode?: "landscape" | "city";
  /** The camera route as sparse, intentional control points. */
  path?: LngLat[];
  /** …or a LineString centerline this producer runs prep-path.mjs over. */
  routeGeoJSON?: string;
  /** Where on that centerline the flight starts (defaults to its first vertex). */
  routeStart?: LngLat;
  title?: string;
  source?: FlyoverSource;
  channel?: string;
  pathSmoothingPasses?: number;
  altitudeStart?: number;
  altitudeEnd?: number;
  lookAheadKm?: number;
  travelKm?: number;
  pitchFromNadir?: number;
  verticalExaggeration?: number;
  /** City mode only — lower refines the mesh at real download cost. */
  maximumScreenSpaceError?: number;
}

/** The registered compositions, mirrored from remotion/src/Root.tsx. Kept here (rather than
 *  parsed out of the .tsx like map-native's readCompDims) because both are plain constants and
 *  the drift is pinned by a test. */
export const FLYOVER_COMPS = {
  landscape: {
    comp: "LandscapeFlyover",
    durationInFrames: 24 * 30,
    width: 1280,
    height: 720,
    fps: 30,
  },
  city: {
    comp: "CityFlyover",
    durationInFrames: 18 * 30,
    width: 1280,
    height: 720,
    fps: 30,
  },
} as const;

/** This engine's single renderable type id, in its own vocabulary. */
export const FLYOVER_TYPE = "flyover";

const NUMERIC_KNOBS = [
  "pathSmoothingPasses",
  "altitudeStart",
  "altitudeEnd",
  "lookAheadKm",
  "travelKm",
  "pitchFromNadir",
  "verticalExaggeration",
  "maximumScreenSpaceError",
] as const;

const KNOWN_KEYS = new Set<string>([
  "type",
  "mode",
  "path",
  "routeGeoJSON",
  "routeStart",
  "title",
  "source",
  "channel",
  ...NUMERIC_KNOBS,
]);

function isLngLat(v: unknown): v is LngLat {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    v[0] >= -180 &&
    v[0] <= 180 &&
    v[1] >= -90 &&
    v[1] <= 90
  );
}

/** Errors only, empty when valid — the registry's `validate` contract. */
export function flyoverConfigErrors(spec: unknown): string[] {
  const errors: string[] = [];
  if (spec == null || typeof spec !== "object" || Array.isArray(spec))
    return [
      'a flyover config is a JSON object: { "type": "flyover", "path": [[lng, lat], …] }.',
    ];
  const c = spec as Record<string, unknown>;

  if (c.type !== FLYOVER_TYPE)
    errors.push(
      `type is "${String(c.type)}" — this engine renders one type, "flyover". Set "type": "flyover", ` +
        "or dispatch the engine that owns the type you meant (map-native for a 2D map).",
    );

  if (c.mode !== undefined && c.mode !== "landscape" && c.mode !== "city")
    errors.push(
      `mode "${String(c.mode)}" does not exist — use "landscape" (MapTiler terrain + satellite, the ` +
        'proven path) or "city" (Google Photorealistic 3D Tiles, which needs a billing-enabled ' +
        "Google key and carries a promotional-only licence: read SKILL.md § Credentials before shipping one).",
    );

  // THE PATH. Refused by name, with both ways of giving one, because "path is required" tells a
  // journalist nothing about where a camera path comes from.
  if (c.path === undefined && c.routeGeoJSON === undefined) {
    errors.push(
      'a flyover needs a camera path and this config gives none. Either set "path" to 5-10 sparse ' +
        'control points along the flight — [[lng, lat], [lng, lat], …] — or set "routeGeoJSON" to a ' +
        "file holding the route/river centerline as a single LineString feature, and this producer " +
        "will run scripts/prep-path.mjs over it (clip → resample → smooth → dampen).",
    );
  } else if (c.path !== undefined && c.routeGeoJSON !== undefined) {
    errors.push(
      'both "path" and "routeGeoJSON" are set — the camera has one route. Keep the control points, ' +
        "or keep the centerline and let prep-path.mjs derive them, not both.",
    );
  } else if (c.path !== undefined) {
    if (!Array.isArray(c.path) || c.path.length < 2)
      errors.push(
        '"path" must hold at least 2 control points — [[lng, lat], [lng, lat], …].',
      );
    else {
      const bad = c.path.findIndex((p) => !isLngLat(p));
      if (bad >= 0)
        errors.push(
          `"path"[${bad}] is not a [longitude, latitude] pair inside real bounds (${JSON.stringify(c.path[bad])}) — ` +
            "GeoJSON order is [lng, lat], not [lat, lng].",
        );
    }
  } else if (
    typeof c.routeGeoJSON !== "string" ||
    c.routeGeoJSON.trim() === ""
  ) {
    errors.push(
      '"routeGeoJSON" must be a path to the centerline file, as a non-empty string.',
    );
  }

  if (c.routeStart !== undefined && !isLngLat(c.routeStart))
    errors.push(
      '"routeStart" must be a [longitude, latitude] pair on the centerline.',
    );
  if (c.routeStart !== undefined && c.routeGeoJSON === undefined)
    errors.push(
      '"routeStart" says where on a centerline the flight begins, but no "routeGeoJSON" was given.',
    );

  if (
    c.title !== undefined &&
    (typeof c.title !== "string" || c.title.trim() === "")
  )
    errors.push(
      '"title" must be a non-empty string when present — drop the field rather than shipping an empty headline.',
    );

  if (c.source !== undefined) {
    const s = c.source;
    const name =
      typeof s === "string"
        ? s
        : s != null && typeof s === "object"
          ? (s as { name?: unknown }).name
          : undefined;
    if (typeof name !== "string" || name.trim() === "")
      errors.push(
        '"source" must name who the terrain/imagery credit belongs to — a string, or { "name": "…", "url": "…" }.',
      );
  }

  for (const knob of NUMERIC_KNOBS) {
    const v = c[knob];
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v)))
      errors.push(
        `"${knob}" must be a finite number (it is one of this engine's tuning knobs — see SKILL.md).`,
      );
  }
  if (typeof c.travelKm === "number" && c.travelKm <= 0)
    errors.push(
      '"travelKm" is how far the camera travels — it must be greater than 0.',
    );
  if (
    typeof c.pitchFromNadir === "number" &&
    (c.pitchFromNadir < 0 || c.pitchFromNadir > 90)
  )
    errors.push(
      '"pitchFromNadir" is between 0 (straight down) and 90 (level with the horizon); 76 is the proven value.',
    );
  if (c.maximumScreenSpaceError !== undefined && c.mode !== "city")
    errors.push(
      '"maximumScreenSpaceError" only does something in "city" mode (it refines the Google 3D mesh). ' +
        'Set "mode": "city", or drop the knob.',
    );

  const unknown = Object.keys(c).filter((k) => !KNOWN_KEYS.has(k));
  if (unknown.length)
    errors.push(
      `unknown field(s) ${unknown.map((k) => `"${k}"`).join(", ")} — this engine reads none of them, so ` +
        "setting one would look like a choice and change nothing. Remove them, or check SKILL.md § Tuning knobs " +
        "for the name you meant.",
    );

  return errors;
}

/** The composition to render, and the props to render it with. Only the fields CesiumFlyover
 *  actually reads are forwarded — `source` becomes its `sourceName`, and a source URL is NOT
 *  drawn in the frame (the producer says so out loud rather than dropping it quietly). */
export function resolveFlyoverProps(config: FlyoverConfig) {
  const mode = config.mode ?? "landscape";
  const registered = FLYOVER_COMPS[mode];
  const sourceName =
    typeof config.source === "string" ? config.source : config.source?.name;
  const props: Record<string, unknown> = { mode, path: config.path };
  for (const knob of NUMERIC_KNOBS) {
    const v = config[knob];
    if (v !== undefined) props[knob] = v;
  }
  if (config.title) props.title = config.title;
  if (sourceName) props.sourceName = sourceName;
  return { ...registered, props };
}
