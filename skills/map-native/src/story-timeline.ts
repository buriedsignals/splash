import { lerpLongitude } from "./core/longitude";

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
  kinds: string[],
  fps: number,
  opts: {
    titleHold?: number;
    establishHold?: number;
    revealHold?: number;
    takeawayHold?: number;
    move?: number;
  } = {},
): { phases: Phase[]; totalFrames: number } {
  const titleHold = Math.round((opts.titleHold ?? 2.5) * fps);
  const establishHold = Math.round((opts.establishHold ?? 2) * fps);
  const revealHold = Math.round((opts.revealHold ?? 3) * fps);
  const takeawayHold = Math.round((opts.takeawayHold ?? 3) * fps);
  const move = Math.round((opts.move ?? 1.2) * fps);

  const holdForKind = (kind: string): number => {
    if (kind === "title") return titleHold;
    if (kind === "establish") return establishHold;
    if (kind === "takeaway") return takeawayHold;
    return revealHold; // "reveal" and any future kinds
  };

  const phases: Phase[] = [];
  let cursor = 0;
  for (let i = 0; i < kinds.length; i++) {
    const moveFrames = i === 0 ? 0 : move;
    const holdFrames = holdForKind(kinds[i]);
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

  // fillReveal:
  //   0 during entire title beat (beatIndex 0)
  //   ramp 0→1 across establish beat's hold (beatIndex 1)
  //   1 afterwards
  const titlePhase = phases[0];
  const titleEnd = titlePhase.startFrame + titlePhase.holdFrames;

  let fillReveal: number;
  if (frame < titleEnd) {
    // Still in title beat — map is not visible.
    fillReveal = 0;
  } else {
    // Establish beat starts at titleEnd (move + hold).
    // The establish phase is phases[1] when kinds[0] === "title".
    const establishPhase = phases.length > 1 ? phases[1] : phases[0];
    const establishHoldStart =
      establishPhase.startFrame + establishPhase.moveFrames;
    const establishHoldEnd = establishHoldStart + establishPhase.holdFrames;
    if (frame <= establishHoldStart) {
      fillReveal = 0;
    } else if (frame >= establishHoldEnd) {
      fillReveal = 1;
    } else {
      fillReveal = Math.min(
        1,
        (frame - establishHoldStart) / Math.max(1, establishPhase.holdFrames),
      );
    }
  }

  if (p.moveFrames > 0 && frame < moveEnd) {
    const t = easeInOutCubic((frame - p.startFrame) / p.moveFrames);
    const from = solutions[i - 1];
    const to = solutions[i];
    return {
      beatIndex: i,
      fillReveal,
      camera: {
        center: [
          // Wrap-aware: pan longitude along the SHORTER arc so an antimeridian-crossing
          // move (e.g. Japan +142° → Chile −73°) sweeps the ~145° of Pacific between
          // them, not the ~215° the long way across Asia/Africa (which fetched high-zoom
          // tiles for the opposite side of the globe — the video-hang trigger).
          lerpLongitude(from.center[0], to.center[0], t),
          lerp(from.center[1], to.center[1], t),
        ],
        zoom: lerp(from.zoom, to.zoom, t),
      },
    };
  }
  return { beatIndex: i, fillReveal, camera: solutions[i] };
}
