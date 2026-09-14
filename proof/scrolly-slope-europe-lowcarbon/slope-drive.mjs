// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   right    the slopes growing from the first rail to the second, whose values are written as they land  0..1
//   cross    every crossing marked where two slopes meet                                                  0..1
//   pair     the pair that crosses in the accent, every other line stepping back                          0..1
//   gains    the largest gains drawn in the ink, their changes written; the rest stepping back             0..1
//   six      the lines the static plate does not draw leaving; the six re-seated                          0..1
//   note     which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the two rails at the stage's edges less the labels'
// room, one value scale for both, every label relaxed so no two touch — once for all sixteen lines, once for the six
// the static plate keeps, the seats crossfading between the two.

export function applySlopeState(root, state, context) {
  const carrier = root.querySelector("[data-slope]");
  if (!carrier) return;
  if (context.resized || !root.__slope) seatSlope(root, carrier);
  const c = root.__slope;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const right = ease(clamp(state.right));
  const pair = clamp(state.pair);
  const gains = clamp(state.gains);
  const six = ease(clamp(state.six));

  const leftW = Math.max(...c.lines.map((l) => l.left.offsetWidth));
  const rightW = Math.max(...c.lines.map((l) => l.right.offsetWidth));
  const deltaW = Math.max(...c.lines.map((l) => l.delta.offsetWidth));
  const x0 = leftW + 10;
  const x1 = SW - rightW - deltaW - 22;
  const top = c.yearH + 10;
  const bottom = SH - c.lineH / 2;
  const y = (v) => bottom - (v / 100) * (bottom - top);

  set(c.rails[0], { x1: x0, x2: x0, y1: top - 4, y2: bottom, opacity: 1 });
  set(c.rails[1], { x1: x1, x2: x1, y1: top - 4, y2: bottom, opacity: right });
  Object.assign(c.years[0].style, { left: `${x0}px`, top: "0px", transform: "translateX(-50%)" });
  Object.assign(c.years[1].style, { left: `${x1}px`, top: "0px", transform: "translateX(-50%)", opacity: String(right) });

  // Seats for all sixteen and for the six, relaxed on each rail; a label crossfades between its two seats.
  const seatsFor = (members, key) => {
    const seats = members.map((l) => ({ l, y: y(l[key]) })).sort((a, b) => a.y - b.y);
    relax(seats, c.lineH, top, bottom + c.lineH / 2);
    return new Map(seats.map((s) => [s.l.key, s.y]));
  };
  const drawn = c.lines.filter((l) => l.drawn);
  const leftAll = seatsFor(c.lines, "from");
  const leftSix = seatsFor(drawn, "from");
  const rightAll = seatsFor(c.lines, "to");
  const rightSix = seatsFor(drawn, "to");

  for (const l of c.lines) {
    const ya = y(l.from);
    const yb = lerp(ya, y(l.to), right);
    const xb = lerp(x0, x1, right);
    // Which line the reader is asked to look at: the pair, then the gains, then the static plate's own thread.
    const lit = l.thread ? Math.max(pair, six) : l.gain ? gains : 0;
    const kept = (l.thread ? 1 : l.gain ? 1 - 0.8 * pair : 1 - 0.8 * Math.max(pair, gains)) * (l.drawn ? 1 : 1 - six);
    const colour = l.thread ? mixHex(c.colours.rest, c.colours.thread, lit) : mixHex(c.colours.rest, c.colours.gain, lit);
    const width = c.series * lerp(0.55, 1, lit);
    set(l.slope, { x1: x0, y1: ya, x2: xb, y2: yb, stroke: colour, "stroke-width": width, opacity: kept });
    set(l.fromDot, { cx: x0, cy: ya, fill: colour, opacity: kept });
    set(l.toDot, { cx: xb, cy: yb, fill: colour, opacity: kept * (right > 0.02 ? 1 : 0) });

    const ly = lerp(leftAll.get(l.key), leftSix.get(l.key) ?? leftAll.get(l.key), six);
    Object.assign(l.left.style, { left: `${x0 - 8 - l.left.offsetWidth}px`, top: `${ly - c.lineH / 2}px`, opacity: String(kept) });
    const ry = lerp(rightAll.get(l.key), rightSix.get(l.key) ?? rightAll.get(l.key), six);
    Object.assign(l.right.style, { left: `${x1 + 8}px`, top: `${ry - c.lineH / 2}px`, opacity: String(kept * clamp((state.right - 0.8) / 0.2)) });
    // The change is written for the gains, and for every line the static plate keeps.
    const deltaOn = l.gain ? Math.max(gains, six) : l.drawn ? six : 0;
    Object.assign(l.delta.style, { left: `${x1 + 8 + rightW + 12}px`, top: `${ry - c.lineH / 2}px`, opacity: String(kept * deltaOn) });
  }

  // Every crossing marked where the two slopes meet, the pair's in the accent.
  const cross = clamp(state.cross);
  c.crossings.forEach(([a, b, t, v], i) => {
    const node = c.crossNodes[i];
    const isPair = c.lines[a].thread && c.lines[b].thread;
    const on = right >= t ? cross * (isPair ? 1 : 1 - 0.8 * pair) * (1 - six) : 0;
    set(node, { cx: lerp(x0, x1, t), cy: y(v), stroke: isPair ? c.colours.thread : c.colours.gain, opacity: Math.max(on, isPair ? pair * (1 - six) : 0) });
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
}

function relax(seats, pitch, top, bottom) {
  for (let i = 0; i < seats.length; i++) seats[i].y = Math.max(seats[i].y, i ? seats[i - 1].y + pitch : top);
  for (let i = seats.length - 1; i >= 0; i--) seats[i].y = Math.min(seats[i].y, i < seats.length - 1 ? seats[i + 1].y - pitch : bottom);
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatSlope(root, carrier) {
  const data = root.__slopeData || (root.__slopeData = JSON.parse(carrier.getAttribute("data-slope")));
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
      delta: q(`[data-delta="${l.key}"]`),
    };
  });
  const years = Array.from(stage.querySelectorAll("[data-year]"));
  root.__slope = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    lines,
    rails: Array.from(stage.querySelectorAll("[data-rail]")),
    years,
    yearH: years[0].getBoundingClientRect().height,
    lineH: Math.max(...lines.map((l) => l.left.getBoundingClientRect().height)) + 1,
    crossNodes: data.crossings.map((_, i) => q(`[data-crossing="${i}"]`)),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
