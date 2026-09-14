// THE LAND, EACH COUNTRY'S OUTLINE AND SEAT, AND ANY PLACE, IN ONE COORDINATE SPACE — computed once in node from the
// frozen shapes.
//
// PROJECTION. Lambert azimuthal equal-area centred on 52°N 10°E — the projection the sibling map beats measure
// in and the one the static plate's window was sized in. A band's width is the quantity and is set by the data;
// the same camera places every station, city and sea the locator names, so a zoom moves them all together.
//
// WINDOW. The static plate's: 25° W – 45° E, 34° N – 72° N. The frame is the window's width and the land's
// height inside it.
//
// LAND is clipped (Sutherland–Hodgman) to a margin past the frame, never clamped: Russia runs on to the Pacific,
// and a ring clamped onto the margin's edges folds into a polygon that covers Western Europe.

const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;

export function laea([lonDeg, latDeg]) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [k * Math.cos(lat) * Math.sin(lon), -k * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon))];
}

/**
 * @param {object} geo  the frozen FeatureCollection
 * @param {{window: {west: number, east: number, south: number, north: number}, width: number}} options
 */
export function locatorGeometry(geo, { window: win, width }) {
  const border = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    border.push(laea([win.west + t * (win.east - win.west), win.north]), laea([win.west + t * (win.east - win.west), win.south]));
    border.push(laea([win.west, win.south + t * (win.north - win.south)]), laea([win.east, win.south + t * (win.north - win.south)]));
  }
  const minX = Math.min(...border.map((p) => p[0]));
  const maxX = Math.max(...border.map((p) => p[0]));
  const inBox = [];
  for (const f of geo.features)
    for (const poly of f.geometry.coordinates)
      for (const ring of poly)
        for (const [lon, lat] of ring) if (lon >= win.west && lon <= win.east && lat >= win.south && lat <= win.north) inBox.push(laea([lon, lat]));
  const minY = Math.min(...inBox.map((p) => p[1]));
  const maxY = Math.max(...inBox.map((p) => p[1]));
  const scale = width / (maxX - minX);
  const height = Math.round((maxY - minY) * scale);
  const toFrame = ([x, y]) => [(x - minX) * scale, (y - minY) * scale];
  const r1 = (v) => Math.round(v * 10) / 10;

  const M = { x: 900, y: 500 };
  const clipRing = (pts) => {
    const cut = (a, b, axis, v) => {
      const t = (v - a[axis]) / (b[axis] - a[axis]);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    const edges = [
      [(p) => p[0] >= -M.x, (a, b) => cut(a, b, 0, -M.x)],
      [(p) => p[0] <= width + M.x, (a, b) => cut(a, b, 0, width + M.x)],
      [(p) => p[1] >= -M.y, (a, b) => cut(a, b, 1, -M.y)],
      [(p) => p[1] <= height + M.y, (a, b) => cut(a, b, 1, height + M.y)],
    ];
    let out = pts;
    for (const [inside, cross] of edges) {
      const input = out;
      out = [];
      for (let i = 0; i < input.length; i++) {
        const cur = input[i];
        const prev = input[(i + input.length - 1) % input.length];
        if (inside(cur)) {
          if (!inside(prev)) out.push(cross(prev, cur));
          out.push(cur);
        } else if (inside(prev)) out.push(cross(prev, cur));
      }
      if (!out.length) break;
    }
    return out;
  };
  const rings = [];
  const countries = {};
  for (const f of geo.features)
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const pts = clipRing(ring.map((p) => toFrame(laea(p))));
        if (pts.length < 3) continue;
        const kept = [pts[0]];
        for (const p of pts.slice(1)) {
          const q = kept[kept.length - 1];
          if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 0.6) kept.push(p);
        }
        if (kept.length < 3) continue;
        const d = `M${kept.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`;
        rings.push(d);
        countries[f.properties.iso] = (countries[f.properties.iso] ?? "") + d;
      }

  /** A country's SEAT is the centre of the part of it inside the frame — the static beat's own correction:
   *  Russia's centroid is in Siberia and Norway's in the sea, and a band ending there ends where the country
   *  is not. Averaged over area, not over vertices, so a ragged coastline does not pull the seat to the sea. */
  const seats = {};
  for (const f of geo.features) {
    let ax = 0;
    let ay = 0;
    let area = 0;
    for (const poly of f.geometry.coordinates) {
      const outer = poly[0].map((p) => toFrame(laea(p)));
      if (!outer.some(([px, py]) => px >= 0 && px <= width && py >= 0 && py <= height)) continue;
      let a = 0;
      let cx = 0;
      let cy = 0;
      for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
        const cross = outer[j][0] * outer[i][1] - outer[i][0] * outer[j][1];
        a += cross;
        cx += (outer[j][0] + outer[i][0]) * cross;
        cy += (outer[j][1] + outer[i][1]) * cross;
      }
      if (Math.abs(a) < 1e-6) continue;
      const w = Math.abs(a) / 2;
      ax += (cx / (3 * a)) * w;
      ay += (cy / (3 * a)) * w;
      area += w;
    }
    if (area > 0) seats[f.properties.iso] = [r1(ax / area), r1(ay / area)];
  }

  return {
    width,
    height,
    margin: M,
    land: rings.join(""),
    countries,
    seats,
    place: ([lon, lat]) => toFrame(laea([lon, lat])).map(r1),
  };
}
