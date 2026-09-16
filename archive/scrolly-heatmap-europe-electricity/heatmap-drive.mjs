// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   fill    the cells taking their class family by family: renewables, nuclear, fossil            0..families
//   sort    the rows from alphabetical order to their low-carbon share, the share column and the bracket 0..1
//   group   the rows above the floor regrouped into their routes, a gap between routes; the rest back   0..1
//   focus   one column read on its own, its one dark cell outlined                                     0..1
//   notes   the card's note in the header                                                              0..1
//
// EVERYTHING IS LAID OUT IN THE READER'S PIXELS on each paint: the name and share columns as wide as their widest
// text, nine cell columns in between, the route labels to the right on a wide stage. A row's y is interpolated
// between its three orders, so a row slides rather than jumps.

export function applyHeatmapState(root, state, context) {
  const carrier = root.querySelector("[data-heatmap]");
  if (!carrier) return;
  if (context.resized || !root.__heat) seatHeatmap(root, carrier);
  const c = root.__heat;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;

  const narrow = SW < 620;
  const sortE = ease(clamp(state.sort));
  const groupE = ease(clamp(state.group));
  const focus = clamp(state.focus);
  const rightW = narrow ? 0 : c.rightW + 18;
  const gridX0 = c.nameW + 8;
  const gridW = Math.max(90, SW - gridX0 - 10 - c.shareW - 14 - rightW);
  const colW = gridW / c.families.length;
  const shareX = gridX0 + gridW + 10;
  const headH = c.familyH + c.sourceH + 8;
  const n = c.rows.length;
  const gapCount = c.orders.grouped.length;
  const rowH = (SH - headH) / (n + gapCount * 0.5 * groupE);
  const gap = rowH * 0.5 * groupE;
  const cellPad = Math.max(1, Math.min(2, colW * 0.04));

  // Column heads: each family over its columns, each source over its column, short when the full name does not fit.
  c.familyNodes.forEach((node, f) => {
    const cols = c.families.map((fam, i) => (fam === f ? i : -1)).filter((i) => i >= 0);
    const x0 = gridX0 + cols[0] * colW;
    const w = cols.length * colW - 4;
    Object.assign(node.style, { left: `${x0}px`, width: `${w}px`, top: "0px" });
    // Full name, else its short form, else the rule alone: a name wider than its columns runs into the next family's.
    const text = c.familyFullW[f] <= w ? node.dataset.fullText : c.familyShortW[f] <= w ? node.dataset.short : "\u00A0";
    if (node.textContent !== text) node.textContent = text;
  });
  const shortHeads = c.sourceNodes.some((_, i) => c.sourceFullW[i] > colW - 2);
  c.abbreviations.style.display = shortHeads ? "" : "none";
  c.sourceNodes.forEach((node, i) => {
    const text = shortHeads ? node.dataset.short : node.dataset.full;
    if (node.textContent !== text) node.textContent = text;
    Object.assign(node.style, { left: `${gridX0 + i * colW}px`, width: `${colW}px`, top: `${c.familyH + 4}px` });
    node.style.opacity = String(i === c.focusColumn ? 1 : 1 - 0.6 * focus);
  });
  Object.assign(c.shareHead.style, { left: `${shareX}px`, top: `${c.familyH + 4}px`, opacity: String(sortE) });

  const yOf = (key) => {
    const a = c.orders.alpha.indexOf(key);
    const b = c.orders.sorted.indexOf(key);
    let gi = 0;
    let before = 0;
    let found = -1;
    for (const block of c.orders.grouped) {
      const k = block.indexOf(key);
      if (k >= 0) {
        found = gi + k;
        break;
      }
      gi += block.length;
      before++;
    }
    if (found < 0) {
      found = b;
      before = gapCount;
    }
    return headH + lerp(lerp(a, b, sortE), found, groupE) * rowH + before * gap;
  };

  const above = new Set(c.orders.grouped.flat());
  for (const row of c.rows) {
    const y = yOf(row.key);
    Object.assign(row.el.style, { top: `${y}px`, height: `${rowH}px` });
    row.el.style.opacity = String(above.has(row.key) ? 1 : 1 - 0.75 * groupE);
    Object.assign(row.name.style, { left: "0px", width: `${c.nameW}px`, top: "50%", transform: "translateY(-50%)" });
    row.cells.forEach((cell, col) => {
      const shown = clamp(state.fill - c.families[col]);
      Object.assign(cell.style, { left: `${gridX0 + col * colW + cellPad}px`, width: `${colW - 2 * cellPad}px`, top: `${cellPad}px`, height: `${rowH - 2 * cellPad}px` });
      cell.style.background = mixHex(c.empty, c.fills[row.classes[col]], shown);
      cell.style.opacity = String(col === c.focusColumn ? 1 : 1 - 0.7 * focus);
    });
    Object.assign(row.share.style, { left: `${shareX}px`, top: "50%", transform: "translateY(-50%)", opacity: String(sortE) });
  }

  // The bracket around the rows above the floor, while they are one block.
  const tops = [...above].map(yOf);
  const blockTop = Math.min(...tops);
  const blockBottom = Math.max(...tops) + rowH;
  const bracketX = shareX + c.shareW + 6;
  Object.assign(c.bracket.style, { left: `${bracketX}px`, top: `${blockTop + 2}px`, height: `${blockBottom - blockTop - 4}px`, opacity: String(sortE * (1 - groupE)) });
  Object.assign(c.region.style, { left: `${bracketX + 12}px`, top: `${(blockTop + blockBottom) / 2}px`, transform: "translateY(-50%)", opacity: String(narrow ? 0 : sortE * (1 - groupE)) });

  // Each route named beside its block, once the rows have regrouped.
  c.orders.grouped.forEach((block, i) => {
    const ys = block.map(yOf);
    const node = c.routes[i];
    Object.assign(node.style, { left: `${bracketX + 4}px`, top: `${(Math.min(...ys) + Math.max(...ys) + rowH) / 2}px`, transform: "translateY(-50%)", opacity: String(narrow ? 0 : groupE * (1 - 0.6 * focus)) });
  });

  // The one dark cell of the focused column.
  const fy = yOf(c.focusRow);
  Object.assign(c.focusBox.style, { left: `${gridX0 + c.focusColumn * colW - 1}px`, top: `${fy - 1}px`, width: `${colW + 2}px`, height: `${rowH + 2}px`, opacity: String(focus) });

  const notes = { sortNote: sortE * (1 - groupE), routeNote: groupE * (1 - focus), focusNote: focus };
  showOneNote(Object.entries(c.notes).map(([key, node]) => [node, notes[key] * clamp(state.notes)]));
}

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

function seatHeatmap(root, carrier) {
  const data = root.__heatData || (root.__heatData = JSON.parse(carrier.getAttribute("data-heatmap")));
  const stage = root.querySelector('[data-part="stage"]');
  const measure = (node, text) => {
    const probe = node.cloneNode(false);
    probe.style.cssText = `${node.style.cssText};position:absolute;visibility:hidden;width:auto;left:0;top:0;transform:none;white-space:nowrap`;
    probe.textContent = text;
    node.parentElement.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return r;
  };
  const rows = data.rows.map((r) => {
    const el = stage.querySelector(`[data-row="${CSS.escape(r.key)}"]`);
    return { ...r, el, name: el.querySelector('[data-part="name"]'), share: el.querySelector('[data-part="share"]'), cells: Array.from(el.querySelectorAll("[data-cell]")) };
  });
  const familyNodes = Array.from(stage.querySelectorAll("[data-family]"));
  for (const node of familyNodes) node.dataset.fullText = node.dataset.fullText || node.textContent;
  const sourceNodes = Array.from(stage.querySelectorAll("[data-source]"));
  const routes = Array.from(stage.querySelectorAll("[data-route]"));
  const region = stage.querySelector('[data-part="region"]');
  root.__heat = {
    ...data,
    stage,
    rows,
    familyNodes,
    sourceNodes,
    familyFullW: familyNodes.map((n) => measure(n, n.dataset.fullText).width),
    familyShortW: familyNodes.map((n) => measure(n, n.dataset.short).width),
    abbreviations: root.querySelector('[data-part="abbreviations"]'),
    sourceFullW: sourceNodes.map((n) => measure(n, n.dataset.full).width),
    familyH: measure(familyNodes[0], "Hg").height + 2,
    sourceH: measure(sourceNodes[0], "Hg").height,
    nameW: Math.ceil(Math.max(...rows.map((r) => measure(r.name, r.name.textContent).width))),
    shareW: Math.ceil(Math.max(...rows.map((r) => measure(r.share, r.share.textContent).width))),
    rightW: Math.ceil(Math.max(measure(region, region.textContent).width, ...routes.map((n) => measure(n, n.textContent).width))),
    shareHead: stage.querySelector('[data-part="share-head"]'),
    bracket: stage.querySelector('[data-part="bracket"]'),
    region,
    routes,
    focusBox: stage.querySelector('[data-part="focus"]'),
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
