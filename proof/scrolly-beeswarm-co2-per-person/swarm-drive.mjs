// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option
// AFTER `swarm-layout.mjs`, whose `layoutSwarm` it calls.
//
// A STATE, field by field:
//   first  the largest circle ringed, its card and its hairline   0..1
//   mean   the world average, its rule and its label              0..1
//   far    the farthest circle ringed, its card and its hairline  0..1
//
// ON EVERY RESIZE THE SWARM IS PACKED AGAIN, in the plot's own pixels: the field's viewBox becomes the
// box the browser laid out, the largest radius is walked down until the swarm fits the band under the
// cards, and the cards, the hairlines, the average and the ticks are re-seated from the same layout.

export function applySwarmState(root, state, context) {
  if (context.resized) seatSwarm(root);
  for (const [role, value] of [
    ["first", state.first],
    ["far", state.far],
  ])
    for (const node of root.querySelectorAll(`[data-role="${role}"]`)) node.style.opacity = String(value);
  for (const name of ["mean", "mean-label"]) {
    const node = root.querySelector(`[data-part="${name}"]`);
    if (node) node.style.opacity = String(state.mean);
  }
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
  const labelHeight = meanLabel ? meanLabel.offsetHeight : 0;
  const band = H - cardRoom - 4 - labelHeight;
  const tickNodes = Array.from(root.querySelectorAll("[data-tick]"));
  const nameNode = root.querySelector('[data-part="axis-name"]');

  const layout = layoutSwarm({
    marks,
    xMax,
    width: W,
    bandHeight: band,
    cards: cardNodes.map((n) => ({ code: n.closest("[data-role]") ? cardCode(root, n) : "", width: n.offsetWidth })),
    ticks: tickNodes.map((n) => ({ value: Number(n.getAttribute("data-tick")), width: n.offsetWidth })),
    nameWidth: nameNode ? nameNode.offsetWidth : 0,
  });
  root.dataset.maxRadius = String(layout.maxRadius);
  root.dataset.swarmFits = layout.fits ? "1" : "0";

  field.setAttribute("viewBox", `0 0 ${W} ${H}`);
  field.setAttribute("preserveAspectRatio", "none");
  const { cardsTop, midline, bandTop, bandBottom } = verticalSeat({ height: H, cardRoom, extent: layout.extent, labelHeight });
  const seat = new Map(layout.circles.map((c) => [c.code, c]));
  for (const node of field.querySelectorAll("[data-circle]")) {
    const c = seat.get(node.getAttribute("data-circle"));
    node.setAttribute("cx", String(c.cx));
    node.setAttribute("cy", String(midline + c.cy));
    node.setAttribute("r", String(c.r));
  }

  for (const placed of layout.cards) {
    const c = placed.circle;
    const role = roleOf(root, placed.code);
    const group = field.querySelector(`g[data-role="${role}"]`);
    const card = root.querySelector(`[data-part="card"][data-role="${role}"]`);
    if (group) {
      const ring = group.querySelector('[data-part="ring"]');
      ring.setAttribute("cx", String(c.cx));
      ring.setAttribute("cy", String(midline + c.cy));
      ring.setAttribute("r", String(c.r + 1.6));
      const leader = group.querySelector('[data-part="leader"]');
      leader.setAttribute("x1", String(c.cx));
      leader.setAttribute("x2", String(c.cx));
      leader.setAttribute("y1", String(cardsTop + card.offsetHeight + 3));
      leader.setAttribute("y2", String(midline + c.cy - c.r - 2));
    }
    card.style.left = `${placed.left}px`;
    card.style.top = `${cardsTop}px`;
    card.style.textAlign = placed.anchor === "middle" ? "center" : placed.anchor === "end" ? "right" : "left";
  }

  const mean = root.querySelector('[data-part="mean"]');
  const meanValue = Number(carrier.getAttribute("data-mean"));
  if (mean && Number.isFinite(meanValue)) {
    mean.setAttribute("x1", String(layout.x(meanValue)));
    mean.setAttribute("x2", String(layout.x(meanValue)));
    mean.setAttribute("y1", String(bandTop));
    mean.setAttribute("y2", String(bandBottom + 4 + labelHeight));
    if (meanLabel) {
      meanLabel.style.left = `${layout.x(meanValue) + 6}px`;
      meanLabel.style.top = `${bandBottom + 4}px`;
      meanLabel.style.bottom = "auto";
    }
  }

  const shown = new Set(layout.shownTicks.map((t) => t.value));
  for (const node of tickNodes) {
    const value = Number(node.getAttribute("data-tick"));
    node.style.left = `${layout.x(value)}px`;
    node.style.visibility = shown.has(value) ? "visible" : "hidden";
  }
}

function roleOf(root, code) {
  const carrier = root.querySelector("[data-swarm]");
  return JSON.parse(carrier.getAttribute("data-cards")).find((c) => c.code === code).role;
}

function cardCode(root, node) {
  const carrier = root.querySelector("[data-swarm]");
  return JSON.parse(carrier.getAttribute("data-cards")).find((c) => c.role === node.getAttribute("data-role")).code;
}
