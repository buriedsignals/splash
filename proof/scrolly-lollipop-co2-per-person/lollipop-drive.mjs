// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   before   the earlier stems growing from zero to their level                                      0..1
//   after    the later stems growing beside them                                                     0..1
//   pair     the subject and the country it is compared with drawn to the centre, the other four back 0..1
//   ratio    the two ratios measured between them: a rule at the smaller head, a span to the larger   0..1
//   change   each pair's direction of change, a triangle and its percentage                         0..1
//   share    the six's share of the world's emissions stated                                          0..1
//
// EVERYTHING IS PLACED IN THE READER'S PIXELS on each paint: six slots across the stage, two stems in each; the
// labels under the baseline take the height their text needs. A pair's slot slides when the two compared pairs are
// drawn together.

export function applyLollipopState(root, state, context) {
  const carrier = root.querySelector("[data-lollipops]");
  if (!carrier) return;
  if (context.resized || !root.__lolli) seatLollipops(root, carrier);
  const c = root.__lolli;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const before = ease(clamp(state.before));
  const after = ease(clamp(state.after));
  const pair = ease(clamp(state.pair));
  const ratio = clamp(state.ratio);
  const change = clamp(state.change);
  const n = c.pairs.length;
  const underH = c.yearH + 6 + Math.max(c.changeH, 10 + c.axisPx * 1.3) + c.nameH + 10;
  const top = c.valueH + 10;
  const baseY = SH - underH;
  const y = (v) => baseY - (v / c.max) * (baseY - top);
  const slotW = SW / n;
  const narrow = slotW < c.minSlot;
  const headR = Math.max(4, Math.min(8, slotW / 18));

  c.baseline.setAttribute("x1", "0");
  c.baseline.setAttribute("x2", String(SW));
  c.baseline.setAttribute("y1", String(baseY));
  c.baseline.setAttribute("y2", String(baseY));

  const centres = {};
  c.pairs.forEach((p, i) => {
    const compared = p.code === c.subject || p.code === c.other;
    const home = slotW * (i + 0.5);
    const k = p.code === c.subject ? -1 : 1;
    const target = SW / 2 + k * SW * 0.2;
    const cx = compared ? lerp(home, target, pair) : home;
    const gap = lerp(slotW * 0.2, compared ? Math.min(SW * 0.08, 60) : slotW * 0.2, compared ? pair : 0);
    const xb = cx - gap;
    const xa = cx + gap;
    centres[p.code] = { xb, xa };
    // The other four leave entirely: faint, they sat under the two pairs as they slid past.
    const kept = compared ? 1 : 1 - pair;
    p.group.setAttribute("opacity", String(kept));
    p.labels.style.opacity = String(kept);

    const yb = lerp(baseY, y(p.before), before);
    const ya = lerp(baseY, y(p.after), after);
    set(p.stemB, { x1: xb, x2: xb, y1: baseY, y2: yb, opacity: before > 0.001 ? 1 : 0 });
    set(p.stemA, { x1: xa, x2: xa, y1: baseY, y2: ya, opacity: after > 0.001 ? 1 : 0 });
    set(p.headB, { cx: xb, cy: yb, r: headR, opacity: before > 0.001 ? 1 : 0 });
    set(p.headA, { cx: xa, cy: ya, r: headR, opacity: after > 0.001 ? 1 : 0 });
    if (p.ring) set(p.ring, { cx: xa, cy: ya, r: headR + 5, opacity: after });

    const place = (node, x, yy, on, anchor = "middle") => {
      node.style.left = `${x}px`;
      node.style.top = `${yy}px`;
      node.style.transform = anchor === "middle" ? "translate(-50%, 0)" : "translate(-50%, -100%)";
      node.style.opacity = String(on);
    };
    place(p.valueB, xb, yb - headR - 4, clamp((before - 0.7) / 0.3), "above");
    place(p.valueA, xa, ya - headR - 4, clamp((after - 0.7) / 0.3), "above");
    // On a narrow slot the two year labels would touch: only the later one is written, the earlier is its tint.
    place(p.yearB, xb, baseY + 4, narrow ? before * (1 - after) : before);
    place(p.yearA, xa, baseY + 4, after);
    const underTop = baseY + 4 + c.yearH + 4;
    // On a narrow slot the triangle goes above its number, and the number takes the axis size: side by side, six
    // "+198 %" ran into each other.
    p.change.style.fontSize = narrow ? `${c.axisPx}px` : "";
    if (narrow) {
      place(p.change, cx, underTop + 10, change);
      set(p.triangle, { transform: `translate(${cx - 4.5} ${underTop})`, opacity: change });
    } else {
      place(p.change, cx + 7, underTop, change);
      set(p.triangle, { transform: `translate(${cx - p.change.offsetWidth / 2 - 7} ${underTop + c.changeH / 2 - 4})`, opacity: change });
    }
    place(p.name, cx, underTop + (narrow ? 10 + c.axisPx * 1.3 : c.changeH) * change + 2, 1);
  });

  // The ratios: a dashed rule at the subject's head across to the other's stem, and a span up that stem.
  const s = c.pairs.find((p) => p.code === c.subject);
  const o = c.pairs.find((p) => p.code === c.other);
  for (const [key, from, to, xs, xo] of [
    ["before", s.before, o.before, centres[c.subject].xb, centres[c.other].xb],
    ["after", s.after, o.after, centres[c.subject].xa, centres[c.other].xa],
  ]) {
    const g = c.ratios[key];
    const on = key === "before" ? clamp(ratio * 2) : clamp(ratio * 2 - 1);
    g.group.setAttribute("opacity", String(on * pair));
    set(g.rule, { x1: xs + headR + 3, x2: xo, y1: y(from), y2: y(from) });
    const spanX = xo + (key === "before" ? -headR - 8 : headR + 8);
    set(g.span, { x1: spanX, x2: spanX, y1: y(from), y2: y(to) });
    const label = c.ratioLabels[key];
    const w = label.offsetWidth;
    // Each ratio sits on its own dashed rule, just short of the span it measures.
    label.style.left = `${key === "before" ? spanX - w - 10 : spanX + 6}px`;
    label.style.top = `${key === "before" ? y(from) - 4 : (y(from) + y(to)) / 2}px`;
    label.style.transform = key === "before" ? "translateY(-100%)" : "translateY(-50%)";
    label.style.opacity = String(on * pair);
  }

  const notes = { pairNote: ratio * pair * (1 - change), changeNote: change * (1 - clamp(state.share)), shareNote: clamp(state.share) };
  for (const [key, node] of Object.entries(c.notes)) node.style.opacity = String(notes[key]);
}

function set(node, attrs) {
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
}

function seatLollipops(root, carrier) {
  const data = root.__lolliData || (root.__lolliData = JSON.parse(carrier.getAttribute("data-lollipops")));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector('[data-part="field"]');
  const pairs = data.pairs.map((p) => {
    const group = svg.querySelector(`[data-pair="${p.code}"]`);
    const labels = stage.querySelector(`[data-labels="${p.code}"]`);
    return {
      ...p,
      group,
      labels,
      stemB: group.querySelector('[data-stem="before"]'),
      stemA: group.querySelector('[data-stem="after"]'),
      headB: group.querySelector('[data-head="before"]'),
      headA: group.querySelector('[data-head="after"]'),
      ring: group.querySelector('[data-part="subject-ring"]'),
      triangle: group.querySelector('[data-part="triangle"]'),
      valueB: labels.querySelector('[data-value="before"]'),
      valueA: labels.querySelector('[data-value="after"]'),
      yearB: labels.querySelector('[data-year="before"]'),
      yearA: labels.querySelector('[data-year="after"]'),
      change: labels.querySelector('[data-part="change"]'),
      name: labels.querySelector('[data-part="name"]'),
    };
  });
  const h = (node) => node.getBoundingClientRect().height;
  const years = pairs[0];
  root.__lolli = {
    ...data,
    stage,
    svg,
    pairs,
    baseline: svg.querySelector('[data-part="baseline"]'),
    ratios: Object.fromEntries(["before", "after"].map((k) => {
      const g = svg.querySelector(`[data-ratio="${k}"]`);
      return [k, { group: g, rule: g.querySelector('[data-part="ratio-rule"]'), span: g.querySelector('[data-part="ratio-span"]') }];
    })),
    ratioLabels: { before: stage.querySelector('[data-ratio-label="before"]'), after: stage.querySelector('[data-ratio-label="after"]') },
    valueH: h(years.valueA),
    yearH: h(years.yearA),
    changeH: h(years.change),
    nameH: h(years.name),
    axisPx: Number.parseFloat(getComputedStyle(years.yearA).fontSize),
    minSlot: (years.yearA.getBoundingClientRect().width + 6) * 2.6,
    notes: Object.fromEntries(Array.from(root.querySelectorAll("[data-note]")).map((n) => [n.dataset.note, n])),
  };
}
