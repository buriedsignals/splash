// shared/map-beat/scrolly.mjs
//
// A SCROLLY MAP IS DRIVEN BY NUMBERS. `renderScrolly` interpolates every numeric field of a state
// linearly between two cards, and that is exactly right for a camera stored in Web Mercator units —
// the plane MapLibre itself moves in — and wrong for one stored in degrees, which would put the
// midpoint between 40°N and 70°N at 55°N instead of where the map's own plane puts it. So a card's
// camera is written as `camX`, `camY` (0..1), `camZoom`, `camBearing`, `camPitch`, and read back here.
//
// Paint is driven the same way: a plan layer's `bindings` are paint values carrying `{"$state": field}`
// tokens, replaced by the field's current number on each frame. The scroll owns time; MapLibre never
// animates anything itself.

const MAX_LAT = 85.0511287798;

export function mercatorOf([lon, lat]) {
  if (!(Math.abs(lat) <= MAX_LAT))
    throw new Error(`latitude ${lat} is beyond the Web Mercator limit of ±85.05° — no camera can centre on it`);
  const x = (lon + 180) / 360;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return [x, y];
}

export function lonLatOf([x, y]) {
  const lon = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return [lon, lat];
}

export function cameraFields({ center, zoom, bearing = 0, pitch = 0 }) {
  const [camX, camY] = mercatorOf(center);
  return { camX, camY, camZoom: zoom, camBearing: bearing, camPitch: pitch };
}

export function viewOf(state) {
  return {
    center: lonLatOf([state.camX, state.camY]),
    zoom: state.camZoom,
    bearing: state.camBearing ?? 0,
    pitch: state.camPitch ?? 0,
  };
}

const isToken = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && typeof v.$state === "string";

export function bindState(value, state) {
  if (isToken(value)) {
    const n = state[value.$state];
    if (typeof n !== "number" || !Number.isFinite(n))
      throw new Error(`a paint binding reads state field "${value.$state}" and the state carries ${JSON.stringify(n)}`);
    return n;
  }
  if (Array.isArray(value)) return value.map((v) => bindState(v, state));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bindState(v, state)]));
  return value;
}

export function stateFieldsIn(value, out = new Set()) {
  if (isToken(value)) out.add(value.$state);
  else if (Array.isArray(value)) for (const v of value) stateFieldsIn(v, out);
  else if (value !== null && typeof value === "object") for (const v of Object.values(value)) stateFieldsIn(v, out);
  return [...out];
}

export function validateScrollyPlan(plan, states) {
  const out = [];
  states.forEach((state, i) => {
    if (![state.camX, state.camY, state.camZoom].every((v) => typeof v === "number" && Number.isFinite(v)))
      out.push(`card ${i + 1} carries no camera (camX, camY, camZoom) — the map would stay where the previous card left it`);
  });
  for (const layer of plan.layers ?? [])
    for (const [property, value] of Object.entries(layer.bindings ?? {}))
      for (const field of stateFieldsIn(value))
        states.forEach((state, i) => {
          if (!(field in state))
            out.push(`layer "${layer.id}": "${property}" reads state field "${field}", which card ${i + 1} does not carry`);
        });
  return out;
}
