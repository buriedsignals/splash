// The painting function for the flow map scrolly, inlined by `renderScrolly`'s `reveal` option AFTER the map
// runtime (`shared/map-beat/inline.mjs`), inside the same IIFE: `initScrollyMap` and `applyScrollyMap` are in
// scope.
//
// THE RUNTIME OWNS THE CAMERA AND EVERY PLAN LAYER'S PAINT. This file owns what the runtime cannot: cutting each
// band's line to its own drawn share (`arcAt`, ported from the validated video's `scene.mjs` — a `setData`, not
// a binding, since `line-progress` is refused) and the host names, drawn as HTML labels positioned by the live
// map's own projection every frame.
//
// A STATE, field by field:
//   bands   how many of the ten drawn bands have traced, largest first; a fraction is a band part-way   0..10
//   others  the 21 countries too small for a band, a dot each                                            0..1
//   pair    the two largest hosts named together, in bold                                                0..1
//   key     the width key                                                                                0..1

const NARROW_NAMES = 5;

/** A band's line at `t` of its own length — the arc's vertices up to `t` × its cumulative stage-px length, the
 *  last one interpolated. Ported from the validated video beat's `scene.mjs`. */
function arcAt(coordinates, cumulative, t) {
  if (!(t > 0)) return [coordinates[0], coordinates[0]];
  if (t >= 1) return coordinates;
  const reach = t * cumulative.at(-1);
  const out = [coordinates[0]];
  for (let i = 1; i < coordinates.length; i++) {
    if (cumulative[i] < reach) {
      out.push(coordinates[i]);
      continue;
    }
    const u = (reach - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1] || 1);
    const [a, b] = [coordinates[i - 1], coordinates[i]];
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    break;
  }
  return out.length > 1 ? out : [out[0], out[0]];
}

export function applyFlowState(root, state) {
  if (!root.__flow) setUpFlow(root);
  const c = root.__flow;
  applyScrollyMap(c.handle, state);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const map = c.handle.map;
  const shown = Boolean(map && c.handle.ready);
  const card = Math.max(0, Math.min(c.cards - 1, Math.round(state.card)));
  c.fallbacks.forEach((img) => {
    const opacity = !shown && Number(img.dataset.fallback) === card ? "1" : "0";
    if (img.style.opacity !== opacity) img.style.opacity = opacity;
  });

  const narrow = c.stage.clientWidth < 560;
  const named = narrow ? NARROW_NAMES : c.bands.length;
  // map.project returns a maplibregl.Point ({x, y}), never an array — not destructurable as [x, y].
  const originPt = shown ? map.project(c.node.seat) : null;

  let arrived = 0;
  let people = 0;
  c.bands.forEach((b, i) => {
    const t = clamp(state.bands - i);
    if (t >= 1) {
      arrived++;
      people += b.people;
    }
    const cut = arcAt(b.coordinates, b.cumulative, t);
    for (const m of c.handle.maps) {
      const source = m.getSource(`band-${b.code}`);
      if (source) source.setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: cut } }] });
    }
    const label = c.labels[b.code];
    if (!shown) {
      label.style.opacity = "0";
      return;
    }
    // The name beyond the seat, on the side away from the node — never on its own band.
    const p = map.project(b.seat);
    const px = p.x;
    const py = p.y;
    const dx = px - originPt.x;
    const dy = py - originPt.y;
    const len = Math.hypot(dx, dy) || 1;
    label.style.left = `${px + (dx / len) * 8}px`;
    label.style.top = `${py + (dy / len) * 8}px`;
    label.style.transform = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "translate(-100%, -50%)" : "translate(0, -50%)") : dy < 0 ? "translate(-50%, -100%)" : "translate(-50%, 0)";
    label.style.opacity = String(i < named ? clamp((t - 0.85) / 0.15) : 0);
    label.style.fontWeight = b.top && state.pair > 0.5 ? "700" : "400";
  });
  keepApart(c.bands.map((b) => c.labels[b.code]).filter((l) => Number(l.style.opacity) > 0.05));

  c.nodeLabel.textContent = narrow ? c.originCode : c.originName;
  if (shown) {
    c.nodeLabel.style.left = `${originPt.x}px`;
    c.nodeLabel.style.top = `${originPt.y}px`;
    c.nodeLabel.style.opacity = "1";
  } else c.nodeLabel.style.opacity = "0";

  const share = (people / c.total) * 100;
  const text = c.count.dataset.template.replace("{p}", share.toFixed(1).replace(".", ","));
  if (c.count.textContent !== text) c.count.textContent = text;
  const tracing = clamp(state.bands / c.bands.length);
  const othersAmount = clamp(state.others);
  showOneNote([
    [c.count, tracing * (1 - othersAmount)],
    [c.totalNote, 1 - tracing],
    [c.othersNote, othersAmount * (1 - clamp(state.key))],
  ]);
  c.key.style.opacity = String(Math.max(clamp(state.key), tracing));
}

/** Two labels that would touch, or nearly: the later one steps down under the earlier one. A `PAD` px margin
 *  around every box, or two names in a crowded fan (ten hosts, 340 px wide) clear the strict overlap test with
 *  a hairline gap between them and still read as run together. */
const PAD = 3;
function keepApart(nodes) {
  const boxes = [];
  for (const node of nodes) {
    node.style.marginTop = "0px";
    let r = node.getBoundingClientRect();
    for (let tries = 0; tries < 6; tries++) {
      const hit = boxes.find((b) => r.left < b.right + PAD && r.right > b.left - PAD && r.top < b.bottom + PAD && r.bottom > b.top - PAD);
      if (!hit) break;
      node.style.marginTop = `${Number.parseFloat(node.style.marginTop) + (hit.bottom - r.top) + PAD + 1}px`;
      r = node.getBoundingClientRect();
    }
    boxes.push(r);
  }
}

function setUpFlow(root) {
  const data = JSON.parse(root.querySelector("[data-flow]").getAttribute("data-flow"));
  const plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
  const repaint = () => {
    if (root.dataset.state) applyFlowState(root, JSON.parse(root.dataset.state));
  };
  const handle = initScrollyMap(root, plan, { window, preserveDrawingBuffer: /[?&]verify/.test(location.search), onShown: repaint, onReady: repaint });
  root.__handle = handle;
  window.__scrollyMap = handle;
  root.__flow = {
    ...data,
    plan,
    handle,
    node: plan.node,
    bands: plan.bands,
    stage: root.querySelector('[data-part="stage"]'),
    fallbacks: Array.from(root.querySelectorAll("[data-fallback]")),
    labels: Object.fromEntries(plan.bands.map((b) => [b.code, root.querySelector(`[data-label="${b.code}"]`)])),
    nodeLabel: root.querySelector('[data-part="node-label"]'),
    count: root.querySelector('[data-part="count"]'),
    totalNote: root.querySelector('[data-part="total-note"]'),
    othersNote: root.querySelector('[data-part="others-note"]'),
    key: root.querySelector('[data-part="key"]'),
  };
}

// The header's notes share one slot: only the strongest shows, at its lead over the next, so two notes never
// overlap while the scroll crossfades between them — each fades out to nothing before the next fades in.
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
