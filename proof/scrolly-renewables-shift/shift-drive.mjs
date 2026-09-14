// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   right    the slopes growing from the first rail to the second, whose values are written as they land  0..1
//   subject  every line but the subject's stepping back                                                   0..1
//   parts    the slope giving way to the subject's change taken apart source by source, in points          0..1
//   room     the room each country had left to climb in the first year, a bar from its dot up to 100 %    0..1
//   note     which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the rails at the stage's edges less their labels' room,
// one scale from 0 to 100 % for both; labels relaxed so no two touch.

export function applyShiftState(root, state, context) {
  const carrier = root.querySelector("[data-shift]");
  if (!carrier) return;
  if (context.resized || !root.__shift) seatShift(root, carrier);
  const c = root.__shift;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const right = ease(clamp(state.right));
  const subject = clamp(state.subject);
  const parts = ease(clamp(state.parts));
  const room = clamp(state.room);
  const slopeOn = 1 - parts;

  // A phone names each country once: at the first rail while it stands alone, at the second once it is drawn.
  const narrow = SW < 560;
  for (const l of c.lines) l.left.firstElementChild.style.display = narrow && state.right > 0.5 ? "none" : "inline";
  const leftW = Math.max(...c.lines.map((l) => l.left.offsetWidth));
  const rightW = Math.max(...c.lines.map((l) => l.right.offsetWidth));
  const x0 = leftW + 12;
  const x1 = SW - rightW - 12;
  const top = c.yearH + 10;
  const bottom = SH - c.lineH / 2 - 2;
  const Y = (v) => bottom - (v / 100) * (bottom - top);

  set(c.rails[0], { x1: x0, x2: x0, y1: top - 4, y2: bottom, opacity: slopeOn });
  set(c.rails[1], { x1: x1, x2: x1, y1: top - 4, y2: bottom, opacity: slopeOn * right });
  Object.assign(c.years[0].style, { left: `${x0}px`, top: "0px", transform: "translateX(-50%)", opacity: String(slopeOn) });
  Object.assign(c.years[1].style, { left: `${x1}px`, top: "0px", transform: "translateX(-50%)", opacity: String(slopeOn * right) });

  const seats = (key) => {
    const s = c.lines.map((l) => ({ l, y: Y(l[key]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < s.length; i++) s[i].y = Math.max(s[i].y, s[i - 1].y + c.lineH);
    for (let i = s.length - 2; i >= 0; i--) s[i].y = Math.min(s[i].y, s[i + 1].y - c.lineH);
    return new Map(s.map((x) => [x.l.key, x.y]));
  };
  const leftSeats = seats("from");
  const rightSeats = seats("to");
  const roomW = Math.max(4, Math.min(10, (x1 - x0) / 40));

  c.lines.forEach((l, i) => {
    const kept = (l.subject ? 1 : 1 - 0.75 * subject) * slopeOn;
    const colour = l.subject ? c.colours.accent : c.colours.rest;
    const ya = Y(l.from);
    const xb = lerp(x0, x1, right);
    const yb = lerp(ya, Y(l.to), right);
    set(l.slope, { x1: x0, y1: ya, x2: xb, y2: yb, stroke: colour, "stroke-width": c.series * (l.subject ? 1.4 : 0.7), opacity: kept });
    set(l.fromDot, { cx: x0, cy: ya, fill: colour, opacity: kept });
    set(l.toDot, { cx: xb, cy: yb, fill: colour, opacity: kept * (right > 0.02 ? 1 : 0) });
    Object.assign(l.left.style, { left: `${x0 - 10 - l.left.offsetWidth}px`, top: `${leftSeats.get(l.key)}px`, transform: "translateY(-50%)", opacity: String(kept) });
    Object.assign(l.right.style, { left: `${x1 + 10}px`, top: `${rightSeats.get(l.key)}px`, transform: "translateY(-50%)", opacity: String(kept * clamp((state.right - 0.8) / 0.2)) });
    // The room left in the first year: a thin bar from the dot up to 100 %, beside the first rail.
    const rx = x0 + 8 + i * (roomW + 3);
    const labelled = l.roomLabel.textContent.trim() !== "";
    set(l.roomBar, { x: rx, y: Y(100), width: roomW, height: Math.max(1, ya - Y(100)), fill: l.subject ? c.colours.room : c.colours.roomRest, opacity: room * slopeOn * (labelled ? 1 : 0.45) });
    // Named just above its own dot, right of the bars: at mid-bar the label lay across the other lines.
    Object.assign(l.roomLabel.style, { left: `${x0 + 8 + c.lines.length * (roomW + 3) + 4}px`, top: `${ya - 6}px`, transform: "translateY(-100%)", opacity: String(labelled ? room * slopeOn : 0) });
  });

  // ── the subject's change, source by source, as bars either side of zero ──
  const nameW = Math.max(...c.parts.map((p) => p.name.offsetWidth));
  const valueW = Math.max(...c.parts.map((p) => p.valueNode.offsetWidth));
  const lo = Math.min(0, ...c.parts.map((p) => p.value));
  const hi = Math.max(0, ...c.parts.map((p) => p.value));
  // A phone sets each group's name on its own line above its bar, so the bars keep the width.
  const bx0 = narrow ? valueW + 8 : nameW + 16 + valueW;
  const bx1 = SW - valueW - 8;
  const X = (v) => bx0 + ((v - lo) / (hi - lo)) * (bx1 - bx0);
  const headTop = top + c.lineH + 8;
  const rowH = Math.min(narrow ? 72 : 56, (bottom - headTop) / c.parts.length);
  const barH = rowH * (narrow ? 0.4 : 0.6);
  set(c.zero, { x1: X(0), x2: X(0), y1: headTop - 4, y2: headTop + rowH * c.parts.length, opacity: parts });
  Object.assign(c.gained.style, { left: `${X(0) + 6}px`, top: `${top}px`, opacity: String(parts) });
  Object.assign(c.gave.style, { left: `${X(0) - 6}px`, top: `${top}px`, transform: "translateX(-100%)", opacity: String(parts) });
  c.parts.forEach((p, i) => {
    const cy = headTop + (i + (narrow ? 0.7 : 0.5)) * rowH;
    const w = (X(p.value) - X(0)) * parts;
    set(p.bar, { x: w >= 0 ? X(0) : X(0) + w, y: cy - barH / 2, width: Math.abs(w), height: barH, opacity: parts });
    Object.assign(p.name.style, narrow
      ? { left: `${X(0)}px`, top: `${cy - barH / 2 - 3}px`, transform: p.value >= 0 ? "translateY(-100%)" : "translate(-100%, -100%)", opacity: String(parts) }
      : { left: "0px", top: `${cy}px`, transform: "translateY(-50%)", opacity: String(parts) });
    const vx = p.value >= 0 ? X(0) + w + 6 : X(0) + w - 6;
    Object.assign(p.valueNode.style, { left: `${vx}px`, top: `${cy}px`, transform: p.value >= 0 ? "translateY(-50%)" : "translate(-100%, -50%)", opacity: String(clamp((parts - 0.6) / 0.4)) });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatShift(root, carrier) {
  const data = root.__shiftData || (root.__shiftData = JSON.parse(carrier.getAttribute("data-shift")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const lines = data.lines.map((l) => {
    const g = q(`[data-line="${l.key}"]`);
    return {
      ...l,
      slope: g.querySelector('[data-part="slope"]'),
      fromDot: g.querySelector('[data-part="from"]'),
      toDot: g.querySelector('[data-part="to"]'),
      left: q(`[data-left="${l.key}"]`),
      right: q(`[data-right="${l.key}"]`),
      roomBar: q(`[data-room="${l.key}"]`),
      roomLabel: q(`[data-room-label="${l.key}"]`),
    };
  });
  const parts = data.parts.map((p) => ({ ...p, bar: q(`[data-bar="${p.key}"]`), name: q(`[data-part-name="${p.key}"]`), valueNode: q(`[data-part-value="${p.key}"]`) }));
  const years = Array.from(stage.querySelectorAll("[data-year]"));
  root.__shift = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    rails: Array.from(stage.querySelectorAll("[data-rail]")),
    years,
    lines,
    parts,
    zero: q('[data-part="zero"]'),
    gained: q('[data-part="gained"]'),
    gave: q('[data-part="gave"]'),
    yearH: years[0].getBoundingClientRect().height,
    lineH: Math.max(...lines.map((l) => l.left.getBoundingClientRect().height)) + 2,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
