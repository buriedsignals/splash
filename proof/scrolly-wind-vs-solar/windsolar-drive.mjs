// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   wind    the wind bars growing                                                                        0..1
//   solar   the solar bars growing beside them                                                           0..1
//   gap     every pair collapsed into one bar, wind minus solar, either side of zero, in the colour of the
//           source that leads                                                                            0..1
//   sort    the groups travelling from alphabetical order to the order of their gap                      0..1
//   ghost   2015's gap drawn as a dashed outline behind each bar, its value written                      0..1
//   note    which header note is read                                                                    0..5
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: six groups across the stage, names under the baseline;
// the value scale and the zero line travel between the two pictures, so a bar never jumps.

export function applyWindSolarState(root, state, context) {
  const carrier = root.querySelector("[data-windsolar]");
  if (!carrier) return;
  if (context.resized || !root.__windsolar) seatWindSolar(root, carrier);
  const c = root.__windsolar;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const windT = ease(clamp(state.wind));
  const solarT = ease(clamp(state.solar));
  const gap = ease(clamp(state.gap));
  const sort = ease(clamp(state.sort));
  const ghost = clamp(state.ghost);
  const n = c.groups.length;

  const top = c.valueH + 6;
  // Names that do not fit their cell take two alternating rows.
  const cellW0 = SW / n;
  const rows = Math.max(...c.groups.map((g) => g.name.offsetWidth)) > cellW0 - 6 ? 2 : 1;
  const bottom = SH - c.nameH * rows - 10;
  // Bars: 0 at the bottom to the largest share. Gaps: the most negative to the most positive, with room for values.
  const maxShare = Math.max(...c.groups.flatMap((g) => [g.wind, g.solar]));
  const gaps = c.groups.flatMap((g) => [g.wind - g.solar, g.before]);
  const hiGap = Math.max(0, ...gaps);
  const loGap = Math.min(0, ...gaps);
  const hi = lerp(maxShare, hiGap, gap);
  const lo = lerp(0, loGap - (hiGap - loGap) * 0.12, gap);
  const Y = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const zeroY = Y(0);
  set(c.zero, { x1: 0, x2: SW, y1: zeroY, y2: zeroY });

  const cellW = SW / n;
  const barW = Math.min(46, cellW * 0.34);
  c.groups.forEach((g, i) => {
    const slotX = lerp(c.orders[0].indexOf(i), c.orders[1].indexOf(i), sort);
    const cx = (slotX + 0.5) * cellW;
    const d = g.wind - g.solar;
    // The wind bar becomes the gap bar, sliding to the group's centre; the solar bar folds into it.
    const windX = lerp(cx - barW - 2, cx - barW / 2, gap);
    const windTop = lerp(g.wind * windT, Math.max(0, d), gap);
    const windBottom = lerp(0, Math.min(0, d), gap);
    set(g.windBar, { x: windX, y: Y(windTop), width: barW, height: Math.max(0, Y(windBottom) - Y(windTop)), fill: d < 0 ? mixHex(c.accent, c.muted, gap) : c.accent });
    const solarH = g.solar * solarT * (1 - gap);
    set(g.solarBar, { x: lerp(cx + 2, cx - barW / 2, gap), y: Y(solarH), width: barW, height: Math.max(0, Y(0) - Y(solarH)), opacity: 1 - gap });
    const bTop = Math.max(0, g.before);
    const bBottom = Math.min(0, g.before);
    set(g.ghostBar, { x: cx - barW / 2 - 5, y: Y(bTop), width: barW + 10, height: Math.max(1, Y(bBottom) - Y(bTop)), opacity: ghost * gap });

    const row = rows > 1 ? Math.round(slotX) % 2 : 0;
    Object.assign(g.name.style, { left: `${cx}px`, top: `${bottom + 6 + row * c.nameH}px`, transform: "translateX(-50%)" });
    Object.assign(g.windValue.style, { left: `${windX + barW / 2}px`, top: `${Y(g.wind * windT) - 3}px`, transform: "translate(-50%, -100%)", opacity: String(windT * (1 - gap)) });
    Object.assign(g.solarValue.style, { left: `${cx + 2 + barW / 2}px`, top: `${Y(g.solar * solarT) - 3}px`, transform: "translate(-50%, -100%)", opacity: String(solarT * (1 - gap)) });
    // A gap's value sits past its bar's end: above a bar that rises, below one that falls.
    const gapY = d >= 0 ? Y(d) - 3 : Y(d) + 3;
    Object.assign(g.gapValue.style, { left: `${cx}px`, top: `${gapY}px`, transform: d >= 0 ? "translate(-50%, -100%)" : "translate(-50%, 0)", opacity: String(clamp((gap - 0.6) / 0.4)) });
    // 2015's gap written beside its own dashed line, right of the bar.
    Object.assign(g.beforeValue.style, { left: `${cx + barW / 2 + 7}px`, top: `${Y(g.before)}px`, transform: "translateY(-50%)", opacity: String(ghost * gap) });
  });

  // Wind's side named top right, over the smallest gaps once sorted (a phone waits for the sort, the right column being
  // too narrow to share with a tall bar); solar's under zero at the left, where no bar falls.
  Object.assign(c.windAhead.style, { left: `${SW}px`, top: `${top}px`, transform: "translateX(-100%)", opacity: String(clamp((gap - 0.5) * 2) * (SW < 560 ? sort : 1)) });
  Object.assign(c.solarAhead.style, { left: "0px", top: `${zeroY + 6}px`, opacity: String(clamp((gap - 0.5) * 2)) });
  c.solarKey.style.opacity = String(Math.max(0.25, 1 - gap * 0.75));

  c.notes.forEach((node, k) => {
    node.style.opacity = String(clamp(1 - Math.abs(state.note - k)));
  });

  function set(el, attrs) {
    for (const [key, v] of Object.entries(attrs)) el.setAttribute(key, String(v));
  }
}

function mixHex(a, b, t) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatWindSolar(root, carrier) {
  const data = root.__windsolarData || (root.__windsolarData = JSON.parse(carrier.getAttribute("data-windsolar")));
  const stage = root.querySelector('[data-part="stage"]');
  const q = (sel) => stage.querySelector(sel);
  const groups = data.groups.map((g) => {
    const el = q(`[data-group="${g.key}"]`);
    return {
      ...g,
      windBar: el.querySelector('[data-part="wind"]'),
      solarBar: el.querySelector('[data-part="solar"]'),
      ghostBar: el.querySelector('[data-part="ghost"]'),
      name: q(`[data-name="${g.key}"]`),
      windValue: q(`[data-wind-value="${g.key}"]`),
      solarValue: q(`[data-solar-value="${g.key}"]`),
      gapValue: q(`[data-gap-value="${g.key}"]`),
      beforeValue: q(`[data-before-value="${g.key}"]`),
    };
  });
  root.__windsolar = {
    ...data,
    stage,
    svg: q('[data-part="field"]'),
    zero: q('[data-part="zero"]'),
    groups,
    windAhead: q('[data-part="wind-ahead"]'),
    solarAhead: q('[data-part="solar-ahead"]'),
    solarKey: root.querySelector('[data-part="solar-key"]'),
    valueH: groups[0].windValue.getBoundingClientRect().height,
    nameH: groups[0].name.getBoundingClientRect().height,
    notes: data.notes.map((k) => root.querySelector(`[data-note="${k}"]`)),
  };
}
