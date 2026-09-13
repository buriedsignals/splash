// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER
// `reveal.mjs`, whose `fitViewBox` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   level    how far inland the sweep has reached, in km; each line appears as the sweep passes it
//   tint     the swept fill's presence                                                            0..1
//   median   the median line drawn, in the accent, and its number; the 100 km line giving way    0..1
//   zoom     the camera travelling from Europe onto the last point to be reached                  0..1
//   summit   the last point's mark and number, once the sweep has passed it                        0..1
//
// THE SWEEP is the field thresholded: a cell of the raster is filled when its distance to the sea is under
// `level`, and the few kilometres just under the front are drawn in the rim's colour, so the reader sees an
// edge advancing rather than a colour spreading. The raster arrives gzipped; until it is decoded the
// page paints everything else, then repaints once.
//
// THE NUMBERS are seated on every paint, in the reader's pixels: for each drawn line, the seats where the
// label's own box is clear of every OTHER DRAWN line (so a number is never laid across the next line), the median first, then from the innermost line out; among the allowed seats, the one
// farthest from every number already placed.

const FOCUS_HEIGHT = 0.3;
const YIELD_KM = 50;

export function applyContourState(root, state, context) {
  const carrier = root.querySelector("[data-contour]");
  if (!carrier) return;
  if (!root.__contour) seat(root, carrier);
  const c = root.__contour;
  c.last = state;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const z = ease(clamp(state.zoom));
  const box = {
    x: c.zoomBox.x * z,
    y: c.zoomBox.y * z,
    w: c.width + (c.zoomBox.w - c.width) * z,
    h: c.height + (c.zoomBox.h - c.height) * z,
  };
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  const vb = fitViewBox(box, { width: SW, height: SH }, { top: 0, right: 0, bottom: 0, left: 0 });
  // In the close-up the summit is centred across and held in the upper part of the stage: the card comes to
  // rest on the middle, and the mark it would cover is the point of the card.
  vb.y += z * (c.summit[1] - (vb.y + FOCUS_HEIGHT * vb.h));
  c.field.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.field.setAttribute("preserveAspectRatio", "none");
  const ppu = SW / vb.w;
  const level = state.level;

  // ── the sweep ──────────────────────────────────────────────────────────────────────────────────
  const r = c.raster;
  c.canvas.style.left = `${(r.x - vb.x) * ppu}px`;
  c.canvas.style.top = `${(r.y - vb.y) * ppu}px`;
  c.canvas.style.width = `${r.w * ppu}px`;
  c.canvas.style.height = `${r.h * ppu}px`;
  c.canvas.style.opacity = String(clamp(state.tint));
  if (c.bytes) {
    // The front: at least two of the reader's pixels, never under two raster steps.
    const rimKm = Math.max(r.stepKm * 2, 2.5 / (ppu * c.unitsPerKm));
    const key = `${level.toFixed(1)}|${rimKm.toFixed(1)}`;
    if (key !== c.painted) {
      c.painted = key;
      const px = c.image.data;
      const [tr, tg, tb] = c.tintRgb;
      const [rr, rg, rb] = c.rimRgb;
      const front = level < c.deepest;
      for (let i = 0, j = 0; i < c.bytes.length; i++, j += 4) {
        const b = c.bytes[i];
        if (b === 0) {
          px[j + 3] = 0;
          continue;
        }
        const d = (b - 1) * r.stepKm;
        const inside = level - d;
        if (inside < 0) {
          px[j + 3] = 0;
          continue;
        }
        if (front && inside < rimKm) {
          px[j] = rr; px[j + 1] = rg; px[j + 2] = rb;
        } else {
          px[j] = tr; px[j + 1] = tg; px[j + 2] = tb;
        }
        px[j + 3] = 255;
      }
      c.ctx.putImageData(c.image, 0, 0);
    }
  }

  // ── the lines ──────────────────────────────────────────────────────────────────────────────────
  // Whole once the sweep stands on it: a card that rests at 100 km shows the 100 km line.
  const reached = (L) => clamp((level - L) / 6 + 1);
  // A line within YIELD_KM of the median gives way to it: at the scale of Europe the two run a few pixels
  // apart, and neither could carry its number without laying it across the other.
  const shownOf = (L) =>
    L === c.medianLevel ? reached(L) * clamp(state.median) : Math.abs(L - c.medianLevel) < YIELD_KM ? reached(L) * (1 - clamp(state.median)) : reached(L);
  for (const path of c.paths) path.style.opacity = String(shownOf(Number(path.dataset.level)));

  // ── the summit ─────────────────────────────────────────────────────────────────────────────────
  const summitOn = clamp(state.summit) * clamp((level - c.deepest) / 4);
  for (const circle of c.summitMarks) circle.setAttribute("r", String(Number(circle.dataset.r) / ppu));
  c.summitGroup.style.opacity = String(summitOn);
  const halo = mixHex(c.colours.land, c.colours.tint, clamp(state.tint));
  // Its register's size in pixels, read once before the first paint rescales it into viewBox units.
  if (!c.summitLabel.dataset.px) c.summitLabel.dataset.px = String(Number.parseFloat(getComputedStyle(c.summitLabel).fontSize) || c.axisPx);
  c.summitLabel.style.fontSize = `${Number(c.summitLabel.dataset.px) / ppu}px`;
  c.summitLabel.setAttribute("x", String(c.summit[0] + 9 / ppu));
  c.summitLabel.setAttribute("y", String(c.summit[1]));
  c.summitLabel.setAttribute("stroke", halo);
  c.summitLabel.setAttribute("stroke-width", String(3.4 / ppu));
  c.summitLabel.style.opacity = String(summitOn);

  // ── the numbers ────────────────────────────────────────────────────────────────────────────────
  const placed = [];
  if (summitOn > 0.5) {
    const len = c.summitLabel.getComputedTextLength();
    const hS = (Number(c.summitLabel.dataset.px) * 1.3) / ppu;
    placed.push({ x0: c.summit[0] - 8 / ppu, x1: c.summit[0] + 9 / ppu + len, y0: c.summit[1] - hS / 2, y1: c.summit[1] + hS / 2 });
  }
  const shownLevels = c.levels.map((L, li) => ({ L, li, on: shownOf(L) })).filter((x) => x.on > 0.05);
  const order = [...shownLevels].sort((a, b) => (a.L === c.medianLevel ? -1 : b.L === c.medianLevel ? 1 : b.L - a.L));
  const perLevel = Math.max(1, Math.min(3, Math.floor(SW / 400)));
  const spacing = Math.max(150, SW * 0.28) / ppu;
  const margin = 6 / ppu;
  for (const node of c.labels) {
    node.style.opacity = "0";
    node.setAttribute("x", "-9999");
  }
  for (const { L, li, on } of order) {
    const nodes = c.labels.filter((n) => Number(n.dataset.label) === L);
    if (!nodes.length) continue;
    for (const n of nodes) {
      n.style.fontSize = `${c.axisPx / ppu}px`;
      n.setAttribute("stroke", halo);
      n.setAttribute("stroke-width", String(3.4 / ppu));
    }
    const w = nodes[0].getComputedTextLength() + 4 / ppu;
    const h = (c.axisPx * 1.3) / ppu;
    // The smallest measured half-width that covers the label; past the widest, the label is refused.
    const hwIndex = c.seatHalfWidths.findIndex((hw) => hw >= w / 2);
    if (hwIndex < 0) continue;
    const need = h / 2;
    const room = (s, lj) => s[2 + lj * c.seatHalfWidths.length + hwIndex];
    const others = shownLevels.filter((x) => x.li !== li).map((x) => x.li);
    const mine = [];
    for (const node of nodes) {
      let best = null;
      let bestScore = -1;
      for (const s of c.seats[li]) {
        const [x, y] = s;
        if (x - w / 2 < vb.x + margin || x + w / 2 > vb.x + vb.w - margin || y - h / 2 < vb.y + margin || y + h / 2 > vb.y + vb.h - margin) continue;
        if (others.some((lj) => room(s, lj) < need)) continue;
        const bx = { x0: x - w / 2 - margin, x1: x + w / 2 + margin, y0: y - h / 2 - margin, y1: y + h / 2 + margin };
        if (placed.some((p) => bx.x0 < p.x1 && bx.x1 > p.x0 && bx.y0 < p.y1 && bx.y1 > p.y0)) continue;
        if (mine.some((m) => Math.hypot(m[0] - x, m[1] - y) < spacing)) continue;
        // The first seat of a level: the most open one; after that, the one farthest from every number.
        const score = placed.length ? Math.min(...placed.map((p) => Math.hypot((p.x0 + p.x1) / 2 - x, (p.y0 + p.y1) / 2 - y))) : Math.min(...others.map((lj) => room(s, lj)), 99);
        if (score > bestScore) {
          bestScore = score;
          best = { x, y, bx };
        }
      }
      if (!best) break;
      node.setAttribute("x", String(best.x));
      node.setAttribute("y", String(best.y));
      node.style.opacity = String(on);
      placed.push(best.bx);
      mine.push([best.x, best.y]);
      if (mine.length >= perLevel) break;
    }
  }

  // ── the count ──────────────────────────────────────────────────────────────────────────────────
  const km = Math.max(0, Math.min(Math.round(level), c.within.length - 1));
  const shownKm = level >= c.deepest ? Math.round(c.deepest) : km;
  const text = c.count.dataset.template.replace("{p}", String(Math.round(c.within[km]))).replace("{km}", String(shownKm));
  if (c.count.textContent !== text) c.count.textContent = text;
  const countOn = String(clamp(level / 20) * clamp(state.tint));
  c.count.style.opacity = countOn;
  c.countSwatch.style.opacity = countOn;
}

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seat(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-contour"));
  const field = root.querySelector('[data-part="field"]');
  const canvas = root.querySelector('[data-part="sweep"]');
  canvas.width = data.raster.cols;
  canvas.height = data.raster.rows;
  const ctx = canvas.getContext("2d");
  const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const c = (root.__contour = {
    ...data,
    field,
    canvas,
    ctx,
    image: ctx.createImageData(data.raster.cols, data.raster.rows),
    tintRgb: rgb(data.colours.tint),
    rimRgb: rgb(data.colours.rim),
    bytes: null,
    painted: "",
    stage: root.querySelector('[data-part="stage"]'),
    paths: Array.from(field.querySelectorAll("path[data-level]")),
    labels: Array.from(field.querySelectorAll("text[data-label]")),
    summitGroup: field.querySelector('[data-part="summit"]'),
    summitMarks: Array.from(field.querySelectorAll('[data-part="summit"] circle')),
    summitLabel: field.querySelector('[data-part="summit-label"]'),
    count: root.querySelector('[data-part="count"]'),
    countSwatch: root.querySelector('[data-part="count-swatch"]'),
  });
  const packed = Uint8Array.from(atob(data.raster.data), (ch) => ch.charCodeAt(0));
  new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream("gzip")))
    .arrayBuffer()
    .then((buffer) => {
      c.bytes = new Uint8Array(buffer);
      if (c.last) applyContourState(root, c.last, { resized: false });
    });
}
