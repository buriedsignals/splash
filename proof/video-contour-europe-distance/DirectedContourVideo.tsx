/**
 * The Remotion composition: the live MapTiler map driven by the frame, and `ContourFrame`'s overlay over it, drawn only
 * once the embedded faces are in, every frame's words read back against those faces and the widths Bun measured
 * (`useEmbeddedFaces`).
 *
 * THE MAP IS MOUNTED ONCE AND DRIVEN IN NUMBERS, as the scrolly pilot's scroll drives it: at every frame every bound
 * paint is set from `mapStateAt`, then `useLiveMap` holds the frame until the map is idle with every tile loaded. The
 * plan reaches MapTiler only through the runner's local proxy (`mapPlanProxied`, written into the props file at render
 * time and never committed); with no proxied plan there is no map.
 *
 * THE SWEEP is a MapLibre `canvas` source (not animated): at every frame its texels are thresholded at the sweep's level
 * (`paintSweep`) and the texture is uploaded once — `play()` then `pause()`, whose `prepare()` uploads the canvas while
 * the source still counts as playing — so the map goes idle again and the frame is released. An animated canvas source
 * would keep the map repainting and never idle.
 */

import type maplibregl from "maplibre-gl";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { mountPlan } from "#shared/map-beat/mount.mjs";
import { bindState } from "#shared/map-beat/scrolly.mjs";
import { transformStyle } from "#shared/map-beat/style.mjs";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import {
  type LiveMapPlan,
  type MountPlan,
  type TransformStyle,
  useLiveMap,
} from "../../skills/map-beat/assets/live-map";
import { ContourFrame, type ContourFrameProps } from "./ContourFrame";
import { mapStateAt, paintSweep } from "./scene.mjs";

type ProxiedPlan = LiveMapPlan & {
  styleUrl: string;
  tints: unknown;
  layers: Array<{ id: string; bindings?: Record<string, unknown> }>;
};

export type DirectedContourVideoProps = ContourFrameProps & {
  faces: EmbeddedFace[];
  /** The map plan with its MapTiler URLs pointed at the render's proxy — `null` when no render is running. */
  mapPlanProxied: ProxiedPlan | null;
};

const SWEEP = "sweep";
/** The layer the sweep is mounted beneath (`map-plan.mjs`, `SWEEP_BENEATH`): the land outside the measurement. */
const SWEEP_BENEATH = "outside";

function LiveContourMapOn(
  props: DirectedContourVideoProps & { plan: ProxiedPlan; at: number },
) {
  const { plan, sweep, colours } = props;
  const texels = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = sweep.cols;
    canvas.height = sweep.rows;
    const bytes = Uint8Array.from(atob(sweep.bytes), (c) => c.charCodeAt(0));
    const ctx = canvas.getContext("2d")!;
    return {
      canvas,
      bytes,
      ctx,
      image: ctx.createImageData(sweep.cols, sweep.rows),
    };
  }, [sweep]);
  const mount = (map: maplibregl.Map, p: LiveMapPlan) => {
    (mountPlan as unknown as MountPlan)(map, p);
    map.addSource(SWEEP, {
      type: "canvas",
      canvas: texels.canvas,
      coordinates: sweep.coordinates as never,
      animate: false,
    });
    // Beneath the land outside the measurement, which is itself beneath the basemap's water: the sea and Russia's
    // edge are drawn over the sweep's cells.
    if (!map.getLayer(SWEEP_BENEATH))
      throw new Error(
        `the plan draws no "${SWEEP_BENEATH}" layer to mount the sweep beneath`,
      );
    map.addLayer(
      {
        id: SWEEP,
        type: "raster",
        source: SWEEP,
        paint: {
          "raster-opacity": 0,
          "raster-fade-duration": 0,
          "raster-resampling": "linear",
        },
      },
      SWEEP_BENEATH,
    );
  };
  const container = useLiveMap({
    plan,
    styleUrl: plan.styleUrl,
    tints: plan.tints,
    frame: props.at,
    mount: mount as MountPlan,
    transform: transformStyle as unknown as TransformStyle,
    paint: (map, frame) => {
      const state = mapStateAt(props as never, frame);
      for (const layer of plan.layers)
        for (const property in layer.bindings ?? {})
          map.setPaintProperty(
            layer.id,
            property,
            bindState(layer.bindings?.[property], state),
            { validate: false },
          );
      paintSweep(texels.image.data, texels.bytes, {
        level: state.level,
        stepKm: sweep.stepKm,
        rimKm: sweep.rimKm,
        front: state.level < props.deepest,
        tint: colours.tint,
        rim: colours.rim,
      });
      texels.ctx.putImageData(texels.image, 0, 0);
      const source = map.getSource(SWEEP) as unknown as {
        play: () => void;
        pause: () => void;
      };
      source.play();
      source.pause();
      map.setPaintProperty(SWEEP, "raster-opacity", state.tint, {
        validate: false,
      });
    },
  });
  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
}

function LiveContourMap(props: DirectedContourVideoProps & { at: number }) {
  if (!props.mapPlanProxied) return null;
  return <LiveContourMapOn {...props} plan={props.mapPlanProxied} />;
}

export function DirectedContourVideo(props: DirectedContourVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? (
        <ContourFrame
          {...props}
          at={frame}
          liveMap={(at) => <LiveContourMap {...props} at={at} />}
          svgRef={ref}
        />
      ) : null}
    </AbsoluteFill>
  );
}
