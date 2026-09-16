// twin/skills/map-web/assets/navigate.ts
//
// WHAT A READER MAY DO TO THE WINDOW — zoom in, zoom out, move, and come back to the framing the
// newsroom published. A map vocabulary, not a chart one, and not a gesture: this file adds nothing
// to what a beat ARGUES. It is the supplement the owner asked for twice, in his own words — « sur
// la map il manque les controls de zoom/dézoom et déplacement dans la map », then, on another beat,
// « la carte ne prend pas toute la largeur et n'a aucun controls ».
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE PROMISE THIS FILE MAY NOT BREAK, AND THEREFORE DOES NOT.
//
// A reader with no JavaScript receives the complete plate. The beat's own editorial gesture — its
// radios, its generated stylesheet, its marks, its labels, its key — stays exactly what it was:
// zero script. Navigation is an ADDITION to a finished page, never a door in front of one. So the
// controls ship in the markup carrying `hidden`, and the script is what takes it off; with the
// script absent there is no dead button on the screen, none in the tab order, and the published
// framing is the only framing there is.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE TRAP THIS TREE HAS ALREADY PAID FOR TWICE, AND HOW THIS FILE IS BUILT AROUND IT.
//
// `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at initialisation.
// Two siblings met it and answered it the same way in two shapes: the radar keeps every vertex at
// the same coordinate in every state (`proof/web-radar-electricity-mix`), and the diverging stacked
// bar bakes one transparent hit plate PER STATE at that state's own coordinates and swaps them
// (`proof/web-diverging-stacked-electricity`). The principle under both: WHAT ANSWERS MUST BE AT
// COORDINATES THAT ARE STILL TRUE.
//
// A navigation is continuous, so neither shape transfers literally — there is no finite set of
// states to bake a plate for. What transfers is the principle, applied one level lower: the
// coordinates are made INVARIANT UNDER NAVIGATION, and the movement is put into the coordinate
// system itself.
//
//   1. The window is the `<svg>`'s own `viewBox`. Panning and zooming rewrite it and nothing else.
//      `getScreenCTM()` is derived from the viewBox at the moment it is called, so the client →
//      user-space mapping `interaction.mjs` does on every pointer event is live for free, while
//      every `cx` and `cy` attribute on the page is the same byte it was at build time. Measured
//      rather than assumed (the probe also confirms a CSS transform on the `<svg>` or on an
//      ANCESTOR is carried by `getScreenCTM()`, and that a transform on an inner `<g>` is not —
//      which is why the whole mechanism is the viewBox and not a transform over the drawing).
//   2. What must NOT follow the window — a symbol, a label, a stroke — is counter-scaled by
//      `--nav-inverse` about ITS OWN CENTRE. The centre is the fixed point of that scale, so the
//      coordinate the resolver compares against does not move by construction, not by care.
//      `assertOneNavigation` refuses a page where any transform between the `<svg>` and a `.pt`
//      is anything else.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// A LENGTH IN THE PLANE FOLLOWS THE PLAN; A FORM NEVER — AND ON THIS TYPE IT IS NOT A STYLE RULE.
//
// A proportional-symbol map has no axis. The only instrument a reader has for turning an area back
// into a quantity is the size key, and the key is drawn OUTSIDE the plate's coordinate system, in
// the cell's own CSS pixels. A zoom that enlarged the marks would therefore leave the key stating a
// scale the map is no longer drawn in — which is, to the tenth of a factor, the defect this beat
// has just finished repairing: its 50 GW swatch was drawn bigger than its 96 GW mark, and a reader
// calibrating France against it would have read the continent's biggest fleet as under half of what
// it is. The counter-scale is what keeps that repair true at every zoom: a mark and a swatch of the
// same value are the same number of CSS pixels across at scale 1 and at the ceiling.
//
// The same counter-scale is what keeps labels honest. They stay the size the register set, anchored
// on their own mark's centre, and the distance between any two of them is multiplied by the zoom —
// so a zoom can only ever RESOLVE an overlap and can never create one. That is the owner's standing
// instruction (« une étiquette doit être près de sa zone », and never over another) held by
// arithmetic instead of by a placement pass.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE TWO BOUNDS, AND WHY NEITHER IS TYPED.
//
// THE FLOOR IS THE PUBLISHED FRAMING. Scale 1 is the beat's own `camera.ts`, and the clamp that
// keeps the window inside the camera's box makes the framing at scale 1 a single point: there is
// exactly one window of that size that fits, and it is the one the newsroom published. A reader
// cannot zoom out past the argued frame and cannot push the geography off the edge, and both fall
// out of ONE clamp rather than out of two rules that could disagree.
//
// THE CEILING IS A COUNTRY. `maxScaleOf` is the drawing's own width divided by the width of the
// SUBJECT the beat names — on the beat wired here, the country holding the largest fleet. So the
// window is never narrower than the place the claim is about: a reader who has zoomed in to see
// WHERE inside a country its capacity-weighted centre falls can always still see the whole country
// around it. Past that the map would be showing terrain the beat holds no datum for. The number is
// derived from the beat's own geometry and recomputed here, so a beat cannot type a ceiling.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS FILE DELIBERATELY DOES NOT DO, said rather than left to be discovered.
//
//   - It does not re-project. The camera is an editorial assertion; a navigation that re-projected
//     would be arguing, which is not its job. One scale on both axes, always: the window keeps the
//     view box's own ratio, so `scaleX / scaleY` cannot drift from 1 however the reader moves.
//   - It does not re-bake the plate. Zooming enlarges a baked basemap, and past roughly the plate's
//     own pixel density its coastline softens. On a beat that draws its land as a vector path over
//     the plate — the one wired here — the geography a reader actually reads stays sharp and only
//     the sea tint softens. On a beat that has no vector land, this is a real cost and the ceiling
//     is the only thing holding it.
//   - No pinch and no wheel. A wheel over an embedded figure steals the article's own scroll, and a
//     pinch needs a second pointer this format has never carried. Drag, arrows and three buttons
//     cover mouse, finger and keyboard, which is what the brief asked for.

// NOTHING IS IMPORTED HERE, AND THAT IS THE RULE AND NOT AN OVERSIGHT. A skill directory is
// copy-pasteable on its own, so no import may LEAVE it — not into another skill, not into a story
// workspace, not into `shared/` (`splash/test/no-cross-skill-imports.test.ts`). This file needs the
// drawing that lives in `chart-web/assets/control-chrome.ts`, so the BEAT — which is under `proof/`
// and may import from any skill — calls that file and hands its output in. `navigateCss` reads the
// pill back out of the string it is given; `map-web`'s own `classing.ts` and `restore.ts` are
// arranged the same way.

/** One control's words: what a reader sees on the button, and what a screen reader is told. */
export type NavigateControl = {
  /** The visible words. Never an icon alone — see `assertNavigateDeclaration`. */
  label: string;
  /** The accessible name. Must CONTAIN the visible label (WCAG 2.5.3, Label in Name). */
  announce: string;
};

/** What a beat declares when it hands the reader the window. */
export type NavigateDeclaration = {
  /** The control group's own legend. */
  label: string;
  /** The drawing's own box, in its own units — the published framing, and the floor of the zoom. */
  view: { width: number; height: number };
  /** WHERE THE CEILING COMES FROM: the place the claim is about, and how wide it is in the
   *  drawing's own units. The ceiling is recomputed from it here; a beat cannot type one. */
  subject: { label: string; width: number };
  /** What one press of a zoom control multiplies the scale by. */
  step: number;
  /** How far one press of an arrow moves the window, as a fraction of the window's own side. */
  pan: number;
  controls: { in: NavigateControl; out: NavigateControl; home: NavigateControl };
  /** The sentence under the rail. The live magnification is printed BETWEEN these two, so every
   *  word a reader can be shown is in the markup and gets its bytes cut into the page's faces —
   *  the script composes a number and never a word. */
  hint: { before: string; after: string };
};

/** THE CEILING, DERIVED. The window is never narrower than the subject the claim is about. */
export function maxScaleOf(declaration: NavigateDeclaration): number {
  return Math.round((declaration.view.width / declaration.subject.width) * 100) / 100;
}

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const flat = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * THE DECLARATION'S OWN REFUSALS. Each one is a way a navigation ships and is worse than none.
 */
export function assertNavigateDeclaration(declaration: NavigateDeclaration, where = "this beat"): void {
  const at = `${where}: the navigation`;
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${at} is a declaration object, got ${JSON.stringify(declaration)}`);
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(`${at} has no legend — a rail of buttons with no name is furniture, not a control`);

  for (const axis of ["width", "height"] as const)
    if (!Number.isFinite(declaration.view?.[axis]) || declaration.view[axis] <= 0)
      throw new Error(`${at} declares a view whose ${axis} is ${declaration.view?.[axis]}`);

  if (!Number.isFinite(declaration.subject?.width) || declaration.subject.width <= 0)
    throw new Error(
      `${at} declares a subject of width ${declaration.subject?.width}. The ceiling is derived from ` +
        `it, so without it there is no ceiling and a reader can zoom until the plate is a colour.`,
    );
  const max = maxScaleOf(declaration);
  if (!(max > 1))
    throw new Error(
      `${at} derives a ceiling of ${max} from ${JSON.stringify(declaration.subject.label)}, which is ` +
        `${declaration.subject.width} units wide in a view ${declaration.view.width} wide. A ceiling ` +
        `at or under 1 means the reader can press zoom and nothing happens: a control that cannot ` +
        `move the picture is refused here rather than shipped as three dead buttons.`,
    );

  if (!Number.isFinite(declaration.step) || declaration.step <= 1)
    throw new Error(`${at} has a zoom step of ${declaration.step}; a step at or under 1 never zooms`);
  if (declaration.step > max)
    throw new Error(
      `${at} has a step of ${declaration.step} and a ceiling of ${max}: the first press would land ` +
        `on the ceiling, so the reader is handed two framings and not a navigation`,
    );
  if (!Number.isFinite(declaration.pan) || declaration.pan <= 0 || declaration.pan >= 1)
    throw new Error(
      `${at} moves ${declaration.pan} of the window per arrow press. Under 0 it moves backwards, at ` +
        `1 or more the reader loses every landmark between one press and the next.`,
    );

  const seen = new Set<string>();
  for (const [name, control] of Object.entries(declaration.controls ?? {})) {
    const spot = `${at}: the ${name} control`;
    if (typeof control?.label !== "string" || !control.label.trim())
      throw new Error(`${spot} has no visible words`);
    if (typeof control?.announce !== "string" || !control.announce.trim())
      throw new Error(`${spot} has no accessible name`);
    // WCAG 2.5.3 Label in Name — the same rule `area-scale.ts` holds over its pills, held here over
    // buttons: a reader who says the words they can see must be understood.
    if (!flat(control.announce).includes(flat(control.label)))
      throw new Error(
        `${spot} is announced ${JSON.stringify(control.announce)} and reads ` +
          `${JSON.stringify(control.label)}. A voice reader saying what they see would not reach it ` +
          `(WCAG 2.5.3).`,
      );
    if (seen.has(flat(control.label)))
      throw new Error(`${spot} repeats the words of another control: ${JSON.stringify(control.label)}`);
    seen.add(flat(control.label));
  }
  for (const name of ["in", "out", "home"])
    if (!declaration.controls?.[name as keyof NavigateDeclaration["controls"]])
      throw new Error(
        `${at} ships no ${name} control. Zoom, zoom out and RETURN are one control each: without ` +
          `the return a reader who has moved cannot get back to the map the newsroom published, ` +
          `which is the one thing a navigation may not take away.`,
      );
  // THE RETURN SAYS IT IN WORDS. An arrow glyph, a house icon or a bare "1:1" leaves a reader who
  // is lost looking at a picture of a way out.
  if (words(declaration.controls.home.label) < 2)
    throw new Error(
      `${at}: the return control reads ${JSON.stringify(declaration.controls.home.label)}. It is the ` +
        `one control a reader reaches for when they are lost, so it says where it goes IN WORDS.`,
    );
  for (const side of ["before", "after"] as const)
    if (typeof declaration.hint?.[side] !== "string" || !declaration.hint[side].trim())
      throw new Error(
        `${at}: the hint's ${side} half is empty. The live magnification is printed between the two, ` +
          `so a missing half is either a number with no sentence round it or a word the script would ` +
          `have to invent — and a word the script invents is a glyph no embedded face was cut for.`,
      );
}

/** The controls, in the order they are drawn and tabbed. */
export function navigateControlsForMarkup(
  declaration: NavigateDeclaration,
): Array<{ action: "in" | "out" | "home"; label: string; announce: string }> {
  return (["in", "out", "home"] as const).map((action) => ({
    action,
    label: declaration.controls[action].label,
    announce: declaration.controls[action].announce,
  }));
}

/** The chrome spec this vocabulary hands `control-chrome.ts`. One class stem and one rail;
 *  everything else about the drawing belongs to that file and is not decided here. */
export function navigateChromeSpec(): {
  name: string;
  rail: "wrap";
} {
  return {
    name: "navigate",
    rail: "wrap",
    // NOTHING TO RESERVE, AND THAT IS A PROPERTY OF THIS CONTROL AND NOT A SAVING. Every other
    // vocabulary reserves a row because its sentence APPEARS when an option is chosen, and a row
    // that grew would push the plot down. This one's sentence is on the page in every state; the
    // only part of it that ever changes is the magnification, one figure set in tabular numerals,
    // so the row cannot change height and there is nothing for a reserve to hold open.
    //
    // It said that with `notes: { reserve: null }`, and `control-chrome.ts` now refuses the KEY
    // rather than the value — `"reserve" in notes` is true of a null too — so the sentence above is
    // the whole statement and no `notes` object is handed over at all.
  };
}

/** THE PILL, DERIVED FROM THE ONE PLACE A DIRECTED CONTROL IS DRAWN — never copied from it.
 *
 *  `control-chrome.ts` keys its pill on `label` and on `input:checked`, because every vocabulary
 *  before this one was a radio group. A navigation is not: zoom is a momentary action, so its
 *  controls are real `<button>`s and no selector in that file can reach them. Rather than write a
 *  second pill — which is exactly the twenty-copy drift that file was written to end — the
 *  declarations are READ BACK OUT of its own output and re-keyed. A fix landed there lands here in
 *  the same build, and nothing about the drawing is decided twice.
 *
 *  The one deliberate difference: the `@supports selector(:has(*))` wrapper is dropped. It is there
 *  so an engine that cannot draw a chosen pill gets plain visible radios instead of a row of
 *  identical capsules; a button is already a button in every engine, with nothing to fall back to. */
function pillRulesFrom(chromeCss: string, scope: string, pill: string): string {
  /** EVERY rule that file draws this selector with, in emission order — the pill's shape is split
   *  across three: the resting rule at top level, the capsule inside `@supports selector(:has(*))`,
   *  and the transition inside `@media (prefers-reduced-motion: no-preference)`. Reading only the
   *  first would take the colours and leave the capsule behind. */
  const blocksOf = (selector: string): string[] => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = [...chromeCss.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, "g"))].map((m) =>
      m[1].replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim(),
    );
    if (found.length === 0)
      throw new Error(
        `navigate: control-chrome.ts no longer emits a rule for ${JSON.stringify(selector)}, so this ` +
          `file cannot derive the button's own drawing from it and would have to invent one. Re-key ` +
          `this derivation onto whatever that file draws a pill with now.`,
      );
    return found;
  };
  const block = `${scope} .chart-navigate`;
  const still = (blocks: string[]) => blocks.filter((b) => !/\btransition\b/.test(b)).join(" ");
  const moving = (blocks: string[]) => blocks.filter((b) => /\btransition\b/.test(b)).join(" ");

  const rest = blocksOf(`${block} label`);
  const hover = still(blocksOf(`${block} label:hover`));
  const live = still(blocksOf(`${block} label:has(input:checked)`));
  const focus = still(blocksOf(`${block} label:has(input:focus-visible)`));

  return [
    `/* The pill's drawing, read back out of control-chrome.ts's own output and re-keyed onto a`,
    `   button: the resting rule, the capsule, the three states and the one transition, all of them`,
    `   values that file chose and none of them chosen here. */`,
    `${scope} ${pill} { ${still(rest)} background: none; font: inherit; color: var(--muted); }`,
    `${scope} ${pill}:hover:not(:disabled) { ${hover} }`,
    // THE WASH MEANS "THIS ONE HAS SOMETHING TO DO", which is what a chosen pill means on a radio
    // rail: the return control fills in exactly when the reader is off the published framing.
    `${scope} ${pill}[data-nav-live="yes"] { ${live} }`,
    `${scope} ${pill}:focus-visible { ${focus} }`,
    // A control with nothing left to do is dimmed and taken out of the tab order by `disabled`
    // itself. It is never removed: a rail that lost a button as the reader reached the ceiling
    // would move the two beside it under their hand.
    `${scope} ${pill}:disabled { opacity: 0.45; cursor: default; }`,
    moving(rest)
      ? `@media (prefers-reduced-motion: no-preference) {\n  ${scope} ${pill} { ${moving(rest)} }\n}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The stylesheet: the control's chrome, the counter-scale that keeps a form from following the
 * plan, and the two states the drag needs.
 */
export function navigateCss(
  declaration: NavigateDeclaration,
  {
    scope,
    chrome,
    travelMs = 260,
  }: {
    scope: string;
    /** What `control-chrome.ts` emitted for `navigateChromeSpec()`, handed in by the beat because
     *  this file may not reach across to that skill itself. The pill below is read back out of it. */
    chrome: string;
    travelMs?: number;
  },
): string {
  assertNavigateDeclaration(declaration);
  if (typeof chrome !== "string" || !chrome.includes(".chart-navigate"))
    throw new Error(
      "navigate: the control's chrome is handed in by the beat — `controlChromeCss({ scope, " +
        "...navigateChromeSpec() })` — because this file may not import across skills. What it was " +
        "given does not draw `.chart-navigate`, so there is no pill to derive the buttons from.",
    );
  const pill = pillRulesFrom(chrome, scope, "button.nav-pill");

  return [
    chrome,
    pill,
    // WITH NO SCRIPT THERE IS NO CONTROL AT ALL. `[hidden]` is a UA rule and `display: flex` above
    // is an author rule, so without this pair the hidden rail would draw itself anyway — the exact
    // shape of "a dead control left on the screen" the brief forbids. Author weight against author
    // weight, and it is the reason the no-script pass is a measurement and not a hope.
    `${scope} .chart-navigate[hidden], ${scope} .navigate-notes[hidden] { display: none; }`,
    // THE WINDOW'S OWN NUMBER. 1 at rest, so a page whose script never runs is drawn exactly as it
    // was before this file existed.
    `${scope} { --nav-inverse: 1; }`,
    // WHAT DOES NOT FOLLOW THE PLAN. A uniform scale about the element's OWN CENTRE, which the beat
    // sets as this element's `transform-origin` — so the centre is the fixed point and the
    // coordinate `interaction.mjs` read at init is still true at every scale.
    `${scope} [data-nav-fixed] { transform-box: view-box; transform: scale(var(--nav-inverse)); }`,
    // ONE CLOCK. The window and the marks are moved in the same frame by the same script; a
    // transition here would give the marks a second clock and they would drift off their own places
    // for the length of a flight. `assertOneNavigation` refuses a page that declares one.
    `${scope} [data-nav-fixed] { transition: none; }`,
    // THE MAP IS SOMETHING YOU CAN TAKE HOLD OF, and while it is held nothing else on it answers:
    // the hit layer and the marks give up the pointer so a drag cannot drag a tooltip across the
    // page behind it.
    `${scope} svg.chart[data-nav-grab] { cursor: grab; touch-action: none; }`,
    // THE UA DRAWS ITS OWN RING ON `:focus` AND IT IS NOT THE ONE THIS PAGE CHOSE. Measured on the
    // render: a plain mouse drag left `:focus-visible` false and the outline 5px wide — Chrome's
    // `outline: auto` — so the map came away from a DRAG wearing a ring that means "the keyboard is
    // here". The pair below is what makes the ring mean that and only that.
    `${scope} svg.chart[data-nav-grab]:focus { outline: none; }`,
    `${scope} svg.chart[data-nav-grab]:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }`,
    `${scope} .nav-dragging svg.chart { cursor: grabbing; }`,
    `${scope} .nav-dragging .hit-area, ${scope} .nav-dragging .pt { pointer-events: none; }`,
    `${scope} .nav-readout { font-variant-numeric: tabular-nums; }`,
    // THE ONLY MOTION THIS VOCABULARY EMITS, and it is a NUMBER the script reads rather than a
    // transition, because the window and the marks must travel on one clock. Zero is the resting
    // value and the query RAISES it: a reader who has asked for no motion arrives instantly and a
    // reader who has not sees the flight. THE ORDER IS THE WHOLE MECHANISM — these two rules carry
    // the same specificity, so the later one wins, and the first version of this file emitted them
    // the other way round and gave EVERY reader zero. Measured: 1 distinct frame during a flight
    // that should have shown a dozen.
    `${scope} { --nav-travel-ms: 0; }`,
    `@media (prefers-reduced-motion: no-preference) { ${scope} { --nav-travel-ms: ${travelMs}; } }`,
  ].join("\n\n");
}

/**
 * THE SCRIPT, and it is the only script this vocabulary ships.
 *
 * Authored as a classic `<script>` body, the same posture `interaction.mjs` takes: no module, no
 * bundler, so it keeps working in a CMS iframe or a sandboxed embed. Every number it needs is
 * derived by the beat and injected here; it derives no geometry of its own and formats no WORD —
 * the sentence around the magnification is in the markup, so every glyph a reader can be shown was
 * cut into the page's own embedded faces.
 */
export function navigateScript(declaration: NavigateDeclaration, { scope }: { scope: string }): string {
  assertNavigateDeclaration(declaration);
  const config = JSON.stringify({
    scope,
    width: declaration.view.width,
    height: declaration.view.height,
    max: maxScaleOf(declaration),
    step: declaration.step,
    pan: declaration.pan,
  });

  return `(function () {
  var C = ${config};
  function start() {
    var figure = document.querySelector(C.scope);
    if (!figure) return;
    var svg = figure.querySelector("svg.chart");
    var rail = figure.querySelector(".chart-navigate");
    var notes = figure.querySelector(".navigate-notes");
    var readout = figure.querySelector("[data-nav-readout]");
    if (!svg || !rail || !notes || !readout) return;
    var buttons = {};
    Array.prototype.forEach.call(rail.querySelectorAll("[data-nav-do]"), function (b) {
      buttons[b.getAttribute("data-nav-do")] = b;
    });
    if (!buttons.in || !buttons.out || !buttons.home) return;

    // EVERY AFFORDANCE IS PUT THERE BY THE SCRIPT. Nothing above this line exists for a reader who
    // has no JavaScript: the rail is hidden in the markup, and the map is not focusable until
    // there is something focusing it can do.
    rail.hidden = false;
    notes.hidden = false;
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("data-nav-grab", "");
    if (notes.id) svg.setAttribute("aria-describedby", notes.id);

    var W = C.width, H = C.height;
    var k = 1, cx = W / 2, cy = H / 2;
    var raf = 0;
    var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    /** THE ONE CLAMP. The window keeps the view box's ratio, so one scale serves both axes and the
     *  drawing can never be sheared; and it is held inside the camera's own box, so the geography
     *  cannot be pushed off the edge. At scale 1 exactly one window fits, and it is the published
     *  framing — which is why zooming out past the argued frame and panning off it are the same
     *  refusal and not two rules that could disagree. */
    function windowAt(scale, centreX, centreY) {
      var w = W / scale, h = H / scale;
      return {
        x: Math.min(Math.max(centreX - w / 2, 0), W - w),
        y: Math.min(Math.max(centreY - h / 2, 0), H - h),
        w: w,
        h: h
      };
    }

    function frame(text) { return text.toFixed(1).replace(".", ","); }

    function paint() {
      var v = windowAt(k, cx, cy);
      svg.setAttribute("viewBox", v.x + " " + v.y + " " + v.w + " " + v.h);
      figure.style.setProperty("--nav-inverse", String(1 / k));
      var moved = k > 1.001;
      buttons.out.disabled = !moved;
      buttons.home.disabled = !moved;
      buttons.home.setAttribute("data-nav-live", moved ? "yes" : "no");
      buttons.in.disabled = k >= C.max - 0.001;
      readout.textContent = frame(k);
    }

    /** Travel on ONE clock: the window and every counter-scaled mark are written in the same frame,
     *  from the same eased fraction. A reader who has asked for no motion gets the same arrival
     *  with no flight — the displacement stays, only the animation goes. */
    function goTo(scale, centreX, centreY, animate) {
      scale = Math.min(Math.max(scale, 1), C.max);
      var landing = windowAt(scale, centreX, centreY);
      var toX = landing.x + landing.w / 2, toY = landing.y + landing.h / 2;
      var ms = Number(getComputedStyle(figure).getPropertyValue("--nav-travel-ms")) || 0;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!animate || ms <= 0 || (reduced && reduced.matches)) {
        k = scale; cx = toX; cy = toY; paint(); return;
      }
      var k0 = k, x0 = cx, y0 = cy, t0 = 0;
      var tick = function (now) {
        if (!t0) t0 = now;
        var p = Math.min(1, (now - t0) / ms);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        k = k0 + (scale - k0) * e;
        cx = x0 + (toX - x0) * e;
        cy = y0 + (toY - y0) * e;
        paint();
        raf = p < 1 ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    }

    buttons.in.addEventListener("click", function () { goTo(k * C.step, cx, cy, true); });
    buttons.out.addEventListener("click", function () { goTo(k / C.step, cx, cy, true); });
    buttons.home.addEventListener("click", function () { goTo(1, W / 2, H / 2, true); });

    // THE KEYBOARD, AND THE ONE THING IT MUST NOT STEAL. Every '.pt' inside this svg already owns
    // the arrows — it walks the reader from mark to mark — and keydown bubbles. So this handler
    // answers only for the map ITSELF; a reader tabbing through the marks keeps the behaviour they
    // had before this file existed.
    svg.addEventListener("keydown", function (evt) {
      if (evt.target !== svg) return;
      var dx = 0, dy = 0;
      if (evt.key === "ArrowLeft") dx = -1;
      else if (evt.key === "ArrowRight") dx = 1;
      else if (evt.key === "ArrowUp") dy = -1;
      else if (evt.key === "ArrowDown") dy = 1;
      else if (evt.key === "+" || evt.key === "=") { evt.preventDefault(); goTo(k * C.step, cx, cy, true); return; }
      else if (evt.key === "-" || evt.key === "_") { evt.preventDefault(); goTo(k / C.step, cx, cy, true); return; }
      else if (evt.key === "0" || evt.key === "Home") { evt.preventDefault(); goTo(1, W / 2, H / 2, true); return; }
      else return;
      evt.preventDefault();
      goTo(k, cx + dx * (W / k) * C.pan, cy + dy * (H / k) * C.pan, true);
    });

    // DRAG — mouse, pen and finger down one path, as everywhere else in this format. A press is not
    // a drag until it has travelled: under the threshold the tap still reaches the mark beneath it,
    // so taking hold of the map never costs a reader the reading they were aiming at.
    var THRESHOLD = 3;
    var from = null;
    svg.addEventListener("pointerdown", function (evt) {
      if (evt.button !== undefined && evt.button !== 0) return;
      from = { x: evt.clientX, y: evt.clientY, cx: cx, cy: cy, live: false, id: evt.pointerId };
    });
    svg.addEventListener("pointermove", function (evt) {
      if (!from || evt.pointerId !== from.id) return;
      var dx = evt.clientX - from.x, dy = evt.clientY - from.y;
      if (!from.live) {
        if (Math.abs(dx) + Math.abs(dy) < THRESHOLD) return;
        from.live = true;
        figure.classList.add("nav-dragging");
        if (svg.setPointerCapture) svg.setPointerCapture(evt.pointerId);
      }
      var box = svg.getBoundingClientRect();
      if (!box.width) return;
      var perPixel = (W / k) / box.width;
      goTo(k, from.cx - dx * perPixel, from.cy - dy * perPixel, false);
    });
    function release(evt) {
      if (!from || (evt && evt.pointerId !== from.id)) return;
      if (from.live) {
        figure.classList.remove("nav-dragging");
        if (svg.releasePointerCapture && svg.hasPointerCapture && svg.hasPointerCapture(from.id))
          svg.releasePointerCapture(from.id);
      }
      from = null;
    }
    svg.addEventListener("pointerup", release);
    svg.addEventListener("pointercancel", release);
    svg.addEventListener("lostpointercapture", release);

    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();`;
}

/**
 * THE PAGE THAT WAS ACTUALLY WRITTEN — the half no declaration-level check can make.
 *
 * Every refusal below is a way this vocabulary ships looking perfectly correct in the markup and
 * lies to a reader in a browser. `assertOneAreaScale` earned this shape on the beat wired here, and
 * the reason is the same: dropping one emitted rule leaves every attribute in place.
 */
export function assertOneNavigation(html: string, declaration: NavigateDeclaration, where = "this page"): void {
  const at = `${where}: the navigation`;
  const page = String(html);

  // 1. NO DEAD CONTROL WITHOUT SCRIPT. The rail ships hidden and the script takes it off.
  const rail = /<fieldset\b[^>]*class="[^"]*\bchart-navigate\b[^"]*"[^>]*>/.exec(page);
  if (!rail) throw new Error(`${at} is declared and the page ships no .chart-navigate rail`);
  if (!/\bhidden\b/.test(rail[0]))
    throw new Error(
      `${at} ships its rail visible in the markup. A reader with no JavaScript would then get three ` +
        `buttons that do nothing, in their tab order, over a plate that is already complete — which ` +
        `is the one thing this vocabulary exists not to do.`,
    );
  if (!new RegExp(`\\.chart-navigate\\[hidden\\][^{]*\\{[^}]*display:\\s*none`).test(page))
    throw new Error(
      `${at} hides its rail with the \`hidden\` attribute and the stylesheet sets \`display: flex\` ` +
        `on the same element. An author rule beats the UA's \`[hidden] { display: none }\`, so the ` +
        `rail would draw itself anyway: the attribute is not the hiding, the rule is.`,
    );

  // 2. EVERY DECLARED CONTROL IS ON THE PAGE, with the words it was declared with.
  for (const control of navigateControlsForMarkup(declaration)) {
    const button = new RegExp(`<button\\b[^>]*data-nav-do="${control.action}"[^>]*>`).exec(page);
    if (!button) throw new Error(`${at} declares a ${control.action} control and the page ships none`);
    const announced = /\baria-label="([^"]*)"/.exec(button[0]);
    // The markup is escaped by the renderer, so the attribute is decoded before it is compared:
    // an apostrophe in a French sentence arrives as `&#x27;` and would otherwise fail a check that
    // is about WORDS.
    const decoded = (announced?.[1] ?? "")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    if (decoded !== control.announce)
      throw new Error(
        `${at}: the ${control.action} control is announced ${JSON.stringify(decoded)} and was ` +
          `declared ${JSON.stringify(control.announce)}`,
      );
  }

  // 3. THE MOVEMENT IS IN THE COORDINATE SYSTEM, AND THE TWO ALTERNATIVES BOTH COST SOMETHING
  //    MEASURED. A transform on an inner `<g>` leaves `getScreenCTM()` unchanged, so every pointer
  //    is answered by the mark that used to be there (check 4 is the same fact from the other end).
  //    A transform on the `<svg>` itself IS carried by `getScreenCTM()` — measured — but an outer
  //    svg clips to its own viewport in its own space and the transform then enlarges that clipped
  //    box, so a zoomed map draws over the words above and below it. The viewBox has neither cost,
  //    and it is also what makes the floor and the edges ONE clamp: the window is a rectangle
  //    inside the camera's rectangle, and there is nothing else to keep in agreement.
  if (!/setAttribute\("viewBox"/.test(page))
    throw new Error(
      `${at} never writes the svg's own viewBox. The window IS the viewBox: it is the only ` +
        `expression of the movement that leaves every cx/cy on the page true, keeps the drawing ` +
        `inside the cell it was given, and cannot shear the geography.`,
    );

  // 4. WHAT ANSWERS KEEPS ITS CENTRE. Any transform between the svg and a hit target must be a
  //    counter-scale about that target's own centre — the one transform whose fixed point is the
  //    coordinate the resolver compares against.
  const svgBody = /<svg\b[^>]*class="[^"]*\bchart\b[^"]*"[^>]*>([\s\S]*?)<\/svg>/.exec(page);
  if (!svgBody) throw new Error(`${at}: no <svg class="chart"> to check`);
  const open: string[] = [];
  for (const token of svgBody[1].matchAll(/<(\/?)g\b([^>]*)>|<circle\b([^>]*)>/g)) {
    if (token[1] === "/") { open.pop(); continue; }
    if (token[2] !== undefined) { open.push(token[2]); continue; }
    const point = token[3];
    if (!/class="[^"]*\bpt\b[^"]*"/.test(point)) continue;
    const cx = /\bcx="([-\d.]+)"/.exec(point);
    const cy = /\bcy="([-\d.]+)"/.exec(point);
    if (!cx || !cy)
      throw new Error(`${at}: a hit target carries no cx/cy, so nothing can say where it answers from`);
    for (const ancestor of open) {
      if (!/\btransform\b/.test(ancestor) && !/data-nav-fixed/.test(ancestor)) continue;
      const origin = /transform-origin:\s*([-\d.]+)px\s+([-\d.]+)px/.exec(ancestor);
      if (!/data-nav-fixed/.test(ancestor) || !origin)
        throw new Error(
          `${at}: a hit target at ${cx[1]},${cy[1]} sits inside a transformed group that is not a ` +
            `counter-scale about its own centre. Its drawn position and the cx/cy interaction.mjs ` +
            `read at init would then be two different places, and every pointer after the first pan ` +
            `would be answered by the wrong mark — the defect this tree has already paid for twice.`,
        );
      if (Math.abs(Number(origin[1]) - Number(cx[1])) > 0.05 || Math.abs(Number(origin[2]) - Number(cy[1])) > 0.05)
        throw new Error(
          `${at}: a hit target at ${cx[1]},${cy[1]} is counter-scaled about ${origin[1]},${origin[2]}. ` +
            `The centre is the fixed point of that scale and therefore the only origin that leaves ` +
            `the answering coordinate where the resolver expects it.`,
        );
    }
  }

  // 5. A FORM DOES NOT FOLLOW THE PLAN. Without this rule a zoom enlarges every symbol while the
  //    key beside it does not — the map states one scale and its only instrument states another.
  if (!/\[data-nav-fixed\][^{]*\{[^}]*transform:\s*scale\(var\(--nav-inverse\)\)/.test(page))
    throw new Error(
      `${at} emits no counter-scale for [data-nav-fixed]. Every mark and every label would then grow ` +
        `with the zoom while the size key, drawn outside the plate's coordinates, would not — and a ` +
        `reader calibrating a mark against that key would read the beat's own headline quantity ` +
        `wrong by exactly the zoom factor.`,
    );

  // 6b. THE ORDER OF THE TWO TRAVEL RULES, which is the whole of reduced motion here. Both carry
  //     the same specificity, so the LATER one wins; emitted the wrong way round every reader gets
  //     zero and the flight the owner asked to be interpolated never happens. This shipped that way
  //     once and only a frame count caught it, because the page looked perfect at rest and perfect
  //     at the landing.
  const resting = page.search(/--nav-travel-ms:\s*0\b/);
  const raised = page.search(/prefers-reduced-motion:\s*no-preference[\s\S]{0,200}?--nav-travel-ms:\s*[1-9]/);
  if (resting < 0 || raised < 0 || resting > raised)
    throw new Error(
      `${at} emits the resting travel (0) at ${resting} and the no-preference travel at ${raised}. ` +
        `The resting value must come FIRST and the query must RAISE it: the two rules weigh the ` +
        `same, so the later one is the one every reader gets, and the wrong order hands a reader ` +
        `who never asked for reduced motion a window that jumps.`,
    );

  // 6. ONE CLOCK. The window and the marks are written in the same frame; a transition on the
  //    counter-scale gives the marks a second one and they leave their places mid-flight.
  if (!/\[data-nav-fixed\][^{]*\{[^}]*transition:\s*none/.test(page))
    throw new Error(
      `${at} lets [data-nav-fixed] take a transition. The window moves in one frame and the marks ` +
        `would follow on their own easing, so for the length of every flight each mark would be ` +
        `drawn somewhere its own datum is not.`,
    );
}
