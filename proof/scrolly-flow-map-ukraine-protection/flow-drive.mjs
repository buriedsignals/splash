// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER
// `reveal.mjs`, whose `fitViewBox` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   bands    how many of the drawn bands have been traced, largest first; a fraction is a band part-way   0..n
//   others   the countries too small for a band, a dot each                                               0..1
//   pair     the two largest hosts named together                                                         0..1
//   key      the width key                                                                                0..1
//
// THE CAMERA is the box the drawn bands need, fitted to the stage (`fitViewBox`). WIDTHS ARE PIXELS: the widest
// band takes the width the stage allows and every other its share of it, so a band is as thick on a phone as its
// number says relative to the others, never a slab. A band is traced by its dash offset along its own length.

const NARROW_NAMES = 5;

export function applyFlowState(root, state, context) {
  const carrier = root.querySelector("[data-flow]");
  if (!carrier) return;
  if (!root.__flow) seatFlow(root, carrier);
  const c = root.__flow;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  // Room kept inside the stage for what hangs off the box: the names left of the western hosts, the node's disc
  // right of the origin. Without it a phone cut Ukraine's node and every western name at the edges.
  // On a narrow stage only the largest bands carry a name — ten names in a fan 340 px wide piled on each other —
  // and the node is the origin's code in a small disc.
  const narrow = SW < 560;
  const named = narrow ? NARROW_NAMES : c.bands.length;
  c.nodeLabel.textContent = narrow ? c.originCode : c.originName;
  const nodeR = Math.max(c.nodeLabel.offsetWidth / 2 + (narrow ? 5 : 8), narrow ? 12 : 18);
  const labelW = Math.max(...c.bands.slice(0, named).map((b) => b.label.offsetWidth));
  const insets = { top: 18, right: nodeR + 6, bottom: 18, left: Math.min(labelW + 14, SW * 0.4) };
  const vb = fitViewBox(c.focus, { width: SW, height: SH }, insets);
  // On a narrow stage the fan sits in the upper part: the card comes to rest across the middle.
  if (narrow) vb.y += c.focus.y + c.focus.h / 2 - (vb.y + 0.3 * vb.h);
  c.svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.svg.setAttribute("preserveAspectRatio", "none");
  const ppu = SW / vb.w;
  const wMax = Math.max(8, Math.min(18, SW / 70));
  const maxPeople = c.bands[0].people;

  let carried = 0;
  c.bands.forEach((band, i) => {
    const progress = clamp(state.bands - i);
    carried += band.people * progress;
    const w = Math.max(1, (wMax * band.people) / maxPeople);
    band.path.setAttribute("stroke-width", String(w / ppu));
    band.path.style.strokeDashoffset = String(1 - progress);
    band.path.style.opacity = progress > 0.001 ? "1" : "0";
    const [sx, sy] = band.seat;
    const px = (sx - vb.x) * ppu;
    const py = (sy - vb.y) * ppu;
    // The name beyond the end of its band, on the side away from the origin.
    const dx = sx - c.origin[0];
    const dy = sy - c.origin[1];
    const len = Math.hypot(dx, dy) || 1;
    const label = band.label;
    const ox = (dx / len) * 8;
    const oy = (dy / len) * 8;
    label.style.left = `${px + ox}px`;
    label.style.top = `${py + oy}px`;
    label.style.transform = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "translate(-100%, -50%)" : "translate(0, -50%)") : dy < 0 ? "translate(-50%, -100%)" : "translate(-50%, 0)";
    label.style.opacity = String(i < named ? clamp((progress - 0.85) / 0.15) : 0);
    label.style.fontWeight = band.subject || (state.pair > 0.5 && i < 2) ? "700" : "";
  });
  keepApart(c.bands.map((b) => b.label).filter((l) => Number(l.style.opacity) > 0.05));

  for (const dot of c.others) {
    const [sx, sy] = dot.seat;
    dot.el.setAttribute("cx", String(sx));
    dot.el.setAttribute("cy", String(sy));
    dot.el.setAttribute("r", String(2.6 / ppu));
    dot.el.style.opacity = String(clamp(state.others));
  }

  const [ox, oy] = c.origin;
  c.node.setAttribute("cx", String(ox));
  c.node.setAttribute("cy", String(oy));
  c.node.setAttribute("r", String(nodeR / ppu));
  c.node.setAttribute("stroke-width", String(1.5 / ppu));
  c.nodeLabel.style.left = `${(ox - vb.x) * ppu}px`;
  c.nodeLabel.style.top = `${(oy - vb.y) * ppu}px`;

  const share = (carried / c.total) * 100;
  const text = c.count.dataset.template.replace("{p}", share.toFixed(1).replace(".", ","));
  if (c.count.textContent !== text) c.count.textContent = text;
  const tracing = clamp(state.bands);
  c.count.style.opacity = String(tracing * (1 - clamp(state.others)));
  c.totalNote.style.opacity = String(1 - tracing);
  c.othersNote.style.opacity = String(clamp(state.others) * (1 - clamp(state.key)));
  c.key.style.opacity = String(Math.max(clamp(state.key), tracing));
  for (const swatch of c.swatches) swatch.style.height = `${Math.max(1, (wMax * Number(swatch.dataset.people)) / maxPeople)}px`;
}

/** Two names that would touch: the later one steps down under the earlier one. */
function keepApart(nodes) {
  const boxes = [];
  for (const node of nodes) {
    node.style.marginTop = "0px";
    let r = node.getBoundingClientRect();
    for (let tries = 0; tries < 4; tries++) {
      const hit = boxes.find((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
      if (!hit) break;
      node.style.marginTop = `${Number.parseFloat(node.style.marginTop) + (hit.bottom - r.top) + 1}px`;
      r = node.getBoundingClientRect();
    }
    boxes.push(r);
  }
}

function seatFlow(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-flow"));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector('[data-part="field"]');
  root.__flow = {
    ...data,
    stage,
    svg,
    bands: data.bands.map((b) => ({
      ...b,
      path: svg.querySelector(`[data-band="${b.code}"]`),
      label: stage.querySelector(`[data-band-label="${b.code}"]`),
    })),
    others: data.others.map((o) => ({ ...o, el: svg.querySelector(`[data-other="${o.code}"]`) })),
    node: svg.querySelector('[data-part="node"]'),
    nodeLabel: stage.querySelector('[data-part="node-label"]'),
    count: root.querySelector('[data-part="count"]'),
    totalNote: root.querySelector('[data-part="total-note"]'),
    othersNote: root.querySelector('[data-part="others-note"]'),
    key: root.querySelector('[data-part="key"]'),
    swatches: Array.from(root.querySelectorAll("[data-people]")),
  };
  root.__flow.originName = root.__flow.nodeLabel.textContent;
}
