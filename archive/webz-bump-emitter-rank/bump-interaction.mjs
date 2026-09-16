// twin/proof/webz-bump-emitter-rank/bump-interaction.mjs
//
// This beat's OWN interaction script. The skill's `assets/interaction.mjs` resolves a pointer to the
// nearest of many points along ONE continuous axis — right for a single line, wrong here: this frame
// carries six lines over the same 35 columns, so "nearest by x" would answer with whichever country
// happened to be listed first and never with the line the reader is pointing at. `render-web.mjs`
// still calls the skill's generic `renderWeb` (the one way in) and lets it inline `interaction.mjs`
// as usual — that script finds no `.pt` circles in this beat's markup and is a harmless no-op
// (`initChart`'s own `if (points.length === 0) return;` guard) — and then appends THIS script as a
// second inline `<script>`, reusing the same shared `#tooltip` the skill's HTML wrapper builds.
//
// WHAT IT ADDS, and why it is this type's own interaction rather than a generic one
// (`references/types/bump.md`: "past a handful of competing entities, the tangle of crossing lines
// stops being readable as individual trajectories"):
//
//   1. NEAREST READING IN BOTH AXES, not by x alone. The reading unit of a bump chart is
//      country × year, and two countries share every x on the frame.
//   2. TRACING. The answering reading's whole COUNTRY comes forward and the others recede, so a
//      reader can follow one line through the crossings — which is the only thing this type exists
//      to make possible. The subject's own accent line is never receded: it is the argument, and
//      the CSS that does this (appended by `render-web.mjs`) exempts `.line.subject` explicitly.
//   3. ARROW KEYS ALONG A LINE. Left/Right walk a country's own years, Up/Down step to the
//      neighbouring RANK in the same year, Home/End jump to that country's first and last year.
//      Every node is already `tabIndex=0` with its own `aria-label` at build time, so this is speed,
//      not access: with the script absent, plain Tab still reaches all 210 readings.
//
// Written as a plain script (no ES module `export`, unlike the skill's own `interaction.mjs`): its
// one non-trivial computation, `nearest`, is a two-line squared-distance loop over cached rects, and
// `web-discipline.md`'s "Verification" section is explicit that DOM wiring is proven by driving a
// real browser, not by a unit test.

function initBump() {
  var tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  var figure = document.querySelector(".bump-figure");
  if (!figure) return;
  var nodes = Array.prototype.slice.call(figure.querySelectorAll(".node"));
  if (nodes.length === 0) return;
  var lines = Array.prototype.slice.call(figure.querySelectorAll(".line"));
  var names = Array.prototype.slice.call(figure.querySelectorAll(".name-label"));
  var plot = figure.querySelector(".chart-plot");

  // Cached centres. 210 `getBoundingClientRect` calls per pointer move is real work for no reason:
  // nothing moves between resizes, so the cache is rebuilt on resize and on scroll instead.
  var centres = null;
  function centreOf(i) {
    if (!centres) {
      centres = nodes.map(function (n) {
        var r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }
    return centres[i];
  }
  function invalidate() {
    centres = null;
  }
  window.addEventListener("resize", invalidate);
  window.addEventListener("scroll", invalidate, true);

  /** The reading nearest a client point, in BOTH axes — see this file's own header, item 1. */
  function nearest(clientX, clientY) {
    var best = -1;
    var bestD = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var c = centreOf(i);
      var dx = c.x - clientX;
      var dy = c.y - clientY;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best < 0 ? null : nodes[best];
  }

  function clear() {
    figure.classList.remove("is-tracing");
    lines.forEach(function (l) {
      l.classList.remove("is-active");
    });
    names.forEach(function (n) {
      n.classList.remove("is-active");
    });
    nodes.forEach(function (n) {
      n.classList.remove("node-active");
    });
    tooltip.hidden = true;
  }

  function show(node, clientX, clientY) {
    var country = node.getAttribute("data-country");
    figure.classList.add("is-tracing");
    lines.forEach(function (l) {
      l.classList.toggle("is-active", l.getAttribute("data-country") === country);
    });
    names.forEach(function (n) {
      n.classList.toggle("is-active", n.getAttribute("data-country") === country);
    });
    nodes.forEach(function (n) {
      n.classList.toggle("node-active", n === node);
    });

    tooltip.textContent = node.getAttribute("data-detail");
    tooltip.hidden = false;
    var tw = tooltip.offsetWidth || 180;
    var th = tooltip.offsetHeight || 28;
    var x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    // Above the pointer by default, flipped below when that would put the box back over the
    // chart's own header. The floor is read from the plot's own rect, never hardcoded, so it stays
    // correct whatever the header's height turns out to be at this width.
    var top = plot ? plot.getBoundingClientRect().top : 8;
    var above = clientY - th - 14;
    tooltip.style.left = x + "px";
    tooltip.style.top = (above >= top ? above : clientY + 14) + "px";
  }

  // Pointer events fire for mouse, pen and touch alike — one code path, so a phone reader taps
  // anywhere in the plot and gets the reading nearest that point rather than being asked to land a
  // tap on a 5px circle.
  function fromPointer(evt) {
    var node = nearest(evt.clientX, evt.clientY);
    if (node) show(node, evt.clientX, evt.clientY);
  }
  if (plot) {
    plot.addEventListener("pointermove", fromPointer);
    plot.addEventListener("pointerdown", fromPointer);
    plot.addEventListener("pointerleave", clear);
  }

  nodes.forEach(function (node) {
    node.addEventListener("focus", function () {
      var r = node.getBoundingClientRect();
      show(node, r.left + r.width / 2, r.top + r.height / 2);
    });
    node.addEventListener("blur", clear);
    node.addEventListener("keydown", function (evt) {
      var country = node.getAttribute("data-country");
      var index = Number(node.getAttribute("data-index"));
      var sameCountry = nodes.filter(function (n) {
        return n.getAttribute("data-country") === country;
      });
      var sameYear = nodes
        .filter(function (n) {
          return Number(n.getAttribute("data-index")) === index;
        })
        .sort(function (a, b) {
          return Number(a.getAttribute("cy")) - Number(b.getAttribute("cy"));
        });
      var target = null;
      if (evt.key === "ArrowRight") target = sameCountry[Math.min(index + 1, sameCountry.length - 1)];
      else if (evt.key === "ArrowLeft") target = sameCountry[Math.max(index - 1, 0)];
      else if (evt.key === "Home") target = sameCountry[0];
      else if (evt.key === "End") target = sameCountry[sameCountry.length - 1];
      else if (evt.key === "ArrowUp" || evt.key === "ArrowDown") {
        var at = sameYear.indexOf(node);
        var step = evt.key === "ArrowUp" ? -1 : 1;
        target = sameYear[Math.min(Math.max(at + step, 0), sameYear.length - 1)];
      }
      if (target && target !== node) {
        evt.preventDefault();
        target.focus();
      }
    });
  });

  document.addEventListener("pointerdown", function (evt) {
    var target = evt.target;
    if (target && typeof target.closest === "function" && target.closest(".chart-plot")) return;
    clear();
  });
}

if (typeof document !== "undefined") initBump();
