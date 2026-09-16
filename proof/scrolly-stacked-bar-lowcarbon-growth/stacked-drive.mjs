// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   grow     the growth segments growing onto the 2000 levels, the totals written                          0..1
//   sort     the rows travelling from the order of their 2000 level to the order of their growth           0..1
//   detach   the levels leaving, the growth segments sliding onto one baseline, the scale fitted to them   0..1
//   pair     the pair alone, every other row stepping back                                                 0..1
//   note     which header note is read                                                                     0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: names in a left column, totals in a right one, one
// scale between; a segment's number is written inside it when it fits, and past the bar as one run when it does not.

export function applyStackedState(root, state, context) {
  const carrier = root.querySelector("[data-stacked]");
  if (!carrier) return;
  if (context.resized || !root.__stacked) seatStacked(root, carrier);
  const c = root.__stacked;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const grow = ease(clamp(state.grow));
  const sort = ease(clamp(state.sort));
  const detach = ease(clamp(state.detach));
  const pair = clamp(state.pair);
  const n = c.rows.length;
  const rowH = SH / n;
  const barH = Math.max(8, Math.min(rowH * 0.66, 34));
  const nameW = Math.max(...c.rows.map((r) => r.name.offsetWidth));
  const totalW = Math.max(...c.rows.map((r) => r.total.offsetWidth));
  const x0 = nameW + 10;
  const x1 = SW - totalW - 14;
  const maxTotal = Math.max(...c.rows.map((r) => r.total_));
  const maxGrowth = Math.max(...c.rows.map((r) => r.growth));
  // Detached, the scale fits the largest growth, with room for its number past the bar.
  const domain = lerp(maxTotal, maxGrowth * 1.15, detach);
  const px = (v) => (v / domain) * (x1 - x0);

  c.rows.forEach((r, i) => {
    const slotA = c.orders[0].indexOf(i);
    const slotB = c.orders[1].indexOf(i);
    const y = lerp(slotA, slotB, sort) * rowH + rowH / 2;
    const kept = r.pair ? 1 : 1 - 0.8 * pair;
    const levelW = px(r.level) * (1 - detach);
    const growthW = px(r.growth) * grow;
    const levelX = x0;
    const growthX = x0 + levelW;
    Object.assign(r.name.style, { left: `${x0 - 10 - r.name.offsetWidth}px`, top: `${y}px`, transform: "translateY(-50%)", opacity: String(kept) });
    Object.assign(r.levelBar.style, { left: `${levelX}px`, top: `${y - barH / 2}px`, width: `${Math.max(0, levelW)}px`, height: `${barH}px`, opacity: String(kept * (1 - detach)) });
    Object.assign(r.growthBar.style, { left: `${growthX}px`, top: `${y - barH / 2}px`, width: `${Math.max(0, growthW)}px`, height: `${barH}px`, opacity: String(kept) });

    // A number inside its own segment when it fits. A level too narrow writes both numbers past the bar as one run;
    // a growth too narrow writes its own past the bar — or, where the totals column leaves no room, just inside the
    // level segment's end.
    const levelFits = levelW > r.levelText.offsetWidth + 8;
    const growthFits = growthW > r.growthText.offsetWidth + 8;
    const end = growthX + growthW;
    const room = SW - totalW - 8;
    Object.assign(r.levelText.style, { left: `${levelX + levelW / 2}px`, top: `${y}px`, transform: "translate(-50%, -50%)", opacity: String(kept * (levelFits ? 1 : 0) * (1 - detach)) });
    Object.assign(r.growthText.style, { left: `${growthX + growthW / 2}px`, top: `${y}px`, transform: "translate(-50%, -50%)", opacity: String(kept * (growthFits ? grow : 0)) });
    let runText = r.runText;
    let runLeft = end + 8;
    let runAnchor = "translateY(-50%)";
    let runOn = 0;
    if (detach < 0.5) {
      if (!levelFits) {
        // Both numbers past the bar, as one run; before any growth, the level alone.
        runText = grow <= 0.05 ? r.levelText.textContent : r.runText;
        runOn = grow <= 0.05 ? 1 : grow;
      } else if (!growthFits) {
        runText = `+\u00A0${r.growthText.textContent}`;
        runOn = grow;
        if (end + 8 + r.run.offsetWidth > room) {
          runLeft = growthX - 6;
          runAnchor = "translate(-100%, -50%)";
        }
      }
    }
    if (r.run.textContent !== runText) r.run.textContent = runText;
    Object.assign(r.run.style, { left: `${runLeft}px`, top: `${y}px`, transform: runAnchor, opacity: String(kept * runOn * (1 - detach)) });
    Object.assign(r.growthRun.style, { left: `${end + 8}px`, top: `${y}px`, transform: "translateY(-50%)", opacity: String(kept * detach * (growthFits ? 0 : 1)) });
    // A run past the bar carries the growth's number too, so the segment's own copy steps back.
    if (!levelFits && detach < 0.5) r.growthText.style.opacity = "0";
    Object.assign(r.total.style, { left: `${SW - r.total.offsetWidth}px`, top: `${y}px`, transform: "translateY(-50%)", opacity: String(kept * grow * (1 - detach)) });
  });

  c.levelKey.style.opacity = String(1 - detach);
  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });
}

function seatStacked(root, carrier) {
  const data = root.__stackedData || (root.__stackedData = JSON.parse(carrier.getAttribute("data-stacked")));
  const stage = root.querySelector('[data-part="stage"]');
  const rows = data.rows.map((r) => {
    const el = stage.querySelector(`[data-row="${CSS.escape(r.key)}"]`);
    const part = (name) => el.querySelector(`[data-part="${name}"]`);
    const run = part("run");
    return {
      ...r,
      total_: r.total,
      name: part("name"),
      levelBar: part("level"),
      growthBar: part("growth"),
      levelText: part("level-text"),
      growthText: part("growth-text"),
      run,
      // The full run, kept on the node: a paint may have replaced the text before a resize re-seats.
      runText: run.dataset.full ?? (run.dataset.full = run.textContent),
      growthRun: part("growth-run"),
      total: part("total"),
    };
  });
  root.__stacked = {
    ...data,
    stage,
    rows,
    levelKey: root.querySelector('[data-part="level-key"]'),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
