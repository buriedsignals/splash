/**
 * THE ENTRANCE CONTRACT — the one object a journalist edits to retime a web beat's arrival.
 *
 * WHAT THIS IS A COPY OF, AND WHY IT IS A COPY. `chart-video/assets/timing.ts` already knows
 * how a chart arrives: six events named editorially, in a fixed order, each begun only once the one
 * before it has finished. The owner was asked what style the web entrance should be and answered
 * *"dans le même style que la vidéo"* — the same idiom as the video. So this file carries the
 * video's vocabulary rather than inventing a second one, and the web genre replays the video's own
 * choreography instead of drifting into a parallel grammar that would slowly disagree with it.
 *
 * It is a COPY and not an import because nothing under a skill may import out of the skill
 * (`splash/test/no-cross-skill-imports.test.ts`) — a skill directory has to build after being
 * copied, on its own, into a journalist's root, and no copy of THIS directory carries
 * `chart-video` with it. What keeps the two honest is
 * `splash/test/web-entrance-parity.test.ts`, which walks both files, compares the shared
 * arithmetic character for character, and — because a text comparison cannot see a rule that has
 * quietly changed meaning — runs the SAME fixtures through both order checks and fails when the two
 * disagree about what is legal.
 *
 * ── WHAT WAS COPIED, VERBATIM ────────────────────────────────────────────────────────────────
 *
 *   - `endOf` and `progressOf`, character for character. `progressOf` is clamped at both ends for
 *     the reason its own copy states, and the reason survives the change of medium: an unclamped
 *     window keeps moving outside itself, and here that would be a label still growing more opaque
 *     after the graphic has come to rest.
 *   - The ORDER, and the ordering RULE. `establish · reference · reveal · subject · conclusion` are
 *     the first five of the video's own `EVENT_ORDER`, in the video's own sequence, and each still
 *     begins only once the one before it has finished. That rule is the whole reason for borrowing
 *     the vocabulary: it is what makes the entrance carry the ARGUMENT'S order rather than being
 *     motion added for energy (`doctrine/references/motion-grammar.md`, first anti-pattern).
 *   - GAPS ARE LOAD-BEARING and are still not named, because nothing arrives during them.
 *   - The label rule, which is not arithmetic here but a call this file exists to make possible: a
 *     value label may not appear before the mark it names has arrived. `atProgress` below is how a
 *     beat derives that instant from its own geometry instead of typing a number beside it.
 *
 * ── WHAT WAS DELIBERATELY CHANGED, AND WHY ───────────────────────────────────────────────────
 *
 *   1. **`hold` is dropped.** A video's `hold` is the stillness at the end — the frames a reader
 *      actually reads, ending exactly on the composition's last frame, floored at half a second. A
 *      web beat's hold is the REST OF ITS LIFE: the graphic arrives once and then stays, for as long
 *      as the reader is on the page. There is nothing to time and nothing to end on, so the event
 *      does not exist here rather than existing with a meaningless number in it. The video's
 *      `checkTiming` rule that `hold` must end exactly at `total` is replaced by
 *      `ENTRANCE_CEILING_MS` below, which is a different rule about a different thing.
 *
 *   2. **The unit is MILLISECONDS, not frames.** There is no composition and no fps: the entrance
 *      is CSS, and CSS counts in time. `120` in this file is 120ms; `120` in `timing.ts` is four
 *      seconds at 30fps. This is the one place the two files cannot be read interchangeably, which
 *      is why every duration below is stated with its video ancestor beside it.
 *
 *   3. **The pace. Motion is divided by three; the two PAUSES are divided by five.** The video's
 *      pacing is chosen for a viewer who cannot skip, cannot dwell, and has nothing else on screen.
 *      This reader has the opposite of all three: they arrive mid-article, they can look away, and
 *      when the build is over the finished graphic sits there indefinitely for them to read at their
 *      own pace. So every millisecond of build is a millisecond during which the argument is not yet
 *      stated, and the two pauses are cut hardest of all — the video's 600ms pause exists so a
 *      viewer can read the baseline before the curve crosses it, which is a problem a reader who can
 *      simply keep looking at the finished chart does not have. What the pauses keep is their JOB:
 *      the reference still lands as its own beat and is not swallowed by the curve.
 *
 *      The video, end to end, takes 6.4 s to reach the end of its conclusion (frame 192 of 240 at
 *      30fps). This takes 2.03 s. The arithmetic is written out in `WEB_ENTRANCE` below, event by
 *      event, so the next person can see which number came from where.
 *
 *   4. **A ceiling exists, and it is stated rather than measured.** `ENTRANCE_CEILING_MS` is the
 *      number this genre is held to, not a number read off an experiment: an entrance nobody watched
 *      to the end is a worse artifact than a static chart, so the whole build has to fit inside the
 *      time a reader spends arriving at a graphic. 2400ms is a judgement. It is enforced
 *      (`checkEntrance`, and again in a real browser by
 *      `splash/test/web-entrance-is-an-addition.test.ts`), and it is a knob.
 *
 * ── WHAT THIS FILE DOES NOT DECIDE ───────────────────────────────────────────────────────────
 *
 * The MECHANISM of a reveal belongs to the beat, not to the contract. A line's reveal is a head
 * advancing along its own path; a bar chart's is bars growing from their baseline; a pyramid's is
 * two rows meeting in the middle. The video genre has exactly the same split — `timing.ts` holds the
 * edit, `EmissionsVideo.tsx` holds the drawing — and it is why neither file is parameterised into a
 * general animator. What the contract owns is WHEN each layer arrives and IN WHAT ORDER.
 *
 * What the contract DOES own, since a second mechanism landed, is the ARITHMETIC of a cascade
 * (`markEvent` below): how one `reveal` window is divided among n marks so that they arrive in the
 * argument's order and overlap into one continuous build. WHICH mark is index 0 is still the beat's
 * call, and it is the editorial half.
 */

/** One event of the entrance. `start` and `duration` are MILLISECONDS — see change 2 above. */
export type EntranceEvent = {
  /** First millisecond of the event, inclusive, measured from the moment the graphic enters view. */
  start: number;
  /** How long it takes. `start + duration` is the first millisecond after it. */
  duration: number;
};

/**
 * The five events, in the order a web beat plays them.
 *
 * The video's own six minus `hold`. Gaps between events are legal and load-bearing: the pause that
 * lets the reference land as its own beat IS the gap between `reference` ending and `reveal`
 * starting. Gaps are not named, because nothing arrives during them — that is what makes them
 * pauses.
 */
export type BeatEntrance = {
  /** Furniture: title, caveat, source, axis, ticks, gridlines, the filter control. Comes up, then
   *  never moves again. */
  establish: EntranceEvent;
  /** The level the argument is measured against, laid down before the evidence. */
  reference: EntranceEvent;
  /** The data arriving, in the data's own order. */
  reveal: EntranceEvent;
  /** The one mark the takeaway is about, landing as its own event. */
  subject: EntranceEvent;
  /** The assertion that closes the argument — here the subject's value, stated once it has landed.
   *  NOT the title: a title is furniture and establishes with the axis. */
  conclusion: EntranceEvent;
};

/** The order the events must appear in, and the order the checks read them in. The video's own
 *  `EVENT_ORDER` without its sixth entry — see change 1. */
export const ENTRANCE_ORDER = [
  "establish",
  "reference",
  "reveal",
  "subject",
  "conclusion",
] as const;

export type EntranceEventName = (typeof ENTRANCE_ORDER)[number];

export function endOf(event: EntranceEvent): number {
  return event.start + event.duration;
}

/**
 * How far through an event a given moment is, 0..1, clamped at both ends.
 *
 * Clamped is not a detail: an unclamped window keeps moving outside itself, so a label that faded
 * in over 24 frames keeps getting more opaque for the rest of the video, and the hold is not still.
 */
export function progressOf(frame: number, event: EntranceEvent): number {
  if (event.duration <= 0) return frame >= event.start ? 1 : 0;
  return Math.max(0, Math.min(1, (frame - event.start) / event.duration));
}

/**
 * The moment a given fraction of the way through an event, in milliseconds from entry.
 *
 * THIS IS THE LABEL RULE'S ONLY TOOL, and it is the inverse of `progressOf` rather than a second
 * timing idea. The video gates a label on the arrival of the mark it names — the reference label
 * appears `0.55` of the way through `reference`, the peak marker `0.06` of the reveal after the
 * line passes it — and it computes that fraction from its own geometry rather than typing a frame
 * number. A web layer cannot ask "where is the head now?" on every frame, because there are no
 * frames: it is handed ONE delay, up front, by CSS. So the beat computes the fraction the same way
 * the video does and turns it into a delay here.
 *
 * `progressOf(atProgress(e, f), e) === f` for any `f` in 0..1, which is what the parity test
 * asserts rather than trusting the sentence above.
 */
export function atProgress(event: EntranceEvent, fraction: number): number {
  return Math.round(
    event.start + Math.max(0, Math.min(1, fraction)) * event.duration,
  );
}

/**
 * THE CASCADE'S OVERLAP FACTOR — how far into its successor's slot a mark's own growth runs.
 *
 * `1` would give n marks n disjoint slots, and the build would read as n discrete steps with a seam
 * between each. Above `1` the slots overlap and it reads as one continuous cascade. The number is
 * the video's own and is not invented here: six video beats in this repository carry the same
 * three-line window function with this factor typed into it —
 * `vidy-lollipop-renewables-share-europe` (1.6), `vidx-grouped-bar-co2-per-capita` (1.6),
 * `vidx-stacked-bar-swiss-electricity` (1.6), `vidz-bar-column-top-emitters` (1.6),
 * `vidy-boxplot-co2-by-continent` (1.7), `vidy-pyramid-niger-population` (1.8),
 * `vidz-diverging-bar-eu-per-capita` (2.2). 1.6 is the one four of them chose, so it is the default
 * here; the parameter exists because the other three had reasons (fewer, fatter marks want more
 * overlap or the last one lands too late).
 */
export const MARK_OVERLAP = 1.6;

/**
 * ONE MARK'S OWN SLICE OF THE REVEAL, as an event in its own right.
 *
 * WHY THIS EXISTS AT ALL, and it is the whole reason a second reveal mechanism was built. The first
 * one is a CLIP WIPE: one rect grows left to right and uncovers whatever is behind it. That is
 * exactly right for a line whose x axis is time — it is the video's `drawnSoFar`, frame for frame —
 * and it is WRONG FOR THE WHOLE BAR FAMILY, which was measured rather than reasoned: a lollipop
 * entrance was built on the wipe, driven green, and reverted on looking at it. Every stem starts at
 * the same zero baseline, so a wipe at 40 % leaves all fifteen stems 40 % of the plot long — for two
 * thirds of the build the chart states that all fifteen countries are equal, which is the opposite
 * of what a ranking claims. **An intermediate frame of a reveal is an assertion, and it has to be a
 * true one.**
 *
 * So a bar, a stem, a band or a segment grows from ITS OWN baseline to ITS OWN value, and this is
 * where it gets its own window. `span = 1/count`, `start = i * span`, `end = start + span * overlap`
 * clamped to the end — the video's own `rowWindow`, in milliseconds, with `atProgress` doing the
 * conversion so the two never disagree about where a fraction of `reveal` lands.
 *
 * The returned object is an `EntranceEvent` and not a `{ start, end }` pair ON PURPOSE: it is the
 * same type every other layer takes, so `atProgress(mark, 0.7)` derives the instant this mark's own
 * label may appear. That is the label rule — "a value label may not appear before the mark it names
 * has arrived" — expressed against the mark's own clock rather than the master one, which is the
 * distinction `doctrine/references/motion-grammar.md` makes and the thing an instrument can check.
 *
 * `duration` is floored at one millisecond because `checkEntrance` refuses zero, and a cascade over
 * enough marks rounds a slot to nothing before it rounds it negative.
 */
export function markEvent(
  reveal: EntranceEvent,
  i: number,
  count: number,
  overlap: number = MARK_OVERLAP,
): EntranceEvent {
  if (!Number.isInteger(count) || count < 1)
    throw new Error(`a cascade needs at least one mark, got count=${count}`);
  if (!Number.isInteger(i) || i < 0 || i >= count)
    throw new Error(`mark index ${i} is outside a cascade of ${count}`);
  if (!(overlap >= 1))
    throw new Error(
      `overlap ${overlap} is under 1 — marks would leave a gap between them and the build would ` +
        `read as ${count} discrete steps`,
    );
  const span = 1 / count;
  const start = atProgress(reveal, i * span);
  const end = atProgress(reveal, Math.min(1, i * span + span * overlap));
  return { start, duration: Math.max(1, end - start) };
}

/**
 * The whole entrance is over by this many milliseconds after the graphic enters view.
 *
 * See change 4. Enforced by `checkEntrance` on the contract, and again on the rendered page — a
 * layer whose own delay plus duration overruns it is caught even if the contract does not, because
 * a beat derives some of its delays from its own geometry.
 */
export const ENTRANCE_CEILING_MS = 2400;

/**
 * The reasons an entrance object is not a legal one. Empty means it is one.
 *
 * The video's `checkTiming`, minus the two rules that were about `hold` and about a composition's
 * last frame, plus the ceiling. The ORDERING rule — the middle block — is the video's own, and the
 * parity test runs the same fixtures through both to prove it has not drifted.
 */
export function checkEntrance(entrance: BeatEntrance): string[] {
  const errors: string[] = [];

  for (const name of ENTRANCE_ORDER) {
    const event = entrance[name];
    if (!Number.isInteger(event.start) || event.start < 0)
      errors.push(
        `${name}: start must be a whole millisecond, got ${event.start}`,
      );
    if (!Number.isInteger(event.duration) || event.duration <= 0)
      errors.push(
        `${name}: duration must be at least one millisecond, got ${event.duration}`,
      );
  }
  if (errors.length > 0) return errors;

  // Each event begins only once the one before it has finished. This is "the conclusion appears
  // only after its evidence is visible" and "the subject arrives as a distinct event", as
  // arithmetic — the video's rule, unchanged.
  for (let i = 1; i < ENTRANCE_ORDER.length; i++) {
    const previous = ENTRANCE_ORDER[i - 1];
    const current = ENTRANCE_ORDER[i];
    if (entrance[current].start < endOf(entrance[previous]))
      errors.push(
        `${current} starts at ${entrance[current].start}, before ${previous} finishes at ${endOf(entrance[previous])}`,
      );
  }

  // The video's rule here was that `hold` ends exactly on the composition's last frame. A web beat
  // has no last frame; what it has instead is a reader who will not wait. See change 4.
  if (endOf(entrance.conclusion) > ENTRANCE_CEILING_MS)
    errors.push(
      `the entrance ends at ${endOf(entrance.conclusion)}ms, past the ${ENTRANCE_CEILING_MS}ms ceiling — ` +
        `an entrance nobody watched to the end is worse than no entrance`,
    );

  return errors;
}

/**
 * This genre's own entrance. 2.03 seconds, against the video's 6.4.
 *
 * Read it as the edit, with its video ancestor beside each number (`CO2_TIMING`, 30fps):
 *
 * | event      | video           | here    | factor | why                                        |
 * | ---------- | --------------- | ------- | ------ | ------------------------------------------ |
 * | establish  | 26f = 867ms     | 290ms   | ÷3     | motion                                     |
 * | *gap*      | 6f = 200ms      | 40ms    | ÷5     | pause                                      |
 * | reference  | 22f = 733ms     | 240ms   | ÷3     | motion                                     |
 * | *gap*      | 18f = 600ms     | 120ms   | ÷5     | pause — and 120ms is this genre's own unit |
 * | reveal     | 78f = 2600ms    | 870ms   | ÷3     | motion                                     |
 * | subject    | 18f = 600ms     | 200ms   | ÷3     | motion                                     |
 * | conclusion | 24f = 800ms     | 270ms   | ÷3     | motion                                     |
 * | hold       | 48f = 1600ms    | —       |        | the rest of the page's life (change 1)     |
 *
 * The second gap is 120ms and not 200ms because 120ms is already this genre's transition unit —
 * the filter pill and the filtered marks both use it (`render-web.mjs`'s `FILTER_CHROME_CSS`) — and
 * a page with two motion units in it is a page whose motion was not designed.
 *
 * `subject` and `conclusion` ABUT their predecessors with no gap at all, exactly as the video does
 * (`reveal` ends at frame 150 and `subject` starts at 150; `subject` ends at 168 and `conclusion`
 * starts at 168). The subject landing the instant the curve reaches it, and its value being stated
 * the instant it has landed, is the argument closing without a beat of dead air in the middle.
 */
export const WEB_ENTRANCE: BeatEntrance = {
  establish: { start: 0, duration: 290 },
  reference: { start: 330, duration: 240 },
  reveal: { start: 690, duration: 870 },
  subject: { start: 1560, duration: 200 },
  conclusion: { start: 1760, duration: 270 },
};

/**
 * The two easing curves, named once so a beat never types a bezier.
 *
 * `LINEAR` IS THE ONE THAT MATTERS AND IT IS COPIED WITH ITS REASON. The video's `drawnSoFar`
 * doc-comment states it: the reveal is linear *because the x axis IS time* — easing it would make
 * some years occupy more screen time than others, which is a lie about the pace of the data
 * (`motion-grammar.md`). The same is true of a wipe across the same axis.
 *
 * `ARRIVE` is `Easing.out(Easing.cubic)`, which the video uses for the reference rule being laid
 * down and for the conclusion appearing — things that ARRIVE, as opposed to things that are paced.
 * `cubic-bezier(0.33, 1, 0.68, 1)` is the standard bezier approximation of `1 - (1 - t)³`; it is an
 * approximation and not the identical curve, which costs nothing at 240ms and is stated rather than
 * implied.
 *
 * There is deliberately no spring. The video lands its subject dot on a critically damped spring
 * (`damping: 200` against `stiffness: 120`) so the dot settles onto its coordinate and never passes
 * it — "for the frames it overshot it would be showing a value the data does not contain". CSS has
 * no spring, and the rule that matters is NO OVERSHOOT, which `ARRIVE` satisfies by construction: a
 * bezier whose control points stay inside 0..1 cannot exceed its endpoint. A bouncy
 * `cubic-bezier(.34,1.56,.64,1)` would be the same defect the video's damping exists to prevent.
 */
export const ENTRANCE_EASING = {
  LINEAR: "linear",
  ARRIVE: "cubic-bezier(0.33, 1, 0.68, 1)",
} as const;

/**
 * How long a DERIVED label takes to fade in, in milliseconds.
 *
 * A DIVERGENCE FROM THE VIDEO, and the reason is a consequence of the ÷3/÷5 rescale. The video
 * states a label's fade as a FRACTION of its own event — the reference label runs `[0.55, 1]` of
 * `reference`, i.e. the last 45 % of a 733ms window, 330ms. Expressed the same way here, the same
 * rule would give the reference label a 108ms fade and the PEAK label — which sits inside the
 * 870ms `reveal` — a 390ms one, four times slower, for a small grey note that says less. A
 * fraction of a window is the right unit when every window is roughly the same length; these are
 * not. So a derived label states its own duration and the WHEN stays derived, which is the half
 * that carries the rule.
 *
 * 110ms is the video's own reference-label fade (108ms after the ÷3) rounded.
 */
export const LABEL_FADE_MS = 110;

/**
 * A `clipPath` id that cannot collide with another beat's on the same page.
 *
 * NOT decoration. This genre's whole delivery model is an embed: `renderWeb` writes one
 * self-contained file that a CMS drops into an article, and an article may hold two of them. Two
 * `<clipPath id="entrance-reveal">` in one document is a real defect and a quiet one — `url(#id)`
 * resolves to the FIRST match in document order, so both figures would share one clip AND one
 * animation, and the second beat would reveal itself when the first entered the viewport.
 *
 * FNV-1a over the beat's own title, which is the one string a runner always has and never shares
 * with another beat in the same article. A collision here costs the same defect, so the guard
 * (`splash/test/web-entrance-is-an-addition.test.ts`) asserts every `clipPath` id in a page is
 * unique and referenced rather than trusting 32 bits.
 */
/** The five motions the shared stylesheet defines. See `render-web.mjs`'s `entranceCss` for what
 *  each one is for and why there are exactly five. */
export type EntranceMotion = "fade" | "wipe" | "land" | "grow" | "pop";

/** Which way a `grow` mark's own extent runs, and where its baseline is.
 *
 *  `axis` is the direction the LENGTH THAT ENCODES THE VALUE runs in — `x` for a horizontal bar or
 *  a lollipop stem, `y` for a column. The other axis is left alone at 1, so a bar never gets thinner
 *  while it grows longer: the thickness of a bar carries no reading and animating it would be motion
 *  added for energy.
 *
 *  `origin` is the mark's own BASELINE, in the element's own coordinate system — the zero line the
 *  length is measured from, which is the one point that must not move. Stated per mark rather than
 *  taken from `0 0`, because a diverging bar's baseline is a centre line, a column's is the bottom
 *  of the plot, and a stem's is wherever the value axis's zero landed. Measured, not assumed: with
 *  `transform-box: view-box`, Chrome resolves a length `transform-origin` in the ELEMENT'S OWN local
 *  coordinates (a `<line x1=100>` given `transform-origin: 100px 200px` and `scaleX(0.5)` keeps its
 *  left end at 100 and halves its length — driven, not read off a spec). */
export type GrowFrom = {
  /** `x` for a horizontal bar or a lollipop stem, `y` for a column. A mark whose arrival is its own
   *  SIZE rather than a length — a scatter dot, whose reading is its POSITION — is not a `grow` at
   *  all: it is `pop`, which animates a different CSS property for a measured reason. See
   *  `render-web.mjs`'s `entranceCss`. */
  axis: "x" | "y";
  origin: { x: number; y: number };
};

/**
 * One layer's own attributes and custom properties, ready for a component to put on an element.
 *
 * Two returns rather than one bag of props, because half the elements a beat tags already carry a
 * `style` of their own — the overlay's labels are positioned in per cent so they track the SVG's
 * stretch — and a spread that silently replaced it would move a label off the mark it names. So the
 * caller writes `{...layer.attrs} style={{ ...layer.vars, top: … }}` and the collision is visible.
 *
 * `data-entrance` names the EVENT, which is the argument's own order and the thing a person reads;
 * `data-entrance-motion` names the keyframe. Both, because they are two different facts: two
 * layers can share an event and move differently (the reference rule wipes while its label fades),
 * and the guard reads the first for the order and the second for what is allowed to animate.
 */
export function entranceLayer(
  event: EntranceEventName,
  motion: EntranceMotion,
  {
    delay,
    duration,
    ease,
    grow,
    mark,
    names,
  }: {
    delay: number;
    duration: number;
    ease?: string;
    /** Required by, and only legal on, `grow`. See `GrowFrom`. */
    grow?: GrowFrom;
    /**
     * THIS LAYER IS ONE OF THE READINGS THE ARGUMENT IS ABOUT, under this name — unique in the page.
     *
     * Stated on ANY motion, not only on `grow`, and that generality was forced by the video rather
     * than invented: `video-population-growth-dumbbell` and `vidy-boxplot-co2-by-continent` both
     * reveal their marks by FADING each one in on its own clock, in the argument's order, because a
     * dumbbell's mark is a range between two dots and a box's is five numbers — neither is a length
     * that can grow from a baseline. That is still a per-mark reveal and it still has to be
     * measured; what changes is which reading measures it (its own opacity rather than its own
     * painted extent), and the clause that refuses "everything on one clock" is the same either way.
     *
     * It is what pairs this mark with any layer gated on its arrival — its own dot, its own value
     * label — so the label rule can be DRIVEN in a browser: an instrument that only knows "some
     * label is visible and some mark is still arriving" cannot tell a cascade from a defect, because
     * in a cascade the first row's label is legitimately painted while the last row's mark has not
     * started.
     *
     * OPTIONAL on a `grow`, because a length that arrives is not always a DATUM: a lollipop's zero
     * baseline is laid down exactly the way a stem is, and it is the reference the stems are
     * measured AGAINST. The instrument's "no frame shows the marks all equal" clause is computed
     * over exactly the named set, so putting the baseline in it would be comparing a rule against
     * the values it measures. It is NOT optional for a `grow` on the `reveal` event — that is where
     * the data arrives, and a nameless mark there would be a datum quietly outside every check.
     */
    mark?: string;
    /** The mark whose arrival this layer is gated on, if it is a label or a dot rather than a mark
     *  itself. Only legal on a layer that is not itself a mark. */
    names?: string;
  } = { delay: 0, duration: 0 },
): {
  attrs: {
    "data-entrance": EntranceEventName;
    "data-entrance-motion": EntranceMotion;
    "data-entrance-key"?: string;
    "data-entrance-label"?: string;
  };
  vars: Record<string, string>;
} {
  // Fail loud rather than emit a layer that animates to nothing. A `grow` with no axis and no
  // baseline renders as `scale(1, 1)` — a mark that is fully drawn from the first millisecond and
  // then "animates" to itself, which is the one defect this motion exists to make impossible and
  // the one every clause of the driven guard would report green on.
  if ((motion === "grow") !== (grow !== undefined))
    throw new Error(
      motion === "grow"
        ? `a grow layer must state its own axis, baseline and key — ${event} states none`
        : `a ${motion} layer may not state a grow baseline; only grow scales about one`,
    );
  if (mark !== undefined && names !== undefined)
    throw new Error(
      `a mark cannot also be a label: ${mark} names ${names}. A layer either IS a reading or ` +
        `STATES one`,
    );
  // The data arrives on `reveal`, and every reading that arrives there has to be inside the
  // instrument that checks no intermediate frame states something false about them. A nameless grow
  // is legal elsewhere (a reference rule being laid down), never here.
  if ((grow || motion === "pop") && event === "reveal" && mark === undefined)
    throw new Error(
      `a ${motion} mark on the reveal is one of the readings the argument is about and must carry ` +
        `its own name — without one it is outside every per-mark check`,
    );
  return {
    attrs: {
      "data-entrance": event,
      "data-entrance-motion": motion,
      // Emitted only when present, so a beat that declares no cascade ships no trace of one — the
      // same "declared or absent" rule the entrance's own CSS is gated by.
      ...(mark !== undefined ? { "data-entrance-key": mark } : {}),
      ...(names !== undefined ? { "data-entrance-label": names } : {}),
    },
    vars: {
      // `--e-delay` and `--e-dur` stay FIRST and adjacent: the markup guard reads the pair out of a
      // rendered `style` attribute with one regex, and React writes a style object in its own
      // insertion order.
      "--e-delay": `${Math.round(delay)}ms`,
      "--e-dur": `${Math.round(duration)}ms`,
      "--e-ease": ease ?? ENTRANCE_EASING.LINEAR,
      ...(grow
        ? {
            "--e-sx": grow.axis === "y" ? "1" : "0",
            "--e-sy": grow.axis === "y" ? "0" : "1",
            "--e-ox": `${grow.origin.x}px`,
            "--e-oy": `${grow.origin.y}px`,
          }
        : {}),
    },
  };
}

export function entranceClipId(scope: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < scope.length; i++) {
    hash ^= scope.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `entrance-reveal-${hash.toString(36)}`;
}
