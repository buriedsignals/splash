// twin/skills/chart-web/assets/interaction-plan.ts
//
// A CONTROL THAT CHANGES NOTHING IS REFUSED BEFORE THE PAGE IS WRITTEN.
//
// WHY THIS FILE EXISTS. Two sibling formats already hold this line. `scrolly`'s `assertStates`
// refuses a card whose state equals the card before it; `chart-video`'s `assertEventStates` refuses
// an event whose state equals the event before it. Both are the same sentence — *the reader moved
// and the picture did not* — and both are mechanical, so no one has to remember them.
//
// The WEB genre had the claim and no guard. Every web beat's `BRIEF.md` carries a paragraph saying
// what the format earns: `mapgen-symbol-web`'s says a still and a video can both SAY that the
// circles barely differ, and neither can let a reader ask a circle what it is worth. That is prose.
// Measured on the committed corpus the day this file was written: 143 delivered web pages, 1 of
// which shipped a hover that answered with strings the page had already printed on the marks
// themselves (`proof/mapgen-locator-web/locator.html` — eleven organisations, each labelled on the
// map, each answering "<its own label> — <the category already printed on its filter chip>"). A
// page can swear it earns the format and ship a decorative tooltip; nothing said so.
//
// WHY IT IS NOT A TRANSLITERATION OF THE TWO SIBLINGS, and the difference is the whole design. A
// choreography is a SEQUENCE the author controls: card 4 follows card 3, so "equals the one before
// it" is the natural comparison. An interaction is a SPACE the reader explores. The author does not
// control the order, does not know which control is touched, and cannot assume any of them is. So:
//
//   - The unit is not an event on a timeline. It is A QUESTION THE READER ARRIVES WITH, and what
//     the page does when they ask it.
//   - The comparison is not against the previous state. There is no previous state. It is against
//     THE DEFAULT STATE — the picture a reader who touches nothing is looking at — because that is
//     the only state every control is reached from.
//   - Two controls MAY produce the same state, and that is not a defect. A symbol map's table and
//     its hover answer the same seventeen magnitudes; they answer two different questions ("rank
//     them all" and "what is THIS circle worth") on two different channels. The sibling rule that
//     refuses a repeated state does NOT transfer, and pretending it did would delete the table.
//
// WHAT A STATE IS HERE. The set of readings the page puts in front of the reader. Derived from the
// RENDERED MARKUP rather than declared, for the reason `render-web.mjs` reads its entrance off the
// markup instead of taking it as a prop: a state an author types is a state an author can type
// wrongly, and the thing being guarded is what the page actually ships.
//
//   default state   the text the page PRINTS with nothing touched — titles, axis labels, direct
//                   labels, notes, the source line. NOT an SVG `<title>`/`<desc>` (revealed on
//                   hover or announced, never printed), NOT a `<details>` body (opened by a
//                   control), NOT a filter's narrowing note (revealed by `:checked`).
//   a revealing control's state    default ∪ what it answers with. Equal to the default exactly
//                   when it answers with nothing the page had not already printed.
//   a narrowing control's state    default minus what it takes away. Equal to the default exactly
//                   when it takes nothing away.
//
// WHAT IT DELIBERATELY DOES NOT MEASURE, so it is not trusted past its reach:
//
//   - ZOOM. A bounded zoom changes the CAMERA, not the set of readings, so nothing here can see
//     whether it changes anything. The arithmetic that can already exists and is not duplicated:
//     `map-web`'s `separationHeadroom` computes the zoom at which the closest overlapping pair of
//     marks comes apart, and `mapgen-symbol-web` declined to ship a zoom on its measurement (34 km
//     apart on an 83-degree camera: no bounded multiplier this format allows closes it).
//   - THE ENTRANCE. It is motion, not a question — the page answering before it is asked — and
//     `splash/test/web-entrance-is-an-addition.test.ts` already holds it, geometry twice.
//   - WHETHER THE QUESTION IS THE READER'S. It can see that hovering adds a reading. It cannot see
//     whether that reading is the one a reader of THIS claim wants. That is the `BRIEF.md` half of
//     the rule, and it is held by a person reading the brief before the code is written.
//
// WHERE IT FIRES. `renderWeb`/`renderMapWeb`, on the assembled draft, before the page is written —
// so an author meets it while building the beat, not in CI three sessions later. The census over
// the committed corpus is `splash/test/web-interaction-changes-the-picture.test.ts`, and it
// imports the same functions rather than re-deriving them: the last time one repository derived a
// filter's slug two ways, a whole map emptied with nothing red (`filter.ts`).

/**
 * THE REPERTOIRE. What a web beat can do, so an author picks what serves the claim instead of
 * animating by reflex. Derived from what the corpus actually does plus what these formats can do;
 * the counts are what the committed corpus shipped when this file was written.
 *
 * A gesture name is a value, not decoration: a declared control must name one of these, so a
 * control nobody can describe in the format's own vocabulary is refused at the declaration.
 */
export const GESTURES = {
  "ask-a-mark":
    "one mark answers with a reading printed nowhere on the plate — hover, tap or keyboard focus",
  "ask-a-line":
    "the connector between two ends answers with what LINKS them, not with either end again",
  "filter-to-a-subset":
    "the marks outside a named set leave, and the frame they were measured against does not move",
  "toggle-a-comparison":
    "one named set is swapped for another on the same scale — the same mechanism as a filter, a different question",
  "open-the-full-table":
    "every reading at once, as text, in an order an eye cannot impose on the marks",
  "zoom-and-pan":
    "the camera moves and marks too close to tell apart at this width come apart",
  "find-your-own-case":
    "the reader's own row is named and ringed among marks that are otherwise anonymous",
  "sort-or-reorder":
    "the same marks move into the order that answers the question",
  "brush-a-range":
    "a span of one axis is chosen and everything outside it steps back",
  "reveal-on-scroll":
    "the picture builds in the argument's order as the reader reaches it — the one gesture the reader does not ask for",
} as const;

export type Gesture = keyof typeof GESTURES;

/**
 * ONE CONTROL, WRITTEN BEFORE THE CODE. Three fields, and each answers a question the author would
 * otherwise answer by building something and looking at it afterwards:
 *
 *   question   the reader's own question, in their words, ending in a question mark. "What is this
 *              circle worth?" — not "hover detail".
 *   gesture    which of `GESTURES` asks it.
 *   changes    what changes in the picture when they do. One sentence, in the beat's own words.
 */
export type ReaderControl = {
  question: string;
  gesture: Gesture;
  changes: string;
};

/** What a beat declares when it has written its interaction out. Absent means it has not yet —
 *  the mechanical half below still runs, and the census names it. */
export type InteractionPlan = {
  /** What this page can do that a still and a video of the same claim cannot. The `BRIEF.md`
   *  sentence, carried into the render so the two cannot drift. */
  earns: string;
  controls: ReaderControl[];
};

/** The kinds of control this file can measure a state for, and the shape of each one's refusal. */
export type ControlKind = "ask" | "table" | "filter" | "stack";

const DECODE: [RegExp, string][] = [
  [/&nbsp;/g, " "],
  [/&#x27;|&apos;|&#39;/g, "'"],
  [/&quot;|&#34;/g, '"'],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&amp;/g, "&"],
];

/** HTML entities back to text, and every run of whitespace to one space. One implementation, because
 *  the default state and every control's state must be compared in the same alphabet. */
export function decodeText(text: string): string {
  let out = String(text);
  for (const [pattern, replacement] of DECODE) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, " ");
}

/**
 * THE DEFAULT STATE: everything the page PRINTS with nothing touched.
 *
 * Each exclusion below is a channel a control opens, and leaving one in would make that control
 * look like furniture the page already had — which is the exact opposite of what is being measured.
 * The choropleth map cost one round of this: it carries a native `<title>` on all 41 shapes (the
 * no-script tooltip), and counting those as printed made its hover look dead when it is the only
 * channel any of those values are on.
 */
export function defaultPrintedText(html: string): string {
  let text = String(html);
  text = text.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
  // A `<title>`/`<desc>` is a native tooltip or an announcement: revealed, never printed.
  text = text.replace(/<title>[\s\S]*?<\/title>/g, " ").replace(/<desc>[\s\S]*?<\/desc>/g, " ");
  // A disclosure's body is opened by a control. Its `<summary>` is printed.
  text = text.replace(
    /<details[\s\S]*?<\/details>/g,
    (block) => block.match(/<summary[\s\S]*?<\/summary>/)?.[0] ?? " ",
  );
  // A narrowing note is revealed by the same `:checked` that narrows the marks (`filter.ts`).
  text = text.replace(/<[^>]*data-filter-note="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g, " ");
  // A stack's sentence is revealed by the same `:checked` that moves the columns (`stack.ts`), and
  // it is the whole reading that control gives a reader who is not looking at the picture. Counting
  // it as printed would make the one channel its count and its running total are on look dead —
  // the same mistake the choropleth's 41 native `<title>`s cost a round of, one control to the left.
  text = text.replace(/<[^>]*data-stack-note="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g, " ");
  return decodeText(text.replace(/<[^>]*>/g, " "));
}

/**
 * The pieces of one answer, because an answer is usually several readings joined by the format's
 * own separators ("Bern · 4,1 t · rank 12"). A control that adds ONE of them to the picture has
 * changed the picture; requiring the whole string to be new would let a page pass by appending a
 * word. Fragments of one character are dropped: a stray separator is not a reading.
 */
export function answerPieces(answer: string): string[] {
  return decodeText(answer)
    .split(/\s*[·;]\s*|\s+—\s+/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 1);
}

/** Every distinct string the page's marks answer a pointer, a tap or a focus with. */
export function askAnswers(html: string): string[] {
  return [
    ...new Set(
      [...String(html).matchAll(/\sdata-detail="([^"]*)"/g)].map((m) => decodeText(m[1]).trim()),
    ),
  ].filter(Boolean);
}

/**
 * Every cell a disclosure's table holds, as text. `|` is inserted at every tag boundary so two
 * adjacent cells cannot be read as one string that happens to be absent from the plate.
 *
 * The `<summary>` and the `<caption>` are dropped, and that is not a detail: both are furniture
 * ABOUT the control rather than readings inside it, and counting them made the one dead table in
 * the corpus look alive. `proof/mapgen-locator-web` prints all eleven organisations on the map and
 * repeats them in its table; every row was already on the plate and the only string the disclosure
 * added was its own caption, "Every organisation behind the map above, in the same order as its
 * keyboard Home/End."
 */
export function tableCells(html: string): string[] {
  const out: string[] = [];
  for (const block of String(html).matchAll(/<details[\s\S]*?<\/details>/g)) {
    if (!/<table/.test(block[0])) continue;
    const body = block[0]
      .replace(/<summary[\s\S]*?<\/summary>/g, " ")
      .replace(/<caption[\s\S]*?<\/caption>/g, " ")
      .replace(/<[^>]*>/g, "|");
    for (const cell of decodeText(body).split("|")) {
      const trimmed = cell.trim();
      if (trimmed.length > 1) out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

/**
 * The filter options the page ships, by slug, the unfiltered one excluded.
 *
 * Read off the markup and never off the declaration, because the declaration is what is being
 * checked. EVERY ATTRIBUTE IS LOOKED FOR INSIDE THE WHOLE TAG rather than in one order: the first
 * form of this function required `type="radio"` to precede `id=`, and `chart-web` writes
 * `<input id="chart-filter-africa" type="radio" …>` while `map-web` writes them the other way
 * round — so it silently found four of the corpus's five filters and reported the fifth as a page
 * with no control. A discovery that misses the files it is meant to hold is the failure mode this
 * branch has already met three times.
 */
export function filterOptionSlugs(html: string): string[] {
  const slugs: string[] = [];
  for (const tag of String(html).matchAll(/<input\b[^>]*>/g)) {
    if (!/\stype="radio"/.test(tag[0])) continue;
    const id = tag[0].match(/\sid="(?:chart-filter|mw-filter)-([a-z0-9-]+)"/);
    if (id) slugs.push(id[1]);
  }
  return [...new Set(slugs)].filter((slug) => slug !== "all");
}

/**
 * Every token list the page drew for its filter, one per element carrying the vocabulary.
 *
 * TWO SPELLINGS, AND READING ONLY ONE MADE THIS CHECK VACUOUS. `filter.ts`'s vocabulary writes
 * `data-filter`; the map beats rendered before it was vendored still write `data-group`, the legacy
 * spelling `map-web`'s own stylesheet keys off. Measured when this was found: of the five committed
 * pages that ship a filter, ONE writes `data-filter` and FOUR write `data-group` — so a version of
 * this function that read `data-filter` alone returned an empty list for four of them, found no
 * option that keeps everything, and reported all four filters as alive without measuring anything.
 * A mutation that tagged every element with every option passed it. That is the exact shape of the
 * three guards on this branch that went green because their walk missed the files they were meant
 * to hold, so both spellings are read and the emptiness is refused rather than shrugged at.
 */
function filterTokenLists(html: string): string[][] {
  return [...String(html).matchAll(/\sdata-(?:filter|group)="([^"]*)"/g)].map((m) =>
    decodeText(m[1]).trim().split(/\s+/).filter(Boolean),
  );
}

/**
 * The stack options the page ships, by slug, the untouched one excluded.
 *
 * Read off the markup and never off the declaration, for the reason `filterOptionSlugs` gives, and
 * with the same lesson applied: EVERY ATTRIBUTE IS LOOKED FOR INSIDE THE WHOLE TAG rather than in
 * one order, because the first form of that function required `type="radio"` to precede `id=` and
 * silently found four of the corpus's five filters.
 */
export function stackOptionSlugs(html: string): string[] {
  const slugs: string[] = [];
  for (const tag of String(html).matchAll(/<input\b[^>]*>/g)) {
    if (!/\stype="radio"/.test(tag[0])) continue;
    const id = tag[0].match(/\sid="(?:chart|mw)-stack-([a-z0-9-]+)"/);
    if (id) slugs.push(id[1]);
  }
  return [...new Set(slugs)].filter((slug) => slug !== "none");
}

/** Every sentence the stack reveals, by the slug that reveals it. */
export function stackNotes(html: string): { slug: string; text: string }[] {
  const out = new Map<string, string>();
  for (const block of String(html).matchAll(
    /<[^>]*data-stack-note="([^"]*)"[^>]*>([\s\S]*?)<\/[a-z]+>/g,
  ))
    out.set(block[1], decodeText(block[2].replace(/<[^>]*>/g, " ")).trim());
  return [...out].map(([slug, text]) => ({ slug, text }));
}

export type ShippedControl = {
  kind: ControlKind;
  /** What a message names it, and what a declaration's gesture is matched against. */
  label: string;
  /** The gestures a declaration may legitimately name for this shipped control. */
  gestures: Gesture[];
  /** How many readings it puts in front of the reader that the default state does not hold. */
  changes: number;
  /** The size of what it was measured over, for a message that says how thin the margin was. */
  measured: number;
  /** Why it changes nothing, ready to be quoted. */
  why: string;
};

/**
 * WHAT THE PAGE ACTUALLY SHIPS, and for each one whether its state differs from the default.
 *
 * Nothing is registered and nothing is passed in: a control is present because the markup carries
 * the attribute that makes it work. That is the same contract `verify-web.mjs` discovers marks by
 * (`[data-detail]`, "the format's real contract"), and it is why a beat that ships a control and
 * forgets to declare it is still caught.
 */
export function shippedControls(html: string): ShippedControl[] {
  const printed = defaultPrintedText(html);
  const out: ShippedControl[] = [];

  const answers = askAnswers(html);
  if (answers.length) {
    const adding = answers.filter((answer) =>
      answerPieces(answer).some((piece) => !printed.includes(piece)),
    );
    out.push({
      kind: "ask",
      label: "the readings the marks answer with (data-detail)",
      gestures: ["ask-a-mark", "ask-a-line", "find-your-own-case"],
      changes: adding.length,
      measured: answers.length,
      why:
        `all ${answers.length} answers are strings the page already prints — ` +
        `a reader who hovers every mark learns nothing they could not read at rest`,
    });
  }

  const cells = tableCells(html);
  if (cells.length) {
    const adding = cells.filter((cell) => !printed.includes(cell));
    out.push({
      kind: "table",
      label: "the table behind the disclosure",
      gestures: ["open-the-full-table", "sort-or-reorder"],
      changes: adding.length,
      measured: cells.length,
      why:
        `all ${cells.length} cells are strings the page already prints — ` +
        `opening it gives the reader the plate again, in a second typeface`,
    });
  }

  const slugs = filterOptionSlugs(html);
  if (slugs.length) {
    const lists = filterTokenLists(html);
    // A filter whose options tag NO element narrows nothing at all — the whole control is the
    // unfiltered view wearing chips. It is reported as zero live options rather than skipped,
    // because "the vocabulary is missing" and "every option keeps everything" are the same
    // reader-facing fact: the picture does not move.
    const inert = lists.length === 0
      ? slugs
      : slugs.filter((slug) => lists.every((tokens) => tokens.includes(slug)));
    out.push({
      kind: "filter",
      label: `the filter's ${slugs.length} narrowing option(s)`,
      gestures: ["filter-to-a-subset", "toggle-a-comparison", "brush-a-range"],
      changes: slugs.length - inert.length,
      measured: slugs.length,
      why:
        lists.length === 0
          ? `no element on the page carries the filter vocabulary (data-filter / data-group), so ` +
            `all ${slugs.length} option(s) narrow nothing — the chips are drawn over a picture they cannot reach`
          : `${inert.length} of ${slugs.length} option(s) keep every element the page drew ` +
            `(${inert.join(", ")}) — that is the unfiltered view under a second name`,
    });
  }

  const stackSlugs = stackOptionSlugs(html);
  if (stackSlugs.length) {
    const notes = new Map(stackNotes(html).map((note) => [note.slug, note.text]));
    // An option changes the picture when the sentence it reveals carries a reading the page does
    // not already print. The MOVEMENT itself is deliberately not what is measured: a transform is
    // not a reading, this file cannot see one, and a version that counted generated rules would go
    // green on a hundred rules that moved nothing — the exact shape of the three guards on this
    // branch that passed while their walk missed the files they were written to hold. An option
    // whose sentence is missing is counted as inert for the same reason a filter whose options tag
    // no element is: the reader gets no reading, whatever the picture did.
    const adding = stackSlugs.filter((slug) => {
      const note = notes.get(slug);
      if (!note) return false;
      return answerPieces(note).some((piece) => !printed.includes(piece));
    });
    out.push({
      kind: "stack",
      label: `the stack's ${stackSlugs.length} option(s)`,
      gestures: ["toggle-a-comparison", "sort-or-reorder"],
      changes: adding.length,
      measured: stackSlugs.length,
      why:
        `all ${stackSlugs.length} option(s) reveal a sentence the page already prints, or reveal ` +
        `none at all — a reader who works through every option is told nothing they could not read ` +
        `at rest`,
    });
  }

  return out;
}

/**
 * THE MECHANICAL REFUSAL, and it runs for every beat whether or not one has been declared.
 *
 * A control whose state, once applied, equals the default state is a control the reader operates
 * while nothing changes. The sibling formats refuse the same thing one comparison to the left:
 * `assertStates` (`scrolly/assets/reveal.mjs`) refuses a card whose state equals the card before
 * it, `assertEventStates` (`chart-video/scripts/choreography.mjs`) an event whose state equals the
 * event before it.
 */
export function assertControlsChangeSomething(html: string, where = "this page"): ShippedControl[] {
  const controls = shippedControls(html);
  if (controls.length === 0)
    throw new Error(
      `${where} ships no reader control at all — no mark answers, no table, no filter. A web beat ` +
        `whose reader can only look at it is a still with a stylesheet; give it the reading the ` +
        `plate had to omit, or deliver the static genre ` +
        `(chart-web/references/directed-interaction.md)`,
    );
  for (const control of controls) {
    if (control.changes > 0) continue;
    throw new Error(
      `${where}: ${control.label} changes nothing — ${control.why}. A control whose state equals ` +
        `the default state is one the reader operates while the picture stands still. Give it a ` +
        `reading of its own — ${control.gestures.join(", ")} — or ship it not at all ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
  }
  return controls;
}

/**
 * THE DECLARATION HALF: the interaction was written before the code, control by control.
 *
 * A beat that declares nothing is not refused here — the corpus predates this rule and the walk
 * that closes it goes type by type through the catalogue. What IS refused is a declaration that
 * does not match the page: a control declared and not shipped is a promise the brief makes and the
 * render breaks, and a control shipped and not declared is the thing this rule exists to stop being
 * possible. Same gate the filter vocabulary earned: all of it or none of it.
 */
export function assertInteractionPlan(
  html: string,
  plan: InteractionPlan | null | undefined,
  where = "this page",
): void {
  const shipped = assertControlsChangeSomething(html, where);
  if (plan === null || plan === undefined) return;

  if (typeof plan !== "object" || Array.isArray(plan))
    throw new Error(`${where}: an interaction plan is an object, got ${JSON.stringify(plan)}`);
  if (typeof plan.earns !== "string" || plan.earns.trim().split(/\s+/).length < 8)
    throw new Error(
      `${where}: \`earns\` must say, in the beat's own words, what this page can do that a still ` +
        `and a video of the same claim cannot. Got ${JSON.stringify(plan.earns)}`,
    );
  if (!Array.isArray(plan.controls) || plan.controls.length === 0)
    throw new Error(
      `${where}: an interaction plan with no controls declares nothing. A beat with no control ` +
        `declares no plan.`,
    );

  const declared: Gesture[] = [];
  plan.controls.forEach((control, i) => {
    const at = `${where}: control ${i + 1}`;
    if (typeof control?.question !== "string" || !control.question.trim().endsWith("?"))
      throw new Error(
        `${at} must carry the READER'S OWN QUESTION, ending in a question mark — "What is this ` +
          `circle worth?", never "hover detail". Got ${JSON.stringify(control?.question)}`,
      );
    if (!(control.gesture in GESTURES))
      throw new Error(
        `${at} names the gesture ${JSON.stringify(control?.gesture)}, which is not in the ` +
          `repertoire: ${Object.keys(GESTURES).join(", ")}`,
      );
    if (typeof control.changes !== "string" || control.changes.trim().split(/\s+/).length < 4)
      throw new Error(
        `${at} must say WHAT CHANGES IN THE PICTURE when the reader asks — the half an author ` +
          `otherwise settles by building something and looking at it. Got ${JSON.stringify(control?.changes)}`,
      );
    declared.push(control.gesture);
  });

  for (const control of shipped) {
    if (control.gestures.some((gesture) => declared.includes(gesture))) continue;
    throw new Error(
      `${where} ships ${control.label} and the plan declares no control for it. Write it out ` +
        `first — the reader's question, the gesture (${control.gestures.join(" / ")}), and what ` +
        `changes — or stop shipping it.`,
    );
  }
  const shippedGestures = new Set(shipped.flatMap((control) => control.gestures));
  const unmeasured = new Set<Gesture>(["zoom-and-pan", "reveal-on-scroll"]);
  for (const gesture of declared) {
    if (shippedGestures.has(gesture) || unmeasured.has(gesture)) continue;
    throw new Error(
      `${where}: the plan declares a ${JSON.stringify(gesture)} control and the page ships none. ` +
        `A brief that promises a control the render does not build is how a format ends up with ` +
        `"hover works" as a sentence somebody wrote after looking once.`,
    );
  }
}
