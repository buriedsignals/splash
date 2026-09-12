// THE FILM'S FIVE LINES, and how they arrive.
//
// The words are Tom's, unedited. What is decided here is only where the weight falls:
// each line is set light, and the part of it that carries the argument is set in the
// display face at 800 in the accent — the landing's own move, where "Don't publish"
// stands in paper and "a wall of text" drops into amber underneath it.
//
// A line arrives word by word rather than as a block. Eighty milliseconds apart is
// enough to read as a sentence being spoken and not as a caption being switched on;
// more than that and the reader finishes the line before it has finished arriving. It
// is held in the timing contract in SECONDS — written here as a frame count it silently
// doubled in pace the day the film went from 25 fps to 60.

import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { LAUNCH_TIMING } from "./timing";
import { DISPLAY } from "./typefaces";

export type Line = {
  /** The part that is said, set light. May be empty. */
  plain: string;
  /** The part that is meant, set heavy and in the accent. */
  accent: string;
  /** Hundredths of the frame width, for the type size. Longer lines are set smaller;
   *  they are all meant to fill the same measure. */
  size: number;
};

export const SCRIPT: Line[] = [
  {
    plain: "The story is there,",
    accent: "buried in 500 lines of copy.",
    size: 5.6,
  },
  { plain: "Your evidence is", accent: "nine paragraphs down.", size: 6.6 },
  { plain: "Help people", accent: "see what matters.", size: 7.0 },
  {
    plain: "Turn the evidence into",
    accent: "maps, charts, and video.",
    size: 5.8,
  },
  { plain: "", accent: "Go make a splash.", size: 8.4 },
];

const EASE = Easing.bezier(0.16, 0.84, 0.3, 1);

export const ScriptLine: React.FC<{
  line: Line;
  /** When the line arrives and leaves — from the timing contract, never from here. */
  from: number;
  to: number;
  width: number;
  /** The ground's own type colour, and the accent that reads on it. Passed in, because
   *  the pair changes with the scene: amber on the ink, blue on the paper. */
  ink: string;
  accent: string;
}> = ({ line, from, to, width, ink, accent }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;

  const { rise, fall, wordStep } = LAUNCH_TIMING;
  const local = frame - from;
  const leaving = interpolate(frame, [to - fall, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  // Two blocks, not one run of words: the plain half on its own line and the accent
  // half under it. Left to wrap on its own the break falls wherever the measure runs
  // out — "Help people see what / matters." — which cuts the sentence in a place its
  // meaning does not.
  const blocks: { text: string; heavy: boolean }[] = [
    { text: line.plain, heavy: false },
    { text: line.accent, heavy: true },
  ].filter((block) => block.text.length > 0);

  const size = width * line.size * 0.01;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        padding: `0 ${width * 0.08}px`,
      }}
    >
      <div
        style={{
          maxWidth: width * 0.82,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
          opacity: 1 - leaving,
          transform: `translateY(${-leaving * size * 0.18}px)`,
        }}
      >
        {(() => {
          let spoken = 0;
          return blocks.map((block, b) => (
            // The trailing word's own gutter is taken back off the block, or the
            // centred line sits half a word-space to the left of centre.
            <div key={b} style={{ display: "block", marginRight: "-0.24em" }}>
              {block.text
                .split(" ")
                .filter(Boolean)
                .map((word) => {
                  const arrival = interpolate(
                    local,
                    [spoken * wordStep, spoken * wordStep + rise],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: EASE,
                    },
                  );
                  spoken += 1;
                  return (
                    <span
                      key={`${b}-${spoken}`}
                      style={{
                        display: "inline-block",
                        // The clip is what makes it a rise rather than a fade upward:
                        // the word comes out from under its own line, the way type is
                        // set on a press.
                        overflow: "hidden",
                        verticalAlign: "bottom",
                        paddingBottom: "0.09em",
                        marginRight: "0.24em",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          transform: `translateY(${(1 - arrival) * 100}%)`,
                          opacity: arrival,
                          fontWeight: block.heavy ? 800 : 200,
                          color: block.heavy ? accent : ink,
                        }}
                      >
                        {word}
                      </span>
                    </span>
                  );
                })}
            </div>
          ));
        })()}
      </div>
    </div>
  );
};
