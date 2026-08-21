/**
 * THE ENTRANCE CONTRACT — the one object a journalist edits to retime a web beat's arrival.
 *
 * WHAT THIS IS A COPY OF, AND WHY IT IS A COPY. `chart-video/assets/timing.ts` already knows
 * how a chart arrives: six events named editorially, in a fixed order, each begun only once the one
 * before it has finished. The owner was asked what style the web entrance should be and answered
 * *"dans le même style que la vidéo"* — the same idiom as the video. So this file carries the
 * video's vocabulary rather than inventing a second one, and the web format replays the video's own
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
 *      number this format is held to, not a number read off an experiment: an entrance nobody watched
 *      to the end is a worse artifact than a static chart, so the whole build has to fit inside the
 *      time a reader spends arriving at a graphic. 2400ms is a judgement. It is enforced
 *      (`checkEntrance`, and again in a real browser by
 *      `splash/test/web-entrance-is-an-addition.test.ts`), and it is a knob.
 *
 * ── WHAT THIS FILE DOES NOT DECIDE ───────────────────────────────────────────────────────────
 *
 * The MECHANISM of a reveal belongs to the beat, not to the contract. A line's reveal is a head
 * advancing along its own path; a bar chart's is bars growing from their baseline; a pyramid's is
 * two rows meeting in the middle. The video format has exactly the same split — `timing.ts` holds the
 * edit, `EmissionsVideo.tsx` holds the drawing — and it is why neither file is parameterised into a
 * general animator. What the contract owns is WHEN each layer arrives and IN WHAT ORDER.
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
 * This format's own entrance. 2.03 seconds, against the video's 6.4.
 *
 * Read it as the edit, with its video ancestor beside each number (`CO2_TIMING`, 30fps):
 *
 * | event      | video           | here    | factor | why                                        |
 * | ---------- | --------------- | ------- | ------ | ------------------------------------------ |
 * | establish  | 26f = 867ms     | 290ms   | ÷3     | motion                                     |
 * | *gap*      | 6f = 200ms      | 40ms    | ÷5     | pause                                      |
 * | reference  | 22f = 733ms     | 240ms   | ÷3     | motion                                     |
 * | *gap*      | 18f = 600ms     | 120ms   | ÷5     | pause — and 120ms is this format's own unit |
 * | reveal     | 78f = 2600ms    | 870ms   | ÷3     | motion                                     |
 * | subject    | 18f = 600ms     | 200ms   | ÷3     | motion                                     |
 * | conclusion | 24f = 800ms     | 270ms   | ÷3     | motion                                     |
 * | hold       | 48f = 1600ms    | —       |        | the rest of the page's life (change 1)     |
 *
 * The second gap is 120ms and not 200ms because 120ms is already this format's transition unit —
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
 * NOT decoration. This format's whole delivery model is an embed: `renderWeb` writes one
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
/** The three motions the shared stylesheet defines. See `render-web.mjs`'s `entranceCss` for what
 *  each one is for and why there are exactly three. */
export type EntranceMotion = "fade" | "wipe" | "land";

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
  { delay, duration, ease }: { delay: number; duration: number; ease?: string },
): {
  attrs: {
    "data-entrance": EntranceEventName;
    "data-entrance-motion": EntranceMotion;
  };
  vars: Record<string, string>;
} {
  return {
    attrs: { "data-entrance": event, "data-entrance-motion": motion },
    vars: {
      "--e-delay": `${Math.round(delay)}ms`,
      "--e-dur": `${Math.round(duration)}ms`,
      "--e-ease": ease ?? ENTRANCE_EASING.LINEAR,
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
