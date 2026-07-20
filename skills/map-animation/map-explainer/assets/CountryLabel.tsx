import React from "react";
import { Easing, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont();

// Reusable Buried Signals country label — Space Grotesk, an accent rule that draws in above the name,
// and a rise-and-fade entrance. Positioned by its centre (x,y in screen px); `reveal` 0→1 drives entry.
export const CountryLabel: React.FC<{
  name: string;
  color: string;
  reveal: number;
  x: number;
  y: number;
}> = ({ name, color, reveal, x, y }) => {
  const e = interpolate(reveal, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: e,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - e) * 16}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* accent rule — draws out from the centre in the country's colour */}
        <div
          style={{
            width: 64,
            height: 3,
            borderRadius: 2,
            background: color,
            transform: `scaleX(${e})`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
        <div
          style={{
            fontFamily,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#F5F2ED",
            textShadow: "0 2px 18px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7)",
            marginTop: 13,
            paddingLeft: "0.22em", // balance the trailing letter-spacing so the word stays centred
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
      </div>
    </div>
  );
};
