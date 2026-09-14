// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   fill   the cells taking their colour                                                             0..1
//   rate   the colour from the count's classes to the rate's classes                                  0..1
//   rank   the cells leaving the map for a honeycomb in rate order, each with its rate               0..1
//   pair   the rate leader and the count leader ringed, their rates written in                        0..1
//
// EVERYTHING IS PLACED IN THE READER'S PIXELS: the SVG's viewBox is the stage. Both layouts — the designed map and
// the ranking — are sized to the stage (the ranking takes whichever row length gives the largest cell) and centred;
// a cell travels between its two seats. Pointy-top hexagons, odd rows offset by half a cell.

export function applyHexState(root, state, context) {
  const carrier = root.querySelector("[data-hex]");
  if (!carrier) return;
  if (!root.__hex) seatHex(root, carrier);
  const c = root.__hex;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
  c.svg.setAttribute("preserveAspectRatio", "none");

  const PITCH = Math.sqrt(3) / 2;
  // On a narrow stage the layouts are sized to the band above the resting card and set at its top: centred in the
  // stage, the grid sat exactly where the card rests.
  const narrow = SW < 560;
  const cardTop = window.innerHeight * 0.42 - c.stage.getBoundingClientRect().top - 8;
  const bandH = narrow ? Math.max(SH * 0.35, Math.min(SH, cardTop)) : SH;
  const layout = (cols, rows) => {
    const w = Math.min(SW / (cols + 0.5), bandH / ((rows - 1) * PITCH + 2 / Math.sqrt(3)));
    const width = (cols + 0.5) * w;
    const height = (rows - 1) * PITCH * w + (2 / Math.sqrt(3)) * w;
    return { w, x0: (SW - width) / 2, y0: (bandH - height) / 2 };
  };
  const mapL = layout(c.cols, c.rows);
  let best = null;
  for (let k = 4; k <= 14; k++) {
    const l = layout(k, Math.ceil(c.ranked.length / k));
    if (!best || l.w > best.w) best = { ...l, k };
  }
  const seat = (l, row, col) => [l.x0 + l.w * (col + 0.5 + (row % 2 ? 0.5 : 0)), l.y0 + l.w / Math.sqrt(3) + row * PITCH * l.w];

  const rankE = ease(clamp(state.rank));
  const pair = clamp(state.pair);
  const fill = clamp(state.fill);
  const rate = ease(clamp(state.rate));
  // For the pair, the camera closes on the two cells and holds them in the upper part of the stage: the card comes
  // to rest across the middle, where the map's own centre row would put them.
  const pairE = ease(pair);
  const [ax, ay] = seat(mapL, c.tileOf[c.subject].row, c.tileOf[c.subject].col);
  const [bx, by] = seat(mapL, c.tileOf[c.largest].row, c.tileOf[c.largest].col);
  const zoom = lerp(1, 1.5, pairE);
  const pmx = (ax + bx) / 2;
  const pmy = (ay + by) / 2;
  const toX = (x) => lerp(x, SW / 2 + (x - pmx) * 1.5, pairE);
  const toY = (y) => lerp(y, (narrow ? bandH * 0.5 : SH * 0.26) + (y - pmy) * 1.5, pairE);
  for (const t of c.tiles) {
    const [sx, sy] = seat(mapL, t.row, t.col);
    const mx = toX(sx);
    const my = toY(sy);
    const i = c.ranked.indexOf(t.code);
    const [rx, ry] = i >= 0 ? seat(best, Math.floor(i / best.k), i % best.k) : [mx, my];
    const cx = lerp(mx, rx, rankE);
    const cy = lerp(my, ry, rankE);
    const w = lerp(mapL.w * zoom, best.w, i >= 0 ? rankE : 0);
    const r = w / Math.sqrt(3) - 1;
    t.hex.setAttribute("d", hexPath(cx, cy, r));
    t.ring.setAttribute("d", hexPath(cx, cy, r + 4));
    const target = t.rateClass === null ? c.colours.originFill : mixHex(c.colours.fills[t.countClass], c.colours.fills[t.rateClass], rate);
    const colour = mixHex(c.colours.empty, target, t.rateClass === null ? 1 : fill);
    t.hex.setAttribute("fill", colour);
    const text = legible(colour, c.colours.ink, c.colours.ground);
    const focused = t.code === c.subject || t.code === c.largest;
    const valueOn = Math.max(i >= 0 ? rankE : 0, focused ? pair : 0);
    const codePx = Math.max(8, Math.min(c.codePx, w * 0.26));
    t.code_.setAttribute("x", String(cx));
    t.code_.setAttribute("y", String(cy - valueOn * codePx * 0.6));
    t.code_.setAttribute("fill", text);
    t.code_.style.fontSize = `${codePx}px`;
    t.value.setAttribute("x", String(cx));
    t.value.setAttribute("y", String(cy + codePx * 0.65));
    t.value.setAttribute("fill", text);
    t.value.style.fontSize = `${codePx}px`;
    t.value.setAttribute("opacity", String(valueOn * (w > codePx * 3 ? 1 : 0)));
    t.ring.setAttribute("opacity", String(focused ? pair : 0));
    // Ukraine leaves the grid while the others are ranked: it is outside the count.
    t.group.setAttribute("opacity", String(i >= 0 ? (focused || pair === 0 ? 1 : 1 - 0.6 * pair) : 1 - rankE));
  }

  const notes = { countNote: fill * (1 - rate), rateNote: rate * (1 - rankE) * (1 - pair), rankNote: rankE, pairNote: pair };
  for (const [key, node] of Object.entries(c.notes)) node.style.opacity = String(notes[key]);
  c.countKey.style.opacity = String(fill * (1 - rate));
  c.rateKey.style.opacity = String(rate);
}

function hexPath(cx, cy, r) {
  let d = "";
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    d += `${k ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** The ink or the ground, whichever reads better on a fill — the static plate's own rule. */
function legible(fill, ink, ground) {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  return ratio(ink, fill) >= ratio(ground, fill) ? ink : ground;
}

function seatHex(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-hex"));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector('[data-part="field"]');
  const tiles = data.tiles.map((t) => {
    const group = svg.querySelector(`[data-tile="${t.code}"]`);
    return { ...t, group, hex: group.querySelector('[data-part="hex"]'), ring: group.querySelector('[data-part="ring"]'), code_: group.querySelector('[data-part="code"]'), value: group.querySelector('[data-part="value"]') };
  });
  root.__hex = {
    ...data,
    stage,
    svg,
    tiles,
    cols: Math.max(...data.tiles.map((t) => t.col)) + 1,
    rows: Math.max(...data.tiles.map((t) => t.row)) + 1,
    tileOf: Object.fromEntries(data.tiles.map((t) => [t.code, t])),
    codePx: Number.parseFloat(getComputedStyle(tiles[0].code_).fontSize),
    notes: Object.fromEntries(Array.from(root.querySelectorAll("[data-note]")).map((n) => [n.dataset.note, n])),
    countKey: root.querySelector('[data-part="count-key"]'),
    rateKey: root.querySelector('[data-part="rate-key"]'),
  };
}
