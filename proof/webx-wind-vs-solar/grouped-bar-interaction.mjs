// twin/proof/webx-wind-vs-solar/grouped-bar-interaction.mjs
//
// This beat's OWN interaction script — the skill's own `assets/interaction.mjs` resolves a pointer
// to the NEAREST of many points along one continuous axis (built for a line); twelve already-large
// bars have nothing to interpolate between, every bar is already its own direct hit target. The
// same reasoning `proof/web-co2-ranking/bar-interaction.mjs` gives for its own rows.
//
// What hover/tap/keyboard-focus reveals here that the static frame omits: the exact share to two
// decimals AND the absolute terawatt-hours behind it (`data-detail`) — never printed on the static
// frame, which only prints the rounded one-decimal share.
//
// Plain script (no ES module `export`) — no pure helper worth unit-testing on its own, only direct
// DOM wiring, proven by driving a real browser (`web-discipline.md`, "Verification").

function initBars() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const bars = Array.prototype.slice.call(document.querySelectorAll(".bar-hit"));
  if (bars.length === 0) return;

  function clear() {
    bars.forEach(function (b) {
      b.classList.remove("bar-active");
    });
    tooltip.hidden = true;
  }

  function show(bar, clientX, clientY) {
    bars.forEach(function (b) {
      b.classList.toggle("bar-active", b === bar);
    });
    tooltip.textContent = bar.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  bars.forEach(function (bar) {
    bar.addEventListener("pointerenter", function (evt) {
      show(bar, evt.clientX, evt.clientY);
    });
    bar.addEventListener("pointermove", function (evt) {
      show(bar, evt.clientX, evt.clientY);
    });
    bar.addEventListener("pointerdown", function (evt) {
      show(bar, evt.clientX, evt.clientY);
    });
    bar.addEventListener("pointerleave", clear);
    bar.addEventListener("focus", function () {
      const rect = bar.getBoundingClientRect();
      show(bar, rect.left + rect.width / 2, rect.top);
    });
    bar.addEventListener("blur", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    const target = evt.target;
    if (target && typeof target.closest === "function" && target.closest(".bar-hit")) return;
    clear();
  });
}

if (typeof document !== "undefined") initBars();
