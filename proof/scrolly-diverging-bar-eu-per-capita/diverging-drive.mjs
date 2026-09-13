// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year     the bars from their 1990 level to their 2024 level, the 1990 length kept as an outline   0..1
//   fell     the "fell" counter                                                                       0..1
//   subject  the one rise in the accent                                                               0..1
//   swap     levels to changes: first each bar takes its change's geometry out of the zero line, then
//            the rows re-sort from the largest rise to the largest fall                                0..1
//   zoom     the change axis closing onto the zoom domain, every row but the subject stepping back     0..1
//   note     the subject's rise stated                                                                0..1
//   mean     the mean of the falls drawn down the chart as a rule, and stated                          0..1
//   beyond   the rows that fell more than the mean kept, the others stepping back                      0..1
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: a row is the stage's height over the number of
// countries; the name and value columns are as wide as their widest text, measured on a resize; the plot
// takes the rest.

export function applyDivergingState(root, state, context) {
  const carrier = root.querySelector("[data-diverging]");
  if (!carrier) return;
  if (context.resized || !root.__div) seatDiverging(root, carrier);
  const c = root.__div;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const n = c.rows.length;
  const rowH = SH / n;
  const barH = Math.max(2, Math.min(rowH * 0.62, 18));
  const plotX0 = c.nameW + 8 + c.valueW + 12;
  const plotW = Math.max(40, SW - plotX0 - 4);
  const year = ease(clamp(state.year));
  const s = clamp(state.swap);
  const geometry = ease(clamp(s * 2));
  const order = ease(clamp(s * 2 - 1));
  const z = ease(clamp(state.zoom));

  const xLevel = (v) => plotX0 + (v / c.levelMax) * plotW;
  const lo = lerp(c.changeDomain[0], c.zoomDomain[0], z);
  const hi = lerp(c.changeDomain[1], c.zoomDomain[1], z);
  const xChange = (v) => plotX0 + ((v - lo) / (hi - lo)) * plotW;
  const inPlot = (x) => Math.min(Math.max(x, plotX0), plotX0 + plotW);
  const format1 = (v) => v.toFixed(1).replace(".", ",");
  const format2 = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2).replace(".", ",")}`;

  for (const r of c.rows) {
    const isSubject = r.code === c.subject;
    const y = lerp(r.levelRank, r.changeRank, order) * rowH;
    r.el.style.top = `${y}px`;
    r.el.style.height = `${rowH}px`;

    const level = lerp(r.from, r.to, year);
    const levelLeft = xLevel(0);
    const levelRight = xLevel(level);
    const changeLeft = inPlot(xChange(Math.min(r.change, 0)));
    const changeRight = inPlot(xChange(Math.max(r.change, 0)));
    const left = lerp(levelLeft, changeLeft, geometry);
    const right = lerp(levelRight, changeRight, geometry);
    const barTop = (rowH - barH) / 2;
    Object.assign(r.bar.style, { left: `${left}px`, width: `${Math.max(0, right - left)}px`, top: `${barTop}px`, height: `${barH}px` });
    Object.assign(r.ghost.style, { left: `${xLevel(0)}px`, width: `${xLevel(r.from) - xLevel(0)}px`, top: `${barTop}px`, height: `${barH}px` });
    r.ghost.style.opacity = String(year * (1 - geometry));

    const accentOn = isSubject && state.subject > 0.5;
    // In the close-up every other bar runs off the plot's edge; it steps well back, so the one rise leads.
    const keptByZoom = isSubject ? 1 : 1 - 0.85 * z;
    const keptByMean = isSubject || r.change < c.mean ? 1 : 1 - 0.7 * clamp(state.beyond);
    r.bar.style.background = accentOn ? c.colours.accentFill : c.colours.barFill;
    r.bar.style.opacity = String(keptByZoom * keptByMean);

    Object.assign(r.name.style, { left: "0px", width: `${c.nameW}px`, top: "50%", transform: "translateY(-50%)" });
    Object.assign(r.value.style, { left: `${c.nameW + 8}px`, width: `${c.valueW}px`, top: "50%", transform: "translateY(-50%)" });
    r.name.style.color = accentOn ? c.colours.accentInk : c.colours.inkOnGround;
    r.name.style.opacity = String(keptByZoom * keptByMean);
    const text = geometry < 0.5 ? format1(level) : format2(r.change);
    if (r.value.textContent !== text) r.value.textContent = text;
    r.value.style.color = accentOn ? c.colours.accentInk : r.change < c.mean && state.beyond > 0.5 ? c.colours.inkOnGround : c.colours.mutedInk;
    r.value.style.fontWeight = accentOn || (r.change < c.mean && state.beyond > 0.5) ? "700" : "";
    r.value.style.opacity = String(keptByZoom * keptByMean);
  }

  const zeroX = lerp(xLevel(0), xChange(0), geometry);
  c.zero.style.left = `${zeroX}px`;
  c.meanRule.style.left = `${xChange(c.mean)}px`;
  c.meanRule.style.height = `${SH * ease(clamp(state.mean))}px`;
  c.meanRule.style.bottom = "auto";
  c.meanRule.style.opacity = String(clamp(state.mean) * geometry * (1 - z));

  for (const tick of c.ticks) {
    const v = Number(tick.dataset.tick);
    const set = tick.dataset.set;
    const x = set === "level" ? xLevel(v) : xChange(v);
    const shown = set === "level" ? geometry < 0.5 : set === "change" ? geometry >= 0.5 && z < 0.5 : geometry >= 0.5 && z >= 0.5;
    tick.style.left = `${x}px`;
    tick.style.opacity = shown && x >= plotX0 - 1 && x <= plotX0 + plotW + 1 ? "1" : "0";
  }

  c.levelUnit.textContent = c.levelUnit.dataset.template.replace("{year}", year < 0.5 ? c.years[0] : c.years[1]);
  c.levelUnit.style.opacity = String(1 - geometry);
  c.changeUnit.style.opacity = String(geometry);
  const fellText = c.fell.dataset.template.replace("{n}", String(Math.round(Number(c.fell.dataset.value) * clamp(state.fell * 2))));
  if (c.fell.textContent !== fellText) c.fell.textContent = fellText;
  c.fell.style.opacity = String(clamp(state.fell));
  c.note.style.opacity = String(clamp(state.note));
  c.meanNote.style.opacity = String(clamp(state.mean) * (1 - z));
}

function seatDiverging(root, carrier) {
  const data = root.__divData || (root.__divData = JSON.parse(carrier.getAttribute("data-diverging")));
  const stage = root.querySelector('[data-part="stage"]');
  const byFrom = [...data.rows].sort((a, b) => b.from - a.from).map((r) => r.code);
  const byChange = [...data.rows].sort((a, b) => b.change - a.change).map((r) => r.code);
  const rows = data.rows.map((r) => {
    const el = stage.querySelector(`[data-row="${r.code}"]`);
    return {
      ...r,
      el,
      levelRank: byFrom.indexOf(r.code),
      changeRank: byChange.indexOf(r.code),
      name: el.querySelector('[data-part="name"]'),
      value: el.querySelector('[data-part="value"]'),
      bar: el.querySelector('[data-part="bar"]'),
      ghost: el.querySelector('[data-part="ghost"]'),
    };
  });
  // The columns are as wide as their widest text: every name, and the widest value either reading prints.
  const measure = (node, text) => {
    const probe = node.cloneNode(false);
    probe.style.cssText = `${node.style.cssText};position:absolute;visibility:hidden;width:auto;left:0;top:0;transform:none`;
    probe.textContent = text;
    node.parentElement.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };
  const readings = [...data.rows.map((r) => r.from.toFixed(1)), ...data.rows.map((r) => `${r.change > 0 ? "+" : "−"}${Math.abs(r.change).toFixed(2)}`)];
  root.__div = {
    ...data,
    stage,
    rows,
    nameW: Math.ceil(Math.max(...rows.map((r) => measure(r.name, r.name.textContent)))),
    valueW: Math.ceil(Math.max(...readings.map((t) => measure(rows[0].value, t.replace(".", ","))))) + 2,
    levelMax: Math.max(...data.rows.map((r) => Math.max(r.from, r.to))) * 1.02,
    changeDomain: [Math.min(...data.rows.map((r) => r.change)) * 1.02, Math.max(0, ...data.rows.map((r) => r.change)) + 0.1],
    zero: root.querySelector('[data-part="zero"]'),
    meanRule: root.querySelector('[data-part="mean"]'),
    ticks: Array.from(root.querySelectorAll("[data-tick]")),
    levelUnit: root.querySelector('[data-part="level-unit"]'),
    changeUnit: root.querySelector('[data-part="change-unit"]'),
    fell: root.querySelector('[data-part="fell"]'),
    note: root.querySelector('[data-part="note"]'),
    meanNote: root.querySelector('[data-part="mean-note"]'),
  };
}
