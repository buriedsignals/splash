// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year    the world's ring from the 2000 shares to the 2023 shares: arcs resize and turn        0..1
//   pair    the two countries the headline names kept, the other four stepping back               0..1
//   grow    the ring's area following the world's total, the 2000 ring left as a dashed outline   0..1
//   russia  the country whose share fell while its tonnes rose, alone, its 2000 arc beside it and
//           its tonnes under its name                                                            0..1
//   split   the one ring breaking into one ring per country — the static plate's form             0..1
//
// THE WHOLE PICTURE IS BUILT HERE, in the reader's pixels: the SVG's viewBox is the stage, so a ring is
// round at every width. The markup the component renders is the last card's picture for a reader
// without a script; on the first paint it is replaced by the marks this function moves.

const NS = "http://www.w3.org/2000/svg";

export function applyDonutState(root, state, context) {
  const carrier = root.querySelector("[data-donut]");
  if (!carrier) return;
  if (!root.__donut) buildDonut(root, carrier);
  const c = root.__donut;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const year = ease(clamp(state.year));
  const grow = ease(clamp(state.grow));
  const split = ease(clamp(state.split));
  const pair = clamp(state.pair);
  const russia = clamp(state.russia);
  const one = (v) => v.toFixed(1).replace(".", ",");

  // ── the world's ring ───────────────────────────────────────────────────────────────────────────
  const narrow = SW < 560;
  // On a narrow stage a label is one line — name, then share — so the six fit beside a ring that fits above
  // the card resting across the middle.
  const labelW = narrow ? c.lineW : c.labelW;
  const lineH = c.valuePx * 1.25;
  const labelH = narrow ? lineH : lineH * 2;
  // On a narrow stage every label goes in one column to the right of the ring, which then takes the rest of the
  // width and the top of the stage: the card comes to rest across the middle.
  const RMax = Math.max(40, narrow ? Math.min(SH * 0.2 - 6, (SW - labelW - 44) / 2) : Math.min(SH / 2 - 10, SW / 2 - labelW - 24));
  const R0 = RMax / Math.sqrt(c.worldAfter / c.worldBefore);
  const R = lerp(R0, RMax, grow);
  const inner = 0.7;
  const cx = narrow ? RMax + 4 : SW / 2;
  const cy = narrow ? Math.min(SH / 2, RMax + 12) : SH / 2;
  c.world.setAttribute("opacity", String(1 - split));
  c.world.setAttribute("transform", `translate(${cx} ${cy}) scale(${1 - 0.15 * split})`);

  let cursor = 0;
  const seats = [];
  for (const country of c.countries) {
    const share = lerp(country.shareBefore, country.shareAfter, year);
    const a0 = cursor;
    const a1 = cursor + (share / 100) * 360;
    cursor = a1;
    country.arc.setAttribute("d", sector(a0, a1, R * inner, R, 0.35));
    const kept = russia > 0 ? (country.code === c.trap ? 1 : 1 - 0.8 * russia) : c.pair.includes(country.code) ? 1 : 1 - 0.8 * pair;
    country.arc.setAttribute("opacity", String(kept));
    seats.push({ country, mid: (a0 + a1) / 2, share, kept });
  }
  c.rest.setAttribute("d", sector(cursor, 360, R * inner, R, 0.35));

  // The 2000 ring as a dashed outline while the ring grows past it.
  for (const [node, radius] of [[c.ghostOuter, R0], [c.ghostInner, R0 * inner]]) {
    node.setAttribute("r", String(radius));
    node.setAttribute("opacity", String(grow * (1 - split)));
  }
  // The trap's own 2000 arc, on the 2000 ring, beside its 2023 arc.
  let trapCursor = 0;
  for (const country of c.countries) {
    if (country.code === c.trap) {
      c.trapBefore.setAttribute("d", sector(trapCursor, trapCursor + (country.shareBefore / 100) * 360, R0 * inner, R0, 0.35));
      break;
    }
    trapCursor += (country.shareBefore / 100) * 360;
  }
  c.trapBefore.setAttribute("opacity", String(russia));

  // Labels outside the ring, each side relaxed so no two touch.
  const sides = { left: [], right: [] };
  for (const s of seats) {
    const rad = (s.mid * Math.PI) / 180;
    const ax = Math.sin(rad) * (R + 4);
    const ay = -Math.cos(rad) * (R + 4);
    const side = narrow || Math.sin(rad) >= 0 ? "right" : "left";
    // The trap's label carries a third line, its tonnes, while it is the card's subject.
    const h = labelH + (s.country.code === c.trap ? lineH * russia : 0);
    sides[side].push({ ...s, ax, ay, h, y: -Math.cos(rad) * (R + 18) });
  }
  for (const list of Object.values(sides)) {
    list.sort((a, b) => a.y - b.y);
    for (let i = 1; i < list.length; i++) if (list[i].y - list[i - 1].y < list[i - 1].h) list[i].y = list[i - 1].y + list[i - 1].h;
    const overflow = list.length ? list[list.length - 1].y + list[list.length - 1].h - (SH - cy - 2) : 0;
    if (overflow > 0) for (const l of list) l.y -= overflow;
    // One column beside the ring: the block of labels centred on the ring rather than hanging below it.
    if (narrow && list.length) {
      const shift = -(list[0].y + list[list.length - 1].y) / 2;
      for (const l of list) l.y += shift;
    }
    const under = list.length ? -cy + labelH / 2 + 2 - list[0].y : 0;
    if (under > 0) for (const l of list) l.y += under;
    for (let i = list.length - 2; i >= 0; i--) if (list[i + 1].y - list[i].y < list[i].h) list[i].y = list[i + 1].y - list[i].h;
  }
  for (const [side, list] of Object.entries(sides))
    for (const s of list) {
      const x = narrow ? RMax + 22 : (side === "right" ? 1 : -1) * (R + 22);
      const anchor = side === "right" ? "start" : "end";
      const { name, value, leader } = s.country.label;
      name.setAttribute("x", String(x));
      name.setAttribute("y", String(narrow ? s.y + lineH * 0.35 : s.y - lineH * 0.5));
      name.setAttribute("text-anchor", anchor);
      value.setAttribute("x", String(narrow ? x + s.country.nameW + 6 : x));
      value.setAttribute("y", String(narrow ? s.y + lineH * 0.35 : s.y + lineH * 0.5));
      value.setAttribute("text-anchor", anchor);
      const text = `${one(s.share)} %`;
      if (value.textContent !== text) value.textContent = text;
      const { tonnes } = s.country.label;
      tonnes.setAttribute("x", String(x));
      tonnes.setAttribute("y", String(narrow ? s.y + lineH * 1.35 : s.y + lineH * 1.5));
      tonnes.setAttribute("text-anchor", anchor);
      tonnes.setAttribute("opacity", String(s.country.code === c.trap ? russia : 0));
      const elbow = narrow ? RMax + 12 : (side === "right" ? 1 : -1) * (R + 12);
      leader.setAttribute("points", `${s.ax},${s.ay} ${elbow},${s.y} ${x - (side === "right" ? 4 : -4)},${s.y}`);
      for (const node of [name, value, leader]) node.setAttribute("opacity", String(s.kept));
      const strong = c.pair.includes(s.country.code) && pair > 0.5 && russia < 0.5 ? "700" : s.country.code === c.trap && russia > 0.5 ? "700" : "";
      name.style.fontWeight = strong || c.regs.annot.fontWeight;
    }

  // The year the shares belong to, in the unit line: the ring's hole is where the card comes to rest.
  const unitText = c.unit.dataset.template.replace("{year}", year < 0.5 ? c.years[0] : c.years[1]);
  if (c.unit.textContent !== unitText) c.unit.textContent = unitText;

  // ── one ring per country ───────────────────────────────────────────────────────────────────────
  const blockH = c.axisPx * 1.3 * 2 + c.annotPx * 1.35 + 10;
  let best = null;
  for (const cols of [6, 3, 2]) {
    const rows = Math.ceil(c.countries.length / cols);
    const cellW = SW / cols;
    const cellH = SH / rows;
    const r = Math.min(cellW / 2 - 10, (cellH - blockH) / 2 - 8);
    if (!best || r > best.r) best = { cols, rows, cellW, cellH, r };
  }
  c.multiples.setAttribute("opacity", String(split));
  const t = best.r * 0.16;
  c.countries.forEach((country, i) => {
    const col = i % best.cols;
    const row = Math.floor(i / best.cols);
    const gx = best.cellW * (col + 0.5);
    const gy = best.cellH * row + (best.cellH - blockH) / 2;
    const m = country.small;
    const scale = 0.85 + 0.15 * split;
    m.group.setAttribute("transform", `translate(${gx} ${gy}) scale(${scale})`);
    // A full ring as two half-rings: an arc of 359.99° rounds to two identical end points at some widths, and the
    // browser then draws a crescent instead of a ring.
    const ring = (ri, ro) => `${sector(0, 180, ri, ro, 0)}${sector(180, 360, ri, ro, 0)}`;
    m.track.setAttribute("d", `${ring(best.r - t, best.r)}${ring(best.r - 2 * t - 3, best.r - t - 3)}`);
    m.before.setAttribute("d", sector(0, (country.shareBefore / 100) * 360, best.r - t, best.r, 0));
    m.after.setAttribute("d", sector(0, (country.shareAfter / 100) * 360, best.r - 2 * t - 3, best.r - t - 3, 0));
    m.share.setAttribute("y", String(c.valuePx * 0.35));
    m.name.setAttribute("y", String(best.r + 8 + c.annotPx));
    m.lineBefore.setAttribute("y", String(best.r + 8 + c.annotPx * 1.35 + c.axisPx * 1.2));
    m.lineAfter.setAttribute("y", String(best.r + 8 + c.annotPx * 1.35 + c.axisPx * 2.5));
  });

  c.worldNote.style.opacity = String(clamp(state.grow) * (1 - russia) * (1 - split));
  c.trapNote.style.opacity = String(russia * (1 - split));
  c.splitNote.style.opacity = String(split);
}

/** An annular sector from `a0` to `a1` degrees clockwise from twelve o'clock, with `pad` degrees of ground
 *  kept at each end so neighbouring arcs read as separate. */
function sector(a0, a1, ri, ro, pad) {
  const span = a1 - a0;
  if (span <= 0.01) return "";
  const p = Math.min(pad, span / 4);
  const s = ((a0 + p) * Math.PI) / 180;
  const e = ((a1 - p) * Math.PI) / 180;
  const large = a1 - a0 - 2 * p > 180 ? 1 : 0;
  const pt = (r, a) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
  return `M${pt(ro, s)}A${ro} ${ro} 0 ${large} 1 ${pt(ro, e)}L${pt(ri, e)}A${ri} ${ri} 0 ${large} 0 ${pt(ri, s)}Z`;
}

function buildDonut(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-donut"));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector("svg");
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute("preserveAspectRatio", "none");
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    parent.appendChild(node);
    return node;
  };
  const text = (reg, attrs, parent, content) => {
    const node = el("text", attrs, parent);
    for (const [k, v] of Object.entries(reg)) if (k !== "lineHeight" && k !== "margin" && k !== "marginBottom") node.style[k] = v;
    node.textContent = content;
    return node;
  };
  const { colours, regs } = data;
  const world = el("g", {}, svg);
  const rest = el("path", { fill: colours.track }, world);
  const ghostOuter = el("circle", { cx: 0, cy: 0, fill: "none", stroke: colours.muted, "stroke-dasharray": "4 4", "stroke-width": 1 }, world);
  const ghostInner = el("circle", { cx: 0, cy: 0, fill: "none", stroke: colours.muted, "stroke-dasharray": "4 4", "stroke-width": 1 }, world);
  const trapBefore = el("path", { fill: colours.past }, world);
  const labels = el("g", {}, world);
  const countries = data.countries.map((country) => {
    const fill = country.code === data.subject ? colours.accent : country.code === data.pair.find((p) => p !== data.subject) ? colours.second : colours.other;
    return {
      ...country,
      arc: el("path", { fill }, world),
      label: {
        leader: el("polyline", { fill: "none", stroke: colours.muted, "stroke-width": 0.8 }, labels),
        name: text(regs.annot, { fill: country.code === data.subject ? colours.accentInk : colours.ink }, labels, country.name),
        value: text(regs.value, { fill: country.code === data.subject ? colours.accentInk : colours.ink }, labels, ""),
        tonnes: text(regs.value, { fill: colours.ink }, labels, `${country.gtBefore.toFixed(1).replace(".", ",")} puis ${country.gtAfter.toFixed(1).replace(".", ",")} Gt`),
      },
    };
  });

  const multiples = el("g", {}, svg);
  for (const country of countries) {
    const group = el("g", {}, multiples);
    const isSubject = country.code === data.subject;
    country.small = {
      group,
      track: el("path", { fill: colours.track }, group),
      before: el("path", { fill: colours.past }, group),
      after: el("path", { fill: colours.accent }, group),
      share: text(regs.value, { "text-anchor": "middle", fill: isSubject ? colours.accentInk : colours.ink }, group, `${country.shareAfter.toFixed(1).replace(".", ",")} %`),
      name: text({ ...regs.annot, fontWeight: isSubject ? "700" : regs.annot.fontWeight }, { "text-anchor": "middle", fill: isSubject ? colours.accentInk : colours.ink }, group, country.name),
      lineBefore: text(regs.axis, { "text-anchor": "middle", fill: colours.muted }, group, `${data.years[0]} · ${country.gtBefore.toFixed(1).replace(".", ",")} Gt`),
      lineAfter: text(regs.axis, { "text-anchor": "middle", fill: colours.muted }, group, `${data.years[1]} · ${country.gtAfter.toFixed(1).replace(".", ",")} Gt`),
    };
  }

  // The widest label either side of the ring prints, measured once.
  let labelW = 0;
  let lineW = 0;
  for (const country of countries) {
    country.nameW = country.label.name.getComputedTextLength();
    labelW = Math.max(labelW, country.nameW);
    country.label.value.textContent = `${country.shareBefore.toFixed(1).replace(".", ",")} %`;
    labelW = Math.max(labelW, country.label.value.getComputedTextLength());
    if (country.code === data.trap) labelW = Math.max(labelW, country.label.tonnes.getComputedTextLength());
    lineW = Math.max(lineW, country.nameW + 6 + country.label.value.getComputedTextLength(), country.code === data.trap ? country.label.tonnes.getComputedTextLength() : 0);
  }
  const px = (reg) => Number.parseFloat(reg.fontSize);
  root.__donut = {
    ...data,
    stage,
    svg,
    world,
    rest,
    ghostOuter,
    ghostInner,
    trapBefore,
    countries,
    unit: root.querySelector('[data-part="unit"]'),
    multiples,
    labelW,
    lineW,
    valuePx: px(regs.value),
    axisPx: px(regs.axis),
    annotPx: px(regs.annot),
    worldNote: root.querySelector('[data-part="world-note"]'),
    trapNote: root.querySelector('[data-part="trap-note"]'),
    splitNote: root.querySelector('[data-part="split-note"]'),
  };
}
