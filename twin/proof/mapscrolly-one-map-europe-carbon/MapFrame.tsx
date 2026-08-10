/**
 * THE ONE MAP. Not four maps swapped behind a frame — one baked plate, one set of shapes, and a
 * camera the reader's scroll flies around inside it.
 *
 * The structure is what makes that possible with four opacity writes and one transform per frame:
 *
 *   camera            a box the size of the PLATE, moved by a single CSS transform. The basemap
 *                     `<img>` and the shapes `<svg>` are both inside it at the plate's own pixel
 *                     size, so they can never fall out of register with each other however far the
 *                     camera flies.
 *     img             the baked plate. No key, no request, no tile server.
 *     svg             every country's filled path, once. These never change.
 *       veil          a rectangle of the ground over the whole plate — the "everything else
 *                     recedes" half of a highlight, done in ONE node rather than by rewriting 41
 *                     fills every animation frame.
 *       g[data-hi]    the highlighted countries, drawn AGAIN above the veil so they come back to
 *                     full strength. Three groups, three opacities, one per reading.
 *   labels            HTML, at a fixed pixel size, positioned by the driver in frame pixels and
 *                     clamped into the content band. Never SVG text: text inside the camera would
 *                     zoom with it.
 *   legend, credit    HTML furniture, fixed. The credit sits at the BOTTOM of the visual, above the
 *                     prose lane (owner feedback B1.1).
 *
 * No colour is named here. `ground`, `ink`, `muted`, `accent` and the class ramp are props, derived
 * in node by `render.mjs` from the answer recorded in `PALETTE.md` beside this beat.
 */

import type { CSSProperties } from "react";
import { CONTENT_TOP, MAX_SCALE, resolveCamera } from "./map-drive.mjs";
import { NO_DATA_FILL, pathFromRings } from "./geo-choropleth.ts";
import type { Country } from "./carbon-map.ts";

const FONT = "Helvetica, Arial, sans-serif";

export type LabelSpec = {
  key: string;
  text: string;
  gate: "hiA" | "hiB" | "hiC";
  box: { minX: number; maxX: number; minY: number; maxY: number };
  anchor: [number, number];
};

export type MapFrameProps = {
  plate: string;
  plateSize: { width: number; height: number };
  countries: Country[];
  fillFor: (value: number) => string;
  groups: { A: string[]; B: string[]; C: string[] };
  labels: LabelSpec[];
  legend: { breaks: number[]; unit: string; ramp: string[] };
  state: Record<string, number>;
  credit: string;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
};

const text = (colour: string, size: number): CSSProperties => ({
  position: "absolute",
  fontFamily: FONT,
  fontSize: `${size}px`,
  color: colour,
  whiteSpace: "nowrap",
});

export function MapFrame({
  plate,
  plateSize,
  countries,
  fillFor,
  groups,
  labels,
  legend,
  state,
  credit,
  ground,
  ink,
  muted,
  accent,
}: MapFrameProps) {
  const byKey = new Map(countries.map((c) => [c.key, c]));
  // SSR uses a NOMINAL frame. The driver recomputes against the real box on its first paint, so
  // this only ever decides what a reader with no JavaScript sees — which is the opening camera, at
  // roughly the aspect this beat is verified at.
  const nominal = { width: 1600, height: 820 };
  const camera = resolveCamera(state, nominal, CONTENT_TOP, MAX_SCALE);

  const group = (keys: string[], id: "A" | "B" | "C", opacity: number) => (
    <g data-hi={id} style={{ opacity }}>
      {keys.map((key) => {
        const country = byKey.get(key);
        if (!country) return null;
        return (
          <path
            key={key}
            d={pathFromRings(country.rings)}
            fill={fillFor(country.value)}
            fillRule="evenodd"
            stroke={accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );

  return (
    <div
      data-visual="one-map"
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        data-part="camera"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${plateSize.width}px`,
          height: `${plateSize.height}px`,
          transformOrigin: "0 0",
          transform: `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`,
        }}
      >
        <img
          src={plate}
          width={plateSize.width}
          height={plateSize.height}
          alt=""
          style={{ display: "block", width: "100%", height: "100%" }}
        />
        <svg
          viewBox={`0 0 ${plateSize.width} ${plateSize.height}`}
          width={plateSize.width}
          height={plateSize.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          <g>
            {countries.map((country) => (
              <path
                key={country.key}
                data-shape={country.key}
                d={pathFromRings(country.rings)}
                fill={fillFor(country.value)}
                fillRule="evenodd"
                stroke={ground}
                strokeWidth={0.7}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
          <rect
            data-part="veil"
            x={0}
            y={0}
            width={plateSize.width}
            height={plateSize.height}
            fill={ground}
            style={{ opacity: state.dim }}
          />
          {group(groups.A, "A", state.hiA)}
          {group(groups.B, "B", state.hiB)}
          {group(groups.C, "C", state.hiC)}
        </svg>
      </div>

      {/* Leader lines, in FRAME pixels — outside the camera, so they are never scaled. */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <path
          data-part="leaders"
          d=""
          fill="none"
          stroke={ink}
          strokeWidth={1}
        />
      </svg>

      {labels.map((label, i) => (
        <div
          key={label.key}
          data-label={i}
          style={{
            ...text(ink, 15),
            fontWeight: 600,
            left: "-999px",
            top: "-999px",
            transform: "translate(-50%, -100%)",
            background: ground,
            padding: "1px 6px",
            borderRadius: "2px",
            opacity: 0,
          }}
        >
          {label.text}
        </div>
      ))}

      {/* The class legend — the ramp IS the quantity (geo-discipline rule 8), so it is a bar of the
          same fills the map uses, labelled at its class boundaries. */}
      {/* Legend and credit sit ON the map, and at a close camera the map under them is a dark
          choropleth fill. Muted ink straight onto it was measured illegible at reading 2 — the
          second half of the credit disappeared into Germany. Both ride an OPAQUE chip of the
          ground, never a translucent scrim whose effective colour would change with the camera. */}
      <div
        style={{
          position: "absolute",
          left: "2%",
          top: "4%",
          background: ground,
          padding: "8px 10px 6px",
          borderRadius: "2px",
        }}
      >
        <div
          style={{
            ...text(muted, 13),
            position: "static",
            marginBottom: "6px",
          }}
        >
          {legend.unit}
        </div>
        <div style={{ display: "flex" }}>
          {legend.ramp.map((fill, i) => (
            <div
              key={i}
              style={{ width: "34px", height: "12px", background: fill }}
            />
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "3px" }}>
          {[0, ...legend.breaks].map((value, i) => (
            <div
              key={i}
              style={{
                ...text(muted, 12),
                position: "static",
                width: "34px",
                marginLeft: i === 0 ? "-3px" : 0,
              }}
            >
              {value}
            </div>
          ))}
        </div>

        {/* No-data is its own colour and outside the ramp (geo-discipline rule 7). Nothing on
            this map is unmatched today — the join throws if anything is — so this key reads the
            ramp's own limits rather than standing for an absent country. */}
        <div
          style={{ ...text(muted, 12), position: "static", marginTop: "7px" }}
        >
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              background: NO_DATA_FILL,
              verticalAlign: "-2px",
              marginRight: "6px",
            }}
          />
          no data — none on this map
        </div>
      </div>

      {/* THE CREDIT, at the bottom of the visual, above the prose lane. */}
      <div
        data-part="credit"
        style={{
          ...text(muted, 12),
          left: "2%",
          maxWidth: "60%",
          // Anchored from the BOTTOM, not the top. A `top` percentage is a fraction of a frame whose
          // height changes with the header's own wrap at every width, so a credit that cleared the
          // lane at one width sat inside it at another — measured twice, in opposite directions,
          // while the header was being shortened. From the bottom it grows UPWARD when it wraps.
          //
          // FROM THE FRAME'S OWN BOTTOM, not from the top of the prose lane — and that changed when
          // the vehicle's eighth correction gave the prose its own cell of the track. Nothing goes
          // in the lane any more, so a credit hovering above it is a credit floating in the MIDDLE
          // of the map: measured on the delivered file at 1600x900, the box sat 235px above the
          // frame's floor, over the Atlantic; at 375x812 it covered the "Belgium 7.2" label
          // outright and clipped "Luxembourg 10.3". At the floor it is where this beat's own
          // doc-comment always said it belonged — the bottom of the visual — at every width.
          bottom: "8px",
          whiteSpace: "normal",
          background: ground,
          padding: "3px 6px",
          borderRadius: "2px",
        }}
      >
        {credit}
      </div>
    </div>
  );
}
