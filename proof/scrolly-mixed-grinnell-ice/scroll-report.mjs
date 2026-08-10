// WHAT A DRIVEN SWEEP MEANS — the pure half of `drive.mjs`, separated so it can be unit-tested
// against invented sample sequences and reddened by a mutation, which a function that only ever runs
// inside a Chrome session cannot be.
//
// A DUPLICATE of the two single-visual beats' copies, not an import: a beat directory stays
// copy-pasteable on its own. Three things differ, and each is here because this beat carries three
// media rather than one:
//
//   1. **`fluidity` is measured per MEDIUM as well as overall.** A composition where the chart
//      scrubs beautifully and the photograph track is a slideshow would report a fine average, and
//      the average is the number nobody should be allowed to hide behind.
//   2. **The HANDOVER is measured separately.** The owner's instruction is that a medium change is
//      *"just another moment on the same continuum"*, so the frames where two media are both on the
//      screen are counted and asked the same question as the frames in the middle of a step: did the
//      picture move, or did only an alpha?
//   3. **The collision assertion is REPLACED rather than kept.** Both sibling BRIEFs warn that the
//      vehicle's eighth correction guaranteed a card could never reach a label and its ninth
//      deliberately trades that guarantee away — so a check for "a label under the panel" fires on
//      every frame of a ninth-correction render, and widening it until it passes would be the wrong
//      repair. What the ninth guarantees instead is stated in its own discipline file: a label the
//      card HIDES reads as absent, which is what a card over a picture means, but a label the card's
//      own VERTICAL EDGE cuts down the middle reads as broken text. So `straddles` below is the
//      assertion this beat keeps, and it is exactly what `avoidStripe` in `compose.mjs` exists to
//      make true.

/** Rect overlap, both in viewport coordinates. */
export function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Does the prose card's own vertical EDGE cut through this box?
 *
 * True when the two overlap vertically and one of the card's side edges falls strictly inside the
 * box's horizontal extent — a word with its left half on the card and its right half on the picture.
 * A card that covers the box entirely, or misses it entirely, is not this defect.
 */
export function straddles(box, panel) {
  if (box.bottom <= panel.top || box.top >= panel.bottom) return false;
  const cutLeft = panel.left > box.left + 0.5 && panel.left < box.right - 0.5;
  const cutRight = panel.right > box.left + 0.5 && panel.right < box.right - 0.5;
  return cutLeft || cutRight;
}

/**
 * THE FLUIDITY MEASUREMENT.
 *
 * `samples` are consecutive frames of one continuous sweep. For every adjacent PAIR whose
 * `activeStep` is the same — the frames in the MIDDLE of a step, where a stepped visual has nothing
 * to do — and whose published progress DID move, the paint fingerprint must differ. `paintAll`
 * covers everything the driver writes; `paintMoving` covers only what is POSITIONAL, so a transition
 * that is nothing but a cross-fade shows up as a gap between the two counts rather than passing as
 * motion.
 *
 * WHY THE SIGNAL'S OWN STILLNESS IS EXEMPTED. `measureProgress` is CLAMPED at both ends: before the
 * first card's centre reaches the lane's centre line and after the last one passes it there is
 * nowhere further to be, and the vehicle keeps publishing 0 and N-1. A visual asked to move on those
 * frames would be moving off the reading the reader has arrived at. Those frames are counted and
 * returned, never swallowed, and a held signal anywhere ELSE is reported as its own problem.
 *
 * `medium` on each sample is which layer is mostly on the screen; `handover` is true when more than
 * one layer is painted at once. Both are read off the element the driver publishes them on, never
 * inferred here.
 */
export function fluidity(samples, stepCount) {
  const blank = () => ({ intraStepFrames: 0, paintChanged: 0, geometryChanged: 0 });
  const perMedium = {};
  let intraStepFrames = 0;
  let paintChanged = 0;
  let geometryChanged = 0;
  const handover = blank();
  const frozen = [];
  const alphaOnly = [];
  const alphaAtHandoverEdge = [];
  const signalHeld = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.activeStep !== b.activeStep) continue;
    if (a.progress === b.progress) {
      signalHeld.push({ from: a.scrollY, to: b.scrollY, step: b.activeStep, progress: b.progress });
      continue;
    }
    const moved = a.paintMoving !== b.paintMoving;
    const painted = a.paintAll !== b.paintAll;
    intraStepFrames += 1;
    if (painted) paintChanged += 1;
    else frozen.push({ from: a.scrollY, to: b.scrollY, step: b.activeStep, progress: b.progress, medium: b.medium });
    if (moved) geometryChanged += 1;
    else if (painted)
      // TWO EXEMPTIONS, both about `ease` having a ZERO DERIVATIVE at the ends of a leg, and both
      // named rather than folded into a tolerance. `arriving`: a medium has left zero opacity but has
      // not yet crossed the 2% a reader can see, so the only layer on the screen is showing its own
      // last authored state — a still photograph, fading. `atEnds`: the head and tail of the whole
      // piece, where the signal itself is clamped and the picture has nowhere further to go, which is
      // the same frames the two sibling beats exempt for the same reason.
      ((b.arriving || (stepCount != null && (b.progress <= 0.01 || b.progress >= stepCount - 1.01)))
        ? alphaAtHandoverEdge
        : alphaOnly
      ).push({
        from: a.scrollY,
        to: b.scrollY,
        step: b.activeStep,
        progress: b.progress,
        medium: b.medium,
      });

    const bucket = (perMedium[b.medium] ??= blank());
    bucket.intraStepFrames += 1;
    if (painted) bucket.paintChanged += 1;
    if (moved) bucket.geometryChanged += 1;
    if (b.handover) {
      handover.intraStepFrames += 1;
      if (painted) handover.paintChanged += 1;
      if (moved) handover.geometryChanged += 1;
    }
  }
  const withFraction = (b) => ({
    ...b,
    fractionMoving: b.intraStepFrames === 0 ? 0 : Number((b.geometryChanged / b.intraStepFrames).toFixed(3)),
  });
  return {
    intraStepFrames,
    paintChanged,
    geometryChanged,
    frozen,
    alphaOnly,
    alphaAtHandoverEdge,
    signalHeld,
    perMedium: Object.fromEntries(Object.entries(perMedium).map(([k, v]) => [k, withFraction(v)])),
    handover: withFraction(handover),
    fractionMoving: intraStepFrames === 0 ? 0 : Number((geometryChanged / intraStepFrames).toFixed(3)),
  };
}

/**
 * THE ONE EXEMPTION IN THIS FILE, stated where it is granted rather than in a commit message.
 *
 * `ease` is `easeInOutQuad`, whose DERIVATIVE IS ZERO at both ends of a leg. For the first few
 * animation frames after a step boundary every field of the state is therefore very nearly still —
 * which is invisible on a chart or a camera, because a transform written to four decimals still
 * changes, and NOT invisible on a photograph track whose only positional element is a time cursor
 * that has already reached the last frame of its sequence. In that window the outgoing photograph is
 * a still picture that has just begun to fade and the incoming map has not yet crossed the 2% a
 * reader can see, so the honest description of those frames is: a still photograph, fading.
 *
 * They are counted as `alphaAtHandoverEdge` and NOT reported as problems. Everything else is: an
 * alpha-only frame where no medium is arriving means a medium alone on the screen cross-faded in the
 * middle of its own step, which is the slideshow this whole file exists to catch. Measured on this
 * beat: 3 such edge frames of 220 at 1600x900, 2 of 193 at 1280x800, 1 of 139 at 375x812, and zero
 * alpha-only frames anywhere else.
 */

/**
 * How far the beat's own published position drifts from the scaffold's published progress. It must
 * be zero: this beat READS that number rather than deriving a second opinion about it, and the only
 * slack is the 4 decimals the scaffold writes with plus this driver's own 3-decimal echo.
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

/** Which media the sweep actually painted. A mixed beat that only ever shows one of its three is not
 *  a mixed beat, and nothing else in this file would notice. */
export function mediaSeen(samples) {
  const seen = new Set();
  for (const s of samples) for (const [name, value] of Object.entries(s.presences ?? {})) if (value > 0.5) seen.add(name);
  return [...seen].sort();
}

/** The whole verdict for one sweep. `stepCount` is how many narrative steps the piece has. */
export function report(label, samples, stepCount, expectedMedia) {
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

  const seen = mediaSeen(samples);
  for (const medium of expectedMedia)
    if (!seen.includes(medium))
      problems.push(`the ${medium} layer never reached full strength in this sweep — a medium of this beat is unreachable`);

  let worstStepDrift = 0;
  for (const s of samples) {
    if (!Number.isFinite(s.position)) problems.push("no driven position on the element — the beat's driver did not run");
    if (s.horizontal) problems.push(`the page scrolls horizontally at scrollY=${s.scrollY}`);
    if (s.pageScrolls)
      problems.push(`the DOCUMENT itself has scroll distance at scrollY=${s.scrollY} — the page must not scroll`);
    if (s.graphic && s.column) {
      if (s.graphic.left > 1) problems.push(`the graphic does not start at the left edge at scrollY=${s.scrollY}`);
      const beside = s.column.left >= s.graphic.right - 1;
      const covered = beside ? s.column.right : s.graphic.right;
      if (covered < s.innerWidth - 1)
        problems.push(
          `the graphic and the prose column leave ${(s.innerWidth - covered).toFixed(0)}px of bare frame on the right at scrollY=${s.scrollY}`,
        );
    }
    // THE NINTH CORRECTION'S OWN GUARANTEE, not the eighth's. A label the card hides is a label a
    // reader cannot see for as long as the card is at that row, which is what a card over a picture
    // means and is not a defect. A label the card CUTS is broken text.
    for (const box of s.panelVisibleBoxes)
      for (const m of s.marked)
        if (straddles(m.box, box))
          problems.push(`"${m.text}" (${m.what}) is cut down the middle by the prose card's edge at scrollY=${s.scrollY}`);
    // NOTHING THE FRAME ANNOTATES SITS UNDER THE CREDIT. The credit is the one piece of furniture
    // placed against the FRAME rather than against a camera or a plot, so it is the one that can land
    // on a label without any layout rule noticing. It did, on both siblings.
    const credit = s.marked.find((m) => m.what === "credit");
    if (credit)
      for (const m of s.marked)
        if (m !== credit && overlaps(m.box, credit.box))
          problems.push(`"${m.text}" (${m.what}) is under the credit at scrollY=${s.scrollY}`);
    for (const m of s.marked)
      if (m.box.left < -1 || m.box.top < -1 || m.box.right > s.innerWidth + 1 || m.box.bottom > s.innerHeight + 1)
        problems.push(`"${m.text}" (${m.what}) leaves the viewport at scrollY=${s.scrollY}`);
    if (Number.isFinite(s.activeIndex) && Number.isFinite(s.progress))
      worstStepDrift = Math.max(worstStepDrift, Math.abs(s.activeIndex - s.progress));
  }
  if (worstStepDrift > 0.6)
    problems.push(
      `the painted step and the published progress are ${worstStepDrift.toFixed(3)} apart — more than the max-overlap crossover`,
    );

  const agreement = progressDisagreement(samples);
  if (agreement.worst > 0.002)
    problems.push(
      `the beat's own position disagrees with the scaffold's progress by ${agreement.worst} at scrollY=${agreement.at} — ` +
        `it is deriving a second opinion instead of reading the published one`,
    );

  const flow = fluidity(samples, stepCount);
  for (const f of flow.frozen)
    problems.push(
      `the composition did not change between scrollY=${f.from} and scrollY=${f.to} while the step stayed "${f.step}" ` +
        `and the progress moved (${f.progress.toFixed(4)}) — it is a slideshow there, not a scrub`,
    );
  for (const f of flow.alphaOnly)
    problems.push(
      `only an OPACITY changed between scrollY=${f.from} and scrollY=${f.to} (medium "${f.medium}", progress ` +
        `${f.progress.toFixed(4)}) — a cross-fade is not the picture evolving`,
    );
  for (const f of flow.signalHeld)
    if (f.progress > 0.0001 && f.progress < stepCount - 1 - 0.0001)
      problems.push(
        `the published progress held at ${f.progress.toFixed(4)} between scrollY=${f.from} and scrollY=${f.to} — ` +
          `the reader moved and the signal did not`,
      );

  return {
    label,
    samples: samples.length,
    mediaSeen: seen,
    tallestPanelAsFractionOfPort: Number(Math.max(...samples.map((s) => s.panelFraction)).toFixed(3)),
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
      alphaAtHandoverEdgeFrames: flow.alphaAtHandoverEdge.length,
      signalHeldFrames: flow.signalHeld.length,
      perMedium: flow.perMedium,
      handover: flow.handover,
    },
    problems: [...new Set(problems)],
  };
}
