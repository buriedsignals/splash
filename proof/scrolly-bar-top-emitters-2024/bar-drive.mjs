// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option and
// called by `skills/scrolly/assets/reveal.mjs` with the state the scroll has reached.
//
// A STATE, field by field:
//   grow    the columns rising from the baseline                         0..1
//   values  every column's own number                                    0..1
//   rule    the rule at the subject's level, drawn out across the set    0..1
//   set     the bracket under the set and the sum printed on it          0..1
//
// THE ORIENTATION IS MEASURED, on the first paint and after every resize. Columns are shown when every
// name fits its column in at most two lines and every value fits its column's step; otherwise the
// rows are. Names are never rotated and never cut, which is the static plate's own rule — a frame too
// narrow to keep it in columns keeps it in rows.

export function applyBarState(root, state, context) {
  if (context.resized) chooseOrientation(root);
  const orient = root.querySelector(`[data-orient="${root.dataset.orientation || "columns"}"]`);
  if (!orient) return;
  const rows = orient.getAttribute("data-orient") === "rows";
  for (const bar of orient.querySelectorAll('[data-part="bar"]'))
    bar.style.transform = rows ? `scaleX(${state.grow})` : `scaleY(${state.grow})`;
  for (const value of orient.querySelectorAll('[data-part="value"]')) value.style.opacity = String(state.values);
  const rule = orient.querySelector('[data-part="rule"]');
  if (rule) {
    const line = rows ? rule.firstElementChild : rule;
    line.style.transform = rows ? `scaleY(${state.rule})` : `scaleX(${state.rule})`;
  }
  for (const name of ["bracket", "note"]) {
    const node = orient.querySelector(`[data-part="${name}"]`);
    if (node) node.style.opacity = String(state.set);
  }
}

export function chooseOrientation(root) {
  const columns = root.querySelector('[data-orient="columns"]');
  const rows = root.querySelector('[data-orient="rows"]');
  if (!columns || !rows) return;
  // Shown by `style.display`, not `hidden`: each container sets its own inline display.
  columns.style.display = "grid";
  rows.style.display = "none";

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
  const note = columns.querySelector('[data-part="note"]');
  const bracket = columns.querySelector('[data-part="bracket"]');
  if (note && bracket && note.getBoundingClientRect().width > bracket.getBoundingClientRect().width) fits = false;

  columns.style.display = fits ? "grid" : "none";
  rows.style.display = fits ? "none" : "grid";
  root.dataset.orientation = fits ? "columns" : "rows";
}
