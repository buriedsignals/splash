// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option AFTER
// `scatter-layout.mjs`, whose `scatterLayout` and `arcAt` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   travel   each country from its 2000 ring along its arc to 2024; the arc drawn as far as it has gone
//   up       the "cleaner at home" counter
//   filter   the countries that did not move left stepping back to a neutral
//   subject  the subject's arc in the accent, its two moves counted, the others stepping back
//   zoom     the x domain closing from the whole axis onto the crowd near the origin
//
// ON EVERY PAINT the field is laid out in the plot's own pixels (the SVG's viewBox is the plot box), so a
// disc is a disc at every width. Names are seated after it: the subject first, then the countries the
// current card is about, then the rest by weight; each tries eight offsets around its disc, degrades to
// its three-letter code, and is dropped only when neither fits — the static plate's own rule.

export function applyScatterState(root, state) {
  const carrier = root.querySelector("[data-scatter]");
  if (!carrier) return;
  const c = root.__scatter || (root.__scatter = seat(root, carrier));
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const W = c.plot.clientWidth;
  const H = c.plot.clientHeight;
  if (!(W > 0 && H > 0)) return;
  const R = Math.max(4, Math.min(7, W / 220));
  const z = ease(clamp(state.zoom));
  const xMax = c.data.xMax + (c.data.zoomMax - c.data.xMax) * z;
  const layout = scatterLayout(c.data.entities, { width: W, height: H, xMax, inset: R + 2 });
  c.field.setAttribute("viewBox", `0 0 ${W} ${H}`);
  for (const line of c.grid) {
    const yv = layout.y(Number(line.dataset.grid));
    line.setAttribute("x1", "0");
    line.setAttribute("x2", String(W));
    line.setAttribute("y1", String(yv));
    line.setAttribute("y2", String(yv));
  }
  for (const tick of c.yTicks) tick.style.top = `${layout.y(Number(tick.dataset.ytick))}px`;

  const t = ease(clamp(state.travel));
  const discs = [];
  c.data.entities.forEach((e, i) => {
    const s = layout.seats[i];
    const nodes = c.nodes[i];
    const isSubject = e.code === c.data.subject;
    const inView = Math.max(e.from.weight, e.to.weight) <= xMax * 1.001 ? 1 : clamp(1 - (Math.max(e.from.weight, e.to.weight) - xMax) / (xMax * 0.15));
    const { point, partial } = arcAt(s.p0, s.c, s.p1, Math.max(t, 0.0001));
    nodes.arc.setAttribute("d", partial);
    nodes.arc.style.opacity = t > 0.001 ? "1" : "0";
    nodes.ring.setAttribute("cx", String(s.p0[0]));
    nodes.ring.setAttribute("cy", String(s.p0[1]));
    nodes.ring.setAttribute("r", String(R));
    nodes.disc.setAttribute("cx", String(point[0]));
    nodes.disc.setAttribute("cy", String(point[1]));
    nodes.disc.setAttribute("r", String(R));
    nodes.disc.style.opacity = String(clamp(t * 4));

    const stepBack = Math.max(state.filter * (e.lighter ? 0 : 1), state.subject * (isSubject ? 0 : 1));
    const colour = isSubject && state.subject > 0.5 ? c.data.colours.accent : mixHex(c.data.colours.context, c.data.colours.faded, stepBack);
    nodes.arc.setAttribute("stroke", colour);
    nodes.ring.setAttribute("stroke", colour);
    nodes.disc.setAttribute("fill", colour);
    nodes.group.style.opacity = String(inView);
    discs.push({ e, point, inView, stepBack, isSubject, name: nodes.name });
  });

  // Names, in priority, seated around their disc.
  const priority = (d) => (d.isSubject ? 0 : d.stepBack < 0.5 && (state.filter > 0.5 || state.subject > 0.5) ? 1 : 2);
  const order = [...discs].sort((a, b) => priority(a) - priority(b) || b.e.to.weight - a.e.to.weight);
  const taken = discs.filter((d) => d.inView > 0.5).map((d) => ({ x0: d.point[0] - R - 1, y0: d.point[1] - R - 1, x1: d.point[0] + R + 1, y1: d.point[1] + R + 1 }));
  const labelsOn = clamp(t * 2 - 1);
  const offsets = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
  for (const d of order) {
    const node = d.name;
    // The subject is named from the first card: it is the one the 2000 reading points at.
    const on = d.isSubject ? 1 : labelsOn;
    if (d.inView < 0.5 || on <= 0) {
      node.style.opacity = "0";
      continue;
    }
    let placed = null;
    for (const text of [node.dataset.full, d.e.code]) {
      if (node.textContent !== text) node.textContent = text;
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      for (const [ox, oy] of offsets) {
        const cx = d.point[0] + ox * (R + 3 + w / 2);
        const cy = d.point[1] + oy * (R + 2 + h / 2);
        const box = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
        if (box.x0 < 0 || box.x1 > W || box.y0 < 0 || box.y1 > H) continue;
        if (taken.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue;
        placed = { box, cx, cy };
        break;
      }
      if (placed) break;
    }
    if (!placed) {
      node.style.opacity = "0";
      continue;
    }
    taken.push(placed.box);
    node.style.left = `${placed.cx}px`;
    node.style.top = `${placed.cy}px`;
    node.style.transform = "translate(-50%, -50%)";
    node.style.color = d.isSubject && state.subject > 0.5 ? c.data.colours.accent : c.data.colours.name;
    node.style.opacity = String(on * (1 - 0.65 * d.stepBack));
  }

  // Ticks: one set at a time.
  for (const tick of c.xTicks) {
    const value = Number(tick.dataset.xtick);
    const shown = (tick.dataset.set === "zoom") === z >= 0.5;
    tick.style.left = `${layout.x(value)}px`;
    tick.style.opacity = shown && value <= xMax ? "1" : "0";
  }

  const up = c.up;
  const upText = up.dataset.template.replace("{n}", String(Math.round(Number(up.dataset.value) * clamp(state.up * 2))));
  if (up.textContent !== upText) up.textContent = upText;
  up.style.opacity = String(state.up);
  c.subjectCounts.style.opacity = String(state.subject);
}

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seat(root, carrier) {
  const data = JSON.parse(carrier.getAttribute("data-scatter"));
  const field = root.querySelector('[data-part="field"]');
  field.setAttribute("preserveAspectRatio", "none");
  return {
    data,
    field,
    plot: root.querySelector('[data-part="plot"]'),
    grid: Array.from(field.querySelectorAll("[data-grid]")),
    yTicks: Array.from(root.querySelectorAll("[data-ytick]")),
    xTicks: Array.from(root.querySelectorAll("[data-xtick]")),
    up: root.querySelector('[data-part="up-count"]'),
    subjectCounts: root.querySelector('[data-part="subject-counts"]'),
    nodes: data.entities.map((e) => {
      const group = field.querySelector(`[data-entity="${e.code}"]`);
      return {
        group,
        arc: group.querySelector('[data-part="arc"]'),
        ring: group.querySelector('[data-part="ring"]'),
        disc: group.querySelector('[data-part="disc"]'),
        name: root.querySelector(`[data-name="${e.code}"]`),
      };
    }),
  };
}
