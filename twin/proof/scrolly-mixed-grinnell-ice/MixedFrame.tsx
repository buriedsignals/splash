/**
 * THE WHOLE COMPOSITION, SSR'd ONCE IN ITS FIRST STATE.
 *
 * Three media in one element, stacked as three layers — and that is the point of the beat, so it is
 * worth saying what the alternative would have been. The vehicle's own contract is N pictures with
 * exactly one painted, and a beat could hand it one photograph per step, one map per step and one
 * chart per step. It would swap them correctly and it could never navigate INSIDE any of them: a
 * swap has nothing to interpolate. So the composition is ONE persistent element whose three layers
 * each carry their own presence, and the scroll drives all of it from one number.
 *
 * Rules kept, from `scrolly/references/scrolly-discipline.md` and the owner's rulings:
 *
 *   1. **The photograph is CONTAINED, never cropped** — the ratio is kept and it fills to whichever
 *      axis binds first. Four frames normalised to one box is the whole claim of a repeat-photography
 *      sequence.
 *   2. **The map takes the full frame** and carries no controls; the scroll is its only input.
 *   3. **The chart is fitted, never cropped**: the SVG carries GEOMETRY ONLY and stretches
 *      (`preserveAspectRatio="none"`); every word is HTML at a fixed pixel size positioned in
 *      fractions over the same box, so a 14px tick is 14px at 375px and at 1600px.
 *   4. **The credit sits at the bottom of the visual** (owner feedback B1.1), anchored from the
 *      frame's own floor. There is ONE credit and its text names the source of whatever medium is on
 *      the screen — three credit lines stacked at the floor would collide through every handover.
 *
 * No colour is named here. `ground`, `ink`, `muted` and `accent` are props, derived in node by
 * `render.mjs` from the answer recorded in `PALETTE.md` beside this beat.
 */

import type { CSSProperties } from "react";
import {
  REF_WORLD,
  VIEWBOX,
  X_SLOTS,
  Y_SLOTS,
  annotationPlacement,
  cameraTransform,
  chartGeometry,
  containBox,
  dominantPhoto,
  pct,
  photoOpacities,
  plotBox,
  projectLonLat,
  railAt,
  resolveCamera,
  scaleBar,
  toFrame,
} from "./compose.mjs";

const FONT = "Helvetica, Arial, sans-serif";

/** The frame the first state is SSR'd against. Nothing is fixed to it — the driver re-resolves the
 *  camera and the photograph's box against the real box on its first painted frame — but a
 *  no-JavaScript reader keeps exactly this, so it is the widest common shape rather than a debug
 *  value. */
export const SSR_FRAME = { width: 1600, height: 820 };

export type MapMark = { key: string; at: [number, number]; label: string };

export type MixedFrameProps = {
  photos: { src: string; year: number }[];
  photoAspect: number;
  photoYears: number[];
  readings: { year: number; value: number }[];
  marksChart: { year: number; label: string }[];
  chartUnit: string;
  shapes: { key: string; d: string }[];
  strokes: Record<string, number>;
  origin: { nx: number; ny: number };
  marks: MapMark[];
  state: Record<string, number>;
  credit: string;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
};

const tickStyle = (colour: string): CSSProperties => ({
  position: "absolute",
  fontFamily: FONT,
  fontSize: "14px",
  color: colour,
  whiteSpace: "nowrap",
});

export function MixedFrame({
  photos,
  photoAspect,
  photoYears,
  readings,
  marksChart,
  chartUnit,
  shapes,
  strokes,
  origin,
  marks,
  state,
  credit,
  ground,
  ink,
  muted,
  accent,
}: MixedFrameProps) {
  const geometry = chartGeometry(readings, state, marksChart);
  const camera = resolveCamera(state, SSR_FRAME);
  const box = containBox(SSR_FRAME, photoAspect);
  const presences = photoOpacities(state.photoAt!, photos.length);
  const rail = railAt(photoYears, state.photoAt!);
  const bar = scaleBar(camera, Math.min(300, SSR_FRAME.width * 0.34));
  const plot = plotBox(SSR_FRAME);
  /** The camera is a CSS transform on an ancestor, so it scales the stroke too — the width written
   *  here is the width wanted on the screen, divided back out. See `compose.mjs`, which redoes this
   *  on every painted frame. */
  const strokeScale = camera.worldPx / REF_WORLD;
  const gates = [state.markViewpoint!, state.markGlacier!];

  /** An opaque chip of the ground — the one way a word may sit over a photograph or a basemap and
   *  still have a contrast anybody can measure. A translucent scrim's effective colour depends on
   *  whatever is behind it at a given scroll position, which is not a value anyone can assert. */
  const chip: CSSProperties = {
    background: ground,
    padding: "2px 7px",
    borderRadius: "2px",
  };

  return (
    <div
      data-visual="mixed"
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      {/* ── THE MAP, bottom layer: live tiles under this beat's own drawn geography ──────────── */}
      <div
        data-layer="map"
        style={{ position: "absolute", inset: 0, opacity: state.mapOpacity }}
      >
        {/* MapLibre's container. Revealed by `live-scroll-map.mjs` only once the warm has finished;
            on a committed proof, which carries the delivery placeholder, it stays empty and the
            drawn geography below is the whole picture. */}
        <div
          data-part="live"
          style={{ position: "absolute", inset: 0, opacity: 0 }}
        />
        <div
          data-part="camera"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: cameraTransform(camera, origin),
          }}
        >
          {/* Written ONCE at the reference zoom and moved by a transform. Re-serialising a
              2,081-point outline on every animation frame is what projecting per frame would cost. */}
          <svg
            width="1"
            height="1"
            style={{ display: "block", overflow: "visible" }}
          >
            {shapes.map((shape) => (
              <path
                key={shape.key}
                data-shape={shape.key}
                d={shape.d}
                fill="none"
                stroke={shape.key === "glacier" ? accent : ink}
                strokeWidth={strokes[shape.key]! / strokeScale}
                strokeLinejoin="round"
                opacity={shape.key === "glacier" ? 1 : 0.8}
              />
            ))}
          </svg>
        </div>
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
            stroke={muted}
            strokeWidth="1"
          />
        </svg>
        {marks.map((mark, i) => {
          const [x, y] = projectLonLat(mark.at, camera);
          return (
            <div
              key={`marker-${mark.key}`}
              data-marker={mark.key}
              style={{
                position: "absolute",
                left: `${x.toFixed(2)}px`,
                top: `${y.toFixed(2)}px`,
                width: "12px",
                height: "12px",
                marginLeft: "-6px",
                marginTop: "-6px",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 0 2.5px ${ground}`,
                opacity: gates[i],
              }}
            />
          );
        })}
        {marks.map((mark, i) => {
          const [x, y] = projectLonLat(mark.at, camera);
          return (
            <div
              key={`label-${mark.key}`}
              data-label={mark.key}
              style={{
                ...tickStyle(ink),
                ...chip,
                fontSize: "15px",
                fontWeight: 600,
                left: `${x.toFixed(2)}px`,
                top: `${(y - 18).toFixed(2)}px`,
                transform: "translate(-50%, -100%)",
                opacity: gates[i],
              }}
            >
              {mark.label}
            </div>
          );
        })}
        <div
          data-part="scalebar"
          style={{
            position: "absolute",
            right: "18px",
            bottom: "36px",
            textAlign: "right",
          }}
        >
          <div
            data-part="scale-rule"
            style={{
              width: `${bar.px.toFixed(1)}px`,
              height: "3px",
              background: ink,
              marginLeft: "auto",
              marginBottom: "3px",
            }}
          />
          <span
            data-part="scale-text"
            style={{
              ...chip,
              fontFamily: FONT,
              fontSize: "13px",
              color: ink,
              display: "inline-block",
            }}
          >
            {bar.label}
          </span>
        </div>
      </div>

      {/* ── THE PHOTOGRAPHS, above the map: contained, one box, dissolving through the sequence ── */}
      <div
        data-layer="photo"
        style={{ position: "absolute", inset: 0, opacity: state.photoOpacity }}
      >
        <div
          data-part="photo-box"
          style={{
            position: "absolute",
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
        >
          {photos.map((photo, i) => (
            <img
              key={photo.year}
              data-photo={i}
              src={photo.src}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                opacity: presences[i],
              }}
            />
          ))}
        </div>
        {/* The year and the time rail, on the frame's own top-left: a gutter at every width where
            the card takes the reading measure, and wholly covered at 375px where the card goes edge
            to edge — which is the doctrine's own answer, a label hidden whole rather than cut. */}
        <div
          data-part="clock"
          style={{
            position: "absolute",
            left: "2%",
            top: "3%",
            ...chip,
            fontFamily: FONT,
            color: ink,
          }}
        >
          <div
            data-part="year"
            style={{ fontSize: "27px", fontWeight: 700, lineHeight: 1.1 }}
          >
            {Math.round(rail.year)}
          </div>
          <div
            style={{
              position: "relative",
              width: "184px",
              height: "16px",
              marginTop: "6px",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "7px",
                height: "2px",
                background: muted,
              }}
            />
            {rail.ticks.map((t, i) => (
              <div
                key={`tick-${photoYears[i]}`}
                style={{
                  position: "absolute",
                  left: `${(t * 100).toFixed(3)}%`,
                  top: "3px",
                  width: "2px",
                  height: "10px",
                  marginLeft: "-1px",
                  background: muted,
                }}
              />
            ))}
            <div
              data-part="rail-cursor"
              style={{
                position: "absolute",
                left: `${(rail.t * 100).toFixed(3)}%`,
                top: 0,
                width: "3px",
                height: "16px",
                marginLeft: "-1.5px",
                background: accent,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── THE CHART, top layer: fitted, geometry-only SVG, type in fractions over it ─────────── */}
      <div
        data-layer="chart"
        style={{ position: "absolute", inset: 0, opacity: state.chartOpacity }}
      >
        <div
          style={{
            ...tickStyle(muted),
            left: pct(0.02),
            top: pct(plot.top - 0.075),
          }}
        >
          {chartUnit}
        </div>
        <div
          data-part="plot"
          style={{
            position: "absolute",
            left: pct(plot.left),
            top: pct(plot.top),
            width: pct(plot.right - plot.left),
            height: pct(plot.bottom - plot.top),
          }}
        >
          <svg
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="none"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <defs>
              <clipPath id="mixed-plot">
                <rect
                  x="0"
                  y="0"
                  width={VIEWBOX.width}
                  height={VIEWBOX.height}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#mixed-plot)">
              {geometry.yTicks.map((tick, i) => (
                <line
                  key={`grid-${i}`}
                  data-ygrid={i}
                  x1="0"
                  x2={VIEWBOX.width}
                  y1={(1 - tick.at) * VIEWBOX.height}
                  y2={(1 - tick.at) * VIEWBOX.height}
                  stroke={muted}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: tick.visible * 0.28 }}
                />
              ))}
              <polyline
                data-part="base"
                points={geometry.base}
                fill="none"
                stroke={muted}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                data-part="highlight"
                points={geometry.highlight}
                fill="none"
                stroke={accent}
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: geometry.hiOpacity }}
              />
            </g>
          </svg>
        </div>

        {geometry.yTicks.map((tick, i) => {
          const [, fy] = toFrame(0, (1 - tick.at) * VIEWBOX.height, SSR_FRAME);
          return (
            <div
              key={`y-${i}`}
              data-ytick={i}
              style={{
                ...tickStyle(muted),
                left: pct(0.02),
                top: pct(fy),
                transform: "translateY(-50%)",
                opacity: tick.visible,
              }}
            >
              {tick.label}
            </div>
          );
        })}
        {Array.from({
          length: Math.max(0, Y_SLOTS - geometry.yTicks.length),
        }).map((_, i) => (
          <div
            key={`y-pad-${i}`}
            data-ytick={geometry.yTicks.length + i}
            style={{ ...tickStyle(muted), opacity: 0 }}
          />
        ))}

        {geometry.xTicks.map((tick, i) => {
          const [fx] = toFrame(tick.at * VIEWBOX.width, 0, SSR_FRAME);
          return (
            <div
              key={`x-${i}`}
              data-xtick={i}
              style={{
                ...tickStyle(muted),
                left: pct(fx),
                top: `calc(${pct(plot.bottom)} + 6px)`,
                transform: "translateX(-50%)",
                opacity: tick.visible,
              }}
            >
              {tick.label}
            </div>
          );
        })}
        {Array.from({
          length: Math.max(0, X_SLOTS - geometry.xTicks.length),
        }).map((_, i) => (
          <div
            key={`x-pad-${i}`}
            data-xtick={geometry.xTicks.length + i}
            style={{ ...tickStyle(muted), opacity: 0 }}
          />
        ))}

        {geometry.marks.map((mark, i) => {
          const [dx, dy] = toFrame(mark.x, mark.y, SSR_FRAME);
          return (
            <div
              key={`dot-${i}`}
              data-mark={i}
              style={{
                position: "absolute",
                left: pct(dx),
                top: pct(dy),
                width: "11px",
                height: "11px",
                marginLeft: "-5.5px",
                marginTop: "-5.5px",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 0 2px ${ground}`,
                opacity: mark.opacity,
              }}
            />
          );
        })}
        {geometry.marks.map((mark, i) => {
          const place = annotationPlacement(mark.x, mark.y, SSR_FRAME);
          return (
            <div
              key={`anno-${i}`}
              data-annotation={i}
              style={{
                ...tickStyle(ink),
                ...chip,
                fontSize: "15px",
                fontWeight: 600,
                left: place.left,
                top: place.top,
                transform: place.transform,
                opacity: mark.opacity,
              }}
            >
              {mark.label}
            </div>
          );
        })}
      </div>

      {/* ── THE CREDIT, at the bottom of the visual, naming whatever medium is on the screen ───── */}
      <div
        data-part="credit"
        style={{
          ...tickStyle(muted),
          ...chip,
          fontSize: "12px",
          // CENTRED, AND NARROWER THAN THE PROSE CARD — so the card's own vertical edge can never
          // fall inside it. The card is `min(46ch, 100%)`, which renders at 409px above the 600px
          // breakpoint and edge to edge below it; a 380px box centred on the same axis is a subset
          // of the card at every width, so the only two things that can happen are "hidden whole"
          // and "not touched". Measured before this changed, with the credit running `left: 2%` to
          // `right: 2%`: the card sliced it down the middle on 32 of 237 frames at 1600x900, on 32
          // of 207 at 1280x800, and on every sweep in both directions.
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "min(380px, 100%)",
          width: "min(380px, 100%)",
          textAlign: "center",
          bottom: "8px",
          whiteSpace: "normal",
        }}
      >
        {credit}
      </div>
    </div>
  );
}

/** The credit the first state carries — exported so `render.mjs` and the SSR agree on which one it
 *  is instead of both deciding. */
export function creditForState(
  state: Record<string, number>,
  credits: { photo: string[]; map: string; chart: string },
  photoCount: number,
): string {
  const entries: [string, number][] = [
    ["photo", state.photoOpacity!],
    ["map", state.mapOpacity!],
    ["chart", state.chartOpacity!],
  ];
  const medium = entries.reduce((best, e) => (e[1] > best[1] ? e : best))[0];
  if (medium === "photo")
    return credits.photo[dominantPhoto(state.photoAt!, photoCount)]!;
  return medium === "map" ? credits.map : credits.chart;
}
