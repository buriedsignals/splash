// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   spread   every country a thin row, largest first, travelling to the podium: the ten keep a row each, every
//            other country laid end to end into one row                                                   0..1
//   rest     the row of the others named and written                                                      0..1
//   rank     the ten named and written, from the tenth up to the second                                   0..1
//   subject  the first row in the accent, named and written                                               0..1
//   stack    the next few slid end to end into the second row against the first; the rest stepping back   0..1
//   note     which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: names in a left column, one value scale from zero
// shared by every picture, a value written after its bar.

export function applyBarState(root, state, context) {
  const carrier = root.querySelector("[data-bar]");
  if (!carrier) return;
  if (context.resized || !root.__bar) seatBar(root, carrier);
  const c = root.__bar;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const narrow = SW < 560;
  const spread = ease(clamp(state.spread));
  const restOn = clamp(state.rest);
  const rank = clamp(state.rank);
  const subjectOn = clamp(state.subject);
  const stack = ease(clamp(state.stack));

  const gap = narrow ? 8 : 12;
  const x0 = c.nameW + gap;
  const x1 = SW - c.valueW - gap;
  const top = 2;
  const bottom = SH - 2;
  const max = c.top[0];
  const X = (v) => x0 + (v / max) * (x1 - x0);
  const count = c.top.length + c.tail.length;
  const tailH = (bottom - top) / count;
  const podiumH = (bottom - top) / (c.top.length + 1);
  const thinY = (index) => top + (index + 0.5) * tailH;
  const slotY = (slot) => top + (slot + 0.5) * podiumH;
  const thick = lerp(Math.max(1, tailH * 0.75), Math.min(podiumH * 0.62, 36), spread);

  set(c.baseline, { x1: x0, x2: x0, y1: top, y2: bottom });

  // The others: each at its own thin row, then laid end to end into the last row, which settles into one bar so the
  // seams between 205 slivers do not read as a texture.
  const merged = clamp((spread - 0.85) / 0.15);
  set(c.rest, { x: x0, y: slotY(c.top.length) - thick / 2, width: X(c.tailSum) - x0, height: thick, opacity: merged * (1 - 0.7 * stack) });
  c.tailNodes.forEach((node, j) => {
    const y = lerp(thinY(c.top.length + j), slotY(c.top.length), spread);
    const from = lerp(0, c.tailCum[j], spread);
    set(node, { x: X(from), y: y - thick / 2, width: Math.max(0, X(from + c.tail[j]) - X(from)), height: thick, opacity: (1 - merged) * (1 - 0.7 * stack) });
  });
  const restY = slotY(c.top.length);
  Object.assign(c.restName.style, { left: `${x0 - gap}px`, top: `${restY}px`, transform: "translate(-100%, -50%)", opacity: String(spread * restOn) });
  Object.assign(c.restValue.style, { left: `${X(c.tailSum) + 6}px`, top: `${restY}px`, transform: "translateY(-50%)", opacity: String(spread * restOn * (1 - stack)) });

  // The ten: rows of their own; on the stack card the next few slide end to end into the second row.
  let stacked = 0;
  c.topNodes.forEach(({ bar, name, value }, i) => {
    const inStack = i >= 1 && i <= c.stackCount;
    const baseY = lerp(thinY(i), slotY(i), spread);
    const y = inStack ? lerp(baseY, slotY(1), stack) : baseY;
    const from = inStack ? lerp(0, stacked, stack) : 0;
    if (inStack) stacked += c.top[i];
    const kept = i === 0 || inStack ? 1 : 1 - 0.7 * stack;
    set(bar, { x: X(from), y: y - thick / 2, width: X(from + c.top[i]) - X(from), height: thick, opacity: kept, "stroke-width": inStack ? 1.5 * stack : 0 });

    // From the tenth up to the second, one name after another; the first waits for its own card.
    const shown = i === 0 ? subjectOn : clamp(rank * (c.top.length - 1) - (c.top.length - 1 - i));
    const stepAside = i === 0 ? 1 : inStack ? 1 - stack : 1 - 0.7 * stack;
    Object.assign(name.style, { left: `${x0 - gap}px`, top: `${slotY(i)}px`, transform: "translate(-100%, -50%)", opacity: String(shown * spread * stepAside) });
    Object.assign(value.style, { left: `${X(c.top[i]) + 6}px`, top: `${slotY(i)}px`, transform: "translateY(-50%)", opacity: String(shown * spread * stepAside) });
  });
  const first = c.topNodes[0].bar;
  set(c.subject, { x: first.getAttribute("x"), y: first.getAttribute("y"), width: first.getAttribute("width"), height: thick, opacity: subjectOn });

  // The stack against the first: its name in the second row, its sum at its end, the first's length ruled down.
  Object.assign(c.stackName.style, { left: `${x0 - gap}px`, top: `${slotY(1)}px`, transform: "translate(-100%, -50%)", opacity: String(stack) });
  Object.assign(c.stackValue.style, { left: `${X(c.stackSum) + 6}px`, top: `${slotY(1)}px`, transform: "translateY(-50%)", opacity: String(clamp((stack - 0.5) / 0.5)) });
  set(c.rule, { x1: X(max), x2: X(max), y1: slotY(0) - thick / 2, y2: slotY(1) + thick / 2 + 4, opacity: stack });

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - 2 * Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function seatBar(root, carrier) {
  const data = root.__barData || (root.__barData = JSON.parse(carrier.getAttribute("data-bar")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const w = (node) => node.getBoundingClientRect().width;
  const tailCum = [];
  let run = 0;
  for (const v of data.tail) {
    tailCum.push(run);
    run += v;
  }
  const topNodes = data.top.map((_, i) => ({ bar: q(`[data-top="${i}"]`), name: q(`[data-name="${i}"]`), value: q(`[data-value="${i}"]`) }));
  const restName = q('[data-part="rest-name"]');
  const restValue = q('[data-part="rest-value"]');
  const stackName = q('[data-part="stack-name"]');
  const stackValue = q('[data-part="stack-value"]');
  root.__bar = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    baseline: q('[data-part="baseline"]'),
    subject: q('[data-part="subject"]'),
    rule: q('[data-part="rule"]'),
    rest: q('[data-part="rest"]'),
    tailNodes: data.tail.map((_, j) => q(`[data-tail="${j}"]`)),
    tailCum,
    tailSum: run,
    stackSum: data.top.slice(1, data.stackCount + 1).reduce((s, v) => s + v, 0),
    topNodes,
    restName,
    restValue,
    stackName,
    stackValue,
    nameW: Math.max(w(restName), w(stackName), ...topNodes.map((t) => w(t.name))),
    valueW: Math.max(w(restValue), w(stackValue), ...topNodes.map((t) => w(t.value))),
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
