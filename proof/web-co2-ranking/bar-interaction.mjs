// twin/proof/web-co2-ranking/bar-interaction.mjs
//
// This beat's OWN interaction script — the skill's own `assets/interaction.mjs` resolves a pointer
// to the NEAREST of many points along one continuous axis (built for a 75-reading line); a ten-row
// ranking bar chart has nothing to interpolate between, every row is already its own large,
// already-labelled hit target. `render-web.mjs` still calls the skill's generic `renderWeb` (the
// one way in) and lets it inline `interaction.mjs` as usual — that script finds no `.pt` circles in
// this beat's markup and is a harmless no-op (`initChart`'s own `if (points.length === 0) return;`
// guard). `render-web.mjs` then appends THIS script as a second inline `<script>`, reusing the same
// shared `#tooltip` element the skill's HTML wrapper already builds.
//
// What hover/tap/keyboard-focus reveals here that the static frame omits: the PRECISE reading
// (`data-detail`, four decimal places — the exact figures `BRIEF.md` verified) behind each row's
// own ROUNDED printed label (one decimal, `RankingWeb.tsx`) — never a value invented for the sake
// of having one (`web-discipline.md`, "What hover reveals").
//
// Written as a plain script (no ES module `export`, unlike the skill's own `interaction.mjs`): this
// file has no pure helper worth unit-testing on its own — there is no "nearest" computation to
// verify, only direct DOM wiring, which `web-discipline.md`'s "Verification" section says is proven
// by driving a real browser, not a test.

function initBars() {
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
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    // Above the row by default, but flipped BELOW when that would land the tooltip back over the
    // chart's own header (title/subtitle/source) — the topmost row (Poland, in this beat's own
    // data) sits close enough to the source line that "above the row, with a 14px gap" is only 3px
    // short of clearing it, an overlap a fixed `Math.max(..., 8)` viewport-relative floor never
    // catches, because the header's own bottom edge (~156px here) sits far below the viewport top
    // (8px) it was checking against instead. Confirmed by hovering the real topmost row in a live
    // browser and reading the two rects, not by eyeballing the offsets. The true floor is read from
    // the DOM (the plot's own y-axis line, scoped to the row's own <svg> — desktop and narrow
    // layouts share the markup but size differently), never hardcoded, so it stays correct if the
    // header's own height ever changes.
    const svg = row.closest("svg");
    const axisLine = svg && svg.querySelector("line");
    const plotTop = axisLine ? axisLine.getBoundingClientRect().top : 8;
    const above = clientY - th - 14;
    const y = above >= plotTop ? above : clientY + 14;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  rows.forEach(function (row) {
    // Pointer events fire for mouse, pen and touch alike — same rule the skill's own
    // `interaction.mjs` keeps, here trivial since each row is already a full-width, full-band
    // target: no nearest-point search needed, a tap anywhere on the row hits that row.
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

if (typeof document !== "undefined") initBars();
