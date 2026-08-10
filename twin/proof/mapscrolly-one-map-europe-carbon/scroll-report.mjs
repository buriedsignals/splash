// WHAT A DRIVEN SWEEP MEANS — the pure half of `drive.mjs`, separated so it can be unit-tested
// against invented sample sequences and reddened by a mutation, which a function that only ever runs
// inside a Chrome session cannot be.
//
// A DUPLICATE of the sibling one-map beat's copy, not an import: a beat directory stays
// copy-pasteable on its own (`twin-doctrine`, and `no-cross-skill-imports.test.ts` for the skills).
// What differs between the two copies is only what a `paint` fingerprint is taken over — a camera
// transform and its labels here, a chart's polylines and ticks there.
//
// THE ASSERTION THIS FILE EXISTS FOR, and it is the one whose absence let a slideshow ship. Every
// guard the previous round had was about ARRIVAL: does the right frame show up, is the right panel
// painted, does nothing overlap. All of them are satisfied by a visual that jumps between four
// stills, because they only ever look at a settled state. `fluidity` below asks the opposite
// question — BETWEEN two arrivals, on the frames where the active step does not change, does the
// picture change? — and that is the difference between fluid and stepped.

/** Rect overlap, both in viewport coordinates. */
export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * THE FLUIDITY MEASUREMENT.
 *
 * `samples` are consecutive frames of one continuous sweep. For every adjacent PAIR whose
 * `activeStep` is the same — the frames in the MIDDLE of a step, where a stepped visual has nothing
 * to do — and whose published progress DID move, the paint fingerprint must differ. `paintAll`
 * covers everything the driver writes; `paintMoving` covers only what is positional (points,
 * transforms, offsets, leader paths), so a transition that is nothing but a cross-fade is visible as a
 * gap between the two counts rather than passing as motion.
 *
 * WHY THE SIGNAL'S OWN STILLNESS IS EXEMPTED, and why that is not the guard being softened to fit.
 * The vehicle's `measureProgress` is CLAMPED at both ends: before the first card's centre reaches
 * the lane's centre line, and after the last one passes it, there is nowhere further along the
 * piece to be, and it keeps publishing 0 and N-1. A visual asked to move on those frames would be
 * moving off the reading the reader has arrived at. So the rule is the conditional one — *when the
 * signal moves and the step does not, the picture must move* — which is strictly what the original
 * defect violated: progress ran a clean 0 → 3 while the picture sat on state 0. Those held frames
 * are counted and returned, not swallowed, and a HELD frame anywhere but at the two ends is itself
 * reported by `report` below, because that would be the vehicle going quiet mid-piece.
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
 * How far the beat's own published position drifts from the scaffold's published progress. It must
 * be zero: since this round the beat READS that number rather than deriving a second opinion about
 * it, and the only slack is the 4 decimals the scaffold writes it with plus this driver's own
 * 3-decimal echo.
 *
 * This single number is what the previous build could not have passed. Measured on the shipped file
 * at 1600x900 before the repair, the scaffold ran 0 → 3 while the beat's position sat at 0.000 for
 * seven probes of eleven: a disagreement of up to 3.0.
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
      `the sweep only covered ${reached.toFixed(3)} of the ${stepCount - 1} the piece has — a reading is unreachable`,
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
    // THE GRAPHIC FILLS WHAT IS LEFT OF THE FRAME, and this is deliberately NOT written as "full
    // width" any more. It was, and the vehicle's eighth correction gave the prose its own cell of
    // the track, so a correct build started failing an assertion about the old arrangement. It is
    // also not written as "the two never overlap": a NINTH correction is in flight at the time of
    // writing that puts the prose column back OVER the graphic as a full-frame layer, and an
    // assertion that encodes one correction's box model is an assertion that has to be rewritten by
    // whoever lands the next one. What is true of the GENRE, in every arrangement it has had, is
    // that the graphic starts at the frame's left edge and that the frame is covered to its right
    // edge — by the graphic alone, or by the graphic and the column beside it. Whether a panel is
    // painted OVER the graphic is not a layout question at all; it is the collision check below,
    // which is the thing a reader actually suffers from and which holds either way.
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
    // WHAT THE CARD MAY DO TO A LABEL, restated for the vehicle's NINTH correction — and this is a
    // replacement, not a widening. The eighth put the prose in its own cell, so a card could never
    // reach a label and the assertion here was "never overlaps". The ninth deliberately trades that
    // guarantee away: the card is centred and travels OVER the graphic, opaque, and its own
    // discipline file states the successor guarantee in the terms it measured —
    //
    //   "A label sitting under the card reads as absent, which is what a card over a picture means.
    //    A label the card's own VERTICAL edge cuts down the middle reads as broken text, and stays
    //    broken for every frame the card spends at that row."
    //
    // So covered-whole is allowed and SLICED is not: a label must be entirely clear of the card or
    // entirely inside it, never straddling one of its vertical edges. That is the property the
    // vehicle's own F4 asserts for the seed, applied here to what THIS frame annotates.
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
    // that is placed against the FRAME rather than against the plot or the camera, so it is the one
    // that can land on top of a label without any layout rule noticing. It did: anchored above the
    // prose lane it covered a map label outright at 375x812 and ran through the x-axis tick strip on
    // the chart. Anchored to the frame's own floor it clears both, and this says so on every frame
    // rather than on the two anybody happened to screenshot.
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
