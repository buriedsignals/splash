// twin/proof/mapgen-choropleth-web/interaction.mjs
//
// The one script this beat ships for its FALLBACK layer, inlined verbatim into the self-contained
// HTML by `render-web.mjs` (which strips the `export` keyword from each top-level declaration so
// this file can also sit as a plain classic `<script>` — no `type="module"`, no bundler). This is
// THIS beat's own copy of `twin-map-web/assets/interaction.mjs`'s mechanics — a duplicate, never an
// import across a beat or out of a skill (`splash-twin/test/no-cross-skill-imports.test.ts` fails
// loud on either) — with the one adjustment a choropleth needs.
//
// THE ADJUSTMENT, and it is the whole difference between a point beat and a polygon one. In the
// symbol seed the `.pt` button IS the target: a circle's own mark is small, and a fixed 28px button
// on its centre is a fair stand-in for it. A country is not. Its own painted `<path>` is the fair
// target — B6.14a, "no country whose hover only fires over its capital" — so every region path
// carries `data-key` and forwards a pointer that lands on it to the button of the SAME key. One
// reading, never a second competing target, and never a neighbour's disc answering for the country
// underneath it. The six regions genuinely too small to point at (`ChoroplethWeb.tsx`'s own
// `needsPointerTarget`) are the exception: their buttons are the only pointer-active ones
// (`render-web.mjs`'s `.mw-overlay .pt-small` rule).
//
// WHEN THIS SCRIPT MATTERS AND WHEN IT DOES NOT. Since ruling R1 the page's display surface is a
// live MapTiler map (`live-map.mjs`), which hit-tests its own rendered fill and shows the same
// `data-detail` this file shows. This script is what answers in the state that layer never reaches:
// JavaScript on but no key, no network, or a style that failed. It also owns the keyboard path in
// BOTH states — the buttons keep their Tab stop when the live map swaps in.
//
// `initRegions`/`initAll` are DOM wiring and are NOT unit-tested here: per `twin-doctrine`'s own
// verification rule, an interactive genre is verified by driving a real browser, not asserting
// against a DOM emulation nobody looked at.

/** Wires every `.pt` button on the page — and every region `<path>` that forwards to one — to
 *  hover, tap and keyboard, sharing the one tooltip element. Every region already carries its own
 *  `data-detail` string and its own `aria-label`; this function never invents either. */
export function initRegions(buttons, tooltip) {
  if (buttons.length === 0) return;
  const byKey = {};
  buttons.forEach(function (b) {
    byKey[b.getAttribute("data-key")] = b;
  });
  const shapes = Array.prototype.slice.call(
    document.querySelectorAll(".region[data-key]"),
  );

  function clear() {
    buttons.forEach((b) => b.classList.remove("pt-active"));
    shapes.forEach((s) => s.classList.remove("pt-active"));
    tooltip.hidden = true;
  }

  /** The active reading, marked on the PLATE (the region's own path brightens) rather than by a
   *  disc floating at a country's centroid, and printed in the shared tooltip. */
  function show(button, clientX, clientY) {
    const key = button.getAttribute("data-key");
    buttons.forEach((b) => b.classList.toggle("pt-active", b === button));
    shapes.forEach((s) =>
      s.classList.toggle("pt-active", s.getAttribute("data-key") === key),
    );
    tooltip.textContent = button.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  buttons.forEach(function (button, i) {
    // Hover and tap share one path: pointer events fire for mouse, pen and touch alike.
    button.addEventListener("pointerenter", function (evt) {
      show(button, evt.clientX, evt.clientY);
    });
    button.addEventListener("pointermove", function (evt) {
      show(button, evt.clientX, evt.clientY);
    });
    button.addEventListener("pointerleave", clear);

    // Keyboard: a <button> is already natively focusable and reachable with this script absent
    // entirely (works with JS off, exactly like the `title` attribute's own native tooltip). This
    // layer adds the same detail box hover shows, plus Arrow/Home/End to move between regions
    // without leaving focus, in the SAME highest-value-first order the accessible table below the
    // map also reads in (`ChoroplethWeb.tsx`'s own DOM order).
    button.addEventListener("focus", function () {
      const rect = button.getBoundingClientRect();
      show(button, rect.left + rect.width / 2, rect.top);
    });
    button.addEventListener("blur", clear);
    button.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowRight" || evt.key === "ArrowDown")
        nextIndex = Math.min(i + 1, buttons.length - 1);
      else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp")
        nextIndex = Math.max(i - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = buttons.length - 1;
      else if (evt.key === "Escape") {
        clear();
        button.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== i) {
        evt.preventDefault();
        buttons[nextIndex].focus();
      }
    });
  });

  // The region paths: the fair pointer target for every country big enough to be one, forwarding to
  // the SAME button — never its own tab stop (a path is not focusable and carries no `data-detail`),
  // never a second target competing with the region it stands for.
  shapes.forEach(function (shape) {
    const button = byKey[shape.getAttribute("data-key")];
    if (!button) return;
    shape.addEventListener("pointerenter", function (evt) {
      show(button, evt.clientX, evt.clientY);
    });
    shape.addEventListener("pointermove", function (evt) {
      show(button, evt.clientX, evt.clientY);
    });
    shape.addEventListener("pointerleave", clear);
  });

  document.addEventListener("pointerdown", function (evt) {
    if (
      buttons.some((b) => b.contains(evt.target)) ||
      shapes.some((s) => s.contains(evt.target)) ||
      tooltip.contains(evt.target)
    )
      return;
    clear();
  });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const buttons = Array.prototype.slice.call(document.querySelectorAll(".pt"));
  initRegions(buttons, tooltip);
}

// Guarded rather than a bare top-level call: this file is also importable in a context with no
// `document` (a test). In the browser the guard is always true, so the inlined `<script>` still
// self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
