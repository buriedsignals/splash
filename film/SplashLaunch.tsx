// THE LAUNCH FILM.
//
// The picture is the landing, recorded (`StageFootage`). This file owns the assembly
// only: the five lines, and the mark the film ends on — which is the same lockup the
// film opened on, because the page's own loading screen is that lockup.
//
// NOTHING is laid between the recording and the type. A band of ink under the words
// stood here for one pass and came straight back out: the wall is already dark enough
// to be read against, so the band was not buying legibility, it was flattening the
// page's own picture to solve a problem that was not there.
//
// One ground for the whole film: the ink. The wall of front pages, the crossing and
// the field of plates all sit on it, so the type keeps one pairing throughout — paper
// for what is said, amber for what is meant. That is the landing's own move, where
// "Don't publish" stands in paper and "a wall of text" drops into amber under it.

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { HOUSE } from "./house";
import { SCRIPT, ScriptLine } from "./Script";
import { StageFootage } from "./StageFootage";
import { Wordmark } from "./Wordmark";
import { LAUNCH_TIMING } from "./timing";
import "./load-typefaces";

export const SplashLaunch: React.FC = () => {
  const { width, durationInFrames } = useVideoConfig();
  const { lines, total } = LAUNCH_TIMING;

  // The composition and the contract must agree on how long this is. They are written
  // in two places — the `<Composition>` and `timing.ts` — and a film that is a second
  // longer than its own cut ends on a held frame nobody chose.
  if (durationInFrames !== total)
    throw new Error(
      `the composition is ${durationInFrames} frames and the timing contract is ${total}`,
    );

  return (
    <AbsoluteFill style={{ background: HOUSE.ink }}>
      <StageFootage />

      {SCRIPT.map((line, i) => (
        <ScriptLine
          key={i}
          line={line}
          from={lines[i].in}
          to={lines[i].out}
          width={width}
          ink={HOUSE.paper}
          accent={HOUSE.amber}
        />
      ))}

      <Wordmark width={width} />
    </AbsoluteFill>
  );
};
