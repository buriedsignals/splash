// twin/proof/webx-carbon-footprint/histogram-interaction.mjs
//
// This beat's OWN interaction script — the skill's own `assets/interaction.mjs` resolves a pointer
// to the NEAREST of many points along one continuous axis (built for a line); ten already-large,
// edge-to-edge bins are each already their own direct hit target.
//
// What hover/tap/keyboard-focus reveals here that the static frame omits: WHICH countries fall in
// a bin, not just how many — the one thing a histogram's bar height cannot carry
// (`HistogramWeb.tsx`'s own header comment). The tooltip for this beat is taller/wider than the
// skill's default (see `render-web.mjs`'s own CSS override) because a bin can hold well over a
// hundred country names; it scrolls internally rather than truncating the list, so no country is
// silently dropped from what a reader can ask for.
// Plain script (no ES module `export`) — direct DOM wiring only, proven by driving a real browser.

function initBins() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const bins = Array.prototype.slice.call(document.querySelectorAll(".bin-hit"));
  if (bins.length === 0) return;

  function clear() {
    bins.forEach(function (b) {
      b.classList.remove("bin-active");
    });
    tooltip.hidden = true;
  }

  function show(bin, clientX, clientY) {
    bins.forEach(function (b) {
      b.classList.toggle("bin-active", b === bin);
    });
    tooltip.textContent = bin.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 220;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  bins.forEach(function (bin) {
    bin.addEventListener("pointerenter", function (evt) {
      show(bin, evt.clientX, evt.clientY);
    });
    bin.addEventListener("pointermove", function (evt) {
      show(bin, evt.clientX, evt.clientY);
    });
    bin.addEventListener("pointerdown", function (evt) {
      show(bin, evt.clientX, evt.clientY);
    });
    bin.addEventListener("pointerleave", clear);
    bin.addEventListener("focus", function () {
      const rect = bin.getBoundingClientRect();
      show(bin, rect.left + rect.width / 2, rect.top);
    });
    bin.addEventListener("blur", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    const target = evt.target;
    if (target && typeof target.closest === "function" && target.closest(".bin-hit")) return;
    clear();
  });
}

if (typeof document !== "undefined") initBins();
