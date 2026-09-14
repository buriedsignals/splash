// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER
// `reveal.mjs`, whose `fitViewBox` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   level    how many stations stand, as a power of ten, largest first: 0 is the largest alone, 2 the hundred
//            largest; a station arrives as the count passes its rank                                     0..log10(n)
//   largest  the largest station named                                                                  0..1
//   subject  the nuclear sites drawn in the ink, whatever their rank; every other station steps back      0..1
//   zoom     the camera travelling from the box the stations fill onto the country with most nuclear sites 0..1
//   cut      the static plate's cut stated                                                               0..1
//
// ONE CANVAS, redrawn on every paint in the reader's pixels: the land as one path, then the hollow circles, largest
// first. The counter reads the count the reader has scrolled to, and the share of the power those stations carry.

export function applySymbolState(root, state, context) {
  const carrier = root.querySelector("[data-symbols]");
  if (!carrier) return;
  if (!root.__symbols) seatSymbols(root, carrier);
  const c = root.__symbols;
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

  // The whole-map camera: on a narrow stage the map is pinned to the top of the stage, so the east — the largest
  // station — stands above the resting card rather than under it. The close-up centres its subject both ways.
  const z = ease(clamp(state.zoom));
  const none = { top: 0, right: 0, bottom: 0, left: 0 };
  const stageBox = { width: SW, height: SH };
  const vbEurope = fitViewBox(c.europeBox, stageBox, none);
  if (SW < 560) {
    // The largest station a third of the way down at most: the resting card covers the middle of a phone's stage.
    const ppuEurope = SW / vbEurope.w;
    vbEurope.y = Math.max(c.europeBox.y - c.europeBox.h * 0.04, c.stations[0][1] - (0.3 * SH) / ppuEurope);
  }
  const vbZoom = fitViewBox(c.zoomBox, stageBox, none);
  const vb = { x: lerp(vbEurope.x, vbZoom.x, z), y: lerp(vbEurope.y, vbZoom.y, z), w: lerp(vbEurope.w, vbZoom.w, z), h: lerp(vbEurope.h, vbZoom.h, z) };
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

  // Radii in pixels: the largest station takes the radius the stage allows, every other the radius its capacity's
  // area gives it; the close-up grows them gently, so a crowd opens without the key's scale breaking.
  const fitPpu = SW / vbEurope.w;
  const grow = (ppu / fitPpu) ** 0.35;
  const rMax = Math.max(12, Math.min(30, SW / 42));
  const radius = (mw) => Math.max(0.7, rMax * Math.sqrt(mw / c.maxMw)) * grow;

  const n = c.stations.length;
  const shownCount = Math.min(n, 10 ** Math.max(0, state.level));
  const subject = clamp(state.subject);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toX = (x) => (x - vb.x) * ppu;
  const toY = (y) => (y - vb.y) * ppu;
  const rings = [];
  ctx.strokeStyle = c.colours.circle;
  ctx.lineWidth = shownCount > 1000 ? 0.8 : 1.3;
  for (let r = 0; r < n; r++) {
    const [x, y, fuel, mw] = c.stations[r];
    const isSubject = fuel === c.subjectFuel;
    const byRank = clamp(shownCount - r);
    const shown = isSubject ? Math.max(byRank, subject) : byRank;
    if (shown <= 0.01) continue;
    const px = toX(x);
    const py = toY(y);
    const rad = radius(mw);
    if (px < -rad - 4 || py < -rad - 4 || px > SW + rad + 4 || py > SH + rad + 4) continue;
    if (isSubject) {
      rings.push([px, py, rad, shown]);
      continue;
    }
    ctx.globalAlpha = byRank * (1 - 0.8 * subject) * 0.9;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  // The nuclear sites over the field: in the circle's hue among the others, in the ink with a halo when isolated.
  for (const [px, py, rad, shown] of rings) {
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.globalAlpha = shown * subject;
    ctx.strokeStyle = c.colours.land;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.globalAlpha = shown;
    ctx.strokeStyle = mixHex(c.colours.circle, c.colours.subject, subject);
    ctx.lineWidth = lerp(shownCount > 1000 ? 0.8 : 1.3, 1.8, subject);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The largest station named beside its circle.
  const [lx, ly, , lmw] = c.stations[0];
  const lpx = toX(lx);
  const lpy = toY(ly);
  const lr = radius(lmw);
  const label = c.largest;
  const right = lpx + lr + 6 + label.offsetWidth < SW;
  Object.assign(label.style, {
    left: `${right ? lpx + lr + 6 : lpx - lr - 6}px`,
    top: `${lpy}px`,
    transform: right ? "translateY(-50%)" : "translate(-100%, -50%)",
    opacity: String(clamp(state.largest) * (1 - z)),
  });

  // The counter: the stations standing, their share of the sites and of the power.
  const k = Math.max(1, Math.round(shownCount));
  const sites = (k / n) * 100;
  const text = c.counter.dataset.template
    .replace("{n}", c.format(k))
    .replace("centrales", k === 1 ? "centrale" : "centrales")
    .replace("{sites}", c.percent(sites))
    .replace("{mw}", c.percent(c.cumulative[k - 1]));
  if (c.counter.textContent !== text) c.counter.textContent = text;
  const cut = clamp(state.cut);
  showOneNote([[c.counter, (1 - subject) * (1 - cut)], [c.subjectNote, subject], [c.cutNote, cut]]);
  c.cut.style.opacity = String(cut);
  for (const swatch of c.sizeSwatches) {
    const d = 2 * rMax * Math.sqrt(Number(swatch.dataset.mw) / c.maxMw);
    swatch.style.width = `${d}px`;
    swatch.style.height = `${d}px`;
  }
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatSymbols(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-symbols"));
  const stage = root.querySelector('[data-part="stage"]');
  const canvas = stage.querySelector("canvas");
  root.__symbols = {
    ...data,
    stage,
    canvas,
    ctx: canvas.getContext("2d"),
    land: new Path2D(data.land),
    maxMw: data.stations[0][3],
    format: (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"),
    percent: (v) => `${(v < 0.1 ? v.toFixed(2) : v.toFixed(1)).replace(".", ",")}\u00A0%`,
    largest: stage.querySelector('[data-part="largest"]'),
    counter: root.querySelector('[data-part="counter"]'),
    subjectNote: root.querySelector('[data-part="subject-note"]'),
    cutNote: root.querySelector('[data-part="cut-note"]'),
    cut: root.querySelector('[data-part="cut"]'),
    sizeSwatches: Array.from(root.querySelectorAll("[data-mw]")),
  };
}

// The header's notes share one slot: only the strongest shows, at its lead over the next, so two notes never overlap
// while the scroll crossfades between them — each fades out to nothing before the next fades in.
function showOneNote(entries) {
  const ranked = entries.map(([, v]) => v).sort((a, b) => b - a);
  const lead = Math.max(0, Math.min(1, ranked[0] - (ranked[1] ?? 0)));
  let shown = false;
  for (const [node, v] of entries) {
    const top = !shown && v === ranked[0];
    if (top) shown = true;
    node.style.opacity = String(top ? lead : 0);
  }
}
