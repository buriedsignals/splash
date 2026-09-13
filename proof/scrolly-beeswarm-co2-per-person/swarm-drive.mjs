// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option
// AFTER `swarm-layout.mjs`, whose `layoutSwarm`, `packSwarm` and `verticalSeat` it calls.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   grow   the dots swelling to their population, the field re-packing around them  0..1
//   first  the largest circle ringed, its card and its hairline                     0..1
//   mean   the world average's rule and label                                       0..1
//   below  the filter to the people under the average, and its counter              0..1
//   tail   the filter to the countries past the threshold, and its counter           0..1
//   far    the farthest circle ringed, its card and its hairline                    0..1
//
// TWO PACKINGS, ONE FIELD. On every resize the swarm is packed twice in the plot's own pixels: once as
// dots of one radius (position is the only channel) and once at population (the static plate's own
// ladder). `grow` interpolates every circle between its two seats, so the reader watches the same 213
// marks swell and push each other apart — never a cut between two pictures. The filters interpolate each
// circle's fill between the field's tint and a neutral.

export function applySwarmState(root, state, context) {
  if (context.resized || !root.__swarm) seatSwarm(root);
  const c = root.__swarm;
  if (!c) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  for (const circle of c.circles) {
    const cy = lerp(circle.eq.cy, circle.pop.cy, state.grow);
    const r = lerp(circle.eq.r, circle.pop.r, state.grow);
    circle.el.setAttribute("cy", String(c.midline + cy));
    circle.el.setAttribute("r", String(r));
    const keep = clamp(1 - state.below * (circle.tonnes > c.mean ? 1 : 0) - state.tail * (circle.tonnes <= c.high ? 1 : 0));
    circle.el.setAttribute("fill", lerpHex(c.colours.neutral, c.colours.swarm, keep));
  }

  for (const [role, value] of [
    ["first", state.first],
    ["far", state.far],
  ])
    for (const node of root.querySelectorAll(`[data-role="${role}"]`)) node.style.opacity = String(value * clamp(state.grow * 4 - 3));
  for (const name of ["mean", "mean-label"]) {
    const node = root.querySelector(`[data-part="${name}"]`);
    if (node) node.style.opacity = String(state.mean);
  }
  for (const [name, value] of [
    ["mean-count", state.below],
    ["tail-count", state.tail],
  ]) {
    const node = root.querySelector(`[data-part="${name}"]`);
    if (!node) continue;
    const target = Number(node.dataset.value);
    const decimals = String(node.dataset.value).includes(".") ? 1 : 0;
    // Counted over the first half of the fade: arriving, the figure climbs; leaving, it stays whole while
    // it fades, rather than counting back down to zero in front of the reader.
    const running = (target * clamp(value * 2)).toFixed(decimals).replace(".", ",");
    const text = node.dataset.template.replace("{n}", running);
    if (node.textContent !== text) node.textContent = text;
    node.style.opacity = String(value);
  }
}

function lerpHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

export function seatSwarm(root) {
  const carrier = root.querySelector("[data-swarm]");
  const plot = root.querySelector('[data-part="plot"]');
  const field = root.querySelector('[data-part="field"]');
  if (!carrier || !plot || !field) throw new Error("this visual carries no swarm, plot or field to seat");
  const { marks, xMax } = JSON.parse(carrier.getAttribute("data-swarm"));
  const W = plot.clientWidth;
  const H = plot.clientHeight;
  if (!(W > 0 && H > 0)) return;

  const cardNodes = Array.from(root.querySelectorAll('[data-part="card"]'));
  for (const node of cardNodes) node.style.width = "auto";
  const cardHeight = Math.max(...cardNodes.map((n) => n.offsetHeight));
  const cardRoom = cardHeight + 10;
  const meanLabel = root.querySelector('[data-part="mean-label"]');
  const meanCount = root.querySelector('[data-part="mean-count"]');
  const labelHeight = (meanLabel ? meanLabel.offsetHeight : 0) + (meanCount ? meanCount.offsetHeight : 0);
  const band = H - cardRoom - 4 - labelHeight;
  const tickNodes = Array.from(root.querySelectorAll("[data-tick]"));
  const nameNode = root.querySelector('[data-part="axis-name"]');
  const cards = JSON.parse(carrier.getAttribute("data-cards"));

  const layout = layoutSwarm({
    marks,
    xMax,
    width: W,
    bandHeight: band,
    cards: cardNodes.map((n) => ({ code: cards.find((k) => k.role === n.getAttribute("data-role")).code, width: n.offsetWidth })),
    ticks: tickNodes.map((n) => ({ value: Number(n.getAttribute("data-tick")), width: n.offsetWidth })),
    nameWidth: nameNode ? nameNode.offsetWidth : 0,
  });
  // The dots before their surfaces mean anything: one radius, the same packing rule.
  const dots = packSwarm(marks, layout.x, layout.maxRadius, 2.4);
  root.dataset.maxRadius = String(layout.maxRadius);
  root.dataset.swarmFits = layout.fits ? "1" : "0";

  field.setAttribute("viewBox", `0 0 ${W} ${H}`);
  field.setAttribute("preserveAspectRatio", "none");
  const { cardsTop, midline, bandTop, bandBottom } = verticalSeat({ height: H, cardRoom, extent: layout.extent, labelHeight });
  const pop = new Map(layout.circles.map((p) => [p.code, p]));
  const eq = new Map(dots.placed.map((p) => [p.code, p]));
  const tonnes = new Map(marks.map((m) => [m.code, m.tonnes]));
  const circles = Array.from(field.querySelectorAll("[data-circle]")).map((el) => {
    const code = el.getAttribute("data-circle");
    el.setAttribute("cx", String(pop.get(code).cx));
    return { el, tonnes: tonnes.get(code), pop: pop.get(code), eq: eq.get(code) };
  });

  for (const placed of layout.cards) {
    const circle = placed.circle;
    const role = cards.find((k) => k.code === placed.code).role;
    const group = field.querySelector(`g[data-role="${role}"]`);
    const card = root.querySelector(`[data-part="card"][data-role="${role}"]`);
    if (group) {
      const ring = group.querySelector('[data-part="ring"]');
      ring.setAttribute("cx", String(circle.cx));
      ring.setAttribute("cy", String(midline + circle.cy));
      ring.setAttribute("r", String(circle.r + 1.6));
      const leader = group.querySelector('[data-part="leader"]');
      leader.setAttribute("x1", String(circle.cx));
      leader.setAttribute("x2", String(circle.cx));
      leader.setAttribute("y1", String(cardsTop + card.offsetHeight + 3));
      leader.setAttribute("y2", String(midline + circle.cy - circle.r - 2));
    }
    card.style.left = `${placed.left}px`;
    card.style.top = `${cardsTop}px`;
    card.style.textAlign = placed.anchor === "middle" ? "center" : placed.anchor === "end" ? "right" : "left";
  }

  const mean = Number(carrier.getAttribute("data-mean"));
  const high = Number(carrier.getAttribute("data-high"));
  const meanLine = root.querySelector('[data-part="mean"]');
  meanLine.setAttribute("x1", String(layout.x(mean)));
  meanLine.setAttribute("x2", String(layout.x(mean)));
  meanLine.setAttribute("y1", String(bandTop));
  meanLine.setAttribute("y2", String(bandBottom + 4 + labelHeight));
  if (meanLabel) {
    meanLabel.style.left = `${layout.x(mean) + 6}px`;
    meanLabel.style.top = `${bandBottom + 4}px`;
  }
  if (meanCount) {
    meanCount.style.left = `${layout.x(mean) + 6}px`;
    meanCount.style.top = `${bandBottom + 4 + (meanLabel ? meanLabel.offsetHeight : 0)}px`;
  }
  const tailCount = root.querySelector('[data-part="tail-count"]');
  if (tailCount) {
    // At the top of the band on the right, over the tail and clear of the dense field on the left. On
    // the swarm's own midline it sat under every travelling card and, on a phone, over the largest
    // circles; it wraps rather than run into the field.
    tailCount.style.whiteSpace = "normal";
    tailCount.style.textAlign = "right";
    tailCount.style.maxWidth = `${Math.max(W - layout.x(high), W * 0.55)}px`;
    tailCount.style.left = "auto";
    tailCount.style.right = "0px";
    tailCount.style.top = `${bandTop + 2}px`;
  }

  const shown = new Set(layout.shownTicks.map((t) => t.value));
  for (const node of tickNodes) {
    const value = Number(node.getAttribute("data-tick"));
    node.style.left = `${layout.x(value)}px`;
    node.style.visibility = shown.has(value) ? "visible" : "hidden";
  }

  root.__swarm = { circles, midline, mean, high, colours: JSON.parse(carrier.getAttribute("data-colours")) };
}
