// EuropeLowCarbonLeaders — the painting function, inlined by renderScrolly's `reveal` option.
// One value scale, fitted from zero, for every picture (bar-and-column.md's own precision rule):
// every bar's height is `plotH * (share / 100) * reveal`, never re-scaled per state.

export function applyEuropeLowCarbonLeadersState(root, state, context) {
  const carrier = root.querySelector("[data-bar-and-column]");
  if (!carrier) return;
  if (context.resized || !root.__europeLowCarbonLeaders) seatEuropeLowCarbonLeaders(root, carrier);
  const c = root.__europeLowCarbonLeaders;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const n = c.countries.length;
  const topPad = SH * 0.16;
  const bottomPad = SH * 0.12;
  const plotH = SH - topPad - bottomPad;
  const baselineY = topPad + plotH;
  const step = SW / n;
  const barW = step * 0.72;
  const maxShare = 100;

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }

  const reveal = clamp(state.reveal);
  const focus = clamp(state.focus);

  set(c.baseline, { x1: 0, y1: baselineY, x2: SW, y2: baselineY, opacity: 0.5 });

  const barGeom = new Array(n);
  c.bars.forEach((rect, i) => {
    const share = c.countries[i].share;
    const h = plotH * (share / maxShare) * reveal;
    const x = i * step + (step - barW) / 2;
    const y = baselineY - h;
    barGeom[i] = { x, y, w: barW, h };
    const inTop = i < c.cutRank;
    const fill = inTop ? mix(c.muted, c.accent, focus) : c.muted;
    const opacity = inTop ? 1 : 1 - 0.65 * focus;
    set(rect, { x, y, width: barW, height: h, fill, opacity });
  });

  // The cut-line sits at the tenth bar's own top edge — the value that separates the leaders from
  // the rest — and only reads once the choreography pulls the top ten apart.
  const cutTop = barGeom[c.cutRank - 1];
  set(c.cutline, { x1: 0, y1: cutTop.y, x2: SW, y2: cutTop.y, opacity: focus * 0.9 });

  // Callouts: best, the cut, the first of the rest, and the worst — positioned at each bar's own
  // top edge, centred on the bar, never rotated and never cut.
  const calloutIdx = { best: 0, cut: c.cutRank - 1, afterCut: c.cutRank, worst: n - 1 };
  const calloutText = {
    best: `${c.countries[0].entity}${NB()}100%`,
    cut: `${c.countries[c.cutRank - 1].entity}${NB()}${Math.round(c.countries[c.cutRank - 1].share)}%`,
    afterCut: `${c.countries[c.cutRank].entity}${NB()}${Math.round(c.countries[c.cutRank].share)}%`,
    worst: `${c.countries[n - 1].entity}${NB()}${Math.round(c.countries[n - 1].share)}%`,
  };
  for (const [key, node] of Object.entries(c.labels)) {
    const idx = calloutIdx[key];
    const g = barGeom[idx];
    const visibleFrom = key === "best" || key === "worst" ? reveal : focus;
    node.textContent = calloutText[key];
    Object.assign(node.style, {
      left: `${g.x + g.w / 2}px`,
      top: `${g.y - 6}px`,
      opacity: String(clamp(2 * visibleFrom - 1)),
    });
  }
  Object.assign(c.cutnote.style, {
    left: `${Math.min(SW - 8, cutTop.x + cutTop.w + 8)}px`,
    top: `${cutTop.y - 6}px`,
    opacity: String(focus),
  });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}

function NB() {
  return "\u00A0";
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const round = (v) => Math.round(v).toString(16).padStart(2, "0");
  const r = round(a[0] + (b[0] - a[0]) * t);
  const g = round(a[1] + (b[1] - a[1]) * t);
  const bl = round(a[2] + (b[2] - a[2]) * t);
  return `#${r}${g}${bl}`;
}

function seatEuropeLowCarbonLeaders(root, carrier) {
  const data = root.__europeLowCarbonLeadersData || (root.__europeLowCarbonLeadersData = JSON.parse(carrier.getAttribute("data-bar-and-column")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const qa = (sel) => Array.from(stage.querySelectorAll(sel));
  root.__europeLowCarbonLeaders = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
    bars: qa('[data-mark="bar"]'),
    cutline: q('[data-mark="cutline"]'),
    baseline: q('[data-mark="baseline"]'),
    labels: {
      best: q('[data-label="best"]'),
      cut: q('[data-label="cut"]'),
      afterCut: q('[data-label="afterCut"]'),
      worst: q('[data-label="worst"]'),
    },
    cutnote: q('[data-label="cutnote"]'),
  };
}
