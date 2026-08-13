// twin/proof/mapgen-locator-web/interaction.mjs
//
// The one script this beat ships of its own, inlined verbatim into the self-contained HTML by
// `render-web.mjs` (which strips the `export` keyword from each top-level declaration so this file
// can also sit as a plain classic `<script>` — no `type="module"`, no bundler, so it keeps working
// in a CMS iframe or a sandboxed embed that restricts module scripts). This is this beat's OWN copy
// of `map-web/assets/interaction.mjs` — nothing under `proof/` imports out of a skill or across
// beats. The format's `live-map.mjs` sits beside it, byte-identical to the seed's; this file is the
// half that is allowed to know what a locator is.
//
// Each organisation's hit target is a real HTML `<button class="pt">` (`LocatorWeb.tsx`'s own header
// note explains why: a fixed-CSS-pixel touch target, not an SVG shape sized in frame units that
// would shrink to a few physical pixels at 375px wide). That is a genuine DOM element with its own
// native focus/click/keyboard handling already — what `initPoints` adds is the ONE thing HTML does
// not give a `<button>` for free: a shared, positioned tooltip reading the point's own
// `data-detail`, plus Arrow/Home/End cycling between markers without leaving keyboard focus.
//
// WHAT THIS BEAT ADDS THAT THE SEED DOES NOT NEED — `relabel`, below. The seed's thirteen European
// metro areas are hundreds of kilometres apart and every one of them can carry its name at the
// opening view. This beat's eleven organisations are not: the closest pair is 13.3 m apart, which is
// half a pixel on the baked plate, and `AUDIT-W5-W6-map.md` §4.2 measured the delivered page drawing
// **3 labels for 11 organisations** while the family's own video title says "All 11". A static frame
// cannot answer that. A map the reader can zoom can — but only if the label set is re-decided as the
// camera moves, because a declutter computed once, server-side, at one camera is exactly the "fluid
// decision taken at the wrong width" this project has already paid for once. So the SSR'd label set
// is the no-JS answer, and `relabel` re-runs the SAME priority rule against the boxes the browser
// actually measured, at every camera move and every resize.
//
// `initPoints`/`initAll` are DOM wiring and are NOT unit-tested here: an interactive format is
// verified by driving a real browser, not by asserting against a DOM emulation nobody looked at.

/** Wires every `.pt` button on the page to hover, tap and keyboard, sharing the one tooltip
 *  element. Every point already carries its own `data-detail` string and its own `aria-label`;
 *  this function never invents either — and never needs to know which points a filter has hidden:
 *  a hidden point (`display: none`, the CSS filter's own doing) is unreachable by Tab automatically,
 *  the same native behaviour that makes this file need no filter-awareness of its own. */
export function initPoints(points, tooltip) {
  if (points.length === 0) return;

  function clear() {
    points.forEach((p) => p.classList.remove("pt-active"));
    tooltip.hidden = true;
  }

  function show(point, clientX, clientY) {
    points.forEach((p) => p.classList.toggle("pt-active", p === point));
    tooltip.textContent = point.getAttribute("data-detail");
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth || 160;
    const th = tooltip.offsetHeight || 28;
    const x = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8);
    const y = Math.max(clientY - th - 14, 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Hover and tap share one path: pointer events fire for mouse, pen and touch alike. Each marker is
  // already its own fixed-size hit target (`LocatorWeb.tsx`'s `HIT_TARGET_PX`), so no proximity
  // resolution is needed. Once the live map has loaded these buttons keep their keyboard role and
  // lose their pointer-events (the format's own CSS), and the canvas answers pointers instead — so
  // the hit area becomes the rendered marker at every zoom rather than a fixed disc over it.
  points.forEach((point, i) => {
    point.addEventListener("pointerenter", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointermove", function (evt) {
      show(point, evt.clientX, evt.clientY);
    });
    point.addEventListener("pointerleave", clear);

    // Keyboard: a <button> is already natively focusable and reachable with this script absent
    // entirely (works with JS off, exactly like the `title` attribute's own native tooltip). This
    // layer adds the same detail box hover shows, plus Left/Right/Home/End to move between markers
    // without leaving focus, in the same priority order the table below the map reads in.
    point.addEventListener("focus", function () {
      const rect = point.getBoundingClientRect();
      show(point, rect.left + rect.width / 2, rect.top);
    });
    point.addEventListener("blur", clear);
    point.addEventListener("keydown", function (evt) {
      let nextIndex = null;
      if (evt.key === "ArrowRight" || evt.key === "ArrowDown")
        nextIndex = Math.min(i + 1, points.length - 1);
      else if (evt.key === "ArrowLeft" || evt.key === "ArrowUp")
        nextIndex = Math.max(i - 1, 0);
      else if (evt.key === "Home") nextIndex = 0;
      else if (evt.key === "End") nextIndex = points.length - 1;
      else if (evt.key === "Escape") {
        clear();
        point.blur();
        return;
      }
      if (nextIndex !== null && nextIndex !== i) {
        evt.preventDefault();
        points[nextIndex].focus();
      }
    });
  });

  document.addEventListener("pointerdown", function (evt) {
    if (points.some((p) => p.contains(evt.target)) || tooltip.contains(evt.target)) return;
    clear();
  });
}

/**
 * WHICH NAMES THE PICTURE HAS ROOM FOR, RE-DECIDED FROM THE PICTURE.
 *
 * The same rule `geo-locator.ts`'s `declutterLabels` applies at build time — highest priority
 * (lowest number) places first, a lower-priority label whose box overlaps an already-placed one is
 * dropped — but run against `getBoundingClientRect()`, so the boxes are the ones the reader's own
 * browser drew at the reader's own zoom. It is deterministic and order-stable for the same reason
 * the build-time pass is: the order comes from the declared `data-priority`, never from DOM order
 * and never from what happened to be measured first.
 *
 * A label a filter has hidden has no box to collide with — `display: none` leaves `offsetParent`
 * null — so it is skipped rather than placed at the origin, where a zero-sized box would silently
 * win the space its neighbours needed.
 */
export function relabel(labels) {
  const ordered = labels.slice().sort(function (a, b) {
    return Number(a.getAttribute("data-priority")) - Number(b.getAttribute("data-priority"));
  });
  // Every candidate is shown first, so this pass decides the whole set from scratch rather than
  // narrowing whatever the last one left — otherwise a name dropped at one zoom could never come
  // back when the reader zoomed its neighbour away, which is the entire point of running it live.
  for (let i = 0; i < ordered.length; i++) ordered[i].hidden = false;

  const live = document.documentElement.classList.contains("mw-live");
  const container = document.getElementById("mw-map");
  const frame = live && container ? container.getBoundingClientRect() : null;
  // The ONE scale the live layer computed and stored (`live-map.mjs`'s `applyMarkScale`: "there is
  // one place the scale is computed and one place it is stored"). Read rather than recovered, and
  // that is a fix rather than a shortcut — see `labelGeometry`.
  const scale = frame && window.__mwMap ? window.__mwMap.__mwScale : 1;
  // Every marker a label must not be printed across, and how big each one is drawn — measured, not
  // assumed: live, the pin's own radius travels in the plan the page carries; on the plate it is
  // whatever the SVG circle is currently drawn at, which scales with the container. The `.pt` centre
  // is the marker's centre in both states, because `reposition` puts the button exactly on the
  // projected point and the SSR'd percentage does the same on the plate.
  const markers = markerDiscs();

  const placed = [];
  for (let i = 0; i < ordered.length; i++) {
    const label = ordered[i];
    if (label.offsetParent === null) continue;
    // Live, a name may take any of four placements and the first that works wins; on the fallback
    // plate the SSR'd percentage placement is the only one, and writing pixels over it would fight
    // the layout it was computed in.
    const box = frame
      ? firstPlacementThatWorks(label, frame, scale, placed, markers)
      : acceptable(label.getBoundingClientRect(), null, placed, markers, label);
    if (box) placed.push(box);
    else label.hidden = true;
  }
  return placed.length;
}

/** The four placements a name may take, in the order it may take them: beside its own marker on the
 *  side the plate chose, beside it on the other side, then centred above and centred below. The same
 *  four `LocatorWeb.tsx`'s build-time pass offers, re-tried live because the answer changes with the
 *  camera — a marker the plate had in the middle can be against the frame's edge the moment the
 *  reader pans, and two markers the plate had far apart can be a name's width apart at depth. */
export function firstPlacementThatWorks(label, frame, scale, placed, markers) {
  const geometry = labelGeometry(label, frame, scale);
  if (!geometry)
    return acceptable(label.getBoundingClientRect(), frame, placed, markers, label);
  const sides = geometry.side === "left" ? ["left", "right"] : ["right", "left"];
  const modes = [sides[0], sides[1], "above", "below"];
  for (let i = 0; i < modes.length; i++) {
    placeLabel(label, geometry, modes[i]);
    const box = acceptable(label.getBoundingClientRect(), frame, placed, markers, label);
    if (box) return box;
  }
  // Nothing worked: put it back where `reposition` had it, so the next run measures the same
  // starting point this one did rather than one of the rejected candidates.
  placeLabel(label, geometry, geometry.side);
  return null;
}

/** A box a reader can actually read: fully inside the live frame — which CLIPS
 *  (`html.mw-live .mw-viewport { overflow: hidden }`, because a pannable box must), so a name that
 *  runs past it is cut in half rather than spilling into the page gutter the way the plate's own
 *  labels are allowed to — and overlapping nothing already placed. Half a name is worse than none:
 *  the marker still answers a hover, a keyboard focus and its own row in the table. */
export function acceptable(box, frame, placed, markers, label) {
  if (frame && (box.left < frame.left - 1 || box.right > frame.right + 1)) return null;
  if (frame && (box.top < frame.top - 1 || box.bottom > frame.bottom + 1)) return null;
  for (let i = 0; i < placed.length; i++) {
    const other = placed[i];
    if (
      box.left < other.right &&
      box.right > other.left &&
      box.top < other.bottom &&
      box.bottom > other.top
    )
      return null;
  }
  // And it may not be printed across ANOTHER organisation's marker — a chip painted over someone
  // else's dot reads as that organisation's own name, which is the one thing this beat's markers
  // must never be made to say. `LocatorWeb.tsx` applies the same test to the plate.
  const key = label ? label.getAttribute("data-key") : null;
  for (let i = 0; i < markers.length; i++) {
    const mark = markers[i];
    if (mark.key === key) continue;
    if (
      box.left < mark.x + mark.r &&
      box.right > mark.x - mark.r &&
      box.top < mark.y + mark.r &&
      box.bottom > mark.y - mark.r
    )
      return null;
  }
  return box;
}

/** Every marker on the page as a disc a label must clear, in the reader's own viewport pixels. */
export function markerDiscs() {
  const live = document.documentElement.classList.contains("mw-live");
  let radius = 0;
  if (live) {
    const plan = document.getElementById("mw-live-plan");
    try {
      const features = JSON.parse(plan.textContent).layers[0].data.features;
      radius = features[0].properties.r;
    } catch (err) {
      radius = 0;
    }
  } else {
    const circle = document.querySelector("svg.map circle[data-key]");
    if (circle) radius = circle.getBoundingClientRect().width / 2;
  }
  return Array.prototype.slice
    .call(document.querySelectorAll(".pt"))
    .filter(function (pt) {
      return pt.offsetParent !== null;
    })
    .map(function (pt) {
      const box = pt.getBoundingClientRect();
      return {
        key: pt.getAttribute("data-key"),
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        r: radius,
      };
    });
}

/**
 * Where this label's own marker is and how much room the name needs, in the frame's own pixels.
 *
 * THE GAP IS READ, NOT RECOVERED, and that is the fix for a defect this file shipped for one render.
 * The first version measured the gap back out of wherever the label currently sat — which is correct
 * exactly once, and wrong the moment this pass has already moved it. `map.on("moveend")` fires with
 * no `reposition` before it, so the second pass measured a label at its own flipped position, read
 * its gap as NEGATIVE, clamped it to zero, and re-placed the name flush against the marker's own
 * centre. Driven at 1600x900: three of the eight names sat ON their own dot, with the coloured
 * marker showing as a sliver at the edge of the chip. Nothing was red; it is visible only in the
 * picture.
 *
 * So the gap comes from the two facts that cannot drift: `data-gap`, the frame-unit gap the
 * component placed the label with, and `map.__mwScale`, the ONE scale `live-map.mjs` computes and
 * stores for exactly this ("the label gutters and the hit targets are placed against the SAME scale
 * the marks are drawn at"). The marker's own centre still comes from the `.pt`, which `reposition`
 * puts precisely on the projected point.
 */
export function labelGeometry(label, frame, scale) {
  const pt = document.querySelector('.pt[data-key="' + label.getAttribute("data-key") + '"]');
  if (!pt) return null;
  const side = label.getAttribute("data-side") === "left" ? "left" : "right";
  const box = label.getBoundingClientRect();
  const marker = pt.getBoundingClientRect();
  const declared = Number(label.getAttribute("data-gap"));
  const gap = declared > 0 && scale > 0 ? declared * scale : 0;
  return {
    side,
    x: marker.left + marker.width / 2 - frame.left,
    y: marker.top + marker.height / 2 - frame.top,
    width: box.width,
    height: box.height,
    gap,
    frameWidth: frame.width,
  };
}

/** Writes one candidate placement. `top` is the label's own CENTRE, because the SSR'd
 *  `translateY(-50%)` is still on the node and `live-map.mjs` positions against it too. */
export function placeLabel(label, geometry, mode) {
  if (mode === "left") {
    label.style.left = "auto";
    label.style.right = geometry.frameWidth - (geometry.x - geometry.gap) + "px";
    label.style.top = geometry.y + "px";
    return;
  }
  if (mode === "right") {
    label.style.right = "auto";
    label.style.left = geometry.x + geometry.gap + "px";
    label.style.top = geometry.y + "px";
    return;
  }
  const centred = Math.min(
    Math.max(geometry.x - geometry.width / 2, 0),
    Math.max(geometry.frameWidth - geometry.width, 0),
  );
  label.style.right = "auto";
  label.style.left = centred + "px";
  label.style.top =
    (mode === "above"
      ? geometry.y - geometry.gap - geometry.height / 2
      : geometry.y + geometry.gap + geometry.height / 2) + "px";
}

/**
 * Runs `relabel` whenever the picture can have changed shape: on load, on a window resize, on a
 * filter change, and — once the live map has arrived — on every camera move.
 *
 * The live half waits for `live-map.mjs` to announce itself rather than racing it. The boot script
 * adds `mw-live` to the root element and publishes `window.__mwMap` in the same `map.on("load")`
 * turn, and it is inlined AFTER this file, so the class is what is watched: a `MutationObserver` on
 * the root's own attributes costs nothing while the fallback is showing and fires exactly once when
 * the swap happens. Registering the move handler after the boot script's own means this pass runs
 * after `reposition` has moved the labels, which is the order it needs.
 */
export function initLabels() {
  const labels = Array.prototype.slice.call(document.querySelectorAll(".point-label"));
  if (labels.length === 0) return;
  const run = function () {
    relabel(labels);
  };
  run();
  window.addEventListener("resize", run);
  // The filter is pure CSS and needs no JavaScript to narrow anything; this only re-decides which of
  // the REMAINING names have room, now that their neighbours are gone.
  document.addEventListener("change", function (evt) {
    if (evt.target && evt.target.name === "mw-filter") run();
  });

  const attach = function () {
    const map = window.__mwMap;
    if (!map) return false;
    map.on("move", run);
    map.on("moveend", run);
    map.on("resize", run);
    run();
    return true;
  };
  if (document.documentElement.classList.contains("mw-live")) {
    if (attach()) return;
  }
  const observer = new MutationObserver(function () {
    if (!document.documentElement.classList.contains("mw-live")) return;
    if (attach()) observer.disconnect();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

export function initAll() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  const points = Array.prototype.slice.call(document.querySelectorAll(".pt"));
  initPoints(points, tooltip);
  initLabels();
}

// Guarded rather than a bare top-level call: this file is also read directly by `render-web.mjs`'s
// own inliner in a context with no `document`. In the browser the guard is always true, so the
// inlined `<script>` still self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initAll();
