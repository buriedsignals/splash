// twin/proof/webx-electricity-mix/stacked-bar-interaction.mjs
//
// This beat's OWN interaction script — the skill's own `assets/interaction.mjs` resolves a pointer
// to the NEAREST of many points along one continuous axis (built for a line); eighteen segments
// (six countries x three roles) are each already their own direct hit target, the same reasoning
// `proof/web-co2-ranking/bar-interaction.mjs` and `proof/webx-wind-vs-solar/grouped-bar-
// interaction.mjs` give for their own bars.
//
// What hover/tap/keyboard-focus reveals here that the static frame omits: the exact share to two
// decimals AND the absolute terawatt-hours behind it (`data-detail`) for EVERY segment, including
// the sub-2%-band slivers the static frame's own minimum-label-height floor prints no value for at
// all — the specific gap `references/types/stacked-bar.md` names for this type ("only the bottom
// segment shares a genuine common baseline... can't be measured accurately by eye").
//
// Plain script (no ES module `export`) — direct DOM wiring only, proven by driving a real browser.

function initSegments() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const segments = Array.prototype.slice.call(document.querySelectorAll(".segment-hit"));
  if (segments.length === 0) return;

  function clear() {
    segments.forEach(function (s) {
      s.classList.remove("segment-active");
    });
    tooltip.hidden = true;
  }

  function show(segment, clientX, clientY) {
    segments.forEach(function (s) {
      s.classList.toggle("segment-active", s === segment);
    });
    tooltip.textContent = segment.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  segments.forEach(function (segment) {
    segment.addEventListener("pointerenter", function (evt) {
      show(segment, evt.clientX, evt.clientY);
    });
    segment.addEventListener("pointermove", function (evt) {
      show(segment, evt.clientX, evt.clientY);
    });
    segment.addEventListener("pointerdown", function (evt) {
      show(segment, evt.clientX, evt.clientY);
    });
    segment.addEventListener("pointerleave", clear);
    segment.addEventListener("focus", function () {
      const rect = segment.getBoundingClientRect();
      show(segment, rect.left + rect.width / 2, rect.top);
    });
    segment.addEventListener("blur", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    const target = evt.target;
    if (target && typeof target.closest === "function" && target.closest(".segment-hit")) return;
    clear();
  });
}

if (typeof document !== "undefined") initSegments();
