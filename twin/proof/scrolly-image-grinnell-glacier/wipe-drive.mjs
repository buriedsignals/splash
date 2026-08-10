// THE SCROLL DRIVES THE PICTURE — one implementation, used twice.
//
// `ImageSequence.tsx` imports it in node to SSR the sequence at its opening position; `render.mjs`
// reads this same file as text, strips the `export` keywords and inlines it into the delivered
// page. One implementation, so the picture a reader meets before any script runs and the picture
// the scroll drives cannot drift apart.
//
// WHY THIS EXISTS. Driven continuously — a per-frame recorder installed before the scroll was
// touched, both directions, three widths — this beat measured **0 of 113, 0 of 97 and 0 of 78
// intra-step frames on which any geometry moved**; about half of every sweep changed only an
// opacity and the rest changed nothing at all. It was four fixed pictures and a cross-fade, which
// is the defect the owner reported on the sibling beats: *"faut que ce soit fluide et que l'élément
// évolue au fur et à mesure du temps."*
//
// WHY A WIPE AND NOT A DISSOLVE, and this is an editorial decision rather than a graphics one.
// A cross-dissolve between two photographs paints, for most of every transition, a picture that is
// **a photograph of no year**: half the pixels are 1938 and half are 1981, blended, and a reader
// cannot tell which is which. On a beat whose entire claim is what a documentary photograph shows,
// that is a fabricated image, however pretty. A WIPE never blends: at every scroll position both
// halves of the frame are real, unaltered photographs, the boundary between them is drawn as an
// explicit rule, and **both years and both credits are on screen, each on the side of the picture
// it belongs to**, for as long as both pictures are. The reader is always told which photograph
// they are looking at, in both halves.
//
// It is also the device this beat's own subject asks for: four frames from ONE summit, normalised
// to ONE box, is precisely the case a wipe is made for — every feature in the picture stays where
// it is while the ice leaves.

// ── Where the reader is: READ off the scaffold, never re-derived ───────────────────────────────

/**
 * The nearest ancestor carrying `data-progress`. The vehicle publishes it on the `.scrolly` root on
 * every scroll — the fractional index of the panel on the lane's centre line — and this beat is
 * driven by nothing else. Duplicated from the sibling map beat rather than imported: a beat folder
 * stays copy-pasteable on its own (`no-cross-skill-imports.test.ts`).
 */
export function progressSourceOf(el) {
  let node = el;
  while (node) {
    if (node.getAttribute && node.getAttribute("data-progress") !== null) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * The published position, or a throw naming what it looked for. A default here would be the defect
 * back in a quieter costume: a sequence that silently sits on photograph 1 forever looks exactly
 * like a sequence whose script never ran.
 */
export function readProgress(source) {
  const raw = source == null ? null : source.getAttribute("data-progress");
  const value = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(value))
    throw new Error(
      `this beat is driven by the scrolly scaffold's continuous signal and read ${JSON.stringify(raw)} ` +
        `for data-progress on the nearest ancestor carrying it (twin-scrolly/assets/interaction.mjs ` +
        `writes it on the .scrolly root on every scroll)`,
    );
  return value;
}

// ── The wipe ───────────────────────────────────────────────────────────────────────────────────

/**
 * Which two photographs are on screen at a continuous position, and how far the boundary between
 * them has travelled.
 *
 * `from` is the OUTGOING photograph, which occupies the right of the frame; `to` is the incoming
 * one, revealed from the left. `t` is the fraction of the frame's width the incoming picture has
 * taken — LINEAR in the reader's own scroll, deliberately: the boundary is a thing the reader is
 * dragging, and easing it would make the picture disagree with the thumb. (The sibling map beat
 * eases, because a camera FLIGHT reads better with a calm departure; a wipe is not a flight.)
 *
 * `reduced` is `prefers-reduced-motion`: the boundary does not travel at all, the sequence cuts to
 * the nearer photograph, and every frame is still reachable.
 */
export function wipeAt(position, count, reduced) {
  const last = count - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) {
    const i = Math.round(p);
    return { from: i, to: i, t: 0 };
  }
  const from = Math.min(Math.floor(p), last - 1 < 0 ? 0 : last - 1);
  const t = p - from;
  return { from, to: Math.min(from + 1, last), t };
}

/** The boundary's own x, in the picture's own pixels. */
export function seamAt(t, width) {
  return t * width;
}

/**
 * How wide the column is, given the box the visual actually got.
 *
 * CONTAIN, AND FILL — the owner's ruling: *"respecte le ratio mais remplis au max en largeur ou
 * hauteur."* The picture keeps its own ratio and grows until it meets the frame on whichever axis
 * binds first. This has to be measured rather than written in CSS because the height available is
 * the frame's, and the frame is the viewport minus a header that wraps to a different number of
 * lines at every width — a number no `vh` expression inside the frame can know.
 */
export function columnWidthFor(box, aspect, chrome, gutter) {
  return Math.max(0, Math.min(box.width - gutter * 2, (box.height - chrome) * aspect));
}

// ── The driver (browser only) ──────────────────────────────────────────────────────────────────

/* eslint-env browser */

/**
 * Move the persistent visual OUT of the per-step frame stack.
 *
 * The scaffold's contract is N pictures of which exactly one is painted. This beat now has ONE
 * picture whose CONTENT wipes; left inside step 1's wrapper it would be faded out the moment step 2
 * became active. Moved one level up into the stack it is a permanent sibling the swap never
 * touches — and with JavaScript off it stays where it was SSR'd, inside the wrapper the scaffold
 * marks active by default, so a no-JS reader still gets the first photograph whole.
 *
 * Reported, not patched around, and it is the same report the sibling map beat files: the vehicle
 * has no way for a beat to declare "my visual is one persistent element". This function is what
 * that missing declaration costs today.
 */
export function detachVisual(root) {
  const wrapper = root.parentElement;
  const stack = wrapper && wrapper.parentElement;
  if (!stack) return;
  stack.appendChild(root);
  root.style.position = "absolute";
  root.style.inset = "0";
  root.setAttribute("aria-hidden", "true");
  for (const sibling of Array.from(stack.children))
    if (sibling !== root) sibling.style.pointerEvents = "none";
}

export function initImageWipe(root, count) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);

  const progressSource = progressSourceOf(root);
  if (!progressSource)
    throw new Error(
      "no ancestor of this beat's visual carries data-progress — twin-scrolly's scaffold publishes it " +
        "on the .scrolly root, and this beat is driven by nothing else",
    );

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const column = root.querySelector("[data-part=column]");
  const stack = root.querySelector("[data-part=stack]");
  const plates = Array.from(root.querySelectorAll("[data-plate]"));
  const reveals = Array.from(root.querySelectorAll("[data-reveal]"));
  const seam = root.querySelector("[data-part=seam]");
  const years = Array.from(root.querySelectorAll("[data-year]"));
  const credits = Array.from(root.querySelectorAll("[data-credit]"));

  let queued = false;
  let last = -1;

  function paint() {
    queued = false;
    const position = readProgress(progressSource);
    if (Math.abs(position - last) < 0.0005) return;
    last = position;

    const { from, to, t } = wipeAt(position, count, reduced.matches);
    // The column is sized from the box the visual ACTUALLY got, every frame. The CSS behind it can
    // only guess, because the height left over depends on how many lines the page header wrapped
    // to at this width.
    if (column) {
      const frame = root.getBoundingClientRect();
      column.style.width = `${columnWidthFor(
        frame,
        Number(column.getAttribute("data-aspect")),
        Number(column.getAttribute("data-chrome")),
        Number(column.getAttribute("data-gutter")),
      )}px`;
    }
    const box = stack.getBoundingClientRect();
    const x = seamAt(t, box.width);

    root.dataset.position = position.toFixed(3);
    // Published so a verification run can read the WIPE rather than look at a picture. A screenshot
    // proves a frame was painted; it never proves which two photographs were on screen or where
    // the boundary between them was.
    root.dataset.wipe = JSON.stringify({ from, to, t: Number(t.toFixed(4)), seamPx: Math.round(x) });

    // The OUTGOING photograph is the whole frame; the incoming one is a box growing from the left
    // with the picture inside it at the frame's own width, so the picture does not stretch as the
    // box grows. A clip would have done the same thing without changing any element's BOX, which is
    // the one thing a per-frame recorder can see — this is deliberately geometry, not a filter.
    plates.forEach((plate, i) => {
      plate.style.opacity = i === from ? "1" : "0";
    });
    reveals.forEach((reveal, i) => {
      reveal.style.opacity = i === to && t > 0 ? "1" : "0";
      reveal.style.width = i === to ? `${x}px` : "0px";
      const picture = reveal.firstElementChild;
      if (picture) picture.style.width = `${box.width}px`;
    });
    if (seam) {
      seam.style.left = `${x}px`;
      seam.style.opacity = t > 0.002 && t < 0.998 ? "1" : "0";
    }

    // Both years and both credits, each on the side of the photograph it belongs to: the incoming
    // one at the left edge of the frame it is revealing, the outgoing one at the right. When the
    // boundary has not left the edge there is only one picture and only one of each is painted.
    const both = t > 0.002;
    // The SIDE is what makes this legible rather than a pile: the incoming photograph's year and
    // credit sit at the LEFT edge, over the half it has revealed; the outgoing one's move to the
    // RIGHT edge, over the half it still holds. With one picture on screen there is one of each and
    // it sits where a caption belongs, at the left. Measured before this existed: "1981" and "1938"
    // were both left-anchored and printed on top of each other, reading "1988" — visible in the
    // first render of the wipe and in nothing else.
    const place = (node, side) => {
      if (side === "right") {
        node.style.left = "auto";
        node.style.right = "0px";
      } else {
        node.style.left = "0px";
        node.style.right = "auto";
      }
    };
    years.forEach((node, i) => {
      const shown = i === from || (both && i === to);
      node.style.opacity = shown ? "1" : "0";
      if (shown) place(node, both && i === from ? "right" : "left");
    });
    // The credits STACK rather than sitting side by side: a full credit is wider than half this
    // column, so left and right would overprint each other in the middle. Incoming on the first
    // line, outgoing on the second, each ending in its own year.
    credits.forEach((node, i) => {
      const shown = i === from || (both && i === to);
      node.style.opacity = shown ? "1" : "0";
      if (shown) node.style.top = both && i === from ? "22px" : "0px";
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    view.requestAnimationFrame(paint);
  }

  // `capture: true` on the window catches a scroll from ANY scroller, including the inner column
  // the fixed-page model actually scrolls.
  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  const invalidate = () => {
    last = -1;
    schedule();
  };
  view.addEventListener("resize", invalidate, { passive: true });
  view.addEventListener("orientationchange", invalidate, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener("change", invalidate);
  doc.addEventListener("visibilitychange", schedule);
  schedule();
  return { paint };
}
