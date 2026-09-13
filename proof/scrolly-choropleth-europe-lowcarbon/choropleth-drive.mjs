// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   classes    the ramp arriving class by class, lowest first; an unreached class is bare land   0..1
//   filter     every country under the floor stepping back to bare land                         0..1
//   top        the six countries of the north-west named                                          0..1
//   zoom       the camera travelling from Europe onto Albania and its neighbours                   0..1
//   odd        Albania ringed and named, its neighbours named with their shares                    0..1
//   missing    the reporting country with no reading named                                        0..1
//
// THE ZOOM IS THE CAMERA. The SVG's viewBox travels from the whole frame onto the zoom box, eased, and every
// name and sea label is re-placed through the SVG's own screen matrix each paint, so the words stay at
// their register's size while the geography grows. A word whose point leaves the stage fades.

export function applyChoroplethState(root, state, context) {
  const carrier = root.querySelector("[data-choropleth]");
  if (!carrier) return;
  if (context.resized || !root.__choro) seat(root, carrier);
  const c = root.__choro;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const z = ease(clamp(state.zoom));
  const box = {
    x: c.zoomBox.x * z,
    y: c.zoomBox.y * z,
    w: c.width + (c.zoomBox.w - c.width) * z,
    h: c.height + (c.zoomBox.h - c.height) * z,
  };
  // The camera's box, fitted between the overlays and widened to the stage: the map runs edge to edge.
  const vb = fitViewBox(box, { width: c.stage.clientWidth, height: c.stage.clientHeight }, c.insets);
  c.field.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  c.field.setAttribute("preserveAspectRatio", "none");
  const n = c.fills.classes.length;

  for (const shape of c.shapes) {
    let fill = c.fills.missing;
    if (shape.classIndex !== null) {
      const reached = clamp(state.classes * n - shape.classIndex);
      const kept = c.top.includes(shape.iso) ? 1 : 1 - state.filter;
      fill = mix(c.fills.land, c.fills.classes[shape.classIndex], reached * kept);
    }
    shape.el.setAttribute("fill", fill);
  }
  for (const swatch of c.swatches) swatch.style.opacity = String(clamp(state.classes * n - Number(swatch.dataset.classSwatch)));
  // The key arrives with its first class: before any class is drawn it is an empty panel over the map.
  c.key.style.opacity = String(clamp(state.classes * n));

  const stage = c.stage.getBoundingClientRect();
  const matrix = c.field.getScreenCTM();
  const place = (node, x, y, opacity) => {
    if (!matrix) return;
    const px = matrix.a * x + matrix.c * y + matrix.e - stage.left;
    const py = matrix.b * x + matrix.d * y + matrix.f - stage.top;
    node.style.left = `${px}px`;
    node.style.top = `${py}px`;
    const inside = px > 0 && px < stage.width && py > 0 && py < stage.height;
    node.style.opacity = String(inside ? opacity : 0);
  };
  // Close-up names only once the camera has arrived; the odd one's name also at rest on the whole map.
  // Mid-travel, four names seated a few pixels apart piled on each other.
  const arrived = clamp((z - 0.75) / 0.25);
  const atRest = clamp((0.08 - z) / 0.08);
  const weight = { top: state.top * atRest, odd: state.odd * Math.max(arrived, atRest), neighbour: state.odd * arrived, missing: state.missing * atRest };
  for (const name of c.names) {
    const shape = c.shapes.find((s) => s.iso === name.dataset.name);
    if (shape) place(name, shape.seat.x, shape.seat.y, weight[name.dataset.role] ?? 0);
  }
  for (const w of c.waters) place(w, Number(w.dataset.x), Number(w.dataset.y), 1 - z);
  for (const ring of c.rings) ring.style.opacity = String(state.odd * Math.max(arrived, atRest));
  keepApart(c.names, stage);

  const count = c.topCount;
  const text = count.dataset.template.replace("{n}", String(Math.round(Number(count.dataset.value) * clamp(state.filter * 2))));
  if (count.textContent !== text) count.textContent = text;
  count.style.opacity = "1";
  // The panel fades with its counter: an empty panel of the ground reads as a hole in the map.
  count.parentElement.style.opacity = String(state.filter);
}

/** Two names that would touch: the later one steps down under the earlier one. */
function keepApart(nodes, stage) {
  const shown = nodes.filter((n) => Number(n.style.opacity) > 0.01);
  const boxes = [];
  for (const node of shown) {
    node.style.marginTop = "0px";
    let r = node.getBoundingClientRect();
    for (let tries = 0; tries < 4; tries++) {
      const hit = boxes.find((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
      if (!hit) break;
      node.style.marginTop = `${Number.parseFloat(node.style.marginTop) + (hit.bottom - r.top) + 2}px`;
      r = node.getBoundingClientRect();
    }
    boxes.push(r);
  }
}

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seat(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-choropleth"));
  const field = root.querySelector('[data-part="field"]');
  const stageBox = root.querySelector('[data-part="stage"]').getBoundingClientRect();
  const key = root.querySelector('[data-part="key"]').getBoundingClientRect();
  const count = root.querySelector('[data-part="count-panel"]').getBoundingClientRect();
  const side = Math.min(24, stageBox.width * 0.04);
  root.__choro = {
    ...data,
    field,
    // What the overlays take from the stage; the map's frame is fitted inside what is left.
    insets: {
      top: count.bottom - stageBox.top + 6,
      bottom: stageBox.bottom - key.top + 6,
      left: side,
      right: side,
    },
    stage: root.querySelector('[data-part="stage"]'),
    shapes: data.shapes.map((s) => ({ ...s, el: field.querySelector(`[data-shape="${s.iso}"]`) })),
    names: Array.from(root.querySelectorAll("[data-name]")),
    waters: Array.from(root.querySelectorAll("[data-water]")),
    rings: Array.from(root.querySelectorAll('[data-part="odd-ring"]')),
    swatches: Array.from(root.querySelectorAll("[data-class-swatch]")),
    key: root.querySelector('[data-part="key"]'),
    topCount: root.querySelector('[data-part="top-count"]'),
  };
}
