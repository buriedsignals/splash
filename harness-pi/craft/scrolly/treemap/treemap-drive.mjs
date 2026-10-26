// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   split    the one block of Europe's capacity divided into its fuels                                   0..1
//   byLand   the fuel cells giving way to one cell per country                                            0..1
//   tipped   the countries where wind and solar are over half of the fleet taking the accent              0..1
//   open     the largest country's cell opening to fill the stage, divided into its own fuels             0..1
//   note     which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint, squarified (Bruls, Huizing & van Wijk): cells in rows
// kept as near square as the running total allows, because a sliver is a shape whose area cannot be read. A cell
// carries its value, its subject and its basis while they fit, and gives them up basis first, value last.

export function squarify(values, x, y, w, h) {
  const total = values.reduce((s, v) => s + v, 0);
  const out = new Array(values.length);
  if (!(total > 0) || !(w > 0) || !(h > 0)) return values.map(() => ({ x, y, w: 0, h: 0 }));
  const scale = (w * h) / total;
  const order = values.map((v, i) => [v * scale, i]).sort((a, b) => b[0] - a[0]);
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;
  const worst = (row, side) => {
    const sum = row.reduce((s, r) => s + r[0], 0);
    const max = Math.max(...row.map((r) => r[0]));
    const min = Math.min(...row.map((r) => r[0]));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };
  let k = 0;
  while (k < order.length) {
    const side = Math.min(rw, rh);
    const row = [order[k++]];
    while (k < order.length && worst([...row, order[k]], side) <= worst(row, side)) row.push(order[k++]);
    const sum = row.reduce((s, r) => s + r[0], 0);
    if (rw >= rh) {
      const cw = sum / rh;
      let cy = ry;
      for (const [a, i] of row) {
        out[i] = { x: rx, y: cy, w: cw, h: a / cw };
        cy += a / cw;
      }
      rx += cw;
      rw -= cw;
    } else {
      const ch = sum / rw;
      let cx = rx;
      for (const [a, i] of row) {
        out[i] = { x: cx, y: ry, w: a / ch, h: ch };
        cx += a / ch;
      }
      ry += ch;
      rh -= ch;
    }
  }
  return out;
}

export function applyTreemapState(root, state, context) {
  const carrier = root.querySelector("[data-treemap]");
  if (!carrier) return;
  if (context.resized || !root.__treemap) seatTreemap(root, carrier);
  const c = root.__treemap;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const W = c.stage.clientWidth;
  const H = c.stage.clientHeight;
  if (!(W > 0 && H > 0)) return;

  const split = ease(clamp(state.split));
  const byLand = ease(clamp(state.byLand));
  const tipped = clamp(state.tipped);
  const open = ease(clamp(state.open));
  const whole = { x: 0, y: 0, w: W, h: H };
  const gap = 2;

  const place = (cell, r, alpha) => {
    const g = r.w > gap * 2 && r.h > gap * 2 ? gap / 2 : 0;
    Object.assign(cell.node.style, {
      left: `${r.x + g}px`,
      top: `${r.y + g}px`,
      width: `${Math.max(0, r.w - 2 * g)}px`,
      height: `${Math.max(0, r.h - 2 * g)}px`,
      opacity: String(alpha),
      visibility: alpha > 0.005 ? "visible" : "hidden",
    });
    // A cell gives up its basis first, then its subject; one that cannot hold its value shows nothing.
    const innerW = r.w - 2 * g - 12;
    const innerH = r.h - 2 * g - 8;
    const fits = (part) => part.offsetWidth <= innerW;
    const valueOn = fits(cell.value) && c.valueH <= innerH;
    const nameOn = valueOn && fits(cell.name) && c.valueH + cell.name.offsetHeight <= innerH;
    const basisOn = nameOn && cell.basis && fits(cell.basis) && c.valueH + cell.name.offsetHeight + c.basisH <= innerH;
    cell.value.style.visibility = valueOn ? "visible" : "hidden";
    cell.name.style.visibility = nameOn ? "visible" : "hidden";
    if (cell.basis) cell.basis.style.visibility = basisOn ? "visible" : "hidden";
  };

  // ── Europe, one block, then its fuels ──
  place(c.block, whole, (1 - split) * (1 - byLand));
  const fuelRects = squarify(c.fuels.map((f) => f.mw), 0, 0, W, H);
  c.fuels.forEach((f, i) => {
    const r = fuelRects[i];
    place(f, { x: lerp(0, r.x, split), y: lerp(0, r.y, split), w: lerp(W, r.w, split), h: lerp(H, r.h, split) }, split * (1 - byLand));
  });

  // ── the countries; the tipped ones in the accent; the largest opening to its own fuels ──
  const landRects = squarify(c.lands.map((l) => l.mw), 0, 0, W, H);
  const openIndex = c.lands.findIndex((l) => l.key === c.opens);
  const openRect = landRects[openIndex];
  const grown = { x: lerp(openRect.x, 0, open), y: lerp(openRect.y, 0, open), w: lerp(openRect.w, W, open), h: lerp(openRect.h, H, open) };
  c.lands.forEach((l, i) => {
    const r = i === openIndex ? grown : landRects[i];
    const alpha = byLand * (i === openIndex ? 1 - clamp((open - 0.6) / 0.4) : 1 - open);
    place(l, r, alpha);
    l.node.style.background = l.tipped ? mixHex(c.field, c.thread, tipped) : c.field;
    const ink = l.tipped && tipped > 0.5 ? c.onThread : c.onField;
    l.node.style.color = ink;
  });
  const subRects = squarify(c.inside.map((f) => f.mw), grown.x, grown.y, grown.w, grown.h);
  c.inside.forEach((f, i) => place(f, subRects[i], clamp((open - 0.5) * 2)));

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatTreemap(root, carrier) {
  const data = root.__treemapData || (root.__treemapData = JSON.parse(carrier.getAttribute("data-treemap")));
  const stage = root.querySelector('[data-part="stage"]');
  const cell = (group, item) => {
    const node = stage.querySelector(`[data-cell="${CSS.escape(`${group}:${item.key}`)}"]`);
    return { ...item, node, value: node.querySelector('[data-part="value"]'), name: node.querySelector('[data-part="name"]'), basis: node.querySelector('[data-part="basis"]') };
  };
  const lands = data.lands.map((l) => cell("land", l));
  root.__treemap = {
    ...data,
    stage,
    block: cell("block", data.block),
    fuels: data.fuels.map((f) => cell("fuel", f)),
    lands,
    inside: data.inside.map((f) => cell("inside", f)),
    valueH: lands[0].value.getBoundingClientRect().height,
    basisH: lands[0].basis.getBoundingClientRect().height,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
