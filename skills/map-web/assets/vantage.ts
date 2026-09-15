// twin/skills/map-web/assets/vantage.ts
//
// THE REMOVE, HANDED TO THE READER — a LOCATOR vocabulary, and no other type's.
//
// WHY THIS FILE EXISTS.
//
// A locator has no magnitude, no rate and no gradient. `skills/map-beat/references/types/locator.md`
// opens by saying so: it is "the map type with the least to say: no magnitude, no rate, no
// gradient — just 'this place matters, here is where it is.'" Everything that type DOES say is
// therefore decided by one thing nobody writes down — HOW FAR BACK THE AUTHOR STOOD. Half a degree
// and the subject is a building beside a river; fifty degrees and it is a dot in a continent. The
// marks do not change meaning between those two pictures; the ANSWER does, entirely.
//
// A still can only stand at one distance. It cannot say that there were others, and a reader takes
// the one they are given as the map rather than as a decision. That is the absence this file hands
// over — the same shape of absence `classing.ts` hands over for a choropleth (the partition was a
// choice) and `pool.ts` for a hex grid (the neighbourhood was a choice), and it is not either of
// them: a classing changes COLOUR and may never move a place; a vantage moves the CAMERA and may
// never change a colour.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT A REMOVE IS, AND WHY IT IS NOT A ZOOM.
//
// The owner's ruling R1 already gives every map beat MapTiler's own zoom, drag, wheel and keyboard,
// and the proportional-symbol beat is right to write that this is NOT an editorial gesture: a zoom
// is continuous, anonymous and argues nothing. It changes the magnification and leaves the page
// untouched — same marks, same legend, same sentence, same scale bar.
//
// A REMOVE is an authored answer. Each one carries, together and derived from the same file:
//
//   * its own WINDOW (what the camera frames),
//   * its own DRAWING RULE (which marks earn a place at this distance, stated in words),
//   * its own CENSUS (how many the frame holds, and therefore how many are not drawn),
//   * its own SCALE BAR (the one instrument this type owes the reader), and
//   * its own SENTENCE (what this distance makes true that the one before it did not).
//
// So a reader stepping from one remove to the next is not magnifying a picture. They are trying a
// different editorial decision than the one the newsroom published, and being told what it costs.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE OWNER'S FIRST ARBITRATION, AND WHY THIS FILE IS ALLOWED TO MOVE THE CAMERA AT ALL.
//
// "Nothing moves without the reader seeing why." On a map that is harder than on a chart, because a
// mark's position is DATA. This vocabulary never touches a position: there is no field in any type
// below where a coordinate could be written, exactly as `classing.ts` has no field where one could.
// What moves is the WINDOW, the reader asked for it by name one keystroke earlier, and the movement
// is interpolated rather than jumped (the owner's fourth arbitration) — which on a map is not a
// nicety: a camera that teleports between two removes leaves the reader with no way to know whether
// the second picture is inside the first or somewhere else entirely.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE LADDER IS REFUSED UNLESS IT IS A LADDER.
//
// Two refusals below are this type's own and neither exists in a sibling vocabulary:
//
//   1. THE REMOVES MUST WIDEN, STRICTLY, IN DECLARATION ORDER. A control whose options go out and
//      then back in is not a remove control, it is a set of viewpoints wearing one; the reader
//      cannot hold "further away" as a direction if the pills do not run that way.
//   2. EACH STEP MUST AT LEAST DOUBLE THE GROUND SHOWN. On a map the just-noticeable step in remove
//      is a FACTOR, not a difference: two frames 15 % apart are one frame drawn twice, and a reader
//      who clicks between them sees the picture twitch and learns nothing. `MIN_STEP` is that floor,
//      and it is the reason this vocabulary takes a span in kilometres rather than only a box —
//      a box in degrees cannot be compared across latitudes.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT EMITS, AND WHY THE NO-SCRIPT STORY IS BETTER HERE THAN ON THE CHOROPLETH.
//
// `live-choropleth.ts` records, honestly, that its gesture's MAP half is script: no stylesheet can
// reach a MapLibre fill layer, so with JavaScript off the map keeps one partition and the gesture
// lives on in the table. A camera is different: a camera can be PHOTOGRAPHED. A beat using this
// vocabulary bakes one frozen picture PER REMOVE, from its own live map, and the pills swap them in
// pure CSS — `:has()` on the scope plus `:checked` on a real radio, generated at build time, zero
// script. With JavaScript off the reader gets four maps, four legends, four scale bars and four
// sentences. The live map adds the movement between them, not the gesture itself.
//
// IT EMITS `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP — the same discovery contract
// `classing.ts` records: `interaction-plan.ts` reads a control's owed sentence off that attribute
// and `defaultPrintedText` excludes it from what the page prints at rest. A third spelling would be
// invisible to the guard written to hold it.
//
// NOTHING IS IMPORTED HERE. A skill directory is copy-pasteable on its own
// (`no-cross-skill-imports.test.ts`), so the control's chrome is not reached for from this file:
// the beat calls `control-chrome.ts` itself and hands this file's own layer in as the extra.

/** The window one remove frames, in degrees. */
export type VantageWindow = {
  west: number;
  east: number;
  south: number;
  north: number;
};

/** One authored distance to stand at. */
export type VantageRemove = {
  /** The slug source — what the radio's id, the plate's token and the note's token are built from. */
  key: string;
  /** The pill's own words. */
  label: string;
  /** What a reader who is not looking at the map hears. Must CONTAIN the visible label — WCAG 2.5.3
   *  "label in name", not a stylistic preference. */
  announce: string;
  /** What the camera frames here. */
  window: VantageWindow;
  /** How wide that window is ON THE GROUND, in kilometres, measured at the subject's own latitude.
   *  Degrees are not comparable across latitudes and this ladder is compared; the beat measures it
   *  and this file refuses the ladder if it does not climb. */
  spanKm: number;
  /** WHICH MARKS THIS REMOVE DRAWS, by key. A locator's editorial act is not only where the camera
   *  stands: it is what still counts as context from there. A city places a reader at 600 km and
   *  places nobody at 5 000, and a beat that keeps drawing one is drawing a habit. */
  marks: string[];
  /** THE DRAWING RULE, IN THE BEAT'S OWN WORDS, drawn in the legend at this remove — what was kept,
   *  out of how many the frame holds. This is the census a locator hides: a reader looking at twelve
   *  markers has no way to know the frame holds a hundred and seventy-seven. */
  rule: string;
  /** THE SCALE BAR AT THIS REMOVE: the round distance its label states. The bar's LENGTH is set from
   *  the live camera so the stated distance stays true while the reader zooms; the label is baked,
   *  because a string assembled in the browser is a string whose glyphs were never cut into the
   *  page's own embedded faces. */
  barKm: number;
  /** The derived sentence this remove owes the reader, or `null` for the one the page publishes —
   *  that one is not a comparison with anything, it IS the claim, and a sentence under it would
   *  restate what the page already prints. The same bargain `classing.ts` strikes with its plate
   *  rule and `filter.ts` with its unfiltered option. */
  note: string | null;
};

export type VantageDeclaration = {
  /** The `<legend>` — in the beat's own words. */
  label: string;
  /** Which remove the page publishes, and the state a reader who touches nothing sees. */
  defaultKey: string;
  /** The one mark this whole map is about. It must be inside EVERY remove's window and in every
   *  remove's mark set: a locator that steps back until its own subject leaves the frame has
   *  stopped being a map of anything. */
  subject: string;
  /** Where every mark is, by key — read only to refuse, never to place anything. */
  positions: Record<string, [number, number]>;
  removes: VantageRemove[];
};

/** How much wider each step out must be than the one before it. A FACTOR and not a difference: see
 *  this file's header. Two removes 15 % apart are one remove drawn twice. */
export const MIN_STEP = 2;

/** A CSS-id-safe slug. ONE function, because the radio's id, the token a plate carries, the token a
 *  generated selector quotes and the slug a note is revealed by are the SAME string — and the last
 *  time this repository derived such a string two ways a whole map emptied with nothing red
 *  (`filter.ts`, `slugOf`). */
export function vantageSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a remove's slug. `mw-stack-…` is the map spelling of the format's own discovery
 *  contract for a control that changes the picture and owes a sentence (`interaction-plan.ts`
 *  matches `(?:chart|mw)-stack-`). */
export function vantageOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

const inside = (w: VantageWindow, [lon, lat]: [number, number]) =>
  lon >= w.west && lon <= w.east && lat >= w.south && lat <= w.north;

/**
 * Refuses every declaration that would draw a control that lies, before anything is rendered.
 */
export function assertVantageDeclaration(
  d: VantageDeclaration,
): VantageDeclaration {
  const where = "vantage declaration";
  if (!d || typeof d !== "object" || Array.isArray(d))
    throw new Error(`${where}: expected an object, got ${JSON.stringify(d)}`);
  if (typeof d.label !== "string" || !d.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — an unnamed remove control leaves a reader ` +
        `with no way to learn that the framing was a choice at all, which is the entire gesture`,
    );
  if (!Array.isArray(d.removes) || d.removes.length < 2)
    throw new Error(
      `${where}: needs at least two removes to be a choice, got ${d.removes?.length ?? 0}. A beat ` +
        `that wants one framing declares none and draws it — which is what a still is.`,
    );
  if (typeof d.subject !== "string" || !d.subject.trim())
    throw new Error(
      `${where}: \`subject\` names the one mark the map is about, and every window is checked ` +
        `against it. Without it a remove could frame ground the subject is not on and nothing here ` +
        `would notice.`,
    );
  if (!d.positions || !d.positions[d.subject])
    throw new Error(
      `${where}: no position is declared for the subject ${JSON.stringify(d.subject)}`,
    );

  const seen = new Map<string, string>();
  const boxes = new Map<string, string>();
  let previous: VantageRemove | null = null;
  for (const remove of d.removes) {
    if (typeof remove?.key !== "string" || !remove.key.trim())
      throw new Error(
        `${where}: every remove needs a key — got ${JSON.stringify(remove)}`,
      );
    const slug = vantageSlugOf(remove.key);
    if (!slug)
      throw new Error(
        `${where}: the remove ${JSON.stringify(remove.key)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(remove.key)} both slug to ` +
          `${JSON.stringify(slug)} — one radio would frame the map two ways`,
      );
    seen.set(slug, remove.key);

    for (const field of ["label", "announce", "rule"] as const)
      if (typeof remove[field] !== "string" || !remove[field].trim())
        throw new Error(
          `${where}: remove ${JSON.stringify(remove.key)} has no \`${field}\` — a pill with no words ` +
            `is a control nobody can operate, and a remove with no stated drawing rule is a picture ` +
            `whose omissions the reader cannot see`,
        );
    if (!remove.announce.includes(remove.label))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} announces ${JSON.stringify(remove.announce)}, ` +
          `which does not contain its visible label ${JSON.stringify(remove.label)}. A reader who ` +
          `says what they see cannot then operate the control they see (WCAG 2.5.3).`,
      );

    const w = remove.window;
    if (!w || !(w.west < w.east) || !(w.south < w.north))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} declares the window ${JSON.stringify(w)} — ` +
          `\`fitBounds\` answers an inverted or empty box by framing the rest of the world`,
      );
    const box = [w.west, w.south, w.east, w.north]
      .map((v) => v.toFixed(4))
      .join(",");
    if (boxes.has(box))
      throw new Error(
        `${where}: removes ${JSON.stringify(boxes.get(box))} and ${JSON.stringify(remove.key)} frame ` +
          `the same window ${box} — two pills for one picture, and a control whose state equals ` +
          `another's is a control the reader operates while nothing changes`,
      );
    boxes.set(box, remove.key);

    if (!inside(w, d.positions[d.subject]))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} frames ${box} and the subject ` +
          `${JSON.stringify(d.subject)} is at ${JSON.stringify(d.positions[d.subject])} — outside it. ` +
          `A locator that steps back until its own subject leaves the frame has stopped being a map ` +
          `of anything.`,
      );

    if (!Array.isArray(remove.marks) || remove.marks.length === 0)
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} draws nothing`,
      );
    if (!remove.marks.includes(d.subject))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} does not draw the subject ` +
          `${JSON.stringify(d.subject)}. Every remove is an answer to "where is THIS".`,
      );
    if (new Set(remove.marks).size !== remove.marks.length)
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} lists a mark twice`,
      );
    for (const key of remove.marks) {
      const at = d.positions[key];
      if (!at)
        throw new Error(
          `${where}: remove ${JSON.stringify(remove.key)} draws ${JSON.stringify(key)} and no ` +
            `position is declared for it`,
        );
      if (!inside(w, at))
        throw new Error(
          `${where}: remove ${JSON.stringify(remove.key)} draws ${JSON.stringify(key)} at ` +
            `${JSON.stringify(at)}, which is outside its own window ${box}. A mark drawn outside the ` +
            `frame is invisible ink: it costs the page its bytes, answers no pointer a reader can ` +
            `reach, and is counted by every census on the page as something the reader can see.`,
        );
    }

    if (!(remove.spanKm > 0))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} declares no ground width (\`spanKm\`). The ` +
          `ladder is compared in kilometres because degrees are not comparable across latitudes.`,
      );
    if (!(remove.barKm > 0))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} carries no scale bar. A locator without one ` +
          `says "near" and refuses to say how near — and this beat's whole gesture is about how near.`,
      );
    if (!(remove.barKm < remove.spanKm))
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} states a ${remove.barKm} km bar inside a ` +
          `${Math.round(remove.spanKm)} km frame — a bar longer than its own picture measures nothing`,
      );

    if (previous) {
      if (!(remove.spanKm > previous.spanKm))
        throw new Error(
          `${where}: remove ${JSON.stringify(remove.key)} is ${Math.round(remove.spanKm)} km wide ` +
            `after ${JSON.stringify(previous.key)} at ${Math.round(previous.spanKm)} km. The removes ` +
            `are a LADDER and the pills are read in order: a control that goes out and then back in ` +
            `is a set of viewpoints wearing a remove control's clothes, and the reader cannot hold ` +
            `"further away" as a direction.`,
        );
      const step = remove.spanKm / previous.spanKm;
      if (step < MIN_STEP)
        throw new Error(
          `${where}: ${JSON.stringify(previous.key)} → ${JSON.stringify(remove.key)} widens the frame ` +
            `by ${step.toFixed(2)}x, under the ${MIN_STEP}x this vocabulary asks of two removes a ` +
            `reader has to tell apart. On a map the just-noticeable step in remove is a FACTOR, not ` +
            `a difference: two frames that close are one frame drawn twice, and clicking between ` +
            `them makes the picture twitch and teaches nothing.`,
        );
    }
    previous = remove;

    if (
      remove.note !== null &&
      (typeof remove.note !== "string" || !remove.note.trim())
    )
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} has a \`note\` that is neither null nor a ` +
          `sentence — got ${JSON.stringify(remove.note)}`,
      );
  }

  const defaultSlug = vantageSlugOf(d.defaultKey ?? "");
  const published = d.removes.find((r) => vantageSlugOf(r.key) === defaultSlug);
  if (!published)
    throw new Error(
      `${where}: \`defaultKey\` is ${JSON.stringify(d.defaultKey)}, which is none of the declared ` +
        `removes (${d.removes.map((r) => r.key).join(", ")}). The default is the framing the ` +
        `newsroom PUBLISHES — the state a reader who touches nothing sees and the state a reader ` +
        `with no \`:has()\` never leaves; it cannot be a remove the page does not carry.`,
    );
  if (published.note !== null)
    throw new Error(
      `${where}: the published remove ${JSON.stringify(published.key)} carries a note. It is not a ` +
        `comparison with anything — it IS the claim — and a sentence under it restates what the page ` +
        `already prints.`,
    );
  for (const remove of d.removes)
    if (remove !== published && remove.note === null)
      throw new Error(
        `${where}: remove ${JSON.stringify(remove.key)} reveals no sentence. A remove that re-frames ` +
          `the map and says nothing leaves the reader to eyeball what entered and what left, and ` +
          `leaves the only channel its derived readings live on empty.`,
      );
  return d;
}

/** The options a component draws, in declaration order — nearest first, because the ladder is read
 *  outward and a reader who starts at the far end has already lost the subject. */
export function vantageOptionsForMarkup(
  d: VantageDeclaration,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  const defaultSlug = vantageSlugOf(d.defaultKey);
  return d.removes.map((remove) => {
    const slug = vantageSlugOf(remove.key);
    return {
      id: vantageOptionId(idPrefix, slug),
      slug,
      label: remove.label,
      announce: remove.announce,
      isDefault: slug === defaultSlug,
    };
  });
}

/** Every sentence a remove owes the reader, by the slug that reveals it. The published one has none. */
export function vantageNotesForMarkup(
  d: VantageDeclaration,
): { slug: string; text: string }[] {
  return d.removes
    .filter((remove) => remove.note !== null)
    .map((remove) => ({
      slug: vantageSlugOf(remove.key),
      text: remove.note as string,
    }));
}

/** Every remove's drawing rule, stacked in one grid cell so the legend line cannot reflow when the
 *  reader changes their mind — the owner's first arbitration, held by the drawing rather than by a
 *  promise, exactly as `classingKeyCss` holds it for a legend's bounds. */
export function vantageRulesForMarkup(
  d: VantageDeclaration,
): { slug: string; text: string }[] {
  return d.removes.map((remove) => ({
    slug: vantageSlugOf(remove.key),
    text: remove.rule,
  }));
}

/** Every remove's scale-bar label, stacked the same way and for the same reason — AND baked, which
 *  is the point: a bar label assembled in the browser is a string whose glyphs were never cut into
 *  the page's own embedded faces, and this format's font machine refuses a page that names a
 *  character it did not embed. The bar's LENGTH is live; its words are not. */
export function vantageBarsForMarkup(
  d: VantageDeclaration,
): { slug: string; km: number }[] {
  return d.removes.map((remove) => ({
    slug: vantageSlugOf(remove.key),
    km: remove.barKm,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE GESTURE. Pure CSS: `:has()` on the scope plus `:checked` on a
 * real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and on THIS type that is not a consolation prize. A choropleth's gesture is a paint on a
 * MapLibre layer and no stylesheet can reach one; a locator's gesture is a CAMERA, and a camera can
 * be photographed. The beat bakes one frozen picture per remove from its own live map and these
 * rules swap them.
 *
 * THE PUBLISHED REMOVE IS EMITTED TWICE ON PURPOSE. Once unscoped, which is the state an engine with
 * no `:has()` support never leaves and the state the SSR'd page opens in; once under its own
 * `:has(#…:checked)`, so every remove is reached by the identical mechanism and none is a special
 * case that could drift.
 *
 * THE BLANKET RULES COME FIRST, AND THAT IS THE WHOLE MECHANISM. Two attribute selectors score
 * identically, so source order decides — emitted the other way round, an engine without `:has()`
 * would be shown all four plates stacked on one another, all four legend lines overprinted and all
 * four scale bars at once. `assertOneVantage` reads the written page back for exactly that.
 *
 * NO SELECTOR HERE IS GROUPED, for the defect `stack.ts` records at length: a descendant prefix
 * binds to the first selector of a group only.
 */
export function vantageCss(
  d: VantageDeclaration,
  {
    scope,
    idPrefix,
    changeMs,
  }: { scope: string; idPrefix: string; changeMs: number },
): string {
  assertVantageDeclaration(d);
  if (!Number.isFinite(changeMs) || changeMs < 0)
    throw new Error(
      `vantage: changeMs must be a non-negative number, got ${changeMs}`,
    );
  const defaultSlug = vantageSlugOf(d.defaultKey);
  const lines: string[] = [
    `/* The remove this beat hands over: ${d.removes.length} framings of`,
    `   ${JSON.stringify(d.label)}. Radios plus :checked/:has(), generated once at build time — the`,
    `   same mechanism classing.ts re-cuts with, and the reason this gesture needs no script and`,
    `   survives one being blocked. A camera can be photographed; a fill layer cannot be reached. */`,
    // THE FROZEN PICTURES. Stacked in the plot cell, all but one transparent. `opacity` and not
    // `display`, because the owner's fourth arbitration asks a state change to interpolate and
    // `display` does not transition — and because a box that is `display: none` contributes nothing
    // to the grid cell it is supposed to be sizing.
    `${scope} [data-vantage-plate] { opacity: 0; visibility: hidden; }`,
    `${scope} [data-vantage-rule] { opacity: 0; visibility: hidden; }`,
    `${scope} [data-vantage-bar] { opacity: 0; visibility: hidden; }`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    // THE LIVE LABELS. Hidden by `display`, deliberately unlike everything above it: a label that is
    // merely transparent still occupies a box the overlap measurement would count, and this beat
    // REFUSES on measured label overlap. An invisible rectangle that still collides is the defect
    // that measurement exists to catch, wearing a disguise.
    `${scope} .mw-label { display: none; }`,
  ];

  const show = (on: string, slug: string) => {
    lines.push(
      `${on} [data-vantage-plate="${slug}"] { opacity: 1; visibility: visible; }`,
    );
    lines.push(
      `${on} [data-vantage-rule="${slug}"] { opacity: 1; visibility: visible; }`,
    );
    lines.push(
      `${on} [data-vantage-bar="${slug}"] { opacity: 1; visibility: visible; }`,
    );
    lines.push(`${on} .mw-label[data-vantage~="${slug}"] { display: block; }`);
  };

  // The state the page opens in, and the only state an engine without `:has()` ever draws.
  show(scope, defaultSlug);

  for (const remove of d.removes) {
    const slug = vantageSlugOf(remove.key);
    const on = `${scope}:has(#${vantageOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${on} [data-vantage-plate] { opacity: 0; visibility: hidden; }`,
    );
    lines.push(`${on} [data-vantage-rule] { opacity: 0; visibility: hidden; }`);
    lines.push(`${on} [data-vantage-bar] { opacity: 0; visibility: hidden; }`);
    lines.push(`${on} .mw-label { display: none; }`);
    show(on, slug);
    if (remove.note !== null)
      lines.push(`${on} [data-stack-note="${slug}"] { visibility: visible; }`);
  }

  // THE CROSS-FADE IS THE READING. Two removes of the same ground dissolved into one another is how
  // a reader sees that the second frame CONTAINS the first — a hard cut leaves them to work out
  // whether they are looking at the same place at all. Honoured only under `no-preference`: a reader
  // who asked for no motion gets the new framing instantly rather than not at all.
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-vantage-plate] { transition: opacity ${changeMs}ms ease, visibility ${changeMs}ms; }`,
    `  ${scope} [data-vantage-rule] { transition: opacity ${changeMs}ms ease, visibility ${changeMs}ms; }`,
    `  ${scope} [data-vantage-bar] { transition: opacity ${changeMs}ms ease, visibility ${changeMs}ms; }`,
    `}`,
  );
  // THE LEGEND LINE AND THE SCALE BAR ARE ONE GRID CELL EACH. A cell is as wide and as tall as the
  // LONGEST of its removes' lines, whichever is showing, so choosing a remove cannot reflow the row
  // above the map and cannot move the map — the owner's first arbitration again, and the same shape
  // of answer `classingKeyCss` gives a legend's stacked bounds.
  lines.push(
    `${scope} .vantage-rules { display: grid; align-items: center; }`,
    `${scope} .vantage-rules > [data-vantage-rule] { grid-area: 1 / 1; }`,
    `${scope} .mw-bars { display: grid; align-items: center; justify-items: start; }`,
    `${scope} .mw-bars > [data-vantage-bar] { grid-area: 1 / 1; }`,
  );
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back — the half no declaration-level check can make.
 *
 * `assertVantageDeclaration` holds the beat's INTENTION. This holds the artefact: the frozen picture
 * for every remove, the rules that swap them, and the source order they depend on. Dropping the
 * stylesheet call leaves every attribute on the page perfectly correct and every remove showing the
 * published picture — the defect `descend.ts` earned by mutation and the reason this function reads
 * a string rather than an object.
 */
export function assertOneVantage(
  html: string,
  d: VantageDeclaration,
  { where = "this page" }: { where?: string } = {},
): void {
  assertVantageDeclaration(d);
  const page = String(html);
  const slugs = d.removes.map((remove) => vantageSlugOf(remove.key));

  for (const slug of slugs) {
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(page))
      throw new Error(
        `${where}: nothing in the page's stylesheet answers the remove ${JSON.stringify(slug)}. A ` +
          `vocabulary a beat brings with it has to emit its own rules: without them every remove ` +
          `shows the published picture and every attribute is still perfectly correct.`,
      );
    if (!new RegExp(`data-vantage-plate="${slug}"`).test(page))
      throw new Error(
        `${where}: the remove ${JSON.stringify(slug)} has no frozen picture of its own. With no ` +
          `script, no key or no tiles, that remove would show the picture of a different one — the ` +
          `one failure this arrangement cannot report, because both are maps and both look right.`,
      );
    if (!new RegExp(`data-vantage-rule="${slug}"`).test(page))
      throw new Error(
        `${where}: the remove ${JSON.stringify(slug)} prints no drawing rule. A reader looking at ` +
          `twelve markers has no way to know the frame holds a hundred and seventy-seven.`,
      );
    if (!new RegExp(`data-vantage-bar="${slug}"`).test(page))
      throw new Error(
        `${where}: the remove ${JSON.stringify(slug)} carries no scale bar label. A locator without ` +
          `one says "near" and refuses to say how near.`,
      );
  }

  for (const attribute of [
    "data-vantage-plate",
    "data-vantage-rule",
    "data-vantage-bar",
  ]) {
    const blanket = page.search(
      new RegExp(`\\[${attribute}\\]\\s*\\{\\s*opacity:\\s*0`),
    );
    if (blanket < 0)
      throw new Error(
        `${where}: the stylesheet carries no blanket rule hiding every \`${attribute}\`, so all ` +
          `${d.removes.length} removes would be drawn on top of one another. This is the rule that ` +
          `must be emitted FIRST — two attribute selectors score identically and source order is the ` +
          `whole mechanism.`,
      );
    const firstShown = page.search(
      new RegExp(`\\[${attribute}="[^"]*"\\]\\s*\\{\\s*opacity:\\s*1`),
    );
    if (firstShown >= 0 && firstShown < blanket)
      throw new Error(
        `${where}: the stylesheet reveals a \`${attribute}\` BEFORE the blanket rule that hides them ` +
          `all. An engine without \`:has()\` — the only engine the unscoped pair ever decides ` +
          `anything for — would be shown every remove at once, stacked.`,
      );
  }
}
