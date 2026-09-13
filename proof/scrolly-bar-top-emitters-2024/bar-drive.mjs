// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field (every gesture scrubbed by the reader's own scroll):
//   rise    the nine columns after the first rising one by one, the tenth first      0..1
//   china   the first column rising last, its value counting up                     0..1
//   stack   the set the headline adds up sliding onto the second slot and stacking    0..1
//   rule    the rule at the first column's level                                     0..1
//   world   the ten's share of the world total                                       0..1
//
// THE ORIENTATION IS MEASURED, on the first paint and after every resize: columns when every name fits
// its column in two lines and every value its step, rows otherwise — names are never rotated or cut.
//
// THE STACK IS MEASURED TOO. On a resize the driver records every bar's natural box in its container;
// stacking translates each bar of the set from that box to its seat in the stack — in columns onto the
// second slot, each on top of the one before; in rows end to end along the second row — so the pile a
// reader compares with the first column is built out of the very marks they were just reading.

export function applyBarState(root, state, context) {
  if (context.resized || !root.__bar) seatBar(root);
  const c = root.__bar;
  if (!c) return;
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const format = (v) => (v >= 1 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");
  const n = c.bars.length;

  for (let rank = 0; rank < n; rank++) {
    const bar = c.bars[rank];
    const value = c.values[rank];
    const scale = rank === 0 ? state.china : clamp(state.rise * (n - 1) - (n - 1 - rank));
    const inSet = c.set.includes(rank);
    const seat = c.seats[rank];
    const dx = inSet ? seat.dx * state.stack : 0;
    const dy = inSet ? seat.dy * state.stack : 0;
    const dim = !inSet && rank > 0 ? 1 - 0.65 * state.stack : 1;
    bar.el.style.transform = c.rows
      ? `translate(${dx}px, ${dy}px) scaleX(${scale})`
      : `translate(${dx}px, ${dy}px) scaleY(${scale})`;
    bar.el.style.opacity = String(dim);
    // Once stacked, each block keeps a seam of the ground on its leading edge, so the pile reads as the
    // five countries it adds up and not as one taller bar.
    bar.el.style.boxShadow = inSet && state.stack > 0 ? `inset ${c.rows ? "-2px 0" : "0 2px"} 0 ${c.ground}` : "none";

    const amount = Number(value.el.dataset.amount);
    const text = format(amount * scale);
    if (value.el.textContent !== text) value.el.textContent = text;
    const follow = c.rows ? `translateY(-50%) translateX(${-(1 - scale) * bar.box.width}px)` : `translate(-50%, ${(1 - scale) * bar.box.height - 6}px)`;
    value.el.style.transform = follow;
    value.el.style.opacity = String((scale > 0.02 ? 1 : 0) * (inSet ? 1 - state.stack : dim));
  }

  const label = c.stackLabel;
  label.style.left = `${c.stackTop.x}px`;
  label.style.top = `${c.stackTop.y}px`;
  label.style.transform = c.rows ? "translateY(-50%)" : "translate(-50%, -100%)";
  label.style.opacity = String(state.stack);

  if (c.rule) c.rule.style.opacity = String(state.rule);
  for (const node of c.static) node.style.opacity = "0";
  c.world.style.opacity = String(state.world);
}

export function seatBar(root) {
  chooseOrientation(root);
  const orient = root.querySelector(`[data-orient="${root.dataset.orientation || "columns"}"]`);
  if (!orient) return;
  const rows = orient.getAttribute("data-orient") === "rows";
  const carrier = root.querySelector("[data-set-ranks]");
  const set = JSON.parse(carrier.getAttribute("data-set-ranks"));

  // Natural boxes, with every transform off, relative to the container the bars are positioned in.
  const barEls = Array.from(orient.querySelectorAll('[data-part="bar"]')).sort((a, b) => a.dataset.rank - b.dataset.rank);
  const valueEls = Array.from(orient.querySelectorAll('[data-part="value"]')).sort((a, b) => a.dataset.rank - b.dataset.rank);
  for (const el of [...barEls, ...valueEls]) el.style.transform = "none";
  // Boxes are taken relative to the container the stack label is positioned in (the columns' plot, the
  // rows' grid), so the label's seat and the bars' boxes share one origin.
  const stackLabel = orient.querySelector('[data-part="stack-label"]');
  const frame = (stackLabel.offsetParent || orient).getBoundingClientRect();
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left - frame.left, top: r.top - frame.top, width: r.width, height: r.height };
  };
  const bars = barEls.map((el) => ({ el, box: boxOf(el) }));
  const values = valueEls.map((el) => ({ el, box: boxOf(el) }));

  const anchor = bars[set[0]].box;
  const seats = bars.map(() => ({ dx: 0, dy: 0 }));
  let run = 0;
  for (const rank of set) {
    const box = bars[rank].box;
    if (rows) {
      seats[rank] = { dx: anchor.left + run - box.left, dy: anchor.top - box.top };
      run += box.width;
    } else {
      seats[rank] = { dx: anchor.left - box.left, dy: -run };
      run += box.height;
    }
  }
  const stackTop = rows
    ? { x: anchor.left + run + 6, y: anchor.top + anchor.height / 2 }
    : { x: anchor.left + anchor.width / 2, y: anchor.top + anchor.height - run - 6 };

  root.__bar = {
    rows,
    set,
    bars,
    values,
    seats,
    stackTop,
    stackLabel,
    ground: getComputedStyle(root.querySelector('[role="img"]')).backgroundColor,
    rule: orient.querySelector('[data-part="rule"]'),
    static: Array.from(orient.querySelectorAll('[data-part="bracket"], [data-part="note"]')),
    world: orient.querySelector('[data-part="world"]'),
  };
}

export function chooseOrientation(root) {
  const columns = root.querySelector('[data-orient="columns"]');
  const rows = root.querySelector('[data-orient="rows"]');
  if (!columns || !rows) return;
  // Shown by `style.display`, not `hidden`: each container sets its own inline display.
  columns.style.display = "grid";
  rows.style.display = "none";
  for (const el of columns.querySelectorAll('[data-part="bar"], [data-part="value"]')) el.style.transform = "";

  let fits = true;
  for (const name of columns.querySelectorAll('[data-part="name"]')) {
    const lineHeight = Number.parseFloat(getComputedStyle(name).lineHeight);
    if (name.scrollWidth > name.clientWidth + 1 || name.offsetHeight > lineHeight * 2 + 1) fits = false;
    // A single word wider than its column overflows without growing the box; test each word alone.
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    probe.style.font = getComputedStyle(name).font;
    probe.style.letterSpacing = getComputedStyle(name).letterSpacing;
    name.parentElement.appendChild(probe);
    for (const word of name.textContent.split(/\s+/)) {
      probe.textContent = word;
      if (probe.offsetWidth > name.clientWidth) fits = false;
    }
    probe.remove();
  }
  const values = Array.from(columns.querySelectorAll('[data-part="value"]'));
  const boxes = values.map((v) => v.getBoundingClientRect());
  for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i - 1].right + 4) fits = false;

  // The names row is as tall as its tallest name, not a fixed two lines: a row sized for two lines under
  // names that all fit on one left a band of bare ground under the chart.
  const namesRow = columns.querySelector('[data-part="names-row"]');
  if (namesRow) namesRow.style.height = `${Math.max(...Array.from(columns.querySelectorAll('[data-part="name"]')).map((n) => n.offsetHeight))}px`;
  columns.style.display = fits ? "grid" : "none";
  rows.style.display = fits ? "none" : "grid";
  root.dataset.orientation = fits ? "columns" : "rows";
}
