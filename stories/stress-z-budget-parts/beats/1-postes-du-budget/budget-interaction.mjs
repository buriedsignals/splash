// stories/stress-z-budget-parts/beats/1-postes-du-budget/budget-interaction.mjs
//
// This beat's OWN interaction script. The skill's `assets/interaction.mjs` resolves a pointer to the
// NEAREST of many points along one continuous axis (built for a 75-reading line); seven budget rows
// have nothing to interpolate between, and every row is already a full-width, full-band hit target.
// `render-web.mjs` still calls the skill's generic `renderWeb` (the one way in) and lets it inline
// `interaction.mjs` as usual — that script finds no `.pt` circles here and is a no-op behind its own
// `if (points.length === 0) return;` guard. This script is appended as a second inline block and
// reuses the same shared `#tooltip` the format's HTML wrapper already builds.
//
// What hover, tap and keyboard focus reveal that the printed frame omits: the SHARE. The frame
// prints each line's amount in millions of euros; `data-detail` adds that line's own percentage of
// the primitive budget, which is the second reading the article gives and the one the drawing has
// no room to print seven times. Never a value invented for the sake of having one
// (`web-discipline.md`, "What hover reveals").
//
// Written as a plain script, no ES module `export`: there is no pure helper here worth unit-testing
// on its own, only direct DOM wiring, which this format proves by driving a real browser.

function initBudgetRows() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const rows = Array.prototype.slice.call(document.querySelectorAll(".row-hit"));
  if (rows.length === 0) return;

  function clear() {
    rows.forEach(function (r) {
      r.classList.remove("row-active");
    });
    tooltip.hidden = true;
  }

  function show(row, clientX, clientY) {
    rows.forEach(function (r) {
      r.classList.toggle("row-active", r === row);
    });
    tooltip.textContent = row.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 200;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    // Above the row by default, flipped BELOW when that would put the tooltip back over the
    // chart's own header. The floor is read from the DOM — the plot's own zero line, scoped to the
    // row's own <svg> — never hardcoded, so it stays correct if the header's height ever changes.
    const svg = row.closest("svg");
    const zeroLine = svg && svg.querySelector("line");
    const plotTop = zeroLine ? zeroLine.getBoundingClientRect().top : 8;
    const above = clientY - th - 14;
    const y = above >= plotTop ? above : clientY + 14;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  rows.forEach(function (row) {
    row.addEventListener("pointerenter", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    row.addEventListener("pointermove", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    row.addEventListener("pointerdown", function (evt) {
      show(row, evt.clientX, evt.clientY);
    });
    row.addEventListener("pointerleave", clear);
    row.addEventListener("focus", function () {
      const rect = row.getBoundingClientRect();
      show(row, rect.left + rect.width / 2, rect.top);
    });
    row.addEventListener("blur", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    const target = evt.target;
    if (target && typeof target.closest === "function" && target.closest(".row-hit")) return;
    clear();
  });
}

if (typeof document !== "undefined") initBudgetRows();
