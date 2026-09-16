// twin/proof/webx-germany-bridge/waterfall-interaction.mjs
//
// This beat's OWN interaction script — the skill's own `assets/interaction.mjs` resolves a pointer
// to the NEAREST of many points along one continuous axis (built for a line); the three delta bars
// here are each already their own direct hit target, the same reasoning every bar-family beat in
// this corpus gives for its own interaction script.
//
// Only `.step-hit` targets exist in this beat's markup (the two total bars deliberately have none
// — see `WaterfallWeb.tsx`'s own header comment) — what hover/tap/keyboard-focus reveals is the
// running total Germany's generation reached immediately after that step, alongside the delta the
// static frame already prints.
//
// Plain script (no ES module `export`) — direct DOM wiring only, proven by driving a real browser.

function initSteps() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const steps = Array.prototype.slice.call(document.querySelectorAll(".step-hit"));
  if (steps.length === 0) return;

  function clear() {
    steps.forEach(function (s) {
      s.classList.remove("step-active");
    });
    tooltip.hidden = true;
  }

  function show(step, clientX, clientY) {
    steps.forEach(function (s) {
      s.classList.toggle("step-active", s === step);
    });
    tooltip.textContent = step.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 200;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  steps.forEach(function (step) {
    step.addEventListener("pointerenter", function (evt) {
      show(step, evt.clientX, evt.clientY);
    });
    step.addEventListener("pointermove", function (evt) {
      show(step, evt.clientX, evt.clientY);
    });
    step.addEventListener("pointerdown", function (evt) {
      show(step, evt.clientX, evt.clientY);
    });
    step.addEventListener("pointerleave", clear);
    step.addEventListener("focus", function () {
      const rect = step.getBoundingClientRect();
      show(step, rect.left + rect.width / 2, rect.top);
    });
    step.addEventListener("blur", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    const target = evt.target;
    if (target && typeof target.closest === "function" && target.closest(".step-hit")) return;
    clear();
  });
}

if (typeof document !== "undefined") initSteps();
