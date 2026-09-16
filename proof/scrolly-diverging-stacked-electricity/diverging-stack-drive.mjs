// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   centre   plain 100 % bars sliding until each one's nuclear straddles the axis                    0..1
//   left     the fossil camp kept, every other segment stepping back; its totals and its leader    0..1
//   right    the renewable camp kept, the same                                                      0..1
//   compare  the subject's row opening into two lanes: nuclear above, fossil and renewables laid
//            end to end below it from the same start, the row climbing to the first slot; every
//            other row stepping back                                                               0..1
//   all      every total, the subject named in the accent                                          0..1
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the name column and the two total columns are
// as wide as their widest text, measured on a resize; the plot takes the rest, on one scale for the plain
// bars (100 % across) and one for the lean (the widest fossil reach plus the widest renewable reach).

export function applyDivergingStackState(root, state, context) {
  const carrier = root.querySelector("[data-diverging-stack]");
  if (!carrier) return;
  if (context.resized || !root.__dstack) seatDivergingStack(root, carrier);
  const c = root.__dstack;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const centre = ease(clamp(state.centre));
  const compare = ease(clamp(state.compare));
  // On a narrow stage the names go above their bars: a name column would leave the plot a third of the width.
  const narrow = SW < 520;
  const plotX0 = (narrow ? 0 : c.nameW + 10) + c.totalW;
  const plotX1 = SW - c.totalW;
  const plotW = Math.max(40, plotX1 - plotX0);
  const kStack = plotW / 100;
  const kLean = plotW / (c.L + c.R);
  const axisX = plotX0 + c.L * kLean;
  const k = lerp(kStack, kLean, centre);

  // The subject's row takes a second lane's height while it is compared.
  const weights = c.rows.map((r) => 1 + (r.code === c.subject ? compare : 0));
  const unit = SH / weights.reduce((s, w) => s + w, 0);
  // ...and climbs to the first slot: the card comes to rest on the middle of the stage, where its row sits.
  const topsIn = (order) => {
    const tops = new Map();
    let run = 0;
    for (const i of order) {
      tops.set(i, run);
      run += unit * weights[i];
    }
    return tops;
  };
  const natural = topsIn(c.rows.map((_, i) => i));
  const subjectFirst = topsIn([c.rows.findIndex((r) => r.code === c.subject), ...c.rows.map((_, i) => i).filter((i) => c.rows[i].code !== c.subject)]);
  for (let i = 0; i < c.rows.length; i++) {
    const r = c.rows[i];
    const isSubject = r.code === c.subject;
    const rowH = unit * weights[i];
    const barH = Math.max(4, Math.min(unit * (narrow ? 0.42 : 0.5), 44));
    r.el.style.top = `${lerp(natural.get(i), subjectFirst.get(i), compare)}px`;
    r.el.style.height = `${rowH}px`;
    const nameH = narrow ? c.nameH + 2 : 0;
    const mid = (rowH + nameH) / 2;
    const lane = isSubject ? compare * (barH * 0.5 + 3) : 0;

    const start = lerp(plotX0, plotX0 + (c.L - (r.fossil + r.nuclear / 2)) * kLean, centre);
    const nuclearStart = start + r.fossil * k;
    let cursor = start;
    let sideCursor = nuclearStart;
    let sidesEnd = nuclearStart;
    let leftEdge = start;
    let rightEdge = start;
    for (const seg of r.segments) {
      const w = seg.value * k;
      const along = cursor;
      cursor += w;
      let x = along;
      let y = mid - barH / 2;
      if (isSubject && compare > 0) {
        if (seg.side === "centre") y -= lane;
        else {
          x = lerp(along, sideCursor, compare);
          sideCursor += w;
          sidesEnd = sideCursor;
          y += lane;
        }
      }
      if (seg.side === "left" && seg === r.segments[0]) leftEdge = along;
      rightEdge = along + w;
      Object.assign(seg.el.style, { left: `${x}px`, width: `${Math.max(0, w)}px`, top: `${y}px`, height: `${barH}px` });
      const fade = Math.max(seg.side === "left" ? 0 : state.left, seg.side === "right" ? 0 : state.right, isSubject ? 0 : state.compare);
      seg.el.style.opacity = String(1 - 0.75 * clamp(fade));
    }

    // Totals at the ends, outside the bar.
    const showLeft = Math.max(state.left, state.all) * (isSubject ? 1 - compare : 1) * (1 - 0.75 * (isSubject ? 0 : state.compare));
    const showRight = Math.max(state.right, state.all) * (isSubject ? 1 - compare : 1) * (1 - 0.75 * (isSubject ? 0 : state.compare));
    Object.assign(r.totalLeft.style, { left: "auto", right: `${SW - leftEdge + 6}px`, top: `${mid}px`, transform: "translateY(-50%)" });
    Object.assign(r.totalRight.style, { left: `${rightEdge + 6}px`, top: `${mid}px`, transform: "translateY(-50%)" });
    r.totalLeft.style.opacity = String(clamp(showLeft));
    r.totalRight.style.opacity = String(clamp(showRight));
    const lead = (r.code === c.leaningLeft && state.left > 0.5) || (r.code === c.leaningRight && state.right > 0.5);
    r.totalLeft.style.color = r.code === c.leaningLeft && state.left > 0.5 ? c.colours.inkOnGround : c.colours.mutedInk;
    r.totalRight.style.color = r.code === c.leaningRight && state.right > 0.5 ? c.colours.inkOnGround : isSubject && state.all > 0.5 ? c.colours.accentInk : c.colours.mutedInk;
    r.totalLeft.style.fontWeight = r.code === c.leaningLeft && state.left > 0.5 ? "700" : "";
    r.totalRight.style.fontWeight = r.code === c.leaningRight && state.right > 0.5 ? "700" : "";

    // The compared row's two figures, at the end of each lane.
    const nuclearEnd = nuclearStart + r.nuclear * k;
    Object.assign(r.totalCentre.style, { left: `${nuclearEnd + 6}px`, top: `${mid - lane}px`, transform: "translateY(-50%)" });
    Object.assign(r.totalSides.style, { left: `${sidesEnd + 6}px`, top: `${mid + lane}px`, transform: "translateY(-50%)" });
    r.totalCentre.style.opacity = String(isSubject ? compare : 0);
    r.totalSides.style.opacity = String(isSubject ? compare : 0);

    if (narrow) Object.assign(r.name.style, { left: `${plotX0}px`, width: "auto", textAlign: "left", top: `${mid - lane - barH / 2 - 2}px`, transform: "translateY(-100%)" });
    else Object.assign(r.name.style, { left: "0px", width: `${c.nameW}px`, textAlign: "right", top: `${mid}px`, transform: "translateY(-50%)" });
    const named = isSubject && Math.max(state.compare, state.all) > 0.5;
    r.name.style.color = named ? c.colours.accentInk : c.colours.inkOnGround;
    r.name.style.fontWeight = named || lead ? "700" : "";
    r.name.style.opacity = String(isSubject ? 1 : 1 - 0.75 * clamp(state.compare));
  }

  c.axis.style.left = `${axisX}px`;
  c.axis.style.opacity = String(centre);
  for (const tick of c.ticks) {
    const t = Number(tick.dataset.tick);
    const lean = tick.dataset.set === "diverging";
    tick.style.left = `${lean ? axisX + t * kLean : plotX0 + t * kStack}px`;
    tick.style.opacity = (lean ? centre >= 0.5 : centre < 0.5) ? "1" : "0";
  }
  showOneNote([[c.leftNote, clamp(state.left)], [c.rightNote, clamp(state.right)], [c.compareNote, clamp(state.compare)]]);
}

function seatDivergingStack(root, carrier) {
  const data = root.__dstackData || (root.__dstackData = JSON.parse(carrier.getAttribute("data-diverging-stack")));
  const stage = root.querySelector('[data-part="stage"]');
  const rows = data.rows.map((r) => {
    const el = stage.querySelector(`[data-row="${r.code}"]`);
    return {
      ...r,
      el,
      name: el.querySelector('[data-part="name"]'),
      totalLeft: el.querySelector('[data-part="total-left"]'),
      totalRight: el.querySelector('[data-part="total-right"]'),
      totalCentre: el.querySelector('[data-part="total-centre"]'),
      totalSides: el.querySelector('[data-part="total-sides"]'),
      segments: r.segments.map((s) => ({ ...s, el: el.querySelector(`[data-segment="${s.key}"]`) })),
    };
  });
  const width = (node) => {
    const probe = node.cloneNode(true);
    probe.style.cssText = `${node.style.cssText};position:absolute;visibility:hidden;width:auto;left:0;right:auto;top:0;transform:none;font-weight:700`;
    node.parentElement.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };
  root.__dstack = {
    ...data,
    stage,
    rows,
    L: Math.max(...data.rows.map((r) => r.fossil + r.nuclear / 2)),
    R: Math.max(...data.rows.map((r) => r.renewable + r.nuclear / 2)),
    nameW: Math.ceil(Math.max(...rows.map((r) => width(r.name)))),
    nameH: Math.ceil(rows[0].name.getBoundingClientRect().height),
    // The two lanes' figures sit inside the plot, beside bars that end short of either edge; only the end totals
    // need a column of their own.
    totalW: Math.ceil(Math.max(...rows.flatMap((r) => [width(r.totalLeft), width(r.totalRight)]))) + 8,
    axis: root.querySelector('[data-part="axis"]'),
    ticks: Array.from(root.querySelectorAll("[data-tick]")),
    leftNote: root.querySelector('[data-part="left-note"]'),
    rightNote: root.querySelector('[data-part="right-note"]'),
    compareNote: root.querySelector('[data-part="compare-note"]'),
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
