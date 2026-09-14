// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   head    the playhead, in years: every run is drawn up to it, and a row not yet entered stays faint    year
//   six     the rows present every year kept, the others stepping back                                     0..1
//   gaps    the interrupted rows kept, their holes outlined, the others stepping back                       0..1
//   dates   both years of every run written in the row label                                              0..1
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the label column is as wide as the widest label
// with its dates, measured on a resize; the plot takes the rest; a year is its share of the plot's width.

export function applyGanttState(root, state, context) {
  const carrier = root.querySelector("[data-gantt]");
  if (!carrier) return;
  if (context.resized || !root.__gantt) seatGantt(root, carrier);
  const c = root.__gantt;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  // On a narrow stage a label column would leave the plot a quarter of the width: each name goes above its bar,
  // and the bar takes the whole width.
  const narrow = SW < 560 || c.labelW > SW * 0.4;
  const plotX0 = narrow ? 0 : c.labelW + 12;
  const plotW = Math.max(40, SW - plotX0 - 2);
  const span = c.last + 1 - c.first;
  const x = (year) => plotX0 + ((year - c.first) / span) * plotW;
  const rowH = SH / c.rows.length;
  const barH = narrow ? Math.max(4, Math.min(rowH - c.labelH - 4, 14)) : Math.max(4, Math.min(rowH * 0.62, 24));
  const head = Math.min(state.head, c.last + 1);
  const six = clamp(state.six);
  const gaps = clamp(state.gaps);
  const dates = clamp(state.dates);

  c.rows.forEach((row, i) => {
    row.el.style.top = `${i * rowH}px`;
    row.el.style.height = `${rowH}px`;
    const barTop = narrow ? rowH - barH - 2 : (rowH - barH) / 2;
    Object.assign(row.track.style, { left: `${plotX0}px`, width: `${plotW}px`, right: "auto", top: `${barTop}px`, height: `${barH}px` });
    row.runs.forEach((run, j) => {
      const node = row.runNodes[j];
      const end = Math.min(run.to + 1, head);
      const width = Math.max(0, x(end) - x(run.from));
      Object.assign(node.style, { left: `${x(run.from)}px`, width: `${width}px`, top: `${barTop}px`, height: `${barH}px` });
    });
    row.gaps.forEach((gap, j) => {
      const node = row.gapNodes[j];
      Object.assign(node.style, { left: `${x(gap.from) - 2}px`, width: `${x(gap.to + 1) - x(gap.from) + 4}px`, top: `${barTop - 3}px`, height: `${barH + 6}px` });
      node.style.opacity = String(gaps);
    });
    const entered = head > row.runs[0].from + 0.02;
    const interrupted = row.gaps.length > 0 || row.single;
    const kept = Math.min(row.throughout ? 1 : 1 - 0.75 * six, interrupted ? 1 : 1 - 0.75 * gaps);
    row.el.style.opacity = String(kept);
    if (narrow) Object.assign(row.label.style, { right: "auto", left: "0px", width: "auto", textAlign: "left", top: `${barTop - 1}px`, transform: "translateY(-100%)" });
    else Object.assign(row.label.style, { right: "auto", left: "0px", width: `${c.labelW}px`, textAlign: "right", top: "50%", transform: "translateY(-50%)" });
    row.label.style.color = entered ? (row.throughout ? c.colours.accentInk : c.colours.inkOnGround) : c.colours.mutedInk;
    row.label.style.opacity = entered ? "1" : "0.45";
    row.dates.style.opacity = String(dates);
  });

  c.playhead.style.left = `${x(head) - 1}px`;
  c.playhead.style.opacity = String(head <= c.last + 0.98 ? 1 : 0);
  // Ticks that would touch their neighbour are dropped, first and last kept.
  let lastRight = -Infinity;
  c.ticks.forEach((tick, k) => {
    const left = x(Number(tick.dataset.tick) + 0.5);
    tick.style.left = `${left}px`;
    const w = tick.offsetWidth;
    const isLast = k === c.ticks.length - 1;
    const fits = left - w / 2 > lastRight + 6 && (isLast || left + w / 2 < x(c.last + 0.5) - c.ticks[c.ticks.length - 1].offsetWidth / 2 - 6);
    tick.style.opacity = fits || k === 0 ? "1" : "0";
    if (fits || k === 0) lastRight = left + w / 2;
  });

  const year = Math.max(c.first, Math.min(c.last, Math.floor(head - 0.001)));
  const yearText = c.yearNote.dataset.template.replace("{y}", String(year));
  if (c.yearNote.textContent !== yearText) c.yearNote.textContent = yearText;
  showOneNote([[c.yearNote, (1 - six) * (1 - gaps) * (1 - dates)], [c.sixNote, six], [c.gapNote, gaps]]);
}

function seatGantt(root, carrier) {
  const data = root.__ganttData || (root.__ganttData = JSON.parse(carrier.getAttribute("data-gantt")));
  const stage = root.querySelector('[data-part="stage"]');
  const rows = data.rows.map((r) => {
    const el = stage.querySelector(`[data-row="${CSS.escape(r.key)}"]`);
    return {
      ...r,
      single: r.runs.length === 1 && r.runs[0].from === r.runs[0].to,
      el,
      label: el.querySelector('[data-part="label"]'),
      dates: el.querySelector('[data-part="dates"]'),
      track: el.querySelector('[data-part="track"]'),
      runNodes: Array.from(el.querySelectorAll("[data-run]")),
      gapNodes: Array.from(el.querySelectorAll("[data-gap]")),
    };
  });
  // The label column is measured with its dates, so writing them in never moves the plot.
  const labelW = Math.ceil(Math.max(...rows.map((r) => {
    const probe = r.label.cloneNode(true);
    probe.style.cssText = `${r.label.style.cssText};position:absolute;visibility:hidden;left:0;right:auto;width:auto;transform:none;font-weight:700`;
    r.el.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  })));
  root.__gantt = {
    ...data,
    stage,
    rows,
    labelW,
    labelH: Math.ceil(rows[0].label.getBoundingClientRect().height),
    playhead: stage.querySelector('[data-part="playhead"]'),
    ticks: Array.from(root.querySelectorAll("[data-tick]")),
    yearNote: root.querySelector('[data-part="year-note"]'),
    sixNote: root.querySelector('[data-part="six-note"]'),
    gapNote: root.querySelector('[data-part="gap-note"]'),
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
