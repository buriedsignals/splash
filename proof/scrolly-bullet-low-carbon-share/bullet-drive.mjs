// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   marker   the thick pale 2015 bars extending from zero                               0..1
//   measure  the thin saturated 2024 bars extending on from where 2015 ends              0..1
//   reorder  the rows gliding from their 2015 order to the order of their gain           0..1
//   verdict  every row's change in points, counted, and the two state names on the first row 0..1
//   zoom     the axis closing from 0–100 % onto the top of the scale                      0..1
//
// THE ZOOM IS A DOMAIN, NOT A STRETCH. Every length is recomputed as (value − lo) / (100 − lo) of the
// track, lo travelling from 0 to the zoom's start, so a bar is never scaled and a value under the new
// floor has no length at all; its row steps back. One tick set is shown at a time.
//
// THE REORDER IS MEASURED: the row pitch is read on every resize, and each row's name, track and verdict
// travel together from their position in the 2015 order to their place in the sorted one.

export function applyBulletState(root, state, context) {
  const carrier = root.querySelector("[data-bullet]");
  if (!carrier) return;
  if (context.resized || !root.__bullet) seatBullet(root, carrier);
  const c = root.__bullet;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lo = c.zoomFrom * state.zoom;
  const span = c.ceiling - lo;
  const length = (v) => `${(clamp((v - lo) / span) * 100).toFixed(3)}%`;

  c.rows.forEach((row, i) => {
    const markerNow = row.marker * state.marker;
    const measureNow = state.measure > 0 ? row.marker + (row.measure - row.marker) * state.measure : 0;
    c.markers[i].style.width = length(markerNow);
    c.markers[i].style.transform = "translateY(-50%)";
    c.measures[i].style.width = length(measureNow);
    c.measures[i].style.transform = "translateY(-50%)";
    c.measures[i].style.opacity = state.measure > 0 ? "1" : "0";

    // AN INSERTION, ONE ROW AT A TIME. The 2015 order and the order of gain are nearly each other's
    // reverse: moved together, or merely staggered, several rows crossed each other at once in the middle
    // of the plot. Here the reorder is a sequence of orders — the first k rows of the gain order lifted
    // out, the rest still in their 2015 order below — and the scroll travels from one to the next, so a
    // single row climbs while the rows it passes step down one slot together.
    const slot = c.slotAt(i, state.reorder);
    const offset = (slot - i) * c.pitch;
    const dim = 1 - 0.7 * state.zoom * (row.measure < c.zoomFrom ? 1 : 0);
    for (const node of c.byRow[i]) {
      node.style.transform = `translateY(${offset}px)`;
      node.style.opacity = String(dim);
    }
    const verdict = c.verdicts[i];
    const amount = Number(verdict.dataset.amount);
    const text = `+${(amount * clamp(state.verdict * 2)).toFixed(1).replace(".", ",")} pts`;
    if (verdict.textContent !== text) verdict.textContent = text;
    verdict.style.opacity = String(state.verdict * dim);
  });

  // The state names belong to the first row's own marks, so they arrive once the rows have settled on it
  // and leave while the axis is narrowed.
  c.key.style.opacity = String(clamp(state.reorder * 2 - 1) * (1 - state.zoom));

  for (const tick of c.ticks) {
    const value = Number(tick.dataset.tick);
    const shown = (tick.dataset.set === "zoom") === state.zoom >= 0.5;
    tick.style.left = length(value);
    const edge = value === c.ceiling ? "translateX(-100%)" : value === 0 || value === c.zoomFrom ? "none" : "translateX(-50%)";
    tick.style.transform = edge;
    tick.style.opacity = shown && value >= lo ? "1" : "0";
  }
}

function seatBullet(root, carrier) {
  seatBulletKey(root);
  const data = JSON.parse(carrier.getAttribute("data-bullet"));
  const byRow = data.rows.map((_, i) => Array.from(root.querySelectorAll(`[data-row="${i}"]`)));
  const tracks = data.rows.map((_, i) => root.querySelector(`div[data-row="${i}"]`));
  // `offsetTop`, not the bounding box: a re-seat happens while the rows are already translated by the
  // reorder, and a transformed box measured a pitch six times too large.
  const pitch = tracks.length > 1 ? tracks[1].offsetTop - tracks[0].offsetTop : 0;
  const n = data.rows.length;
  // orders[k][i] = the slot row i holds once the first k rows of the gain order have been lifted out.
  const orders = [];
  for (let k = 0; k <= n; k++) {
    const rest = data.orderBefore
      .map((before, i) => ({ i, before }))
      .filter((r) => r.i >= k)
      .sort((a, b) => a.before - b.before)
      .map((r) => r.i);
    const order = [...Array.from({ length: k }, (_, i) => i), ...rest];
    const slots = new Array(n);
    order.forEach((row, at) => (slots[row] = at));
    orders.push(slots);
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const slotAt = (i, reorder) => {
    const x = Math.min(Math.max(reorder, 0), 1) * n;
    const k = Math.min(Math.floor(x), n - 1);
    return orders[k][i] + (orders[k + 1][i] - orders[k][i]) * ease(x - k);
  };
  root.__bullet = {
    ...data,
    slotAt,
    byRow,
    pitch,
    markers: tracks.map((t) => t.querySelector('[data-part="marker"]')),
    measures: tracks.map((t) => t.querySelector('[data-part="measure"]')),
    verdicts: data.rows.map((_, i) => root.querySelector(`[data-part="verdict"][data-row="${i}"]`)),
    key: root.querySelector('[data-part="key"]'),
    ticks: Array.from(root.querySelectorAll("[data-tick]")),
  };
}

/** The two state names, seated in the reader's own pixels: the 2015 name ends where its bar ends, or
 *  starts at the track when it would run past it; the 2024 name takes a line of its own above when it
 *  would touch the 2015 name — on a phone the two marks are thirty pixels apart. */
function seatBulletKey(root) {
  const key = root.querySelector('[data-part="key"]');
  const marker = root.querySelector('[data-part="marker-label"]');
  const measure = root.querySelector('[data-part="measure-label"]');
  if (!key || !marker || !measure) return;
  const lineHeight = marker.offsetHeight;
  if (marker.dataset.right === undefined) marker.dataset.right = marker.style.right;
  marker.style.left = "";
  marker.style.right = marker.dataset.right;
  marker.style.bottom = "0px";
  measure.style.bottom = "0px";
  key.style.height = `${lineHeight}px`;
  const track = key.getBoundingClientRect();
  let m = marker.getBoundingClientRect();
  if (m.left < track.left) {
    marker.style.right = "auto";
    marker.style.left = "0px";
    m = marker.getBoundingClientRect();
  }
  if (measure.getBoundingClientRect().left < m.right + 8) {
    key.style.height = `${lineHeight * 2}px`;
    measure.style.bottom = `${lineHeight}px`;
  }
}
