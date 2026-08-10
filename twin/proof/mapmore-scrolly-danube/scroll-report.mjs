// WHAT A DRIVEN SWEEP MEANS — the pure half of `drive.mjs`, separated so it can be unit-tested
// against invented sample sequences and reddened by a mutation, which a function that only ever runs
// inside a Chrome session cannot be.
//
// A DUPLICATE of the sibling one-map beat's copy, not an import: a beat directory stays
// copy-pasteable on its own (`twin-doctrine`, and `no-cross-skill-imports.test.ts` for the skills).
// What differs between the two copies is only what a `paint` fingerprint is taken over — a camera
// transform and its labels there, a growing line and nine arriving territories here.
//
// THE ASSERTION THIS FILE EXISTS FOR. Every guard the previous round of scrolly beats had was about
// ARRIVAL: does the right frame show up, is the right panel painted, does nothing overlap. All of
// them are satisfied by a visual that jumps between four stills, because they only ever look at a
// settled state — and this beat WAS four stills, SSR'd and swapped by opacity. `fluidity` below asks
// the opposite question: BETWEEN two arrivals, on the frames where the active step does not change,
// does the picture change? For this beat that question has a specific subject, and it is not the
// camera (which never moves, by design): it is whether the LINE grows and the territories arrive
// continuously, or whether the reader is shown four fixed pictures with a cross-fade between them.
// `paintMoving` is taken over the geometry — the camera transform, the route's dash offset, every
// badge's offset, the leader path — and `paintAll` over that plus every opacity, so a reveal that is
// nothing but a cross-fade shows up as a GAP between the two counts rather than passing as motion.

/** Rect overlap, both in viewport coordinates. */
export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * THE FLUIDITY MEASUREMENT.
 *
 * `samples` are consecutive frames of one continuous sweep. For every adjacent PAIR whose
 * `activeStep` is the same — the frames in the MIDDLE of a step, where a stepped visual has nothing
 * to do — and whose published progress DID move, the paint fingerprint must differ.
 *
 * WHY THE SIGNAL'S OWN STILLNESS IS EXEMPTED, and why that is not the guard being softened to fit.
 * The vehicle's `measureProgress` is CLAMPED at both ends: before the first card's centre reaches
 * the lane's centre line, and after the last one passes it, there is nowhere further along the piece
 * to be, and it keeps publishing 0 and N-1. A visual asked to move on those frames would be moving
 * off the reading the reader has arrived at. So the rule is the conditional one — *when the signal
 * moves and the step does not, the picture must move*. Those held frames are counted and returned,
 * not swallowed, and a HELD frame anywhere but at the two ends is itself reported by `report` below,
 * because that would be the vehicle going quiet mid-piece.
 *
 * Returns counts and the offending frames; the caller decides what is a problem, so this function
 * stays a measurement.
 */
export function fluidity(samples) {
  let intraStepFrames = 0;
  let paintChanged = 0;
  let geometryChanged = 0;
  const frozen = [];
  const alphaOnly = [];
  const signalHeld = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.activeStep !== b.activeStep) continue;
    if (a.progress === b.progress) {
      signalHeld.push({ from: a.scrollY, to: b.scrollY, step: b.activeStep, progress: b.progress });
      continue;
    }
    intraStepFrames += 1;
    if (a.paintAll !== b.paintAll) paintChanged += 1;
    else frozen.push({ from: a.scrollY, to: b.scrollY, step: b.activeStep, progress: b.progress });
    if (a.paintMoving !== b.paintMoving) geometryChanged += 1;
    else if (a.paintAll !== b.paintAll)
      alphaOnly.push({ from: a.scrollY, to: b.scrollY, step: b.activeStep, progress: b.progress });
  }
  return {
    intraStepFrames,
    paintChanged,
    geometryChanged,
    frozen,
    alphaOnly,
    signalHeld,
    fractionMoving:
      intraStepFrames === 0 ? 0 : Number((geometryChanged / intraStepFrames).toFixed(3)),
  };
}

/**
 * HOW MUCH OF THE ROUTE THE READER ACTUALLY SAW ARRIVE.
 *
 * `fluidity` proves the picture is never still while the signal moves. It does NOT prove the thing
 * that moves is the thing the beat is about: a page whose badges jitter by a pixel and whose line
 * never grows would satisfy it. This beat's whole claim is that the line advances with the reader,
 * so the driven `fraction` — the share of the route's own length that has been drawn, published by
 * the driver — is checked for itself: it must span essentially the whole piece, and it must be
 * MONOTONE in the direction of travel, because "the map only ever gains ground" is the beat's own
 * anti-pattern list and a reveal that goes backwards mid-step is that defect.
 */
export function revealSpan(samples, down) {
  const values = samples.map((s) => (s.state ? s.state.fraction : Number.NaN)).filter(Number.isFinite);
  if (values.length === 0) return { span: null, worstBacktrack: null, frames: 0 };
  let worst = 0;
  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    const backwards = down ? -delta : delta;
    if (backwards > worst) worst = backwards;
  }
  return {
    span: [Number(values[0].toFixed(4)), Number(values[values.length - 1].toFixed(4))],
    reached: Number((Math.max(...values) - Math.min(...values)).toFixed(4)),
    worstBacktrack: Number(worst.toFixed(4)),
    frames: values.length,
  };
}

/**
 * How far the beat's own published position drifts from the scaffold's published progress. It must
 * be zero: this beat READS that number rather than deriving a second opinion about it, and the only
 * slack is the 4 decimals the scaffold writes it with plus this driver's own 3-decimal echo.
 */
export function progressDisagreement(samples) {
  let worst = 0;
  let at = null;
  for (const s of samples) {
    if (!Number.isFinite(s.position) || !Number.isFinite(s.progress)) continue;
    const d = Math.abs(s.position - s.progress);
    if (d > worst) {
      worst = d;
      at = s.scrollY;
    }
  }
  return { worst: Number(worst.toFixed(4)), at };
}

// ── THE DRAWN LINE'S OWN WEIGHT ────────────────────────────────────────────────────────────────
//
// WHY THIS IS MEASURED IN PIXELS AND NOT READ OFF THE MARKUP. The owner drove the keyed copy of
// this beat and said *"la ligne de fleuve ne se dessine pas bien."* The markup was blameless:
// `stroke-width="3.5"` with `vector-effect="non-scaling-stroke"`, and a comment beside it saying in
// so many words that the stroke was therefore in screen pixels. Measured over the DRAWN pixels of
// the delivered page, the accent line was **6 px at 1600 × 900, 5 px at 1280 × 800 and 1 px at
// 375 × 812** — the contain fit (1.778 / 1.422 / 0.417) multiplying the declared width, because
// `non-scaling-stroke` compensates for the viewBox transform (the identity here) and not for the
// CSS `scale()` on the ancestor camera box. **A guard that asserted the attribute would have been
// green throughout**, which is the same trap the mixed-media beat's park outline fell into at
// 0.09 px. So this takes a number off the screenshot.
//
// TWO ASSERTIONS, and the second is the one that names the defect class:
//   1. the drawn width sits in a band a river can be read at, at every width;
//   2. the drawn widths AGREE ACROSS WIDTHS. A stroke that tracks the camera cannot pass this one
//      even if some single width happens to land inside the band.

/** The band, in SCREEN pixels, and the spread allowed between widths. */
export const DRAWN_LINE_PX = { floor: 2, ceiling: 5, spread: 1.5 };

/**
 * The verdict on a set of measured line weights.
 *
 * `measured` is one entry per driven width: `{ label, drawnWidthPx, samples, rejected }`, where
 * `drawnWidthPx` is the median of the accent coverage integrated across the line's own
 * perpendicular, at points sampled along its geometry — i.e. its thickness in screen pixels, to
 * sub-pixel resolution — and `null` when too few scans of the shot were usable. A null is a
 * PROBLEM, not a pass: an unmeasurable line is one of the failure modes this exists to catch.
 */
export function lineWeight(measured, band = DRAWN_LINE_PX) {
  const problems = [];
  if (measured.length === 0) return { problems: ["no width was measured at all"], widths: [] };
  for (const m of measured) {
    if (!Number.isFinite(m.drawnWidthPx)) {
      problems.push(
        `${m.label}: the drawn accent line could not be measured (${m.samples ?? 0} usable scans, ` +
          `${m.rejected ?? 0} rejected) — a line the perpendicular cannot find is a line a reader cannot follow`,
      );
      continue;
    }
    if (m.drawnWidthPx < band.floor)
      problems.push(
        `${m.label}: the river draws at ${m.drawnWidthPx.toFixed(2)}px, under the ${band.floor}px floor — a hairline`,
      );
    if (m.drawnWidthPx > band.ceiling)
      problems.push(
        `${m.label}: the river draws at ${m.drawnWidthPx.toFixed(2)}px, over the ${band.ceiling}px ceiling — ` +
          `a pipe that swallows its own meanders`,
      );
  }
  const values = measured.map((m) => m.drawnWidthPx).filter(Number.isFinite);
  if (values.length > 1) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (hi - lo > band.spread)
      problems.push(
        `the river draws ${lo.toFixed(2)}px at one width and ${hi.toFixed(2)}px at another ` +
          `(spread ${(hi - lo).toFixed(2)}px, allowed ${band.spread}px) — the stroke is tracking the camera's ` +
          `scale instead of the screen`,
      );
  }
  return {
    problems,
    widths: measured.map((m) => ({
      label: m.label,
      drawnWidthPx: Number.isFinite(m.drawnWidthPx) ? Number(m.drawnWidthPx.toFixed(2)) : null,
      samples: m.samples ?? 0,
      rejected: m.rejected ?? 0,
    })),
  };
}

/** The whole verdict for one sweep. `stepCount` is how many narrative steps the piece has. */
export function report(label, samples, stepCount) {
  const problems = [];
  const down = label.endsWith("down");

  const progresses = samples.map((s) => s.progress);
  for (let i = 1; i < progresses.length; i++) {
    const delta = progresses[i] - progresses[i - 1];
    if (down && delta < -0.02)
      problems.push(
        `progress went BACKWARDS while scrolling down: ${progresses[i - 1].toFixed(3)} -> ${progresses[i].toFixed(3)}`,
      );
    if (!down && delta > 0.02)
      problems.push(
        `progress went FORWARDS while scrolling up: ${progresses[i - 1].toFixed(3)} -> ${progresses[i].toFixed(3)}`,
      );
  }

  const span = [progresses[0], progresses[progresses.length - 1]];
  const reached = Math.max(...progresses) - Math.min(...progresses);
  if (reached < stepCount - 1 - 0.05)
    problems.push(
      `the sweep only covered ${reached.toFixed(3)} of the ${stepCount - 1} the piece has — a step is unreachable`,
    );

  let worstStepDrift = 0;
  for (const s of samples) {
    if (!Number.isFinite(s.position))
      problems.push("no driven position on the element — the beat's driver did not run");
    if (s.horizontal) problems.push(`the page scrolls horizontally at scrollY=${s.scrollY}`);
    if (s.pageScrolls)
      problems.push(
        `the DOCUMENT itself has scroll distance at scrollY=${s.scrollY} — the page must not scroll`,
      );
    // THE GRAPHIC FILLS WHAT IS LEFT OF THE FRAME. What is true of the GENRE, in every arrangement
    // it has had, is that the graphic starts at the frame's left edge and that the frame is covered
    // to its right edge — by the graphic alone, or by the graphic and the column beside it. Whether
    // a panel is painted OVER the graphic is not a layout question at all; it is the collision check
    // below, which is the thing a reader actually suffers from and which holds either way.
    if (s.graphic && s.column) {
      if (s.graphic.left > 1)
        problems.push(`the graphic does not start at the left edge at scrollY=${s.scrollY}`);
      const beside = s.column.left >= s.graphic.right - 1;
      const covered = beside ? s.column.right : s.graphic.right;
      if (covered < s.innerWidth - 1)
        problems.push(
          `the graphic and the prose column leave ${(s.innerWidth - covered).toFixed(0)}px of bare frame ` +
            `on the right at scrollY=${s.scrollY}`,
        );
    }
    // WHAT THE CARD MAY DO TO A BADGE. The vehicle's ninth correction deliberately trades away "the
    // two never meet" and states the successor guarantee in the terms it measured —
    //
    //   "A label sitting under the card reads as absent, which is what a card over a picture means.
    //    A label the card's own VERTICAL edge cuts down the middle reads as broken text, and stays
    //    broken for every frame the card spends at that row."
    //
    // So covered-whole is allowed and SLICED is not. It bites harder on this beat than on its
    // sibling: the camera is FIXED, so a badge that straddles a card edge straddles it at every
    // scroll position rather than at a few, and `route-drive.mjs`'s `avoidStripe` is what keeps
    // that from being a permanent defect rather than an intermittent one.
    for (const box of s.panelVisibleBoxes)
      for (const m of s.marked) {
        if (!overlaps(m.box, box)) continue;
        const slicedLeft = box.left > m.box.left + 0.5 && box.left < m.box.right - 0.5;
        const slicedRight = box.right > m.box.left + 0.5 && box.right < m.box.right - 0.5;
        if (slicedLeft || slicedRight)
          problems.push(
            `"${m.text}" (${m.what}) is cut down its side by the prose card's vertical edge at ` +
              `scrollY=${s.scrollY} — covered whole is allowed, sliced is not`,
          );
      }
    // NOTHING THE FRAME ANNOTATES SITS UNDER THE CREDIT. The credit is the one piece of furniture
    // placed against the FRAME rather than against the camera, so it is the one that can land on top
    // of a badge without any layout rule noticing.
    const credit = s.marked.find((m) => m.what === "credit");
    if (credit)
      for (const m of s.marked)
        if (m !== credit && overlaps(m.box, credit.box))
          problems.push(`"${m.text}" (${m.what}) is under the credit at scrollY=${s.scrollY}`);
    for (const m of s.marked)
      if (
        m.box.left < -1 ||
        m.box.top < -1 ||
        m.box.right > s.innerWidth + 1 ||
        m.box.bottom > s.innerHeight + 1
      )
        problems.push(`"${m.text}" (${m.what}) leaves the viewport at scrollY=${s.scrollY}`);
    if (Number.isFinite(s.activeIndex) && Number.isFinite(s.progress))
      worstStepDrift = Math.max(worstStepDrift, Math.abs(s.activeIndex - s.progress));
  }
  // The vehicle's own H check: `pickActiveStep` and `measureProgress` are in lock-step by
  // construction, and the crossover itself is the whole of the allowed gap.
  if (worstStepDrift > 0.6)
    problems.push(
      `the painted step and the published progress are ${worstStepDrift.toFixed(3)} apart — more than the ` +
        `max-overlap crossover`,
    );

  const agreement = progressDisagreement(samples);
  if (agreement.worst > 0.002)
    problems.push(
      `the beat's own position disagrees with the scaffold's progress by ${agreement.worst} at ` +
        `scrollY=${agreement.at} — it is deriving a second opinion instead of reading the published one`,
    );

  const flow = fluidity(samples);
  for (const f of flow.frozen)
    problems.push(
      `the visual did not change between scrollY=${f.from} and scrollY=${f.to} while the step stayed ` +
        `"${f.step}" and the progress moved (${f.progress.toFixed(4)}) — it is a slideshow there, not a scrub`,
    );
  // A held signal is legitimate only at the two clamped ends of the piece. Anywhere else it means
  // the reader scrolled and the vehicle published nothing new, which no consumer can recover from.
  for (const f of flow.signalHeld)
    if (f.progress > 0.0001 && f.progress < stepCount - 1 - 0.0001)
      problems.push(
        `the published progress held at ${f.progress.toFixed(4)} between scrollY=${f.from} and ` +
          `scrollY=${f.to} — the reader moved and the signal did not`,
      );

  // THE REVEAL ITSELF, not merely "something moved". `fluidity` cannot tell a growing river from a
  // jittering badge; this can.
  const reveal = revealSpan(samples, down);
  if (reveal.frames === 0) problems.push("the driver published no reveal state at all");
  else {
    if (reveal.worstBacktrack > 0.002)
      problems.push(
        `the revealed route went BACKWARDS by ${reveal.worstBacktrack} of its length while scrolling ` +
          `${down ? "down" : "up"} — this beat only ever gains ground`,
      );
    // The route is revealed from its first step's own cutoff (index 371 of 910, 34% of the length)
    // to its end, so the share a full sweep must cover is what is left, not the whole line.
    if (reveal.reached < 0.5)
      problems.push(
        `a whole sweep only revealed ${(reveal.reached * 100).toFixed(1)}% more of the route — the line ` +
          `is not advancing with the reader`,
      );
  }

  return {
    label,
    samples: samples.length,
    tallestPanelAsFractionOfPort: Number(
      Math.max(...samples.map((s) => s.panelFraction)).toFixed(3),
    ),
    portHeight: samples[0]?.portHeight ?? null,
    span,
    worstStepDrift: Number(worstStepDrift.toFixed(3)),
    progressDisagreement: agreement,
    reveal,
    fluidity: {
      intraStepFrames: flow.intraStepFrames,
      paintChanged: flow.paintChanged,
      geometryChanged: flow.geometryChanged,
      fractionMoving: flow.fractionMoving,
      alphaOnlyFrames: flow.alphaOnly.length,
      // The clamped head and tail of the piece — the frames where the signal itself has nowhere
      // further to go. Reported so the exemption is a number a reader of this file can check.
      signalHeldFrames: flow.signalHeld.length,
    },
    problems: [...new Set(problems)],
  };
}
