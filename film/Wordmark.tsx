// THE MARK — the rosette and the word, the site's own header lockup at the scale of a
// sign-off. The path is the one in `landing/index.html`, copied and not redrawn.
//
// The rosette is three lobes cut out of three circles, and it turns once as it
// arrives — a quarter turn, settled by the same curve every other entrance in this
// film uses. It does not keep turning: a mark that spins is a loading spinner.

import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { HOUSE } from "./house";
import { DISPLAY } from "./typefaces";
import { LAUNCH_TIMING } from "./timing";

const ROSETTE =
  "M51.043 32.561L42.02 51.064A11.148 11.148 0 1 1 30.616 35.116Z " +
  "M17.9 41.122L6.387 24.057A11.148 11.148 0 1 1 25.9 22.154Z " +
  "M27.057 8.139L47.593 6.701A11.148 11.148 0 1 1 39.484 24.551Z";

const EASE = Easing.bezier(0.16, 0.84, 0.3, 1);

export const Wordmark: React.FC<{ width: number }> = ({ width }) => {
  const frame = useCurrentFrame();
  const { wordmark, rise } = LAUNCH_TIMING;
  if (frame < wordmark.in) return null;

  const local = frame - wordmark.in;
  const mark = interpolate(local, [0, rise + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const word = interpolate(local, [6, 6 + rise + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  const size = width * 0.062;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: size * 0.42,
        color: HOUSE.paper,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        style={{
          width: size * 1.02,
          height: size * 1.02,
          opacity: mark,
          transform: `rotate(${(1 - mark) * -90}deg) scale(${0.86 + 0.14 * mark})`,
        }}
      >
        <path fill={HOUSE.amber} d={ROSETTE} />
      </svg>
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: "-0.035em",
          lineHeight: 1,
          opacity: word,
          transform: `translateY(${(1 - word) * size * 0.14}px)`,
          display: "inline-block",
        }}
      >
        Splash
      </span>
    </div>
  );
};
