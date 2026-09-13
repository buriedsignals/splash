// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   year    every pin sliding along the one strip from its 2000 value to its 2024 value, a tick left where
//           it stood                                                                                  0..1
//   median  the median's mark on the strip, moving with the pins, and its value                        0..1
//   floor   the 2000 floor's country in the accent, its trail along the strip, the others stepping back 0..1
//   ceil    the ceiling's country, the same                                                           0..1
//   spread  the floor-to-ceiling brackets of both years under the strip                                0..1
//   split   the one strip opening into the static plate's two: 2000 above, 2024 below, leaders between 0..1
//
// EVERYTHING IS PLACED IN THE READER'S PIXELS on each paint. Chips are stacked in rows so none overlaps
// another: once for the 2000 values, once for the 2024 values, and a chip's row slides between the two as the
// pin does. The strip sits low in the stage — the card comes to rest across the middle.

export function applyDotStripState(root, state, context) {
  const carrier = root.querySelector("[data-strip-chart]");
  if (!carrier) return;
  if (context.resized || !root.__strip) seatDotStrip(root, carrier);
  const c = root.__strip;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  c.svg.setAttribute("viewBox", `0 0 ${SW} ${SH}`);

  const year = ease(clamp(state.year));
  const split = ease(clamp(state.split));
  const floor = clamp(state.floor);
  const ceil = clamp(state.ceil);
  const spread = clamp(state.spread);
  const median = clamp(state.median);
  const one = (v) => v.toFixed(1).replace(".", ",");

  const plotX0 = c.yearW;
  const plotX1 = SW - c.chipMaxW / 2 - 2;
  const plotW = Math.max(40, plotX1 - plotX0);
  const x = (v) => plotX0 + (v / 100) * plotW;
  const STEM = 9;
  const RAIL = 6;

  const stack = (values) => {
    const order = values.map((v, i) => [x(v), i]).sort((a, b) => a[0] - b[0]);
    const rowRight = [];
    const rows = new Array(values.length);
    for (const [px, i] of order) {
      const left = px - c.chipW[i] / 2;
      let r = 0;
      while (rowRight[r] !== undefined && rowRight[r] + 3 > left) r++;
      rowRight[r] = px + c.chipW[i] / 2;
      rows[i] = r;
    }
    return { rows, count: rowRight.length };
  };
  const before = stack(c.marks.map((m) => m.before));
  const after = stack(c.marks.map((m) => m.after));

  // The strip's rail: low in the stage while it is one, the lower of two once split.
  const bracketRow = c.axisH + 10;
  const singleY = SH - c.axisH - 6 - bracketRow * 2 - 4;
  const splitY = SH - c.axisH - 8;
  const railY = lerp(singleY, splitY, split);
  // The rows stretch to the height they are given, within a band: a strip drawn at its minimum pitch left three
  // quarters of the stage bare above it.
  const rows = Math.max(before.count, after.count);
  const pitch = (room, count) => Math.min(c.chipH * 2.2, Math.max(c.chipH + 3, room / (count + 0.4)));
  const singleLead = pitch(singleY - STEM - 12, rows);
  const topLead = pitch(SH * 0.42 - STEM - 12, before.count);
  const splitLead = pitch(splitY - (before.count * topLead + STEM + 2 + RAIL + c.axisH) - STEM - 40, after.count);
  const lead = lerp(singleLead, splitLead, split);
  const topY = before.count * topLead + STEM + 2;

  const focusOf = (code) => (code === c.subject ? floor : code === c.ceiling ? ceil : 0);
  const stepBack = Math.max(floor, ceil);

  const drawRail = (strip, y, opacity) => {
    const railNode = c.rails[strip];
    railNode.setAttribute("x", String(plotX0));
    railNode.setAttribute("y", String(y));
    railNode.setAttribute("width", String(plotW));
    railNode.setAttribute("height", String(RAIL));
    c.railGroups[strip].setAttribute("opacity", String(opacity));
    for (const tick of c.ticks[strip]) {
      const tx = x(Number(tick.dataset.tick));
      const major = Number(tick.dataset.tick) % 20 === 0;
      tick.setAttribute("x1", String(tx));
      tick.setAttribute("x2", String(tx));
      tick.setAttribute("y1", String(y + (major ? -2 : 1)));
      tick.setAttribute("y2", String(y + RAIL + (major ? 2 : -1)));
    }
    for (const label of c.tickLabels[strip]) {
      label.style.left = `${x(Number(label.dataset.ticklabel))}px`;
      label.style.top = `${y + RAIL + 2}px`;
      label.style.opacity = String(opacity);
    }
    const yearLabel = c.years[strip];
    yearLabel.style.left = "0px";
    yearLabel.style.top = `${y + RAIL / 2}px`;
    yearLabel.style.transform = "translateY(-50%)";
    yearLabel.style.opacity = String(opacity);
  };
  drawRail("main", railY, 1);
  drawRail("top", topY, split);
  c.years.main.textContent = split > 0.5 || year >= 0.5 ? c.yearWords[1] : c.yearWords[0];

  c.marks.forEach((m, i) => {
    const value = lerp(m.before, m.after, year);
    const px = x(value);
    const row = lerp(before.rows[i], after.rows[i], year);
    const chipTop = railY - STEM - (row + 1) * lead + 3;
    const focused = focusOf(m.code);
    const isSubject = m.code === c.subject;
    const kept = focused > 0 ? 1 : 1 - 0.7 * stepBack;
    const chip = c.chips.main[i];
    chip.style.left = `${px}px`;
    chip.style.top = `${chipTop}px`;
    chip.style.opacity = String(kept);
    const accentChip = isSubject || focused > 0.5;
    chip.style.background = accentChip ? c.colours.accent : c.colours.chipFill;
    chip.style.color = accentChip ? c.chipOnAccent : c.colours.inkOnGround;
    chip.style.fontWeight = accentChip ? "700" : "";
    const stem = c.stems.main[i];
    stem.setAttribute("x1", String(px));
    stem.setAttribute("x2", String(px));
    stem.setAttribute("y1", String(chipTop + c.chipH));
    stem.setAttribute("y2", String(railY));
    stem.setAttribute("opacity", String(kept));

    // Where it stood in 2000, left on the one strip while the pins travel.
    const ghost = c.ghosts[i];
    const gx = x(m.before);
    ghost.setAttribute("x1", String(gx));
    ghost.setAttribute("x2", String(gx));
    ghost.setAttribute("y1", String(railY - 3));
    ghost.setAttribute("y2", String(railY + RAIL + 3));
    ghost.setAttribute("opacity", String(clamp(year * 3) * (1 - split) * (focused > 0 ? 1 : 0.6 * kept)));

    const trail = c.trails[i];
    trail.setAttribute("x1", String(gx));
    trail.setAttribute("x2", String(px));
    trail.setAttribute("y1", String(railY + RAIL / 2));
    trail.setAttribute("y2", String(railY + RAIL / 2));
    trail.setAttribute("opacity", String(focused * (1 - split)));
    const trailLabel = c.trailLabels[m.code];
    if (trailLabel) {
      const w = trailLabel.offsetWidth;
      trailLabel.style.left = `${Math.min(Math.max((gx + px) / 2 - w / 2, 0), SW - w)}px`;
      trailLabel.style.top = `${railY + RAIL + c.axisH + 6}px`;
      trailLabel.style.opacity = String(focused * (1 - split));
    }

    // The static plate's two strips: the 2000 chips above, a leader from each to its 2024 chip.
    const topChip = c.chips.top[i];
    const bx = x(m.before);
    const topChipTop = topY - STEM - (before.rows[i] + 1) * topLead + 3;
    topChip.style.left = `${bx}px`;
    topChip.style.top = `${topChipTop}px`;
    topChip.style.opacity = String(split);
    const topStem = c.stems.top[i];
    topStem.setAttribute("x1", String(bx));
    topStem.setAttribute("x2", String(bx));
    topStem.setAttribute("y1", String(topChipTop + c.chipH));
    topStem.setAttribute("y2", String(topY));
    topStem.setAttribute("opacity", String(split));
    const leader = c.leaders[i];
    leader.setAttribute("x1", String(bx));
    leader.setAttribute("y1", String(topY + RAIL + c.axisH + 4));
    leader.setAttribute("x2", String(x(m.after)));
    leader.setAttribute("y2", String(railY - STEM - after.count * lead - 2));
    leader.setAttribute("opacity", String(split));
    leader.setAttribute("stroke", isSubject ? c.colours.accentInk : leader.dataset.stroke || leader.getAttribute("stroke"));
  });

  // The floor-to-ceiling brackets of both years, under the strip's numbers.
  const bracket = (node, labelNode, lo, hi, y, opacity) => {
    const a = x(lo);
    const b = x(hi);
    node.setAttribute("d", `M${a} ${y - 5}V${y}H${b}V${y - 5}`);
    node.setAttribute("opacity", String(opacity));
    const w = labelNode.offsetWidth;
    labelNode.style.left = `${Math.min(Math.max((a + b) / 2 - w / 2, 0), SW - w)}px`;
    labelNode.style.top = `${y + 1}px`;
    labelNode.style.opacity = String(opacity);
  };
  const below = railY + RAIL + c.axisH + 8;
  bracket(c.brackets.before, c.bracketLabels.before, c.field.floorBefore, c.field.ceilBefore, below, spread * (1 - split));
  bracket(c.brackets.after, c.bracketLabels.after, c.field.floorAfter, c.field.ceilAfter, below + bracketRow, spread * (1 - split));

  const med = lerp(c.field.medianBefore, c.field.medianAfter, year);
  const mx = x(med);
  c.medianLine.setAttribute("x1", String(mx));
  c.medianLine.setAttribute("x2", String(mx));
  c.medianLine.setAttribute("y1", String(railY - 8));
  c.medianLine.setAttribute("y2", String(railY + RAIL + 8));
  c.medianLine.setAttribute("opacity", String(median * (1 - split)));
  const medText = c.medianLabel.dataset.template.replace("{v}", one(med));
  if (c.medianLabel.textContent !== medText) c.medianLabel.textContent = medText;
  const mw = c.medianLabel.offsetWidth;
  c.medianLabel.style.left = `${Math.min(Math.max(mx - mw / 2, 0), SW - mw)}px`;
  c.medianLabel.style.top = `${railY + RAIL + c.axisH + 6}px`;
  c.medianLabel.style.opacity = String(median * (1 - split));

  const figureOn = { range: 1 - year, median: median * (1 - split), floor, ceil, spread };
  for (const [key, node] of Object.entries(c.figures)) {
    node.style.opacity = String(clamp(figureOn[key] ?? 0));
    const valueNode = node.querySelector("[data-figure-value]");
    const text = valueNode.dataset.template.replace("{v}", one(med));
    if (valueNode.textContent !== text) valueNode.textContent = text;
  }
  c.splitNote.style.opacity = String(split);
}

function seatDotStrip(root, carrier) {
  const data = root.__stripData || (root.__stripData = JSON.parse(carrier.getAttribute("data-strip-chart")));
  const stage = root.querySelector('[data-part="stage"]');
  const svg = stage.querySelector('[data-part="field"]');
  const byStrip = (selector, strip) => Array.from(stage.querySelectorAll(`${selector}[data-strip="${strip}"]`));
  const chipsMain = data.marks.map((m) => stage.querySelector(`[data-chip="${m.code}"][data-strip="main"]`));
  const chipsTop = data.marks.map((m) => stage.querySelector(`[data-chip="${m.code}"][data-strip="top"]`));
  const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const h = Math.floor(s.length / 2);
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  };
  const before = data.marks.map((m) => m.before);
  const after = data.marks.map((m) => m.after);
  const yearLabels = { main: stage.querySelector('[data-year="main"]'), top: stage.querySelector('[data-year="top"]') };
  const probe = document.createElement("span");
  probe.style.cssText = `${yearLabels.main.style.cssText};position:absolute;visibility:hidden;left:0;top:0`;
  probe.textContent = "2000";
  stage.appendChild(probe);
  const yearW = probe.getBoundingClientRect().width + 12;
  probe.remove();
  const accentChip = chipsMain.find((_, i) => data.marks[i].code === data.subject);
  root.__strip = {
    ...data,
    stage,
    svg,
    yearWords: data.years,
    yearW,
    chips: { main: chipsMain, top: chipsTop },
    chipW: chipsMain.map((chip) => chip.getBoundingClientRect().width),
    chipMaxW: Math.max(...chipsMain.map((chip) => chip.getBoundingClientRect().width)),
    chipH: chipsMain[0].getBoundingClientRect().height,
    chipOnAccent: getComputedStyle(accentChip).color,
    axisH: stage.querySelector("[data-ticklabel]").getBoundingClientRect().height,
    rails: { main: svg.querySelector('[data-rail="main"]'), top: svg.querySelector('[data-rail="top"]') },
    railGroups: { main: svg.querySelector('[data-rail-group="main"]'), top: svg.querySelector('[data-rail-group="top"]') },
    ticks: { main: byStrip("line[data-tick]", "main"), top: byStrip("line[data-tick]", "top") },
    tickLabels: { main: byStrip("[data-ticklabel]", "main"), top: byStrip("[data-ticklabel]", "top") },
    years: yearLabels,
    stems: {
      main: data.marks.map((m) => svg.querySelector(`[data-stem="${m.code}"][data-strip="main"]`)),
      top: data.marks.map((m) => svg.querySelector(`[data-stem="${m.code}"][data-strip="top"]`)),
    },
    ghosts: data.marks.map((m) => svg.querySelector(`[data-ghost="${m.code}"]`)),
    trails: data.marks.map((m) => svg.querySelector(`[data-trail="${m.code}"]`)),
    leaders: data.marks.map((m) => svg.querySelector(`[data-leader="${m.code}"]`)),
    trailLabels: Object.fromEntries(Array.from(stage.querySelectorAll("[data-trail-label]")).map((n) => [n.dataset.trailLabel, n])),
    brackets: { before: svg.querySelector('[data-bracket="before"]'), after: svg.querySelector('[data-bracket="after"]') },
    bracketLabels: { before: stage.querySelector('[data-bracket-label="before"]'), after: stage.querySelector('[data-bracket-label="after"]') },
    medianLine: svg.querySelector('[data-part="median"]'),
    medianLabel: stage.querySelector('[data-part="median-label"]'),
    figures: Object.fromEntries(Array.from(stage.querySelectorAll("[data-figure]")).map((n) => [n.dataset.figure, n])),
    splitNote: root.querySelector('[data-part="split-note"]'),
    field: {
      floorBefore: Math.min(...before),
      ceilBefore: Math.max(...before),
      floorAfter: Math.min(...after),
      ceilAfter: Math.max(...after),
      medianBefore: median(before),
      medianAfter: median(after),
    },
  };
}
