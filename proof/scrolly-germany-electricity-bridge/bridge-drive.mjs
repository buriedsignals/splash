// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   opening   the opening total rising from zero                                                        0..1
//   ren       the renewables step climbing from the running total                                       0..1
//   nuc       the nuclear step dropping                                                                 0..1
//   fos       the fossil step dropping (first half), then unfolding into its fuels (second half)        0..1
//   unfold    the fossil slot widening into three, one bar per fuel                                     0..1
//   closing   the closing total rising from zero                                                        0..1
//   net       the opening level carried across and the net change bracketed beside the closing total    0..1
//   focus     the steps' values stepping back while the net change is read                              0..1
//
// SLOTS, in the reader's pixels: five columns, the fossil one widening to three as it unfolds. A bar is 62 % of a
// column; its value sits on its growing edge — above a rise and a total, below a fall — never inside it.

export function applyBridgeState(root, state, context) {
  const carrier = root.querySelector("[data-bridge]");
  if (!carrier) return;
  if (context.resized || !root.__bridge) seatBridge(root, carrier);
  const c = root.__bridge;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const plotX0 = c.tickW + 10;
  const plotW = Math.max(60, SW - plotX0 - c.netW - 14);
  // On a narrow stage the card comes to rest across the middle of the plot, over the very levels the steps move
  // through: the plot takes the larger of the two bands the resting card leaves free, above it or below it, and its
  // category row follows it.
  const narrow = SW < 560;
  const stageTop = c.stage.getBoundingClientRect().top;
  const cardTop = window.innerHeight * 0.42 - stageTop;
  const cardBottom = window.innerHeight * 0.63 - stageTop;
  const catH = c.categories.offsetHeight;
  const above = cardTop - catH - 6;
  const below = SH - cardBottom;
  const useBelow = narrow && below > above;
  const bandTop = useBelow ? Math.max(0, cardBottom) : 0;
  const bottom = narrow ? (useBelow ? SH : Math.max(120, Math.min(SH, Math.round(above)))) : SH;
  const top = bandTop + c.valueH + 6;
  const y = (v) => top + (1 - v / c.max) * (bottom - top);
  c.categories.style.transform = `translateY(${bottom - SH}px)`;
  const u = ease(clamp(state.unfold * 2 - 1));
  const fosGrow = ease(clamp(state.fos * 2));
  const weights = { opening: 1, ren: 1, nuc: 1, fos: 1 + 2 * u, closing: 1 };
  const order = ["opening", "ren", "nuc", "fos", "closing"];
  const unitW = plotW / order.reduce((s, k) => s + weights[k], 0);
  const slotX = {};
  let run = plotX0;
  for (const k of order) {
    slotX[k] = run;
    run += weights[k] * unitW;
  }
  const barW = unitW * 0.62;
  const centre = (id) => {
    if (id in slotX) return slotX[id] + (weights[id] * unitW) / 2;
    const k = c.subs.indexOf(id);
    const folded = slotX.fos + (weights.fos * unitW) / 2;
    return lerp(folded, slotX.fos + unitW * (k + 0.5), u);
  };
  const grow = {
    opening: ease(clamp(state.opening)),
    ren: ease(clamp(state.ren)),
    nuc: ease(clamp(state.nuc)),
    fos: fosGrow,
    closing: ease(clamp(state.closing)),
  };

  let running = 0;
  const format = (v) => v.toFixed(1).replace(".", ",");
  for (const bar of c.bars) {
    const isSub = bar.kind === "sub";
    const p = isSub ? 1 : grow[bar.id];
    const shown = isSub ? u : bar.id === "fos" ? (p > 0.001 ? 1 - u : 0) : p > 0.001 ? 1 : 0;
    const start = bar.kind === "total" ? 0 : bar.from;
    const end = lerp(start, bar.to, p);
    const hi = Math.max(start, end);
    const lo = Math.min(start, end);
    const cx = centre(bar.id);
    Object.assign(bar.el.style, { left: `${cx - barW / 2}px`, width: `${barW}px`, top: `${y(hi)}px`, height: `${Math.max(0, y(lo) - y(hi))}px`, opacity: String(shown) });

    // The value on the growing edge.
    const rising = bar.kind === "total" || bar.to >= bar.from;
    const edge = y(end);
    const valueNode = bar.valueEl;
    valueNode.style.left = `${cx}px`;
    valueNode.style.top = `${rising ? edge - 4 : edge + 4}px`;
    valueNode.style.transform = rising ? "translate(-50%, -100%)" : "translate(-50%, 0)";
    const step = bar.kind !== "total";
    valueNode.style.opacity = String(clamp((p - 0.7) / 0.3) * shown * (step ? 1 - 0.65 * clamp(state.focus) : 1));

    // The connector: from this bar's end level to the next bar in its slot order.
    const connector = bar.connectorEl;
    // While the fossil step is unfolded, nuclear's connector runs to coal and oil's to the closing total.
    const next = bar.id === "nuc" && u > 0.5 ? c.subs[0] : bar.id === c.subs[2] ? "closing" : c.nextOf[bar.id];
    const nextShown = next && (c.byId[next].kind === "sub" ? u : grow[next] ?? 0);
    if (next && nextShown > 0.001 && shown > 0.001) {
      const x0 = cx + barW / 2;
      const x1 = centre(next) - barW / 2;
      Object.assign(connector.style, { left: `${x0}px`, width: `${Math.max(0, x1 - x0)}px`, top: `${y(bar.to)}px`, opacity: String(Math.min(shown, clamp(nextShown * 4))) });
    } else connector.style.opacity = "0";

    const category = bar.categoryEl;
    category.style.left = `${cx}px`;
    category.style.width = `${unitW - 4}px`;
    const useShort = c.fullW[bar.id] > unitW - 4;
    const text = useShort ? category.dataset.short : category.dataset.full;
    if (category.textContent !== text) category.textContent = text;
    // A short label still wider than its column: every other one steps down a line.
    const slotIndex = isSub ? 3 + c.subs.indexOf(bar.id) : { opening: 0, ren: 1, nuc: 2, fos: 3, closing: u > 0.5 ? 6 : 4 }[bar.id];
    category.style.top = useShort && c.shortW[bar.id] > unitW - 2 && slotIndex % 2 === 1 ? "1.3em" : "0px";
    category.style.opacity = String(isSub ? u : bar.id === "fos" ? 1 - u : 1);

    if (!isSub && bar.id !== "closing" && p > 0) running = end;
  }
  if (grow.closing > 0.5) running = c.byId.closing.to;

  // The net change: the opening level carried across to the closing total, a bracket beside it.
  const net = clamp(state.net);
  const openY = y(c.byId.opening.to);
  const closeY = y(c.byId.closing.to);
  const closeRight = centre("closing") + barW / 2;
  Object.assign(c.netLine.style, { left: `${centre("opening") + barW / 2}px`, width: `${closeRight - centre("opening") - barW / 2 + 6}px`, top: `${openY}px`, opacity: String(net * 0.8) });
  Object.assign(c.netBracket.style, { left: `${closeRight + 2}px`, top: `${openY}px`, height: `${Math.max(0, closeY - openY)}px`, opacity: String(net) });
  Object.assign(c.netLabel.style, { left: `${closeRight + 14}px`, top: `${(openY + closeY) / 2}px`, transform: "translateY(-50%)", opacity: String(net) });

  for (const g of c.grids) g.style.top = `${y(Number(g.dataset.grid))}px`;
  const runText = c.running.dataset.template.replace("{v}", format(running));
  if (c.running.textContent !== runText) c.running.textContent = runText;
  const notes = { renNote: clamp(state.ren) * (1 - clamp(state.nuc)), nucNote: clamp(state.nuc) * (1 - clamp(state.fos)), fosNote: clamp(state.unfold * 2 - 1), netNote: net * clamp(state.focus) };
  const noteOn = Math.max(...Object.values(notes));
  showOneNote([...Object.entries(c.notes).map(([key, node]) => [node, notes[key]]), [c.running, 1 - noteOn]]);
}

function seatBridge(root, carrier) {
  const data = root.__bridgeData || (root.__bridgeData = JSON.parse(carrier.getAttribute("data-bridge")));
  const stage = root.querySelector('[data-part="stage"]');
  const bars = data.bars.map((b) => ({
    ...b,
    el: stage.querySelector(`[data-bar="${b.id}"]`),
    valueEl: stage.querySelector(`[data-value="${b.id}"]`),
    connectorEl: stage.querySelector(`[data-connector="${b.id}"]`),
    categoryEl: root.querySelector(`[data-category="${b.id}"]`),
  }));
  const byId = Object.fromEntries(bars.map((b) => [b.id, b]));
  const subs = bars.filter((b) => b.kind === "sub").map((b) => b.id);
  const nextOf = { opening: "ren", ren: "nuc", nuc: "fos", fos: "closing", [subs[0]]: subs[1], [subs[1]]: subs[2] };
  const measure = (node, text) => {
    const probe = node.cloneNode(false);
    probe.style.cssText = `${node.style.cssText};position:absolute;visibility:hidden;width:auto;left:0;top:0;transform:none;white-space:nowrap`;
    probe.textContent = text;
    node.parentElement.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };
  const netLabel = stage.querySelector('[data-part="net-label"]');
  root.__bridge = {
    ...data,
    stage,
    bars,
    byId,
    subs,
    nextOf,
    fullW: Object.fromEntries(bars.map((b) => [b.id, measure(b.categoryEl, b.categoryEl.dataset.full)])),
    shortW: Object.fromEntries(bars.map((b) => [b.id, measure(b.categoryEl, b.categoryEl.dataset.short)])),
    categories: root.querySelector('[data-part="categories"]'),
    tickW: Math.max(...Array.from(stage.querySelectorAll("[data-tick]")).map((t) => t.getBoundingClientRect().width)),
    valueH: bars[0].valueEl.getBoundingClientRect().height,
    netW: measure(netLabel, netLabel.textContent),
    grids: Array.from(stage.querySelectorAll("[data-grid]")),
    netLine: stage.querySelector('[data-part="net-line"]'),
    netBracket: stage.querySelector('[data-part="net-bracket"]'),
    netLabel,
    running: root.querySelector('[data-part="running"]'),
    notes: Object.fromEntries(Array.from(root.querySelectorAll("[data-note]")).map((n) => [n.dataset.note, n])),
  };
}

// The header's notes share one slot: only the strongest shows, at its lead over the next, so two notes never overlap
// while the scroll crossfades between them — each fades out to nothing before the next fades in.
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
