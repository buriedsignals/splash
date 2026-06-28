export interface CameraSolution {
  center: [number, number];
  zoom: number;
}
export interface Phase {
  beatIndex: number;
  startFrame: number; // first frame of this phase's MOVE (or hold, for beat 0)
  holdFrames: number;
  moveFrames: number;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function buildTimeline(
  beatCount: number,
  fps: number,
  opts: {
    establishHold?: number;
    revealHold?: number;
    takeawayHold?: number;
    move?: number;
  } = {},
): { phases: Phase[]; totalFrames: number } {
  const establishHold = Math.round((opts.establishHold ?? 2.5) * fps);
  const revealHold = Math.round((opts.revealHold ?? 3) * fps);
  const takeawayHold = Math.round((opts.takeawayHold ?? 3) * fps);
  const move = Math.round((opts.move ?? 1.2) * fps);

  const phases: Phase[] = [];
  let cursor = 0;
  for (let i = 0; i < beatCount; i++) {
    const isFirst = i === 0;
    const isLast = i === beatCount - 1;
    const moveFrames = isFirst ? 0 : move;
    const holdFrames = isFirst
      ? establishHold
      : isLast
        ? takeawayHold
        : revealHold;
    phases.push({ beatIndex: i, startFrame: cursor, holdFrames, moveFrames });
    cursor += moveFrames + holdFrames;
  }
  return { phases, totalFrames: cursor };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function cameraForFrame(
  frame: number,
  phases: Phase[],
  solutions: CameraSolution[],
): { camera: CameraSolution; beatIndex: number; fillReveal: number } {
  // Find the active phase (last phase whose startFrame <= frame).
  let p = phases[0];
  for (const phase of phases) if (frame >= phase.startFrame) p = phase;

  const i = p.beatIndex;
  const moveEnd = p.startFrame + p.moveFrames;

  // fillReveal: 0 -> 1 across beat 0's hold (the blank-to-visible reveal), 1 after.
  const establish = phases[0];
  const fillReveal =
    frame <= establish.startFrame
      ? 0
      : Math.min(
          1,
          (frame - establish.startFrame) / Math.max(1, establish.holdFrames),
        );

  if (p.moveFrames > 0 && frame < moveEnd) {
    const t = easeInOutCubic((frame - p.startFrame) / p.moveFrames);
    const from = solutions[i - 1];
    const to = solutions[i];
    return {
      beatIndex: i,
      fillReveal,
      camera: {
        center: [
          lerp(from.center[0], to.center[0], t),
          lerp(from.center[1], to.center[1], t),
        ],
        zoom: lerp(from.zoom, to.zoom, t),
      },
    };
  }
  return { beatIndex: i, fillReveal, camera: solutions[i] };
}
