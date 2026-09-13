// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER
// `reveal.mjs`, whose `fitViewBox` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   arrive   the stations other than the subject's arriving fuel by fuel, counted                    0..1
//   subject  the subject's sites arriving, ringed                                                    0..1
//   fade     every other station stepping back                                                       0..1
//   weight   every dot going from one size (a station) to the area of its capacity                   0..1
//   zoom     the camera travelling from the box the stations fill onto the country with most of the
//            subject's sites                                                                          0..1
//
// ONE CANVAS, redrawn on every paint in the reader's pixels: the land as one path, then the dots, largest
// first so a small station is never buried under a large one. The camera is a view box fitted to the stage
// (`fitViewBox`); dot sizes are in pixels, grown gently with the zoom.

export function applyDotState(root, state, context) {
  const carrier = root.querySelector("[data-dots]");
  if (!carrier) return;
  if (!root.__dots) seatDots(root, carrier);
  const c = root.__dots;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.canvas.width !== Math.round(SW * dpr) || c.canvas.height !== Math.round(SH * dpr)) {
    c.canvas.width = Math.round(SW * dpr);
    c.canvas.height = Math.round(SH * dpr);
  }

  const z = ease(clamp(state.zoom));
  const box = {
    x: lerp(c.europeBox.x, c.zoomBox.x, z),
    y: lerp(c.europeBox.y, c.zoomBox.y, z),
    w: lerp(c.europeBox.w, c.zoomBox.w, z),
    h: lerp(c.europeBox.h, c.zoomBox.h, z),
  };
  const vb = fitViewBox(box, { width: SW, height: SH }, { top: 0, right: 0, bottom: 0, left: 0 });
  const ppu = SW / vb.w;
  const ctx = c.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = c.colours.water;
  ctx.fillRect(0, 0, c.canvas.width, c.canvas.height);
  ctx.setTransform(ppu * dpr, 0, 0, ppu * dpr, -vb.x * ppu * dpr, -vb.y * ppu * dpr);
  ctx.fillStyle = c.colours.land;
  ctx.fill(c.land, "evenodd");
  ctx.strokeStyle = c.colours.coast;
  ctx.lineWidth = 0.6 / ppu;
  ctx.stroke(c.land);

  // Sizes in pixels. A station is a dot a reader can count; at full weight the largest site takes the radius
  // the stage allows, and every other the radius its capacity's area gives it.
  const fitPpu = SW / fitViewBox(c.europeBox, { width: SW, height: SH }, { top: 0, right: 0, bottom: 0, left: 0 }).w;
  const grow = Math.sqrt(ppu / fitPpu);
  const rCount = Math.max(1.1, Math.min(2.2, SW / 650)) * grow;
  const rMax = Math.max(9, Math.min(26, SW / 48)) * grow;
  const w = ease(clamp(state.weight));
  const arrive = clamp(state.arrive);
  const subjectOn = clamp(state.subject);
  const fade = clamp(state.fade);
  const fuels = c.arrival.length;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toX = (x) => (x - vb.x) * ppu;
  const toY = (y) => (y - vb.y) * ppu;
  let counted = 0;
  const rings = [];
  for (const d of c.order) {
    const [x, y, fuel, mw, rank] = d;
    const isSubject = fuel === c.subjectFuel;
    let shown;
    if (isSubject) shown = subjectOn;
    else {
      const slot = c.arrivalSlot[fuel];
      // Within its fuel a station arrives at its own moment, so a fuel sprinkles in rather than wiping across.
      shown = clamp((arrive * fuels - slot) * 1.4 - (rank % 97) / 97 * 0.4);
    }
    if (shown <= 0.01) continue;
    if (!isSubject && shown > 0.5) counted++;
    const px = toX(x);
    const py = toY(y);
    const r = lerp(rCount, Math.max(0.6 * grow, rMax * Math.sqrt(mw / c.maxMw)), w);
    if (px < -r - 4 || py < -r - 4 || px > SW + r + 4 || py > SH + r + 4) continue;
    const alpha = shown * (isSubject ? 1 : 1 - 0.75 * fade) * lerp(0.9, 0.55, w);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = isSubject ? c.colours.subject : c.colours.dot;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (isSubject) rings.push([px, py, r, shown]);
  }
  // The subject's rings over everything, so none of its sites is lost under a neighbour.
  ctx.strokeStyle = c.colours.subject;
  ctx.lineWidth = 1.2;
  for (const [px, py, r, shown] of rings) {
    ctx.globalAlpha = shown;
    ctx.beginPath();
    ctx.arc(px, py, r + 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const countText = c.count.dataset.template.replace("{n}", c.format(counted));
  if (c.count.textContent !== countText) c.count.textContent = countText;
  c.count.style.opacity = String(clamp(arrive * 4) * (1 - subjectOn));
  c.subjectNote.style.opacity = String(subjectOn * (1 - w));
  c.weightNote.style.opacity = String(w * (1 - z));
  c.zoomNote.style.opacity = String(z);
  c.keyCount.style.opacity = String(1 - w);
  c.keyWeight.style.opacity = String(w);
  for (const swatch of c.sizeSwatches) {
    const d = 2 * rMax * Math.sqrt(Number(swatch.dataset.mw) / c.maxMw) / grow;
    swatch.style.width = `${d}px`;
    swatch.style.height = `${d}px`;
  }
}

function seatDots(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-dots"));
  const stage = root.querySelector('[data-part="stage"]');
  const canvas = stage.querySelector("canvas");
  const arrivalSlot = {};
  data.arrival.forEach((fuel, i) => {
    arrivalSlot[fuel] = i;
  });
  // Largest first, so small stations draw on top.
  const order = data.stations.map((s, i) => [...s, i]).sort((a, b) => b[3] - a[3]);
  root.__dots = {
    ...data,
    stage,
    canvas,
    ctx: canvas.getContext("2d"),
    land: new Path2D(data.land),
    order,
    arrivalSlot,
    maxMw: Math.max(...data.stations.map((s) => s[3])),
    format: (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    count: root.querySelector('[data-part="count"]'),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    weightNote: root.querySelector('[data-part="weight-note"]'),
    zoomNote: root.querySelector('[data-part="zoom-note"]'),
    keyCount: root.querySelector('[data-part="key-count"]'),
    keyWeight: root.querySelector('[data-part="key-weight"]'),
    sizeSwatches: Array.from(root.querySelectorAll("[data-mw]")),
  };
}
